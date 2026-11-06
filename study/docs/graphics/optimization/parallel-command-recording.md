---
title: D3D12のコマンドリストを複数スレッドで記録する
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 描画コマンドを複数のCPUスレッドで記録し、パスの依存順に提出する。アロケータとリストの所有、フェンスで再利用するフレームスロット、計測の見方を扱う。
  aliases: [並列コマンド記録, command list, command allocator, D3D12, ExecuteCommandLists, フレームスロット, frame in flight]
  verification: MicrosoftのD3D12 APIリファレンスと公式マルチスレッドサンプルに照合（2026-11-06）
---

# D3D12のコマンドリストを複数スレッドで記録する

Direct3D 12では、描画やコピーの命令をコマンドリストへ記録し、コマンドキューへ提出します。複数のCPUスレッドが別々のリストを記録すれば、一つのフレームを組み立てるCPU時間を短くできる場合があります。例えば、影を作るパスと、その影を参照するライティングパスは、使うリソースと状態を先に決めておけば、CPU上で同時に記録できます。GPUへの提出では、影を作ってから参照する順序を守ります。[MicrosoftのD3D12マルチスレッドサンプル](https://learn.microsoft.com/en-us/samples/microsoft/directx-graphics-samples/d3d12-multithreading-sample-win32/) · [DirectX 12の基礎](/graphics/api/directx12.html)

<figure class="study-figure">
  <img src="/images/graphics/parallel-command-recording.svg" alt="ワーカーAとBがそれぞれ専用のアロケータとリストで影とライティングのコマンドを同時に記録する。Bが先に記録を終えても、提出側はAのあとにBを並べる。GPUがそのフレームの命令を実行し、フェンス値に達するとアロケータなどを再利用できる。" width="760" height="464" loading="lazy">
  <figcaption>CPUでの記録、GPUへ渡す順序、フレームスロットの再利用を決める目印。<a href="/study/images/graphics/parallel-command-recording.svg" target="_blank" rel="noopener noreferrer">並列記録の図を拡大</a></figcaption>
</figure>

## 記録中のリストとアロケータを一人で持つ

**コマンドリスト**は描画や状態設定を追加するためのオブジェクトです。**コマンドアロケータ**は、記録された命令を保持するメモリを管理します。記録中は、一つのリストとそのアロケータを一つのワーカーが担当します。同じアロケータを使って複数のリストを同時に記録することはできません。一つのワーカーがリストを閉じ、次のリストを同じアロケータで順に記録することはできます。[Microsoftのコマンドリスト記録とアロケータの仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d12/recording-command-lists-and-bundles)

| 操作 | 実行できる時点 |
| --- | --- |
| コマンドリストの `Close` | そのリストへの命令の追加を終えた時点。成功したリストを提出側へ渡す。 |
| コマンドリストの `Reset` | リストが閉じており、次の記録に使える同じ種類のアロケータを渡せる時点。提出済みの前回の命令をGPUが実行中でも、次の記録を始められる。 |
| コマンドアロケータの `Reset` | 対応するリストの記録がなく、このアロケータに記録した命令をGPUがすべて使い終えた時点。提出待ちの記録も先に提出するか、破棄する。 |

リストをリセットして次の記録を始めても、GPUが前回使う記録のメモリはアロケータに残ります。前回と同じ記録を再提出する場合は、その記録の前回の実行完了も確認します。[リストのReset](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-reset) · [アロケータのReset](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandallocator-reset) · [ExecuteCommandListsの契約](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-executecommandlists)

## パスの依存関係で提出順を決める

例えばワーカーAはシャドウマップへ深度を書くパスを、ワーカーBはライティングで同じマップを読むパスを記録します。作業を配る前に、AのリストをBのリストより先に提出することと、両者の間でマップの状態を `DEPTH_WRITE` から `PIXEL_SHADER_RESOURCE` へ遷移させることを決めます。各ワーカーには、担当するリソースと状態遷移を記したパスの計画を渡します。Bが先にリストを閉じても、提出側は両方を集めてA、Bの順で提出します。[Microsoftのリソースバリアの仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12)

同じキューでも、一回の `ExecuteCommandLists` に複数のリストを渡すと、ドライバーは先行リストの処理がすべて終わる前に、後続リストの実行可能な処理を始められます。必要な依存関係はバリアで表します。別キューへ結果を渡す場合は、生成側のキューの `Signal` と消費側のキューの `Wait` で順序を組み、キューの種類に応じたリソース状態も扱います。[ExecuteCommandListsでの一括提出](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-executecommandlists) · [Microsoftの複数キュー間の同期](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization)

## フレームスロットをフェンスで回す

CPUが次のフレームを記録する間、GPUが前のフレームを実行していることがあります。同時に進めるフレームを二つまでとするなら、再利用する一時領域を二組の**フレームスロット**に分ける設計ができます。二つのワーカーが同時に記録するなら、各スロットにワーカー別のアロケータを一つずつ置き、合計四つで回す構成が一例です。[Microsoftのアロケータプールの説明](https://learn.microsoft.com/en-us/windows/win32/direct3d12/recording-command-lists-and-bundles#recording-command-lists)

1. 空いているスロットで、各ワーカーが自分のアロケータを使って記録します。
2. 提出側がリストをキューへ渡し、同じキューで最後の使用のあとにフェンス値を通知する命令を入れます。スロットにその値を記録します。
3. そのスロットへ戻ったら、CPUがフェンスの到達を確認してアロケータをリセットします。コマンドが参照するシェーダー可視の記述子スロットや定数用の一時領域も、最後のGPU参照が終わってから使い回します。複数キューで使う領域なら、すべての使用を追います。

記述子や参照先をどの時点から保持するかは、ルートシグネチャの静的・揮発性の指定にも従います。例えばフレーム用のシェーダー可視記述子は、ワーカー別の範囲に分け、記録前に用意してGPU完了まで維持できます。[Root Signature 1.1の契約](https://learn.microsoft.com/en-us/windows/win32/direct3d12/root-signature-version-1-1) · [GPUリソースと一時領域の寿命](/graphics/optimization/gpu-resource-lifetime.html)

## CPUの記録時間と待ち時間を計測する

同じシーンで、フレームの記録開始から提出までの経過時間、ワーカー別の記録時間、提出側が最後のワーカーを待つ時間、リスト数と提出回数を比べます。例えば一つの大きなパスに仕事が集中する場合は、同じパス内で描画の範囲を分けられるかを調べます。リストを細かく分けるほど、初期状態の設定、ジョブの配布、記録結果の回収も増えます。GPU時間とキューに仕事が来ていない区間も併せて見ると、CPU側の変更がフレーム全体にどう効いたかを確かめられます。[Microsoft PIXのTiming Captures](https://devblogs.microsoft.com/pix/timing-captures-new/) · [GPUタイムスタンプクエリ](/graphics/optimization/gpu-timestamp-queries.html)

アセットを準備するワーカーは、例えばメッシュを読み、頂点とインデックスをCPU側に用意し、描画側へ渡します。記録ワーカーは、その描画で参照できるリソースを使ってコマンドリストを組み立てます。二つの段階をつなぐときは、データを受け取る時点と、アップロードが済んで描画で使える時点をそれぞれ追います。[アセットワーカーから描画側へ渡す設計](/game/asset-worker-handoff.html)

実践では二つのCPUスレッドでコピーを記録し、閉じた順番と逆の依存順で提出します。フェンスを待ってデータを読み戻し、処理がつながったことを確認できます。[C++で並列コマンド記録を試す](/practice/graphics/parallel-command-recording-observation.html) · [リソースバリア](/graphics/optimization/d3d12-resource-barriers.html)
