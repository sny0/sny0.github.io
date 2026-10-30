---
title: C++の言語機能を学ぶ
study:
  source: C++ Wiki
  status: published
  summary: C++の言語機能を「構文」ではなく「仕組みと目的」から説明する章です。各ページに必ず、C#との違い/Unity開発者が誤解しやすい点/ゲーム開発での使用例/メモリ上で起きることを含めています。
  section: learning
  format: path
  domain: languages
  collection: cpp-design
  order: 5
---

<div id="第5部-c-の言語機能" class="study-legacy-anchor" aria-hidden="true"></div>

# C++の言語機能を学ぶ

C++の言語機能を「構文」ではなく「**仕組みと目的**」から説明する章です。各ページに必ず、**C#との違い/Unity開発者が誤解しやすい点/ゲーム開発での使用例/メモリ上で起きること**を含めています。

コード例は原則 **C++20** です(検証環境: MinGW GCC 9.2、C++20部分サポート。concepts/rangesの例は構文レビューのみ — 各ページに明記)。

## 読む順番(前提の少ない順)

1. [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html) — **最重要。C#との世界観の違いの核心**
2. [const と const correctness](/languages/cpp/const-correctness.html)
3. [配列と文字列](/languages/cpp/arrays-and-strings.html)
4. [構造体・クラス・アクセス指定子](/languages/cpp/structs-and-classes.html)
5. [コンストラクタ・デストラクタ・コピー・ムーブ(Rule of Zero/Three/Five)](/languages/cpp/ctor-dtor-copy-move.html)
6. [RAII](/languages/cpp/raii.html) — **C++の設計思想の核**
7. [継承・仮想関数・抽象クラス・override/final](/languages/cpp/inheritance-and-virtual.html)
8. [関数オーバーロードと演算子オーバーロード](/languages/cpp/overloading.html)
9. [テンプレートと concepts](/languages/cpp/templates-and-concepts.html)
10. [ラムダ式・関数ポインタ・std::function](/languages/cpp/lambdas-and-functions.html)
11. [enum・enum class・namespace](/languages/cpp/enums-and-namespaces.html)
12. [例外](/languages/cpp/exceptions.html)
13. [auto・decltype・constexpr・consteval](/languages/cpp/auto-and-constexpr.html)
14. [static・inline・friend](/languages/cpp/static-inline-friend.html)
15. [キャスト](/languages/cpp/casts.html)
16. [スマートポインタ](/languages/cpp/smart-pointers.html)
17. [STLコンテナ・イテレータ・アルゴリズム・ranges](/languages/cpp/stl.html)
18. [未定義動作・実装定義・未規定動作](/languages/cpp/undefined-behavior.html)

仕上げに [演習](/languages/cpp/exercises.html)。

## C#経験者への注意(この章全体の前提)

- C++には**GCがない**。誰がいつメモリを解放するか(所有権)を常にコードで表現する
- C++の変数は既定で**値**(コピーされる実体)。C#のclassのような「参照の共有」はポインタ/参照で明示する
- C++は「間違ったコードはコンパイルエラー」とは限らず、**未定義動作**として静かに壊れることがある(→ [18](/languages/cpp/undefined-behavior.html))

---

[全体目次](/guide/cpp-index.html) | 次: [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html)
