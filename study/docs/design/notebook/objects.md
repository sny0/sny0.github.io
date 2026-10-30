---
title: オブジェクト指向と、不正な状態を作らない設計
study:
  source: 設計の手帖
  status: published
  summary: オブジェクトはデータの入れ物に振る舞いを足しただけではありません。守るべきルールの境界です。
  section: reference
  format: article
  domain: design
---

# オブジェクト指向と、不正な状態を作らない設計

オブジェクトはデータの入れ物に振る舞いを足しただけではありません。守るべきルールの境界です。

タグ: OOP / カプセル化 / 不変条件 / Value Object

## getter / setter を増やす前に考える

<div v-pre>

<p><code>Order.Status</code> を自由に書き換えられると、発送済み注文が未払いへ戻るかもしれません。<code>Ship()</code> のような操作を公開して、その中で遷移条件を守ると、呼び出す側が毎回ルールを知る必要がなくなります。これがカプセル化の実用的な意味です。</p><p><strong>不変条件（invariant）</strong>は、外部から観察できる有効な状態で常に成り立つ条件です。「数量は正」「開始日は終了日以前」などを、コンストラクタや操作の中で保証します。private にしただけでは、ルールは守られません。</p>

</div>

## 値で区別するか、同一性で区別するか

<div v-pre>

<p><code>Money</code> や <code>DateRange</code> は値が等しければ同じ意味を持つ値オブジェクトです。一方、名前が変わっても同じ顧客である <code>Customer</code> は識別子で追跡するエンティティです。用途によって同じ「住所」でも扱いは変わり得ます。</p><p>値オブジェクトは不変にすると扱いやすくなります。C++ の値型・C# の struct と、DDD の Value Object は別の分類です。C# の class でも値オブジェクトを表せますし、struct にしただけで業務ルールや等価性が正しくなるわけではありません。</p>

</div>

## 小さな型で、ルールを一か所にする

<div v-pre>

<p>次の <code>Quantity</code> は生成時に正の数量だけを受け付けます。計算や API 入力の検証は用途に応じて追加します。</p>

</div>

### 正の数量を表す型 / 単独で定義可能

::: code-group

```cpp [C++]
#include <stdexcept>

class Quantity {
    int value_;
public:
    explicit Quantity(int value) : value_(value) {
        if (value <= 0)
            throw std::invalid_argument("quantity must be positive");
    }
    int value() const noexcept { return value_; }
    bool operator==(const Quantity&) const = default;
};
```

```csharp [C#]
using System;

public sealed record Quantity
{
    public int Value { get; }

    public Quantity(int value)
    {
        if (value <= 0)
            throw new ArgumentOutOfRangeException(nameof(value));
        Value = value;
    }
}
```

:::

## 継承は「同じものとして使える」契約

<div v-pre>

<p>継承をコードの再利用だけに使うと、基底クラスの変更が派生クラスへ広がります。「鳥は飛ぶ」を基底の契約にしてからペンギンを派生させると破綻します。必要な能力を <code>IFlyable</code> として分けるか、飛行機能を部品として持たせます。</p><aside class="article-note"><strong>使わない方がよい場面</strong><p>単純な通信 DTO に複雑な業務振る舞いを押し込む必要はありません。どの境界のモデルかを決めてから、守るルールを選びます。</p></aside>

</div>

## 理解度チェック

Quantity の代わりに int を公開したとき、どこへ検証が散らばるか説明できますか？

## この章の参考資料

- [Value Object](https://martinfowler.com/bliki/ValueObject.html) — Martin Fowler。値によって等しさを判断するオブジェクト。
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
