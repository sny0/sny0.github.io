---
title: Rooflineモデル：GPUは計算とメモリ転送のどちらで詰まるか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: 演算性能とメモリ帯域からGPUカーネルの性能上限を描く。2と200 FLOP/byteを比較し、折れ点、メモリ階層、演算精度、実測の見方を整理する。
  aliases: [Rooflineモデル, Roofline Model, ルーフラインモデル, Operational Intensity, Arithmetic Intensity, 演算強度, 算術強度]
  verification: UC Berkeleyの技術報告とNVIDIAのプロファイリング資料に照合し、WindowsのPython 3.12.4で数値例と図の座標を検算（2026-11-21）
---

# Rooflineモデル：GPUは計算とメモリ転送のどちらで詰まるか

GPUで画像を処理するとき、一度読み込んだ画素で数回だけ計算する処理も、多数の計算に繰り返し使う処理もあります。演算器の性能とメモリの帯域を同じ図に載せると、どちらで性能の上限が決まるかを見比べられます。これが **Rooflineモデル** です。[Williamsらの技術報告 §3](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.html)

## この記事で分かること

転送1バイトあたりの演算数から、GPUの性能上限がどちらで決まるかを図と式で説明できます。実測点を図に置くときに、どのメモリ階層のバイト数と、どの演算精度の性能を使うか判断できます。

## 1バイトを運ぶ間に、何回の演算を進められるか

