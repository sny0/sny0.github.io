---
title: ステート異常(状態異常)の設計
study:
  source: C++ Wiki
  status: published
  summary: 氷結・燃焼・スロウ追加 → 効果ごとにフラグ+タイマー2本がCharacterに増殖(4効果で変数12本) 「毒は重ねがけで効果増」「同じバフは上書き」→ 重複ルールがif文の枝に
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-04-ステート異常-状態異常" class="study-legacy-anchor" aria-hidden="true"></div>

# ステート異常(状態異常)の設計

## 素朴な実装

```cpp
// C++20
class Character {
public:
    void ApplyPoison(float duration) { isPoisoned_ = true; poisonTimer_ = duration; }
    void Update(float dt) {
        if (isPoisoned_) {
            poisonTimer_ -= dt;
            poisonTick_ += dt;
            if (poisonTick_ >= 1.f) { hp_ -= 5; poisonTick_ = 0; }
            if (poisonTimer_ <= 0) isPoisoned_ = false;
        }
    }
private:
    bool isPoisoned_ = false;
    float poisonTimer_ = 0, poisonTick_ = 0;
    int hp_ = 100;
};
```

## 機能追加で破綻する過程

1. 氷結・燃焼・スロウ追加 → **効果ごとにフラグ+タイマー2本**がCharacterに増殖(4効果で変数12本)
2. 「毒は重ねがけで効果増」「同じバフは上書き」→ 重複ルールがif文の枝に
3. 「氷結中は燃焼しない」「水濡れ+雷=感電」→ 効果間の相互作用が全効果のコードに散らばる
4. 「UIに残り時間とアイコンを出す」→ UIがCharacterの全フラグを個別参照
5. 効果追加のたびCharacter本体を修正([OCP](/design/solid/ocp.html)違反+神クラス化)

## 案A: 効果リスト方式(コンポジション・実務の定石)

```cpp
class IStatusEffect {
public:
    virtual ~IStatusEffect() = default;
    virtual void OnApply(Character& c) {}
    virtual void OnTick(Character& c, float dt) {}     // 継続処理(毒ダメージ等)
    virtual void OnExpire(Character& c) {}
    virtual std::string_view Id() const = 0;           // 重複判定・UI用
    float remaining = 0;
};

class StatusEffectList {                                // Characterはこれを1つ持つだけ
public:
    void Apply(std::unique_ptr<IStatusEffect> e, Character& c);   // 重複ルールはここで一元処理
    void Update(Character& c, float dt) {
        for (auto& e : effects_) { e->OnTick(c, dt); e->remaining -= dt; }
        // 期限切れをOnExpire→削除(走査中削除の作法 → Iterator)
        std::erase_if(effects_, [&](auto& e) {
            if (e->remaining > 0) return false;
            e->OnExpire(c);
            return true;
        });
    }
    // UI用に効果一覧を公開(アイコン・残り時間)
private:
    std::vector<std::unique_ptr<IStatusEffect>> effects_;
};
```

- 効果の追加=クラス1つ。Character無変更。UIはリストを見るだけ
- **ステータス修飾**(攻撃2倍等)は、効果が[Decoratorのリスト方式](/design/patterns/decorator.html)として `CalcAttack()` のパイプラインに参加する形で統合できる
- 欠点: 効果間の相互作用(氷結×燃焼)の置き場は依然設計が要る(→ リスト側で「適用前に既存効果に問い合わせる」フック、または相互作用テーブル)

## 案B: 継承案(比較のため)

`PoisonedCharacter : Character` のような状態の継承は**論外**(実行時に型は変えられない・複数効果の同時付与が表現不能)。[State](/design/patterns/state.html)パターンも不適: 状態異常は**排他的でなく同時に複数**乗るため、単一currentステートのモデルに合いません。**「Stateパターン=状態と名のつくもの全部」ではない**好例。

## 案C: データ駆動案

効果を `EffectData{ id, duration, tickInterval, tickDamage, statModifiers[], visualId }` のデータにし、汎用エフェクト実行機が解釈([Type Object](/game/patterns/type-object-and-sandbox.html))。

- 利点: 企画が効果を量産・調整できる。ネット同期・セーブが楽(データだけ)
- 欠点: 特殊効果(「移動するたび爆発」)はデータで書けない → 振る舞いIDでコードにフォールバック

## 案D: パターンを使わない簡潔案

効果が2〜3種で固定なら、素朴な実装の**フラグを構造体にまとめる**だけで十分:

```cpp
struct TimedFlag { float remaining = 0; bool Active() const { return remaining > 0; } };
struct StatusFlags { TimedFlag poison, freeze, haste; };   // Characterはこれを1つ持つ
```

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(2〜3効果固定) | 案D(TimedFlagの束) |
| 中(5効果以上 or 重複ルールあり) | 案A(効果リスト) |
| 大(数十効果・企画運用・同期) | 案A+案C(データ+振る舞りID)。相互作用はテーブル化 |
| Unity | 案AをScriptableObject効果定義と組み合わせ |
| UE | GAS(Gameplay Ability System)のGameplayEffectが案A+Cの完成品(重い基盤だが大規模なら乗る価値) |

## この題材の教訓

- 「同時に複数・個別の寿命・実行時に増減」— この3条件が揃ったら**フラグでもStateでもなく「リスト」**が正しい構造
- 効果システムはUI・セーブ・ネットが必ず参照する——**一覧できる形**(リスト+Id)にしておくことが後工程を救う

---

関連項目：[敵AI](/design/case-studies/enemy-ai.html) / [学習ガイド](/design/case-studies/) / [実績システム](/design/case-studies/achievements.html)
