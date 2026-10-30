---
title: MVC・MVP・MVVM — 画面の責務を分ける
study:
  source: 設計の手帖
  status: published
  summary: 画面のイベントハンドラーに全部書く状態から抜け出すために、入力・表示・状態の置き場所を考えます。
  section: reference
  format: article
  domain: design
---

# MVC・MVP・MVVM — 画面の責務を分ける

画面のイベントハンドラーに全部書く状態から抜け出すために、入力・表示・状態の置き場所を考えます。

タグ: MVC / MVP / MVVM / Controller / Presenter / ViewModel

## 三つの構成を比較する

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>構成</th><th>入力や表示の調整役</th><th>よくある名前</th></tr></thead><tbody><tr><td>MVC</td><td>Controller が入力を受け、Model を操作し View へ渡す</td><td>OrderController / Order / OrderView</td></tr><tr><td>MVP</td><td>Presenter が View の契約を通じて表示を調整する</td><td>OrderPresenter / IOrderView</td></tr><tr><td>MVVM</td><td>ViewModel が表示状態・操作を公開し、View がバインドする</td><td>OrderViewModel / OrderView</td></tr></tbody></table></div><p>MVC は Web フレームワークとデスクトップ UI で流れが異なることがあります。上の表は役割を理解するための概略です。採用するフレームワークの責務分担も合わせて確認します。Model は DB のテーブルだけを意味しません。</p>

</div>

## MVVM の Model と ViewModel

<div v-pre>

<p><code>Order</code> は業務上の注文、<code>OrderViewModel</code> は画面に必要な選択中の注文・読込中フラグ・エラーメッセージを持つ、と分けられます。ViewModel から UI コントロールを直接操作すると、表示技術へ結び付きやすくなります。</p><p>C# の XAML 系 UI では <code>INotifyPropertyChanged</code> や <code>ICommand</code> がよく現れます。<code>ObservableObject</code> や <code>RelayCommand</code> はライブラリで提供される典型名で、C# 言語の予約語ではありません。</p>

</div>

## 言語と設計方式は一対一ではない

<div v-pre>

<p>MVVM は C# 専用ではなく、C++ の UI フレームワークでも似た分離を実現できます。一方、コンソールの小さな変換ツールに ViewModel を導入しても、表示状態がほとんどなければ恩恵は限定的です。UI の規模と、バインディングなどフレームワークの仕組みに合わせます。</p>

</div>

## Controller を薄く保つ理由

<div v-pre>

<p>Controller は入力を解釈し、ユースケースを呼び、結果を HTTP 応答などへ変換します。送料・割引・在庫の業務判断がすべて Controller に入ると、別の入口から再利用しづらくなります。一方、Application Service に全判断を移すだけでも巨大化は解決しません。ルールを適切なモデルへ寄せます。</p><aside class="article-note"><strong>よくある落とし穴</strong><p>ViewModel を API の DTO と共用すると、画面専用の状態が通信の契約へ漏れます。偶然同じ項目でも、変更理由が違うかを確認しましょう。</p></aside>

</div>

## 理解度チェック

画面を Web からデスクトップへ変える場合、残せる業務ロジックはどれですか？

## この章の参考資料

- [Data binding and MVVM](https://learn.microsoft.com/en-us/windows/apps/develop/data-binding/data-binding-and-mvvm) — Microsoft Learn。View・ViewModel・Model の分離と、データバインディング。
- [Commanding overview — WPF](https://learn.microsoft.com/dotnet/desktop/wpf/advanced/commanding-overview) — Microsoft Learn。操作の意味を入力装置から切り離すコマンド。
- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures) — Microsoft Learn。レイヤーと、Application Core へ向ける依存関係。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
