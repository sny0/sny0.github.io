---
title: 継承・委譲・コンポジション(比較ページ)
study:
  source: C++ Wiki
  status: published
  summary: "コードを再利用し組み合わせる手段は主に3つあります。 継承(inheritance): 「BはAの一種である(is-a)」。Aの実装とインターフェースを丸ごと受け継ぐ。 コンポジション(composition): 「BはAを部品として持つ(has-a)」。必要な機能だけ持ち物として抱える。"
  section: reference
  format: article
  domain: design
---

# 継承・委譲・コンポジション(比較ページ)

## 一言で言うと

コードを再利用し組み合わせる手段は主に3つあります。

- **継承(inheritance)**: 「BはAの一種である(is-a)」。Aの実装とインターフェースを丸ごと受け継ぐ。
- **コンポジション(composition)**: 「BはAを部品として持つ(has-a)」。必要な機能だけ持ち物として抱える。
- **委譲(delegation)**: 「Bは仕事をAに任せる」。コンポジションで持った部品に処理を転送する使い方。

現代の定石は「**まずコンポジションを検討し、is-a が本当に成り立つときだけ継承**」です。

## 解決したい問題

「敵の種類を増やしたい。共通処理は使い回したい」。このとき手段を誤ると、種類が増えるたびに苦しくなります。

## 問題のある実装(継承の乱用)

```cpp
// C++20(問題例)
class Enemy {                    // 歩いて近接攻撃する敵
public: /* Move, MeleeAttack ... */
};
class FlyingEnemy : public Enemy {       // 飛ぶ敵: Moveを上書き
};
class ShootingEnemy : public Enemy {     // 撃つ敵: 攻撃を上書き
};
class FlyingShootingEnemy : public ???   // 飛んで撃つ敵は…どっちを継ぐ?
```

## 何が問題になるか

- **組み合わせ爆発**: 「飛ぶ×撃つ×分裂する×毒」のような特徴の組み合わせは、継承ツリーでは表現できない(多重継承は別の問題を持ち込む → [多重継承](/languages/cpp/inheritance-and-virtual.html))。
- **基底の変更が全子クラスに波及**: Enemyの実装詳細に全子クラスが依存する。継承は**最強の結合**です。
- **不要な機能まで継承**: 撃つだけの砲台が「歩く」機能を持ってしまい、`Move()` を空実装で潰すことになる(→ [LSP違反](/design/solid/lsp.html)の温床)。

## 改善した実装(コンポジション+委譲)

「敵の特徴」を部品にして持たせます。

```cpp
// C++20(骨格。各部品の実装は省略)
#include <memory>

class IMover {                       // 「動き方」という部品の抽象
public:
    virtual ~IMover() = default;
    virtual void Move(struct Enemy& self) = 0;
};
class WalkMover : public IMover { /* 地上移動 */ public: void Move(Enemy&) override; };
class FlyMover  : public IMover { /* 飛行 */     public: void Move(Enemy&) override; };

class IAttacker {                    // 「攻撃の仕方」という部品の抽象
public:
    virtual ~IAttacker() = default;
    virtual void Attack(Enemy& self) = 0;
};
class MeleeAttacker : public IAttacker { public: void Attack(Enemy&) override; };
class ShootAttacker : public IAttacker { public: void Attack(Enemy&) override; };

struct Enemy {
    // has-a: 部品を所有する(unique_ptr = このEnemyだけが所有)
    std::unique_ptr<IMover> mover;
    std::unique_ptr<IAttacker> attacker;

    void Update() {
        mover->Move(*this);       // 委譲: 仕事を部品に任せる
        attacker->Attack(*this);
    }
};

// 「飛んで撃つ敵」= 部品の組み合わせで表現。クラスは増えない
Enemy MakeFlyingShooter() {
    return Enemy{ std::make_unique<FlyMover>(), std::make_unique<ShootAttacker>() };
}
```

## 何が改善されたか

- 特徴の組み合わせが**クラス定義なしで**作れる(データ駆動にもできる: 敵テーブルから部品を選んで組む)。
- 動き方の変更は Mover だけで完結。敵クラス群に波及しない。
- 部品単体でテストできる。

## 代わりに何を失ったか

- **間接化のコスト**: 実行時は仮想関数呼び出し(→ [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))、コード上は「実際どのMoverなのか」を追う手間。
- **暗黙の共有がない**: 継承なら基底に足せば全員に反映された。部品方式では組み合わせを管理する場所が必要。
- 敵が2種類しかなく今後も増えないなら、素朴なif文や小さな継承の方が読みやすい。

