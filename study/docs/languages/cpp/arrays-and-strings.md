---
title: "配列と文字列"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "C++の生配列 int a[10] は「メモリ上に連続して並んだ10個のint」そのもの。サイズ情報も境界チェックも付いていない 実務ではstd::array(固定長)とstd::vector(可変長)を使う"
---

# 配列と文字列

## 一言で言うと

- C++の**生配列** `int a[10]` は「メモリ上に連続して並んだ10個のint」そのもの。サイズ情報も境界チェックも**付いていない**
- 実務では**`std::array`(固定長)と`std::vector`(可変長)**を使う
- 文字列も同様に、Cスタイルの `char*` ではなく **`std::string`**(所有)と **`std::string_view`**(参照)を使う

## 生配列とその問題

```cpp
// C++20
int scores[5] = {10, 20, 30, 40, 50};   // 5個のintが連続。総サイズは5 * sizeof(int)

int x = scores[7];   // コンパイルも実行も「通ってしまう」— 未定義動作(隣のメモリを読む)
```

- **境界チェックなし**: 範囲外アクセスはエラーにならず、隣のメモリを破壊(→ [buffer overflow](/runtime/memory/memory-bugs.html))
- **サイズを忘れる**: 関数に渡すと配列はポインタに退化(decay)し、要素数の情報が消える

```cpp
void Process(int arr[]) {          // 実際の型は int* — サイズは分からない
    // sizeof(arr) はポインタのサイズ(典型的な64bit環境では8)であって配列全体ではない!
}
```

## 現代の選択肢

```cpp
#include <array>
#include <vector>

std::array<int, 5> a{10, 20, 30, 40, 50};  // 固定長: 5要素をオブジェクト内に保持。要素数は型から分かる
std::vector<int> v{10, 20, 30};            // 可変長: 要素領域をallocator経由で確保する

a.size();      // サイズを持っている
v.push_back(40);
v.at(7);       // atは境界チェックあり(例外)。v[7]はチェックなし(速いが自己責任)
```

### メモリ上で起きること

```
以下はaとvがローカル変数で、intが4バイト・ポインタが8バイトの典型的な実装例:

std::array<int,5> a;   要素5個をa自身の内部に連続保持(典型的には20バイト)

std::vector<int> v;    v本体は管理情報(典型実装では3ポインタ分、24バイト)
                       要素領域はallocator経由で別途確保(通常はヒープ)
   ローカル変数の領域        要素領域
   ┌──────────┐          ┌────────────────┐
   │ data ────┼─────────>│ 10 20 30 (40)... │
   │ size=3   │          └────────────────┘
   │ cap =4   │  push_backで容量不足になると「より大きい領域を確保して全要素を引っ越し」
   └──────────┘  → 古い要素へのポインタ/イテレータは全部無効化(頻出事故)
```

