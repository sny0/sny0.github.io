---
title: 有限ステートマシンと階層型ステートマシン(State と Strategy の比較つき)
study:
  source: C++ Wiki
  status: published
  summary: "有限ステートマシン(FSM: Finite State Machine): 「有限個の状態+遷移ルール」でオブジェクトの振る舞いを整理する、Stateパターンの一般形。実装はクラスでもenum+switchでもテーブルでもよい"
  section: reference
  format: article
  domain: game
---

# 有限ステートマシンと階層型ステートマシン(State と Strategy の比較つき)

## 一言で言うと

- **有限ステートマシン(FSM: Finite State Machine)**: 「有限個の状態+遷移ルール」でオブジェクトの振る舞いを整理する、[Stateパターン](/design/patterns/state.html)の一般形。実装はクラスでもenum+switchでもテーブルでもよい
- **階層型ステートマシン(HSM: Hierarchical State Machine)**: 状態に親子関係を持たせ、**共通の遷移・処理を親状態に括り出す**FSMの拡張

## FSMの実装スペクトラム

同じFSMでも実装形態はいろいろで、規模で選びます。

```cpp
// C++20 — (1) enum + switch: 最軽量。状態数が少ないなら最良
enum class GuardState { Patrol, Chase, Attack };

void UpdateGuard(Guard& g, float dt) {
    switch (g.state) {
        case GuardState::Patrol:
            g.MoveAlongRoute(dt);
            if (g.CanSeePlayer()) g.state = GuardState::Chase;
            break;
        case GuardState::Chase:
            g.MoveToward(g.PlayerPos(), dt);
            if (g.InAttackRange()) g.state = GuardState::Attack;
            else if (!g.CanSeePlayer()) g.state = GuardState::Patrol;
            break;
        case GuardState::Attack:
            g.SwingWeapon();
            if (!g.InAttackRange()) g.state = GuardState::Chase;
            break;
    }
}
```

- (2) **Stateパターン**(状態=クラス): 状態ごとの処理が多い・OnEnter/OnExitが要る場合(→ [State](/design/patterns/state.html))
- (3) **遷移テーブル**: `(現状態, イベント) → 次状態` の表。データ駆動にでき、遷移の網羅が見える
- 検証済みサンプル: <a href="/study/samples/cpp/fsm_guard.cpp">samples/fsm_guard.cpp</a>

## FSMが破綻するとき → HSM

状態が増えると「**ほぼ全状態に同じ遷移**」が複製され始めます。

```
Patrol, Chase, Attack, Search, Return... どの状態でも:
  - HPが0 → Dead へ
  - スタン弾を受けた → Stunned へ
状態10個 × 共通遷移3本 = 30本の重複遷移(1本書き忘れると「攻撃中だけスタンしない」バグ)
```

HSMは共通部分を親状態に括り出します。

```
[Alive(親状態)]──HP0──> [Dead]
   │  └─スタン──> [Stunned](解除で「元の子状態」へ復帰 = 履歴)
   ├─ [Patrol] ⇄ [Chase] ⇄ [Attack]   ← 子状態は自分固有の遷移だけ書く
   └─ 子で処理されなかったイベントは親が処理する(委譲)
```

```cpp
// C++20 — HSMの核心: 「子が処理しなければ親に回す」
class HState {
public:
    virtual ~HState() = default;
    explicit HState(HState* parent = nullptr) : parent_(parent) {}
    // 処理したらtrue。しなければ親に委譲
    bool Dispatch(Guard& g, const Event& e) {
        if (HandleEvent(g, e)) return true;
        return parent_ ? parent_->Dispatch(g, e) : false;
    }
protected:
    virtual bool HandleEvent(Guard& g, const Event& e) = 0;
private:
    HState* parent_;   // 非所有(マシンが全状態を所有)
};
```

この「子→親への委譲」は[Chain of Responsibility](/design/patterns/chain-of-responsibility.html)の構造です。

### HSMのトレードオフ

