---
title: 武器切り替えの設計
study:
  source: C++ Wiki
  status: published
  summary: 武器2種で固定ならこれが正解です。 武器が5種に → Attackのifが伸びる。さらに GetRange(), GetAttackSpeed(), PlayEquipAnim() にも同じ分岐が複製される(switch散らばり → ポリモーフィズムの出番のサイン)
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-02-武器切り替え" class="study-legacy-anchor" aria-hidden="true"></div>

# 武器切り替えの設計

## 素朴な実装

```cpp
// C++20
class Player {
public:
    void Attack() {
        if (weapon_ == WeaponType::Sword) { /* 近接判定・剣アニメ */ }
        else if (weapon_ == WeaponType::Bow) { /* 矢の生成・弓アニメ */ }
    }
    void SwitchWeapon(WeaponType t) { weapon_ = t; }
private:
    WeaponType weapon_ = WeaponType::Sword;
};
```

武器2種で固定なら**これが正解**です。

## 機能追加で破綻する過程

1. 武器が5種に → Attackのifが伸びる。さらに `GetRange()`, `GetAttackSpeed()`, `PlayEquipAnim()` にも同じ分岐が複製される(**switch散らばり** → [ポリモーフィズム](/design/foundations/polymorphism-interface.html)の出番のサイン)
2. 武器ごとの状態(弓の矢数、銃のリロード)を `Player` が全部抱え始める(`arrowCount_`, `ammo_`, `reloadTimer_`... 使われない変数だらけの神クラス化)
3. 「魔法剣(近接+弾も出る)」で分岐が入れ子に
4. 企画「武器を運用で追加したい」——コード修正+ビルドが毎回必要

## 案A: 継承(インターフェース)案

```cpp
class IWeapon {
public:
    virtual ~IWeapon() = default;
    virtual void Attack(Player& owner) = 0;
    virtual void Update(float dt) {}          // リロード進行など
    virtual float Range() const = 0;
};
class Bow : public IWeapon {
public:
    void Attack(Player& owner) override { if (arrows_ > 0) { /* 矢生成 */ --arrows_; } }
    float Range() const override { return 20.f; }
private:
    int arrows_ = 30;                          // 武器固有の状態が武器に閉じる
};

class Player {
public:
    void Attack() { weapon_->Attack(*this); }
    void SwitchTo(std::unique_ptr<IWeapon> w) { weapon_ = std::move(w); }
private:
    std::unique_ptr<IWeapon> weapon_;          // 所有。切り替え=差し替え
};
```

- 実行時に差し替える振る舞い+固有状態——これは[Strategy](/design/patterns/strategy.html)(切り替えの主体が外部=プレイヤー入力)そのもの
- 利点: 武器追加=クラス1つ。分岐消滅。武器固有状態の隔離。単体テスト可
- 欠点: 切り替え時に状態をどうするか(矢数は保持したい→インスタンスを作り直すと消える→所持武器リストとして保持する設計が要る)。クラス数増

## 案B: コンポジション分解案(武器がさらに複雑なら)

武器自体を部品に分ける: `IWeapon` の中身を `IAttackBehavior`(攻撃方式)+`AmmoComponent`(弾管理)+`WeaponStats`(データ)で合成([継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html))。「魔法剣」=近接+発射の**2つのAttackBehaviorを持つ**、で組み合わせ爆発を回避。

- 利点: 特徴の組み合わせ自由。データ駆動化への道
- 欠点: 部品間の調整コード。武器5種程度では過剰

## 案C: データ駆動案([Type Object](/game/patterns/type-object-and-sandbox.html))

```cpp
struct WeaponData {          // 武器の「種類」はデータ(JSON/ScriptableObject/DataAssetから)
    float damage, range, attackInterval;
    int maxAmmo;             // 0なら弾なし
    std::string projectileId;  // 空なら近接
    // 攻撃の「型」はenum+少数の分岐 or 振る舞いIDでコード側の関数を引く
};
```

- 利点: 企画がコードなしで武器を追加・調整。ホットリロード可
- 欠点: 「データで表現できる範囲」に振る舞いが制限される(特殊武器はやはりコードが要る → 振る舞いID+データのハイブリッドへ)

## 案D: パターンを使わない簡潔案

分岐は残すが、**switchを1か所に集約**(WeaponLogic.cppに全武器関数を並べ、関数テーブルで引く)。武器3〜4種で増える予定が薄いならこれで十分読みやすい。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(武器2〜3種固定) | 素朴な実装 or 案D |
| 中(5種以上 or 固有状態あり) | 案A(Strategy)。切り替えは所持リスト+ポインタ差し替え |
| 大(数十種・運用追加・企画調整) | 案C(データ)+案A/B(振る舞い)のハイブリッド——実務の主流 |
| Unity | 案A+ScriptableObject(=案Cを兼ねる)が定石 |
| UE | DataAsset(案C)+WeaponコンポーネントorGAS(Gameplay Ability System) |

## この題材の教訓

- 破綻のシグナルは「**同じ分岐の複製**」と「**使われない状態変数の同居**」。1つ目は[OCP](/design/solid/ocp.html)、2つ目は[SRP](/design/solid/srp.html)の違反として現れる
- 「クラス階層 vs データ駆動」は二者択一ではなく、**数値・参照はデータ、振る舞いはコード**のハイブリッドに収束する([Type Object](/game/patterns/type-object-and-sandbox.html))

---

関連項目：[プレイヤー入力](/design/case-studies/player-input.html) / [学習ガイド](/design/case-studies/) / [敵AI](/design/case-studies/enemy-ai.html)
