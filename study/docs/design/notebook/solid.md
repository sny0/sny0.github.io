---
title: SOLID を、変更の例で理解する
study:
  source: 設計の手帖
  status: published
  summary: 五つの原則は、コードの問題を見つけるための観点です。すべてのクラスへ機械的に適用する規則ではありません。
  section: reference
  format: article
  domain: design
---

# SOLID を、変更の例で理解する

五つの原則は、コードの問題を見つけるための観点です。すべてのクラスへ機械的に適用する規則ではありません。

タグ: SOLID / SRP / OCP / LSP / ISP / DIP

## S — 単一責任の原則

<div v-pre>

<p>請求書の金額計算、PDF 描画、メール送信は、それぞれ別の理由で変わります。<code>Invoice</code>、<code>InvoicePdfRenderer</code>、<code>InvoiceSender</code> に分けると変更を閉じ込めやすくなります。「一つのメソッドしか持たせない」という意味ではなく、同じ理由で変わるものをまとめる視点です。</p>

</div>

## O — 開放閉鎖の原則

<div v-pre>

<p>配送会社を追加するたびに巨大な switch を書き換えているなら、<code>ShippingPolicy</code> を差し替える設計が候補です。ただし、選択肢が二つで固定なら switch の方が読みやすいこともあります。あらゆる変更に閉じることはできないので、実際に増える軸を選びます。</p>

</div>

## L — リスコフの置換原則

<div v-pre>

<p>基底の <code>Document.Save()</code> が保存できる契約なのに、<code>ReadOnlyDocument</code> だけが常に未対応例外を投げるなら、利用者は実体の型を調べる必要が出ます。読み取り契約と書き込み契約を分ける方が自然です。派生側は、事前条件を強めたり、保証を弱めたりしてはいけません。</p>

</div>

## I — インターフェース分離の原則

<div v-pre>

<p><code>IMachine</code> に Print / Scan / Fax をまとめると、プリンター専用実装に空メソッドが生まれます。利用側が必要とする <code>IPrinter</code> / <code>IScanner</code> に分けます。一メソッドずつに分割することが目的ではなく、不要な契約への依存をなくすことが目的です。</p>

</div>

## D — 依存性逆転の原則

<div v-pre>

<p>注文確定のルールが SQL の型を直接知る代わりに、必要な <code>IOrderRepository</code> の契約を定義し、SQL 実装がその契約に従います。中心のルールが外部の都合に引きずられにくくなります。単に interface を作るだけでなく、<strong>契約をどの層が所有するか</strong>が要点です。</p><div class="table-scroll"><table><thead><tr><th>混同しやすい言葉</th><th>意味</th></tr></thead><tbody><tr><td>DIP</td><td>依存の向きを設計する原則</td></tr><tr><td>DI</td><td>必要な部品を外部から渡す方法</td></tr><tr><td>DI コンテナ</td><td>生成・組み立て・ライフタイム管理を自動化する道具</td></tr></tbody></table></div><aside class="article-note"><strong>実務での使い方</strong><p>レビューでは「SOLID 違反です」で止めず、「配送方法を増やすたびに既存ロジックを変更するので、この部分を分離するとテストを保ちやすい」と変更の例で説明します。</p></aside>

</div>

## 理解度チェック

DI コンテナなしでも DIP を実現できる理由を説明できますか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。
- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures) — Microsoft Learn。レイヤーと、Application Core へ向ける依存関係。
- [.NET の依存関係の挿入](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/overview) — Microsoft Learn。DI の仕組みと、Transient・Scoped・Singleton のライフタイム。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
