---
title: 配列と文字列
study:
  source: C++ Wiki
  status: published
  summary: C++の生配列 int a[10] は「メモリ上に連続して並んだ10個のint」そのもの。サイズ情報も境界チェックも付いていない 実務ではstd::array(固定長)とstd::vector(可変長)を使う
  section: reference
  format: article
  domain: languages
---

# 配列と文字列

## 一言で言うと

- C++の**生配列** `int a[10]` は「メモリ上に連続して並んだ10個のint」そのもの。サイズ情報も境界チェックも**付いていない**
- 実務では固定長に `std::array`、可変長に `std::vector` を使う
- 文字列も同様に、Cスタイルの `char*` ではなく **`std::string`**(所有)と **`std::string_view`**(参照)を使う

## 生配列とその問題

```cpp
// C++20
int scores[5] = {10, 20, 30, 40, 50};   // 5個のintが連続。総サイズは5 * sizeof(int)

int x = scores[7];   // コンパイルも実行も「通ってしまう」— 未定義動作(隣のメモリを読む)
```

- **生配列の範囲外アクセスは未定義動作**: 診断が出る場合もあり、書き込みでは隣接するデータを壊すおそれがある(→ [buffer overflow](/runtime/memory/memory-bugs.html))
- **サイズを忘れる**: 関数に渡すと配列はポインタに退化(decay)し、要素数の情報が消える

```cpp
void Process(int arr[]) {          // 実際の型は int* — サイズは分からない
    // sizeof(arr) はポインタのサイズ(典型的な64bit環境では8)であって配列全体ではない!
}
```

## 現代の選択肢

```cpp
#include <array>
#include <cstdio>
#include <stdexcept>
#include <vector>

int main() {
    std::array<int, 5> a{10, 20, 30, 40, 50};  // 固定長: 5要素をオブジェクト内に保持。要素数は型から分かる
    std::vector<int> v{10, 20, 30};            // 可変長: 要素領域をallocator経由で確保する

    std::printf("array size=%zu\n", a.size());
    v.push_back(40);
    try {
        (void)v.at(7);   // 範囲外ならstd::out_of_rangeを投げる
    } catch (const std::out_of_range&) {
        std::puts("out of range");
    }
    // v[7] は範囲内という事前条件に違反する。診断の有無はライブラリと設定による。
}
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

`std::array` / `std::vector` という型だけでは、本体がスタックに置かれるかどうかは決まりません。本体をローカル変数、静的変数、動的に確保したオブジェクト、そのメンバなどのどの形で生成したかによって、記憶域が変わります。`std::array`は要素を自身の内部に持ち、`std::vector`は要素領域をallocator経由で管理します。本体のサイズ・管理情報・物理的な配置は実装と最適化にも依存します([C++草案: array](https://eel.is/c++draft/array.overview)、[記憶域期間](https://eel.is/c++draft/basic.stc))。

`vector` の再確保(reallocation)は**要素のアドレスが変わる**ことを意味します。「vectorの要素へのポインタを保存しておいたら、push_backの後で壊れた」はC++頻出バグの代表です(→ [STL](/languages/cpp/stl.html)、[dangling](/runtime/memory/memory-bugs.html))。

## 文字列

```cpp
#include <string>
#include <string_view>

std::string name = "Slime";        // 所有する文字列(可変・ヒープ確保しうる)
std::string_view sv = name;        // 参照するだけ(所有しない・コピーしない・軽い)