`std::array` / `std::vector` という型が、本体を必ずスタックに置くわけではありません。ローカル変数、静的変数、動的に確保したオブジェクト、そのメンバなど、**本体をどう生成したか**で記憶域が変わります。`std::array`は要素を自身の内部に持ち、`std::vector`は要素領域をallocator経由で管理します。本体のサイズ・管理情報・物理的な配置は実装と最適化にも依存します([C++草案: array](https://eel.is/c++draft/array.overview)、[記憶域期間](https://eel.is/c++draft/basic.stc))。

`vector` の再確保(reallocation)は**要素のアドレスが変わる**ことを意味します。「vectorの要素へのポインタを保存しておいたら、push_backの後で壊れた」はC++頻出バグの代表です(→ [STL](/languages/cpp/stl.html)、[dangling](/runtime/memory/memory-bugs.html))。

## 文字列

```cpp
#include <string>
#include <string_view>

std::string name = "Slime";        // 所有する文字列(可変・ヒープ確保しうる)
std::string_view sv = name;        // 参照するだけ(所有しない・コピーしない・軽い)

void PrintName(std::string_view n);   // 読むだけの引数はstring_viewが現代の定石
```

- `std::string` はほぼ `std::vector<char>`+文字列操作。**SSO(小文字列最適化)**: 多くの実装は短い文字列(典型的に15文字程度まで — 実装依存)をヒープ確保せずstring本体内に格納する
- `string_view` は「先頭ポインタ+長さ」だけの軽量ビュー。**参照先より長生きさせてはいけない**(danglingの新たな入口)
- リテラル `"Slime"` は実行ファイルの読み取り専用領域に置かれる(→ [メモリレイアウト](/runtime/cpp-internals/memory-layout.html))

## C#との違い

| | C# | C++ |
|---|---|---|
| 配列 | `int[]` は参照型・境界チェックあり・Length持ち | 生配列は裸のメモリ。チェックなし |
| 範囲外 | IndexOutOfRangeException(安全に停止) | 未定義動作(何が起きるか不明) |
| 文字列 | string は不変(immutable)・参照型 | std::string は**可変**・値(コピーされる) |
| 文字列連結 | 新インスタンス生成(GC負荷) | 同一バッファ内で伸長(再確保はある) |

**C#のstringは不変**なので共有し放題ですが、C++のstringは可変な値です。「代入したら共有」ではなくコピーになる点、関数に値渡しするとコピーが走る点(だからconst参照/string_viewで渡す)がC#との大きな違いです。

## Unity開発者が誤解しやすい点

1. 「配列は安全なもの」— C#の常識。C++の生配列と `v[i]` は範囲チェックしません。デバッグビルドでチェック付きの `at()` やアサートを活用する
2. 「文字列連結は罪(GC Alloc)」— C++ではGCはないが、**再確保**というコストはある。ループ内連結は `reserve` で緩和
3. `char*` の文字列はNUL終端(`'\0'`)前提のC流儀。`std::string` と混ぜるときの `c_str()` の寿命(元のstringが生きている間だけ有効)に注意

## ゲーム開発での使用例

- 弾・敵・頂点などの大量データは `std::vector`(連続メモリ=キャッシュ効率 → [Data Locality](/game/patterns/optimization-patterns.html))
- 固定サイズが分かっているもの(装備スロット4個)は `std::array`
- アセットID・名前の受け渡しは `std::string_view`(コピーゼロ)。保存するなら `std::string`(所有)
- 毎フレームの文字列生成(スコア表示)はバッファ再利用で確保を回避

## 使う場面 / 使わない場面

- `std::vector`: 迷ったらこれ(→ [配列かvectorか](/design/decisions/cpp-choices.html))
- `std::array`: コンパイル時にサイズ確定、要素をコンテナ自身に保持したい(格納先は変数の作り方で決まる)
- 生配列: C APIとの境界、意図的な低レベルコードのみ(理由をコメントで)
- `string_view`: 読み取り引数。**保存はしない**(寿命の罠)

## よくある誤解

- 「vectorは遅い」— `v[i]` は生配列と同じ機械語になる(最適化時)。遅いのは誤った使い方(ループ内再確保、値コピー渡し)
- 「string_viewは常にstringの上位互換」— 所有しないので、元が消えたら即dangling。役割が違う

## 関連項目

- [STLコンテナ](/languages/cpp/stl.html) / [メモリバグ図鑑](/runtime/memory/memory-bugs.html)
- [値型と参照](/languages/cpp/values-pointers-references.html)

## 理解度チェック

1. 生配列を関数に渡すと何が失われますか。
2. vectorのpush_backで「無効化」されるものは何ですか。なぜですか。
3. string_viewを引数に使ってよく、メンバ変数への保存に慎重になるべき理由は?

## 演習

samples/arrays_strings.cpp(検証済み)で、(a) vectorの容量(capacity)がpush_backでどう成長するか、(b) 再確保の前後で要素のアドレスが変わることを、出力で観察してください。

---

前: [const と const correctness](/languages/cpp/const-correctness.html) | [カテゴリ目次](/languages/cpp/) | 次: [構造体・クラス・アクセス指定子](/languages/cpp/structs-and-classes.html)
