---
title: 条件分岐・繰り返し・関数 — 処理の順番を作る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: languages
  summary: HPの更新を例にif・else、for・while、関数の引数と戻り値を説明する。C++とC#で同じ処理を実行する小さなプログラムを読む。
  aliases: [条件分岐, if, else, 繰り返し, ループ, for, while, 関数, メソッド, 引数, 仮引数, 戻り値, return, 値渡し]
  verification: Microsoftの仕様に照合。Windows x64のMSVC（C++17）と.NET SDK 10.0.403でビルドし、掲載した出力と一致することを確認（2026-11-07）
---

# 条件分岐・繰り返し・関数 — 処理の順番を作る

HPからダメージを引く処理を、条件に応じて変え、繰り返し呼ぶ場面を考えます。[値・変数・型・式](/languages/variables-types-and-expressions.html)の続きを、C++とC#のコンソールプログラムで確かめます。

コードを保存して実行する手順は、[読む順ガイドの実行方法](/guide/software-development-basics.html#run-code)で確認できます。

## 条件分岐で実行する道を選ぶ

**条件分岐**は、条件の結果によって実行する処理を選びます。`if`の条件が`true`なら最初のブロック、`false`なら`else`のブロックへ進みます。下の例は、ダメージが現在のHP以上なら0を返し、それ以外なら差を返します。どちらかの`return`を実行すると、その呼び出しの処理を終えます。[C++のif文](https://learn.microsoft.com/en-us/cpp/cpp/if-else-statement-cpp?view=msvc-170) · [C#のif文](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/selection-statements#the-if-statement)

## 関数に値を渡し、結果を受け取る

**関数**は、一まとまりの処理に名前を付けて呼び出せるようにしたものです。C#では、クラスなどの中で定義する関数を**メソッド**と呼びます。例の`ApplyDamage`は二つの整数を受け取り、結果の整数を返します。[C++の関数](https://learn.microsoft.com/en-us/cpp/cpp/functions-cpp?view=msvc-170) · [C#のメソッド](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/methods)

`ApplyDamage(hp, 30)`で渡す値を**引数**、定義側の`currentHp`と`damage`を**仮引数**と呼びます。この例の`int`は値をコピーして渡します。関数の計算結果は**戻り値**として受け取り、`hp = ApplyDamage(hp, 30);`で呼び出し元の`hp`へ代入します。[C#の引数の渡し方](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters) · [値・ポインタ・参照](/languages/cpp/values-pointers-references.html)

<figure class="study-figure">
  <img src="/images/languages/control-flow-and-functions.svg" alt="ApplyDamageにHPの100とダメージの30を値渡しすると、関数が70を返し、呼び出し元がhpへ代入する。forは初期化後に条件を調べ、真なら本体と更新を実行して再び条件へ戻る。偽ならループを抜ける。" width="760" height="444" loading="lazy">
  <figcaption>関数の入力と結果、繰り返しで次の一回を判断する位置を示します。<a href="/study/images/languages/control-flow-and-functions.svg" target="_blank" rel="noopener noreferrer">関数と繰り返しの図を拡大</a></figcaption>
</figure>

## forとwhileで次の一回を判断する

`for (int hit = 0; hit < 3; ++hit)`は、最初に`hit`を0にし、毎回`hit < 3`を確認します。真なら本体を実行し、`++hit`で1増やしてから、また条件へ戻ります。例では`hit`が0、1、2の3回実行します。`while (hp > 0)`は、毎回HPが正かを調べ、真の間、本体を実行します。最初から偽なら本体へ入りません。[C++の繰り返し文](https://learn.microsoft.com/en-us/cpp/cpp/iteration-statements-cpp?view=msvc-170) · [C#の繰り返し文](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements)

この例では初期HPを100、毎回のダメージを30に固定します。HPは0まで減るので、`while`も終了します。変数を更新し忘れるなどして条件が真のままなら、繰り返しが終わらない場合があります。

## C++の完全な例

C++17以降のコンソール用です。関数を先に定義し、`main`から呼びます。

```cpp
#include <iostream>

int ApplyDamage(int currentHp, int damage)
{
    if (damage >= currentHp) {
        return 0;
    } else {
        return currentHp - damage;
    }
}

int main()
{
    int hp = 100;
    for (int hit = 0; hit < 3; ++hit) {
        hp = ApplyDamage(hp, 30);
        std::cout << "hp=" << hp << '\n';
    }
    while (hp > 0) {
        hp = ApplyDamage(hp, 30);
    }
    std::cout << "final=" << hp << '\n';
    return 0;
}
```

## C#の完全な例

.NET 8以降のコンソールアプリ用です。`static`を付けたメソッドを`Program`の中に置いています。Unityではゲームエンジンが呼ぶメソッドから、必要な更新処理を呼び出す形になります。

```csharp
using System;

class Program
{
    static int ApplyDamage(int currentHp, int damage)
    {
        if (damage >= currentHp) {
            return 0;
        } else {
            return currentHp - damage;
        }
    }

    static void Main()
    {
        int hp = 100;
        for (int hit = 0; hit < 3; ++hit) {
            hp = ApplyDamage(hp, 30);
            Console.WriteLine($"hp={hp}");
        }
        while (hp > 0) {
            hp = ApplyDamage(hp, 30);
        }
        Console.WriteLine($"final={hp}");
    }
}
```

どちらも次の出力になります。最初の3回で10になり、続く`while`の一回で0になります。

```text
hp=70
hp=40
hp=10
final=0
```

ゲームでは、攻撃イベントが発生するたびにHPを更新する設計も使います。毎フレーム何を呼ぶかは[小さなシューティングの設計](/game/shooter-design.html)、呼び出し時のCPU側の処理は[関数呼び出しとCPU](/runtime/cpp-internals/function-calls-and-cpu.html)へつながります。
