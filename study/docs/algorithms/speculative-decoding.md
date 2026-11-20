---
title: 投機的デコーディング（Speculative Decoding）— LLMは次のトークンを1個ずつ決めるのに、なぜまとめて速く出せるのか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 小さなモデルが作った候補列を、本命のTransformerが一度の前向き計算で評価する。棄却で捨てる範囲、確率分布を保つ補正、速くなる条件を追う。
  aliases: [投機的デコーディング, Speculative Decoding, 投機的サンプリング, Speculative Sampling, Draft Model, Target Model]
  verification: LeviathanらとChenらの原論文に照合し、WindowsのPython 3.12.4で候補列の分岐、確率の内訳、説明用の時間を検算（2026-11-21）
---

# 投機的デコーディング（Speculative Decoding）— LLMは次のトークンを1個ずつ決めるのに、なぜまとめて速く出せるのか

文章を生成するとき、次のトークンを選ぶには、それまでに選んだトークンが必要です。まだ2個目を選んでいないのに、3個目の計算を先に始められるでしょうか。**投機的デコーディング**では、小さなモデルが続きの候補を先に作ります。本命モデルは「この候補を入力したら、各位置でどんな続きを選ぶか」をまとめて計算し、先頭から使えるところまでを確定します。[Leviathanらの原論文 §2・Algorithm 1](https://proceedings.mlr.press/v202/leviathan23a.html)

## この記事で分かること

候補列を入れると本命モデルが複数位置をまとめて評価できる理由と、最初の棄却が後ろの候補に与える影響を説明できます。greedyで出力が一致する条件と、サンプリングで確率分布を保つ補正を区別できます。

## 下書きを作り、本命でまとめて評価する

**下書きモデル**（draft model）は、確定済みの列から続きを仮に作る側です。**本命モデル**（target model）は、最終的な出力の基準になる側です。ここでは両モデルでトークンとIDの対応が同じで、下書きモデルが候補を1個ずつ作る方式を扱います。候補の検証に使う**前向き計算**は、入力した列から、各位置に続くトークンの得点を求める計算です。[Leviathanらの原論文 §2–3](https://proceedings.mlr.press/v202/leviathan23a.html) · [Transformers v4.56.0の解説](https://huggingface.co/docs/transformers/v4.56.0/en/generation_strategies#speculative-decoding)

確定済みの列を $H$ とします。下書きが A・B・C の3個なら、本命は次の対応で続きを評価します。トークンの位置に出る得点は、そのトークンの**次**を選ぶために使います。

| 本命が続きの評価に使う列 | 得点を得る位置 | 評価するもの |
| --- | --- | --- |
| $H$ | $H$ の末尾 | Aを候補とする1個目 |
| $H$ + A | A | Bを候補とする2個目 |
| $H$ + A + B | B | Cを候補とする3個目 |
| $H$ + A + B + C | C | 3個とも採択した場合の次の1個 |

A・B・Cはこの時点で入力として用意できています。Transformerの**因果マスク**は、各位置が右側を参照しないようにします。Bの位置の計算にCは影響せず、Aの位置の計算にBとCは影響しません。一本道の候補列なら、本命の1回の前向き計算でこれらの位置をまとめて処理できます。すでに $H$ の末尾の得点を保存している実装では、その得点をAの評価に使い、A・B・Cをまとめて処理します。原論文では、同じ計算を各接頭辞に条件づけた並列評価として表しています。[Transformer原論文 §3.1–3.2.1](https://arxiv.org/abs/1706.03762) · [Leviathanらの原論文 Algorithm 1](https://proceedings.mlr.press/v202/leviathan23a.html) · [Chenらの論文 §4.1](https://arxiv.org/html/2302.01318#S4.SS1)

## greedyでは、最初に食い違った位置で止める

**greedy**は、その時点で本命の得点が最大のトークンを選ぶ方法です。$H$ に対する本命の選択がA、$H$ + Aに対する選択がDだったとします。下書きの先頭のAを採択し、2個目にDを出します。Bまで使う前提で計算したCの評価は、Dを選んだ後の続きを決めるのには使えません。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="下書きはA、B、C。1個目のAは本命と一致。2個目は本命がDを選ぶのでBを棄却し、Bを前提とした3個目のCも捨てる。この回の出力はA、D。" style="display: grid; grid-template-columns: 5.25em repeat(3, minmax(0, 1fr)); gap: 0.35rem; max-width: 25rem; align-items: center; text-align: center">
    <span></span><span>1個目</span><span>2個目</span><span>3個目</span>
    <span style="text-align: left">下書き</span>
    <span style="border: 1px solid var(--vp-c-divider); border-radius: 4px">A</span>
    <span style="border: 1px solid var(--vp-c-divider); border-radius: 4px">B</span>
    <span style="border: 1px solid var(--vp-c-divider); border-radius: 4px">C</span>
    <span style="text-align: left">判定</span><span>採択</span><span>棄却</span><span>見送り</span>
    <span style="text-align: left">今回の出力</span>
    <strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">A</strong>
    <strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">D</strong>
    <span>—</span>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.5rem">先頭のAを残し、最初の不一致をDで置き換える。Dの先は、新しい前提で評価する。</figcaption>
</figure>

採択するのは、候補列の先頭から続く部分（**接頭辞**）です。すべて一致したら、最後の候補の次に当たる本命の結果から、さらに1個を選べます。終了条件に達しないなら、下書きが3個の回で出せるのは1〜4個です。逐次処理と同じ得点・同じ同点処理を使う限り、greedyの結果は本命だけで1個ずつ選んだときと一致します。[Leviathanらの原論文 Algorithm 1・付録 A.1](https://proceedings.mlr.press/v202/leviathan23a.html) · [Transformers v4.56.0の解説](https://huggingface.co/docs/transformers/v4.56.0/en/generation_strategies#speculative-decoding)

## サンプリングでは、採択と補正を足すと本命の確率になる

**サンプリング**では、次の1個を確率に従って選びます。同じ接頭辞に対し、本命の分布を $p$、下書きの分布を $q$ とします。下書きが $q$ から引いた候補 $x$ を、本命は $\min(1, p(x)/q(x))$ の確率で採択します。$q(x)$ が0のトークンは下書きから引かれません。最初に棄却した位置では、トークンごとに $p-q$ の正の部分を取り、その合計で割って確率に戻した**補正分布**から1個を引きます。全候補を採択した場合は、最後の候補に続く本命の分布から1個を引きます。[Leviathanらの原論文 §2.3・Algorithm 1・付録 A.1](https://proceedings.mlr.press/v202/leviathan23a.html)

たとえばAが両モデルで最も出やすくても、下書きがAを引く割合は70%、本命で目指す割合は50%かもしれません。下書き由来のAのうち $5/7$ を採択すると、Aに割り当てる確率は $0.70\times5/7=0.50$ になります。次の表は、ある1位置に対して、候補を引くところから最後の出力までを数えた説明例です。

| 1位置での確率 | A | B | C |
| --- | ---: | ---: | ---: |
| 本命 $p$ | 0.50 | 0.30 | 0.20 |
| 下書き $q$ | 0.70 | 0.20 | 0.10 |
| 採択経由 $\min(p,q)$ | 0.50 | 0.20 | 0.10 |
| 棄却経由 $\max(0,p-q)$ | 0 | 0.10 | 0.10 |
| 最終出力 | 0.50 | 0.30 | 0.20 |

採択経由の合計は0.80、棄却する確率は0.20です。棄却が起きた場合は、足りない分がともに0.10のB・Cを半々で引きます。ここで毎回 $p$ から引き直すと、採択経由ですでに0.50あるAにさらに確率が加わります。補正分布には不足分だけが入ります。

同じ計算が、確定した接頭辞ごとに成り立ちます。候補の確認は先頭から行い、棄却した位置より後ろは、その回の出力に使いません。こうして本命だけでサンプリングしたときと同じ出力分布を保ちます。乱数の消費順や回数は変わり得るので、同じシードで同じ文章が出ることまでは保証されません。実装では、比較する両モデルの分布や数値丸めの前提も確認します。[Leviathanらの原論文 付録 A.1](https://proceedings.mlr.press/v202/leviathan23a.html) · [Chenらの論文 §4.2](https://arxiv.org/html/2302.01318#S4.SS2)

### 表の確率を分数で確かめる

Python 3.12.4で、採択経由と棄却経由の確率を足します。乱数を使わず、表と同じ値になるかを確かめるコードです。

```python
from fractions import Fraction

p = tuple(Fraction(x, 10) for x in (5, 3, 2))
q = tuple(Fraction(x, 10) for x in (7, 2, 1))
accepted = tuple(min(target, draft) for target, draft in zip(p, q, strict=True))
rejected = 1 - sum(accepted)
deficit = tuple(max(Fraction(0), target - draft)
                for target, draft in zip(p, q, strict=True))
correction = tuple(value / sum(deficit) for value in deficit)
output = tuple(kept + rejected * extra
               for kept, extra in zip(accepted, correction, strict=True))

assert output == p
print("reject:", rejected)
print("correction:", *(str(x) for x in correction))
print("output:", *(str(x) for x in output))
```

```text
reject: 1/5
correction: 0 1/2 1/2
output: 1/2 3/10 1/5
```

この固定例では棄却確率が正なので補正分布を作れます。両分布が等しいときは全候補を採択でき、補正を行う分岐には入りません。

## 速さは、確定できた個数と1回にかかる時間で決まる

過去の [KVキャッシュ](/algorithms/kv-cache.html) があれば、本命は確定済みの位置のK・Vを再利用して候補を検証できます。このとき候補位置のK・Vも計算します。判定の結果が図のA・Dなら、本命がBとCを仮の入力として処理したK・Vは、その先の続きを計算するキャッシュから外します。Dは評価済みの得点を使って選んだ値です。D自体を入力とするK・Vは、必要になったところで計算します。[Leviathanらの原論文 §3.4](https://proceedings.mlr.press/v202/leviathan23a.html) · [Chenらの論文 §4.1](https://arxiv.org/html/2302.01318#S4.SS1)

次の時刻は仕組みを比べるための仮定です。本命だけで1個進めるのに10 msかかる環境で、下書き3個に合計3 ms、まとめた検証に12 msかかるとします。判定などの細かい時間は省きます。

| 15 msの1回で確定した結果 | 出力数 | 出力1個あたりに換算 |
| --- | ---: | ---: |
| 3個とも採択し、さらに1個選ぶ | 4 | 3.75 ms |
| 最初の候補で棄却し、補正分だけを出す | 1 | 15 ms |

短い候補列を一緒に処理すると、本命の重みや既存のK・Vを複数の候補位置で使えます。各位置の演算は残り、棄却した候補を評価した分の計算は出力に生かせません。当たりにくい下書き、費用の大きい下書き、候補を増やすと検証時間が大きく伸びる環境では不利になることがあります。実際に速くなったかは、同じ条件で本命単独と比べます。表の1個あたりの換算値から、ストリームで一つひとつ届く間隔や最初のトークンまでの時間は読み取れません。[Leviathanらの原論文 §3.3–3.5](https://proceedings.mlr.press/v202/leviathan23a.html) · [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html)

## 要点

- 小さなモデルが候補列を先に作ると、本命は因果マスクで参照範囲を制限しながら、複数位置の続きを一度の前向き計算で評価できます。
- 最初の棄却までの接頭辞を採択し、棄却した位置の出力を選び直します。後ろの候補は棄却したトークンを前提としています。
- greedyは本命の最大得点と照合します。確率的サンプリングでは採択と不足分の補正で本命の出力分布を保ちます。
- 速くなるかは、どれだけ候補が採択されるかと、下書き・検証にかかる時間で決まります。

## 理解度チェック

::: details 本命が2個目の候補を棄却したとき、3個目も本命の予想と一致していたら使える？
その一致は、下書きの2個目を入力した場合の評価です。2個目を差し替えた後は、新しい接頭辞から続きを評価します。
:::

::: details 棄却時に補正分布を使うのはなぜ？
採択経由ですでに入った確率があるからです。補正分布から引くことで、採択だけでは足りない本命の確率を埋めます。
:::

## 検証範囲

2026年11月21日に原論文と公式文書を照合し、WindowsのPython 3.12.4で表の確率、候補の採択・棄却と全採択の分岐、時間の換算を検算しました。候補列と時刻は説明用です。実モデルの推論、GPU上のキャッシュ操作、実際の処理時間やストリーミング間隔は実測の対象外です。

## 関連項目

- [LLMの文章生成](/algorithms/llm-text-generation.html) — 本命だけで次のトークンを選ぶ流れと、greedy・サンプリングの違いを読む。
- [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) — 既知の入力をまとめる理由と、最初の出力までの時間・出力間隔を分けて読む。
- [連続バッチング](/algorithms/continuous-batching.html) — 複数のリクエストを同時に進めるとき、次の反復に誰を入れるかを図で追う。
- [KVキャッシュ](/algorithms/kv-cache.html) — 過去の位置のK・Vが再利用できる理由と、保持に必要なメモリを見積もる。

## 参考資料

- [Yaniv Leviathan, Matan Kalman, Yossi Matias — Fast Inference from Transformers via Speculative Decoding（ICML 2023）](https://proceedings.mlr.press/v202/leviathan23a.html) — 手順、分布保存の証明、採択率と時間の分析。
- [Charlie Chenほか — Accelerating Large Language Model Decoding with Speculative Sampling（2023）](https://arxiv.org/abs/2302.01318) — 候補列の条件付き評価、補正サンプリング、検証時のメモリ読み出し。
- [Ashish Vaswaniほか — Attention Is All You Need（2017）](https://arxiv.org/abs/1706.03762) — 因果マスクと、入力位置から1つ先を予測する対応。
- [Hugging Face Transformers v4.56.0 — Speculative decoding](https://huggingface.co/docs/transformers/v4.56.0/en/generation_strategies#speculative-decoding) — 候補列を1回の前向き計算で検証する実装例。