対象は、GPU上で実行する1つの処理である**カーネル**です。性能の単位 **FLOP/s** は1秒あたりの浮動小数点演算数です。**演算強度**は、カーネルの浮動小数点演算数を、対象とするメモリ階層を通った読み書きのバイト数で割った値です。単位は **FLOP/byte** です。原報はDRAMとの実際の転送量を分母にして *operational intensity* と呼んでいます。GPUのプロファイラーでは *arithmetic intensity* と呼ぶこともあります。[Williamsらの技術報告 §3](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.pdf) · [NVIDIA Nsight Compute — Roofline Charts](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#roofline-charts)

演算強度を $I$、演算性能の上限を $P_{\mathrm{peak}}$、その階層の帯域を $B$ とします。1秒に最大 $B$ バイトを運べるなら、転送が支えられる演算数は1秒あたり $B I$ です。演算器側にも上限があるため、モデルが示す上限は低い方です。

$$
P_{\mathrm{roof}} = \min\bigl(P_{\mathrm{peak}},\ B I\bigr)
$$

同じことを時間で考えると、演算数を $F$、転送量を $D$ として、実行時間には少なくとも $F/P_{\mathrm{peak}}$ と $D/B$ の両方が必要です。転送と演算が重なっても時間は両者の大きい方を下回れません。重なり方や使い切れない資源によって、実行時間はさらに延びます。[Williamsらの技術報告 §3・§4](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.pdf)

## 仮想GPUの折れ点と、2つのカーネル

仮想GPUの演算上限を **100 TFLOP/s**、GPUのデバイスメモリとの帯域を **1 TB/s** とします。演算経路と精度を1つにそろえた説明用の条件です。Tは10進の $10^{12}$ です。この例では、帯域から求まる上限の数値は $I$ と同じになります。たとえば2 FLOP/byteなら、1 TB/sを掛けて2 TFLOP/sです。[Williamsらの技術報告 §3](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.pdf)

<figure style="margin: 1rem 0; max-width: 36rem">
  <div role="img" aria-label="Rooflineモデルの両対数グラフ。横軸は演算強度FLOP/byte、縦軸は性能上限をTFLOP/sで表示。帯域上限に沿って増え、100 FLOP/byteと100 TFLOP/sの折れ点から右は演算上限で水平。Aは2 FLOP/byteで上限2 TFLOP/s、Bは200 FLOP/byteで上限100 TFLOP/s。実測点はない。" style="padding: 0.55rem 0.5rem 0.55rem 0; font-size: 0.82em; line-height: 1.4">
    <strong>性能上限（TFLOP/s）</strong>
    <div style="position: relative; height: 10.5rem; margin: 0.65rem 0.25em 1.55rem 2.8em; border-inline-start: 1px solid var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-text-2); font-variant-numeric: tabular-nums">
      <div aria-hidden="true" style="position: absolute; top: 100.0000%; inset-inline: 0; border-top: 1px solid var(--vp-c-divider)"><span style="position: absolute; right: calc(100% + 0.45em); transform: translateY(-50%); white-space: nowrap">1</span></div>
    <div aria-hidden="true" style="position: absolute; top: 86.9176%; inset-inline: 0; border-top: 1px solid var(--vp-c-divider)"><span style="position: absolute; right: calc(100% + 0.45em); transform: translateY(-50%); white-space: nowrap">2</span></div>
    <div aria-hidden="true" style="position: absolute; top: 56.5412%; inset-inline: 0; border-top: 1px solid var(--vp-c-divider)"><span style="position: absolute; right: calc(100% + 0.45em); transform: translateY(-50%); white-space: nowrap">10</span></div>
    <div aria-hidden="true" style="position: absolute; top: 13.0824%; inset-inline: 0; border-top: 1px solid var(--vp-c-divider)"><span style="position: absolute; right: calc(100% + 0.45em); transform: translateY(-50%); white-space: nowrap">100</span></div>
      <span aria-hidden="true" style="position: absolute; left: 0.0000%; top: calc(100% + 0.25em); transform: translateX(-50%); white-space: nowrap; font-size: 0.92em">1</span>
    <span aria-hidden="true" style="position: absolute; left: 10.0343%; top: calc(100% + 0.25em); transform: translateX(-50%); white-space: nowrap; font-size: 0.92em">2</span>
    <span aria-hidden="true" style="position: absolute; left: 33.3333%; top: calc(100% + 0.25em); transform: translateX(-50%); white-space: nowrap; font-size: 0.92em">10</span>
    <span aria-hidden="true" style="position: absolute; left: 66.6667%; top: calc(100% + 0.25em); transform: translateX(-50%); white-space: nowrap; font-size: 0.92em">100</span>
    <span aria-hidden="true" style="position: absolute; left: 76.7010%; top: calc(100% + 0.25em); transform: translateX(-50%); white-space: nowrap; font-size: 0.92em">200</span>
    <span aria-hidden="true" style="position: absolute; left: 100.0000%; top: calc(100% + 0.25em); transform: translateX(-100%); white-space: nowrap; font-size: 0.92em">1000</span>
      <span aria-hidden="true" data-roofline-point="ridge" data-intensity="100" data-performance="100" style="position: absolute; left: 66.6667%; top: 13.0824%; bottom: 0; border-left: 1px dashed var(--vp-c-text-2)"></span>
      <span aria-hidden="true" style="position: absolute; inset: 0; background: var(--vp-c-brand-1); clip-path: polygon(0 99.15%, 66.6667% 12.2324%, 100% 12.2324%, 100% 13.9324%, 66.6667% 13.9324%, 0 100%)"></span>
      <span aria-hidden="true" style="position: absolute; left: 15%; top: 43%">帯域上限</span>
      <span aria-hidden="true" style="position: absolute; right: 0; top: 0">演算上限</span>
      <span aria-hidden="true" data-roofline-point="A" data-intensity="2" data-performance="2" style="position: absolute; left: 10.0343%; top: 86.9176%; width: 0.67em; height: 0.67em; transform: translate(-50%, -50%); border: 1px solid var(--vp-c-bg); border-radius: 50%; background: var(--vp-c-brand-1)"><strong style="position: absolute; left: 0.9em; top: -1.3em">A</strong></span>
      <span aria-hidden="true" data-roofline-point="B" data-intensity="200" data-performance="100" style="position: absolute; left: 76.7010%; top: 13.0824%; width: 0.67em; height: 0.67em; transform: translate(-50%, -50%); border: 1px solid var(--vp-c-bg); border-radius: 50%; background: var(--vp-c-brand-1)"><strong style="position: absolute; left: 0.9em; top: 0.5em">B</strong></span>
    </div>
    <div style="text-align: right"><strong>演算強度（FLOP/byte）</strong></div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.45rem">横軸・縦軸ともに対数目盛。破線は折れ点の100 FLOP/byte。点A・Bはモデル上の上限を示す。</figcaption>
</figure>

表の演算強度はFLOP/byte、上限はどちらもTFLOP/sです。

| 例と演算強度 | 帯域の上限 | 性能上限 |
| --- | ---: | ---: |
| A（2） | 2 | 2（帯域） |
| B（200） | 200 | 100（演算） |

左から右に進むと、同じ1バイトでできる計算が増えるので、斜めの帯域上限は高くなります。両方の上限が交わる**折れ点**は $I_* = P_{\mathrm{peak}} / B$ です。このGPUでは **100 FLOP/byte** です。そこから右では演算器の上限が低い方になるため、屋根は100 TFLOP/sの高さで水平になります。[Williamsらの技術報告 §3・図1](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.pdf)

## 測るメモリ階層と演算精度をそろえる

**メモリ階層**を先に決めます。たとえばデバイスメモリの帯域を使うなら、横軸の分母にもデバイスメモリとの転送バイト数を使います。キャッシュから繰り返し読めるデータは、そのたびにデバイスメモリを通るわけではありません。配列の格納サイズや、コード上のロード回数だけでは、実際にその境界を通った量は求まりません。L2など別の階層を見る場合は、その階層を通った転送量とその帯域を組にします。[Williamsらの技術報告 §3・§7](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.pdf) · [NVIDIA Nsight Compute — Roofline Charts](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#roofline-charts)

**演算精度と実行経路**もそろえます。たとえばFP32の汎用演算器で走る処理なら、別の精度やTensor Coreのピークをそのまま天井に使うと、比較の意味が変わります。混合精度の行列積なら、入力と累積の精度も記録します。演算数の数え方では、積和演算FMAを1命令でも掛け算と足し算の2 FLOPと数える規約があります。実測と上限の規約をそろえます。[GPUの階層別Rooflineの計測論文 §II](https://arxiv.org/html/2009.05257v4#S2) · [NVIDIA Nsight Compute — Roofline Charts](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#roofline-charts)

原報の帯域は、最適化したベンチマークで得た持続転送率です。仕様表のピークや別のアクセスパターンで得た値とは条件が異なります。実測点は、同じカーネル範囲について数えたFLOPを実行時間で割って縦軸に置きます。点が屋根から遠いときは、転送や演算器を使い切れていない理由を別の測定で調べます。並列度が低い、転送の待ち時間を隠せない、同期が入るといった要因は、屋根の左右だけでは特定できません。[Williamsらの技術報告 §3・§4・付録](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.pdf) · [GPUアーキテクチャ詳解](/hardware/gpu/architecture.html)

## FlashAttentionとLLM推論では、どこに使うか

[FlashAttention](/algorithms/flash-attention.html)は、Attentionの中間値をオンチップの作業領域で扱い、デバイスメモリとの往復を減らします。同じ出力を求める処理を比べると、同じ演算数で転送が減るケースでは、演算強度は右へ動きます。実装や再計算で演算数も変わる場合は、両方を数えます。右へ動いた分だけ実行速度が上がるかは、実測で確認します。[FlashAttention原論文 §3](https://arxiv.org/abs/2205.14135)

[LLMのprefillとdecode](/algorithms/llm-prefill-and-decode.html)でも、多くの位置をまとめる行列積は、読み出した重みを繰り返し使えます。少数の列を進めるdecodeでは、その再利用が少なく、重みやKVの転送が効きやすくなります。バッチの大きさ、文脈長、実装によって各カーネルの位置は変わります。カーネルのRooflineから、待ち行列や通信を含むサービスの応答時間までは直接求まりません。[DistServe原論文 §2.1・§3.1–3.2](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

## 要点

- 横軸の演算強度は、対象のメモリ階層を通った1バイトあたりの演算数です。縦軸は演算数の1秒あたりの上限です。
- 帯域と演算強度の積、演算性能の上限のうち、低い方がRooflineです。折れ点は演算性能の上限を帯域で割って求めます。
- 例の100 TFLOP/s・1 TB/sでは、2 FLOP/byteの上限は2 TFLOP/s、200 FLOP/byteの上限は100 TFLOP/sです。
- 実測時はバイト数と帯域の階層、演算数とピークの精度・演算経路をそろえます。上限と実測の差は、別の計測と合わせて読みます。

## 理解度チェック

::: details 演算上限が100 TFLOP/sのまま、帯域だけ2 TB/sになったら？
折れ点は50 FLOP/byteです。Aの帯域からの上限は4 TFLOP/sに上がり、Bの屋根は演算側の100 TFLOP/sにとどまります。
:::

::: details 200 FLOP/byteのカーネルが実測で20 TFLOP/sだったら、演算器が原因だと言える？
この条件で低い方の上限が演算側の100 TFLOP/sであることは分かります。実測はその上限から離れているので、演算器が使われている割合や、転送待ち・同期なども調べます。
:::

## 検証範囲

2026年11月21日に原報とGPU計測資料を確認し、WindowsのPython 3.12.4でA・Bの上限、折れ点、理解度チェックの数値、対数グラフの座標を検算しました。GPUの条件は仮定です。実機のピーク性能・持続帯域やカーネルの処理速度は測定していません。

## 関連項目

- [GPUとは何か](/hardware/gpu/what-is-gpu.html) — GPUで多くの仕事を並列に処理する理由を確認する。
- [GPUアーキテクチャ詳解](/hardware/gpu/architecture.html) — オンチップのキャッシュとGPUの主メモリの関係を読む。
- [FlashAttention](/algorithms/flash-attention.html) — タイル内で中間値を使い、デバイスメモリへの書き出しを減らす方法を追う。
- [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) — 推論の段階ごとに、計算と転送の量が変わる理由を読む。

## 参考資料

- [Samuel Williams、Andrew Waterman、David Patterson — Roofline: An Insightful Visual Performance Model for Floating-Point Programs and Multicore Architectures（UC Berkeley、2008）](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-134.html) — 上限式、折れ点、持続帯域と性能の見方。
- [NVIDIA — Nsight Compute Profiling Guide, Roofline Charts](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#roofline-charts) — GPUのRooflineとメモリ階層別の見方。
- [Charlene Yangほか — Hierarchical Roofline Performance Analysis for Deep Learning Applications（2020）](https://arxiv.org/abs/2009.05257v4) — 演算数、精度、階層別転送の計測。
- [Tri Daoほか — FlashAttention（2022）](https://arxiv.org/abs/2205.14135) · [Yinmin Zhongほか — DistServe（OSDI 2024）](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf) — Attentionでのデバイスメモリ転送と、LLM推論の段階別の費用。
