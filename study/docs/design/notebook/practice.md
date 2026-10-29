---
title: "小さな注文アプリで、設計を一巡する"
study:
  source: "設計の手帖"
  kind: "本文"
  status: "既存原稿"
  summary: "一度で理想の構造を作るより、変更のたびに一つの問題を見つけ、改善の効果を確かめます。"
---

# 小さな注文アプリで、設計を一巡する

一度で理想の構造を作るより、変更のたびに一つの問題を見つけ、改善の効果を確かめます。

05 · 視野を広げ、使ってみる / 実践課題とレビューの視点 / Practice with one small change / 実践 / 15分

タグ: リファクタリング / テスト / 設計レビュー / 実践 / Fake / Stub / Mock

## 題材：送料付きの注文を確定する

<div v-pre>

<p>要件は「明細から小計を出す」「5,000円以上なら送料無料、それ以外は500円」「注文を保存する」「結果を表示する」。まず int で円の整数を表す小さな関数から始めます。実際の金額設計では通貨・丸め・桁あふれを別途検討してください。</p><ul><li><strong>Step 1：</strong>送料計算を UI や保存から切り離す。0円、4,999円、5,000円、複数明細を試す。負の明細を許すかも決める。</li><li><strong>Step 2：</strong>会員送料を追加する。方式が増える必要があるなら Strategy / Policy を導入する。</li><li><strong>Step 3：</strong>保存を IOrderRepository の契約で分ける。テストでは InMemoryOrderRepository を渡す。</li><li><strong>Step 4：</strong>Order に明細変更や確定のルールを置く。PlaceOrderUseCase は取得・操作・保存を調整する。</li><li><strong>Step 5：</strong>画面には OrderSummaryDto や ViewModel を渡す。保存実装や画面の変更が計算へ波及しないか確かめる。</li></ul>

</div>

## 依存関係を読む練習

<div v-pre>

<div class="case-flow"><span>OrderController</span><i>↓ 呼び出す</i><span>PlaceOrderUseCase</span><i>↓ 業務を操作する</i><span>Order + ShippingPolicy</span><i>↓ 契約を通じて保存する</i><span>IOrderRepository</span><small>実装：SqlOrderRepository / InMemoryOrderRepository</small></div><p>この図は処理の流れです。ソースの依存は第9章の図と合わせて確認します。全クラスを初日に作る必要はありません。変更の痛みが見えたところで分け、分けた理由を記録すると学びになります。</p>

</div>

## テストダブルを目的で使い分ける

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>名前</th><th>目的</th><th>例</th></tr></thead><tbody><tr><td>Stub</td><td>決まった応答を返す</td><td>常に固定時刻を返す時計</td></tr><tr><td>Fake</td><td>軽量だが動く代替実装</td><td>インメモリの注文保存</td></tr><tr><td>Spy</td><td>呼び出された内容を記録する</td><td>送信メッセージを保存する通知先</td></tr><tr><td>Mock</td><td>期待したやりとりを検証する</td><td>特定条件で決済が一回だけ要求されることを検証</td></tr></tbody></table></div><p>名称の細部はライブラリで異なることがあります。まず必要なのが「結果の検証」か「外部とのやりとりの検証」かを決めます。内部の細かな手順にテストを結び付けると、振る舞いを変えないリファクタリングでも壊れやすくなります。</p>

</div>

## リファクタリングとレビュー

<div v-pre>

<p>リファクタリングは、外から観察できる振る舞いを保って構造を改善することです。最初に現在の振る舞いを確かめ、小さく変え、その都度確認します。業務仕様の変更は、構造の整理と区別して差分を読めるようにします。</p><ul><li>変更理由はまとまっているか。無関係な理由で同じクラスが頻繁に変わらないか。</li><li>入力の不正、外部 I/O の失敗、キャンセル、再試行をどこが扱うか。</li><li>所有者と寿命を説明できるか。共有状態のスレッド安全性は明確か。</li><li>抽象化を一つ減らしても、意図は十分に伝わるか。</li><li>今回の変更を足したとき、既存の振る舞いを確かめる方法があるか。</li></ul>

</div>

## 復習の問い

<div v-pre>

<p>「送料の変更」「DB の変更」「画面の変更」「非同期化」の四つを想定し、それぞれ変更するファイルと、影響を受けないはずのテストを書き出してください。設計に唯一の正解はなくても、変更の影響と負担は具体的に比べられます。</p><aside class="article-note"><strong>次の一歩</strong><p>辞典で知らない語尾を一つ選び、自分のコードからその役割を探します。見当たらなければ、無理に追加せず、必要になる変更の例を考えてみましょう。</p></aside>

</div>

## 理解度チェック

今回の設計で簡単になった変更と、増えた手間を、それぞれ一つ挙げられますか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。
- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures) — Microsoft Learn。レイヤーと、Application Core へ向ける依存関係。
- [Repository](https://martinfowler.com/eaaCatalog/repository.html) — Martin Fowler。ドメインオブジェクトの集合として永続化を扱うパターン。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
