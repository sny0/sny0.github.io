---
title: GPUタイムスタンプクエリ — 描画パスの時間をGPUの時計で測る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: GPU上の二つの時点を記録し、描画パスの経過時間を求める。VulkanとDirect3D 12での単位変換、完了の確認、クエリの再利用を扱う。
  aliases: [GPU timestamp, タイムスタンプクエリ, timestampPeriod, timestampValidBits, vkCmdWriteTimestamp2, ResolveQueryData, GetTimestampFrequency]
  verification: VulkanとDirect3D 12の公式仕様に照合し、C++の単位換算と折り返しをMSVCで検証（2026-11-06）
---

# GPUタイムスタンプクエリ — 描画パスの時間をGPUの時計で測る

シャドウやポストエフェクトの処理時間を調べるときは、GPUのコマンド列に二つの計測点を入れます。GPUはそれぞれの計測点で時計の値を記録し、CPUはあとで二つの値を受け取ります。**タイムスタンプクエリ**は、この時計の値を記録する機能です。[Vulkan仕様のTimestamp Queries](https://docs.vulkan.org/spec/latest/chapters/queries.html#queries-timestamps) · [MicrosoftのDirect3D 12 Timing](https://learn.microsoft.com/en-us/windows/win32/direct3d12/timing)

## 測っているのは二つの計測点の間

CPUで描画コマンドの記録や送信を計っても、GPUがその仕事を実行した区間は分かりません。送信後の仕事はキューで待つことがあり、描画が終わってからも提示を待つ場合があります。GPUタイムスタンプの差が示すのは、GPUが前後の印を記録した間の経過時間です。CPUの送信時刻や画面の切り替わりは、それぞれ別の観測点で調べます。[フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)

<figure class="study-figure">
  <img src="/images/graphics/gpu-timestamp-queries.svg" alt="CPUがフレームFを提出したあと、GPUは先行する仕事を終え、t0とt1の間で計測対象のパスを処理する。GPUが結果を書き出したあとに完了を確認し、CPUが結果を読む。画面への表示は別の時点にある。" width="760" height="358" loading="lazy">
  <figcaption>GPUが値を書き込む時点と、CPUが結果を読み取る時点を分けます。<a href="/study/images/graphics/gpu-timestamp-queries.svg" target="_blank" rel="noopener noreferrer">計測のタイムラインを拡大</a></figcaption>
</figure>

区間に含まれる仕事は、計測点をどこに置くかで決まります。間に依存関係の待ちが入れば、経過時間はその待ちも含みます。別のキューの仕事が同時に走る場合は、各区間の長さを足すと、重なった時間を二重に数えます。最初は同じキューで二つの計測点を取り、複数キューの重なりはタイムライン上で確認します。[PIXのTiming Captures](https://learn.microsoft.com/en-us/windows/pix/timing-captures/timing-captures-overview) · [デバッグ・プロファイリングツール](/graphics/optimization/tools.html)

## Vulkanで記録する

1. **対応と単位を確認する。** コマンドを実行するキューファミリーの `timestampValidBits` が0なら使えません。対応する場合の有効幅は36〜64ビットで、その数の下位ビットを使います。物理デバイスの `timestampPeriod` は1 tickあたりのナノ秒です。[Vulkan仕様のTimestamp Queries](https://docs.vulkan.org/spec/latest/chapters/queries.html#queries-timestamps) · [VkQueueFamilyProperties](https://docs.vulkan.org/refpages/latest/refpages/source/VkQueueFamilyProperties.html)
2. **計測点をコマンドに入れる。** `VK_QUERY_TYPE_TIMESTAMP` のプールを用意し、使う範囲をリセットします。Vulkan 1.3で `synchronization2` を有効にした例では、`vkCmdWriteTimestamp2` でパスの前後に書き込みを記録します。`stage` は、先行するコマンドのうち、どの段階の処理がタイムスタンプ書き込みに先行するかを指定します。実装は論理的に後ろの段階で値を記録することもあるため、値を個々のシェーダーの正確な開始・終了時刻として扱いません。リソースへのアクセスは通常どおりバリアなどで順序付けます。[vkCmdWriteTimestamp2](https://docs.vulkan.org/refpages/latest/refpages/source/vkCmdWriteTimestamp2.html) · [vkCmdResetQueryPool](https://docs.vulkan.org/refpages/latest/refpages/source/vkCmdResetQueryPool.html)
3. **結果がそろってから読む。** 同じ提出のフェンスで書き込み完了を確認してから、`vkGetQueryPoolResults` と `VK_QUERY_RESULT_64_BIT` で値を読みます。待たずに取得する構成では、`VK_NOT_READY` や `VK_QUERY_RESULT_WITH_AVAILABILITY_BIT` で未完了を扱います。GPU側で記録したリセットがまだ実行されていない間は、前回の値が利用可能と見える場合があります。完了フラグだけで判定せず、どの提出の結果を読んでいるかをフレームスロットと結び付けます。[vkGetQueryPoolResults](https://docs.vulkan.org/refpages/latest/refpages/source/vkGetQueryPoolResults.html)

二つの値を64ビットで取得しても、カウンターは `timestampValidBits` の範囲で折り返します。次のC++関数は、同じ提出で順序付けられた二つの値を使い、実際の間隔がカウンター1周分より短い場合に差を求めます。符号なしの減算で差を取り、有効ビットだけを残してからナノ秒へ換算します。

```cpp
#include <cassert>
#include <cstdint>
#include <limits>

double timestampMilliseconds(std::uint64_t begin, std::uint64_t end,
                             unsigned validBits, double nanosecondsPerTick) {
    assert(validBits > 0 && validBits <= 64);
    const auto mask = std::numeric_limits<std::uint64_t>::max() >> (64 - validBits);
    const auto ticks = (end - begin) & mask;
    return static_cast<double>(ticks) * nanosecondsPerTick / 1'000'000.0;
}
```

たとえば有効36ビット、1 tickが2 nsで、開始値が `2^36 − 250,000`、終了値が `750,000` なら、差は `1,000,000 ticks` で **2 ms** です。1周以上の間隔は二つの値から判別できないため、対象を短い区間に分けます。

## Direct3D 12で記録する

DirectキューまたはComputeキューでは、`D3D12_QUERY_HEAP_TYPE_TIMESTAMP` のヒープを使います。パスの前と後にそれぞれ `EndQuery(..., D3D12_QUERY_TYPE_TIMESTAMP, index)` を記録します。タイムスタンプの `EndQuery` は1回の呼び出しで1点を指定し、GPUが先行する処理を完了した側で値を記録します。Copyキューでの計測には対応確認と専用の `D3D12_QUERY_HEAP_TYPE_COPY_QUEUE_TIMESTAMP` が必要です。[MicrosoftのDirect3D 12 Timing](https://learn.microsoft.com/en-us/windows/win32/direct3d12/timing) · [Microsoftのクエリ仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d12/queries)

`ResolveQueryData` は、書き込みを記録したクエリの範囲を読み戻し用バッファへ展開します。宛先は `COPY_DEST` 状態で、オフセットは8バイト境界にそろえます。提出のあとに同じキューで `Signal` したフェンスがその値に到達してから、CPUはバッファの `UINT64` を読みます。`Map` はGPUの完了を待ちません。[ResolveQueryData](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-resolvequerydata) · [Microsoftの読み戻しバッファの説明](https://learn.microsoft.com/en-us/windows/win32/direct3d12/readback-data-using-heaps)

`GetTimestampFrequency` で取得するのは、計測に使ったキューの1秒あたりの tick 数です。同じコマンドリスト内で取得した `begin` と `end` について、`1000.0 * static_cast<double>(end - begin) / static_cast<double>(frequency)` でミリ秒を求めます。たとえば `2,000` ticksで `1,000,000` Hzなら **2 ms** です。整数同士の除算を先に行うと、この例では秒未満が切り捨てられます。[GetTimestampFrequency](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-gettimestampfrequency)

## フレームごとに待たずに集計する

フレームスロットごとに、クエリ番号の範囲、読み戻し先、提出に対応するフェンスを持ちます。次のフレームの準備と並行して、完了したスロットの結果を回収します。GPUが使い終え、CPUも結果を読み終えたスロットから再利用します。たとえばスロットが3つあっても、フレームを3つ進めた事実だけではGPUの完了を判断できません。計測だけのために毎フレームCPUを待たせると、普段の並行実行が崩れます。空きがなければ、計測を見送るか、すでにあるフレームスロットの再利用待ちに合わせます。[GPUフェンスとリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)

最初はシャドウ、ライティング、ポスト処理など粗い単位で計測し、通常のフレームと長引いたフレームを比べます。タイムスタンプで場所を絞ってから、同じ場面をGPUプロファイラで調べれば、パスの内側で何が変わったかを追えます。[GPU最適化の基礎](/graphics/optimization/basics.html)
