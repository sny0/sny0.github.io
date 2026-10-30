---
title: 関数オーバーロードと演算子オーバーロード
study:
  source: C++ Wiki
  status: published
  summary: "関数オーバーロード: 同名の関数を引数の型・数違いで複数定義し、コンパイル時に引数から選ばせる仕組み 演算子オーバーロード: + == [] などの演算子を自作型に定義する仕組み。数学的な型(ベクトル、行列)を自然に書くための道具"
  section: reference
  format: article
  domain: languages
---

# 関数オーバーロードと演算子オーバーロード

## 一言で言うと

- **関数オーバーロード**: 同名の関数を引数の型・数違いで複数定義し、**コンパイル時に**引数から選ばせる仕組み
- **演算子オーバーロード**: `+` `==` `[]` などの演算子を自作型に定義する仕組み。数学的な型(ベクトル、行列)を自然に書くための道具

どちらも「**呼ばれる関数がコンパイル時に決まる**」点で、実行時に決まる[仮想関数](/languages/cpp/inheritance-and-virtual.html)と対照的です(アドホック多態 → [ポリモーフィズム](/design/foundations/polymorphism-interface.html))。

## 関数オーバーロード

```cpp
// C++20
void Spawn(EnemyId id);                    // IDで
void Spawn(EnemyId id, Vec2 pos);          // 位置指定で
void Spawn(const EnemyDesc& desc);         // 詳細指定で
// 呼び出し: Spawn(id) — 引数の型から最適な候補をコンパイラが選ぶ(オーバーロード解決)
```

### 落とし穴: 暗黙変換との相互作用

```cpp
void Play(int soundId);
void Play(float volume);
Play(0.5);        // doubleリテラル → intにもfloatにも変換可能 → 曖昧エラー(まだ良い)
Play('a');        // charはintに昇格 → Play(int)が呼ばれる(意図か?)
```

オーバーロード解決の規則は複雑(完全一致 > 昇格 > 変換)で、**「似た型の引数を持つオーバーロード」は事故の温床**。意味が違うなら名前を分ける(`PlayById`/`PlayWithVolume`)か、強い型(`struct SoundId { int v; };`)を使う方が安全です。

## 演算子オーバーロード

```cpp
// C++20 — ゲーム数学の定番
struct Vec2 {
    float x = 0, y = 0;

    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator*(float s) const { return {x * s, y * s}; }
    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }
    bool operator==(const Vec2& o) const = default;   // C++20: 比較の自動生成
};
Vec2 operator*(float s, const Vec2& v) { return v * s; }   // 2.0f * v も書けるように(非メンバ)

// 使用: pos += velocity * dt;  ← 演算子なしだと pos = Add(pos, Mul(velocity, dt));
```

検証済みサンプル: <a href="/study/samples/cpp/operator_overload.cpp">samples/operator_overload.cpp</a>

### C++20の進歩: `<=>` と `= default`

```cpp
struct Version {
    int major = 0, minor = 0;
    auto operator<=>(const Version&) const = default;   // ==, <, >, <=, >= が全部手に入る
};
```

### 設計ルール(乱用防止)

1. **意味が数学的に自明な場合だけ**使う(`+`が加算以外の意味なら関数名で書く)。`Player + Item` のような「クリエイティブな」演算子は読み手への攻撃
2. `==` を定義するなら一貫した同値関係に(`!=`はC++20なら自動導出)
3. 算術演算子は値を返し、複合代入(`+=`)は参照を返す、という慣習に従う
4. 変換演算子(`operator bool`等)は `explicit` を付ける(暗黙変換事故の防止)

## メモリ・コンパイル上で起きること

- オーバーロードされた関数はそれぞれ**別の関数**としてコンパイルされ、[名前修飾(mangling)](/runtime/cpp-internals/symbols-and-linkage.html)で区別される(`Spawn(int)` と `Spawn(float)` は別シンボル)。C言語にオーバーロードがないのはこの仕組みがないため
- 演算子も普通の関数呼び出しにコンパイルされる(`a + b` は `a.operator+(b)`)。小さい演算子はインライン化され、**手書きのAdd関数と機械語は同じ**——「演算子は遅い」は誤解

## C#との違い

- C#にもオーバーロードと演算子オーバーロード(`public static Vector2 operator+`)があり、概念は同じ
- 違い: C#の演算子は必ずstatic、C++はメンバ/非メンバを選べる。C++は`[]` `()` `->` `*`など多くの演算子を定義できる(スマートポインタは`->`のオーバーロードでできている)
- C++には**ユーザー定義リテラル**(`10_sec`のような接尾辞)まである(使いすぎ注意)

## Unity開発者が誤解しやすい点

1. UnityのVector3の `+` `*` を「エンジンの特別機能」と思っている——ただの演算子オーバーロードで、C++でも自作できる(しかもインライン化でコスト0)
2. `==` の罠: UnityEngine.Objectの `==` は「破棄済みならnull扱い」という特殊オーバーロード。C++で自作型の `==` を書くときも「何をもって等しいか」は設計判断(参照同一性か値の等価か)
3. オーバーロード解決は**静的**(変数の宣言型で決まる)。実行時の型では選ばれない(それは仮想関数の仕事)——`Base& b = derived; f(b);` は `f(Base&)` を呼ぶ

## ゲーム開発での使用例

- 数学型(Vec2/3/4, Quat, Matrix, Color): 演算子の主戦場
- 単位の強い型: `Seconds operator""_s(long double)` 等でミリ秒/秒の取り違えをコンパイルエラーに
- `operator[]`: グリッドやインベントリのインデックスアクセス
- 関数オブジェクトの `operator()`: [ラムダ](/languages/cpp/lambdas-and-functions.html)の裏側

## 使う場面 / 使わない場面

- **使う**: 数学的な型、コンテナ的な型、比較(C++20の`=default`で無料)
- **使わない**: 意味が自明でない演算(`<<`をログ以外に使う等)、副作用の大きい処理を演算子に隠す、暗黙変換演算子(explicitなしのoperator T)

## よくある誤解

- 「オーバーロードとオーバーライドは似たもの」— 別物。オーバーロード=同名別引数(コンパイル時)、オーバーライド=仮想関数の上書き(実行時)
- 「演算子オーバーロードは遅い」— インライン化されれば手書き関数と同一

## 関連項目

- [ポリモーフィズム(多態の分類)](/design/foundations/polymorphism-interface.html)
- [名前修飾とシンボル](/runtime/cpp-internals/symbols-and-linkage.html)
- [テンプレート](/languages/cpp/templates-and-concepts.html)(オーバーロード解決とテンプレートの相互作用)

## 理解度チェック

1. オーバーロードとオーバーライドの決定タイミングの違いは?
2. 「似た型の引数のオーバーロード」が危険な理由は?
3. Vec2の`+`を演算子にする正当性と、`Player + Item`が駄目な理由を、同じ基準で説明してください。

## 演習

samples/operator_overload.cpp のVec2に `operator-`、`Dot(内積)`を追加してください。内積を `operator*` にすべきか関数にすべきか、スカラー倍との衝突の観点から判断を書いてください。

---

関連項目：[継承・仮想関数](/languages/cpp/inheritance-and-virtual.html) / [学習ガイド](/languages/cpp/) / [テンプレートと concepts](/languages/cpp/templates-and-concepts.html)
