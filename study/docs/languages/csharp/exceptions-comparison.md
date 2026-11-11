---
title: C++例外と C#例外
study:
  source: C++ Wiki
  status: published
  summary: C#の配列の範囲外アクセスは例外、C++の生配列では未定義動作です。C++でもstd::vector::at()などのライブラリ関数が投げる例外は捕捉できます。RAIIとfinallyによる後片付けの違いも整理します。
  section: reference
  format: article
  domain: languages
---

# C++例外と C#例外

言語機能の詳細と業界事情は[例外のページ](/languages/cpp/exceptions.html)、内部実装は[例外処理の仕組み](/runtime/cpp-internals/exceptions-and-rtti-impl.html)で説明済み。ここでは対応と差分を整理します。

## 対応表

| | C# | C++ |
|---|---|---|
| 構文 | try / catch / throw / finally | try / catch / throw(**finallyなし**) |
| 後片付け | finally / using | **RAII**(デストラクタが自動で担う) |
| 基底型 | System.Exception(全例外が継承) | 任意の型をthrow可(慣習はstd::exception派生) |
| 再throw | `throw;` | `throw;`(同じ。`throw e;`はコピー+スライシングの罠) |
| 配列の範囲外アクセス | `IndexOutOfRangeException` | 生配列は未定義動作。`std::vector::at()`は`std::out_of_range`を投げる |
| スタックトレース | 例外に記録される（詳細は実行環境・最適化にも依存） | C++23の`std::stacktrace::current()`で現在位置を取得可能。例外への自動添付ではなく、処理系の対応も確認する |
| 使わない選択肢 | 事実上ない(BCLが例外前提) | 現実に存在(-fno-exceptions文化) |
| コスト | tryは安価、throwはやや重い | 投げなければほぼゼロ、throwは高い(実装依存) |

C++23の`<stacktrace>`は取得した位置を記録・表示するための標準機能です。例外が発生した場所を残したいなら、その時点で収集して保持する設計が必要です。[C++草案: stacktrace](https://eel.is/c++draft/stacktrace)

<div id="最大の差分1-「安全網」の有無" class="study-legacy-anchor" aria-hidden="true"></div>

## 最大の差分1: 範囲外アクセスと例外

```csharp
int[] arr = { 10, 20, 30 };
int x = arr[3];          // IndexOutOfRangeException
```

C#では配列の範囲外アクセスで`IndexOutOfRangeException`が発生します。C++の生配列で同じようにアクセスすると[未定義動作](/languages/cpp/undefined-behavior.html)になり、`try-catch`での回復を前提にできません。[Microsoft Learnの配列アクセス例外](https://learn.microsoft.com/en-us/dotnet/api/system.indexoutofrangeexception) · [C++草案の添字演算](https://eel.is/c++draft/expr.sub) · [C++草案の間接参照](https://eel.is/c++draft/expr.unary.op)

C++では、標準ライブラリが投げる例外も捕捉できます。`std::vector::at()`は添字を検査し、範囲外なら`std::out_of_range`を投げます。`v[i]`の呼び出しでは`i < v.size()`を満たす必要があります。[C++草案のコンテナ要件](https://eel.is/c++draft/sequence.reqmts#127)

```cpp
#include <cstdio>
#include <stdexcept>
#include <vector>

int main() {
    // int arr[] = { 10, 20, 30 };
    // (void)arr[3]; // 生配列の範囲外アクセス。未定義動作なので実行しない

    const std::vector<int> values{ 10, 20, 30 };
    try {
        (void)values.at(3);
    } catch (const std::out_of_range&) {
        std::puts("out of range");
    }
}
```

## 最大の差分2: finallyの不在=RAIIの存在

```csharp
// C#: 後片付けはfinally(またはusing)に書く
FileStream f = null;
try { f = File.OpenRead(path); Parse(f); }
finally { f?.Dispose(); }
```

```cpp
// C++: 後片付けはローカルオブジェクトのデストラクタに任せる(finallyが不要な設計)
{
    std::ifstream f(path);   // 捕捉される例外による巻き戻しでも、デストラクタでclose
    Parse(f);
}
```

C++に finally がないのは欠落ではなく、[RAII](/languages/cpp/raii.html)がより一般的な解だから(「後片付けを呼び出し側が書く」のではなく「型に組み込む」)。**C++で例外を使うならRAII徹底が前提**、という関係です。

## 実務指針の対比

| 状況 | C#での定石 | C++での定石 |
|---|---|---|
| ファイル・ネットワークの失敗 | 例外をcatch | プロジェクト方針次第: 例外 or エラー戻り値/expected |
| 「見つからない」程度の失敗 | TryGetValueパターン | optional / bool戻り(例外は使わない) |
| プログラミングエラー(契約違反) | Debug.Assert / 例外 | assert(Shippingで無効化)+クラッシュレポート |
| ゲームループ内の高頻度失敗 | 例外は避ける(Unityでも遅い) | 例外は使わない(共通) |
| エンジンの流儀 | Unity: 例外は使えるが投げっぱなしはログ汚染 | UE: 例外非使用(check/ensure文化 → [Unreal Engineと標準C++をつなぐ学習ガイド](/game/unreal/)) |

「高頻度パスに例外を使わない」は両言語共通の結論で、違いは「C++にはそもそも例外を切る文化圏がある」ことです。

## Unity開発者が誤解しやすい点

1. C++の`catch`が扱うのは投げられた例外です。生配列の範囲外アクセスの調査には、[サニタイザ](/tools/build/debugging-and-analysis.html)などを使います。
2. `catch (Exception e)` と同じ感覚で `catch (...)` を多用しない。C++では何が起きたか分からないまま例外を無視するのは特に危険です(状態が壊れている可能性)。
3. C++の例外は**値で投げてconst参照で受ける**(`catch (const std::exception& e)`)。C#の「例外は参照型」の感覚でいると、catchのスライシング(派生情報の消失)にハマる

## 理解度チェック

1. 要素が3個あるとき、C#の配列の`arr[3]`、C++の生配列の`arr[3]`、`std::vector`の`v.at(3)`はそれぞれどうなりますか。どの例を`catch`で扱えますか。
2. C++にfinallyがない理由は?
3. C++で `catch (const std::exception&)` と参照で受ける理由は?

## 演習

<a href="/study/samples/cpp/exceptions_raii.cpp">samples/exceptions_raii.cpp</a> を、C#で同じ処理を書いたらどうなるか(using/finallyの位置)と対比しながら読み、「C++版に後片付けコードが1行もない」ことの理由を説明できるようにしてください。

---

関連項目：[手動メモリ管理とGC](/languages/csharp/memory-management-vs-gc.html) / [学習ガイド](/languages/csharp/) / [演習](/languages/csharp/exercises.html)
