---
title: D3D12のキューをフェンスでつなぐ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: COPY・DIRECT・COMPUTE間で処理結果を渡す。キュー側のSignalとWait、CPU側のフェンス操作、COMMON状態、最後の参照までの寿命を扱う。
  aliases: [D3D12キュー間同期, GPU queue synchronization, queue fence, Signal, Wait, SetEventOnCompletion, COPY queue, async compute, 非同期コンピュート]
  verification: MicrosoftのD3D12 APIリファレンスとマルチエンジン同期ガイドに照合（2026-11-06）
---

# D3D12のキューをフェンスでつなぐ

テクスチャをCOPYキューで転送し、DIRECTキューの描画で使う場合を考えます。CPUは転送と描画を別々に提出できます。DIRECTキューには、テクスチャを読む命令の前にCOPYキューの完了を待つ命令を入れます。この依存関係を表す目印が**フェンス**です。アプリが指定した整数値で、あるキューがどこまで進んだかを追います。[Microsoftのマルチエンジン同期ガイド](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization)

<figure class="study-figure">
  <img src="/images/graphics/gpu-queue-synchronization.svg" alt="COPYキューはテクスチャのコピー後にcopyDoneを11へ進める。DIRECTキューは独立した描画を先に行い、copyDoneの11を待った後、転送したテクスチャを使って描画する。その後でdrawDoneを24へ進める。転送元はコピー完了後、転送先は最後の描画完了後に回収できる。" width="760" height="454" loading="lazy">
  <figcaption>COPYとDIRECTの間でテクスチャを引き渡す例。横方向は各キューの処理順を示します。<a href="/study/images/graphics/gpu-queue-synchronization.svg" target="_blank" rel="noopener noreferrer">キュー間同期の図を拡大</a></figcaption>
</figure>

## キューの種類で記録できる命令が決まる

| キューの種類 | 提出するリストに記録できる主な処理 |
| --- | --- |
| DIRECT | 描画、コンピュートシェーダーの実行、コピー |
| COMPUTE | コンピュートシェーダーの実行とコピー |
| COPY | バッファーやテクスチャのコピー |

