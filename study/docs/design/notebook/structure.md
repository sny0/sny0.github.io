---
title: "つなぎ方を整える — Adapter・Decorator・Facade"
study:
  source: "設計の手帖"
  kind: "本文"
  status: "既存原稿"
  summary: "外部の API を合わせる、処理を包む、入口を簡単にする。どれも「ラッパー」ですが、目的が違います。"
---

# つなぎ方を整える — Adapter・Decorator・Facade

外部の API を合わせる、処理を包む、入口を簡単にする。どれも「ラッパー」ですが、目的が違います。

02 · パターンを道具にする / Adapter・Decorator・Facade / Shape the boundaries / 基礎 / 9分

タグ: Adapter / Decorator / Facade / Proxy / Bridge / Composite

## Adapter：契約の違いを翻訳する

<div v-pre>

<p>外部決済 SDK が <code>ChargeInCents()</code> を提供し、アプリは <code>IPaymentGateway.Pay(Money)</code> を必要とするなら、<code>PaymentSdkAdapter</code> が単位やエラーを翻訳します。外部 SDK の型を業務の奥まで伝播させない境界にもなります。</p>

</div>

## Decorator：同じ契約のまま機能を足す

<div v-pre>

<p><code>LoggingOrderRepository</code> が <code>IOrderRepository</code> を実装し、内部の本体を呼ぶ前後にログを足します。利用者は同じ契約で使えます。キャッシュとログの重ね順で観測結果が変わるため、ラップ順も設計の一部です。</p><p>継承を使った見た目でも、コンストラクタに同じ契約の部品を受け取って委譲するのが典型です。C# の属性（Attribute）や TypeScript のデコレーター構文と、設計パターンの Decorator は区別してください。</p><p>以下の例では、委譲先が例外を投げると成功ログは出ません。ログで本文や秘密情報を無条件に出力せず、失敗ログや再試行は別途設計します。</p>

</div>

### 通知の契約を維持したまま、前後にログを追加 / 委譲先は外側が所有

::: code-group

```cpp [C++]
#include <iostream>
#include <string_view>

struct Notifier {
    virtual ~Notifier() = default;
    virtual void send(std::string_view message) = 0;
};
class LoggingNotifier final : public Notifier {
    Notifier& inner_; // inner は自分より長く生存すること
public:
    explicit LoggingNotifier(Notifier& inner) : inner_(inner) {}
    void send(std::string_view message) override {
        std::clog << "Sending notification\n";
        inner_.send(message);
        std::clog << "Notification sent\n";
    }
};
```

```csharp [C#]
using System;

public interface INotifier
{
    void Send(string message);
}
public sealed class LoggingNotifier : INotifier
{
    private readonly INotifier _inner;
    public LoggingNotifier(INotifier inner) => _inner = inner;

    public void Send(string message)
    {
        Console.WriteLine("Sending notification");
        _inner.Send(message);
        Console.WriteLine("Notification sent");
    }
}
```

:::

## Facade と Proxy の違い

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>パターン</th><th>目的</th><th>よくある名前</th></tr></thead><tbody><tr><td>Facade</td><td>複数の操作を、使いやすい入口へまとめる</td><td>VideoConversionFacade / CheckoutFacade</td></tr><tr><td>Proxy</td><td>対象へのアクセス・遅延生成・通信などを制御する</td><td>RemoteImageProxy / LazyDocumentProxy</td></tr><tr><td>Adapter</td><td>利用者が求める別の契約へ合わせる</td><td>LegacyPrinterAdapter</td></tr><tr><td>Decorator</td><td>契約を維持しつつ振る舞いを追加する</td><td>CompressingStream / CachedProductCatalog</td></tr></tbody></table></div><p>Facade が全業務を抱える巨大クラスになると、内部の整理が隠れただけになります。利用場面を明確にし、入口の責務を絞ります。Proxy と Decorator は似た構造でも、アクセスの代理か機能追加かという主目的で見分けます。</p>

</div>

## 他に知っておくと読める名前

<div v-pre>

<p><strong>Composite</strong> は単体と集合を同じ契約で扱います。図形と図形グループが例です。<strong>Bridge</strong> は抽象側と実装側を別々に拡張できるよう分離します。形状と描画 API の組み合わせなどで使えます。どちらも必要な変動軸があるときに選ぶ道具です。</p><aside class="article-note"><strong>読み方のヒント</strong><p>クラス名より、引数・公開メソッド・内部へ委譲する契約を確認します。同じ Adapter という名前でも、プロジェクトによって責務の幅は異なります。</p></aside>

</div>

## 理解度チェック

外部 API の型変換と、既存処理へのログ追加を、それぞれ何に任せますか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。
- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures) — Microsoft Learn。レイヤーと、Application Core へ向ける依存関係。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
