---
title: ドロップテーブルと重み付き抽選 — 確率・期待値・偏りを読む
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: 宝箱の重みを確率と累積区間に置き換え、レア報酬が出ない連続回数や、候補の条件・救済ルールが結果をどう変えるかを読む。
  aliases: [ドロップテーブル, ルートテーブル, loot table, 重み付き抽選, 累積重み, ドロップ率, 幾何分布, 天井]
  verification: Minecraft Bedrock、WG21 N4659、MIT、Bungieの資料に照合し、Windows x64のMSVC 19.35とGCC 16.2で全20枠のC++例を実行（2026-11-16）
---

# ドロップテーブルと重み付き抽選 — 確率・期待値・偏りを読む

同じボスの宝箱を10回開けたのに、ドロップ率10%の剣が一度も出なかった。毎回10%で、過去の結果が次の抽選に影響しないなら、10回で剣を手に入れられない確率は約35%です。ドロップテーブルを読むには、1回の抽選でどの候補が選ばれるかと、何回か試したときに結果がどう散らばるかの両方を見ます。

## 重みは同じ抽選内での取り分

一度開けると「なし」「強化素材」「レア剣」のどれか1つを選ぶ宝箱を考えます。候補の重みは順に `10`、`8`、`2` です。合計は `20` なので、レア剣の確率は $2/20=10\%$ です。重みが正の候補から1つ選ぶ場合、候補の確率はその重みを有効な重みの合計で割った値になります。たとえば全候補を2倍にしても、割る数も2倍なので確率は変わりません。「なし」も一つの結果として、合計に含めます。[WG21 N4659の重み付き離散分布](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4659.pdf#page=1114)

<figure style="margin: 1rem 0">
  <div role="img" aria-label="20枠を左から順に、なし10枠、強化素材8枠、レア剣2枠に分けた図" style="display: grid; grid-template-columns: minmax(0, 10fr) minmax(0, 8fr) minmax(0, 2fr); border: 1px solid var(--vp-c-divider); border-radius: 6px; overflow: hidden; font-size: 0.9rem; text-align: center; line-height: 2.75">
    <span style="background: var(--vp-c-default-soft)">なし</span>
    <span style="background: var(--vp-c-brand-soft); border-inline: 1px solid var(--vp-c-divider)">強化素材</span>
    <span style="background: var(--vp-c-warning-soft)">剣</span>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.5rem">区間の幅が候補の重みを表す。左から10枠、8枠、2枠。</figcaption>
</figure>

| 候補 | 累積区間 | 重み → 確率 |
| --- | --- | ---: |
| なし | `[0, 10)` | 10 → 50% |
| 強化素材 | `[10, 18)` | 8 → 40% |
| レア剣 | `[18, 20)` | 2 → 10% |

実際に1回を抽選するなら、各枠が同じ確率になるよう、`0` から `19` までの整数を一つ選びます。重みを順に足した境界は `10`、`18`、`20` です。たとえば `18` なら、最初に `18` より大きい境界は `20` なので剣の区間に入ります。区間は左端を含み、右端を含みません。C++17の `std::uniform_int_distribution` に渡す両端はともに含まれるため、指定する端点は `0` と `19` です。[WG21 N4659の整数一様分布](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4659.pdf#page=1100)

Minecraft: Bedrock Editionの安定版向け公式仕様にも、プールを引く回数 `rolls`、候補の相対重み `weight`、何も落とさない `empty` があります。この記事の宝箱は「有効な候補から1回引く」モデルです。プールを複数回引く設定では、1回の抽選でその候補が選ばれる確率と、宝箱全体で一度以上出る確率を区別します。[Minecraft: Bedrock Editionの `minecraft:loot_table` 仕様](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/loottablereference/examples/loottablecomponents/loot_table?view=minecraft-bedrock-stable)

### 20枠をすべて数えるC++例

次のコードは決められた20枠を一度ずつ通し、区間の割り当てを確かめます。どの枠も一様に選ばれると仮定すれば、割り当てられた枠の比が確率になります。

```cpp
#include <array>
#include <cassert>
#include <cstddef>
#include <iostream>
#include <numeric>
#include <stdexcept>

constexpr std::array weights{10u, 8u, 2u}; // No drop, material, rare sword

std::size_t pick(unsigned ticket) {
    unsigned end = 0;
    for (std::size_t i = 0; i < weights.size(); ++i) {
        end += weights[i];
        if (ticket < end) return i;
    }
    throw std::out_of_range("ticket");
}

int main() {
    const auto total = std::accumulate(weights.begin(), weights.end(), 0u);
    std::array<unsigned, weights.size()> counts{};
    for (unsigned ticket = 0; ticket < total; ++ticket) {
        ++counts[pick(ticket)];
    }

    assert(pick(9) == 0 && pick(10) == 1);
    assert(pick(17) == 1 && pick(18) == 2 && pick(19) == 2);
    assert(counts == weights);
    std::cout << "No drop: " << counts[0] << '\n'
              << "Material: " << counts[1] << '\n'
              << "Rare sword: " << counts[2] << '\n';
}
```

出力は `No drop: 10`、`Material: 8`、`Rare sword: 2` です。たとえば `17` は素材の最後の枠、次の `18` は剣の最初の枠です。これは全枠に番号を振った結果で、20回プレイすれば同じ内訳になるという意味ではありません。

## 10回の平均は1本、10回連続で外れることもある

同じ宝箱を繰り返し開け、毎回レア剣の確率が $p=0.1$ で、前の結果が次の抽選に影響しないとします。最初に剣が出た回を $T$ とすると、$n$ 回目まで一度も出ない確率は、外れの確率 `0.9` を $n$ 回掛けた $(1-p)^n$ です。少なくとも一度出る確率は、その残りの $1-(1-p)^n$ です。[OpenStaxの幾何分布](https://openstax.org/books/introductory-statistics-2e/pages/4-4-geometric-distribution)

| 開けた回数 | 一度も出ない | 少なくとも一度出る |
| ---: | ---: | ---: |
| 5回 | 59.05% | 40.95% |
| 10回 | 34.87% | 65.13% |
| 20回 | 12.16% | 87.84% |

初めて出る回の期待値は $E[T]=1/p=10$ 回です。最初の1回は必ず使い、外れた場合だけ同じ条件からやり直すので、平均を $m$ とすると $m=1+(1-p)m$ になります。また、10回と決めて開け続けたときに出る剣の本数は、各回の期待値 `0.1本` を足して平均 `1本` です。前者は**最初の1本までの回数**、後者は**決めた回数で手に入る本数**を表します。どちらの平均も、個々のプレイヤーが10回で得る結果を決めるものではありません。[MIT 18.440の幾何分布と期待値の導出](https://ocw.mit.edu/courses/18-440-probability-and-random-variables-spring-2014/46988996aea04a9517e7450e828e324b_MIT18_440S14_Lecture14.pdf#page=5)

独立抽選なら、9回外れた後でも次の1回は10%です。10回のプレイ結果が理論上の比率からずれることは、この確率モデルでも起こります。個々の連続外れと、実装がある区間の値を一様に選んでいないといった偏りは、別々に確かめる必要があります。

## 候補の条件と、外れた履歴を使う救済

宝箱を開ける前に適用条件を見て、強化素材だけを候補から外すとします。「なし」と剣の重みはそのままなので、有効な合計は `12`、剣は $2/12\approx16.67\%$ です。剣の重みを触らなくても、合計が変われば剣の確率は変わります。一方、抽選後に素材の受け取り条件を確認し、受け取れなければ引き直さずに終える設計では、剣を選ぶ確率は元の10%です。条件を確認する時点で、同じ見た目の「素材が出ない」でも確率が変わります。[Minecraft: Bedrock Editionのプールと候補の条件](https://learn.microsoft.com/en-us/minecraft/creator/documents/loottableconditions?view=minecraft-bedrock-stable)

救済ルールは、過去の結果を使って次の抽選を変えます。たとえばこの宝箱で「前回の獲得以後、対象の宝箱で9回連続で外れたら10回目は剣を出し、剣が出たらカウンターをリセットする」と決めると、カウンターがゼロの状態から10回以内に得られる確率は100%です。一定10%の抽選を続けるときの65.13%とは異なります。実際のルールを読むときも、何が対象の1回か、どの範囲でカウンターを共有するか、いつリセットするかで結果が変わります。Bungieの2021年の告知では、対象レイドのクリアによる確率上昇を週1回、アカウント単位で数える例が示されています。[Bungieの2021年3月18日の告知](https://www.bungie.net/7/en/News/article/50196)

## 理解度チェック

::: details 剣の重みが2のままで、候補に重み20のアイテムを足したら？
合計が40になるので、1回で剣が選ばれる確率は `2/40 = 5%` です。
:::

::: details 独立した10%の抽選で9回外れたら、10回目は当たりやすい？
10回目も10%です。抽選ごとの確率を履歴で変えるには、保証や確率上昇などのルールが要ります。
:::

## 検証範囲

2026年11月16日にWindows x64のMSVC 19.35.32217.1とGCC 16.2.0（MinGW-w64）でC++17の例を実行し、全20枠の件数と境界 `9/10`・`17/18`・`19` を照合しました。確率表の値は分数で検算し、百分率の小数第2位に丸めています。生成器や整数一様分布の統計的品質、実際のゲームでの出現率は未検証です。

## 関連項目

- [ゲームの乱数設計](/game/random-streams.html) — 戦闘と報酬の抽選に、どの乱数列を使うかを決める。
- [Type ObjectとSandbox](/game/patterns/type-object-and-sandbox.html) — 敵の種類ごとのドロップテーブルをゲームデータとして持つ。
- [ゲームの決定性](/game/simulation-determinism.html) — 抽選を含むゲームの結果を再現する条件を考える。

## 参考資料

- [WG21 N4659 — C++17作業草案、離散分布と整数一様分布](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4659.pdf#page=1114)
- [Microsoft Learn — Minecraft: Bedrock EditionのLoot Table仕様](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/loottablereference/examples/loottablecomponents/loot_table?view=minecraft-bedrock-stable)
- [OpenStax — Introductory Statistics 2e, 4.4 Geometric Distribution](https://openstax.org/books/introductory-statistics-2e/pages/4-4-geometric-distribution)
- [MIT 18.440 — Probability and Random Variables, Lecture 14](https://ocw.mit.edu/courses/18-440-probability-and-random-variables-spring-2014/46988996aea04a9517e7450e828e324b_MIT18_440S14_Lecture14.pdf#page=5)
- [Bungie — This Week At Bungie, 2021-03-18](https://www.bungie.net/7/en/News/article/50196)
