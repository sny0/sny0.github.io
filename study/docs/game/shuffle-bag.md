---
title: シャッフルバッグ — 独立抽選と引き切り方式の違い
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: 4種類の出題カードを使い、独立抽選とシャッフルバッグで、短い区間の出現数や連続、次に出るまでの最大回数がどう変わるかを整理する。
  aliases: [シャッフルバッグ, shuffle bag, bag randomizer, 引き切り方式, 非復元抽出, 復元抽出]
  verification: MITの確率講義、Jstris公式ガイド、Python 3.12公式仕様に照合し、Windows x64のPython 3.12.4で袋2つの576通りを全列挙（2026-11-16）
---

# シャッフルバッグ — 独立抽選と引き切り方式の違い

ゲームの練習モードで、4種類のお題を順不同で出したいとします。毎回同じ確率で抽選すると、お題Aばかりが何度も続くことも、しばらく出ないこともあります。A・B・C・Dを1枚ずつ入れた袋を使えば、一巡ごとに各お題を出せます。どちらの方式を選ぶかは、一回ごとの予測しにくさと、短い間にどれだけ偏ってよいかで変わります。

## 引いたカードをいつ戻すか

**独立抽選**では、A・B・C・Dから毎回同じ条件で一つを選びます。カードで考えると、引いたカードを毎回戻し、次も4枚から等確率で引きます。Aが何度続いても、次にAを引く確率は $1/4$ です。[ドロップテーブルの記事](/game/loot-tables.html)は、候補ごとに異なる重みを付け、同じ条件で引く場合の確率と待ち時間を扱います。

