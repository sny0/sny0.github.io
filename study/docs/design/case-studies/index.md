---
title: "第11部: ケーススタディ"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "ここまでの知識を「実際のゲーム機能の設計判断」として使う章です。各ケースは共通の型で進みます: 素朴な実装(まず動くもの) 機能追加で破綻する過程(何が要求されると崩れるか)"
---

# 第11部: ケーススタディ

ここまでの知識を「**実際のゲーム機能の設計判断**」として使う章です。各ケースは共通の型で進みます:

1. **素朴な実装**(まず動くもの)
2. **機能追加で破綻する過程**(何が要求されると崩れるか)
3. **複数の設計案**(継承案/コンポジション案/パターン適用案/パターンを使わない簡潔案)
4. **利点と欠点の比較**
5. **規模別の判断**(小=ジャム・プロト/中=数人・数ヶ月/大=チーム・長期運用)

「正解」は規模と要求で変わります。**どの案も選べる状態**になることがこの章のゴールです。

## ケース一覧

| ケース | 主に効いてくる知識 |
|---|---|
| [01. プレイヤー入力](/design/case-studies/player-input.html) | [Command](/design/patterns/command.html)、[入力抽象化](/game/patterns/command-buffer-and-input.html)、[DIP](/design/solid/dip.html) |
| [02. 武器切り替え](/design/case-studies/weapon-switching.html) | [Strategy](/design/patterns/strategy.html)、[継承vsコンポジション](/design/foundations/inheritance-delegation-composition.html) |
| [03. 敵AI](/design/case-studies/enemy-ai.html) | [FSM](/game/patterns/state-machines.html)、[BT](/game/patterns/behavior-tree-and-blackboard.html)、[Type Object](/game/patterns/type-object-and-sandbox.html) |
| [04. ステート異常](/design/case-studies/status-effects.html) | [Decorator](/design/patterns/decorator.html)、効果リスト、[State](/design/patterns/state.html) |
| [05. 実績システム](/design/case-studies/achievements.html) | [Observer](/design/patterns/observer.html)、[Pub/Sub](/game/patterns/event-queue-and-pubsub.html)、データ駆動 |
| [06. セーブデータ](/design/case-studies/save-data.html) | [Memento](/design/patterns/memento.html)、[SRP](/design/solid/srp.html)、バージョン互換 |
| [07. ダメージ計算](/design/case-studies/damage-calculation.html) | パイプライン、[Chain of Responsibility](/design/patterns/chain-of-responsibility.html)、純粋関数 |
| [08. UI通知](/design/case-studies/ui-notification.html) | [Observer](/design/patterns/observer.html)、[MVP](/game/patterns/mvc-mvp-mvvm.html)、[Event Queue](/game/patterns/event-queue-and-pubsub.html) |
| [09. オブジェクト生成](/design/case-studies/object-spawning.html) | [Factory](/design/patterns/factory-method.html)、[Prototype](/design/patterns/prototype.html)、[Object Pool](/game/patterns/object-pool.html) |
| [10. 画面遷移](/design/case-studies/screen-transition.html) | [State/Stack](/design/patterns/state.html)、[Facade](/design/patterns/facade.html) |
| [11. サウンド管理](/design/case-studies/sound-manager.html) | [Facade](/design/patterns/facade.html)、[Adapter](/design/patterns/adapter.html)、[Event Queue](/game/patterns/event-queue-and-pubsub.html) |
| [12. アイテム効果](/design/case-studies/item-effects.html) | [Type Object](/game/patterns/type-object-and-sandbox.html)、[Command](/design/patterns/command.html)、データ駆動 |
| [13. クエスト](/design/case-studies/quest-system.html) | [Composite](/design/patterns/composite.html)、[Observer](/design/patterns/observer.html)、[Interpreter](/design/patterns/interpreter.html) |
| [14. イベント通知](/design/case-studies/event-notification.html) | [Observer](/design/patterns/observer.html) vs [Queue](/game/patterns/event-queue-and-pubsub.html) vs Bus 総合判断 |
| [15. 照準制御](/design/case-studies/aim-control.html) | [Strategy](/design/patterns/strategy.html)、補正パイプライン、[Update順序](/game/patterns/game-loop-and-update.html) |

仕上げに [演習](/design/case-studies/exercises.html)。

## 読み方のコツ

- 自分のプロジェクトに近い規模の判断を最初に読む(全部の案を実装する必要はない)
- 「破綻する過程」が自分の経験と一致するかを確かめながら読む——**破綻を経験する前に設計を上げるのは早すぎる抽象化**([YAGNI](/design/foundations/yagni-kiss-dry.html))になりがち

---

[全体目次](/guide/cpp-index.html) | 次: [プレイヤー入力](/design/case-studies/player-input.html)
