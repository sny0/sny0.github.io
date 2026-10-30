---
title: State
study:
  source: C++ Wiki
  status: published
  summary: オブジェクトの振る舞いが「状態」によって大きく変わり、状態の種類と遷移が増えるにつれて、フラグとif文の網が壊れ始める。状態ごとの振る舞いを別クラスに分け、遷移を明示的にしたい。
  section: reference
  format: article
  domain: design
---

# State

## 解決する問題

オブジェクトの振る舞いが「状態」によって大きく変わり、状態の種類と遷移が増えるにつれて、**フラグとif文の網**が壊れ始める。状態ごとの振る舞いを別クラスに分け、遷移を明示的にしたい。

## 登場人物と責務

- **Context**: 状態を持つ本体(キャラクター)。現在の状態オブジェクトに処理を委譲
- **State**: 状態の共通インターフェース(`HandleInput`, `Update`)
- **ConcreteState**: 各状態の振る舞いと、次の状態への遷移条件

## 最小構成図

```
[Player(Context)] ──委譲──> [current: IState]
                              ├ StandingState ──ジャンプ入力──> JumpingState
                              ├ JumpingState ──着地──> StandingState
                              └ CrouchState  ──立つ──> StandingState
状態ごとの振る舞いと「次にどこへ行けるか」が各Stateに書かれる
```

## パターンなしの実装

```cpp
// C++20(問題例)— フラグの網
class Player {
public:
    void HandleInput(const Input& in) {
        if (in.Pressed(Key::B)) {
            if (!isJumping_ && !isDucking_ && !isDashing_) {   // この条件、全部合ってる?
                isJumping_ = true;
                velocityY_ = kJumpSpeed;
            }
        }
        if (in.Pressed(Key::Down)) {
            if (!isJumping_) isDucking_ = true;
            else isDiving_ = true;                              // 空中で下=急降下
        }
        // 新しい状態(壁張り付き)を足すと、全if文の条件を見直し…
    }
private:
    bool isJumping_ = false, isDucking_ = false, isDashing_ = false, isDiving_ = false;
    float velocityY_ = 0;
};
```

## 問題点

- 状態はフラグの**組み合わせ**として暗黙に存在し、無効な組み合わせ(ジャンプ中かつしゃがみ)をコンパイラも人も防げない
- 状態追加のたびに全条件式を見直し(1か所漏れると「ダッシュ中にジャンプでテレポート」級のバグ)
- 状態ごとの処理が全メソッドに散らばる(ジャンプの仕様を知るには全if文を読む)

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>

class Player;   // 前方宣言

class IPlayerState {
public:
    virtual ~IPlayerState() = default;
    // 戻り値で遷移先を返す(nullptr = 遷移なし)。遷移の責任を状態自身に持たせる設計
    virtual std::unique_ptr<IPlayerState> HandleInput(Player& p, const Input& in) = 0;
    virtual void Update(Player& p, float dt) = 0;
    virtual void OnEnter(Player& p) {}   // 遷移時の初期化(アニメ再生など)
};

class StandingState : public IPlayerState {
public:
    std::unique_ptr<IPlayerState> HandleInput(Player& p, const Input& in) override;
    void Update(Player&, float) override {}
};
class JumpingState : public IPlayerState {
public:
    void OnEnter(Player& p) override { /* ジャンプアニメ、初速設定 */ }
    std::unique_ptr<IPlayerState> HandleInput(Player& p, const Input& in) override;
    void Update(Player& p, float dt) override { /* 重力、着地判定 */ }
};

class Player {
public:
    Player() : state_(std::make_unique<StandingState>()) {}
    void HandleInput(const Input& in) {
        if (auto next = state_->HandleInput(*this, in)) ChangeState(std::move(next));
    }
    void Update(float dt) { state_->Update(*this, dt); }
private:
    void ChangeState(std::unique_ptr<IPlayerState> next) {
        state_ = std::move(next);
        state_->OnEnter(*this);
    }
    std::unique_ptr<IPlayerState> state_;   // 現在の状態を所有。常にちょうど1つ
};

inline std::unique_ptr<IPlayerState> StandingState::HandleInput(Player&, const Input& in) {
    if (in.Pressed(Key::B)) return std::make_unique<JumpingState>();   // 遷移が明示的
    return nullptr;
}
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_state.cpp">samples/pattern_state.cpp</a>

**「同時に1つの状態しか存在しない」ことが型で保証**され、ジャンプの全仕様が JumpingState 1ファイルに集まりました。

## C#またはUnityでの実装

