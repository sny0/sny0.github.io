---
title: "OCP: 開放閉鎖の原則 (Open-Closed Principle)"
study:
  source: C++ Wiki
  status: published
  summary: "> ソフトウェアの構成要素は、拡張に対して開いていて(open for extension)、修正に対して閉じている(closed for modification)べきである。"
  section: reference
  format: article
  domain: design
---

# OCP: 開放閉鎖の原則 (Open-Closed Principle)

## 原則の正確な意味

> ソフトウェアの構成要素は、拡張に対して開いていて(open for extension)、修正に対して閉じている(closed for modification)べきである。

「新しい種類・振る舞いの**追加**が、**既存コードの変更なし**(新しいコードの追加だけ)でできる構造にせよ」という意味です。既存コードを一切変更するなという意味ではなく、**予想される種類の追加**に対して変更が閉じていればよい、という原則です。

## よくある誤解

- **「既存コードは絶対に修正してはいけない」** — 不可能です。バグ修正も仕様変更も修正です。OCPが対象にするのは「**同種の追加**が毎回既存コードの修正になる」状況だけです。
- **「あらゆる変更に備えて抽象化しておく」** — 変更の軸は無限にあり、全方向に開くことはできません。**実際に追加が繰り返された軸**にだけ開くのが実務です。
- **「if/switchがあったらOCP違反」** — 増えないswitchは違反ではありません。

## 違反している小さなコード例(C++版)

```cpp
// C++20(問題例)
enum class SkillType { Fireball, Heal, Dash };

void CastSkill(SkillType type, Player& caster) {
    switch (type) {
        case SkillType::Fireball: /* 弾を生成してダメージ */ break;
        case SkillType::Heal:     /* HP回復 */ break;
        case SkillType::Dash:     /* 高速移動 */ break;
    }
}
float GetCooldown(SkillType type) { switch (type) { /* また全種類 */ } return 0; }
int GetManaCost(SkillType type)   { switch (type) { /* また全種類 */ } return 0; }
```

スキルを1つ追加するたびに、enum・CastSkill・GetCooldown・GetManaCost の**4か所以上の既存コードを修正**します。追加が「修正」になっている=閉じていない状態です。

## 改善後のコード例(C++版)

```cpp
// C++20
#include <memory>
#include <string>
#include <vector>

class ISkill {
public:
    virtual ~ISkill() = default;
    virtual void Cast(Player& caster) = 0;
    virtual float Cooldown() const = 0;
    virtual int ManaCost() const = 0;
};

class Fireball : public ISkill {
public:
    void Cast(Player& caster) override { /* 弾を生成してダメージ */ }
    float Cooldown() const override { return 3.0f; }
    int ManaCost() const override { return 10; }
};

// スキル追加 = 新クラスを1つ書いて登録するだけ。既存コードは無変更
class SkillList {
public:
    void Register(std::unique_ptr<ISkill> skill) { skills_.push_back(std::move(skill)); }
    // ... 選択・発動処理は ISkill 経由なので種類を知らない
private:
    std::vector<std::unique_ptr<ISkill>> skills_;
};
```

**何が変わったか**: 「1スキルの知識」が1クラスに集まり(SRP)、追加が新クラスの追加だけで済むようになった(OCP)。仕組みはポリモーフィズム(→ [ポリモーフィズムとインターフェース](/design/foundations/polymorphism-interface.html))。

なおOCPを満たす手段は仮想関数だけではありません。**テンプレート**(コンパイル時)、**std::functionの登録**、**データ駆動**(スキルをデータで記述 → [Type Object](/game/patterns/type-object-and-sandbox.html))でも同じ性質を実現できます。

## C#版(Unityでの例)

```csharp
// 改善版: ScriptableObjectでスキルを「アセットの追加」にする(Unityの定石)
public abstract class Skill : ScriptableObject {
    public float cooldown;
    public int manaCost;
    public abstract void Cast(PlayerContext caster);
}

[CreateAssetMenu(menuName = "Skills/Fireball")]
public class FireballSkill : Skill {
    [SerializeField] private GameObject projectilePrefab;
    public override void Cast(PlayerContext caster) {
        Object.Instantiate(projectilePrefab, caster.FirePoint, caster.AimRotation);
    }
}
```

