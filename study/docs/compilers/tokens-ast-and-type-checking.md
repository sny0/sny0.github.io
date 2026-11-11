---
title: トークン・AST・型検査 — C++のソースを読み解く
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: compilers
  summary: 字句解析で得たトークンを構文木に組み立て、名前の参照先、式の型、暗黙の型変換を確かめる。
  aliases: [コンパイラフロントエンド, 字句解析, lexer, トークン, token, 構文解析, parser, 抽象構文木, AST, 型検査, 意味解析, Sema, Clang]
  verification: Clang 14.0.6でASTと二つの診断を確認し、Clang公式資料に照合（2026-11-06）
---

# トークン・AST・型検査 — C++のソースを読み解く

`value + step * 2u` からコードを生成するには、`value` と `step` の参照先の宣言、演算を組み立てる順序、各演算で使う型を決める必要があります。**フロントエンド**は前処理の結果を受け取り、言語の規則に従ってこれらを決め、後続の処理に渡す表現を作ります。[コンパイル全体の流れ](/runtime/cpp-internals/build-pipeline-journey.html) · [Clangフロントエンドの内部構成](https://clang.llvm.org/docs/InternalsManual.html#the-parser-library)

```cpp
double adjust(double value, unsigned step) {
    return value + step * 2u;
}
```

<figure class="study-figure">
  <img src="/images/compilers/tokens-ast-and-type-checking.svg" alt="return文を7個のトークンに分ける。加算の右側に乗算の部分木ができ、型検査で乗算結果をunsigned intからdoubleへ変換する。" width="760" height="322" loading="lazy">
  <figcaption>式の読み取りを3つの観点から見た図です。木の乗算ノードは、加算に渡す値を作ります。<a href="/study/images/compilers/tokens-ast-and-type-checking.svg" target="_blank" rel="noopener noreferrer">フロントエンドの図を拡大</a></figcaption>
</figure>

## 文字からトークンを取り出す

**字句解析（lexing）**は、入力の文字列から、名前、数値リテラル、演算子などの単位を認識する処理です。一つずつ取り出した単位を**トークン**と呼びます。この `return` 文では、キーワード `return`、識別子 `value`、記号 `+`、識別子 `step`、記号 `*`、数値リテラル `2u`、記号 `;` が並びます。`2u` は接尾辞を含めて一つのトークンです。Clangのパーサーは、マクロなどを処理する前処理器からトークンを受け取ります。[ClangのLexerとPreprocessor](https://clang.llvm.org/docs/InternalsManual.html#the-lexer-and-preprocessor-library)

## トークンを文や式の木に組み立てる

**構文解析（parsing）**では、トークンの列を文法に沿って組み立てます。この式では `*` の優先順位が `+` より高いため、`step * 2u` が一つの部分式になり、加算の右側に入ります。こうした入れ子を、式、文、宣言などを表すノードで記録したものが **AST（抽象構文木）** です。ClangのASTには、ソースを書き換えるツールでも扱えるように、明示的な丸括弧を表すノードが残る場合があります。[Clang ASTの構造](https://clang.llvm.org/docs/IntroductionToTheClangAST.html)

## 名前を解決し、型を確かめる

**意味解析**では、言語の規則に従って名前の参照先や式の型を決めます。`step` は関数の第2引数を指し、`step` と `2u` の乗算は `unsigned int` で行います。その積を `double` に変換して、`value` と加算します。Clangでは、パーサーが構文を読み進めながら意味解析の `Sema` を呼び出します。ASTには、元の式に対応するノードに加え、暗黙の変換を表す `ImplicitCastExpr` も現れます。[ClangのSemaとAST](https://clang.llvm.org/docs/InternalsManual.html#the-sema-library)

| ソースに加えた変更 | 診断を調べるときの観点 |
| --- | --- |
| `return` 文の末尾から `;` を取り除く | 文を終えるトークンを構文解析器が見つけられない |
| `step * 2u` を `"up" * 2u` にする | 乗算の形は読めるが、文字列リテラルと整数に対する乗算は型の規則を満たさない |

コンパイラは、問題の箇所や、関連する宣言の位置を診断に含めることがあります。Clangは回復できる範囲で構文解析を続け、後続の問題も報告します。最初に表示された位置の周囲と、その直前の文を確認すると、エラーの連鎖を切り分けやすくなります。[Clang ASTのエラー回復](https://clang.llvm.org/docs/InternalsManual.html#error-handling)

## ClangでASTを読む

例を `adjust.cpp` として保存し、Clangを使える端末で実行します。`-fsyntax-only` はフロントエンドで止める指定です。`-Xclang` を通して、ASTを表示するオプションをフロントエンドに渡します。[Clang公式のASTダンプ手順](https://clang.llvm.org/docs/IntroductionToTheClangAST.html#examining-the-ast)

```powershell
clang++ -std=c++17 -fsyntax-only -Xclang -ast-dump adjust.cpp
```

出力で `adjust` の `FunctionDecl` を探し、`ReturnStmt` の下にある演算をたどります。次は関連するノードと型を抜き出したものです。`LValueToRValue` は、引数を指す式から値を読み出す変換です。`IntegralToFloating` が掛かるのは、`step` 単体ではなく乗算の結果です。

```text
ReturnStmt
└─ BinaryOperator 'double' '+'
   ├─ ImplicitCastExpr 'double' <LValueToRValue>
   │  └─ DeclRefExpr 'double' value
   └─ ImplicitCastExpr 'double' <IntegralToFloating>
      └─ BinaryOperator 'unsigned int' '*'
         ├─ ImplicitCastExpr 'unsigned int' <LValueToRValue>
         │  └─ DeclRefExpr 'unsigned int' step
         └─ IntegerLiteral 'unsigned int' 2
```

演算の型が決まると、後続の処理は加算や変換を型付き命令にできます。[LLVM IRとSSA](/compilers/llvm-ir-and-ssa.html)
