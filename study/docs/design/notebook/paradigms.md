---
title: 関数型・データ指向・CQRS — クラス以外の視点
study:
  source: 設計の手帖
  status: published
  summary: 設計の知識が増えるほど、どこでもクラス階層を使う必要はなくなります。変わるものと制約に合う方法を選びます。
  section: reference
  format: article
  domain: design
---

# 関数型・データ指向・CQRS — クラス以外の視点

設計の知識が増えるほど、どこでもクラス階層を使う必要はなくなります。変わるものと制約に合う方法を選びます。

タグ: 関数型 / 純粋関数 / Data-Oriented / ECS / CQRS / モノリス

## 関数型の発想：計算と副作用を分ける

<div v-pre>

<p>入力が同じなら同じ結果を返し、外部状態を変えない関数を純粋関数と呼びます。割引計算は純粋な関数、DB 保存や時刻取得は外側へ寄せると、計算のテストが簡単になります。C++ も C# も、オブジェクト指向とこの考え方を組み合わせられます。</p><p>たとえば <code>CalculateTotal(lines, policy)</code> が計算結果を返し、<code>PlaceOrderUseCase</code> が取得と保存を担当します。関数型とはすべてを LINQ やラムダで一行にすることではありません。副作用と状態変更を明示する視点が大切です。</p>

</div>

## データ指向：処理とメモリの並びから考える

<div v-pre>

<p>大量の座標を毎フレーム更新するなら、オブジェクトごとの美しい階層より、連続したデータをまとめて処理する構造が重要になる場合があります。AoS（構造体の配列）と SoA（項目ごとの配列）は、その代表的な比較軸です。どちらが速いかはアクセスの仕方や環境で変わるため、計測します。</p><p><strong>ECS</strong> は Entity を識別子、Component をデータ、System を処理として組み立てる代表的な方式です。用語や実装はフレームワークごとに違い、ECS とデータ指向設計は同義ではありません。少数の注文を扱う業務アプリへ、性能上の理由なく導入する必要はありません。</p>

</div>

## CQRS：更新と参照でモデルを分ける

<div v-pre>

<p>注文の更新には厳しい不変条件が必要でも、一覧には顧客名と合計だけあれば足りるかもしれません。更新モデルと読み取りモデルを分けると、それぞれを目的に合わせられます。DB を必ず二つにする、イベントソーシングを必須にする、といった意味ではありません。</p><p>別の読み取りストアへ非同期反映するなら、表示に反映されるまでの遅れと、運用・再構築の複雑さが増えます。まず読み取り専用の Query と DTO を分ける程度で足りるかを検討します。</p>

</div>

## モジュラーモノリスとマイクロサービス

<div v-pre>

<p>一つの配置単位の中でも、モジュール間の公開 API や依存を整理できます。マイクロサービスへ分けると独立した配置やスケールが可能になりますが、ネットワーク障害、データ整合性、監視などの設計が増えます。クラス分割の延長だけで選ばず、チームと運用の要件で判断します。</p><aside class="article-note"><strong>比較するときの軸</strong><p>変更頻度、データ量、性能、チームの境界、障害の扱い、運用負担。どの制約を解くための方式かを先に言葉にします。</p></aside>

</div>

## 理解度チェック

その抽象化は変更のためですか、性能のためですか。必要性をどう確かめますか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。
- [CQRS](https://martinfowler.com/bliki/CQRS.html) — Martin Fowler。更新用と参照用のモデルを分ける考え方と、複雑性の注意点。
- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures) — Microsoft Learn。レイヤーと、Application Core へ向ける依存関係。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
