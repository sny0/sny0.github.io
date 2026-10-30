---
title: 設計は「変更の置き場所」を決めること
study:
  source: 設計の手帖
  status: published
  summary: きれいなクラス図よりも、次の変更をどこに書けばよいか分かること。設計の出発点をここに置きます。
  section: reference
  format: article
  domain: design
---

# 設計は「変更の置き場所」を決めること

きれいなクラス図よりも、次の変更をどこに書けばよいか分かること。設計の出発点をここに置きます。

タグ: 責務 / 凝集度 / 結合度 / KISS / YAGNI / DRY

## 設計で決めるのは、責務・境界・依存関係

<div v-pre>

<p>家計簿アプリに「CSV 出力」を追加するとします。金額の集計、CSV の書式、保存先の選択が一つの画面クラスに混ざると、書式の変更だけで画面や計算まで確認が必要になります。計算は <code>ExpenseSummary</code>、変換は <code>CsvExporter</code>、入出力は <code>FileStorage</code> に分けると、それぞれの変更理由が見えてきます。</p><p><strong>責務</strong>は「何を知り、何を決めるか」、<strong>境界</strong>は「どこまでを一まとまりとするか」、<strong>依存</strong>は「何の契約を知っている必要があるか」です。クラス数を増やすこと自体は目標ではありません。小さな処理なら、一つの関数と構造体で十分です。</p>

</div>

## 高凝集・低結合を具体的に考える

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>考え方</th><th>よい兆候</th><th>見直す兆候</th></tr></thead><tbody><tr><td>高凝集</td><td>送料のルールが ShippingPolicy にまとまる</td><td>送料の式が画面・DB・帳票へ散らばる</td></tr><tr><td>低結合</td><td>集計処理が表示形式を知らない</td><td>集計のテストに UI と DB の起動が必要</td></tr><tr><td>情報隠蔽</td><td>利用者が内部の保存形式を知らずに使える</td><td>外部がフィールドを書き換え、整合性を保っている</td></tr></tbody></table></div><p>依存関係をゼロにはできません。変わりやすい詳細を閉じ込め、安定した契約に依存させます。クラスを細分化した結果、少しの変更で十数個のクラスを巡回するなら、その境界は再考する価値があります。</p>

</div>

## まず覚える三つのブレーキ

<div v-pre>

<ul><li><strong>KISS：</strong>現在の要件を満たす、説明しやすい実装にする。短いコードと単純なコードは同じではありません。</li><li><strong>YAGNI：</strong>まだ必要でない拡張点を先回りして大量に作らない。具体的な変更要求が出てから抽象化しても遅くない場合が多くあります。</li><li><strong>DRY：</strong>同じ知識・ルールを重複させない。たまたま似た二つの式を、意味の違いを無視して共通化しない。</li></ul><aside class="article-note"><strong>判断の問い</strong><p>「この設計で、どの変更が簡単になるか。その代わりに、読む手間や運用の負担は何が増えるか」を一文で説明してみましょう。</p></aside>

</div>

## 学習の進め方

<div v-pre>

<p>まず第1〜4章で責務と依存を理解し、第5〜8章で小さな道具を覚えます。次に第9〜11章でアプリ全体を整理し、第12・13章で言語固有の設計へ進みます。最後に命名辞典を横に置いて、小さなアプリを改良してください。構文の基礎を知っている人を想定しています。</p><p>この手帖の注文・価格・画面の例は学習用です。コードは原則 C++20 / C# 12 で表せる抜粋で、各ブロックは独立しています。省略した周辺処理は注記し、外部サービスへ接続するコードは含めていません。</p>

</div>

## 理解度チェック

CSV の列の並びを変えるとき、集計ロジックまで変更する必要がありますか？

## この章の参考資料

- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures) — Microsoft Learn。レイヤーと、Application Core へ向ける依存関係。
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
