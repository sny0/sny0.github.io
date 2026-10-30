---
title: 通知と疎結合 — Observer・Event・Mediator
study:
  source: 設計の手帖
  status: published
  summary: 通知は直接の結び付きを減らします。その代わり、呼び出しの流れと寿命を見えるようにする必要があります。
  section: reference
  format: article
  domain: design
---

# 通知と疎結合 — Observer・Event・Mediator

通知は直接の結び付きを減らします。その代わり、呼び出しの流れと寿命を見えるようにする必要があります。

タグ: Observer / Event / Mediator / 購読 / イベント駆動

## Observer：変化を購読者へ知らせる

<div v-pre>

<p>在庫が変わるたびに一覧・通知・監査へ知らせたいとき、発行側は購読者の詳細を知らずに通知できます。<code>InventoryChanged</code>、<code>InventoryObserver</code>、<code>OnInventoryChanged</code> といった名前が手がかりです。</p><p>C# では event とデリゲートで表せます。C++ ではコールバックや接続オブジェクトで表すことがあります。解除忘れがあると、C++ では破棄後の対象を参照し、C# では長寿命の発行側が購読者を保持し続けることがあります。</p>

</div>

## イベントは「起きた事実」、コマンドは「実行してほしい要求」

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>種類</th><th>名前の例</th><th>考えること</th></tr></thead><tbody><tr><td>コマンド</td><td>PlaceOrder / CancelOrderCommand</td><td>誰が受け付け、成功・失敗を誰へ返すか</td></tr><tr><td>イベント</td><td>OrderPlaced / PaymentFailed</td><td>いつ確定した事実か、誰へ何回届くか</td></tr></tbody></table></div><p>同じプロセス内で即時に通知する仕組みと、メッセージブローカー経由の非同期配信は、失敗の扱いが異なります。「イベントだから非同期」「必ず一回届く」とは限りません。外部配信では重複、順序、再試行、トランザクションとの境界を設計します。</p>

</div>

## Mediator：調整の窓口を作る

<div v-pre>

<p>画面部品同士が多数の相手を知る代わりに、<code>DialogMediator</code> が調整します。要求を Handler へ振り分けるメディエーターライブラリもあります。ただし、窓口が何でも知る巨大な司令塔になれば別の問題を作ります。Handler を増やす前に、普通のメソッド呼び出しで十分か検討します。</p>

</div>

## 導入前に決めておく四つのこと

<div v-pre>

<ul><li>発行元と購読者の寿命。誰がいつ購読を解除するか。</li><li>購読者の例外を、発行元へ返すか、記録して継続するか。</li><li>同期か非同期か。順序やスレッドの前提はあるか。</li><li>外部配信なら、同じ通知を二回処理しても壊れないか。</li></ul><aside class="article-note"><strong>小さく始める</strong><p>一対一の処理なら、直接呼び出す方が追いやすい場合があります。イベントは依存を消すのではなく、通知の契約へ移す方法です。</p></aside>

</div>

## 理解度チェック

画面を閉じたあとも、長寿命サービスの event に登録した画面が残りませんか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。
- [CQRS](https://martinfowler.com/bliki/CQRS.html) — Martin Fowler。更新用と参照用のモデルを分ける考え方と、複雑性の注意点。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
