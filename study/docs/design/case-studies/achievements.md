---
title: 実績システムの設計
study:
  source: C++ Wiki
  status: published
  summary: 実績が30個に → ゲームロジックの至る所に実績チェックが寄生(ジャンプ処理が実績を知っている=依存の方向が最悪) 「ノーダメージでボス撃破」「10秒以内に5体」→ 複数イベントの組み合わせ・時間条件がその場しのぎのフラグに
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-05-実績システム" class="study-legacy-anchor" aria-hidden="true"></div>

# 実績システムの設計

## 素朴な実装

```cpp
// C++20 — ゲームロジックの中に実績チェックを直書き
void Enemy::Die() {
    // ...死亡処理
    g_stats.kills++;
    if (g_stats.kills == 1)   UnlockAchievement("first_blood");
    if (g_stats.kills == 100) UnlockAchievement("hundred_kills");
}
void Player::Jump() {
    g_stats.jumps++;
    if (g_stats.jumps == 1000) UnlockAchievement("jump_master");
}
```

## 機能追加で破綻する過程

1. 実績が30個に → **ゲームロジックの至る所に実績チェックが寄生**(ジャンプ処理が実績を知っている=[依存の方向](/design/foundations/dependency.html)が最悪)
2. 「ノーダメージでボス撃破」「10秒以内に5体」→ 複数イベントの組み合わせ・時間条件がその場しのぎのフラグに
3. プラットフォーム対応(Steam/PS)→ Unlock呼び出しの差し替えが全箇所に波及
4. 実績追加のたび、無関係なゲームコードに触ってバグらせる(実績はゲームで最も「後から増える」機能)

## 案A: イベント購読方式(Observer/Pub-Sub — 定石)

```
[ゲームロジック] ──EnemyDied / PlayerJumped / DamageTaken を発行──> [イベントバス]
                                                                       │購読
[AchievementSystem] ── 条件を評価し、達成なら [IPlatformAchievements] へ通知(Adapter)
```

```cpp
// ゲーム側は「起きたこと」を発行するだけ(実績の存在を知らない)
bus.Publish(EnemyDied{enemyId});

// 実績側が全部を引き受ける
class AchievementSystem {
public:
    AchievementSystem(EventBus& bus, IPlatformAchievements& platform);  // 購読+出力先注入(DIP)
private:
    void OnEnemyDied(const EnemyDied&) { kills_++; CheckKillAchievements(); }
    GameStatsCounter stats_;   // 統計の集計も実績側の責務に
};
```

- 利点: ゲームロジックから実績が完全に消える([SRP](/design/solid/srp.html))。実績追加は実績システム内で完結。プラットフォーム差は[Adapter](/design/patterns/adapter.html)に隔離
- 欠点: イベント型の整備が必要。「どのイベントが飛んでいるか」の一覧性([Pub/Subの追跡性問題](/game/patterns/event-queue-and-pubsub.html))

## 案B: 条件のデータ駆動化(案Aの発展)

実績の大半は「カウンタがNに達した」型。条件をデータにします。

```cpp
struct AchievementDef {              // JSONやScriptableObjectから
    std::string id;
    std::string counterId;           // "kills", "jumps", "bossKillsNoDamage"
    int threshold;                   // 100
};
// 汎用エンジン: カウンタ更新のたびに全Def(またはcounterIdで索引した一部)をチェック
```

- 利点: 実績追加=データ1行(コード変更ゼロ、[OCP](/design/solid/ocp.html)の理想形)。ローカライズ・UI一覧もデータから生成
- 欠点: 複合条件(ノーダメ撃破)はカウンタ1本で書けない → 「特殊条件はコードで専用カウンタを作り、実績はそのカウンタを見る」という2層で解決(条件式ツリー([Composite](/design/patterns/composite.html)/[Interpreter](/design/patterns/interpreter.html))まで作るのは大抵過剰)

## 案C: ポーリング方式(パターンを使わない簡潔案)

毎秒(または画面遷移時)に `CheckAll(stats)` で全実績を評価する。イベント基盤が無いプロジェクトでは意外に実用的。

- 利点: イベント整備不要。実装が1関数。順序・タイミングのバグが出にくい
- 欠点: 統計(stats)は誰かが集計している前提(その集計がゲームコード直書きなら問題は残る)。瞬間条件(「同時に5体」)は取りこぼす

## 案D: 継承案(比較のため)

`Achievement` 基底+実績ごとの派生クラス([OCPページの例](/design/solid/ocp.html))。案Bのデータで書けない複雑実績だけ派生にする、というハイブリッドの部品としては有効。全実績をクラスにするのはデータで済む大半にとって過剰。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(実績5個・ジャム) | 案C(ポーリング)か、直書きでも許容 |
| 中(実績20〜50個) | 案A(イベント)+カウンタ集計。複雑条件だけ専用コード |
| 大(運用追加・プラットフォーム複数) | 案A+案B(データ駆動)+[Adapter](/design/patterns/adapter.html)でプラットフォーム隔離 |
| Unity | 案A(自作バス or MessagePipe)+ScriptableObject定義 |
| UE | 案A(Gameplay Message Subsystem等)+DataTable定義+OnlineSubsystemがAdapter相当 |

## この題材の教訓

- 実績は「**ゲーム全体を観測するが、ゲームに影響しない**」純粋な購読者——Observer/Pub-Subの最も筋の良い適用先(1フレームの遅延も順序も問題にならない)
- 「発行側は事実(EnemyDied)を流す。判断(実績達成)は購読側」——イベント設計の原則([Event Queue](/game/patterns/event-queue-and-pubsub.html)の「事実を積む」)の実践例

---

関連項目：[ステート異常](/design/case-studies/status-effects.html) / [学習ガイド](/design/case-studies/) / [セーブデータ](/design/case-studies/save-data.html)
