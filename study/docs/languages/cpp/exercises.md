---
title: C++の言語機能の演習
study:
  source: C++ Wiki
  status: published
  summary: 正誤を判定し、誤りは訂正してください。 Enemy b = a; は、C++ではaとbが同じ実体を指す。 std::move(x) はxの中身を移動させる関数である。 Rule of Zeroとは、特殊メンバ関数を一切書かずに済む設計を指す。
  section: practice
  format: exercise
  domain: languages
  collection: cpp-exercises
  order: 5
---

<div id="第5部-演習-—-c-の言語機能" class="study-legacy-anchor" aria-hidden="true"></div>

# C++の言語機能の演習

## 問1. 概念確認

正誤を判定し、誤りは訂正してください。

1. `Enemy b = a;` は、C++ではaとbが同じ実体を指す。
2. `std::move(x)` はxの中身を移動させる関数である。
3. Rule of Zeroとは、特殊メンバ関数を一切書かずに済む設計を指す。
4. C++のテンプレートは、C#のジェネリックと同様に1つの共有コードで動く。
5. 基底クラスのポインタ経由でdeleteするなら、基底に仮想デストラクタが必要。

<details><summary>解答</summary>

1. **誤**。コピー(別実体)。共有したければ参照/ポインタを明示([値と参照](/languages/cpp/values-pointers-references.html))。2. **誤**。moveはキャストで何も動かさない。動かすのはムーブコンストラクタ/代入([ムーブ](/languages/cpp/ctor-dtor-copy-move.html))。3. **正**(リソースはvector/unique_ptr等の部品に任せる)。4. **誤**。型ごとにコードが生成される([テンプレート](/languages/cpp/templates-and-concepts.html))。5. **正**([継承と仮想関数](/languages/cpp/inheritance-and-virtual.html))。
</details>

## 問2. コード読解

```cpp
std::vector<Enemy> enemies;
Enemy* boss = &enemies.emplace_back(Enemy{});   // 1体目を追加してポインタ保持
enemies.push_back(Enemy{});                      // 2体目を追加
boss->hp = 0;                                    // ???
```

何が起きる可能性があり、なぜですか。安全な書き方を2つ挙げてください。

<details><summary>解答</summary>

2体目のpush_backで再確保が起きると、1体目は新しいメモリへ引っ越し、`boss` はdangling(解放済み領域を指す)。`boss->hp = 0` は**未定義動作**([配列と文字列](/languages/cpp/arrays-and-strings.html)、[UB](/languages/cpp/undefined-behavior.html))。安全策: (a) 事前に `reserve` して再確保を防ぐ(脆い)、(b) ポインタではなく**インデックスやハンドル**で参照する(推奨)、(c) `vector<unique_ptr<Enemy>>` にして実体を動かさない。
</details>

## 問3. 問題のあるコードの改善

```cpp
class TextureManager {
public:
    Texture* Load(const std::string& path) {
        Texture* t = new Texture(path);
        textures_.push_back(t);
        return t;
    }
    ~TextureManager() { /* deleteを書き忘れている */ }
private:
    std::vector<Texture*> textures_;
};
```

所有権の観点で問題を指摘し、現代C++に書き直してください。

<details><summary>解答の要点</summary>

問題: newの所有者が型から不明(Loadの戻り値は所有?借用?)、デストラクタのdelete忘れでリーク、二重解放の危険。改善: `std::vector<std::unique_ptr<Texture>>` で所有をManagerに固定し、`Load` は非所有の `Texture*`(または参照)を返す——「所有はスマートポインタ、貸出は生ポインタ」の規約([スマートポインタ](/languages/cpp/smart-pointers.html))。共有アセットとして複数システムが寿命に関与するなら `shared_ptr` 案もあるが、その必要性を先に問うのが筋([判断ガイド](/design/decisions/cpp-choices.html))。
</details>

## 問4. 設計比較

「ダメージ計算式を差し替え可能にする」を (a) 仮想関数(`IDamageFormula`)、(b) テンプレート引数(`template<class Formula>`)、(c) `std::function` で実装する場合の、決定時期・実行時コスト・柔軟性を比較し、「実行中に式が変わることはないが、ビルド構成で式が違う」場合の選択を答えてください。

<details><summary>解答の要点</summary>

(a) 実行時差し替え可・仮想呼び出しコスト・型は1つ。(b) コンパイル時固定・コストゼロ・型が分岐(使う側もテンプレート化)。(c) 実行時差し替え可・型消去のコスト(間接呼び出し+ヒープの可能性)・保存が楽。この条件(実行中不変・構成で違う)なら**(b)テンプレート**(または`constexpr if`/型エイリアス切替)が適合([テンプレートか仮想関数か](/design/decisions/cpp-choices.html))。
</details>

## 問5. デバッグ問題

「デバッグビルドでは正常、リリースビルドだけで敵の初期HPがおかしくなる」。疑うべき原因を優先順に2つ挙げ、それぞれの調査手段を書いてください。

<details><summary>解答の要点</summary>

(1) **未初期化変数**(デバッグでは0埋めされがち、リリースではゴミ値 — 実装依存の挙動差)。調査: 警告(-Wall/-Wuninitialized)、MSVCの/RTC、UBSan/MSan。(2) **UBを前提にした最適化の顕在化**(範囲外書き込みが配置の違いで露見等)。調査: AddressSanitizer。いずれも「リリースだけ壊れる=最適化のバグ」ではなく**自分のUB**をまず疑うのが定石([UB](/languages/cpp/undefined-behavior.html)、[Debug/Release](/tools/build/build-configurations.html))。
</details>

## 問6. 説明問題

「C++にGCがないのに、なぜモダンC++ではメモリリークが『あまり問題にならない』と言われるのか」を、RAII・所有権・Rule of Zeroの用語を使って4文以内で説明してください。

<details><summary>解答例</summary>

モダンC++では、メモリの解放をプログラマの記憶力ではなく型(デストラクタ)に担わせる——これがRAII。所有権を`unique_ptr`/`vector`などの部品に一元化すれば、所有者の破棄と同時に解放が言語仕様で保証される。ゲームロジック側はRule of Zeroに従い特殊メンバ関数を書かないだけでよい。リークが起きるのは生のnew/deleteや循環`shared_ptr`など、この規約から外れた場所に限られる([RAII](/languages/cpp/raii.html)、[スマートポインタ](/languages/cpp/smart-pointers.html))。
</details>

## 問7. 小規模実装問題

「クールダウン管理クラス `CooldownSet`」を実装してください。要件: スキルID(enum class)ごとに残り秒数を管理、`Start(id, seconds)` / `Update(dt)` / `IsReady(id) const`。実装後、以下を自己レビュー:

- const correctnessは守れているか(`IsReady`はconstか)
- コンテナ選択の理由(unordered_map? 固定配列?)を言えるか
- Rule of Zeroになっているか

<details><summary>参考実装の骨子</summary>

<a href="/study/samples/cpp/cooldown_set.cpp">samples/cooldown_set.cpp</a>(検証済み)。スキル数が少数固定なら `std::array<float, N>`(enumをインデックス化)が速くて単純、可変なら `unordered_map<SkillId, float>`。どちらもメンバはコンテナのみでRule of Zero。`Update`で0未満に下げない、`IsReady`は「登録なし=Ready」とみなす、などの仕様判断を明記できれば合格。
</details>

---

関連項目：[未定義動作](/languages/cpp/undefined-behavior.html) / [学習ガイド](/languages/cpp/) / [C++の内部的な仕組みを学ぶ](/runtime/cpp-internals/)
