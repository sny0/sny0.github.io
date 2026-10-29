---
title: "ケーススタディ 14: イベント通知(通知設計の総合判断)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "Observer・Event Queue・Pub/Subで個別に学んだ道具を、「1つのゲームの中でどう組み合わせるか」という総合問題として扱います。題材: 「敵死亡」に UI(キル表示)・スコア・実績・クエスト・ドロップ生成・サウンドの6システムが反応する。"
---

# ケーススタディ 14: イベント通知(通知設計の総合判断)

[Observer](/design/patterns/observer.html)・[Event Queue・Pub/Sub](/game/patterns/event-queue-and-pubsub.html)で個別に学んだ道具を、「**1つのゲームの中でどう組み合わせるか**」という総合問題として扱います。題材: 「敵死亡」に UI(キル表示)・スコア・実績・クエスト・ドロップ生成・サウンドの6システムが反応する。

## 素朴な実装

```cpp
void Enemy::Die() {
    score_->Add(exp_);
    achievements_->OnKill(type_);
    quests_->OnKill(type_);
    ui_->ShowKillLog(name_);
    drops_->SpawnFor(*this);
    audio_->Play("enemy_die");
}
```

## 破綻の過程

1. Enemyが6システムに依存(テスト不能・[依存の方向](/design/foundations/dependency.html)崩壊)
2. 反応システム追加のたびDie()修正
3. **順序の暗黙依存**が芽生える: ドロップはスコア加算の前に? クエスト達成表示はキル表示の後に?——コードの行順が仕様になり、誰も動かせなくなる
4. 死亡ラッシュ時のUI・サウンドのスパム

## 判断の枠組み: 反応を3種類に分類する

全部を1つの仕組み(全部直呼び/全部バス)にしようとするから壊れます。**反応の性質**で仕分けます。

| 分類 | 性質 | 適した仕組み |
|---|---|---|
| **ゲームルールの帰結**(ドロップ、スコア) | 順序・確実性が重要。ゲーム状態を変える | **直接呼び出し**(明示的な手続き) |
| **観測者**(実績、クエスト、統計) | 順序不問・ゲームに影響しない・増え続ける | **Pub/Sub**(疎結合) |
| **演出**(UI、サウンド) | 遅延OK・集約/間引きしたい | **Event Queue**(遅延+加工) |

```cpp
void World::KillEnemy(Enemy& e) {                 // 死亡処理の手続きはWorldに(Enemy自身ではなく)
    // 1. ルールの帰結: 明示的な順序で直接実行
    score_.Add(e.Exp());
    drops_.SpawnFor(e);                           // 順序が仕様なら、コードの順序で表現してよい

    // 2. 観測者へ: 事実を発行(誰が聞いているか知らない)
    bus_.Publish(EnemyDied{e.Id(), e.Type(), e.Pos()});

    // 3. 演出へ: リクエストを積む(フレーム末尾で集約)
    uiQueue_.Push(KillLogRequest{e.Name()});
    audioQueue_.Push(SePlayRequest{SeId::EnemyDie, e.Pos()});

    world_.Destroy(e);
}
```

## この形の意味

- **「順序が仕様であるもの」をイベントにしない**のが最重要判断。ドロップ→破棄の順序をバス購読者の登録順に委ねるのは、動くが誰も保証していない状態([Observerの落とし穴](/design/patterns/observer.html))
- 観測者(実績・クエスト)は「事実(EnemyDied)」だけ受け取り、**必要な値を全部積む**([Event Queueの鉄則](/game/patterns/event-queue-and-pubsub.html)——処理時にはEnemyは破棄済み!)
- 演出は集約の機会(同フレーム10killの表示・SEまとめ)を得る

## 代替案とその評価

- **全部直呼び(素朴版)**: 小規模なら実は許容。反応が4つを超えた・テストしたくなった時が移行時期
- **全部バス**: 「疎結合の理想」に見えるが、ルールの帰結までバスに流すと**因果が追えないゲームロジック**になる(スコアが増えない、原因はどこ?)。アンチパターン
- **Enemyが自分でDie()を完結**: 死亡の帰結はEnemyの責務ではなくワールドのルール([SRP](/design/solid/srp.html)——「誰の変更理由か」で考えるとWorld/ルール側)

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小 | 直呼びのみ(KillEnemy関数に集約するところまではやる) |
| 中 | 上記3分類(直呼び+バス+キュー)。バスは型ベースの簡素なもので十分 |
| 大 | 同上+イベントログ(全発行の記録=デバッグとリプレイの資産)+スレッド境界の設計 |
| Unity | バス=C# event集約 or MessagePipe、キュー=自作。分類の考え方は同一 |
| UE | 直呼び=GameMode内の手続き、バス=Gameplay Message Subsystem、演出=既存のキュー的機構(Niagara/サウンドの発火) |

## この題材の教訓

- 通知設計の質問は「どのパターンを使うか」ではなく「**この反応は、ルールか、観測か、演出か**」——分類が決まれば道具は自動的に決まる
- 「イベント駆動にすれば疎結合」という単純化が最も危険な題材。**結合すべきもの(ルールの順序)は堂々と結合させる**

---

前: [クエスト](/design/case-studies/quest-system.html) | [カテゴリ目次](/design/case-studies/) | 次: [照準制御](/design/case-studies/aim-control.html)
