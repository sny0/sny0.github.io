---
title: ワーカーが準備したアセットを描画側へ渡す
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: アセット要求と準備結果を別々のキューで渡す。世代照合、キューとメモリの予算、登録とGPU転送、終了時の回収を扱う。
  aliases: [asset worker, アセットワーカー, asset handoff, 結果キュー, generation token, 世代照合, CPU Ready, backpressure, 登録予算]
  verification: MicrosoftのWindows I/O・D3D12資料とUnityのスレッド切り替え仕様に照合（2026-11-06）
---

# ワーカーが準備したアセットを描画側へ渡す

ゲームが次の部屋のメッシュを要求すると、ワーカーがファイルを読み、データを展開し、頂点とインデックスを検査します。準備済みのデータを結果キューに渡し、描画側が自分の処理時間に合わせて取り出します。この構成では、要求の現在世代と公開済みのハンドルを、登録を担当するスレッドだけが更新します。[ゲームのアセットロード設計](/game/asset-loading.html) · [glTFのメッシュデータ](/graphics/mesh/gltf-mesh-buffers.html)

<figure class="study-figure">
  <img src="/images/assets/asset-worker-handoff.svg" alt="登録側がアセットIDと世代を付けて要求を出し、ワーカーが読み取り・展開・検査を行って結果キューに渡す。登録側が結果を取り出し、現在の要求と照合する。古い結果は回収し、有効な結果はGPU転送と同期を経て描画に公開する。" width="760" height="560" loading="lazy">
  <figcaption>要求キューと結果キューで受け渡しを行い、登録側が結果を採用するか決めます。<a href="/study/images/assets/asset-worker-handoff.svg" target="_blank" rel="noopener noreferrer">ワーカーから描画への受け渡し図を拡大</a></figcaption>
</figure>

## キューを境にデータの持ち主を変える

| 境界 | 渡すもの | 受け取った側の仕事 |
| --- | --- | --- |
| 要求キュー | アセットID、要求世代、読み取り範囲、検査に必要な形式情報 | ワーカーがファイルを読み、範囲やサイズを検査してデコードする |
| 結果キュー | アセットID、要求世代、検査済みのCPUデータ、または失敗の理由 | 登録側が現在の要求と照合し、次の処理か回収に進む |
| GPUへ転送 | 転送用の領域、転送先リソース、コピー完了を示すフェンス値 | 登録側が描画に必要な依存と順序を確認し、利用側にハンドルを公開する |

ワーカーは結果を組み立ててからキューへ入れます。例えば頂点の `std::vector` を結果の一部としてムーブし、キューを経由して取り出した側が保持します。同じ領域を指すポインターをワーカーに残して書き足すと、登録側とアクセスが重なります。ミューテックスで守る範囲はキューの追加・取り出しと状態の更新に絞り、読み取りやデコード、エンジンへの登録はその外で行います。[C++作業草案のミューテックス要件](https://eel.is/c++draft/thread.mutex.requirements) · [上限付きワーカーキュー](/runtime/bounded-worker-queues.html)

登録に使うAPIには、それを呼べるスレッドの条件があります。例えばUnityでメインスレッドを要求するAPIを使う場合、バックグラウンドで準備した結果を `Awaitable.MainThreadAsync` などでメインスレッドへ戻してから登録します。D3D12で複数スレッドからコマンドを記録する構成では、リストとアロケータの使用条件に合わせて仕事を割り当てます。[Unityのメインスレッドへの切り替え](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Awaitable.MainThreadAsync.html) · [D3D12のコマンドの並列記録](/graphics/optimization/parallel-command-recording.html)

## 受け取った結果が今も必要か確かめる

例えば `mesh A` の世代7を処理中に部屋を移動し、同じIDで世代8を要求します。先に世代8が届いたら登録を進めます。後から世代7が届いたら、同じIDでも現在世代と合わないので、CPUデータを破棄し、使っていた予算を返します。失敗した結果にも世代を付ければ、古い失敗で新しい要求を失敗状態に変えずに済みます。[世代とアセットの寿命](/game/asset-loading.html)

結果を受理した後も、GPUコピーを待つ間に要求は変わり得ます。公開する直前にも現在の要求と照合します。登録側がCPUデータを転送用の領域にコピー済みなら、ほかに参照がないCPUデータを回収できます。GPUが読む転送用領域はコピーが終わるまで保持します。D3D12でコピーと描画が別キューなら、コピー側で `Signal` を入れ、描画側では対象値の `Wait` と必要なリソース状態を用意してから使います。途中で不要になった転送先も、提出済みコマンドによる最後の参照まで保持します。[Microsoftのキュー間同期](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization) · [GPUリソースの寿命とフェンス](/graphics/optimization/gpu-resource-lifetime.html)

## 何件待てるか、何バイト持てるかを決める

待機中の要求数と、準備済みの結果数にそれぞれ上限を設けます。例えばワーカー2本と結果キュー3枠の構成で、各ワーカーが持つ準備済みのデータと各結果を最大4 MiBに制限すると、そのデータだけで最大20 MiBになります。読み取り中の入力、展開の作業領域、登録側が取り出した結果、GPU転送用の領域も予算に含めます。大きな確保が必要なら先に予算を取り、空きが出るまで新しい準備を遅らせます。[上限付きキューとバックプレッシャー](/runtime/bounded-worker-queues.html)

結果キューが満杯なら、ワーカーは現在の結果を持ったまま空きを待つか、設計で定めた優先度に沿って回収します。フレームを進めるスレッドでは、結果が届くまで待たず、たとえば登録に使える時間や転送量の範囲で取り出します。1件で転送予算を超える素材は、分割して進めるか、処理できる枠を別に設けます。記録する値をキューの滞在時間、保持バイト数、1フレームの登録時間に分けると、どこで詰まっているかを追えます。[テクスチャストリーミングとmipの常駐](/graphics/texture/texture-streaming-and-mip-residency.html)

## 取り消しと終了で持ち主を失わない

取り消した要求は登録側で無効にし、ワーカーにも止められる作業を止めるよう伝えます。処理が既に終わりかけていれば結果は後から届きます。結果の回収は続け、採用しないデータも所有者が破棄します。例えばWindowsの `CancelIoEx` は完了を待たないため、I/Oの完了を確認するまで要求情報や読み取り先を保持します。[MicrosoftのCancelIoEx仕様](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex) · [非同期I/Oのキャンセル](/os/cancelling-overlapped-io.html)

受付を終えるときは、要求キューを閉じて待機中のワーカーを起こし、引き受け済みの処理を終わらせます。その間も登録側は結果を取り出します。結果キューが満杯のまま先にワーカーを `join` すると、ワーカーは空きを待ち、登録側はワーカーを待ち続けます。すべてのワーカーが結果の投入を終えたら結果キューを閉じ、残った結果を回収します。スレッドの終了を確認し、最後に提出済みのGPU処理が保持する資源をフェンスに従って回収します。[上限付きワーカーキューの終了手順](/runtime/bounded-worker-queues.html) · [Microsoftのフェンスによる資源管理](https://learn.microsoft.com/en-us/windows/win32/direct3d12/fence-based-resource-management)

実践では、2本のワーカーが用意された頂点データからX座標の最小値と最大値を計算します。登録側は結果キューからフレームごとに最大1件を取り出し、現在世代の結果だけを公開します。実際のファイル読み取りやGPU転送は、ここで観察するCPU上の受け渡しより前後の工程です。[C++でアセットの受け渡しを観察する](/practice/threads/asset-worker-handoff-observation.html)
