---
{
  "title": "実行時の仕組み",
  "study": {
    "source": "統合ガイド",
    "kind": "分野索引",
    "status": "初版",
    "domain": "runtime",
    "generated": true,
    "catalog": true,
    "summary": "確保・所有・解放から、GC、非同期、言語境界へつなぐ。"
  }
}
---

# 実行時の仕組み

確保・所有・解放から、GC、非同期、言語境界へつなぐ。

## いま読める項目

- [第6章 ポインタとメモリ管理 ── ゲームプログラマの生命線](/guide/low-level/pointers-and-memory.html) — 学習ガイド
- [main.cpp から CPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html) — 本文
- [キャッシュ・分岐予測・SIMD](/runtime/cpp-internals/cache-branch-simd.html) — 本文
- [RTTI・dynamic_cast・例外処理の仕組み](/runtime/cpp-internals/exceptions-and-rtti-impl.html) — 本文
- [第6部 演習 — C++の内部的な仕組み](/runtime/cpp-internals/exercises.html) — 演習
- [関数呼び出し・コールスタック・呼出規約・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html) — 本文
- [第6部: C++の内部的な仕組み](/runtime/cpp-internals/) — 索引
- [メモリレイアウト・パディング・アラインメント・エンディアン](/runtime/cpp-internals/memory-layout.html) — 本文
- [オブジェクトファイル・実行ファイル・静的ライブラリ・動的ライブラリ・DLL](/runtime/cpp-internals/object-files-and-libraries.html) — 本文
- [コンパイラ最適化・未定義動作の影響・Debug/Release・ゼロコスト抽象化](/runtime/cpp-internals/optimization-and-ub.html) — 本文
- [シンボル・名前修飾・リンケージ・ABI](/runtime/cpp-internals/symbols-and-linkage.html) — 本文
- [テンプレートの実体化と inline の実際](/runtime/cpp-internals/template-instantiation-and-inline.html) — 本文
- [翻訳単位・ヘッダー・include・前方宣言・ODR](/runtime/cpp-internals/translation-units-and-headers.html) — 本文
- [vtable・vptr・仮想関数呼び出し](/runtime/cpp-internals/vtable-and-virtual-calls.html) — 本文
- [placement new・allocator・memory pool・arena allocator・fragmentation](/runtime/memory/allocators-and-pools.html) — 本文
- [キャッシュ局所性と AoS / SoA](/runtime/memory/cache-locality-aos-soa.html) — 本文
- [並行処理のバグ — data race・race condition・false sharing](/runtime/memory/concurrency-bugs.html) — 本文
- [第7部 演習 — メモリと実行時](/runtime/memory/exercises.html) — 演習
- [ガベージコレクションとの違い — C#の管理ヒープ・UnityのGC Allocとの比較](/runtime/memory/gc-and-csharp-comparison.html) — 本文
- [第7部: メモリと実行時](/runtime/memory/) — 索引
- [メモリバグ図鑑 — dangling pointer・use-after-free・double free・memory leak・buffer overflow・stack overflow](/runtime/memory/memory-bugs.html) — 本文
- [所有権と借用](/runtime/memory/ownership-and-borrowing.html) — 本文
- [記憶域期間とスコープ・寿命の違い](/runtime/memory/storage-duration-and-lifetime.html) — 本文

## これから充実させる項目

- alloc内部
- スタック・ヒープ
- RAII
- 仮想メモリ
- GC
- IL・JIT/AOT
- 例外
- 非同期
- FFI

本文・概要・学習計画を区別しながら増補します。[疑問から選ぶ読み進め方](/guide/learning-paths.html)にも、この分野とのつながりをまとめています。