```csharp
public interface IEnemyState {
    IEnemyState HandleUpdate(EnemyContext e);   // 遷移先を返す(nullで維持)
    void OnEnter(EnemyContext e) {}
}
public class PatrolState : IEnemyState {
    public void OnEnter(EnemyContext e) => e.Agent.speed = 2f;
    public IEnemyState HandleUpdate(EnemyContext e) {
        e.MoveAlongRoute();
        return e.CanSeePlayer() ? new ChaseState() : null;
    }
}
public class EnemyContext : MonoBehaviour {
    private IEnemyState state = new PatrolState();
    private void Update() {
        var next = state.HandleUpdate(this);
        if (next != null) { state = next; next.OnEnter(this); }
    }
}
```

UnityのAnimator Controller(ステートマシン)やUEのStateTreeは、このパターンをエディタで組めるようにした製品です。**アニメの状態とロジックの状態は別物**として設計するのが定石(混ぜるとAnimatorが神になる)。

## ゲームでの具体例

- キャラクターのアクション状態(立ち/走り/ジャンプ/しゃがみ/攻撃/被弾)
- 敵AIのモード(巡回/警戒/追跡/攻撃/退却)→ [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html)
- ゲーム全体のフロー(タイトル/ロード/プレイ/ポーズ/リザルト)→ [ケーススタディ: 画面遷移](/design/case-studies/screen-transition.html)

## 利点

- 無効な状態の組み合わせが**構造的に存在できない**
- 状態1つの仕様が1クラスに凝集(仕様書と1:1対応しやすい)
- 遷移が明示的でログ・デバッグ表示を仕込みやすい
- 状態の追加が新クラス+関係する遷移だけ([OCP](/design/solid/ocp.html)寄り)

## 欠点

- クラス数が状態数だけ増える。2〜3状態ならswitchの方が断然読みやすい
- 状態間で共有するデータ・処理の置き場に設計判断が要る(Contextに置く/基底に置く)
- 頻繁な遷移で状態オブジェクトをnewするとアロケーションが気になる(→ 状態をstaticに使い回す、enum+switchに戻す、などの変形)
- 状態爆発: 「ジャンプ中かつ攻撃中」のような**直交する状態軸**を1つのマシンに入れると組み合わせ地獄に戻る(→ 軸ごとにマシンを分ける、[HSM](/game/patterns/state-machines.html))

## 適用条件

- 状態が4つ以上、または増え続ける
- 状態ごとに複数の振る舞い(入力・更新・描画)が変わる
- 遷移ルールが仕様として明確

## 避けるべき条件

- 状態が2〜3個で固定 → enum+switchが誠実
- 「状態」ではなく「独立したフラグ」(無敵かどうか等、他と直交する属性)→ フラグのままでよい
- 階層・並列・履歴が必要 → 素のStateでは苦しい([HSM/FSMの発展形](/game/patterns/state-machines.html)へ)

## 似たパターンとの違い

- [Strategy](/design/patterns/strategy.html): 構造は同じ(振る舞いの委譲)。**Stateは自分で遷移する**(状態が次の状態を知る)、Strategyは外から与えられて交換される。詳細比較は[有限ステートマシンと階層型ステートマシン(State と Strategy の比較つき)](/game/patterns/state-machines.html)
- [Type Object](/game/patterns/type-object-and-sandbox.html): 種類による違い(静的)vs 時間による違い(動的)

## 実務でよく見かける変形

- enum+switch版FSM(軽量・データ志向。状態数が多くてもテーブル駆動にできる)
- スタック型(プッシュダウン・オートマトン): ポーズ→戻る、のような「前の状態に戻る」を自然に表現
- [Hierarchical State Machine / Behavior Tree](/game/patterns/state-machines.html)への発展

## 過剰設計になる例

ON/OFFの2状態のドアに State パターン一式(IDoorState, OpenState, ClosedState, 遷移管理)——`bool isOpen` で済みます。

## 関連項目

- [FSMとHSM(発展形と実務の形)](/game/patterns/state-machines.html)
- [Strategy](/design/patterns/strategy.html)
- [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html)

## 理解度チェック

1. フラグの網と比べて、Stateパターンが「構造的に」防ぐものは何ですか。
2. StateとStrategyの決定的な違いは?
3. Stateパターンにすべきでない「2種類の状況」を挙げてください(少なすぎる場合と、直交軸の場合)。

## 演習

検証サンプルに「しゃがみ(Down押下で遷移、ジャンプ不可、Down解除で立ちへ)」を追加してください。フラグ版に同じ機能を足した場合に見直しが必要だった条件式の数と比較してください。

---

関連項目：[Observer](/design/patterns/observer.html) / [学習ガイド](/design/patterns/) / [Strategy](/design/patterns/strategy.html)
