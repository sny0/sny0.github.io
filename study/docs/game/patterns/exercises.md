---
title: ゲームプログラミングパターンの演習
study:
  source: C++ Wiki
  status: published
  summary: 正誤を判定し、誤りは訂正してください。 Event QueueはObserverと違い、発行者と購読者の「時間的結合」を切る。 ECSはComponentパターンの改良版であり、常に上位互換である。
  section: practice
  format: exercise
  domain: game
  collection: cpp-exercises
  order: 4
---

<div id="第4部-演習-—-ゲームプログラミングパターン" class="study-legacy-anchor" aria-hidden="true"></div>

# ゲームプログラミングパターンの演習

## 問1. 概念確認

正誤を判定し、誤りは訂正してください。

1. Event QueueはObserverと違い、発行者と購読者の「時間的結合」を切る。
2. ECSはComponentパターンの改良版であり、常に上位互換である。
3. Object Poolは使わない間もメモリを占有する。
4. Behavior Treeは毎フレーム根から評価するため、遷移を書かなくても優先度の割り込みが起きる。
5. Service LocatorはDIと違い、依存がクラスのシグネチャに現れる。

<details><summary>解答</summary>

1. **正**([Event Queue](/game/patterns/event-queue-and-pubsub.html))。2. **誤**。動機が別(柔軟性vs性能)で、少数の複雑なオブジェクトにはComponentが向く([Component と ECS](/game/patterns/component-and-ecs.html))。3. **正**。それがプールの代償([Object Pool](/game/patterns/object-pool.html))。4. **正**([Behavior Tree](/game/patterns/behavior-tree-and-blackboard.html))。5. **誤**。逆。シグネチャに現れるのはDI([Service LocatorとDI](/game/patterns/service-locator-and-di.html))。
</details>

## 問2. コード読解

```cpp
while (accumulator >= kFixedDt) { FixedUpdate(kFixedDt); accumulator -= kFixedDt; }
Render(accumulator / kFixedDt);
```

1. `Render` の引数は何のために使いますか。
2. このループに上限を付けないと何が起きますか。

<details><summary>解答</summary>

1. 補間係数。固定更新の「間」の時刻での見た目を、前回と今回の状態の補間で描き、カクつきを防ぐ。2. 更新1回に1/60秒以上かかるマシンでaccumulatorが増え続け、消化しようとするほど遅くなる「死のスパイラル」([Game Loop](/game/patterns/game-loop-and-update.html))。
</details>

## 問3. 問題のあるコードの改善

「被弾のたびに `Instantiate(damagePopupPrefab)`、表示終了で `Destroy`。連続ヒットするとフレーム落ちし、GCスパイクも出る」— 適用すべきパターンと実装上の注意点2つ(状態リセット/参照の無効化)を説明してください。

<details><summary>解答の要点</summary>

[Object Pool](/game/patterns/object-pool.html)。注意点: (1) 再利用時のリセット漏れ(前の表示テキスト・アニメ進行が残る)→ Acquire時に完全初期化。(2) 貸出先が持つ参照のstale化 → 表示終了は必ずプール経由で返し、外部が長期保持しない設計に(必要なら世代ハンドル)。加えてUnityなら`SetActive`切替とCanvas再構築コストにも注意。
</details>

## 問4. 設計比較

「敵AI(雑魚30種、ボス3種)」に (a) enum+switchのFSM、(b) Stateパターン、(c) Behavior Tree を検討します。「雑魚は3状態で共通、ボスは10種類以上の行動と優先度割り込みあり」という条件で構成を提案してください。

<details><summary>解答の要点</summary>

雑魚: 共通の3状態FSM(enum+switch)を1つ書き、パラメータ([Type Object](/game/patterns/type-object-and-sandbox.html))で個性を出す——30種にクラス階層やBTは過剰。ボス: [BT](/game/patterns/behavior-tree-and-blackboard.html)(優先度と割り込みの仕様に一致)+実行中の動作は小さなFSM。**「全部同じ仕組みに統一」しないのが正解**という点が本問の狙い。
</details>

## 問5. デバッグ問題

Pub/Subバス導入後、「アイテム取得イベントで所持数UIが更新されるはずが、たまに1個ズレる」報告。調査手順を3ステップで書いてください。

<details><summary>解答の要点</summary>

(1) イベントに積んだ値の確認: 発行時に「取得後の総数」ではなく「取得数」を積み、購読側が古い状態と合算していないか(遅延配送では**必要な値を全部積む**鉄則 → [Event Queue](/game/patterns/event-queue-and-pubsub.html))。(2) 二重購読の確認: 画面の開閉で購読が重複していないか([Observer](/design/patterns/observer.html)の多重実行)。(3) 配送タイミングの確認: UI更新がイベント処理より先に走るフレーム順序になっていないか。——「バスは追跡性が最悪」という欠点への実践的回答として、イベントログ(全発行の記録)を最初に仕込むのも正解。
</details>

## 問6. 説明問題

「StateとStrategyって同じ構造ですよね? なぜ別の名前なんですか?」への回答を3文以内で書いてください。

<details><summary>解答例</summary>

構造(振る舞いオブジェクトへの委譲)は同じで、違いは**変わり方の意味**にある。Stateは「時間とともに自分で遷移する状況」を表し、状態自身が次の状態を決める。Strategyは「外部から与えられたやり方」で、装着後は自分では変わらない——だから設計意図を伝える名前が分かれている([ステートマシン](/game/patterns/state-machines.html))。
</details>

## 問7. 小規模実装問題

以下から1つ選んで実装してください(いずれもsamples/に出発点あり)。

1. <a href="/study/samples/cpp/event_queue.cpp">samples/event_queue.cpp</a>: SE再生要求の同フレーム重複除去を追加
2. <a href="/study/samples/cpp/behavior_tree.cpp">samples/behavior_tree.cpp</a>: 「逃げる」最優先枝の追加
3. <a href="/study/samples/cpp/object_pool.cpp">samples/object_pool.cpp</a>: 世代付きハンドルの追加
4. <a href="/study/samples/cpp/fsm_guard.cpp">samples/fsm_guard.cpp</a>: Search状態の追加

<details><summary>評価基準</summary>

動くことに加えて: (1) 追加機能の変更が既存コードのどこまで波及したか(パターンの分離が効いたか)を一言で説明できる。(2) 「この規模ならパターンなしでも書けたか?」に答えられる。(3) 所有権(誰がオブジェクトの寿命を管理するか)が曖昧になっていない。
</details>

---

関連項目：[Reactive Programming](/game/patterns/reactive-and-message-bus.html) | [この分野の学習ガイド](/game/patterns/) | [関連項目](/languages/cpp/)
