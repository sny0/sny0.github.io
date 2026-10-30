---
title: C# — GC・Dispose・非同期処理の境界
study:
  source: 設計の手帖
  status: published
  summary: GC があっても、ファイル・接続・購読の寿命は設計が必要です。非同期処理も、完了・失敗・キャンセルを契約に含めます。
  section: reference
  format: article
  domain: design
---

# C# — GC・Dispose・非同期処理の境界

GC があっても、ファイル・接続・購読の寿命は設計が必要です。非同期処理も、完了・失敗・キャンセルを契約に含めます。

タグ: C# / IDisposable / async / await / record / DI / CancellationToken

## GC と Dispose は別の役割

<div v-pre>

<p>GC は到達不能なマネージドオブジェクトのメモリを回収します。ファイルや接続を必要なタイミングで閉じたい場合は <code>IDisposable</code> と using を使います。非同期の解放には <code>IAsyncDisposable</code> と await using が候補です。借りた部品を勝手に Dispose しないよう、所有者を決めます。</p><p>finalizer は C++ のデストラクタと同じ時点で走る仕組みではありません。通常のリソース解放を finalizer 任せにせず、標準の管理型や SafeHandle、Dispose の契約を活用します。独自 finalizer は直接のアンマネージド所有など必要性を確認します。</p>

</div>

## async は「新しいスレッド」の意味ではない

<div v-pre>

<p>await は待機中に呼び出し側へ制御を返せる仕組みです。I/O 待ちをスレッドで塞がず扱えますが、CPU の重い計算を自動的に並列化しません。<code>.Result</code> や <code>.Wait()</code> の多用はブロックや状況によってデッドロックにつながるため、非同期処理は呼び出し側まで自然につなげます。</p>

</div>

### キャンセル可能なファイル読み取り / C# の独立した定義

::: code-group

```cpp [C++]
// この例に対応する C++20 標準の汎用非同期ファイル API はありません。
// 利用する OS / ライブラリの非同期 API に合わせて設計します。
//
// C++20 coroutine は処理を中断・再開する言語機能です。
// Task 型、スケジューラ、キャンセルの仕組みは別途必要です。
// std::async も C# の async / await と同一の仕組みではありません。
```

```csharp [C#]
using System.IO;
using System.Threading;
using System.Threading.Tasks;

public sealed class NoteReader
{
    public async Task<string> LoadAsync(
        string path, CancellationToken cancellationToken)
    {
        return await File.ReadAllTextAsync(path, cancellationToken);
    }
}
```

:::

## 完了・失敗・中断を、呼び出し側が扱えるようにする

<div v-pre>

<ul><li>戻り値は通常 Task / Task&lt;T&gt; を使い、呼び出し側が await して例外や完了を観察する。async void は通常、イベントハンドラーなどに限定する。</li><li>CancellationToken を下位の処理へ渡し、キャンセルを協調的に扱う。トークンを持つだけで処理が強制停止するわけではない。</li><li>破棄した画面へ非同期の結果が戻る場合を考える。キャンセル、対象の寿命、UI スレッドへの反映はフレームワークに合わせる。</li></ul>

</div>

## DI の寿命と、record の意味

<div v-pre>

<p><strong>Transient</strong> は解決ごと、<strong>Scoped</strong> はスコープごと、<strong>Singleton</strong> はコンテナ内で共有する寿命です。長寿命の部品が短寿命の部品を捕まえ続ける captive dependency に注意します。特に Singleton に Scoped な DbContext を直接保持させる設計を避け、必要なスコープを明示します。</p><p><code>record</code> は値に基づく等価性などを生成しますが、参照する List の中身まで不変にはしません。<code>readonly</code> フィールドも、参照先オブジェクトの変更を禁じるとは限りません。不変性はオブジェクトグラフまで見て設計します。</p>

</div>

## 理解度チェック

非同期処理の例外とキャンセル結果を、最終的に誰が受け取りますか？

## この章の参考資料

- [Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose) — Microsoft Learn。IDisposable、所有するリソースの解放、継承時の Dispose。
- [Task asynchronous programming model](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model) — Microsoft Learn。async / await と Task の基本。
- [.NET の依存関係の挿入](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/overview) — Microsoft Learn。DI の仕組みと、Transient・Scoped・Singleton のライフタイム。
- [Value Object](https://martinfowler.com/bliki/ValueObject.html) — Martin Fowler。値によって等しさを判断するオブジェクト。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
