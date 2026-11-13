---
title: テンプレートと concepts
study:
  source: C++ Wiki
  status: published
  summary: テンプレートは「型を引数にしたコードの雛形」。コンパイラが使用時に型ごとの実物のコードを生成(実体化)します。C#のジェネリックと似た見た目で仕組みは根本的に違い、実行時コストゼロ・制約は緩い(C++20のconceptsで改善)という特徴があります。
  section: reference
  format: article
  domain: languages
---

# テンプレートと concepts

## 一言で言うと

テンプレートは「**型を引数にしたコードの雛形**」。コンパイラが使用時に**型ごとの実物のコードを生成**(実体化)します。C#のジェネリックと似た見た目で**仕組みは根本的に違い**、実行時コストゼロ・制約は緩い(C++20のconceptsで改善)という特徴があります。

## 基本形

```cpp
// C++20
template <typename T>
T Max(T a, T b) { return a < b ? b : a; }

Max(3, 5);        // コンパイラが Max<int> を生成して呼ぶ(型は引数から推論)
Max(1.5f, 2.5f);  // Max<float> も別途生成される

template <typename T, int N>       // 型以外(整数など)も引数にできる
struct FixedRing {
    T data[N];                     // サイズがコンパイル時に決まる=スタックに置ける
    // ...
};
FixedRing<int, 64> inputBuffer;    // 入力履歴64フレーム分、ヒープ確保なし
```

## 仕組み: 実体化(instantiation)

- テンプレート自体はコードではなく**雛形**。`Max<int>`が使われて初めて、int版の関数が**その翻訳単位に**生成される(→ [テンプレートの実体化の内部](/runtime/cpp-internals/template-instantiation-and-inline.html))
- だからテンプレートは通常**ヘッダーに全部書く**(使う側が雛形を見られる必要がある)
- 生成後は**その型専用の最適なコード**: `Max<int>`は仮想関数もボックス化もない、手書きと同じ機械語。これが「ゼロコスト抽象化」の代表例(→ [最適化](/runtime/cpp-internals/optimization-and-ub.html))

### 代償

- **コンパイル時間**: 使うたびに生成・最適化(→ [ビルドが遅い理由](/tools/build/build-speed.html))
- **コードサイズ**: 型の数だけ複製(テンプレートブロート)
- **エラーメッセージ**: 制約なしだと、実体化の奥深くで失敗し数百行のエラーになる(conceptsで改善)

## concepts(C++20)

「この型はこういう操作ができること」という**制約を宣言**する仕組みです。

```cpp
// C++20(GCC 10+/MSVC 2019+。本Wikiの検証環境GCC 9.2では未検証 — 構文はcppreference準拠)
#include <concepts>

template <typename T>
concept Damageable = requires(T& t, int amount) {
    { t.TakeDamage(amount) };                  // TakeDamage(int)が呼べること
    { t.IsDead() } -> std::convertible_to<bool>;
};

template <Damageable T>                        // 制約付きテンプレート
void ApplyExplosion(std::vector<T>& targets, int damage) {
    for (auto& t : targets)
        if (!t.IsDead()) t.TakeDamage(damage);
}
// 制約を満たさない型を渡すと「DamageableじゃないB」と一行で怒られる(以前は数百行)
```

conceptsは**ダックタイピングの明文化**です。仮想関数のインターフェースと違い、実行時コストなし・基底クラス不要で「この操作ができる型なら何でも」を表現します。

## テンプレート vs 仮想関数(使い分けの本丸)

| | テンプレート | 仮想関数(インターフェース) |
|---|---|---|
| 決定時期 | コンパイル時 | 実行時 |
| 実行時コスト | ゼロ(型ごとに最適コード) | 間接呼び出し+インライン化阻害 |
| 異なる型を1つのリストに | 不可(vector&lt;T>は1つのT) | 可能(vector&lt;unique_ptr&lt;Base>>) |
| 実行中の差し替え | 不可 | 可能 |
| コンパイル時間・コードサイズ | 増える | 増えない |
| エラー | コンパイル時(conceptsで読みやすく) | 実行時まで分からないことも |

実行時に型が混在したり切り替わったりする場合は仮想関数、コンパイル時に型が決まる場合はテンプレートを使うのが基本です(→ [判断ガイド](/design/decisions/cpp-choices.html))。

## C#のジェネリックとの違い(重要)

