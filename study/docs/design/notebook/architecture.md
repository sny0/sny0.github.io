---
title: Layered・Clean・Hexagonal — 境界と依存の向き
study:
  source: 設計の手帖
  status: published
  summary: パターンがクラスの連携を扱うなら、アーキテクチャはシステムの大きな境界を扱います。
  section: reference
  format: article
  domain: design
---

# Layered・Clean・Hexagonal — 境界と依存の向き

パターンがクラスの連携を扱うなら、アーキテクチャはシステムの大きな境界を扱います。

タグ: Layered / Clean Architecture / Hexagonal / Ports and Adapters / Vertical Slice

## Layered：関心事ごとに層を分ける

<div v-pre>

<p>典型例は UI → Application → Data Access です。入口、処理の調整、保存を分けると場所が見つけやすくなります。ただし、Application が DB 実装へ直接依存すると、DB の変更や準備が業務テストに影響します。論理的な層（Layer）と、別サーバーへ配置する単位（Tier）は同義ではありません。</p>

</div>

## Clean：ソースコードの依存を中心へ向ける

<div v-pre>

<p>中心に業務ルールと必要な契約を置き、UI や DB 実装が中心の契約を利用・実装します。実行時には業務処理から DB へ呼び出しても、ソース上の型参照は外側から内側へ向けられます。実行順と依存の向きは別です。</p><div class="dependency-diagram"><div><span>UI</span><b>OrderController</b><small>入力を受け取る</small></div><i>→</i><div class="diagram-core"><span>APPLICATION CORE</span><b>PlaceOrderUseCase</b><small>IOrderRepository を定義</small></div><i>←</i><div><span>INFRASTRUCTURE</span><b>SqlOrderRepository</b><small>契約を実装する</small></div></div><p>図の矢印はソースコード上の依存です。起動時の組み立て場所は、具体実装を知る必要があります。Domain / Application / Infrastructure / Presentation はよく使う区分ですが、フォルダを作るだけでは依存は制限されません。C# はプロジェクト参照、C++ はヘッダーとビルドターゲットの関係を確認します。</p>

</div>

## Hexagonal：入口と出口を Port として扱う

<div v-pre>

<p>ユースケースを呼ぶ入口と、保存・通知など外へ求める出口を Port とし、UI や SQL を Adapter として取り付けます。Clean、Onion、Hexagonal は背景や表現に違いがありますが、中心を技術的な詳細から守るという共通点があります。厳密に同一の設計手法ではありません。</p>

</div>

## Vertical Slice：変更される機能の単位でまとめる

<div v-pre>

<p><code>Orders/Create</code> に入力・処理・結果をまとめ、<code>Orders/List</code> と分けるような構成です。層ごとに多数のフォルダを横断せず、機能の変更を近くに置けます。共有すべき業務ルールまでコピーしないことが大切です。Slice の内側でレイヤーやドメインモデルを使うこともできます。</p><aside class="article-note"><strong>最初の規模の目安</strong><p>小さなツールは関数と数個の型から始めます。外部 I/O と計算を分けるだけでも効果があります。マイクロサービスや多数のプロジェクトへ分割することは、独立した判断です。</p></aside>

</div>

## 理解度チェック

DB を取り替えるとき、どのプロジェクトやヘッダーまで変更が広がりますか？

## この章の参考資料

- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures) — Microsoft Learn。レイヤーと、Application Core へ向ける依存関係。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
