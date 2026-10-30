---
title: 生成を整理する — Factory と Builder
study:
  source: 設計の手帖
  status: published
  summary: 生成手順や実装選択が呼び出す側へ散らばったとき、作り方を名前のある場所へ集めます。
  section: reference
  format: article
  domain: design
---

# 生成を整理する — Factory と Builder

生成手順や実装選択が呼び出す側へ散らばったとき、作り方を名前のある場所へ集めます。

タグ: Factory / Builder / Abstract Factory / Singleton

## Factory：作る判断をまとめる

<div v-pre>

<p><code>ParserFactory.Create(format)</code> は、入力形式に応じて CsvParser / JsonParser を選びます。単純なファクトリ関数でも有効です。GoF の <strong>Factory Method</strong> は派生クラスで生成を差し替えるパターンで、名前に Factory が付く関数すべてを指すわけではありません。</p><p><strong>Abstract Factory</strong> は関連する製品の一式を作ります。例えばテーマごとの Button と Dialog を整合した組で生成する <code>WidgetFactory</code> です。単一のクラスを生成するだけなら、一式を作る仕組みは不要です。</p><p>次の accepts / Accepts は仕組みを短く示す仮の判定です。実用の CSV パーサーではなく、引用符・改行・列の解析は実装していません。</p>

</div>

### 単純なファクトリ関数 / GoF Factory Method とは区別する

::: code-group

```cpp [C++]
#include <memory>
#include <stdexcept>
#include <string_view>

struct Parser {
    virtual ~Parser() = default;
    virtual bool accepts(std::string_view input) const = 0;
};
struct CsvParser final : Parser {
    bool accepts(std::string_view s) const override {
        return s.find(",") != std::string_view::npos;
    }
};
std::unique_ptr<Parser> makeParser(std::string_view format) {
    if (format == "csv") return std::make_unique<CsvParser>();
    throw std::invalid_argument("unsupported format");
}
```

```csharp [C#]
using System;

public interface IParser
{
    bool Accepts(string input);
}
public sealed class CsvParser : IParser
{
    public bool Accepts(string input) => input.Contains(",");
}
public static class ParserFactory
{
    public static IParser Create(string format) => format switch
    {
        "csv" => new CsvParser(),
        _ => throw new ArgumentException("unsupported format")
    };
}
```

:::

## Builder：組み立ての手順を表現する

<div v-pre>

<p>引数が多いレポートを <code>ReportBuilder.WithTitle(...).AddSection(...).Build()</code> と段階的に作ります。最後の Build で必要条件を検証すれば、中途半端な完成品を外へ出さずに済みます。Builder 自体は組み立て途中の状態を持ち得ます。</p><div class="table-scroll"><table><thead><tr><th>困りごと</th><th>まず考える選択</th></tr></thead><tbody><tr><td>同じ初期化処理が散在</td><td>ファクトリ関数</td></tr><tr><td>実行時に実装を選びたい</td><td>Factory と共通契約</td></tr><tr><td>関連する製品の組を差し替える</td><td>Abstract Factory</td></tr><tr><td>任意項目が多く、組み立てを読みやすくしたい</td><td>Builder / 設定オブジェクト</td></tr><tr><td>設定が二、三項目だけ</td><td>普通のコンストラクタ / C# の初期化子</td></tr></tbody></table></div>

</div>

## C++ の生成結果は所有権も表す

<div v-pre>

<p>C++ では値で返せるなら値を返し、ポリモーフィックな単独所有なら <code>std::unique_ptr&lt;Base&gt;</code> を候補にします。生ポインタを返して「誰が delete するか」を暗黙にしないこと。C# では生成した IDisposable を誰が破棄するかを別途決めます。</p>

</div>

## Singleton：一つであることと、どこからでも触れること

<div v-pre>

<p>Singleton はインスタンスを一つへ制限し、アクセス点を提供するパターンです。しかしグローバルな可変状態は依存を隠し、テストを互いに影響させます。多くの場合、入口で一つ生成して必要な利用者へ渡すだけで足ります。DI の Singleton ライフタイムも、GoF Singleton の実装とは区別します。</p><aside class="article-note"><strong>注意</strong><p>スレッド安全な初期化ができても、そのオブジェクトのメソッドや可変データまでスレッド安全になるわけではありません。</p></aside>

</div>

## 理解度チェック

単純なコンストラクタから Builder へ変える、具体的な理由がありますか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。
- [.NET の依存関係の挿入](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/overview) — Microsoft Learn。DI の仕組みと、Transient・Scoped・Singleton のライフタイム。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
