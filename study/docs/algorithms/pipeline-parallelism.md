---
title: LLMのパイプライン並列：層を分けると、なぜGPUに待ち時間が生まれるのか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 2段に4つのマイクロバッチを流し、前向き計算で生まれる充填・定常・排出とバブルを図で追う。逆伝播、段間の通信と負荷不均衡を区別する。
  aliases: [パイプライン並列, パイプラインモデル並列, Pipeline Parallelism, GPipe, マイクロバッチ, パイプラインバブル]
  verification: GPipe原論文と分散Megatron-LM論文に照合し、WindowsのPython 3.12.4で2段×4マイクロバッチの時系列と空き枠を検算（2026-11-21）
---

# LLMのパイプライン並列：層を分けると、なぜGPUに待ち時間が生まれるのか

LLMの前半の層をGPU 0、後半の層をGPU 1に置きます。GPU 1は、最初の入力について前半の計算結果が届くまで待ちます。一方、それを受け取ったあとは、GPU 0が次の入力の前半を計算できます。**パイプライン並列**は、連続する層をいくつかの段に分け、別々の入力の計算を時間的に重ねる方法です。[GPipe原論文 §2・図2](https://arxiv.org/pdf/1811.06965#page=3)

## この記事で分かること

2段に4つのマイクロバッチを流す例から、GPUが両方動く区間と、片方が待つ区間を数えられます。層の分割、段間の通信、学習の逆伝播が、それぞれどこで起きるかを説明できます。

## 前半と後半の層に、同じ入力を順に通す

GPU 0とGPU 1に、連続する層のまとまりを1つずつ割り当てます。それぞれを前段・後段と呼びます。1つの入力を進めるには、前段の出力を後段の入力にする必要があります。前段だけを通った入力の**活性値**（層の計算から得られた中間の数値）をGPU間で受け渡します。[GPipe原論文 §2.1–2.2](https://arxiv.org/pdf/1811.06965#page=3)

GPipeでは、ひとまとまりの学習入力（ミニバッチ）をさらに小分けにし、**マイクロバッチ**として順に流します。ここではその小分けをMB1〜MB4と呼びます。後段がMB1を計算している間、空いた前段はMB2を進められます。この例で分けているのは処理する入力のまとまりです。各マイクロバッチは前段・後段の両方を通ります。[GPipe原論文 §2.2・図2c](https://arxiv.org/pdf/1811.06965#page=3)

## 2段×4マイクロバッチを前向きに流す

すべてのマイクロバッチを最初から投入でき、各段の計算が同じ長さの1スロットで終わるとします。段間通信と起動の時間は省きます。図は**順伝播**（入力から出力へ進む計算）だけを数える概念例です。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="2台のGPUで前向き計算を5スロット実行。第1スロットは充填でGPU0がMB1、GPU1は待ち。第2〜4スロットは定常でGPU0がMB2、MB3、MB4、GPU1がMB1、MB2、MB3を並行処理。第5スロットは排出でGPU0は待ち、GPU1がMB4を処理する。" style="max-width: 36rem; font-size: 0.9em; font-variant-numeric: tabular-nums">
    <div style="display: grid; grid-template-columns: 4.8em repeat(5, minmax(0, 1fr)); gap: 0.32rem 0.2rem; align-items: center; text-align: center">
      <span></span><strong data-phase="fill">充填</strong><strong data-phase="steady" style="grid-column: span 3">定常</strong><strong data-phase="drain">排出</strong>
      <span style="text-align: left">スロット</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      <div data-pp-stage="front" style="display: contents"><strong style="text-align: left">前段 GPU 0</strong><span data-slot="1" data-mb="1" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB1</span><span data-slot="2" data-mb="2" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB2</span><span data-slot="3" data-mb="3" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB3</span><span data-slot="4" data-mb="4" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB4</span><span data-slot="5" data-mb="" style="background: var(--vp-c-warning-soft); border-radius: 4px; padding: 0.3rem 0.1rem">待ち</span></div>
      <div data-pp-stage="back" style="display: contents"><strong style="text-align: left">後段 GPU 1</strong><span data-slot="1" data-mb="" style="background: var(--vp-c-warning-soft); border-radius: 4px; padding: 0.3rem 0.1rem">待ち</span><span data-slot="2" data-mb="1" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB1</span><span data-slot="3" data-mb="2" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB2</span><span data-slot="4" data-mb="3" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB3</span><span data-slot="5" data-mb="4" style="background: var(--vp-c-brand-soft); border-radius: 4px; padding: 0.3rem 0.1rem">MB4</span></div>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">同じ番号のMBが前段から後段へ移る。色を分けた「待ち」は、片方のGPUにその区間で実行する前向き計算がないことを示す。</figcaption>
</figure>

- <strong>充填（1）</strong>では、後段に前段の出力がまだ届いていません。
- <strong>定常（2〜4）</strong>では、前段と後段が別のマイクロバッチを同時に計算します。
- <strong>排出（5）</strong>では、前段は4件を渡し終え、後段だけが最後の出力を求めます。

この例では5スロットで4つの出力がそろいます。2台×5スロットのうち2枠が空いているため、空きの割合は **2/10 = 20%** です。前段と後段の依存関係から生まれる空きが**パイプラインのバブル**です。重ねずに1件ずつ前段・後段を実行すると全体は8スロットですが、最初のMB1の所要は両方とも2スロットです。重ねて改善したのは、後続を含めた全体の処理量です。[GPipe原論文 §2.2–2.3・図2](https://arxiv.org/pdf/1811.06965#page=3)

## 学習では後段から前段へ勾配を戻す

図の範囲には、学習に必要な**逆伝播**（出力側から各重みの勾配を求める計算）は入っていません。GPipeのスケジュールでは、ミニバッチの前向き処理の後に逆伝播を行います。段間では、順伝播で境界の活性値を前段から後段へ送り、逆伝播でその活性値に関する勾配を後段から前段へ返します。各マイクロバッチの勾配を同じ重みで求め、すべてを蓄積してからミニバッチの終わりに更新します。[GPipe原論文 §2.2・図2c](https://arxiv.org/pdf/1811.06965#page=3) · [分散Megatron-LM論文 §2.2.1・図3](https://arxiv.org/html/2104.04473v5#S2.SS2.SSS1)

## 通信と段ごとの処理時間でも、空き方は変わる

実際の段間通信では、マイクロバッチごとの中間ベクトルを渡します。転送を別の計算に重ねられる場合もありますが、受信が間に合わなければ後段はその入力を開始できません。転送時間には中間値の大きさ、GPU間の帯域、送受信の開始や待ちにかかる時間が関わります。マイクロバッチを細かくすると、境界を通る受け渡しの回数も増えます。[GPipe原論文 §2.2–2.3](https://arxiv.org/pdf/1811.06965#page=4) · [分散Megatron-LM論文 §3.2・§3.4](https://arxiv.org/html/2104.04473v5#S3)

前段の計算が遅ければ、後段は入力が届くのを待ちます。後段が遅ければ、前段から渡された結果がたまり、待ち行列の空きがなくなれば前段も止まります。このため、層の数を半分ずつにするだけでは負荷がそろわない場合があります。GPipeは各段の推定コストを均す分割を使います。図の20%は、同じ長さの段で通信を省いた場合の値です。[GPipe原論文 §2.2–2.3](https://arxiv.org/pdf/1811.06965#page=4)

## 同じ「GPUに分ける」でも、分ける対象が違う

| 方式 | 分ける対象 | GPU間で渡すものの例 |
| --- | --- | --- |
| パイプライン並列 | 連続する層のまとまり | 次の段に渡す活性値 |
| テンソル並列 | 同じ層の計算や重み | 同じ出力への部分和 |
| エキスパート並列 | 専門家の配置と各トークンの行き先 | 専門家への入力と計算結果 |

パイプライン並列では、同じマイクロバッチが決まった順番で段を通ります。[テンソル並列](/algorithms/tensor-parallelism.html)では、同じ層の部分和を複数GPUで計算し、足し合わせる構成があります。[エキスパート並列](/algorithms/expert-parallelism.html)では、トークンごとに選んだ専門家へベクトルを送ります。1つの段の内部でテンソル並列などを使う構成もあります。[分散Megatron-LM論文 §2](https://arxiv.org/html/2104.04473v5#S2) · [GShard原論文 §3](https://arxiv.org/html/2006.16668#S3)

## 要点

- パイプライン並列は連続する層を段に分け、複数のマイクロバッチの計算を重ねます。
- 2段×4マイクロバッチで各段が同じ時間、通信を省く場合、5スロットのうち各GPUに1枠ずつ空きが生まれます。
- 学習では逆伝播も必要です。GPipeはマイクロバッチごとの勾配をため、ミニバッチの終わりに更新します。
- 実際には段間通信と負荷の偏りも待ち時間を作ります。テンソル並列やエキスパート並列とは分ける対象が違います。

## 理解度チェック

::: details MB1に対して、後段はなぜスロット1で計算できない？
後段はMB1を前段で計算した結果を必要とするので、スロット1の終了を待ちます。
:::

::: details 5スロットの図から、学習の1ステップの所要時間も分かる？
図は前向きだけを扱います。学習では逆伝播と重みの更新があり、実機では段間通信などの時間も加わります。
:::

## 検証範囲

2026年11月21日にGPipeの原論文と分散Megatron-LMの論文を確認し、WindowsのPython 3.12.4で、依存関係に従った前向きの時系列、5スロット、空き2枠を検算しました。GPU間通信の実行、学習時間、実モデルの性能は測定していません。

## 関連項目

- [LLMのテンソル並列](/algorithms/tensor-parallelism.html) — 同じ層をGPU間で分担して部分和を足す方法を読む。
- [MoEのエキスパート並列](/algorithms/expert-parallelism.html) — トークンを専門家のいるGPUへ配送し、結果を戻す方法を追う。
- [Prefillとdecodeの分離](/algorithms/disaggregated-prefill-decode.html) — 推論を処理段階で分け、GPU群の間でKVを渡す例を読む。

## 参考資料

- [Yanping Huangほか — GPipe（NeurIPS 2019）](https://arxiv.org/abs/1811.06965) — 層の分割、マイクロバッチ、同期した勾配更新、バブル。
- [Deepak Narayananほか — Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM（2021）](https://arxiv.org/html/2104.04473v5#S2) — パイプラインとテンソルの組み合わせ、段間通信、学習スケジュール。
