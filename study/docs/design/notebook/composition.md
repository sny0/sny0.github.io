---
title: 継承より合成、そして依存性の注入
study:
  source: 設計の手帖
  status: published
  summary: 「何の一種か」で階層を増やす代わりに、「どんな機能を使うか」で組み立てる方法を学びます。
  section: reference
  format: article
  domain: design
---

# 継承より合成、そして依存性の注入

「何の一種か」で階層を増やす代わりに、「どんな機能を使うか」で組み立てる方法を学びます。

タグ: 合成 / DI / interface / 所有権 / 委譲

## 合成は部品を持ち、委譲は部品に仕事を任せる

<div v-pre>

<p><code>LoggingSqlOrderService</code>、<code>CachedLoggingSqlOrderService</code> と継承を重ねると、機能の組み合わせで型が増えます。保存、ログ、キャッシュを別の部品にすると、必要な組み合わせを作れます。合成にも配線の複雑さはあるため、変わらない部分まで分ける必要はありません。</p>

</div>

## コンストラクタで依存を見せる

<div v-pre>

<p>以下は外部から通知先を渡す例です。C++ の参照は所有しないので、通知先は Checkout より長く生存させます。C# の参照保持ではメモリの到達可能性を保てますが、Dispose 済みかどうかは別問題です。</p>

</div>

### コンストラクタ注入 / 呼び出す側が部品を組み立てる

::: code-group

```cpp [C++]
#include <string_view>

struct Notifier {
    virtual ~Notifier() = default;
    virtual void send(std::string_view message) = 0;
};

class Checkout {
    Notifier& notifier_; // 非所有。呼び出し側が寿命を保証
public:
    explicit Checkout(Notifier& n) : notifier_(n) {}
    void complete() { notifier_.send("Order completed"); }
};
```

```csharp [C#]
public interface INotifier
{
    void Send(string message);
}

public sealed class Checkout
{
    private readonly INotifier _notifier;

    public Checkout(INotifier notifier)
    {
        _notifier = notifier;
    }

    public void Complete() => _notifier.Send("Order completed");
}
```

:::

## 組み立ては入口へ集める

<div v-pre>

<p>main / Program.cs などで実装を選び、部品を接続します。この場所を <strong>Composition Root</strong> と呼びます。業務ロジックの途中でコンテナから何でも取得すると、必要な依存が見えなくなります。これは Service Locator に近い使い方です。</p><p>インターフェースは、実装の切り替え・外部 I/O の境界・独立した契約などに価値があります。すべてのクラスへ同名の interface を作ることから始めると、追うファイルだけ増えてしまいます。</p>

</div>

## テストでは同じ契約の別実装を渡す

<div v-pre>

<p>メールを送る <code>SmtpNotifier</code> の代わりに、メッセージを記録する <code>RecordingNotifier</code> を渡すと、ネットワークなしで通知の内容を確かめられます。実装の private な呼び出し順ではなく、「注文が確定したら通知される」という観察可能な振る舞いを検証します。</p>

</div>

## 理解度チェック

Checkout が所有する部品と、借りる部品の寿命を図にできますか？

## この章の参考資料

- [.NET の依存関係の挿入](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/overview) — Microsoft Learn。DI の仕組みと、Transient・Scoped・Singleton のライフタイム。
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
