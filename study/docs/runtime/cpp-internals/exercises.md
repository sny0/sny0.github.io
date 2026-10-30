---
title: C++の内部的な仕組みの演習
study:
  source: C++ Wiki
  status: published
  summary: "次のエラー・現象は、ビルドパイプラインのどの段階の問題ですか(旅の地図の①〜⑦で答え、理由を一言)。 error: 'Enemy' was not declared in this scope"
  section: practice
  format: exercise
  domain: runtime
  collection: cpp-exercises
  order: 6
---

<div id="第6部-演習-—-c-の内部的な仕組み" class="study-legacy-anchor" aria-hidden="true"></div>

# C++の内部的な仕組みの演習

## 問1. 概念確認

次のエラー・現象は、ビルドパイプラインのどの段階の問題ですか([旅の地図](/runtime/cpp-internals/build-pipeline-journey.html)の①〜⑦で答え、理由を一言)。

1. `error: 'Enemy' was not declared in this scope`
2. `undefined reference to 'Enemy::TakeDamage(int)'`
3. `multiple definition of 'g_config'`
4. 起動時に「MSVCP140.dll が見つかりません」
5. main()の最初の行にブレークポイントを張ったのに、その前にクラッシュする

<details><summary>解答</summary>

1. ②コンパイル(宣言が翻訳単位に見えていない → includeか前方宣言不足)。2. ④リンク(定義を持つ.o/ライブラリが未リンク)。3. ④リンク(ODR違反 — ヘッダーで変数を定義した等)。4. ⑤ローダー(動的ライブラリの解決失敗)。5. ⑥静的初期化(グローバルオブジェクトのコンストラクタ内クラッシュ)。
</details>

## 問2. コード読解

```cpp
// widget.h
#pragma once
class Renderer;                    // (A)
class Widget {
public:
    void Draw(Renderer& r);        // (B)
private:
    Renderer* renderer_;           // (C)
    // Renderer fallback_;         // (D) ← コメントを外すとエラー
};
```

(A)の宣言だけで(B)(C)が成立し、(D)が失敗する理由を、コンパイラが必要とする情報の観点で説明してください。

<details><summary>解答</summary>

(A)は前方宣言で「Rendererという型が存在する」ことだけ伝える。(B)(C)はポインタ・参照であり、**サイズが8バイト(ポインタ)と分かれば足りる**——中身を知る必要がない。(D)は実体をメンバに置くため、Widgetのサイズ計算にRendererの**完全な定義(サイズ・レイアウト)**が必要 → includeが要る([翻訳単位とヘッダー](/runtime/cpp-internals/translation-units-and-headers.html))。
</details>

## 問3. 問題のあるコードの改善

「utils.h に `int Random(int max) { ... }` と書いたら、2つ目の.cppで使った途端リンクエラーになった」。原因と修正方法を**3通り**挙げ、それぞれの使い分けを書いてください。

<details><summary>解答</summary>

原因: 非inline関数の定義がヘッダー経由で2翻訳単位に入り、[ODR](/runtime/cpp-internals/translation-units-and-headers.html)違反(多重定義)。修正: (1) `inline` を付ける — 小さくてヘッダーに置きたい関数。(2) 宣言だけ残し定義をutils.cppへ — 大きい関数・変更頻度が高い関数(再コンパイル範囲を狭める)。(3) `static`/無名namespace — 翻訳単位ごとに別実体でよい場合のみ(状態を持つと単位ごとに別になる罠あり)。
</details>

## 問4. 設計比較

10万発の弾を毎フレーム更新します。(a) `std::vector<Bullet*>`(各弾はnew)、(b) `std::vector<Bullet>`、(c) SoA(座標配列と速度配列を分離)の3案を、キャッシュライン・プリフェッチ・SIMDの観点で比較してください。

<details><summary>解答の要点</summary>

(a) ポインタ追跡で毎要素キャッシュミスの可能性、プリフェッチ効かず、SIMD不可 — 最悪。(b) 連続配置でライン単位に載る+順走査プリフェッチ有効。Bulletが大きいと1ラインの個体数が減る。(c) 更新で使うデータだけが隙間なく並び、ライン効率最大+自動ベクトル化の条件が揃う — 大量処理の理想形。ただし(c)はコードの素直さを失うので、10万発という規模(計測)が正当化の根拠([キャッシュ](/runtime/cpp-internals/cache-branch-simd.html)、[AoS/SoA](/runtime/memory/cache-locality-aos-soa.html))。
</details>

## 問5. デバッグ問題

「Releaseビルドでのみ、この関数の戻り値がおかしい」:

```cpp
int Sum(const std::vector<int>& v) {
    int total;                          // ←
    for (int x : v) total += x;
    return total;
}
```

原因、Debugで動いてしまう理由、恒久対策(コード+ツール)を答えてください。

<details><summary>解答</summary>

原因: `total` 未初期化のまま加算(UB)。Debugでは(処理系によっては)スタックが0埋めされ偶然正しく見える。Releaseではレジスタのゴミ値から開始([UBと最適化](/runtime/cpp-internals/optimization-and-ub.html))。対策: `int total = 0;`(コード)、`-Wall -Wextra`(-Wuninitializedが警告)、UBSan/MSanの常用([UB](/languages/cpp/undefined-behavior.html))。
</details>

## 問6. 説明問題

「仮想関数のコストは間接呼び出しそのものより、インライン化の阻害だ」と言われる理由を、[vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html)と[最適化](/runtime/cpp-internals/optimization-and-ub.html)の知識で3〜4文で説明してください。

<details><summary>解答例</summary>

間接call自体は数サイクルで、予測が当たれば安い。しかし呼び先が実行時まで不明だと、コンパイラは本体を展開(インライン化)できない。インライン化は呼び出し除去そのものより、展開後に起きる定数伝播・デッドコード除去・ベクトル化などの**連鎖最適化の入口**であり、それが全部止まる。だからホットループでは仮想呼び出し1個の数サイクルではなく、「最適化されなかったループ全体」の差として現れる。
</details>

## 問7. 小規模実装問題

[samples/tu_demo/](/tools/build/samples/tu-demo.html) を出発点に、次を実施してください。

1. 新しいクラス `Spawner`(enemy.hに依存)をヘッダー+cppで追加し、3ファイル構成でビルドする
2. `nm`(またはobjdump)で spawner.o の「提供シンボル」「未解決シンボル」を確認する
3. enemy.h のインクルードを前方宣言に置き換えられるか検討し、できる/できない理由をメンバの持ち方から説明する

<details><summary>評価基準</summary>

(1) ODR違反なくビルドが通る。(2) 未解決シンボル(U表示)がEnemyのメンバ関数であることを確認できる。(3) 「実体メンバなら定義が必要、ポインタ・参照なら前方宣言で足りる」を自分の構成で説明できる([翻訳単位](/runtime/cpp-internals/translation-units-and-headers.html)、[シンボル](/runtime/cpp-internals/symbols-and-linkage.html))。
</details>

---

関連項目：[コンパイラ最適化とUB](/runtime/cpp-internals/optimization-and-ub.html) / [学習ガイド](/runtime/cpp-internals/) / [メモリと実行時を学ぶ](/runtime/memory/)
