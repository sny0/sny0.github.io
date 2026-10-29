---
title: "ケーススタディ 03: 敵AI"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "雑魚1種ならこれで完成です。 「見失ったら最後の位置を探す」→ 状態(探索中)の記憶が必要 → boolフラグ追加 「攻撃後は2秒クールダウン」「スタン中は動けない」→ フラグとタイマーが増殖し、if条件が !isStunned && !isSearching && cooldown <= 0 &&"
---

# ケーススタディ 03: 敵AI

## 素朴な実装

```cpp
// C++20
void Enemy::Update(float dt) {
    float dist = Distance(pos_, playerPos());
    if (dist < 1.5f)      AttackPlayer();
    else if (dist < 10.f) MoveToward(playerPos(), dt);
    else                  Patrol(dt);
}
```

雑魚1種ならこれで完成です。

## 機能追加で破綻する過程

1. 「見失ったら最後の位置を探す」→ 状態(探索中)の記憶が必要 → boolフラグ追加
2. 「攻撃後は2秒クールダウン」「スタン中は動けない」→ フラグとタイマーが増殖し、if条件が `!isStunned && !isSearching && cooldown <= 0 && ...` に(**フラグの網** → [State](/design/patterns/state.html)のサイン)
3. 敵が10種に → Update全体のコピペ亜種が10個(共通変更が10か所修正に)
4. 「ボスは体力50%で行動が変わる」「優先度: 逃走>攻撃>追跡」→ if の順序が仕様そのものになり、誰も安全に触れなくなる

## 案A: FSM(enum+switch → Stateクラス)

[ステートマシン](/game/patterns/state-machines.html)で詳述。Patrol/Chase/Attack/Search を状態として分離。

- 利点: 状態の排他性が構造で保証。各状態の仕様が1か所に。遷移がログできる
- 欠点: 「全状態からスタンへ」等の共通遷移が増えるとHSMが要る。優先度の表現(仕様が「〜なら常に〜」形式)には不向き

## 案B: Behavior Tree

[BTとBlackboard](/game/patterns/behavior-tree-and-blackboard.html)で詳述。優先度と割り込みが構造から出る。

- 利点: 「逃走>攻撃>追跡」という仕様の形とツリーが一致。企画がエディタで組める(UEは標準搭載)
- 欠点: 基盤コスト(自作なら)。毎フレーム評価のコスト。単純な敵には過剰

## 案C: 継承案(比較のため)

`Enemy` → `MeleeEnemy` → `EliteMeleeEnemy` のような**実装継承の階層は破綻しやすい**(「飛ぶエリート近接」で爆発 → [継承の問題](/design/foundations/inheritance-delegation-composition.html))。ただし「AIの器」(案A/BのContext)をエンジン規約(UEのAAIController)に沿って継承するのは健全。**実装の共有は継承でなくコンポジションで**。

## 案D: コンポジション+データ駆動案(実務の主流)

```
Enemy = [MoveComponent(歩行/飛行)] + [PerceptionComponent(視界)] +
        [BrainComponent(FSM or BT — 種類はデータで指定)] + [EnemyTypeData(数値)]
```

- 雑魚30種の「差」はほぼ数値([Type Object](/game/patterns/type-object-and-sandbox.html))と部品の組み合わせで表現し、**Brainの種類は2〜3個に抑える**(全敵に個別AIを書かない)
- 利点: 種類追加がデータ作業。部品は単体テスト可
- 欠点: 基盤構築のコスト。部品間の情報の受け渡し設計([Blackboard](/game/patterns/behavior-tree-and-blackboard.html)的な共有場所)が必要

## 案E: パターンを使わない簡潔案

素朴な実装+**関数分割と早期return**だけで整える:

```cpp
void Enemy::Update(float dt) {
    if (TryFlee(dt)) return;      // 優先度は関数の並び順で表現
    if (TryAttack(dt)) return;
    if (TryChase(dt)) return;
    Patrol(dt);
}
```

実はこれは「毎フレーム根から評価するSelector」——**BTの手書き版**です。敵1〜3種ならこれが最も読みやすい。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(敵1〜3種、行動3つ程度) | 案E(Try関数列)or enum+switchのFSM |
| 中(敵5〜15種、状態記憶あり) | 案A(FSM)+数値は[Type Object](/game/patterns/type-object-and-sandbox.html) |
| 大(多種+複雑なボス+企画調整) | 案D(部品+データ)+雑魚=共通FSM、ボス=BT |
| Unity | 案A自作 or Unity Behavior/アセット。構成は案D |
| UE | **BT+Blackboard+AIController(標準装備)**に乗るのが第一候補。StateTreeも選択肢 |

## この題材の教訓

- フラグが3つ絡んだらFSM、仕様書が「優先度」で書かれ始めたらBT——**仕様の形が構造を選ぶ**
- 「敵の種類」と「AIの種類」を分けて数える: 種類30でもAIパターンが3つなら、書くべきAIは3つ+データ30行([Flyweight](/design/patterns/flyweight.html)/Type Objectの発想)

---

前: [武器切り替え](/design/case-studies/weapon-switching.html) | [カテゴリ目次](/design/case-studies/) | 次: [ステート異常](/design/case-studies/status-effects.html)
