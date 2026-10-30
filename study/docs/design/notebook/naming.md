---
title: クラス名を、役割の説明書にする
study:
  source: 設計の手帖
  status: published
  summary: 語尾を覚えるだけでなく、「何に対して、どんな責任を持つか」が伝わる名前を選びます。
  section: reference
  format: article
  domain: design
---

# クラス名を、役割の説明書にする

語尾を覚えるだけでなく、「何に対して、どんな責任を持つか」が伝わる名前を選びます。

タグ: 命名 / Service / Manager / Handler / Repository / Factory / DTO

## 対象の言葉 ＋ 役割の言葉

<div v-pre>

<p><code>OrderRepository</code> は注文の取得・保存、<code>OrderValidator</code> は注文の検証、<code>OrderSummaryDto</code> は注文の概要を運ぶ形です。同じ Order でも語尾が境界を説明します。短い抽象名より、業務の語彙を使った具体名を優先します。</p><p><code>Manager</code>、<code>Service</code>、<code>Helper</code> は禁止語ではありません。ただし「何を管理するのか」「どんなサービスか」を一文で言えないなら、責務が混ざっている兆候です。<code>DataManager</code> より <code>CsvImporter</code>、<code>UserHelper</code> より <code>PasswordHasher</code> の方が目的を読めます。</p>

</div>

## 似た語尾の違いをつかむ

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>名前</th><th>主に表す責務</th><th>混同しやすいもの</th></tr></thead><tbody><tr><td>Factory / Builder</td><td>生成の選択 / 段階的な組み立て</td><td>普通のコンストラクタで足りるか</td></tr><tr><td>Repository / QueryService</td><td>ドメインの集合 / 読み取り結果の取得</td><td>保存テーブルごとの DAO</td></tr><tr><td>Strategy / Policy</td><td>差し替える方法 / 判断ルール</td><td>状態を表す State</td></tr><tr><td>Controller / ViewModel</td><td>入力の入口 / 表示の状態と操作</td><td>業務モデルそのもの</td></tr><tr><td>Adapter / Mapper</td><td>外部契約の適合 / データ表現の変換</td><td>同じ契約を包む Decorator</td></tr><tr><td>Handler / Processor</td><td>要求や通知の処理 / 一連の処理</td><td>巨大な汎用サービス</td></tr></tbody></table></div>

</div>

## C++ と C# の命名慣例

<div v-pre>

<p>C# では型名は PascalCase、interface は <code>IOrderRepository</code> のような I 接頭辞が一般的です。非同期メソッドの Async 語尾もよく使われます。C++ では標準ライブラリの snake_case と、プロジェクト固有の PascalCase などが併存します。I 接頭辞は言語標準の規則ではありません。</p><p>この手帖の C++ の型名は C# と比較しやすいよう主に PascalCase を使います。既存コードを読む・直す際は、プロジェクトの一貫性を優先してください。命名の統一は、責務の整合性を確かめたあとに行います。</p>

</div>

## 辞典の使い方

<div v-pre>

<p>クラス名辞典では、よく出る名前を「何を担当するか」「具体例」「気を付ける点」で比較できます。名前は設計の証拠ではなく手がかりです。実際の公開 API と依存関係を見て確認します。</p><a class="inline-cta" href="/study/design/naming.html">クラス名辞典を開く <span>→</span></a>

</div>

## 理解度チェック

OrderManager の責務を、より具体的な名前三つへ分けるなら何になりますか？

## この章の参考資料

- [Names of Classes, Structs, and Interfaces](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/names-of-classes-structs-and-interfaces) — Microsoft Learn。.NET の型名、I 接頭辞、Exception・EventArgs などの慣例。既存チームの規約も確認します。
- [Data Transfer Object](https://martinfowler.com/eaaCatalog/dataTransferObject.html) — Martin Fowler。境界を越えてデータを運ぶためのオブジェクト。
- [Repository](https://martinfowler.com/eaaCatalog/repository.html) — Martin Fowler。ドメインオブジェクトの集合として永続化を扱うパターン。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
