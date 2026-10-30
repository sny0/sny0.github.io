---
title: 振る舞いを変える — Strategy・State・Command
study:
  source: 設計の手帖
  status: published
  summary: 条件分岐には意味があります。「何を選んでいる分岐なのか」によって、適した分け方が変わります。
  section: reference
  format: article
  domain: design
---

# 振る舞いを変える — Strategy・State・Command

条件分岐には意味があります。「何を選んでいる分岐なのか」によって、適した分け方が変わります。

タグ: Strategy / State / Command / Template Method / Policy

## Strategy：同じ目的の手段を差し替える

<div v-pre>

<p>標準送料・会員送料・キャンペーン送料を、共通の計算契約で差し替えます。小さな一操作なら、クラスを増やす代わりに関数オブジェクトやデリゲートを渡せます。<code>ShippingStrategy</code> や <code>DiscountPolicy</code> が典型的な名前です。</p>

</div>

### 送料計算を差し替える / 動作確認用の短い完全例

::: code-group

```cpp [C++]
#include <functional>
using ShippingPolicy = std::function<int(int)>;

int total(int subtotal, const ShippingPolicy& shipping) {
    return subtotal + shipping(subtotal);
}

int main() {
    ShippingPolicy standard = [](int amount) {
        return amount >= 5000 ? 0 : 500;
    };
    return total(3000, standard) == 3500 ? 0 : 1;
}
```

```csharp [C#]
using System;

public static class Program
{
    static int Total(int subtotal, Func<int, int> shipping)
        => subtotal + shipping(subtotal);

    public static void Main()
    {
        Func<int, int> standard = amount => amount >= 5000 ? 0 : 500;
        Console.WriteLine(Total(3000, standard)); // 3500
    }
}
```

:::

## State：今の状態が操作の意味を決める

<div v-pre>

<p>注文の「下書き・確定・発送済み」によって Cancel の可否が変わるなら、状態と遷移を明示します。<code>DraftState</code>、<code>ConfirmedState</code> のように状態を型にする方法もあれば、enum と遷移表の方が簡潔な場合もあります。</p><p>Strategy は外側から手段を選ぶ点に注目し、State は対象の状態とその遷移に注目します。構造が似ていても、使う意図が異なります。状態オブジェクトの使い回しは、内部に可変データを持つか確認して判断します。</p>

</div>

### enum による小さな状態遷移 / 複雑になる前はこの形も候補

::: code-group

```cpp [C++]
#include <stdexcept>

class Order {
    enum class Status { Draft, Confirmed, Shipped };
    Status status_ = Status::Draft;
public:
    void confirm() {
        if (status_ != Status::Draft)
            throw std::logic_error("cannot confirm");
        status_ = Status::Confirmed;
    }
    void ship() {
        if (status_ != Status::Confirmed)
            throw std::logic_error("cannot ship");
        status_ = Status::Shipped;
    }
};
```

```csharp [C#]
using System;

public sealed class Order
{
    private enum Status { Draft, Confirmed, Shipped }
    private Status _status = Status.Draft;

    public void Confirm()
    {
        if (_status != Status.Draft)
            throw new InvalidOperationException("cannot confirm");
        _status = Status.Confirmed;
    }
    public void Ship()
    {
        if (_status != Status.Confirmed)
            throw new InvalidOperationException("cannot ship");
        _status = Status.Shipped;
    }
}
```

:::

## Command：操作をオブジェクトとして扱う

<div v-pre>

<p><code>RenameFileCommand</code> は「実行する操作」と必要な引数をまとめます。キュー投入、履歴、Undo、再実行の単位にできます。実行済みの操作を Undo するには元の状態や逆操作を保存する設計が別途必要です。Command という名前を付けるだけで安全な再試行は実現しません。</p>

</div>

## Template Method：流れを固定し、一部を派生で変える

<div v-pre>

<p><code>ImportJob.Run()</code> が「読込 → 検証 → 保存」を固定し、一部のステップを仮想メソッドにします。継承の契約が安定していると有効です。ステップの組み合わせが増えるなら、関数や Strategy を合成する方が柔軟です。</p><div class="table-scroll"><table><thead><tr><th>知りたいこと</th><th>候補</th></tr></thead><tbody><tr><td>計算方法を切り替えたい</td><td>Strategy / Policy</td></tr><tr><td>状態によって許可される操作が変わる</td><td>State / 状態遷移表</td></tr><tr><td>操作を保存・遅延・取消したい</td><td>Command</td></tr><tr><td>処理の骨格を共通化したい</td><td>Template Method / 処理パイプライン</td></tr></tbody></table></div>

</div>

## 理解度チェック

同じ if 文でも、方式の選択と状態の遷移では、設計がどう違いますか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。
- [Commanding overview — WPF](https://learn.microsoft.com/dotnet/desktop/wpf/advanced/commanding-overview) — Microsoft Learn。操作の意味を入力装置から切り離すコマンド。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
