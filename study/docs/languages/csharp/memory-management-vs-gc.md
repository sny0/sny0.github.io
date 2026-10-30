---
title: 手動メモリ管理と GC
study:
  source: C++ Wiki
  status: published
  summary: C++のRAIIと所有権、C#・UnityのGCと明示的な資源解放を対応させる。
  section: reference
  format: article
  domain: languages
---

# 手動メモリ管理と GC

本論は[ガベージコレクションとの違い — C#の管理ヒープ・UnityのGC Allocとの比較](/runtime/memory/gc-and-csharp-comparison.html)で詳述済み。このページはUnity開発者の視点からの**要点整理と実践対応表**です。

## 「手動」という誤解を先に解く

C++のメモリ管理は「毎回deleteを手で書く」ではありません。現代C++は:

1. **値とスコープ**(そもそもヒープを使わない)— 第一選択
2. **RAII+スマートポインタ**(解放は型が自動でやる)— ヒープが要るとき
3. **生のnew/delete** — RAII部品の内部実装のみ(ゲームロジックには現れない)

「手動」なのは**解放のタイミングと所有権の設計**であって、解放作業そのものではない——ここがC#経験者の第一の発見です。

## 実践対応表(Unityでの習慣 → C++での対応)

| Unityでの習慣 | C++での対応 | 参照 |
|---|---|---|
| GC Allocをプロファイラで監視 | ヒープ確保をプロファイラ/自作カウンタで監視 | [アロケータ](/runtime/memory/allocators-and-pools.html) |
| Update内でnewしない | フレーム内のヒープ確保を避ける(値・再利用・アリーナ) | 同上 |
| オブジェクトプール | Object Pool(同じ)+ memory pool | [Object Pool](/game/patterns/object-pool.html) |
| struct/NativeArrayで管理外に置く | それが**通常の状態**(全部が管理外) | [値セマンティクス](/languages/csharp/pointers-references-value-semantics.html) |
| 参照をnullにしてGCに任せる | 所有者の破棄=即解放。非所有参照の無効化は**自分の問題** | [所有権](/runtime/memory/ownership-and-borrowing.html) |
| Destroy(gameObject)+MissingReference例外 | delete+dangling(**例外は出ない**。UB) | [メモリバグ](/runtime/memory/memory-bugs.html) |
| WeakReference(ほぼ使わない) | weak_ptr/世代ハンドル(**日常の道具**) | [スマートポインタ](/languages/cpp/smart-pointers.html) |

## 思考の転換ポイント3つ

1. **「確保コスト」の意識が逆転する**: C#では確保は速く回収が痛い。C++では汎用確保がそこそこ重く、解放は決定的。→ C++では「フレーム中の確保そのもの」を設計で消す(事前確保・プール・アリーナ)
2. **「参照を持つ」ことの意味が逆転する**: C#の参照は延命保証つき。C++の参照・ポインタは**ただの矢印**(寿命は別管理)。「誰が所有者か」を先に決めるのがC++の設計手順
3. **リークの形が変わる**: C#のリークは「参照の残留」(イベント購読・static)。C++のリークは「所有者の不在」(生new・循環shared_ptr)。**どちらも設計の失敗**であり、GCはそれを免除しない

## 実務でのハイブリッド感覚

- UnityでもDOTS/NativeArrayを使えば「手動管理の世界」に半分入っていた(Allocator.Temp/Persistent、Dispose必須)——あれがC++の日常
- UEに行くと「C++なのにUObjectはGC管理」という逆ハイブリッド(→ [UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr](/game/unreal/gc-and-object-pointers.html))
- **どの言語・エンジンでも「寿命のパターンを見つけて構造化する」のが本質**で、道具(GC/RAII/プール)はその実装手段

## 理解度チェック

1. 「C++は手動メモリ管理」という表現のどこが不正確ですか。
2. C#とC++で「参照を持つ」の意味はどう違いますか。
3. 両言語のリークの典型形を1つずつ挙げてください。

## 演習

[メモリと実行時の演習](/runtime/memory/exercises.html)の問4(当たり判定結果の一時データ)を、Unity C#で同じ問題を解く場合(List再利用/NativeArray+Temp)と対比しながら解いてください。「同じ問題に同じ答え(再利用)を出している」ことの確認が目的です。

---

関連項目：[ネイティブビルドとIL2CPP](/languages/csharp/il2cpp.html) / [学習ガイド](/languages/csharp/) / [C++例外とC#例外](/languages/csharp/exceptions-comparison.html)