種類はAPIで扱える命令の範囲を表します。複数のキューに独立した処理を提出すると、GPUの構成と負荷に応じて実行が重なる場合があります。CPU側でコマンドリストを複数スレッドから記録する場合にも、提出先は一つのDIRECTキューにできます。[Microsoftのキューの種類と対応する命令](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization#copy-and-compute-command-lists) · [D3D12の並列コマンド記録](/graphics/optimization/parallel-command-recording.html)

## どこで値を書き、どこで待つか

| API | フェンスに対する動作 |
| --- | --- |
| `ID3D12CommandQueue::Signal` | キューに通知を積む。先に提出した処理が終わり、通知の位置まで進むと指定値を書き込む。 |
| `ID3D12CommandQueue::Wait` | キューに待ちを積む。フェンスが指定値以上になるまで、この待ちより後ろの処理を進めない。呼び出したCPUスレッドはその場で待たずに戻る。 |
| `ID3D12Fence::Signal` | CPUからフェンスの値を直ちに更新する。GPU処理の完了を知らせる用途では、完了させるキューへ `Signal` を積む。 |
| `ID3D12Fence::SetEventOnCompletion` | 指定値への到達をCPU側のイベントで知らせる。そのイベントを `WaitForSingleObject` などで待つと、呼び出したCPUスレッドが待機する。 |

`SetEventOnCompletion` にNULLハンドルを渡すと、呼び出し自体が到達まで待ちます。CPUが待たずに完了を調べるには `GetCompletedValue` を使います。デバイスが取り外された場合、このメソッドは `UINT64_MAX` を返します。通常の到達判定とは分けてエラーとして処理します。[キューのSignal](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-signal) · [キューのWait](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-wait) · [CPUのSignal](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12fence-signal) · [SetEventOnCompletion](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12fence-seteventoncompletion) · [GetCompletedValue](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12fence-getcompletedvalue)

フェンスには値を更新するキューを一つ決め、そのキューに積む通知の値を順に増やすと、値と作業の対応を追いやすくなります。たとえば `copyDone` の11と `drawDone` の24は、別々のキューの進み具合です。D3D12のフェンスは小さい値で更新することも可能です。二つのキューから同じフェンスへ通知すると、実行順によって新しい通知の値を古い値で上書きすることがあります。同じキューへ複数のCPUスレッドから提出する設計でも、値の割り当てと通知をキューに積む順序を揃えます。[Microsoftのフェンスの更新順とタイムライン](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization#fences)

## コピーしたテクスチャを描画で使う

図では、最初にCOPYキューで使うDEFAULTヒープ上のテクスチャを `COMMON` で作ります。COPYのリストで転送先に使うと、`COPY_DEST` へ暗黙に昇格します。コピーを含む `ExecuteCommandLists` の処理が終わると、COPYで使ったテクスチャの状態は `COMMON` に戻ります。COPYが `copyDone` の11を通知し、DIRECTはその値を待ちます。その先のDIRECTのリストでは、テクスチャを `COMMON` から `PIXEL_SHADER_RESOURCE` に遷移させて描画できます。[Microsoftのキュー間のリソース利用規則](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization#multi-queue-resource-access) · [COMMONへの復帰条件](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#state-decay-to-common)

以下は、リストの記録を終えた後に提出側で行う処理の抜粋です。`check` は `HRESULT` の失敗を処理する関数を表します。

```cpp
copyQueue->ExecuteCommandLists(1, &copyList);
check(copyQueue->Signal(copyDone, 11));

directQueue->ExecuteCommandLists(1, &independentList);
check(directQueue->Wait(copyDone, 11));
directQueue->ExecuteCommandLists(1, &drawList);
check(directQueue->Signal(drawDone, 24));
```

既にDIRECTやCOMPUTEで使ったテクスチャをCOPYへ渡す場合も、COPY側の最初のアクセス時には `COMMON` が必要です。最後の利用時に `COMMON` へ戻る条件を満たさなければ、渡す側で明示的に遷移します。DIRECTとCOMPUTEの間では、キューの種類が変わることだけを理由に `COMMON` へ戻す必要はありません。後続の用途に合う状態と、書き込んだ結果を次のキューが使える順序の両方を管理します。[MicrosoftのD3D12_RESOURCE_STATES](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_resource_states) · [D3D12のリソースバリア](/graphics/optimization/d3d12-resource-barriers.html)

たとえばCOMPUTEが `UNORDERED_ACCESS` のテクスチャに書き込む場合、COMPUTEの処理後に `Signal` を積みます。DIRECTでは `Wait` の後に `PIXEL_SHADER_RESOURCE` への遷移を記録し、描画で読みます。フェンスはキュー間の実行順を、遷移バリアは次のアクセスに必要な状態を表します。[Microsoftの複数キューにおける読み書きの規則](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization#multi-queue-resource-access)

## 使い終えた資源から回収する

図でCOPYだけが読むアップロード領域は、`copyDone` の11に到達した時点で再利用できます。転送先テクスチャと描画が参照するディスクリプターは、DIRECTが使い終えるまで保持します。この描画が最後の参照なら `drawDone` の24が回収の目印になります。複数のキューが最後まで参照する資源では、それぞれの完了を確認するか、必要な待ちを集めたキューに回収用の通知を積みます。[Microsoftのフェンスによる資源管理](https://learn.microsoft.com/en-us/windows/win32/direct3d12/fence-based-resource-management) · [GPUリソースの寿命とフェンス](/graphics/optimization/gpu-resource-lifetime.html)

## 待ちの位置を決め、実行の重なりを測る

COPYが未到達の `drawDone = 24` を待ってから `copyDone = 11` を通知し、DIRECTも11を待ってから24を通知すると、両方のキューが先へ進めなくなります。リスト間の書き込みと読み取りの依存を並べ、各待ちが参照する通知まで、どのキューが進めるかを確かめます。図ではテクスチャに依存しない描画を `Wait` より前に置き、COPYの完了を待つ区間を短くできる構成にしています。[Microsoftのマルチエンジン同期の例](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization)

コンピュート処理をCOMPUTEキューへ移し、DIRECTキューの描画と重ねる設計を**非同期コンピュート**と呼びます。重なる区間は、データの依存関係、GPUが同時に実行できる処理、メモリ帯域などの競合で変わります。同じシーンとハードウェアで、DIRECTだけに提出する場合と、COMPUTEに分ける場合を測ります。PIXのTiming Captureなどで、両方のキューの実行区間、待ちの位置、フレーム全体にかかった時間を比べます。[Microsoftの非同期コンピュートの例](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization#pipelined-compute-and-graphics-example) · [Microsoft PIXのTiming Captures](https://devblogs.microsoft.com/pix/timing-captures-new/)

実践では二つのCPUワーカーが別々に記録したリストを、一つのDIRECTキューへ依存順に提出します。GPUのコピー結果をCPUで読み戻し、記録順と実行に必要な順序を追います。[D3D12の並列記録を試す](/practice/graphics/parallel-command-recording-observation.html)