スキル追加が「新しい .asset ファイルと1クラスの追加」になり、既存のスキル発動コードは無変更。**企画がコードを触らずスキルを増やせる**ところまで到達するのがゲーム開発でのOCPの実利です。

## ゲーム開発での例

- 実績システム: 実績の種類追加が条件クラス/データの追加だけで済むか → [ケーススタディ: 実績システム](/design/case-studies/achievements.html)
- ステータス効果(毒・氷結・燃焼)の追加 → [ケーススタディ: ステート異常](/design/case-studies/status-effects.html)
- ドロップテーブル、クエスト条件、ダメージ修飾など「運用中に種類が増え続けるもの」全般

## 原則同士の関係

- OCPの実現手段がポリモーフィズムのとき、派生型が約束を破ると成立しない → [LSP](/design/solid/lsp.html) はOCPの前提条件。
- 追加の受け口(抽象)を呼ぶ側に持たせる構造は [DIP](/design/solid/dip.html) と同じ形になる。
- [Strategy](/design/patterns/strategy.html) / [Decorator](/design/patterns/decorator.html) / [Observer](/design/patterns/observer.html) など多くのGoFパターンは「特定の軸に対してOCPを満たす定型」と読める。

## 適用しすぎた場合の弊害

- **開く軸を外す**: 「スキルの種類」に開いたのに、実際の変更は「発動条件の複雑化」だった——抽象が的外れだと、抽象の作り直し+全実装の修正でむしろ高くつく。
- **早すぎる抽象化**: 種類が2つの段階で将来の追加を見込んで抽象を作ると、大抵インターフェースの形を誤ります。**3回目の追加で抽象化**が経験則(→ [YAGNI](/design/foundations/yagni-kiss-dry.html))。
- **可読性の喪失**: 全種類がswitchで1画面に並ぶコードは、初見には抽象階層より速く読めます。少種類・低頻度ならswitchが正解。

## コードレビュー用チェックリスト

- [ ] このswitch/if連鎖は過去に何回「同種の追加」で修正されたか?(2回以上なら開く候補)
- [ ] 追加1件に必要な既存ファイルの修正箇所は何か所か?(0が理想、1(登録箇所)は許容)
- [ ] 開いた軸は、実際に追加が来ている軸と一致しているか?
- [ ] 抽象を導入した場合、種類を横断して見たいもの(バランス表など)を見る手段は残っているか?
- [ ] データ駆動(テーブル追加)で済むものをクラス階層にしていないか?

## 理解度確認問題

1. OCPの「閉じている」は何に対して閉じているのですか。バグ修正は違反ですか。
2. switchのままでよいのはどんな条件のときですか。
3. OCPを仮想関数以外で実現する手段を2つ挙げてください。
4. 「全方向に開いた設計」が不可能なのはなぜですか。

<details><summary>解答の要点</summary>

1. 「同種の追加」による修正に対して。バグ修正は対象外(違反ではない)。
2. 種類が少なく安定している/追加が予想されない/種類横断の一覧性の方が価値がある場合。
3. テンプレート(コンパイル時多態)、std::function等の登録制、データ駆動(Type Object)。
4. 変更の軸は無限にあり、各軸に開くたび抽象と間接化のコストを払うため。実際に変更が来る軸の予想にしか投資できない。
</details>

## 関連項目

- [ポリモーフィズムとインターフェース](/design/foundations/polymorphism-interface.html)
- [Strategy](/design/patterns/strategy.html) / [Type Object](/game/patterns/type-object-and-sandbox.html)
- [判断ガイド: 抽象化すべきか](/design/decisions/abstraction-and-patterns.html)

## 演習

上の `ISkill` 改善版に「発動時に他スキルのクールダウンを全リセットする」スキルを追加しようとすると、インターフェースの形が問題になります。何が問題で、どう直すか(2案)を考えてください。ヒント: スキルが「他のスキル一覧」を知る必要が生まれる=開いた軸の外の変更。

---

関連項目：[SRP](/design/solid/srp.html) / [学習ガイド](/design/solid/) / [LSP: リスコフの置換原則](/design/solid/lsp.html)