## 継承が適切な場面もある

継承を全否定するのは誤りです。次の条件が揃うなら継承は自然です。

1. **本当に is-a が成り立つ**(子は親としていつでも扱える → [LSP](/design/solid/lsp.html))
2. 親のインターフェースを**外部に対してそのまま**提供したい
3. 差分が「一部の振る舞いの上書き」で表現できる(→ [Template Method](/design/patterns/template-method.html))

典型例: `IMover` と `WalkMover` の関係(インターフェースの実装)は継承の正しい使い方です。**「実装の再利用のための深い継承」が危険**なのであって、「抽象への準拠を表す浅い継承」は健全です。

## 比較表

| | 継承 | コンポジション+委譲 |
|---|---|---|
| 関係 | is-a | has-a |
| 結合の強さ | 強い(基底の実装詳細に依存) | 弱い(部品のインターフェースに依存) |
| 組み合わせ | ツリー1本。爆発する | 自由。実行時に差し替えも可能 |
| コードの追いやすさ | 型を見れば能力が分かる | 部品の中身を追う必要がある |
| 実行時の変更 | 不可(型は固定) | 可能(moverを差し替えれば飛べる) |
| 向く場面 | 抽象の実装、安定した小さな階層 | 特徴の組み合わせ、変化の多い仕様 |

## ゲーム開発での例

この「継承ツリーの敵」→「部品の組み合わせ」への移行を突き詰めたものが、Unityの Component システムであり、さらにデータ指向に進めたものが [ECS](/game/patterns/component-and-ecs.html) です。詳細な設計比較は [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html) と [武器切り替え](/design/case-studies/weapon-switching.html) で扱います。

## Unity/C# との対応

- GameObject に MonoBehaviour を付けるのはコンポジションそのもの。
- 一方で MonoBehaviour 自体は継承で書く(`class EnemyAI : MonoBehaviour`)。「エンジンの抽象への準拠は継承、ゲームの特徴の組み合わせはコンポーネント」という使い分けが既に行われています。

## Unreal Engine との対応

- UEはActor継承(ACharacter ← APawn ← AActor)とActorComponentの両方を提供。Gameplay Frameworkは継承が深めの設計で、ゲーム固有機能はComponentに切り出すのが近年の推奨です(→ [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html))。

## よくある誤解

- 「継承は禁止」ではありません。**実装再利用**目的の深い継承が問題で、インターフェース実装の継承は日常的に使います。
- 「コンポジションにすれば設計は正しい」でもありません。部品の切り方(責務)を誤れば、部品同士が密結合した別の地獄ができます。

## 使う場面 / 使わない場面

- **コンポジション**: 特徴が組み合わさる、実行時に振る舞いが変わる、仕様変更が多い部分。
- **継承**: インターフェースの実装。安定していて浅い(1〜2段)階層。フレームワークの規約(MonoBehaviour、AActor)。
- **どちらも過剰な場面**: バリエーションが2つで固定なら、`enum` と `switch` の方が誠実なこともあります(→ [判断ガイド](/design/decisions/inheritance-or-composition.html))。

## 関連項目

- [LSP: リスコフの置換原則](/design/solid/lsp.html)
- [Strategy](/design/patterns/strategy.html) — 上のIMoverはStrategyパターンそのもの
- [Component と ECS](/game/patterns/component-and-ecs.html)
- [判断ガイド: 継承かコンポジションか](/design/decisions/inheritance-or-composition.html)

## 理解度チェック

1. is-a と has-a の違いを、敵キャラの例で言えますか。
2. 継承が「最強の結合」と呼ばれるのはなぜですか。
3. 継承が適切な条件を3つ挙げてください。

## 演習

「通常弾・追尾弾・貫通弾・追尾かつ貫通弾」という弾の仕様を、(a) 継承のみ、(b) コンポジションのみ、の2通りで骨格実装し、「爆発弾(着弾時範囲ダメージ)」追加時の変更量を比較してください。

---

関連項目：[抽象化・カプセル化・情報隠蔽](/design/foundations/abstraction-encapsulation.html) / [学習ガイド](/design/foundations/) / [ポリモーフィズムとインターフェース](/design/foundations/polymorphism-interface.html)