void PrintName(std::string_view n);   // 読むだけの引数はstring_viewが現代の定石
```

- `std::string` は`char`の連続した要素列を所有する文字列型。SSO（小文字列最適化）を採用する実装では、短い列をstring本体内に格納して別領域の確保を避ける。しきい値は実装依存で、見た目の文字数ではなく`char`の要素数で考える
- `string_view` は「先頭ポインタ+長さ」だけの軽量ビュー。**参照先より長生きさせてはいけない**(danglingの新たな入口)
- 文字列リテラル`"Slime"`の配列は静的記憶域期間を持ち、書き換えると未定義動作になる。実行ファイルのどの領域に置くかは実装による（→ [メモリレイアウト](/runtime/cpp-internals/memory-layout.html)、[C++20草案: lex.string](https://timsong-cpp.github.io/cppwp/n4861/lex.string)）

`std::string`という型名だけではUTF-8などの文字コードは決まりません。`size()`は`char`の要素数で、見た目の文字数ではありません。C++20の`std::u8string`・`std::u16string`、C#の`string.Length`との違いは[Unicodeと文字コード](/data/unicode-and-encoding.html)で、具体的な値は[C++・C#の観察例](/practice/data/unicode-observation.html)で調べられます。[C++20草案: basic.string](https://timsong-cpp.github.io/cppwp/n4861/basic.string)、[string.capacity](https://timsong-cpp.github.io/cppwp/n4861/string.capacity)

## C#との違い

| | C# | C++ |
|---|---|---|
| 配列 | `int[]` は参照型・境界チェックあり・Length持ち | 生配列は裸のメモリ。チェックなし |
| 範囲外 | IndexOutOfRangeException(安全に停止) | 未定義動作(何が起きるか不明) |
| 文字列 | string は不変(immutable)・参照型 | std::string は**可変**・値(コピーされる) |
| 文字列連結 | 新インスタンス生成(GC負荷) | 同一バッファ内で伸長(再確保はある) |

**C#のstringは不変**なので共有し放題ですが、C++のstringは可変な値です。「代入したら共有」ではなくコピーになる点、関数に値渡しするとコピーが走る点(だからconst参照/string_viewで渡す)がC#との大きな違いです。

## Unity開発者が誤解しやすい点

1. 「配列は安全なもの」— 生配列の範囲外アクセスはUB。`v[i]`も範囲内が前提で、C++23までは範囲外での動作を標準は保証しない(デバッグ設定等で診断する実装もある)。[C++26（DIS）](/languages/cpp/cpp26-features.html)は`vector::operator[]`をhardened preconditionとして規定し、強化実装では範囲外が契約違反になる。`at()`は範囲外を`std::out_of_range`で報告する。[C++草案: コンテナ要件](https://eel.is/c++draft/sequence.reqmts)・[強化事前条件](https://eel.is/c++draft/structure.specifications)
2. C++にはGCがありませんが、文字列連結では再確保のコストがかかります。ループ内で連結する場合は `reserve` でこのコストを抑えられます。
3. Cの文字列APIは一般にNUL終端(`'\0'`)を前提にする。`char*`という型だけで終端や文字コードが保証されるわけではない。`c_str()`の返すポインタは元のstringの破棄や、再確保などを伴う変更で無効になり得る。`std::string`は途中にもNULを保持できるため、NUL終端APIへ渡すと長さの解釈も変わる（[C++20草案: string.require](https://timsong-cpp.github.io/cppwp/n4861/string.require)、[string.accessors](https://timsong-cpp.github.io/cppwp/n4861/string.accessors)）

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

- 「vectorは遅い」— `v[i]` は、生配列と同等のコードに最適化される場合がある。診断コードの有無はライブラリと設定による。ループ内再確保や値コピー渡しの費用も確認する
- 「string_viewは常にstringの上位互換」— 所有しないので、元が消えたら即dangling。役割が違う

## 関連項目

- [C++23/26のコンテナとビュー](/languages/cpp/modern-containers-and-views.html)
- [STLコンテナ](/languages/cpp/stl.html) / [メモリバグ図鑑](/runtime/memory/memory-bugs.html)
- [値型と参照](/languages/cpp/values-pointers-references.html)

## 理解度チェック

1. 生配列を関数に渡すと何が失われますか。
2. vectorのpush_backで「無効化」されるものは何ですか。なぜですか。
3. string_viewを引数に使ってよく、メンバ変数への保存に慎重になるべき理由は?

## 演習

`samples/arrays_strings.cpp` で、`push_back` に伴う `vector` の容量の増加と、再確保後の先頭アドレスを観察してください。サンプルは追加の前後で容量を比較し、追加後の有効なポインタを表示します。再確保前のポインタは無効になるため、保持して再確保後に比較する方法は使いません。[C++20作業草案 N4861: vector の再確保](https://timsong-cpp.github.io/cppwp/n4861/vector.modifiers)・[無効なポインタ値](https://timsong-cpp.github.io/cppwp/n4861/basic.stc)

---

関連項目：[const と const correctness](/languages/cpp/const-correctness.html) / [学習ガイド](/languages/cpp/) / [構造体・クラス・アクセス指定子](/languages/cpp/structs-and-classes.html)
