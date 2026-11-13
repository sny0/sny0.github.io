---
{
  "title": "実行時の仕組み",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": false,
    "section": "reference",
    "format": "index",
    "domain": "runtime"
  }
}
---

# 実行時の仕組み

確保・所有・解放から、GC、非同期、言語境界へつなぐ。

## 辞典の本文

- [C++の有界キューと条件変数](/runtime/bounded-worker-queues.html)
- [malloc・newから解放まで — アロケータとOSの境界](/runtime/memory/allocation-journey.html)
- [placement new・allocator・memory pool・arena allocator・fragmentation](/runtime/memory/allocators-and-pools.html)
- [RTTI・dynamic_cast・例外処理の仕組み](/runtime/cpp-internals/exceptions-and-rtti-impl.html)
- [vtable・vptr・仮想関数呼び出し](/runtime/cpp-internals/vtable-and-virtual-calls.html)
- [ガベージコレクションとの違い — C#の管理ヒープ・UnityのGC Allocとの比較](/runtime/memory/gc-and-csharp-comparison.html)
- [キャッシュ・分岐予測・SIMD](/runtime/cpp-internals/cache-branch-simd.html)
- [キャッシュ局所性と AoS / SoA](/runtime/memory/cache-locality-aos-soa.html)
- [ジョブシステムとワークスティーリング — 依存グラフをワーカーで実行する](/runtime/jobs-and-work-stealing.html)
- [スレッドと同期 — 共有状態の不変条件をmutexとlockで守る](/runtime/thread-synchronization.html)
- [メモリバグ図鑑 — dangling pointer・use-after-free・double free・memory leak・buffer overflow・stack overflow](/runtime/memory/memory-bugs.html)
- [メモリレイアウト・パディング・アラインメント・エンディアン](/runtime/cpp-internals/memory-layout.html)
- [ロックフリーの基礎 — CAS・リングキュー・メモリー回収](/runtime/lock-free-basics.html)
- [関数呼び出し・コールスタック・呼出規約・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)
- [記憶域期間とスコープ・寿命の違い](/runtime/memory/storage-duration-and-lifetime.html)
- [所有権と借用](/runtime/memory/ownership-and-borrowing.html)
- [並行処理のバグ — data race・race condition・false sharing](/runtime/memory/concurrency-bugs.html)

## この分野の学習ガイド

- [C++の内部的な仕組みを学ぶ](/runtime/cpp-internals/)
- [メモリと実行時を学ぶ](/runtime/memory/)
- [第6章 ポインタとメモリ管理](/guide/low-level/pointers-and-memory.html) — 学習計画・概要

## 作って試す

- [C++でワーカーの結果を描画側へ渡し、古い世代を捨てる](/practice/threads/asset-worker-handoff-observation.html)
- [C++とC#で在庫の確認・更新を一つのロックで守る](/practice/threads/inventory-synchronization.html)
- [C++の内部的な仕組みの演習](/runtime/cpp-internals/exercises.html)
- [メモリと実行時の演習](/runtime/memory/exercises.html)

## 扱う範囲・増補する項目

- alloc内部
- スタック・ヒープ
- RAII
- 仮想メモリ
- GC
- IL・JIT/AOT
- 例外
- 非同期
- FFI
