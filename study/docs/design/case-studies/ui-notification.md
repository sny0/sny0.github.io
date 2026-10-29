---
title: "ケーススタディ 08: UI通知"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "「ダメージ数値のポップ」「クエスト達成トースト」「HPバー更新」——ゲーム内の出来事を画面に映す配線の設計です。 UIの改修(HUD構造変更)のたびにゲームロジックがコンパイルエラー(依存の方向が逆)"
---

# ケーススタディ 08: UI通知

「ダメージ数値のポップ」「クエスト達成トースト」「HPバー更新」——ゲーム内の出来事を画面に映す配線の設計です。

## 素朴な実装

```cpp
// C++20 — ロジックがUIを直接呼ぶ
void Enemy::TakeDamage(int amount) {
    hp_ -= amount;
    g_hud->ShowDamageNumber(pos_, amount);         // 敵がHUDを知っている
    if (hp_ <= 0) g_hud->ShowKillLog(name_);
}
```

## 機能追加で破綻する過程

1. UIの改修(HUD構造変更)のたびにゲームロジックがコンパイルエラー([依存の方向](/design/foundations/dependency.html)が逆)
2. 「メニュー中は通知を溜めて後で表示」「同時多数は集約(コンボ表示)」→ 表示タイミング制御がロジック側に書けない
3. ヘッドレステスト(UIなし)でロジックが動かない
4. 通知の種類が増え、g_hudが巨大な神クラスに

## 案A: Observer(直接購読)

`Enemy::OnDamaged` イベントをHUDが購読([Observer](/design/patterns/observer.html))。

- 利点: 依存が逆転(ロジックはUIを知らない)。実装が軽い
- 欠点: **敵は大量に湧いて消える**ため、購読の張り替え(スポーンごとにSubscribe/Unsubscribe)が煩雑&解除漏れの温床。個体単位の購読はこの題材に合いにくい

## 案B: Event Queue(遅延+集約 — この題材の定石)

```cpp
struct DamagePopupRequest { Vec2 worldPos; int amount; bool critical; };
struct ToastRequest { std::string text; };

// ロジック側: 積むだけ(UIの状態を知らない)
ui_queue.Push(DamagePopupRequest{pos_, amount, isCrit});

// UI側: フレーム末尾に自分の都合で消化
void HudSystem::DrainUiQueue() {
    // メニュー中なら溜める / 同フレームの同一対象は合算 / 上限を超えたら間引く
}
```

- [Event Queueの比較表](/game/patterns/event-queue-and-pubsub.html)の利点(時間的分離・集約・間引き)がすべてこの題材の要求と一致する。UI通知は1フレーム遅れても誰も気づかない=遅延の欠点が消える
- 欠点: キューとイベント型の整備。即時性が必要なUI(HPバーの即応)には向かない → HPバーは案Cで

## 案C: MVP/購読の常設(常時表示系UI)

HPバー・所持金など「特定の状態を常に映す」UIは、キューではなく**状態への購読**([MVP](/game/patterns/mvc-mvp-mvvm.html)、ReactiveProperty的な形)が合います。

```
常時表示(HPバー、ミニマップ) → 状態購読(Observer/MVP)     … 「状態のミラー」
単発通知(ダメージ数値、トースト) → Event Queue              … 「出来事の流れ」
```

**UIは2種類ある**——この区別がこの題材の核心です。

## 案D: パターンを使わない簡潔案

`std::vector<UiMessage>` をグローバルに1本置き、ロジックはpush、UIは毎フレーム全部処理してclear。「キュー」と呼ぶほどでもない30行——小規模はこれで十分(案Bの縮退形で、育てれば案Bになる)。

## 継承案について

`NotifyingEnemy : Enemy` のような通知機能の継承は論外([継承は機能追加の道具ではない](/design/foundations/inheritance-delegation-composition.html))。検討対象になりません。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小 | 案D(メッセージvector)+HPバーは直接参照(UIがロジックを読むのは健全な方向) |
| 中 | 案B(単発系)+案C(常時系)の2本立て |
| 大 | 同上+通知のプライオリティ・ローカライズ・演出キュー(表示順の演出制御)を通知システムとして製品化 |
| Unity | 案C=event/R3購読、案B=自作キュー or MessagePipe |
| UE | 案C=Delegate購読(UMG)、案B=Gameplay Message Subsystem |

## この題材の教訓

- 「**状態のミラー**(購読)」と「**出来事の流れ**(キュー)」を区別する——1つの仕組みに統一しようとすると片方が歪む
- UIがロジックを参照する(読む)のは正常な依存方向。**逆(ロジック→UI)だけを禁止**すればよい([依存の方向](/design/foundations/dependency.html))

---

前: [ダメージ計算](/design/case-studies/damage-calculation.html) | [カテゴリ目次](/design/case-studies/) | 次: [オブジェクト生成](/design/case-studies/object-spawning.html)
