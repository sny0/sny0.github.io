---
title: "DDD — 業務の言葉でモデルを作る"
study:
  source: "設計の手帖"
  kind: "本文"
  status: "既存原稿"
  summary: "DDD はフォルダ構成や Entity 基底クラスの導入ではありません。業務の理解を、会話とコードで一致させる取り組みです。"
---

# DDD — 業務の言葉でモデルを作る

DDD はフォルダ構成や Entity 基底クラスの導入ではありません。業務の理解を、会話とコードで一致させる取り組みです。

03 · アプリ全体を設計する / DDD・Entity・Repository / Model the language of the domain / 応用 / 12分

タグ: DDD / Entity / Aggregate / Value Object / Repository / Domain Service

## 戦略：言葉の意味が通じる範囲を決める

<div v-pre>

<p>販売でいう「商品」は価格・説明を持ち、配送でいう「荷物」は重量・届け先を持ちます。同じ現物でも、扱う関心が違います。<strong>Bounded Context</strong> はモデルと言葉の意味が一貫する境界です。部署、モジュール、マイクロサービスと必ず一対一になるわけではありません。</p><p>その範囲で、開発者と業務を知る人が同じ言葉を使うのが <strong>Ubiquitous Language</strong> です。「確定」「予約」「引当」が曖昧なら、型を作る前に意味を確かめます。</p>

</div>

## 戦術：よく出会う型の役割

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>役割</th><th>例</th><th>守ること</th></tr></thead><tbody><tr><td>Entity</td><td>Order / Customer</td><td>識別子による同一性と、状態のルール</td></tr><tr><td>Value Object</td><td>Money / DateRange</td><td>値の等価性と、有効な値の組み合わせ</td></tr><tr><td>Aggregate Root</td><td>Order（OrderLine を含む）</td><td>一緒に整合性を保つ範囲の入口</td></tr><tr><td>Domain Service</td><td>PricingService</td><td>自然に一つの Entity へ置けない業務判断</td></tr><tr><td>Application Service / UseCase</td><td>PlaceOrderUseCase</td><td>取得・業務操作・保存の調整</td></tr><tr><td>Repository</td><td>IOrderRepository</td><td>集約を取り出し保存するための契約</td></tr></tbody></table></div><p>注文の合計と明細の整合性を Order が管理するなら、外部から OrderLine を好きに変更させない設計にします。集約は「関連するすべてを詰める入れ物」ではなく、守るべき整合性から境界を考えます。大きすぎる集約は競合や読み込みの負担を増やします。</p>

</div>

## Repository と DAO、DTO を区別する

<div v-pre>

<p><code>OrderRepository</code> はドメインの集合に近い契約を表します。<code>OrderDao</code> は保存操作やレコードへのアクセスが中心です。<code>OrderDto</code> は境界を越えて情報を運ぶ形で、業務上の振る舞いを担う Order と役割が違います。名称の運用はチームにより重なるので、公開契約を確認してください。</p><p>Repository を全テーブルへ一つずつ機械的に作る必要はありません。特に既存 ORM と同じメソッドだけを持つ汎用 Repository は、抽象化の価値を検討します。一覧画面の読み取りでは、専用の QueryService が直接 DTO を返す構成も候補です。</p><p>この Fake は単一スレッドの学習用で、永続化・同時更新・トランザクションを再現しません。C# の簡略な Order は record を使いますが、実際の Entity の同一性と振る舞いは業務の契約として設計してください。</p>

</div>

### Repository の契約と Fake / Order は境界を示すため ID だけに簡略化

::: code-group

```cpp [C++]
#include <optional>
#include <unordered_map>

struct Order { int id; };
struct OrderRepository {
    virtual ~OrderRepository() = default;
    virtual std::optional<Order> find(int id) const = 0;
    virtual void save(const Order& order) = 0;
};
class InMemoryOrderRepository final : public OrderRepository {
    std::unordered_map<int, Order> orders_;
public:
    std::optional<Order> find(int id) const override {
        auto it = orders_.find(id);
        if (it == orders_.end()) return std::nullopt;
        return it->second;
    }
    void save(const Order& order) override {
        orders_.insert_or_assign(order.id, order);
    }
};
```

```csharp [C#]
#nullable enable
using System.Collections.Generic;

public sealed record Order(int Id);
public interface IOrderRepository
{
    Order? Find(int id);
    void Save(Order order);
}
public sealed class InMemoryOrderRepository : IOrderRepository
{
    private readonly Dictionary<int, Order> _orders = new();
    public Order? Find(int id)
        => _orders.TryGetValue(id, out var order) ? order : null;
    public void Save(Order order) => _orders[order.Id] = order;
}
```

:::

## 採用する範囲を選ぶ

<div v-pre>

<p>複雑な価格規則、契約、承認などの業務判断が中心なら、モデル化の投資が役立ちます。単純な管理画面やデータ転送なら、素直な CRUD と検証の方が分かりやすいことがあります。すべての処理へ同じ厚さのドメインモデルを強制する必要はありません。</p>

</div>

## 理解度チェック

PlaceOrderUseCase にある条件分岐は、業務の判断ですか、それとも処理の調整ですか？

## この章の参考資料

- [Designing a DDD-oriented microservice](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice) — Microsoft Learn。ドメイン層、アプリケーション層、インフラ層の役割。DDD はマイクロサービス以外にも適用できます。
- [Value Object](https://martinfowler.com/bliki/ValueObject.html) — Martin Fowler。値によって等しさを判断するオブジェクト。
- [Repository](https://martinfowler.com/eaaCatalog/repository.html) — Martin Fowler。ドメインオブジェクトの集合として永続化を扱うパターン。
- [Data Transfer Object](https://martinfowler.com/eaaCatalog/dataTransferObject.html) — Martin Fowler。境界を越えてデータを運ぶためのオブジェクト。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
