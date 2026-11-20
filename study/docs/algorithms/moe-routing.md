---
title: MoEの仕組み：トークンごとに使う専門家をどう選ぶか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 一部のFFNを専門家に置き換え、4トークンを2専門家へtop-1で振り分ける。専門家の容量、ルーターの学習、重みと通信の費用を説明する。
  aliases: [MoE, Mixture of Experts, Switch Transformers, 専門家混合, 混合専門家, エキスパート並列]
  verification: Switch TransformersとMegaBlocksの原論文に照合し、WindowsのPython 3.12.4でtop-1の振り分け、容量制限、パラメーター数を検算（2026-11-21）
---

# MoEの仕組み：トークンごとに使う専門家をどう選ぶか

LLMに「敵を追ってカメラが回り込む」と入力すると、モデルは文章をトークンに分け、それぞれの表現を層ごとに更新します。同じ層に複数の小さなネットワークを用意し、トークンごとに使うものを選ぶ構成が **MoE（Mixture of Experts）**です。選ばれる小さなネットワークを**専門家**、行き先を決める部分を**ルーター**と呼びます。[Switch Transformers原論文 §2.1](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

## この記事で分かること

Transformerのどこに専門家を置き、ルーターが各トークンの行き先をどう決めるかを説明できます。振り分けの偏りと容量の関係を追い、総パラメーター数と、1トークンの計算やGPU間通信にかかる費用を分けて考えられます。

## Attentionのあとに、トークン単位のFFNがある

Transformerの**自己Attention**は、参照できる位置の情報を混ぜて、各位置の表現を更新します。そのあとの **FFN（Feed-Forward Network）** は、各位置のベクトルを個別に変換します。通常のブロックでは、同じFFNの重みを全位置で使います。Switch Transformersの代表的な構成は、自己Attentionを残し、一部の層のFFNを、重みの異なる複数のFFNに置き換えます。[TransformerとAttention](/algorithms/transformer-attention.html) · [Switch Transformers原論文 §2.1・図2・§5](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

<figure style="margin: 1rem 0">
  <div role="img" aria-label="トークンの表現を自己Attentionで更新し、各位置の表現をルーターへ渡す。ルーターは同じ層の専門家E0かE1のFFNを選ぶ。残差経路と正規化を省略した模式図。" style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.5rem">
    <span style="background: var(--vp-c-bg-soft); padding: 0.2rem 0.45rem; border-radius: 4px">自己Attention</span>
    <span aria-hidden="true">→</span>
    <span style="background: var(--vp-c-bg-soft); padding: 0.2rem 0.45rem; border-radius: 4px">各位置の表現</span>
    <span aria-hidden="true">→</span>
    <span style="background: var(--vp-c-brand-soft); padding: 0.2rem 0.45rem; border-radius: 4px">ルーター</span>
    <span aria-hidden="true">→</span>
    <span style="background: var(--vp-c-brand-soft); padding: 0.2rem 0.45rem; border-radius: 4px">E0かE1のFFN</span>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">専門家を置くブロックの計算順。残差経路と正規化を省略した。</figcaption>
</figure>

## ルーターの重みが行き先を決める

ルーターにも学習する重みがあります。Switchでは、トークンの表現 $x$ にルーターの行列 $W_r$ を掛け、専門家ごとの**スコア**を作ります。専門家が2つならスコアも2つです。softmaxで、合計が1になる**ルーター確率**に変換します。**top-1**では一番確率が高い専門家を1つ選びます。たとえばスコアが `(2, 1)` なら、確率は約 `(0.731, 0.269)` なのでE0を選びます。[Switch Transformers原論文 §2.1・式1–2](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

選ばれた専門家が計算した場合、SwitchではそのFFNの出力に選択前のルーター確率を掛けます。例ではE0の出力を約0.731倍して、残差経路の値に加えます。選択に使うのはこの層に入るベクトルなので、同じトークンIDでも、周囲の文脈によって表現が変われば別の専門家に向かうことがあります。専門家名のE0・E1は計算の行き先を表す番号です。[Switch Transformers原論文 §2.1・図2](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

## 4トークンを容量2の専門家へ振り分ける

A・B・C・Dを1つのルーティング対象として処理します。**容量**は、このとき専門家1つが受け付けるトークン数の上限です。Switchの式では、対象トークン数を専門家数で割り、**容量係数**を掛けます。ここでは係数1なので、容量は `4 ÷ 2 × 1 = 2` です。同点のない説明用スコアを使い、各専門家は空きがある限りAから順に受け付けます。[Switch Transformers原論文 §2.2・式3・付録F 図15](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

| トークン | 均等のスコア E0・E1 | 偏りのスコア E0・E1 |
| --- | ---: | ---: |
| A | (2, 1) | (2, 1) |
| B | (3, 0) | (3, 0) |
| C | (0, 2) | (2, 0) |
| D | (1, 3) | (4, 1) |

<figure style="margin: 1rem 0">
  <div role="img" aria-label="4トークンA・B・C・D、専門家E0・E1はそれぞれ容量2。均等ではAとBがE0、CとDがE1で、あふれ0個。偏りでは4個ともE0が最高で、E0はAとBだけを受け付ける。E1には空きが2枠あってもCとDはあふれる。" style="display: grid; gap: 0.75rem; max-width: 35rem">
    <div style="padding: 0.55rem 0.7rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
      <strong>均等に振り分けた場合</strong>
      <div data-routing="balanced" style="display: grid; grid-template-columns: minmax(5.3em, 1fr) minmax(0, 2fr); align-items: center; gap: 0.25rem 0.6rem">
        <span>E0で計算</span><span data-tokens="A B" style="padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--vp-c-brand-soft)">A B</span>
        <span>E1で計算</span><span data-tokens="C D" style="padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--vp-c-brand-soft)">C D</span>
        <span>あふれ</span><span data-tokens="" style="padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--vp-c-warning-soft)">なし</span>
      </div>
    </div>
    <div style="padding: 0.55rem 0.7rem; border: 1px solid var(--vp-c-divider); border-radius: 6px">
      <strong>E0に4個が集中した場合</strong>
      <div data-routing="skewed" style="display: grid; grid-template-columns: minmax(5.3em, 1fr) minmax(0, 2fr); align-items: center; gap: 0.25rem 0.6rem">
        <span>E0で計算</span><span data-tokens="A B" style="padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--vp-c-brand-soft)">A B</span>
        <span>E1で計算</span><span data-tokens="" style="padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--vp-c-brand-soft)">なし</span>
        <span>あふれ</span><span data-tokens="C D" style="padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--vp-c-warning-soft)">C D</span>
      </div>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">各トークンは最高スコアの専門家へ。容量2では、均等なら全4個を処理できる。E0に4個が集中すると、E1に空きがあっても2個があふれる。</figcaption>
</figure>

Switchのこの方式では、枠からあふれたC・Dはこの層の専門家FFNを通らず、残差経路で次へ進みます。トークン列からC・Dが消えるわけではありません。容量係数を大きくすれば空きを用意できる一方、固定枠を確保する方式では、空いた枠にもメモリや計算が使われ得ます。あふれ時の挙動は実装で変わります。たとえばMegaBlocksの学習実装は、専門家ごとの処理量に合わせて計算し、容量超過によってトークンの専門家計算を省くことを避けます。[Switch Transformers原論文 §2.2・図3](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf) · [MegaBlocks原論文（MLSys 2023）](https://proceedings.mlsys.org/paper_files/paper/2023/hash/5a54f79333768effe7e8927bcccffe40-Abstract-mlsys2023.html)

### 負荷分散は学習で促す

Switchの学習では、各専門家がtop-1に選ばれた割合と、専門家ごとのルーター確率の平均を組み合わせた**補助損失**を加えます。これは本来の予測の学習に加え、振り分けが集中し過ぎないように重みを調整するための項です。学習で偏りを抑えても、実行中に処理する毎回のトークン集合が均等になる保証はありません。[Switch Transformers原論文 §2.2・式4–6](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

## 総パラメーター数と、1トークンで使う重み

入力と出力の幅が4、中間の幅が8で、バイアスを省いた2行列のFFNを考えます。専門家1つの重みは `4 × 8 + 8 × 4 = 64` 個です。2専門家ぶんは128個で、幅4から専門家2つのスコアを作るルーターの `2 × 4 = 8` 個と合わせ、置換した部分は**136個**の重みを持ちます。[Switch Transformers原論文 §2.1・§5](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

容量内に入るトークン1個について計算に使うのは、ルーターの8個と、選ばれたFFNの64個を足した**72個**です。どちらの専門家にもルーティングできるよう、2つぶんの重みを保持します。この数は重みの個数で、共有しているAttentionなどは含めません。重みの読み出しバイト数、演算回数、モデル全体の使用メモリはそれぞれ別の量です。[Switch Transformers原論文 §2.1・§5.5](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf) · [LLMの量子化](/algorithms/llm-quantization.html)

## 専門家を置く場所で通信費用が変わる

トークンを処理しているGPUにルーターとE0・E1がそろっていれば、専門家の計算もそのGPUでできます。**専門家並列**では、専門家の重みを複数のデバイスに分けて置きます。選ばれた専門家が別デバイスにあると、入力ベクトルを送り、計算結果をもとのトークン位置に戻す処理が必要です。Switch論文の分散構成では、この配送と回収に、複数デバイスが互いにデータを送り合う**all-to-all通信**を使います。[Switch Transformers原論文 §5.4・付録F 図16](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf)

top-1でトークンごとの専門家FFNを1つに絞っても、処理時間にはルーティングや並べ替え、専門家ごとの負荷、通信が効きます。あるGPUに集中すると、ほかのGPUが先に終わっても結果の回収を待つことがあります。重みを分散できることと、モデル全体の重みやGPUメモリの使用量が減ることも別です。[Switch Transformers原論文 §2.2・§5.4–5.5](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf) · [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html)

## 要点

- Switch Transformersでは、自己Attentionを残し、一部のFFNを、トークンごとに選べる複数の専門家FFNに置き換えます。
- top-1は、学習したルーターが各トークンの表現から求めたスコアで、専門家を1つ選びます。
- 振り分けが容量を超えると、空いている専門家がいてもあふれ得ます。負荷分散の方法とあふれ時の扱いは実装によります。
- 1トークンが使う専門家の重みは一部でも、全専門家の重みを保持します。実際の速さやメモリ使用量には、配置、負荷、通信も効きます。

## 理解度チェック

::: details E1に空きが2枠あるのに、CとDがあふれるのはなぜ？
どちらもtop-1でE0を選ぶからです。この図では、E0が満杯になっても別の専門家には回しません。
:::

::: details ルーターと専門家が合計136個の重みを持つ例で、1トークンが使う72個はどの部分？
136個はルーターと2専門家の合計です。容量内のトークンはルーターの8個で全専門家を採点し、選んだFFNの64個を計算に使います。
:::

## 検証範囲

2026年11月21日にSwitch TransformersとMegaBlocksの原論文を確認し、WindowsのPython 3.12.4で、表のsoftmaxとtop-1、図の振り分けと容量、FFNとルーターの重みの個数を検算しました。スコアと層の幅は説明用です。学習済みモデルの振り分け、GPU間通信の実測、推論速度やメモリ使用量は確認していません。

## 関連項目

- [TransformerとAttention](/algorithms/transformer-attention.html) — トークン表現に文脈を取り込む計算を先に読む。
- [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) — 推論の段階と、演算やメモリ帯域が待ち時間に与える影響を読む。
- [LLMの量子化](/algorithms/llm-quantization.html) — 重みの個数と保存に必要なバイト数を分けて考える。

## 参考資料

- [William Fedus、Barret Zoph、Noam Shazeer — Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity（JMLR 23, 2022）](https://jmlr.org/papers/volume23/21-0998/21-0998.pdf) — top-1ルーティング、容量、学習時の負荷分散、専門家並列。
- [Trevor Galeほか — MegaBlocks: Efficient Sparse Training with Mixture-of-Experts（MLSys 2023）](https://proceedings.mlsys.org/paper_files/paper/2023/hash/5a54f79333768effe7e8927bcccffe40-Abstract-mlsys2023.html) — 固定の受け付け枠で専門家計算を省く方式と、負荷に応じた計算方式の比較。
