---
title: GPUが使うメモリはいつ再利用できるか — フェンスとリソースの寿命
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: アップロード領域をGPUに渡してからCPUが再利用するまでを図で追い、複数キューやPresentが絡むときの完了条件を区別する。
  aliases: [GPUフェンス, GPU fence, アップロードヒープ, upload heap, ステージングバッファ, フレームスロット, リソースの寿命, 遅延解放, deferred destruction]
  verification: D3D12のキューとフェンス、Vulkanの同期仕様とPresent待ちセマフォ再利用の公式資料に照合（2026-11-06）
---

# GPUが使うメモリはいつ再利用できるか — フェンスとリソースの寿命

ゲームが頂点データをGPUに送るとき、CPUは先にコピー命令を提出し、次の仕事へ進めます。GPUが実際にコピー元を読むのはそのあとです。CPUが同じ領域に次の頂点を書いてしまうと、GPUが読む値まで変わり得ます。空き領域を**確保する**処理と、GPUが読み終わった領域を**空きに戻す**処理には、それぞれ別の条件があります。[Microsoftのフェンスによるリソース管理](https://learn.microsoft.com/en-us/windows/win32/direct3d12/fence-based-resource-management)

## コピーの提出から、元の領域を空きに戻すまで

Direct3D 12で、CPUが書けるアップロードバッファの領域Aから、GPUが描画で使う別のバッファへデータをコピーします。この例では、領域Aを読むコマンドを一つのキューにまとめます。

<figure class="study-figure">
  <img src="/images/graphics/gpu-resource-lifetime.svg" alt="時間は左から右へ進む。CPUは領域Aに書き込み、GPUのコピーとフェンス値42の通知をキューに入れる。GPUがAを読んでコピーを終えるまで、CPUはAを保持する。CPUが完了値42を確認するとAを再利用できる。" width="760" height="322" loading="lazy">
  <figcaption>フェンス値42は、領域Aを最後に読むコピーより後ろにキューへ入れます。<a href="/study/images/graphics/gpu-resource-lifetime.svg" target="_blank" rel="noopener noreferrer">領域Aの寿命を拡大</a></figcaption>
</figure>

1. **CPUが書く。** 空き範囲から領域Aを取り、CPUが頂点データを書きます。`CopyBufferRegion` を記録し、コピー元のバッファとオフセットを指定します。コピーが参照するのは、実行時にその範囲にあるデータです。
2. **コピーと完了の目印を提出する。** コピーを含むコマンドリストを `ExecuteCommandLists` で提出し、同じ `ID3D12CommandQueue` に `Signal(fence, 42)` を続けて入れます。領域Aには、このキューのフェンスと値42を記録します。ここではキューごとに専用のフェンスを持ち、提出順に値を増やします。
3. **完了を確認して再利用する。** `GetCompletedValue()` が正常に42以上を示したら、このコピーによる領域Aの使用は完了しています。ほかにAを使う予定がなければ、Aの範囲を空きに戻せます。領域Aを含むアップロードバッファ自体を解放するときは、その中のほかの範囲を使う命令も確認します。[コピー用データのアップロード](https://learn.microsoft.com/en-us/windows/win32/direct3d12/uploading-resources) · [キューのSignal](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-signal) · [完了値の取得](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12fence-getcompletedvalue)

キューに入れた `ID3D12CommandQueue::Signal` は、GPUがその位置まで進んでからフェンス値を更新します。`ID3D12Fence::Signal` はCPUから値を直接更新するAPIなので、この完了の記録にはキュー側を使います。`GetCompletedValue()` がデバイス喪失時に返す `UINT64_MAX` は通常の完了と区別します。未完了で空き領域が必要になったら、別の空き範囲を使う、投入を後へ回す、`SetEventOnCompletion` で必要な値を待つといった扱いを選べます。リングバッファを使う場合も、折り返し先が未完了なら上書きできません。[CPU側のSignal](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12fence-signal) · [SetEventOnCompletion](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12fence-seteventoncompletion)

## 何を使い終えたかを分ける

| 対象 | 確認する条件 |
| --- | --- |
| コピー元のアップロード領域 | その範囲からの最後の読み出しが完了した。別のバッファへのコピーだけに使うなら、コピー完了で回収できる |
| コピー先のバッファ | コピーと、その結果を読む描画や計算がすべて完了した。後で使う予定もなくなれば解放できる |
| コマンドアロケータ | そのアロケータに記録されたコマンドのGPU実行がすべて終わった。フレームごとに枠を持つ場合は、枠に完了値を記録して次の `Reset` に使う |

リソースを論理的に手放す時点と、物理的な解放を分ける設計を**遅延解放**と呼びます。例えばシーンから消したメッシュは以後の描画に使わず、すでに提出した描画が終わるまで、バッファ本体とそれを参照する記述子を保持します。シェーダー可視の記述子スロットを使い回すときは、実行中の参照に加え、ルートシグネチャの静的記述子が記録時から要求する寿命にも従います。[コマンドアロケータのReset](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandallocator-reset) · [D3D12の静的記述子と揮発性記述子](https://learn.microsoft.com/en-us/windows/win32/direct3d12/root-signature-version-1-1) · [アセットロードと所有権](/game/asset-loading.html)

## フェンス、バリア、Presentで確認するもの

**フェンス**を使ってCPUが確認するのは、対象のキューがどこまで進んだかです。**バリア**はGPUのコマンド間に必要な順序やメモリアクセスの依存関係を指定します。例えばコピー先を次に描画で読むときは、D3D12のリソース状態やVulkanのステージ、アクセス、画像レイアウトに合わせて依存関係を指定します。GPUにバリアを記録した時点では、CPUがコピー元を再利用できるかは別途確認が必要です。[D3D12のリソースバリア](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12) · [Vulkanの同期仕様](https://docs.vulkan.org/spec/latest/chapters/synchronization.html)

**Present**で渡した画像や待ちセマフォには、表示側での使用期間もあります。Vulkanでは描画を提出した `vkQueueSubmit` のフェンスで描画完了を確認できても、表示エンジンが `vkQueuePresentKHR` の待ちセマフォを使い終わったかは、そのフェンスだけでは分かりません。画像ごとにセマフォを持ち、同じ画像を再取得して取得の同期を待つ方法など、提示側まで含む条件で再利用します。[KhronosのPresent待ちセマフォ再利用ガイド](https://docs.vulkan.org/guide/latest/swapchain_semaphore_reuse.html) · [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)

## 複数キューにまたがるときは最後の参照を追う

コピーキューから描画キューに頂点バッファを渡す場合、D3D12ではコピーキューの完了値を描画キューの `Wait` に指定し、そのあとで描画を実行できます。`Wait` は描画キューに待ちを入れるAPIで、呼び出したCPUスレッドはその場でブロックされません。コピー元をコピーキューだけが読むなら、その完了で元の範囲を回収できます。コピー先を解放するなら、描画キューでの最後の読み出しまで追います。独立した複数のキューが同じリソースを読む場合は、すべての完了値を確認するか、各キューの完了を待つキューでまとめて完了を記録します。[D3D12のキュー間同期](https://learn.microsoft.com/en-us/windows/win32/direct3d12/executing-and-synchronizing-command-lists) · [キューのWait](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-wait)

Vulkanでは、キュー間の依存関係にセマフォを使います。異なるキューファミリー間で排他共有リソースを引き渡す場合、所有権の移譲が必要な条件では、渡す側のリリースと受け取る側のアクワイアも指定し、セマフォなどでその順序を保証します。CPU側の回収は、対象範囲を使ったすべてのキューについて完了を確認してから行います。[Vulkanの同期と所有権移譲の例](https://docs.vulkan.org/guide/latest/synchronization_examples.html)

関連項目は、キューの進行を使って結果を読み戻す[GPUタイムスタンプクエリ](/graphics/optimization/gpu-timestamp-queries.html)と、D3D12での記録・提出を扱う[DirectX 12](/graphics/api/directx12.html)です。
