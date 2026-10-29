---
title: "auto・decltype・constexpr・consteval(型推論とコンパイル時計算)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "auto は「初期化子から型をコンパイラに推論させる」機能。動的型付けではありません——型はコンパイル時に完全に確定し、以後変わりません(C#の var と同じ)。 「auto = コピー、auto& = 参照、const auto& = 読み取り参照」と覚える。C#のvarは参照型なら常に参照なの"
---

# auto・decltype・constexpr・consteval(型推論とコンパイル時計算)

## auto(型推論)

### 一言で言うと

`auto` は「**初期化子から型をコンパイラに推論させる**」機能。動的型付けではありません——型はコンパイル時に完全に確定し、以後変わりません(C#の `var` と同じ)。

```cpp
// C++20
auto hp = 100;                 // int
auto ratio = 0.5f;             // float
auto it = enemies.begin();     // std::vector<Enemy>::iterator(書くと長い型の主用途)
auto& e = enemies[0];          // Enemy&(参照が欲しければ&を書く — 重要!)
const auto& cfg = GetConfig(); // const参照
```

### 落とし穴: autoは参照とconstを「落とす」

```cpp
Enemy& GetBoss();
auto b = GetBoss();     // bは Enemy(コピー!)— 参照は推論で剥がれる
auto& b2 = GetBoss();   // Enemy&(意図通り)
```

**「auto = コピー、auto& = 参照、const auto& = 読み取り参照」**と覚える。C#のvarは参照型なら常に参照なので、この罠はC++特有です。

### 使いどころの指針

- 書く: イテレータ、ラムダの型(書けない)、明らかに冗長な型名、範囲for(`for (const auto& e : enemies)`)
- 書かない: 型自体が情報であるとき(`auto damage = Calc();` — int? float? 単位は?)。数値型は明示が安全(意図しない整数/浮動小数の推論)

## decltype

「式の型」をそのまま取り出す道具。テンプレートの戻り値型や、変数と同じ型の別変数を作るときに使う中級機能です。

```cpp
int x = 10;
decltype(x) y = 20;            // int(xと同じ型)
// 主戦場はテンプレート: decltype(a + b) など「演算結果の型」が事前に分からない場面
```

日常コードでは登場は少なめ。「テンプレートを書く側になったら本格的に使う」でOKです。

## constexpr(コンパイル時計算)

### 一言で言うと

「**この計算はコンパイル時に実行できる**」と宣言する仕組み。実行ファイルには計算結果だけが埋め込まれ、実行時コストがゼロになります。

```cpp
// C++20
constexpr int kMaxLevel = 99;                    // コンパイル時定数(#defineの安全な代替)

constexpr int ExpForLevel(int level) {           // コンパイル時にも実行時にも使える関数
    int exp = 0;
    for (int i = 1; i < level; ++i) exp += i * 100;
    return exp;
}

constexpr int kMaxExp = ExpForLevel(kMaxLevel);  // コンパイル時に計算→定数として埋め込み
int runtime = ExpForLevel(playerLevel);          // 実行時にも普通に呼べる
```

```cpp
// 経験値テーブルをコンパイル時に生成する例(C++20: constexprでループ・配列OK)
constexpr auto MakeExpTable() {
    std::array<int, 100> t{};
    for (int i = 0; i < 100; ++i) t[i] = ExpForLevel(i);
    return t;
}
constexpr auto kExpTable = MakeExpTable();   // 実行ファイルに完成済みテーブルが焼き込まれる
```

検証済みサンプル: <a href="/study/samples/cpp/constexpr_table.cpp">samples/constexpr_table.cpp</a>

### #define との違い

`#define MAX_LEVEL 99` は[プリプロセッサ](/runtime/cpp-internals/build-pipeline-journey.html)の文字列置換(型なし・スコープなし・デバッガに出ない)。`constexpr` は型付き・スコープあり・言語の一部。**定数は constexpr 一択**です。

### constexpr if(テンプレートとの相棒)

```cpp
template <typename T>
void Log(const T& v) {
    if constexpr (std::is_floating_point_v<T>) {   // コンパイル時分岐: 選ばれない側はコンパイルすらされない
        // 小数用フォーマット
    } else {
        // それ以外
    }
}
```

## consteval(C++20)

「**必ずコンパイル時に**実行される関数」(constexprは「できれば」、constevalは「必ず」)。実行時に呼ぼうとするとコンパイルエラー。

```cpp
consteval std::uint32_t Fnv1a(std::string_view s) {   // 文字列ハッシュを必ずコンパイル時に
    std::uint32_t h = 2166136261u;
    for (char c : s) { h ^= static_cast<std::uint8_t>(c); h *= 16777619u; }
    return h;
}
constexpr auto kHash = Fnv1a("player_idle");   // 実行ファイルには数値だけが残る
```

用途: 「実行時に走ってはいけない」ことを保証したい計算(ID生成、鍵の埋め込み検査など)。

## C#との違い

- C#の`const`はコンパイル時定数だが**単純な値のみ**。ループや関数呼び出しを含む計算のコンパイル時実行(constexpr関数)に相当する仕組みはない(Source Generatorが部分的な代替)
- C#の`var`とC++の`auto`はほぼ同じ思想だが、C++は参照/constが剥がれる点が異なる(上記)

## Unity開発者が誤解しやすい点

1. 「テーブルはScriptableObjectかJSONで持つもの」— C++では**コンパイル時生成**という第3の選択肢がある(ロード時間ゼロ・改竄不能・ただし変更にはリビルド)
2. `auto` を「動的型」と誤解しない(varと同じ静的推論)
3. 文字列比較をIDに使う場面(アニメ名、イベント名)は、constevalハッシュで**コンパイル時に数値化**するのがC++ゲーム開発の定石(UnityのAnimator.StringToHashと同じことが言語機能でできる)

## ゲーム開発での使用例

- 定数・調整値(`constexpr float kGravity = -9.8f;`)
- ルックアップテーブル(経験値、sin近似、CRCテーブル)のコンパイル時生成
- 文字列ハッシュによるID化(アセットID、ステートID)
- コンパイル時の設定検証(テーブルの整合性チェックをstatic_assertで)

## 使う場面 / 使わない場面

- **constexpr**: 定数はすべて。コンパイル時に決まる計算・テーブル
- **使わない**: 実行時データに依存する計算(当然不可)。巨大な計算のコンパイル時実行はビルド時間を食う(テーブル生成が数秒かかり始めたら外部ツール生成へ)
- **auto**: 冗長な型名の省略。型が情報になる場所では書かない

## 理解度チェック

1. `auto b = GetBoss();` の罠は何ですか。
2. constexprとconstevalの違いは?
3. #defineよりconstexprが優れる点を3つ挙げてください。

## 演習

samples/constexpr_table.cpp の経験値テーブルを「レベル間の必要経験値が単調増加であること」を `static_assert` で検証するように拡張してください(コンパイル時にバランスデータの整合性チェックが走る体験が目的です)。

---

前: [例外](/languages/cpp/exceptions.html) | [カテゴリ目次](/languages/cpp/) | 次: [static・inline・friend](/languages/cpp/static-inline-friend.html)
