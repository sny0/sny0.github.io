---
title: "C++例外と C#例外"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "言語機能の詳細と業界事情は例外のページ、内部実装は例外処理の仕組みで説明済み。ここでは対応と差分を整理します。 C#の例外の大半は「ランタイムの安全網」、C++の例外は「自分で投げたものだけ」。C++でtry-catchを書いてもメモリバグは捕まりません(→ 捕まえるのはサニタイザの仕事)。"
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
| ランタイム例外 | NullReference / IndexOutOfRange等が**自動で飛ぶ** | **飛ばない**(同じ状況は未定義動作) |
| スタックトレース | 常時取得可能 | 標準では取れない(プラットフォーム機能で自前) |
| 使わない選択肢 | 事実上ない(BCLが例外前提) | 現実に存在(-fno-exceptions文化) |
| コスト | tryは安価、throwはやや重い | 投げなければほぼゼロ、throwは高い(実装依存) |

## 最大の差分1: 「安全網」の有無

```csharp
// C#: 間違いは例外という形で「定義された壊れ方」をする
int x = arr[100];        // IndexOutOfRangeException — catchで拾える、トレースが出る
obj.Method();            // NullReferenceException — 同上
```

```cpp
// C++: 同じ間違いは例外にならない
int x = arr[100];        // 未定義動作。catchも通知もない([UB](../05_cpp_language/18_undefined_behavior.md))
ptr->Method();           // 同上
```

**C#の例外の大半は「ランタイムの安全網」、C++の例外は「自分で投げたものだけ」**。C++でtry-catchを書いてもメモリバグは捕まりません(→ 捕まえるのは[サニタイザ](/tools/build/debugging-and-analysis.html)の仕事)。

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
    std::ifstream f(path);   // 例外がどこで飛んでも、スタック巻き戻しで確実にclose
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
| エンジンの流儀 | Unity: 例外は使えるが投げっぱなしはログ汚染 | UE: 例外非使用(check/ensure文化 → [第10部](/game/unreal/)) |

「高頻度パスに例外を使わない」は両言語共通の結論で、違いは「C++にはそもそも例外を切る文化圏がある」ことです。

## Unity開発者が誤解しやすい点

1. 「try-catchで囲めばクラッシュしない」— C++では大半のクラッシュ(UB系)は例外でない。囲んでも無意味
2. `catch (Exception e)` の感覚で `catch (...)` を乱用しない——何が起きたか分からないまま握りつぶすのは、C++では特に危険(状態が壊れている可能性)
3. C++の例外は**値で投げてconst参照で受ける**(`catch (const std::exception& e)`)。C#の「例外は参照型」の感覚でいると、catchのスライシング(派生情報の消失)にハマる

## 理解度チェック

1. 「C#の例外は安全網、C++の例外は自分で投げたものだけ」の意味を説明できますか。
2. C++にfinallyがない理由は?
3. C++で `catch (const std::exception&)` と参照で受ける理由は?

## 演習

<a href="/study/samples/cpp/exceptions_raii.cpp">samples/exceptions_raii.cpp</a> を、C#で同じ処理を書いたらどうなるか(using/finallyの位置)と対比しながら読み、「C++版に後片付けコードが1行もない」ことの理由を説明できるようにしてください。

---

前: [手動メモリ管理とGC](/languages/csharp/memory-management-vs-gc.html) | [カテゴリ目次](/languages/csharp/) | 次: [演習](/languages/csharp/exercises.html)
