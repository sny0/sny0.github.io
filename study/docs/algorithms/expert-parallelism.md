---
title: MoEのエキスパート並列：トークンがGPUを行き来する理由
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 2台のGPU・2専門家・4トークンで、ルーティング後の配送、専門家の計算、返送とcombineを追う。偏りとGPU間通信のコストを分けて考える。
  aliases: [エキスパート並列, 専門家並列, Expert Parallelism, MoE Dispatch, MoE Combine, All-to-All, GShard]
  verification: GShard原論文とNCCL公式資料に照合し、WindowsのPython 3.12.4で4トークンの配送・結果・元の順序・GPU間の論理ペイロードを検算（2026-11-21）
---

# MoEのエキスパート並列：トークンがGPUを行き来する理由

GPU 0にある入力をMoEのルーターで振り分けたら、選ばれた専門家がGPU 1にいるとします。GPU 1は、そのトークンの中間ベクトルを受け取って計算し、結果をGPU 0の元の位置へ戻します。**エキスパート並列**は、こうした専門家の重みと計算を複数のデバイスに分ける方法です。[GShard原論文 §3.1–3.3](https://arxiv.org/html/2006.16668#S3)

## この記事で分かること

4トークンを例に、ルーターが決める行き先と、実際にベクトルを送る段階を区別できます。専門家の計算結果が元のトークンへどう戻るかを追い、負荷の偏りとGPU間を通るデータ量を別々に数えられます。

## ルーティングは宛先、dispatchはデータの移動

[MoEルーティング](/algorithms/moe-routing.html)で決まるのは、トークンごとに使う専門家と、専門家の出力に掛ける係数です。ここから先は、選んだ専門家がどのGPUにいるかを使って、データを並べ直します。**dispatch**は、トークンの中間ベクトルを専門家別にまとめ、その専門家が計算する場所へ届ける処理です。どの元位置に対応するかは、後で出力を戻せるように順序や対応表で管理します。[GShard原論文 §3.1・Algorithm 2](https://arxiv.org/html/2006.16668#S3.SS1)

教材ではGPU 0にトークンA・Bと専門家E0、GPU 1にトークンC・Dと専門家E1を置きます。各トークンを1専門家に送るtop-1の例です。ルーターが次の行き先を選んだものとし、図では出力に掛ける係数を1、容量を全件が入る大きさとします。GShard原論文はTPUで学習した例で、トークンをグループに分け、容量などを見ながら最大2専門家を選びます。ここでは同じ配送・回収の考え方を2台のGPUで小さく表します。[GShard原論文 §2.2・§4.1](https://arxiv.org/html/2006.16668#S2.SS2)

## 2台のGPUで、AとCだけが往復する

図では各トークンの中間ベクトルを2成分とします。専門家の計算を追いやすくするため、E0は各成分を2倍し、E1は2成分を入れ替えます。Aの入力は `(1, 2)`、Bは `(2, 1)`、Cは `(1, 3)`、Dは `(3, 1)` です。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="GPU0にA・B、GPU1にC・D。ルーターはAとDにE1、BとCにE0を割り当てる。配送ではAの入力がGPU0からGPU1へ、Cの入力がGPU1からGPU0へ。BとDは手元に残る。E0はBとCを2倍、E1はAとDの2成分を入れ替え。返送ではAの結果がGPU1からGPU0へ、Cの結果がGPU0からGPU1へ。元の位置に戻すとGPU0はAの結果、Bの結果の順、GPU1はCの結果、Dの結果の順。" style="display: grid; gap: 0.72rem; max-width: 38rem; font-size: 0.86em; font-variant-numeric: tabular-nums">
    <div data-ep-stage="route" style="display: grid; gap: 0.3rem">
      <strong>ルーティングで専門家を選ぶ</strong>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem">
        <div data-ep-slot="source0" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px"><strong>GPU 0の入力</strong><br>A (1, 2) → E1<br>B (2, 1) → E0</div>
        <div data-ep-slot="source1" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px"><strong>GPU 1の入力</strong><br>C (1, 3) → E0<br>D (3, 1) → E1</div>
      </div>
    </div>
    <div data-ep-stage="dispatch" style="display: grid; gap: 0.3rem">
      <strong>dispatch · 入力ベクトルを送る</strong>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem">
        <div data-ep-slot="cross-a" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: var(--vp-c-brand-soft)"><strong>GPU 0 → GPU 1</strong><br>A (1, 2)</div>
        <div data-ep-slot="cross-c" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: var(--vp-c-brand-soft)"><strong>GPU 1 → GPU 0</strong><br>C (1, 3)</div>
      </div>
    </div>
    <div data-ep-stage="expert" style="display: grid; gap: 0.3rem">
      <strong>専門家ごとに計算する</strong>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem">
        <div data-ep-slot="expert0" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px"><strong>GPU 0のE0 · 2倍</strong><br>B′ (4, 2)<br>C′ (2, 6)</div>
        <div data-ep-slot="expert1" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px"><strong>GPU 1のE1 · 入替</strong><br>A′ (2, 1)<br>D′ (1, 3)</div>
      </div>
    </div>
    <div data-ep-stage="return" style="display: grid; gap: 0.3rem">
      <strong>計算結果を入力元へ返送する</strong>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem">
        <div data-ep-slot="return-a" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: var(--vp-c-brand-soft)"><strong>GPU 1 → GPU 0</strong><br>A′ (2, 1)</div>
        <div data-ep-slot="return-c" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: var(--vp-c-brand-soft)"><strong>GPU 0 → GPU 1</strong><br>C′ (2, 6)</div>
      </div>
    </div>
    <div data-ep-stage="combine" style="display: grid; gap: 0.3rem">
      <strong>combine · 元の位置に結果を置く</strong>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem">
        <div data-ep-slot="output0" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px"><strong>GPU 0の出力</strong><br>A′ (2, 1)<br>B′ (4, 2)</div>
        <div data-ep-slot="output1" style="padding: 0.38rem 0.5rem; border: 1px solid var(--vp-c-divider); border-radius: 5px"><strong>GPU 1の出力</strong><br>C′ (2, 6)<br>D′ (1, 3)</div>
      </div>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">色の付いた段はGPU間をまたぐデータ。BとDは自分のGPUで計算する。A′などのダッシュは、専門家が計算した後のベクトルを示す。</figcaption>
</figure>

往路では、GPU 0はAの入力を、GPU 1はCの入力を相手へ送ります。BとDは手元の専門家に渡します。専門家は到着したトークンをまとめて計算するので、GPU 0のE0の仕事はB・C、GPU 1のE1の仕事はA・Dです。GShardでは、入力グループ単位の配置から専門家単位の配置に変えるときに、**all-to-all**で送り先ごとの断片を交換します。図は物理的に別のGPUへ渡るベクトルだけに印を付けています。[GShard原論文 §3.3.1–3.3.2・図4a](https://arxiv.org/html/2006.16668#S3.SS3) · [NVIDIA NCCL — AlltoAll](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html#alltoall)

復路で戻すのは、A・Cの**計算後のベクトル**です。GPU 0は、手元で先に計算したB′と、別GPUから受け取ったA′をそのまま並べず、入力の順にA′・B′と置き直します。**combine**は、このように専門家の出力を元のトークン位置に対応させ、同じトークンから複数の専門家を使った場合は、各出力に係数を掛けて足す処理です。図ではGPU間の返送と、位置を戻す処理を分けて表しています。[GShard原論文 §3.1・Algorithm 2](https://arxiv.org/html/2006.16668#S3.SS1)

たとえばAをE0とE1の両方に送る別の条件なら、上の簡略計算で出力は `(2, 4)` と `(2, 1)` です。係数が1/4と3/4なら、Aの位置に返す値は `(2, 1.75)` です。どの候補が採用され、どの係数になるかはルーティングの条件で決まります。[GShard原論文 §2.2・§3.1](https://arxiv.org/html/2006.16668#S2.SS2)

## 偏りと、GPU間を通る量は別に数える

同じ4トークンとGPU配置で、Aの行き先だけをE0に変えます。GPU 0のE0は3トークン、GPU 1のE1は1トークンを処理し、計算量が片側に寄ります。一方、GPU間を往復するのはCだけになります。どちらにも容量は十分あるとします。

| 振り分け | 計算件数（E0・E1） | GPU間の往復合計 |
| --- | ---: | ---: |
| 図の振り分け | 2・2件 | 4ベクトル |
| AもE0へ | 3・1件 | 2ベクトル |

この表の往復合計は、dispatchと返送を足したベクトル本数です。図の4本を2成分のFP32とするなら、GPUをまたぐ**論理ペイロード**は計32バイトです。実際の通信量は、並べ替え用の情報、転送枠をそろえるための空き、使う通信方式などでも変わります。たとえばNCCLの `ncclAlltoAll` は相手ごとの固定長チャンクを交換します。上の表は可変長のルーティング結果を数えたもので、空きを含めて送る量は別に数えます。[NVIDIA NCCL — AlltoAll](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html#alltoall) · [GShard原論文 §3.3・§5.2–5.3](https://arxiv.org/html/2006.16668#S5)

同じ件数でも、GPU間リンクが混むと返送が遅れます。逆に、GPUをまたぐ量が少なくても、一方の専門家に計算が集中すると、その結果を待つことがあります。実際の待ち時間には、ベクトルの幅、GPUの配置、専門家ごとの処理件数、通信と計算を重ねられるかが関わります。[GShard原論文 §2.2・§5.2–5.3](https://arxiv.org/html/2006.16668#S5) · [MoEルーティング](/algorithms/moe-routing.html)

## テンソル並列のall-reduceとの違い

この例の**all-to-all**は、選んだ専門家へトークン別のベクトルを届け、計算後のベクトルを元へ返すための交換です。[テンソル並列](/algorithms/tensor-parallelism.html)の記事の**all-reduce**は、各GPUが同じ出力成分に作った部分和を足し、全参加GPUへ同じ合計を返します。[GShard原論文 §3.3.2・図4a–b](https://arxiv.org/html/2006.16668#S3.SS3.SSS2) · [NVIDIA NCCL — Collective Operations](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html)

専門家ごとの配置と、専門家の中の計算の分割は組み合わせられます。たとえばMegatron Core 0.20.0では、専門家をGPUに分けたうえで、各専門家の層にもテンソル並列を指定できます。[NVIDIA — Megatron Core 0.20.0, Mixture of Experts](https://docs.nvidia.com/megatron-core/developer-guide/0.20.0/user-guide/features/moe.html#core-arguments)

## 要点

- ルーティングは専門家を選び、dispatchは中間ベクトルをその専門家のいるGPUへ届けます。
- 専門家の計算後は出力ベクトルを返し、combineで元のトークンの位置に戻します。複数の専門家の出力があれば、係数を掛けて足します。
- GPU間を通るベクトルの本数は、専門家ごとの計算件数とは別に数えます。通信と計算の両方が待ち時間に影響します。
- all-to-allは宛先ごとのデータの交換です。加算のall-reduceでは、同じ成分の部分和を足した結果が各GPUに届きます。

## 理解度チェック

::: details E0が先にB′を計算したなら、GPU 0の先頭にB′を置いてよい？
入力時のGPU 0の並びはA・Bです。A′が別GPUから届いたらAの位置、B′はBの位置に置きます。
:::

::: details Aの行き先までE0になったら、GPU間の往復も増える？
この例ではAがGPU 0内で処理されるので、GPU間を往復するのはCだけになります。一方、E0の計算件数は2件から3件に増えます。
:::

## 検証範囲

2026年11月21日にGShard原論文とNCCL公式資料を確認し、WindowsのPython 3.12.4で、4トークンの配送、専門家出力、元の順序への復元、重み付きの例、往復のベクトル数を検算しました。この例は通信経路の説明用です。GPU間の実測帯域、学習済みモデルの出力、推論時間は測定していません。

## 関連項目

- [MoEの仕組み](/algorithms/moe-routing.html) — ルーターが専門家を選ぶ仕組みと、容量が足りない場合の扱いを読む。
- [LLMのテンソル並列](/algorithms/tensor-parallelism.html) — 同じ出力成分を各GPUで部分計算し、最後に足し合わせる流れを追う。
- [Prefillとdecodeの分離](/algorithms/disaggregated-prefill-decode.html) — 生成段階を分けるときにGPU群の間でKVを渡す仕組みを読む。
- [LLMのパイプライン並列](/algorithms/pipeline-parallelism.html) — 専門家を選ぶ配置と、層を順に通す配置を比べる。

## 参考資料

- [Dmitry Lepikhinほか — GShard: Scaling Giant Models with Conditional Computation and Automatic Sharding（2020）](https://arxiv.org/abs/2006.16668) — §2.2のtop-2、§3.1のdispatchとcombine、§3.3のデバイス間交換。
- [NVIDIA — NCCL Collective Operations](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html#alltoall) — 固定長の宛先別チャンクを用いるall-to-allと、all-reduceの意味。
