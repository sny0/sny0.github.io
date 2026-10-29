---
title: "第6部: C++の内部的な仕組み"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "「書いたコードが、どうやって動く機械語になり、実行時に何が起きているのか」を扱う章です。UnityのC#では意識しなくてよかった層——だからこそUnity経験者のC++理解の穴になりやすい部分です。"
---

# 第6部: C++の内部的な仕組み

「書いたコードが、どうやって動く機械語になり、実行時に何が起きているのか」を扱う章です。UnityのC#では意識しなくてよかった層——だからこそUnity経験者のC++理解の穴になりやすい部分です。

## 読む順番

1. [main.cpp から CPU命令までの旅(全体像)](/runtime/cpp-internals/build-pipeline-journey.html) — **まずこれ。この章の地図**
2. [翻訳単位・ヘッダー・include・前方宣言・ODR](/runtime/cpp-internals/translation-units-and-headers.html)
3. [シンボル・名前修飾・リンケージ・ABI](/runtime/cpp-internals/symbols-and-linkage.html)
4. [オブジェクトファイル・実行ファイル・静的/動的ライブラリ・DLL](/runtime/cpp-internals/object-files-and-libraries.html)
5. [テンプレートの実体化と inline の実際](/runtime/cpp-internals/template-instantiation-and-inline.html)
6. [vtable・vptr・仮想関数呼び出し](/runtime/cpp-internals/vtable-and-virtual-calls.html)
7. [RTTI・dynamic_cast・例外処理の仕組み](/runtime/cpp-internals/exceptions-and-rtti-impl.html)
8. [メモリレイアウト・パディング・アラインメント・エンディアン](/runtime/cpp-internals/memory-layout.html)
9. [関数呼び出し・コールスタック・呼出規約・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)
10. [キャッシュ・分岐予測・SIMD](/runtime/cpp-internals/cache-branch-simd.html)
11. [コンパイラ最適化・UBの影響・Debug/Release・ゼロコスト抽象化](/runtime/cpp-internals/optimization-and-ub.html)

仕上げに [演習](/runtime/cpp-internals/exercises.html)。

## この章の約束

- **標準の保証と典型実装を区別**します。「vtableで実装される」等は標準の要求ではなく主流実装(MSVC/GCC/Clang)の説明です(仮想関数の**意味**だけが標準で、**実装方法**は自由)
- 手元で確かめる道具: [Compiler Explorer (godbolt.org)](https://godbolt.org/) にコードを貼るとアセンブリが見えます。この章の内容はすべて自分の目で確認できます

---

[全体目次](/guide/cpp-index.html) | 次: [main.cpp から CPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html)
