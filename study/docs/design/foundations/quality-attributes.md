---
title: 設計の品質特性 — 変更容易性・テスト容易性・拡張性・可読性・保守性・再利用性
study:
  source: C++ Wiki
  status: published
  summary: "「良い設計」は一枚岩ではなく、複数の品質特性の組み合わせです。しかも特性同士はトレードオフすることがあります。何を優先するかを決めるのが設計判断です。 変更容易性(modifiability): 仕様変更のとき、直す箇所が少なく・特定しやすく・影響が閉じていること。"
  section: reference
  format: article
  domain: design
---

# 設計の品質特性 — 変更容易性・テスト容易性・拡張性・可読性・保守性・再利用性

## 一言で言うと

「良い設計」は一枚岩ではなく、複数の品質特性の組み合わせです。しかも**特性同士はトレードオフ**することがあります。何を優先するかを決めるのが設計判断です。

## それぞれの定義

- **変更容易性(modifiability)**: 仕様変更のとき、直す箇所が少なく・特定しやすく・影響が閉じていること。
- **テスト容易性(testability)**: 一部分を切り出して、決まった入力に対する出力を検証できること。
- **拡張性(extensibility)**: 既存コードを変更せずに、新しい種類・機能を追加できること(→ [OCP](/design/solid/ocp.html))。
- **可読性(readability)**: 初見の人が意図を誤解なく読み取れること。
- **保守性(maintainability)**: 上記の総合。長期間、壊さずに直し続けられること。
- **再利用性(reusability)**: 別の文脈でもそのまま使えること。

## 解決したい問題

「良いコードにしよう」という曖昧な合意は、人によって別のものを指すため議論が噛み合いません。「このモジュールは**何を**良くしたいのか」を特性の言葉で指定すると、判断がぶれなくなります。

## 特性同士は衝突する(ここが重要)

| 衝突 | 例 |
|---|---|
| 拡張性 vs 可読性 | 武器追加を無変更にする抽象階層は、初見には追いにくい(→ [ポリモーフィズム](/design/foundations/polymorphism-interface.html)の失うもの) |
| 再利用性 vs 単純さ | どのゲームでも使える汎用インベントリは、設定項目だらけになる |
| 変更容易性 vs 性能 | 部品分割・間接化はキャッシュ効率や最適化と衝突しうる(→ [Data Locality](/game/patterns/optimization-patterns.html)) |
| テスト容易性 vs コード量 | 依存を注入可能にする分、初期化コードが増える |

**全部を最大化する設計は存在しません。** 「このコードにどんな変更が来そうか」から逆算して、優先する特性を選びます。

## 例: 同じ機能、優先特性による2つの正解

ダメージ計算を例にします。

```cpp
// C++20 — 案A: 可読性・テスト容易性優先(純粋関数)
// 入力→出力だけ。状態なし。テストが1行で書ける
int CalcDamage(int attack, int defense, float typeBonus) {
    int base = attack * 2 - defense;
    if (base < 1) base = 1;
    return static_cast<int>(base * typeBonus);
}
```

```cpp
// C++20 — 案B: 拡張性優先(効果を差し込める設計。骨格のみ)
#include <memory>
#include <vector>
class IDamageModifier {
public:
    virtual ~IDamageModifier() = default;
    virtual int Apply(int damage) const = 0;
};
class DamagePipeline {
public:
    void AddModifier(std::unique_ptr<IDamageModifier> m) { mods_.push_back(std::move(m)); }
    int Calc(int base) const {
        for (const auto& m : mods_) base = m->Apply(base);
        return base;
    }
private:
    std::vector<std::unique_ptr<IDamageModifier>> mods_;
};
```

案Aは読みやすくテストしやすいが、「バフでダメージ計算を差し替える」には関数を書き換えるしかない。案Bは装備・バフ・スキルを無限に差し込めるが、「結局ダメージがいくつになるのか」を追うのが大変。**どちらが正しいかは、バフ仕様がどれだけ増えるか次第**です(→ [ケーススタディ: ダメージ計算](/design/case-studies/damage-calculation.html))。

## テスト容易性は設計の「検査装置」

テストしにくいコードには、ほぼ確実に設計上の問題があります。

- グローバル状態([Singleton](/design/patterns/singleton.html))に依存 → テストごとに状態が汚染される
- I/O・描画・時間と不可分 → 実行環境がないとテストできない
- 依存が多すぎる → セットアップコードが本体より長くなる

「テストを書くかどうか」に関わらず、**「これを単体テストするとしたら何が邪魔か?」と自問する**だけで結合の問題を発見できます。

## ゲーム開発での例

- レベルデザイナーが毎日触るパラメータ → 変更容易性(データ外部化)を最優先
- ゲームジャムの試作 → 可読性すら二の次、速度優先が正解のこともある
- エンジンの数学ライブラリ → 再利用性と性能。変更はほぼ来ない
- ガチャの確率計算 → テスト容易性最優先(金と法律が絡むため)

## Unity/C# との対応

- MonoBehaviourに書いたロジックはUnityなしでテストできません。計算部分をプレーンなC#クラスに分けるのが定石で、これは「テスト容易性のための関心の分離」です。
- Unity Test Framework(PlayMode/EditMode)の使い分けも、この特性の言葉で整理できます。

## Unreal Engine との対応

- UEのAutomation Testも同様に、UObject依存を減らした純粋ロジックほどテストしやすくなります。

## よくある誤解

- 「保守性の高いコード = 抽象化されたコード」ではありません。不要な抽象は保守性を**下げます**(→ [早すぎる抽象化](/design/foundations/yagni-kiss-dry.html))。
- 「再利用性は常に善」ではありません。1回しか使わないものを汎用化するのはコストの先払いです(→ [YAGNI](/design/foundations/yagni-kiss-dry.html))。

## 使う場面 / 使わない場面

- **特性を明示して議論する場面**: コードレビューで意見が割れたとき。「読みにくい」ではなく「拡張性のために可読性を犠牲にしているが、この部分に拡張は来るのか?」と言い換える。
- **使わない場面**: 判断に迷いがない小さなコードにまで毎回この語彙を持ち出す必要はありません。

## 関連項目

- [YAGNI・KISS・DRY](/design/foundations/yagni-kiss-dry.html)
- [技術的負債・リファクタリング](/design/foundations/tech-debt-and-refactoring.html)
- [判断ガイド: 最適化すべきか・リファクタリングすべきか](/design/decisions/optimize-or-refactor.html)

## 理解度チェック

1. 「良いコード」という言葉を使わずに、コードレビューの指摘を品質特性の言葉で言い換えられますか。
2. 拡張性と可読性が衝突する例を1つ挙げてください。
3. テスト容易性が「検査装置」になるのはなぜですか。

## 演習

案A(純粋関数)と案B(パイプライン)のダメージ計算について、「属性相性の追加」「防御無視スキルの追加」「ダメージ2倍イベント(期間限定)」の3つの変更それぞれで、どちらの案が何行くらいの変更になるか見積もってください。

---

関連項目：[ポリモーフィズムとインターフェース](/design/foundations/polymorphism-interface.html) / [学習ガイド](/design/foundations/) / [YAGNI・KISS・DRY](/design/foundations/yagni-kiss-dry.html)