- 得: 共通遷移の一元化(書き忘れバグの根絶)。状態数が増えても管理可能
- 失: 「今どういう状態か」が階層の合成になり、**デバッグ表示・ログが必須**になる複雑さ。履歴(どの子に戻るか)の管理
- 使わない: 状態が5〜6個以下で共通遷移が少ないうちはフラットなFSMで十分

## State と Strategy の比較(混同しやすい2つ)

構造はどちらも「振る舞いを持つオブジェクトへの委譲」で同一です。違いは**変化の主体と意味**にあります。

| | [State](/design/patterns/state.html) | [Strategy](/design/patterns/strategy.html) |
|---|---|---|
| 表すもの | **時間とともに変わる状況**(追跡中、スタン中) | **選ばれたやり方**(攻撃的AI、防御的AI) |
| 誰が切り替えるか | **自分**(状態が遷移条件を知る) | **外部**(生成時や設定で注入される) |
| 切り替え頻度 | 高い(毎秒でも) | 低い(基本は装着したら固定) |
| 相互の認知 | 状態は他の状態(遷移先)を知る | 戦略同士は互いを知らない |
| 例 | Patrol→Chase→Attack | Easy/Normal/HardのAI差し替え |

判別法: 「**それは自分で次の形に変わるか?**」— 変わるならState、外から与えられて固定ならStrategy。両方使うことも普通です(HardAI戦略の中にPatrol/ChaseのFSMがある)。

## Unity/C# との対応

- **Animator Controller** はビジュアルFSM(+サブステートマシン=HSM的階層)。ただし**アニメ遷移とゲームロジックの状態は分けて設計**する(Animatorをゲームロジックの状態機械として使うとパラメータ地獄になる)
- ロジック用FSMは自作(enum+switch/Stateクラス)か、StateMachineBehaviourやアセット(PlayMaker等)
- UI画面管理もFSMで組むと開閉の競合バグが減る(→ [ケーススタディ: 画面遷移](/design/case-studies/screen-transition.html))

## Unreal Engine との対応

- アニメ: AnimBP の State Machine(ビジュアルFSM)
- ロジック: UE5の **StateTree**(HSM+[Behavior Tree](/game/patterns/behavior-tree-and-blackboard.html)要素のハイブリッド)、GAS(Gameplay Ability System)のAbility状態管理

## 使う場面 / 使わない場面

- **FSM**: 状態が排他的(同時に1つ)で、遷移ルールが仕様として明確なもの全般(キャラ、AI、画面、接続状態)
- **使わない場面**: 直交する属性(無敵・毒・速度アップが同時につく)を1つのマシンに入れない——組み合わせ爆発します。直交軸は別マシン/フラグ/[Decorator的な効果リスト](/design/case-studies/status-effects.html)で
- 複雑な優先度付き行動選択はFSMの遷移が絡まりやすい → [Behavior Tree](/game/patterns/behavior-tree-and-blackboard.html)へ

## よくある誤解

- 「FSM=Stateパターン」— Stateパターンは実装形態の一つ。enum+switchも立派なFSM
- 「HSMは常にFSMより良い」— 階層は複雑さの前借り。フラットで足りるうちはフラットで

## 関連項目

- [State](/design/patterns/state.html) / [Strategy](/design/patterns/strategy.html) / [Chain of Responsibility](/design/patterns/chain-of-responsibility.html)
- [Behavior Tree と Blackboard](/game/patterns/behavior-tree-and-blackboard.html)
- [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html)

## 理解度チェック

1. enum+switch版とStateクラス版の使い分け基準は?
2. HSMが解決する「重複遷移」問題を具体例で説明できますか。
3. StateとStrategyの判別法(一問)を言えますか。
4. FSMに入れてはいけない「直交する状態」とは?

## 演習

samples/fsm_guard.cpp に「Search(見失ったら最後の目撃地点へ行き、数秒探して戻る)」状態を追加してください。次に「全状態からHP0でDeadへ」をswitch版に足してみて、HSMが欲しくなる瞬間を体感してください。

---

関連項目：[Type Object・Subclass Sandbox・Bytecode](/game/patterns/type-object-and-sandbox.html) | [この分野の学習ガイド](/game/patterns/) | [Behavior Tree と Blackboard](/game/patterns/behavior-tree-and-blackboard.html)
