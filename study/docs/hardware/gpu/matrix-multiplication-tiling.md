---
title: GPUのタイル化：行列積で同じデータをどう使い回すか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: 4×4行列の積を2×2の出力タイルに分け、Kを2要素ずつ進める。A・Bを同じブロックで再利用する相手、読み出し要求数、同期、共有メモリ容量を説明する。
  aliases: [GPUのタイル化, 行列積のタイル化, Matrix Multiplication Tiling, Tiled Matrix Multiplication, タイル行列積]
  verification: NVIDIA CUDA C++ Best Practices GuideとCUDA Programming Guideに照合し、WindowsのPython 3.12.4で4×4の結果と全入力の論理読み出し数を検算（2026-11-21）
---

# GPUのタイル化：行列積で同じデータをどう使い回すか

行列積の出力を1要素ずつ別のGPUスレッドに任せると、隣のスレッドが同じ入力要素を必要とすることがあります。各スレッドが同じ値を読み直す代わりに、数行・数列ずつの小さな矩形（**タイル**）を読み込み、同じスレッドブロックの中で共有できます。ここではCUDAの行列積で、どの値が再利用されるかを追います。[NVIDIA CUDA C++ Best Practices Guide §10.2.3.2](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#shared-memory-in-matrix-multiplication-c-ab)

## この記事で分かること

2×2の出力を担当するスレッドがAの行とBの列をどう共有し、K方向の途中和を足していくかを説明できます。入力要素の読み出し要求が減る理由と、実際のDRAM転送量や速度を別に測る理由も分かります。

## 出力の担当を2×2ずつに分ける

行列積 $C=AB$ の1要素 $C_{i,j}$ は、Aの行 $i$ とBの列 $j$ の対応する要素を掛けて足した値です。対応する位置を進む添字を $k$ とし、その数を **K** と呼びます。4×4同士ならKは4で、行・列の添字も $k$ も0から始めます。この例では次の入力を使います。[行列](/math/rendering/matrix.html) · [NVIDIA CUDA C++ Best Practices Guide §10.2.3.2](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#shared-memory-in-matrix-multiplication-c-ab)

```text
A                  B
 1   2   3   4        1   2   0   1
 5   6   7   8        3   4   1   0
 9  10  11  12        5   6   0   1
13  14  15  16        7   8   1   0
```

出力Cを2×2ずつの4タイルに分けます。1つの**スレッドブロック**は1タイルを担当し、その4スレッドが1要素ずつ受け持ちます。左上のタイルなら出力は $C_{0,0}$、$C_{0,1}$、$C_{1,0}$、$C_{1,1}$ です。同じ行の2スレッドはAの同じ行を使い、同じ列の2スレッドはBの同じ列を使います。[GPU実行モデル](/graphics/compute/execution-model.html) · [NVIDIA CUDA C++ Best Practices Guide §10.2.3.2](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#shared-memory-in-matrix-multiplication-c-ab)

## AとBを小分けに載せ、K方向に足す

各ブロックで、Kを0・1と2・3の2区間に分けます。1区間で左上の出力タイルに必要なのは、Aの行0・1から取る2列と、Bの列0・1から取る2行です。4スレッドがAから1要素、Bから1要素ずつ分担して読み、ブロック内の**共有メモリ**に置きます。読み込んだ値は担当したスレッド以外も使えます。[Shared Memory と Atomic](/graphics/compute/shared-memory.html) · [NVIDIA CUDA C++ Programming Guide 12.9 — Shared Memory](https://docs.nvidia.com/cuda/archive/12.9.0/cuda-c-programming-guide/index.html#shared-memory)

<figure style="margin: 1rem 0">
  <div role="img" aria-label="4×4行列積の左上2×2を担当するブロック。Kの区間0・1では、Aの左上1,2,5,6とBの左上1,2,3,4から、Cの途中和7,10,23,34を作る。Kの区間2・3では、Aの右上3,4,7,8とBの左下5,6,7,8を読み、Cの確定値50,60,114,140になる。A00はC00とC01のスレッドが使い、B00はC00とC10のスレッドが使う。" style="display: grid; gap: 0.65rem; max-width: 38rem; font-size: 0.87em; font-variant-numeric: tabular-nums">
    <div data-k-start="0" style="padding: 0.5rem 0.6rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
      <strong>Kの区間 0・1</strong>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); text-align: center; gap: 0.35rem; margin-top: 0.35rem">
        <div><span>Aの共有タイル</span><div data-matrix="A" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.15rem; margin-top: 0.22rem"><span data-element="A00" data-value="1" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A00</small><span>1</span></span><span data-element="A01" data-value="2" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A01</small><span>2</span></span><span data-element="A10" data-value="5" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A10</small><span>5</span></span><span data-element="A11" data-value="6" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A11</small><span>6</span></span></div></div>
        <div><span>Bの共有タイル</span><div data-matrix="B" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.15rem; margin-top: 0.22rem"><span data-element="B00" data-value="1" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B00</small><span>1</span></span><span data-element="B01" data-value="2" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B01</small><span>2</span></span><span data-element="B10" data-value="3" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B10</small><span>3</span></span><span data-element="B11" data-value="4" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B11</small><span>4</span></span></div></div>
        <div><span>Cの途中和</span><div data-matrix="C" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.15rem; margin-top: 0.22rem"><span data-element="C00" data-value="7" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C00</small><span>7</span></span><span data-element="C01" data-value="10" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C01</small><span>10</span></span><span data-element="C10" data-value="23" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C10</small><span>23</span></span><span data-element="C11" data-value="34" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C11</small><span>34</span></span></div></div>
      </div>
    </div>
    <div data-k-start="2" style="padding: 0.5rem 0.6rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
      <strong>Kの区間 2・3</strong>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); text-align: center; gap: 0.35rem; margin-top: 0.35rem">
        <div><span>Aの共有タイル</span><div data-matrix="A" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.15rem; margin-top: 0.22rem"><span data-element="A02" data-value="3" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A02</small><span>3</span></span><span data-element="A03" data-value="4" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A03</small><span>4</span></span><span data-element="A12" data-value="7" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A12</small><span>7</span></span><span data-element="A13" data-value="8" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>A13</small><span>8</span></span></div></div>
        <div><span>Bの共有タイル</span><div data-matrix="B" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.15rem; margin-top: 0.22rem"><span data-element="B20" data-value="5" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B20</small><span>5</span></span><span data-element="B21" data-value="6" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B21</small><span>6</span></span><span data-element="B30" data-value="7" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B30</small><span>7</span></span><span data-element="B31" data-value="8" style="display: grid; border-radius: 4px; background: var(--vp-c-brand-soft); padding: 0.14rem 0.12rem"><small>B31</small><span>8</span></span></div></div>
        <div><span>Cの確定値</span><div data-matrix="C" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.15rem; margin-top: 0.22rem"><span data-element="C00" data-value="50" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C00</small><span>50</span></span><span data-element="C01" data-value="60" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C01</small><span>60</span></span><span data-element="C10" data-value="114" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C10</small><span>114</span></span><span data-element="C11" data-value="140" style="display: grid; border-radius: 4px; background: var(--vp-c-bg-soft); padding: 0.14rem 0.12rem"><small>C11</small><span>140</span></span></div></div>
      </div>
    </div>
    <div style="display: grid; gap: 0.25rem; padding: 0.45rem 0.6rem; background: var(--vp-c-bg-soft); border-radius: 6px">
      <span data-reuse="A00:C00,C01"><strong>A00</strong> → C00・C01のスレッド（同じ行）</span>
      <span data-reuse="B00:C00,C10"><strong>B00</strong> → C00・C10のスレッド（同じ列）</span>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">Cの左上の2×2だけを表示。A00はAの行0・列0。上の区間の途中和に、下の区間の積の和を足してCを確定する。</figcaption>
</figure>

たとえばC00のスレッドは、初回に `1 × 1 + 2 × 3 = 7` を得ます。次の区間では `3 × 5 + 4 × 7 = 43` を足すので、C00は `7 + 43 = 50` です。各スレッドが自分の途中和を持ち続け、2区間を処理し終えたところでCに書きます。Aの同じ行やBの同じ列を共有しても、出力ごとに使う組み合わせは変わります。

## 減るのはグローバルメモリの要素読み出し要求

1つのK区間で、各スレッドが直接読む素朴な実装なら、出力1個につきKが2要素、各積にAとBを1要素ずつ使うため4回読みます。出力4個で **16回** です。共有する実装では、AとBのタイルを各4要素ずつ分担して読むので **8回** です。共有メモリへの書き込みと、そこからの読み込みは別に発生します。[NVIDIA CUDA C++ Best Practices Guide §10.2.3.2](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#shared-memory-in-matrix-multiplication-c-ab)

| 数える範囲 | 直接読む | 共有して読む |
| --- | ---: | ---: |
| 1ブロック・Kの1区間 | 16回 | 8回 |
| 1ブロック・Kの全区間 | 32回 | 16回 |
| 全4ブロック | 128回 | 64回 |

表は各スレッドがグローバルメモリから要求するスカラー要素を、重複も含めて数えたものです。Aの同じ部分を別の列の出力タイルに使う場合など、別ブロックで同じ要素を再び要求します。表にはCの書き込みを含めていません。この例ではどちらも、各スレッドがCの1要素を最後に書きます。

[メモリアクセスの合体](/hardware/gpu/memory-coalescing.html)は、同じ命令に参加するレーンのアドレスをまとめ、必要なメモリ区間を減らす仕組みです。ここでのタイル化では、一度読み出した入力を共有メモリに置いて使い回し、グローバルメモリへの要素の要求を減らします。タイルの読み込みを近いアドレスのレーン同士でまとめられるように割り当てれば、両方を組み合わせられます。[NVIDIA CUDA C++ Best Practices Guide §10.2.3.2](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#shared-memory-in-matrix-multiplication-c-ab)

重複する要素の要求は、合体やキャッシュで吸収される場合があります。128回が64回になっても、メモリのトランザクション数、DRAM転送量、処理時間の比はこの数だけでは求まりません。[Rooflineモデル](/hardware/gpu/roofline-model.html)でDRAM帯域と比べるなら、分母には実際にDRAM境界を通ったバイト数を使います。[NVIDIA Nsight Compute Profiling Guide — Quantities](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#quantities)

## 同期と、タイルを置く場所の容量

共有タイルを使う各区間で、次の2か所の順序をそろえます。[NVIDIA CUDA C++ Programming Guide 12.9 — Shared Memory](https://docs.nvidia.com/cuda/archive/12.9.0/cuda-c-programming-guide/index.html#shared-memory) · [CUDA Programming Guide — Thread Block Synchronization Functions](https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/cpp-language-extensions.html#thread-block-synchronization-functions)

1. **読み始める前**に、全スレッドの共有メモリへの書き込みが終わるのを待ちます。ほかのスレッドが担当した要素も、ここから読めます。
2. **次の区間で上書きする前**に、全スレッドが共有タイルを読み終えるのを待ちます。早く終わったスレッドが次の区間の値を書き、まだ計算中のスレッドがそれを読んでしまうのを防ぎます。

このようなブロック内の順序はCUDAでは `__syncthreads()` でそろえられます。この例では4スレッドとも同じバリアに到達する形で考えます。最後の区間の後、共有領域を再利用しないなら、上書き防止のバリアは不要です。[CUDA Programming Guide — Thread Block Synchronization Functions](https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/cpp-language-extensions.html#thread-block-synchronization-functions)

この例でA・Bの共有タイルは合計8要素です。各要素を4バイト、共有タイルを1組とすると、使う領域は32バイトです。出力の行・列やK区間を大きくすると、保持する領域も変わります。ブロックあたりで使える共有メモリには上限があります。各ブロックの使用量が増えると、同じSM（GPU上でブロックを実行する単位）に同時に置けるブロック数も減ることがあります。再利用で減った読み出しと、同期・共有メモリの費用を合わせて測ります。[NVIDIA CUDA C++ Best Practices Guide §11.4](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#effects-of-shared-memory)

## 要点

- 出力Cの2×2を1ブロックで担当し、同じ行のスレッドはA、同じ列のスレッドはBの要素を再利用します。
- Kを2要素ずつに分けて、同じ出力の途中和に足します。共有タイルを読む前と、次の区間で上書きする前に順序をそろえます。
- 全4ブロックの例では、入力の論理読み出し要求が128回から64回になります。合体やキャッシュを経たDRAM転送量は別に測ります。
- タイル化の効果は、出力タイルとK区間の大きさ、共有メモリ容量、同期、アクセスのまとまり方によって変わります。

## 理解度チェック

::: details C10とC11のスレッドは、Kの最初の区間でどの要素を共有する？
Aの行1のA10とA11です。Bはそれぞれ別の列を使います。
:::

::: details 最初の区間の読み込み後だけ同期して、次の区間をすぐ同じ共有メモリに書くとどうなる？
一部のスレッドが最初の区間をまだ読んでいる間に、別のスレッドが次の区間の値を上書きするおそれがあります。2番目の同期はこの読み込みと上書きの順序をそろえます。
:::

## 検証範囲

2026年11月21日にNVIDIAの公式資料を確認し、WindowsのPython 3.12.4で、直接読む方式と共有タイル方式の4×4出力が一致すること、図の途中和と要素読み出し数を検算しました。図はGPUで計測した結果ではありません。GPUのカーネル実行、DRAM転送量、実行時間、共有メモリの実効帯域は測定していません。

## 関連項目

- [GPU実行モデル](/graphics/compute/execution-model.html) — レーンやグループをどうまとめて実行するかを読む。
- [Shared Memory と Atomic](/graphics/compute/shared-memory.html) — スレッドグループで共有データを使う画像処理の例を読む。
- [GPUのメモリアクセスの合体](/hardware/gpu/memory-coalescing.html) — 同じ命令のアドレスが触れる区間数を数える。
- [Rooflineモデル](/hardware/gpu/roofline-model.html) — 実測の転送量から、演算性能と帯域の上限を比べる。
- [FlashAttention](/algorithms/flash-attention.html) — Attentionのタイル化と、softmaxの途中状態から中間行列の書き出しを減らす方法を読む。
- [行列](/math/rendering/matrix.html) — GPUで使う変換の合成と、行・列の格納順序を確認する。

## 参考資料

- [NVIDIA — CUDA C++ Best Practices Guide 13.5 §10.2.3.2](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#shared-memory-in-matrix-multiplication-c-ab) — $C=AB$ の各スレッドへの割り当てと、A・Bの共有による再利用。
- [NVIDIA — CUDA C++ Programming Guide 12.9 §4.2.4](https://docs.nvidia.com/cuda/archive/12.9.0/cuda-c-programming-guide/index.html#shared-memory) — 複数のK区間を処理する行列積の例と、ロード後・再利用前のバリア。
- [NVIDIA — CUDA Programming Guide, Thread Block Synchronization Functions](https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/cpp-language-extensions.html#thread-block-synchronization-functions) — CUDAのブロック同期。
- [NVIDIA — CUDA C++ Best Practices Guide §11.4](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#effects-of-shared-memory) · [Nsight Compute Profiling Guide — Quantities](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#quantities) — 共有メモリ容量と常駐ブロック、転送計測。
