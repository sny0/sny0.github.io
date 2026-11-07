---
title: 値・変数・型・式 — HPを書き換える
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: languages
  summary: HPとダメージを例に、値、変数、型、初期化、代入、式と文を説明する。C++とC#で値をコピーしてから更新する小さなプログラムを読む。
  aliases: [値, 変数, 型, 宣言, 初期化, 代入, 式, 文, スコープ, int, bool, 等価比較]
  verification: Microsoftの仕様に照合。Windows x64のMSVC（C++17）と.NET SDK 10.0.403でビルドし、掲載した出力と一致することを確認（2026-11-07）
---

# 値・変数・型・式 — HPを書き換える

ゲームのHPが`100`から`70`へ変わる場面を考えます。プログラムでは、扱う**値**に名前を付け、計算した結果を次の処理で使います。ここではC++とC#に共通する書き方を、整数の小さな例から見ます。

コードを保存して実行する手順は、[読む順ガイドの実行方法](/guide/software-development-basics.html#コード例を手元で動かす)で確認できます。

## 名前、型、最初の値

`int hp = 100;`では、整数を扱う型`int`の変数を、`hp`という名前で宣言し、`100`で**初期化**します。変数の**型**は、扱う値や使える演算の規則を決めます。この例の`int`は整数、`bool`は`true`と`false`を扱います。C++とC#で型の名前が同じでも、すべての型の大きさや演算規則が同じとは限りません。[C++の宣言と定義](https://learn.microsoft.com/en-us/cpp/cpp/declarations-and-definitions-cpp?view=msvc-170) · [C#の型](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)

| 書き方 | すること |
| --- | --- |
| `int hp = 100;` | `hp`を宣言し、最初の値を100にする。 |
| `int damage = 30;` | `damage`を宣言し、30にする。 |
| `hp - damage` | その時点の二つの値を使って差を求める。 |
| `hp = hp - damage;` | 差を求め、その結果を既存の`hp`へ代入する。 |
| `hp == 70` | `hp`と70が等しいか調べ、`bool`の結果を得る。 |

## 代入は、その時点の値を更新する

`hp = hp - damage;`は、右側の計算結果を左側の変数へ**代入**します。右側で読む`hp`は更新前の値なので、100から30を引いた70が新しい値になります。`=`は値を入れる演算、`==`は等しいか調べる演算です。[C#の代入](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/assignment-operator) · [C#の等価比較](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/equality-operators)

<figure class="study-figure">
  <img src="/images/languages/variables-types-and-expressions.svg" alt="hpを100で初期化し、copyへその値をコピーする。hpからdamageの30を引いて代入するとhpは70になるが、copyは100のまま。hpとcopyの等価比較はfalseになる。" width="760" height="394" loading="lazy">
  <figcaption>この図の<code>int</code>では、コピーした後に片方の値を変更しても、もう片方の値は変わりません。<a href="/study/images/languages/variables-types-and-expressions.svg" target="_blank" rel="noopener noreferrer">変数と代入の図を拡大</a></figcaption>
</figure>

`int copy = hp;`は、その時点の整数値を使って別の変数を初期化します。後から`hp`へ代入しても、`copy`は以前の値を保ちます。C#の`int`は値型です。参照を使う型や、C++の参照を扱う場合は、その規則も確認します。[C#の値型](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types) · [値・ポインタ・参照](/languages/cpp/values-pointers-references.html)

## C++で確かめる

以下はC++17以降のコンソール用の完全なプログラムです。`#include <iostream>`は出力機能の宣言を取り込み、`std::cout`で文字や値を表示します。

```cpp
#include <iostream>

int main()
{
    int hp = 100;
    int damage = 30;
    int copy = hp;
    hp = hp - damage;
    bool same = hp == copy;
    std::cout << "hp=" << hp << ", copy=" << copy << '\n';
    std::cout << std::boolalpha << "same=" << same << '\n';
    return 0;
}
```

出力は次のとおりです。`std::boolalpha`で真偽値を`true`・`false`の文字として表示します。

```text
hp=70, copy=100
same=false
```

## C#で確かめる

以下は.NET 8以降のコンソールアプリ用の完全なプログラムです。`Main`から処理を始め、`Console.WriteLine`で表示します。Unityで使う場合の呼び出し元や表示方法は、Unityの実行環境に合わせます。

```csharp
using System;

class Program
{
    static void Main()
    {
        int hp = 100;
        int damage = 30;
        int copy = hp;
        hp = hp - damage;
        bool same = hp == copy;
        Console.WriteLine($"hp={hp}, copy={copy}");
        Console.WriteLine($"same={same}");
    }
}
```

出力は次のとおりです。C#の通常の真偽値の表示は`True`・`False`です。

```text
hp=70, copy=100
same=False
```

## 式、文、スコープを読む

`hp - damage`や`hp == copy`は、演算などを組み合わせた**式**です。式の評価では、値を求めたり、代入のように状態を変えたりします。`hp = hp - damage;`のように処理として書いたものが**文**です。宣言も、例の関数内では宣言文として書きます。[C++の式](https://learn.microsoft.com/en-us/cpp/cpp/expressions-cpp?view=msvc-170)

`main`や`Main`の中で宣言した`hp`は、その関数内の使える範囲で参照します。名前が有効な範囲を**スコープ**と呼びます。波括弧で囲むブロック内に宣言したローカル変数は、その範囲に属します。名前の範囲と、実際のデータの寿命は、参照やオブジェクトを学ぶときにさらに区別します。[C++のスコープ](https://learn.microsoft.com/en-us/cpp/cpp/scope-visual-cpp?view=msvc-170)

条件によって処理を変えたり、同じ計算を何度も呼んだりする方法は、[条件分岐・繰り返し・関数](/languages/control-flow-and-functions.html)へ進んでください。数の表現は[整数・ビット・バイト](/data/integer-bits-and-bytes.html)、変数が保持するデータの寿命は[記憶域期間と寿命](/runtime/memory/storage-duration-and-lifetime.html)で扱います。