**シャッフルバッグ**では、袋を混ぜてから1枚ずつ取り出し、引いたカードはその袋に戻しません。空になったらA・B・C・Dを1枚ずつ入れ直し、新しい順番で引き始めます。本記事では、4枚の並びはすべて等確率で、次の袋の並びは前の袋と独立とします。袋の中での抽選は、引いたものを戻さない**非復元抽出**です。[MIT 9.07の復元抽出・非復元抽出の講義](https://ocw.mit.edu/courses/9-07-statistics-for-brain-and-cognitive-science-fall-2016/c253650367960f524be6611392e79c53_MIT9_07F16_lec1.pdf#page=7)

各並びを等確率にするシャッフルの手順は、こちらで扱います。[Fisher–Yates法 — 公平なシャッフルと偏る並べ替え](/algorithms/fisher-yates-shuffle.html)

新しい袋の先頭でAを引く確率は $1/4$ です。1枚目がBだと分かれば、次のAは残り3枚のうちの1枚なので $1/3$ になります。先にAを引いたことが分かれば、補充までは0%です。袋の境界を知っていて、B・C・Dが出たところまで見ていれば、次はAと分かります。

## 4回を数えるときは、袋の境界を見る

袋の先頭から4回引けば、各お題が1回ずつ出ます。しかし、袋の終わり2回と次の袋の最初2回を合わせた4回では、それぞれの半分にAが入る確率が $1/2$ です。両方の半分にAが入ることも、両方から外れることもあります。

| 4回を取る場所 | Aが0回 | Aが2回以上 |
| --- | ---: | ---: |
| 独立抽選の4回 | 31.64% | 26.17% |
| 袋の先頭から4回 | 0% | 0% |
| 前の袋の末尾2回と次の袋の先頭2回 | 25% | 25% |

独立抽選でAが0回になる確率は $(3/4)^4$ です。1回だけ出る確率は、4つの位置それぞれでその1回だけAを引くので $4(1/4)(3/4)^3$ です。この二つを100%から引くと2回以上の確率が出ます。袋の行は、袋の区切りに対して表の位置で4回分を取った結果です。

## 連続と待ち時間の上限は別々に考える

袋の中でAが続くことはありません。前の袋の最後と次の袋の最初がともにAなら、境界で2回続きます。どちらの位置もAになる確率が $1/4$ なので、特定の境界で `A A` になる確率は $1/16$ です。この構成では各袋にAが1枚ずつあるため、Aは最大2連続です。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="袋の境界でAが2回続く例はB C D Aの次にA B C D。Aの間に6回空く例はA B C Dの次にB C D A。" style="display: grid; gap: 0.55rem; max-width: 28rem">
    <div style="display: grid; grid-template-columns: 5em minmax(0, 1fr) minmax(0, 1fr); gap: 0.35rem; align-items: center">
      <span>2回連続</span>
      <span style="background: var(--vp-c-default-soft); border: 1px solid var(--vp-c-divider); border-radius: 5px; text-align: center; font-family: var(--vp-font-family-mono); padding: 0.4em 0">B C D <strong>A</strong></span>
      <span style="background: var(--vp-c-brand-soft); border: 1px solid var(--vp-c-divider); border-radius: 5px; text-align: center; font-family: var(--vp-font-family-mono); padding: 0.4em 0"><strong>A</strong> B C D</span>
    </div>
    <div style="display: grid; grid-template-columns: 5em minmax(0, 1fr) minmax(0, 1fr); gap: 0.35rem; align-items: center">
      <span>6回空く</span>
      <span style="background: var(--vp-c-default-soft); border: 1px solid var(--vp-c-divider); border-radius: 5px; text-align: center; font-family: var(--vp-font-family-mono); padding: 0.4em 0"><strong>A</strong> B C D</span>
      <span style="background: var(--vp-c-brand-soft); border: 1px solid var(--vp-c-divider); border-radius: 5px; text-align: center; font-family: var(--vp-font-family-mono); padding: 0.4em 0">B C D <strong>A</strong></span>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.5rem">各行の左が前の袋、右が補充後の袋。左から順に引く。</figcaption>
</figure>

最初のAは袋の先頭から4回以内です。一度Aが出た直後から数えると、次のAまでには前の袋で最大3回、次の袋でも最大3回、A以外を引けます。**Aが出ないのは最大6回で、次のAを引く回まで含めると最大7回**です。一定確率の独立抽選では、どの回数まで外れが続くかに上限はありません。

## 何をそろえ、何を予測できるようにするか

練習メニューで各お題を一巡に一度ずつ出したいなら、袋の構成で出現数を決められます。長い空白を抑えられる一方で、その袋で出たお題と残り枚数をプレイヤーが知っていれば、末尾に近づくほど次の候補は絞られます。一巡の必要枚数、連続を許す回数、プレイヤーが次の内容を読めることを、それぞれどう扱いたいかで方式が変わります。

たとえば「次の袋の最初を、前の袋の最後と同じにしない」という制約を加えると、境界の連続を防げます。その場合、次の袋の並びは前の袋の末尾に依存するため、独立した一様シャッフルを仮定した上の境界確率は使えません。また、途中から同じ順番でリプレイしたいなら、先に袋を並べ替える実装では、袋の並びと次に引く位置（または残りの並び）、次の補充に使う生成器の状態を保存します。シードから開始する方法では、これまでの引き方や補充の順序も再現する必要があります。[ゲームの乱数設計](/game/random-streams.html)

実際のゲームの例では、Jstrisの公式ガイドにある `7-bag` は、7種類のブロックを各1個ずつ入れ、空になるまで取り出してから同じ構成の袋を用意します。ガイドにある `14-bag` は各種類2個で、袋の構成が異なります。[Jstris公式ガイドのRandomizer節](https://jstris.jezevec10.com/guide#randomizer)

## 2つの袋の組をすべて数える例

4枚の並びは $4!=24$ 通りです。Python 3.12の標準ライブラリを使い、前後の袋の並びの組を $24\times24=576$ 通り、1回ずつ調べます。[Python 3.12の `itertools`](https://docs.python.org/3.12/library/itertools.html#itertools.permutations)

```python
from itertools import permutations, product

bags = list(permutations("ABCD"))
pair_count = len(bags) ** 2
boundary_repeats = 0
maximum_gap = 0
window_counts = [0, 0, 0]

for left, right in product(bags, repeat=2):
    if left[-1] == right[0] == "A":
        boundary_repeats += 1

    gap = (len(left) - 1 - left.index("A")) + right.index("A")
    maximum_gap = max(maximum_gap, gap)

    window = left[-2:] + right[:2]
    window_counts[window.count("A")] += 1

print(f"AA at boundary: {boundary_repeats}/{pair_count}")
print(f"Maximum non-A gap: {maximum_gap}")
for count, frequency in enumerate(window_counts):
    print(f"{count} A in 2+2 window: {frequency}/{pair_count}")
```

境界が `A A` の組は `36/576`、Aの間に挟まる他のお題は最大6枚です。境界の前後から2枚ずつ取ると、Aが0・1・2枚の組はそれぞれ `144/576`、`288/576`、`144/576` になります。

## 理解度チェック

::: details Aが一巡に1枚なら、途中から4回を取っても必ずAが1枚ある？
袋の先頭から4回なら1枚です。途中から取って境界をまたぐと、前の袋のAより後から始まり、次の袋のAより手前で終わって0枚になることがあります。
:::

::: details 袋の最初の2枚がBとDだった。次にAが出る確率は？
残っているのはAとCです。この例では残りの順番も一様なので、Aは $1/2$ です。
:::

## 検証範囲

2026年11月16日にWindows x64のPython 3.12.4で、袋2つの576通りを全列挙しました。独立抽選の4回についても256通りを別に列挙し、Aが0回と2回以上の確率を検算しました。検証対象は記事の4枚のモデルです。実ゲームの乱数生成器の品質、実装間の並びの一致、プレイヤーが公平と感じるかは調べていません。

## 関連項目

- [ドロップテーブルと重み付き抽選](/game/loot-tables.html) — 重みから1回の確率を求め、独立抽選で外れが続く可能性を読む。
- [ゲームの乱数設計](/game/random-streams.html) — 抽選を用途別に分け、途中から再生するための状態を考える。
- [入力の記録とリプレイ](/practice/game/input-replay.html) — 入力を適用するtickと再生結果を照合する。

## 参考資料

- [MIT 9.07 — Introduction to Probability Theoryの復元抽出・非復元抽出](https://ocw.mit.edu/courses/9-07-statistics-for-brain-and-cognitive-science-fall-2016/c253650367960f524be6611392e79c53_MIT9_07F16_lec1.pdf#page=7)
- [MIT 18.440 — 幾何分布と独立試行](https://ocw.mit.edu/courses/18-440-probability-and-random-variables-spring-2014/46988996aea04a9517e7450e828e324b_MIT18_440S14_Lecture14.pdf#page=5)
- [Jstris公式ガイド — Randomizer](https://jstris.jezevec10.com/guide#randomizer)
- [Python 3.12 — `itertools`](https://docs.python.org/3.12/library/itertools.html)
