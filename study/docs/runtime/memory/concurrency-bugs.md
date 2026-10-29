---
title: "並行処理のバグ — data race・race condition・false sharing"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "data race(データ競合): 2つ以上のスレッドが同期なしに同じメモリに触れ、少なくとも1つが書き込み——C++では未定義動作 race condition(競合状態): 実行タイミング(順序)によって結果が変わる論理バグ。データ競合がなくても起きる"
---

# 並行処理のバグ — data race・race condition・false sharing

## 一言で言うと

- **data race(データ競合)**: 2つ以上のスレッドが同期なしに同じメモリに触れ、少なくとも1つが書き込み——C++では**未定義動作**
- **race condition(競合状態)**: 実行タイミング(順序)によって結果が変わる**論理**バグ。データ競合がなくても起きる
- **false sharing(偽共有)**: 別々のデータがたまたま同じ[キャッシュライン](/runtime/cpp-internals/cache-branch-simd.html)に載り、ライン所有権の奪い合いで性能が激減する現象(正しさは壊れない)

## data race

```cpp
// C++20(問題例)— 2スレッドが同期なしでカウンタを増やす
int killCount = 0;
// スレッドA: ++killCount;   スレッドB: ++killCount;
// ++ は 読み→加算→書き の3ステップ。交錯すると増分が消える。
// そして規格上は「値がおかしい」どころか未定義動作(何が起きてもよい)
```

なぜUBなのか: コンパイラとCPUは**シングルスレッド前提で命令を並べ替え・キャッシュ**するため([最適化](/runtime/cpp-internals/optimization-and-ub.html))、同期なしの共有アクセスには意味を定義できない。「変数への書き込みが他スレッドから**いつ見えるか**」は同期操作(mutex/atomic)を使って初めて保証されます(C++メモリモデル)。

```cpp
// 修正1: アトミック(単一変数の単純操作向け)
std::atomic<int> killCount{0};
killCount.fetch_add(1);        // 不可分な読み書き+可視性の保証

// 修正2: ミューテックス(複数の操作・データをまとめて守る)
std::mutex m;
{ std::lock_guard lock(m); killCount++; combo.Update(); }   // RAIIでロック(→ RAII)
```

## race condition(データ競合とは別物)

```cpp
// 各操作は同期済みでも、順序のバグは残る
if (inventory.Count(potionId) > 0) {     // スレッドA: 在庫1を確認
    // ← ここでスレッドBが最後の1個を使った
    inventory.Remove(potionId);          // Aも消費 → 在庫-1(二重消費)
}
// 「確認してから使う」(check-then-act)が不可分でない、という設計の穴。
// 修正: 確認と消費を1つのロック区間に/「TryConsume」のような不可分APIに
```

**data raceを直してもrace conditionは残る**——atomicにしただけで安心しない、が重要です。

## false sharing

```cpp
// 各スレッドが「自分専用」のカウンタに書いているのに遅い
struct Counters {
    int threadA;   // 同じ64バイトのキャッシュラインに同居
    int threadB;   // → 書き込みのたびにライン所有権が2コア間を往復(性能数分の1)
};
// 修正: alignas(64) でラインを分ける
struct alignas(64) PaddedCounter { std::atomic<int> value{0}; };
```

正しさは壊れないため**プロファイルでしか見つからない**。並列ジョブの結果書き込み先の設計(スレッドごとに独立したライン/ローカル集計→最後に統合)が定石です。

## ゲーム開発での現実的な指針

1. **共有可変状態を最小化するのが最強の対策**: ジョブには入力をコピー/読み取り専用で渡し、出力は分離バッファへ([Double Buffer](/game/patterns/optimization-patterns.html)、ジョブごとの結果配列→統合)
2. データを**フレームのフェーズ**で区切る(更新フェーズは書く人が1人/描画フェーズは全員読むだけ)——エンジンのジョブグラフの考え方
3. ロックの粒度: 細かすぎ=デッドロックと複雑さ、粗すぎ=並列性の喪失。**まず「共有しない」を検討してからロック**
4. UnityのJob System・UEのTaskGraphは、この規律(依存宣言・読み書き分離)をAPIで強制する仕組み

## C#との対応

- C#にもdata race/race conditionは**普通にある**(lock, Interlocked, volatileが対応物)。ただしC#のデータ競合は「未定義動作」ではなく壊れ方がやや穏やか(tearingが起きない型のサイズ保証など)——それでもバグはバグ
- UnityのJob Systemが「同じNativeArrayへの並行書き込み」をSafety Systemで検出するのは、data race検出の実行時版
- C++の`std::thread`/`std::async`/`std::atomic`はC#の`Thread`/`Task`/`Interlocked`に概念対応

## Unity開発者が誤解しやすい点

1. 「Unityではメインスレッドだけ考えればよかった」— C++エンジン開発では並列が前提。**「どのデータを誰がいつ触るか」の設計figureが必須**
2. 「atomicにすれば全部安全」— 単一変数の単純操作だけ。check-then-actや複数データの整合はロック/設計で守る
3. 「たまに変になる」バグをprintfで追う——並行バグはタイミングで消える(ハイゼンバグ)。**ThreadSanitizer (TSan)** が検出ツール(GCC/Clang。ゲーム全体では重いのでテストで)

## 理解度チェック

1. data raceとrace conditionの違いを、それぞれの修正手段と共に言えますか。
2. data raceがC++で「未定義動作」とされる背景(コンパイラ・CPUの前提)は?
3. false sharingはなぜプロファイルでしか見つからないのですか。

## 演習

samples/atomic_counter.cpp(検証済み: 2スレッドで非atomic/atomicカウンタを増やし結果を比較 — 非atomic版の結果が環境により欠損することの観察)を実行してください。次に「所持金の確認→購入」をTryBuy(不可分API)に設計し直す擬似コードを書いてください。

---

前: [メモリバグ図鑑](/runtime/memory/memory-bugs.html) | [カテゴリ目次](/runtime/memory/) | 次: [キャッシュ局所性と AoS/SoA](/runtime/memory/cache-locality-aos-soa.html)
