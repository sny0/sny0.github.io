---
title: Fisher–Yates法 — 公平なシャッフルと偏る並べ替え
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 3枚の山札を例に、残りの範囲から1枚を選ぶFisher–Yates法と、毎回全範囲から選ぶ交換の確率を、選択経路の数で比べる。
  aliases: [Fisher–Yates shuffle, Fisher-Yates, フィッシャー・イェーツ法, Durstenfeld, 一様シャッフル, 一様ランダム順列]
  verification: Durstenfeldの原論文、Java SE 24の公式API、乱数の範囲変換の原論文に照合し、Windows x64のPython 3.12.4で2方式の全経路を列挙（2026-11-16）
---

# Fisher–Yates法 — 公平なシャッフルと偏る並べ替え

練習モードでお題カードA・B・Cを1枚ずつ出すとします。3枚の並び順は `ABC`、`ACB`、`BAC`、`BCA`、`CAB`、`CBA` の6通りです。**一様なシャッフル**では、この6通りがそれぞれ $1/6$ の確率で出ます。先頭だけを調べても、残りの2枚まで一様かどうかは分かりません。[シャッフルバッグ](/game/shuffle-bag.html)で袋ごとの並びを等確率とするなら、この性質を持つ並べ替えが必要です。

## 未確定の範囲から1枚を選ぶ

Fisher–Yates法では、右端から1か所ずつ確定します。まず未確定の3枚のどれかを等確率で選び、右端と交換します。次に残った左の2枚のどちらかを等確率で選び、中央と交換します。最後の1枚は左端に残ります。右端や中央にすでに置かれているカードも選べます。その場合は自分自身と交換するので、並びは動きません。確定した位置は、以降の選択範囲から外します。[DurstenfeldのAlgorithm 235](https://doi.org/10.1145/364520.364540) · [Java SE 24の `Collections.shuffle`](https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/util/Collections.html#shuffle(java.util.List,java.util.random.RandomGenerator))

<figure style="margin: 1rem 0">
  <div role="img" aria-label="初期はA B C。Aを選ぶと右端がAになり、並びはC B A。残りのCを選ぶと中央がCになり、B C Aに確定する。" style="display: grid; gap: 0.35rem; max-width: 24rem">
    <div style="display: grid; grid-template-columns: 6.5em repeat(3, minmax(0, 1fr)); gap: 0.35rem; align-items: center; text-align: center">
      <span style="text-align: left">最初の並び</span>
      <span style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px">A</span>
      <span style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px">B</span>
      <span style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px">C</span>
    </div>
    <div style="display: grid; grid-template-columns: 6.5em repeat(3, minmax(0, 1fr)); gap: 0.35rem; align-items: center; text-align: center">
      <span style="text-align: left">Aを右端へ</span>
      <span style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px">C</span>
      <span style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px">B</span>
      <strong style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-brand-soft)">A</strong>
    </div>
    <div style="display: grid; grid-template-columns: 6.5em repeat(3, minmax(0, 1fr)); gap: 0.35rem; align-items: center; text-align: center">
      <span style="text-align: left">Cを中央へ</span>
      <strong style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-brand-soft)">B</strong>
      <strong style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-brand-soft)">C</strong>
      <strong style="padding: 0.15em 0; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-brand-soft)">A</strong>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.5rem">3枚からAを選んで右端を確定し、残り2枚からCを選ぶ。太字は確定した位置。</figcaption>
</figure>

