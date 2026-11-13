---
title: D3D12のリソースバリアと状態遷移
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: Transition、UAV、Aliasingの3種類を、コピーの前後やヒープの再利用から使い分ける。サブリソース、COMMONの暗黙遷移、キュー間の同期も扱う。
  aliases: [D3D12, ResourceBarrier, リソースバリア, 状態遷移, transition barrier, UAV barrier, aliasing barrier, サブリソース, COMMON, promotion, decay, COPY_DEST, COPY_SOURCE]
  verification: MicrosoftのD3D12 APIリファレンスとリソースバリアの解説に照合（2026-11-06）
---

# D3D12のリソースバリアと状態遷移

アップロードした頂点データを使うとき、コピー先のバッファへ書き込む処理と、それを頂点バッファとして読み取る処理では、同じバッファに求める使い方が変わります。Direct3D 12では、アプリがリソースの状態を追跡し、次の使い方へ切り替わる位置にバリアを記録します。ここでは `ID3D12GraphicsCommandList::ResourceBarrier` を使う従来のAPIを扱います。[Microsoftのリソースバリア解説](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12)

## コピー先を次のコピー元にする

たとえば、DEFAULTヒープにバッファを `COPY_DEST` で作り、コマンドリストAでUPLOADバッファからコピーします。次のリストBで同じDEFAULTバッファを読み戻すには、コピーの前に `COPY_DEST` から `COPY_SOURCE` への遷移バリアを記録します。このバリアを境に、先行するコピーで書いたデータを次のコピーで読めるようになります。UPLOADバッファは `GENERIC_READ` のままコピー元にでき、READBACKバッファは `COPY_DEST` のままコピー先にできます。[Microsoftのヒープごとの初期状態](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#initial-states-for-resources) · [Microsoftの読み戻し手順](https://learn.microsoft.com/en-us/windows/win32/direct3d12/readback-data-using-heaps)

<figure class="study-figure">
  <img src="/images/graphics/d3d12-resource-barriers.svg" alt="同じキューに提出したリストAとBの例。AがCOPY_DESTのDEFAULTバッファへ書き込み、BがCOPY_SOURCEへ遷移させて読み戻す。UAVバリアは同じUAV状態でのアクセスを順序付け、Aliasingバリアは同じヒープ領域を使う別リソースへ切り替える。" width="760" height="460" loading="lazy">
  <figcaption>コピーの依存関係に置く遷移バリアと、状態を変える以外の同期が必要な二つの場面。<a href="/study/images/graphics/d3d12-resource-barriers.svg" target="_blank" rel="noopener noreferrer">リソースバリアの図を拡大</a></figcaption>
</figure>

リストBでは、バッファのサブリソース番号 `0` を指定します。リストAのコピーは用途を変えないので、同じ `ExecuteCommandLists` 呼び出しに `[A, B]` の順で渡すこの例では、Bの遷移前状態は `COPY_DEST` です。CPUでBの記録が先に終わっても、GPUへ渡す順序は依存関係に合わせます。[Microsoftの状態遷移バリア](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_resource_transition_barrier) · [D3D12の並列コマンド記録](/graphics/optimization/parallel-command-recording.html)

```cpp
D3D12_RESOURCE_BARRIER barrier{};
barrier.Type = D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;
barrier.Transition.pResource = intermediateBuffer;
barrier.Transition.Subresource = 0;
barrier.Transition.StateBefore = D3D12_RESOURCE_STATE_COPY_DEST;
barrier.Transition.StateAfter = D3D12_RESOURCE_STATE_COPY_SOURCE;
listB->ResourceBarrier(1, &barrier);
// Record the copy from intermediateBuffer to the readback buffer here.
```

テクスチャでは、mip、配列スライス、プレーンの組み合わせでサブリソースを指定します。例えばmip 0へコピーしながらmip 1をシェーダーで読む設計では、用途をサブリソースごとに追います。全体の状態が揃っていて一括で切り替える場合は `D3D12_RESOURCE_BARRIER_ALL_SUBRESOURCES` を使えます。一つのサブリソースで使う状態フラグは、読み取り専用同士なら組み合わせられます。書き込みを含む状態は一つを選び、読み取り専用フラグと組み合わせません。[Microsoftのサブリソース仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d12/subresources) · [Microsoftの読み取りと書き込みの制約](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#readwrite-resource-state-restrictions)

## 何が競合するかでバリアを選ぶ

| 種類 | 使う場面 |
| --- | --- |
| 遷移（Transition） | 同じサブリソースの使い方を切り替える。例えばコピー先からコピー元、またはレンダーターゲットからシェーダーの入力へ変える。 |
| UAV | 同じUAV（順序を前提とせず読み書きできるビュー）を使い続けるが、前後のアクセスの順序が必要。例えば先の計算シェーダーが書いたカウンターを後の計算シェーダーが読む。 |
| エイリアシング（Aliasing） | 同じヒープ領域に重ねて配置した別リソースへ使用を切り替える。例えば一時テクスチャAを使い終えてから、その領域のテクスチャBを有効にする。 |

UAVを使う二つの処理が同じ `UNORDERED_ACCESS` 状態のままでも、先の処理の書き込みを後の処理が読むなら順序が必要です。バリアの `pResource` にはアクセス対象のリソースを指定します。両方が読み取り専用の場合や、どちらの書き込みが先でも結果が正しいと分かっている場合は、間のUAVバリアを省けます。[MicrosoftのUAVバリアの仕様](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-resourcebarrier#remarks)

配置リソースのシンプルモデルでは、エイリアシングバリアの `pResourceAfter` に次に使うリソースを指定します。重なっていたリソースは非アクティブになります。たとえば次のテクスチャがレンダーターゲットなら、切り替え後にクリアなどで必要な初期化を行ってから使います。エイリアシングの切り替えとは別に、後続処理に必要なリソース状態も用意します。[Microsoftの配置リソースとメモリの再利用](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12device-createplacedresource#simple-model)

## COMMONから暗黙に変わる条件を確認する

`COMMON` にあるリソースは、対応する用途で初めてアクセスしたときに暗黙に昇格することがあります。例えば `ALLOW_SIMULTANEOUS_ACCESS` を付けていないカラー画像は、条件を満たせばコピー元やシェーダー入力に昇格できます。同じ画像をレンダーターゲットとして使うには明示的な遷移が必要です。暗黙の昇格でコピー先になったリソースを同じ提出内で別の用途へ切り替えるときも、新しい用途との間に必要な遷移を記録します。[MicrosoftのCOMMON昇格の対応表](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#common-state-promotion)

条件を満たすリソースは、GPUが一回の `ExecuteCommandLists` の処理を完了した時点で `COMMON` に戻ります。これを減衰（decay）と呼びます。例えば通常のDEFAULTバッファは、明示的に遷移させて使った場合も減衰の対象です。同じ呼び出しにまとめたリストの間では減衰しません。リストを閉じた時点とGPUが提出分を処理し終えた時点を区別して状態を追います。[MicrosoftのCOMMONへの減衰](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#state-decay-to-common)

## 同じキューのバリアと、別キューを待つフェンス

同じキューでは、依存する命令を正しい順序で提出し、アクセスが切り替わる位置に必要なバリアを置きます。一回の `ExecuteCommandLists` に複数のリストをまとめると、実装は依存しない処理を重ねて進められます。先のリストに書き込み、後のリストに読み取りがある場合は、その依存関係をバリアで表します。[MicrosoftのExecuteCommandLists仕様](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-executecommandlists)

別のキューへデータを渡す場合は、生成側が `Signal` するフェンス値を消費側の `Wait` に指定します。これで消費側の処理が進める時点を決め、さらにキュー種別と用途に合う状態を用意します。例えばCOPYとDIRECTの間でリソースを引き渡す場合は、`COMMON` の規則と、暗黙の昇格・減衰が適用される条件を確認します。CPUが読み戻しバッファを読んだりメモリを再利用したりできる時点も、関連するGPU処理の完了をフェンスで確認します。[Microsoftの複数キュー間の同期](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization) · [MicrosoftのCOMMONのキュー間規則](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_resource_states) · [GPUキュー間の同期](/graphics/optimization/gpu-queue-synchronization.html) · [GPUリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)

実践では、二つのCPUスレッドが記録したリストを一つのキューへ渡し、遷移を挟んでコピーしたバイト列をWARPで読み戻して照合します。[D3D12の並列コマンド記録を試す](/practice/graphics/parallel-command-recording-observation.html)

## 関連項目

- [Enhanced BarriersとVulkan synchronization2](/graphics/optimization/enhanced-barriers-and-synchronization2.html)
