---
title: LLMのテンソル並列：1層を複数GPUで計算すると、なぜ通信が要るのか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 行ベクトルの2層MLPで、1つめの重みを出力方向、2つめを入力方向に分ける。部分和のall-reduceと、データ並列・パイプライン並列との違いを追う。
  aliases: [テンソル並列, テンソルモデル並列, Tensor Parallelism, Tensor Model Parallelism, Megatron-LM, All-Reduce]
  verification: Megatron-LM原論文とNCCL公式資料に照合し、WindowsのPython 3.12.4で2層MLPの分割計算・部分和を検算（2026-11-21）
---

# LLMのテンソル並列：1層を複数GPUで計算すると、なぜ通信が要るのか

LLMの重みが1台のGPUに収まらないときは、1つの層の重みを分け、複数のGPUで同じ入力を処理できます。これを**テンソル並列**と呼びます。分け方には、各GPUが出力の別々の成分を作るものと、同じ成分への寄与を別々に作るものがあります。後者では、結果を使う前にその寄与を足す必要があります。[ShoeybiらのMegatron-LM原論文 §3](https://arxiv.org/abs/1909.08053)

## この記事で分かること

2台のGPUが2層MLPのどの成分を計算するかを追い、途中で値を集めずに進められる理由と、最後にall-reduceが必要な理由を説明できます。テンソル並列、データ並列、パイプライン並列で何を分けるかも区別できます。

## この例では、重みの行が入力・列が出力

Transformerの層にある**MLP**は、ここでは2つの線形変換の間に、値を成分ごとに変える活性化関数を置いた部分です。入力 $x$ を行ベクトルとして $xW$ と掛けるので、重み $W$ の**行は入力成分、列は出力成分**です。たとえば $W_{i,j}$ は、入力 $i$ が出力 $j$ にどれだけ寄与するかを表します。この例の行・列の呼び方は数式上の向きです。転置した形で重みを保持する実装では、配列上の行と列の呼び方が逆になるため、分けるのが入力側か出力側かを確認します。[Megatron-LM原論文 §3・式1–3](https://arxiv.org/pdf/1909.08053#page=4) · [TransformerとAttention](/algorithms/transformer-attention.html)

入力は2成分、中間は4成分、出力は2成分です。最初の重み $W_1$ は2×4、次の重み $W_2$ は4×2です。バイアスは省きます。Megatron-LM原論文ではGeLUを使いますが、この例では計算を追いやすくするため、負の成分を0にする**ReLU**を使います。[Megatron-LM原論文 §3・図3a](https://arxiv.org/pdf/1909.08053#page=4)

```text
x = (2, 1)

W1（縦線が列の分割）
  1  -1 | 1  2
  0   1 | 1  1

W2（横線が行の分割）
  1   2
  3   1
  -----
  2   0
  1   1
```

## 1つめの行列積は出力方向に分ける

この例は両GPUが同じ入力 $x=(2,1)$ を持ったところから始めます。GPU 0は $W_1$ の列0・1だけを持ち、中間の最初の2成分 $(2,-1)$ を計算します。GPU 1は列2・3を持ち、後ろの2成分 $(3,5)$ を計算します。比べているのは同じ入力に対する**別の出力成分**です。元の4成分は、この2組を順番に並べたものです。[Megatron-LM原論文 §3・式3](https://arxiv.org/pdf/1909.08053#page=4)

ReLUは成分ごとに適用できるため、GPU 0は $(2,0)$、GPU 1は $(3,5)$ をそれぞれ求められます。その後に使う $W_2$ も、中間成分の担当に合わせて分けておけば、最初の行列積と次の行列積の間で4成分を集め直す必要はありません。[Megatron-LM原論文 §3・図3a](https://arxiv.org/pdf/1909.08053#page=4)

## 2つめの行列積は入力方向に分け、部分和を足す

$W_2$ の行0・1は、GPU 0が持つ中間成分 $(2,0)$ に対応します。この2行だけを掛けると、最終出力2成分への寄与は $(2,4)$ です。GPU 1も同じ出力2成分について、行2・3から寄与 $(11,5)$ を求めます。今回は両GPUとも**同じ出力成分の一部分**を出しているので、成分ごとに足します。[Megatron-LM原論文 §3・図3a](https://arxiv.org/pdf/1909.08053#page=4)

<figure style="margin: 1rem 0">
  <div role="img" aria-label="両GPUが入力2,1を持つ。GPU0はW1の列0・1で2,-1、ReLU後は2,0。W2の行0・1で部分出力2,4。GPU1はW1の列2・3で3,5、ReLU後も3,5。W2の行2・3で部分出力11,5。最後にだけall-reduceで各成分を足し、両GPUが13,9を受け取る。" style="display: grid; gap: 0.55rem; max-width: 35rem; font-size: 0.87em; font-variant-numeric: tabular-nums">
    <div data-tp-value="input" style="text-align: center; padding: 0.35rem; background: var(--vp-c-bg-soft); border-radius: 5px">両GPUに同じ入力 <strong>(2, 1)</strong></div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem">
      <div data-tp-gpu="0" style="display: grid; gap: 0.38rem; min-width: 0; padding: 0.55rem 0.65rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
        <strong>GPU 0</strong>
        <div>W1の列0・1<br><strong data-tp-value="before">(2, -1)</strong></div>
        <div>ReLUの後<br><strong data-tp-value="hidden">(2, 0)</strong></div>
        <div>W2の行0・1<br>部分出力 <strong data-tp-value="partial">(2, 4)</strong></div>
      </div>
      <div data-tp-gpu="1" style="display: grid; gap: 0.38rem; min-width: 0; padding: 0.55rem 0.65rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
        <strong>GPU 1</strong>
        <div>W1の列2・3<br><strong data-tp-value="before">(3, 5)</strong></div>
        <div>ReLUの後<br><strong data-tp-value="hidden">(3, 5)</strong></div>
        <div>W2の行2・3<br>部分出力 <strong data-tp-value="partial">(11, 5)</strong></div>
      </div>
    </div>
    <div data-tp-value="sum" style="text-align: center; padding: 0.45rem; background: var(--vp-c-brand-soft); border-radius: 5px">
      <strong>all-reduceで成分ごとに加算</strong><br>
      (2, 4) + (11, 5) = <strong>(13, 9)</strong><br>
      両GPUが (13, 9) を受け取る
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">入力を置いた後、上の2列の計算はそれぞれのGPUで進む。GPU間で部分結果を合計するのはW2の計算後。</figcaption>
</figure>

**all-reduce**は、参加する全GPUの値をまとめ、同じ結果を全GPUへ返す通信です。ここで使う加算では、位置0は $2+11=13$、位置1は $4+5=9$ になります。ひとつのGPUだけが合計を持つ処理や、別の位置を計算した断片を連結する処理とは役割が違います。出力方向に分割した断片の全体を各GPUで必要とするときには、断片を順に集めて配るall-gatherを使う方式もあります。[NVIDIA NCCL — Collective Operations](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html#allreduce)

同じ入力で分割せず計算すると、ReLU後の4成分は $(2,0,3,5)$ です。これを $W_2$ 全体に掛けても $(13,9)$ が得られます。Megatron-LMの図3aの構成では、このMLPの**順伝播**（入力から出力を計算）に1回のall-reduceがあります。学習で勾配を戻す際の通信や、TransformerのAttention側の通信は別に数えます。[Megatron-LM原論文 §3・図3–4](https://arxiv.org/pdf/1909.08053#page=4)

## 何を分けるかで、通信の相手と中身が変わる

| 並列の方法 | 分けるもの | 受け渡すものの例 |
| --- | --- | --- |
| テンソル並列 | 同じ層の重みと計算 | 同じ出力への部分和 |
| データ並列 | 入力や学習データ | 学習時に勾配を集約 |
| パイプライン並列 | 層のまとまり | 次の段に渡す中間値 |

単純な**データ並列**では、各GPUまたはGPU群が同じモデルを持ち、別々の入力を処理します。独立したリクエストを推論するだけなら、表のような勾配集約はありません。**パイプライン並列**では、たとえば前半の層と後半の層を別のGPU群に割り当て、前半の出力を後半に渡します。複数の方式は組み合わせられます。[Narayananらの分散Megatron-LM論文 §2](https://arxiv.org/html/2104.04473v5)

[Prefillとdecodeの分離](/algorithms/disaggregated-prefill-decode.html)は、入力処理と生成を別GPU群に置く構成です。1層内の部分和を足すテンソル並列とは分ける単位が違い、それぞれのGPU群の内側でテンソル並列を使うこともできます。[DistServe原論文 §3・§4](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

## 重みは分けられても、通信の時間はかかる

この例の2枚の重みには合計16要素があり、分割すると各GPUは8要素を持ちます。一方で入力と最終結果は両方に置くため、この比率がGPUメモリ全体にそのまま当てはまるわけではありません。大きな行列積を分けると各GPUの仕事は減りますが、分割した行列が小さすぎると演算器を使い切れないことがあります。[Narayananらの分散Megatron-LM論文 §3.2–3.3](https://arxiv.org/html/2104.04473v5)

この図の部分出力をFP32とすれば、all-reduceに渡す入力は各GPUで2成分、8バイトです。これは通信プリミティブに渡すベクトルの大きさで、リンク全体を何バイト流れるかは実装と配置で変わります。集約を繰り返す場合は、データを運ぶ帯域に加え、通信を始めて結果がそろうまでの待ちも効きます。GPU間の経路と、分割で減った計算時間を含めて判断します。[NVIDIA NCCL — Collective Operations](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html#allreduce) · [Narayananらの分散Megatron-LM論文 §3.2–3.3・§5.4.1](https://arxiv.org/html/2104.04473v5)

## 要点

- 行ベクトルに右から重みを掛けるこの例では、重みの列が出力方向、行が入力方向です。
- 1つめの重みを出力方向に分ければ、成分ごとの活性化まで各GPUで計算できます。2つめを入力方向に分けると、その成分を集めずに次の行列積へ渡せます。
- 2つめの行列積で、各GPUは同じ出力への部分和を作ります。加算のall-reduceで全GPUが同じ結果を受け取ります。
- 分割で各GPUの重みは減ります。実際の速さは、演算器の利用率や、通信の回数・帯域・待ち時間に左右されます。

## 理解度チェック

::: details GPU 0の(2, 4)とGPU 1の(11, 5)をつないで(2, 4, 11, 5)としてはいけないのはなぜ？
各GPUが同じ2成分への寄与を計算しているからです。位置をそろえて足した(13, 9)が出力になります。
:::

::: details 1つめの重みも入力方向に分けた場合、各GPUの部分和に先にReLUを掛けてもよい？
一般には結果が変わります。たとえば `ReLU(-1 + 2) = 1` ですが、`ReLU(-1) + ReLU(2) = 2` です。こういう分け方では、先に同じ成分の部分和を足します。
:::

## 検証範囲

2026年11月21日にMegatron-LMの原論文とNCCL公式資料を確認し、WindowsのPython 3.12.4で1台分と2分割の行列積、ReLU、部分和の加算を照合しました。2台のGPUへの配置とFP32のサイズは説明用です。GPU間通信、実モデルの出力や推論速度、VRAM使用量は測定していません。

## 関連項目

- [TransformerとAttention](/algorithms/transformer-attention.html) — Transformerの入力表現とAttentionの計算を読む。
- [Prefillとdecodeの分離](/algorithms/disaggregated-prefill-decode.html) — 推論の段階を別GPU群に載せ、KVキャッシュを渡す構成を読む。
- [MoEの仕組み](/algorithms/moe-routing.html) — 同じ層でトークンを専門家へ振り分ける場合のGPU間通信を読む。
- [MoEのエキスパート並列](/algorithms/expert-parallelism.html) — 部分和の集約と、トークン別のベクトルの交換を比べる。
- [GPUのタイル化](/hardware/gpu/matrix-multiplication-tiling.html) — 1台のGPUの中で、行列積の入力を共有して使い回す方法を読む。

## 参考資料

- [Mohammad Shoeybiほか — Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism（2019、v4は2020）](https://arxiv.org/abs/1909.08053) — §3・図3aのMLPの分割と集約。
- [NVIDIA — NCCL Collective Operations](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html#allreduce) — all-reduceやall-gatherで各参加者が受け取る結果。
- [Deepak Narayananほか — Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM（2021）](https://arxiv.org/html/2104.04473v5) — 3種類の並列化の組み合わせとGPU間通信のコスト。