最終形を `BCA` にしたいなら、最初に右端へ置くカードはAに決まり、次に中央へ置くカードはCに決まります。どの最終形にも、そこへ行く選択経路は1本です。3枚なら経路は $3\times2=6$ 本。最初の選択が $1/3$、その選択が分かったうえで次の選択が $1/2$ なので、各経路の確率は $1/3\times1/2=1/6$ になります。一般に $n$ 枚でも、各段階で以前の選択を条件に残りの候補が一様なら、各順列の確率は $1/n!$ です。[Manuel EberlによるFisher–Yates法の形式証明](https://isa-afp.org/entries/Fisher_Yates.html)

## 毎回3枚すべてと交換すると偏る

もう一方の方式でも、右端、中央、左端の順に位置を調べます。ただし**毎回、交換相手を3か所すべてから等確率で選びます**。自分自身との交換も可能です。中央や左端を処理するときに、前に選んだ右端へ再び触れます。3回とも選択肢が3つなので、経路は $3^3=27$ 本です。全経路が等確率なら、27本を6種類の並びに同じ本数ずつ配分することはできません。

| 最終形 | Fisher–Yates法 | 全範囲との交換 |
| --- | ---: | ---: |
| ABC | 1/6 | 4/27 |
| ACB | 1/6 | 5/27 |
| BAC | 1/6 | 5/27 |
| BCA | 1/6 | 4/27 |
| CAB | 1/6 | 5/27 |
| CBA | 1/6 | 4/27 |

全範囲との交換では、たとえば先頭がAになる `ABC` と `ACB` を足すと $9/27=1/3$ です。同じように数えると、BとCが先頭になる確率もそれぞれ $1/3$ です。それでも `ABC` と `ACB` の確率は異なります。山札の並び全体の公平さを確かめるには、先頭にどのカードが来るかだけでは足りません。

## 3枚の選択経路を数える例

`ABC` から始め、添字を左から `0`、`1`、`2` と振ります。Pythonで、各段階の交換相手をすべて組み合わせて数えます。表の分子が出力され、分母はそれぞれ経路の総数 `6` と `27` です。

```python
from collections import Counter
from itertools import product


def count_orders(positions, choices):
    counts = Counter()
    for path in product(*choices):
        cards = list("ABC")
        for i, j in zip(positions, path):
            cards[i], cards[j] = cards[j], cards[i]
        counts["".join(cards)] += 1
    return counts


fisher_yates = count_orders((2, 1), (range(3), range(2)))
whole_range = count_orders((2, 1, 0), (range(3),) * 3)

for order in sorted(fisher_yates):
    print(order, fisher_yates[order], whole_range[order])
```

## アルゴリズムの保証と乱数源の前提

一様な順列が得られる証明では、それまでにどの添字を選んだ場合でも、次の添字が許された範囲から一様に選ばれると仮定します。たとえば一様な `0`〜`7` の値を `3` で割った余りにすると、`0` と `1` にはそれぞれ3通り、`2` には2通りの元の値が対応します。交換範囲を正しく狭めても、このように範囲への割り当てが偏っていれば、証明の前提が崩れます。[Daniel Lemireの乱数の範囲変換に関する論文](https://arxiv.org/abs/1805.10941)

順列の確率と、他人が次の結果を予測できるかも別の性質です。たとえばPython 3.12の標準 `random` の既定生成器は、暗号用途には向かないと公式文書にあります。プレイヤーが公平だと感じるかは、どのくらいの連続や空白が起きるかにも左右されます。各種類を1枚ずつ入れた袋を一様に混ぜても、補充の境界では同じお題が続くことがあります。[Python 3.12の `random`](https://docs.python.org/3.12/library/random.html) · [シャッフルバッグ](/game/shuffle-bag.html)

## 理解度チェック

::: details 一度右端を確定したあと、中央の交換相手に右端を含めてよい？
このFisher–Yates法では含めません。中央を決めるときは左端と中央の2枚が候補です。
:::

::: details 交換相手が自分自身なら、もう一度引き直してよい？
引き直すとその位置に同じカードを残せなくなり、許した選択から1通りを除いてしまいます。たとえば最初の右端がCなら、Cで確定する選択も $1/3$ 必要です。
:::

## 検証範囲

2026年11月16日にWindows x64のPython 3.12.4で、掲載例の6経路と27経路をすべて列挙し、図と確率表を照合しました。確率は各段階の選択が条件付きで一様というモデルでの値です。特定の乱数生成器の統計的品質、暗号学的安全性、プレイヤーが感じる公平さは検証していません。

## 関連項目

- [シャッフルバッグ](/game/shuffle-bag.html) — 一様に混ぜた袋で、出現数や連続がどう変わるかを読む。
- [ゲームの乱数設計](/game/random-streams.html) — 抽選に使う乱数の状態を分け、再生に必要な情報を考える。
- [ドロップテーブルと重み付き抽選](/game/loot-tables.html) — 重みで区間を割り当て、単発の結果の確率を読む。

## 参考資料

- [Richard Durstenfeld — Algorithm 235: Random permutation（1964）](https://doi.org/10.1145/364520.364540)
- [Oracle Java SE 24 — `Collections.shuffle`](https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/util/Collections.html#shuffle(java.util.List,java.util.random.RandomGenerator))
- [Manuel Eberl — Fisher–Yates Shuffle, Archive of Formal Proofs（2016）](https://isa-afp.org/entries/Fisher_Yates.html)
- [Daniel Lemire — Fast Random Integer Generation in an Interval（2019）](https://arxiv.org/abs/1805.10941)
- [Python 3.12 — `random`](https://docs.python.org/3.12/library/random.html)
