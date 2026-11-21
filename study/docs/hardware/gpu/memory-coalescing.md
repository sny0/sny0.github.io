---
title: GPUのメモリアクセスの合体（coalescing）：同じ32要素でも読み込みが増える理由
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: CUDAの1ワープで32レーンが4バイトずつ読み、連続なら4区間、2要素刻みなら8区間になる理由を追う。開始アドレスのずれ、キャッシュ、DRAM実測を区別する。
  aliases: [GPUメモリアクセスの合体, メモリコアレッシング, コアレッシング, Memory Coalescing, Coalesced Access, Strided Access]
  verification: NVIDIA CUDA C++ Best Practices GuideとNsight Computeの公式資料に照合し、WindowsのPython 3.12.4で32レーンのアドレスと区間を全列挙（2026-11-21）
---

# GPUのメモリアクセスの合体（coalescing）：同じ32要素でも読み込みが増える理由

GPUで画像の値を処理するとき、隣のレーンが隣の要素を読む場合と、1個おきに読む場合を比べます。どちらも32レーンが1個ずつ値を読みますが、メモリ上でどの範囲に触れるかが変わります。**メモリアクセスの合体**（coalescing）は、同じワープのレーンが発行したアクセスを、ハードウェアが必要なメモリ区間にまとめる仕組みです。[NVIDIA CUDA C++ Best Practices Guide §10.2.1](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#coalesced-access-to-global-memory)

## この記事で分かること

CUDAの32レーンが読むアドレスから、32バイト区間をいくつ必要とするか数えられます。連続・2要素刻み・先頭がずれた場合を比べ、その区間数と実際のDRAM転送量や処理時間を分けて説明できます。

## 1レーンの読み込みと、ワープ全体の要求

**ワープ**はCUDAで32スレッドをまとめて実行する単位で、各スレッドの位置を**レーン**と呼びます。ここではNVIDIA GPUの **Compute Capability 6.0以降** を対象に、1回のグローバルメモリの読み込み命令に全32レーンが参加し、各レーンが別の4バイト要素を1つ読むとします。[GPUとは何か](/hardware/gpu/what-is-gpu.html) · [NVIDIA CUDA C++ Best Practices Guide §10.2.1](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#coalesced-access-to-global-memory)

この条件では、読み込みを満たすために、32バイトの境界で区切った領域をいくつ要求するかを数えます。以下ではその1区間を**セグメント**と呼びます。1セグメントの中に複数のレーンのアドレスが入ると、それらをまとめられます。一部の要素だけを要求する場合でも、必要なセグメントとして1つ数えます。レーンへの割り当て順を入れ替えても、触れるセグメントの集合が同じなら個数は変わりません。[NVIDIA CUDA C++ Best Practices Guide §10.2.1.1](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#a-simple-access-pattern)

## 32バイト境界から、連続と2要素刻みを比べる

配列の基準アドレスを `base` とし、32バイト境界にそろっているとします。図の番地差は `base` からのバイト数です。たとえばS0は0〜31バイト、S1は32〜63バイトです。読み込みは自然な4バイト境界にあるので、各レーンは開始番地差を32で割った整数部分から、自分が触れるセグメントを求められます。[NVIDIA CUDA C++ Best Practices Guide §10.2.1.1・§10.2.1.4](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#a-simple-access-pattern)

- **連続**では、レーン `i` は `a[i]` を読みます。番地差は `4 × i` で、0、4、8、…、124バイトです。8レーンずつを同じセグメントにまとめられます。
- **2要素刻み**では、レーン `i` は `a[2*i]` を読みます。番地差は `8 × i` で、0、8、16、…、248バイトです。1セグメントに入るのは4レーンずつです。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="CUDAの32レーンのうち0、3、4、7、8、31を抜粋。連続では番地差0、12、16、28、32、124で区間はS0、S0、S0、S0、S1、S3。全レーンでS0〜S3を使い、各区間の8要素を読む。2要素刻みでは番地差0、24、32、56、64、248で区間はS0、S0、S1、S1、S2、S7。全レーンでS0〜S7を使い、各区間の4要素を読む。" style="display: grid; gap: 0.65rem; max-width: 42rem; font-size: 0.85em; font-variant-numeric: tabular-nums">
    <div style="padding: 0.5rem 0.65rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
      <strong>連続 · 必要なセグメントは4個</strong>
      <div data-coalescing="contiguous" style="display: grid; grid-template-columns: 4.25em repeat(6, minmax(0, 1fr)); align-items: center; gap: 0.15rem 0.25rem; text-align: center; margin: 0.45rem 0 0.6rem">
        <span style="text-align: left">レーン</span><span data-lane="0">0</span><span data-lane="3">3</span><span data-lane="4">4</span><span data-lane="7">7</span><span data-lane="8">8</span><span data-lane="31">31</span>
        <span style="text-align: left">番地差 (B)</span><span data-offset="0">0</span><span data-offset="12">12</span><span data-offset="16">16</span><span data-offset="28">28</span><span data-offset="32">32</span><span data-offset="124">124</span>
        <span style="text-align: left">区間</span><span data-sector="0">S0</span><span data-sector="0">S0</span><span data-sector="0">S0</span><span data-sector="0">S0</span><span data-sector="1">S1</span><span data-sector="3">S3</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0.15rem; text-align: center" data-sector-coverage="contiguous">
        <div data-sector-id="0" data-elements="8" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S0<br>8/8</div><div data-sector-id="1" data-elements="8" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S1<br>8/8</div><div data-sector-id="2" data-elements="8" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S2<br>8/8</div><div data-sector-id="3" data-elements="8" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S3<br>8/8</div><div data-sector-id="4" data-elements="0" style="border-radius: 4px; background: var(--vp-c-bg-soft)">S4<br>—</div><div data-sector-id="5" data-elements="0" style="border-radius: 4px; background: var(--vp-c-bg-soft)">S5<br>—</div><div data-sector-id="6" data-elements="0" style="border-radius: 4px; background: var(--vp-c-bg-soft)">S6<br>—</div><div data-sector-id="7" data-elements="0" style="border-radius: 4px; background: var(--vp-c-bg-soft)">S7<br>—</div>
      </div>
    </div>
    <div style="padding: 0.5rem 0.65rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
      <strong>2要素刻み · 必要なセグメントは8個</strong>
      <div data-coalescing="stride2" style="display: grid; grid-template-columns: 4.25em repeat(6, minmax(0, 1fr)); align-items: center; gap: 0.15rem 0.25rem; text-align: center; margin: 0.45rem 0 0.6rem">
        <span style="text-align: left">レーン</span><span data-lane="0">0</span><span data-lane="3">3</span><span data-lane="4">4</span><span data-lane="7">7</span><span data-lane="8">8</span><span data-lane="31">31</span>
        <span style="text-align: left">番地差 (B)</span><span data-offset="0">0</span><span data-offset="24">24</span><span data-offset="32">32</span><span data-offset="56">56</span><span data-offset="64">64</span><span data-offset="248">248</span>
        <span style="text-align: left">区間</span><span data-sector="0">S0</span><span data-sector="0">S0</span><span data-sector="1">S1</span><span data-sector="1">S1</span><span data-sector="2">S2</span><span data-sector="7">S7</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0.15rem; text-align: center" data-sector-coverage="stride2">
        <div data-sector-id="0" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S0<br>4/8</div><div data-sector-id="1" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S1<br>4/8</div><div data-sector-id="2" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S2<br>4/8</div><div data-sector-id="3" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S3<br>4/8</div><div data-sector-id="4" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S4<br>4/8</div><div data-sector-id="5" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S5<br>4/8</div><div data-sector-id="6" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S6<br>4/8</div><div data-sector-id="7" data-elements="4" style="border-radius: 4px; background: var(--vp-c-brand-soft)">S7<br>4/8</div>
      </div>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">各図の上は6レーンの「レーン → 番地差 → セグメント」。下は全32レーンについて、各セグメントの8要素のうち何個を読むか。—は触れない区間。</figcaption>
</figure>

全レーンが要求した要素はどちらも32個、合計128バイトです。1ワープについて必要セグメントの大きさを足すと、連続は `4 × 32 = 128` バイト、2要素刻みは `8 × 32 = 256` バイトです。この読み込みに使う要素の割合は、連続で100%、2要素刻みで50%になります。ここで足した量は、必要な区間の合計です。[NVIDIA CUDA C++ Best Practices Guide §10.2.1.4](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#strided-accesses)

## 連続でも、先頭が4バイトずれると5区間

同じ配列で、各レーンが1つ先の `a[i+1]` を読むとします。番地差は4、8、…、128。各レーンの要素は4バイト境界にそろっていますが、ワープの読み始めは32バイト境界からずれました。先頭の要素はS0にあり、最後の要素のバイト128〜131はS4に入ります。必要なのはS0〜S4の5セグメントです。[NVIDIA CUDA C++ Best Practices Guide §10.2.1.2](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#a-sequential-but-misaligned-access-pattern)

| 読み方 | 触れる区間 | 区間の合計 |
| --- | --- | ---: |
| 連続 | S0〜S3（4個） | 128 B |
| 2要素刻み | S0〜S7（8個） | 256 B |
| 先頭を4 Bずらす | S0〜S4（5個） | 160 B |

## セグメント数と、メモリから実際に運ぶ量

セグメント数が増えても、すべての区間をそのたびにDRAMから取り直すとは限りません。たとえば先頭をずらした連続アクセスでは、次のワープも最初のワープの末尾と同じS4に触れます。同じ区間のデータがキャッシュに残っていれば再利用できます。NVIDIAのガイドには、Tesla V100での `offsetCopy` の比較があります。ずれたときの実効帯域は、区間数だけで見た4/5より落ち幅が小さく、整列時の約9/10でした。これはそのコピー処理の測定値です。[NVIDIA CUDA C++ Best Practices Guide §10.2.1.3](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#effects-of-misaligned-accesses)

2要素刻みも、8対4という比だけでは実際のDRAM転送量やGPU時間を予測できません。キャッシュで何バイト吸収されたか、同じデータが後で使われるか、カーネルにほかの読み書きや演算があるかで変わります。計測では、ワープの要求を満たすセグメントと、L2やDRAMの境界を通った量を分けます。**Rooflineモデル**でDRAM帯域を使うなら、演算強度の分母は同じDRAM境界の転送量にそろえます。[NVIDIA Nsight Compute Profiling Guide — Quantities](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#quantities) · [Rooflineモデル](/hardware/gpu/roofline-model.html)

## 要点

- CUDAのこの例では、同じワープのレーンが1回の命令で触れる32バイト区間を数えます。
- 32レーンが4バイトずつ読む場合、32バイト境界から連続なら4区間、2要素刻みなら8区間です。連続でも頭を4バイトずらすと5区間になります。
- 必要区間の合計は、DRAMを実際に通った量とは別です。キャッシュの再利用などで、区間数と処理時間の比は一致しないことがあります。
- Rooflineで帯域を調べるときは、バイト数と帯域を同じメモリ階層でそろえます。

## 理解度チェック

::: details 連続と2要素刻みはどちらも128バイトぶんの値を読む。区間数が違うのはなぜ？
連続なら8レーンぶんのアドレスが同じ32バイト区間に収まります。2要素刻みなら同じ区間から4レーンぶんしか読まないため、32レーン全体で8区間が必要です。
:::

::: details +4 Bの例で5区間必要なら、毎回DRAMから160 B読む？
160 Bは1ワープが必要とする区間の大きさの合計です。隣接ワープが同じ区間をキャッシュから再利用できる場合があり、DRAMの転送量は別に計測します。
:::

## 検証範囲

2026年11月21日にNVIDIAの公式資料を確認し、WindowsのPython 3.12.4で32レーンのアドレスを全列挙して、図・表のセグメント数とバイト数を照合しました。掲載したV100の実効帯域の比はガイドの測定例です。教材の3パターンはGPUで実行しておらず、DRAM転送量や実行時間は測定していません。

## 関連項目

- [GPUとは何か](/hardware/gpu/what-is-gpu.html) — GPUが多くの要素を並行して処理する理由を読む。
- [GPUアーキテクチャ詳解](/hardware/gpu/architecture.html) — ワープ、キャッシュ、GPUの主メモリの関係を確認する。
- [GPU実行モデル](/graphics/compute/execution-model.html) — WarpやWaveの実行と、データの並びがメモリアクセスに与える影響を読む。
- [Rooflineモデル](/hardware/gpu/roofline-model.html) — 計測した転送量から演算強度と性能上限を考える。
- [GPUのタイル化](/hardware/gpu/matrix-multiplication-tiling.html) — 同じ区間への要求をまとめることと、取り込んだ要素を使い回すことを、行列積で比べる。

## 参考資料

- [NVIDIA — CUDA C++ Best Practices Guide 13.5 §10.2.1](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#coalesced-access-to-global-memory) — 32バイト区間への合体、開始位置のずれ、2要素刻み、Tesla V100での測定。
- [NVIDIA — Nsight Compute Profiling Guide, Quantities](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#quantities) — 要求とセクターの区別、キャッシュとDRAMの計測。
