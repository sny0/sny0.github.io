---
title: C++とUnity/C#の違いを学ぶ
study:
  source: C++ Wiki
  status: published
  summary: C++の各概念を、Unity/C#経験者の既存知識に対応づけて理解する章です。合言葉は「似ているが同じではない」——対応表の「≒」の裏にある差分こそが、C++で事故る場所です。
  section: learning
  format: path
  domain: languages
  collection: cpp-design
  order: 9
---

<div id="第9部-unity-c-との対応" class="study-legacy-anchor" aria-hidden="true"></div>

# C++とUnity/C#の違いを学ぶ

C++の各概念を、Unity/C#経験者の既存知識に**対応づけて**理解する章です。合言葉は「**似ているが同じではない**」——対応表の「≒」の裏にある差分こそが、C++で事故る場所です。

## ページ一覧

1. [デストラクタと Dispose / RAII と using](/languages/csharp/destructor-dispose-raii-using.html)
2. [ポインタと参照型 / 値セマンティクスと class・struct](/languages/csharp/pointers-references-value-semantics.html)
3. [テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html)
4. [仮想関数と virtual/override / コンパイル時多態と実行時多態](/languages/csharp/virtual-and-polymorphism.html)
5. [関数ポインタと delegate / Observer と event](/languages/csharp/delegates-events-function-pointers.html)
6. [ヘッダー分割と Assembly Definition](/languages/csharp/headers-vs-asmdef.html)
7. [ネイティブビルドと IL2CPP](/languages/csharp/il2cpp.html)
8. [手動メモリ管理と GC](/languages/csharp/memory-management-vs-gc.html)
9. [C++例外と C#例外](/languages/csharp/exceptions-comparison.html)

仕上げに [演習](/languages/csharp/exercises.html)。

## 対応表(この章の地図)

| C#/Unity | C++ | 対応の質 |
|---|---|---|
| class(参照型) | クラス+ポインタ/参照(自分で選ぶ) | 要注意(既定が逆) |
| struct(値型) | クラス/構造体の値使用 | 近い |
| using / IDisposable | RAII / デストラクタ | C++の方が強い |
| ジェネリック | テンプレート | 見た目だけ似ている |
| delegate / event | 関数ポインタ+std::function+自作リスト | C#の方が言語サポート厚い |
| Assembly Definition | ヘッダー+ライブラリ分割 | 目的は同じ、仕組みは別物 |
| GC | 所有権+スマートポインタ | 哲学が異なる |
| 例外(常用) | 例外(選択制) | 文化が異なる |

---

[全体目次](/guide/cpp-index.html) | 次: [デストラクタとDispose / RAIIとusing](/languages/csharp/destructor-dispose-raii-using.html)
