---
title: メモリと実行時を学ぶ
study:
  source: C++ Wiki
  status: published
  summary: C++の内部的な仕組みで「コードがどう機械語になるか」を調べたら、この章は「実行中のメモリで何が起き、何が壊れるのか」です。C#のGCが隠してくれていた世界を、寿命・所有権・バグのカタログ・アロケータ・GCとの比較の順で扱います。
  section: learning
  format: path
  domain: runtime
  collection: cpp-design
  order: 7
---

<div id="第7部-メモリと実行時" class="study-legacy-anchor" aria-hidden="true"></div>

# メモリと実行時を学ぶ

[C++の内部的な仕組み](/runtime/cpp-internals/)で「コードがどう機械語になるか」を調べたら、この章は「**実行中のメモリで何が起き、何が壊れるのか**」です。C#のGCが隠してくれていた世界を、寿命・所有権・バグのカタログ・アロケータ・GCとの比較の順で扱います。

## 読む順番

1. [記憶域期間とスコープ・寿命の違い](/runtime/memory/storage-duration-and-lifetime.html)
2. [所有権と借用](/runtime/memory/ownership-and-borrowing.html)
3. [メモリバグ図鑑(dangling・use-after-free・double free・leak・overflow)](/runtime/memory/memory-bugs.html)
4. [並行処理のバグ(data race・race condition・false sharing)](/runtime/memory/concurrency-bugs.html)
5. [キャッシュ局所性と AoS / SoA](/runtime/memory/cache-locality-aos-soa.html)
6. [placement new・allocator・memory pool・arena・fragmentation](/runtime/memory/allocators-and-pools.html)
7. [ガベージコレクションとの違い(C#管理ヒープ・UnityのGC Alloc)](/runtime/memory/gc-and-csharp-comparison.html)

仕上げに [演習](/runtime/memory/exercises.html)。

## 前提

- [値型と参照・ポインタ](/languages/cpp/values-pointers-references.html)、[RAII](/languages/cpp/raii.html)、[スマートポインタ](/languages/cpp/smart-pointers.html)、[メモリレイアウト](/runtime/cpp-internals/memory-layout.html) を先に読むと繋がりが良いです。

---

[全体目次](/guide/cpp-index.html) | 次: [記憶域期間とスコープ・寿命](/runtime/memory/storage-duration-and-lifetime.html)