| | C# ジェネリック | C++ テンプレート |
|---|---|---|
| 実体 | 1つのILコード+実行時の型情報(参照型は共有、値型はJITが特殊化) | **型ごとにコンパイル時生成**(常に特殊化) |
| 制約 | `where T : IComparable`(宣言必須) | 制約なしでも書ける(C++20 conceptsで任意に宣言) |
| `T`にできること | 制約で宣言した操作のみ | **書いてあれば何でも**(実体化時に検査) |
| 定数の数値をジェネリック/テンプレート引数に | 不可（型引数と区別） | 可能(`FixedRing<int, 64>`) |
| コンパイル | 使う側と別アセンブリでOK | 定義がヘッダーで見えている必要 |

C#で `T.TakeDamage()` を呼ぶにはinterface制約が必須です。C++では実体化した型にその関数があれば呼べるため柔軟ですが、型に求める条件が宣言からは分かりません。conceptsを使うと、その条件を明示できます。

## Unity開発者が誤解しやすい点

1. `List<T>` の感覚で「テンプレートは1つのコードを共有」と思う——C++は型ごとに完全なコピーを生成。100型で使えば100個の関数ができる(ビルド時間とサイズに跳ね返る)
2. C#のジェネリックは実行時にも型情報が残る(`typeof(T)`)が、C++のテンプレートは**コンパイル後は消える**(実行時に「これはMax&lt;int>だ」という情報はない。RTTIとは別物)
3. IL2CPPは従来、参照型の組み合わせでコードを共有し、値型向けには専用コードを生成していました。Unity 2022.1以降のFull Generic Sharingでは、生成設定に応じて、値型にも使える共有実装を専用コードがないときのフォールバックやコードサイズ削減に使います。[Unityの従来のコード共有](https://unity.com/blog/engine-platform/il2cpp-internals-generic-sharing-implementation)・[UnityのFull Generic Sharing](https://unity.com/blog/engine-platform/il2cpp-full-generic-sharing-in-unity-2022-1-beta)・[ネイティブビルドと IL2CPP](/languages/csharp/il2cpp.html)

## ゲーム開発での使用例

- 数学ライブラリ(`Vec<T,N>`)、固定長コンテナ(リングバッファ、小容量vector)
- [Object Pool](/game/patterns/object-pool.html)`<T>`、ハンドル`<T>`などの基盤部品
- コンパイル時文字列ハッシュ、[ECS](/game/patterns/component-and-ecs.html)の型リスト処理(上級)
- エンジンコードでの多用(STL自体、UEのTArray&lt;T>等)

## 使う場面 / 使わない場面

- **使う**: 複数の型で同一のロジック(コンテナ、アルゴリズム、数学)。実行時コストが許されない基盤
- **使わない**: 型が1つしかない(具体型で書く)、実行時の差し替えが要る(仮想関数)、チームのC++習熟度が低い箇所での高度なメタプログラミング(可読性が死ぬ)。**「テンプレートで書ける」と「書くべき」は別**

## よくある誤解

- 「テンプレートは上級者の道具で避けるべき」という見方もありますが、`std::vector<T>` を使う日常のコードでもテンプレートを使っています。自分で書くのは基盤部品を作るときです。
- 「テンプレートは遅い」— 実行は最速クラス。遅いのは**コンパイル**

## 関連項目

- [テンプレートの実体化とinline(内部の仕組み)](/runtime/cpp-internals/template-instantiation-and-inline.html)
- [テンプレートとジェネリック(C#対比の詳細)](/languages/csharp/templates-vs-generics.html)
- [判断ガイド: テンプレートか仮想関数か](/design/decisions/cpp-choices.html)
- [C++26の主な新機能](/languages/cpp/cpp26-features.html)
- [C++23の実践機能](/languages/cpp/explicit-object-and-expected.html)

## 理解度チェック

1. 「実体化」とは何がいつ起きることですか。
2. C#ジェネリックとの最大の仕組みの違いは?
3. conceptsが解決する2つの問題(エラーメッセージ/契約の明文化)を説明してください。

## 演習

samples/templates_basic.cpp(検証済み: 関数テンプレート+非型引数のリングバッファ)を拡張し、`Clamp<T>(v, lo, hi)` を追加してください。int/float両方で動くこと、`sizeof`の異なる型でもコードが「それぞれ生成される」ことを意識して確認してください。

---

関連項目：[オーバーロード](/languages/cpp/overloading.html) / [学習ガイド](/languages/cpp/) / [ラムダ式・関数ポインタ・std::function](/languages/cpp/lambdas-and-functions.html)
