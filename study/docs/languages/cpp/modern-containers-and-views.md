---
title: C++23・26のコンテナとビュー — span・mdspan・flat_map・inplace_vector・hive
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: languages
  summary: データを借りるビューと、要素を所有するコンテナを、配置、容量、参照が無効になる条件で比較する。
  aliases: [std::span, std::mdspan, std::flat_map, std::inplace_vector, std::hive, 非所有ビュー, フラットマップ]
  verification: WG21 N4861・N4950・N5050に照合。GCC 16.2で実行し、hiveはlibstdc++の開発パッチで確認（2026-11-15）
---

# C++23・26のコンテナとビュー — span・mdspan・flat_map・inplace_vector・hive

テクスチャの行列を関数へ渡す、IDから描画設定を引く、フレームごとの小さなリストを作る。どの場面で使うかによって、必要な性質が変わります。C++20の `span`、C++23の `mdspan` と `flat_map`、C++26の `inplace_vector` と `hive` を、メモリの所有権と配置から見ていきます。C++26は2026年11月13日時点でISOのDIS投票終了（40.60）です。規格の進捗と処理系の対応は [C++26の主な新機能](/languages/cpp/cpp26-features.html) で確認できます。

## どこに要素を置くか

| 型 | 規格 | メモリと使いどころ |
| --- | --- | --- |
| `std::span<T>` | C++20 | 他のオブジェクトが所有する連続した要素列を借りる。動的な長さとコンパイル時に決まる長さを表せる |
| `std::mdspan<T, Extents, Layout>` | C++23 | 次元ごとの添字から要素へのアクセスを作る。既定のアクセサーで既存バッファを借り、行優先、列優先、ストライド付きなどの配置を表せる |
| `std::flat_map<K, V>` | C++23 | 順序付きのキーと値をそれぞれのコンテナに保持する。既定では双方が `std::vector`。一意なキーで検索できる |
| `std::inplace_vector<T, N>` | C++26（DIS） | 最大N個の要素をオブジェクト自身の内部に連続して置く。サイズを0〜Nの範囲で変えられる |
| `std::hive<T>` | C++26（DIS） | 複数のブロックに要素を置き、消した位置を後の挿入で再利用できる。反復は双方向 |

```mermaid
flowchart LR
    B["既存のバッファ"] --> S["span<br/>位置と長さで1次元アクセス"]
    B --> M["mdspan<br/>次元・レイアウトからアクセス"]
    K["flat_map"] --> X["キー列"]
    K --> Y["対応する値の列"]
    V["inplace_vector"] --> I["オブジェクト内の連続領域"]
    H["hive"] --> A["要素ブロック1"]
    H --> C["要素ブロック2"]
```

## spanとmdspan — 元のメモリを借りる

`span` を渡すと、呼び出し先は同じ型の要素を連続した列として扱えます。`span<const T>` にすると、ビューを通じた要素への書き込みを許しません。ビューをコピーしてもデータは複製されません。所有側の `vector` が再確保したり、借りている要素の寿命が終わったりすると、ビューを使い続けられません。所有側で要素を消す場合も、借りている範囲に有効な要素が残るか確認します。

`mdspan` は次元ごとの添字を、レイアウトの写像を通じて位置へ変換します。2行3列なら、`layout_right` で `(row, column)` のオフセットは `row * 3 + column` です。`layout_left` なら `row + column * 2` です。添字 `(1, 0)` は前者で3、後者で1になります。行末に余白がある幅3・行間隔4のバッファなら、`layout_stride` で行のストライドを4、列を1にできます。サイズとストライドは、実際に所有しているメモリの範囲に合わせます。

C++26の `std::submdspan` では、整数で指定した軸を一つの添字に固定し、`std::full_extent` で指定した軸を全体のまま残せます。例えば2行3列の行列に `std::submdspan(rows, 1, std::full_extent)` を適用すると、第1軸が消えて、2行目の3要素を借りる1次元ビューになります。スライスを取っても元の記憶域の寿命は延びません。

## flat_map・inplace_vector・hiveの使い分け

**`flat_map`** はキーと値を別々のコンテナで保持し、キーの並び順で検索します。キーによる検索は対数時間、1要素の挿入・削除は線形時間です。よく読む材質テーブルをまとめて構築する場面では候補になります。ゲーム中に1件ずつ頻繁に挿入・削除するなら、移動する要素数と参照の無効化を考えます。データが比較関数の順序で整列済みで、比較上同値のキーがないことを呼び出し側で保証できる場合は、`std::sorted_unique` を指定して構築または一括挿入できます。指定のない範囲コンストラクターや範囲挿入なら、コンテナ側に整列・同値キーの処理を任せられます。

**`inplace_vector`** は要素用の領域をオブジェクト自身に持つので、容量Nを超えるような再確保は行いません。通常の `push_back` が容量を超える場合は `std::bad_alloc` を送出します。失敗を戻り値で調べるなら `try_push_back` を使い、戻り値が空か確認します。途中へ挿入・削除すると後続の要素は移動し得ます。内部に持つ容量は空でもオブジェクトの大きさに関わるため、大量のオブジェクトへ埋め込む場合はNの上限を実測に合わせます。

**`hive`** は削除のたびに後続要素を詰めず、反復時には削除済みの場所を飛ばします。通常の挿入・削除で既存の別の要素への参照を保ちたい場合に使えます。挿入位置はコンテナが決め、末尾のイテレーターには無効化の条件があります。`shrink_to_fit` などの操作は要素の位置を変え得ます。削除した要素へのポインターを永続IDとして保持すると、同じアドレスに別の要素が入り得るため、ゲームオブジェクトの識別には世代付きハンドルなどを使います。

## コード例 — 同じバッファを1次元と2次元で読む

完全なC++ソースです。`g++ -std=c++20 views.cpp -o views` で `span` を確認できます。同じファイルを `-std=c++23` または `-std=c++26` でビルドすると、標準ライブラリの `<version>` が公開する機能テストマクロに応じて、実装済みの型や関数の分岐も有効になります。`STUDY_USE_HIVE_PREVIEW` は、後述する開発パッチを使うときの指定です。

```cpp
#include <array>
#include <iostream>
#include <span>
#include <utility>
#include <version>

#ifdef __cpp_lib_mdspan
#include <mdspan>
#endif
#ifdef __cpp_lib_flat_map
#include <flat_map>
#endif
#ifdef __cpp_lib_inplace_vector
#include <inplace_vector>
#endif
#if defined(__cpp_lib_hive) || defined(STUDY_USE_HIVE_PREVIEW)
#include <hive>
#endif

int main()
{
    std::array pixels{10, 11, 12, 20, 21, 22};
    std::span<int> linear{pixels};
    std::cout << "span: " << linear[3] << '\n';

#ifdef __cpp_lib_mdspan
    std::mdspan<int, std::extents<int, 2, 3>> rows{pixels.data()};
    std::cout << "mdspan: " << rows[1, 0] << '\n';
#ifdef __cpp_lib_submdspan
    const auto row = std::submdspan(rows, 1, std::full_extent);
    std::cout << "submdspan: " << row[2] << '\n';
#endif
#endif

#ifdef __cpp_lib_flat_map
    std::flat_map<int, int> materials{std::sorted_unique, {{12, 3}, {42, 7}}};
    const std::array additional{std::pair{20, 5}, std::pair{50, 9}};
    materials.insert(std::sorted_unique, additional.begin(), additional.end());
    std::cout << "flat_map: " << materials.at(42) << ',' << materials.at(20) << '\n';
#endif

#ifdef __cpp_lib_inplace_vector
    std::inplace_vector<int, 2> visible;
    visible.push_back(7);
    visible.push_back(9);
    std::cout << "inplace_vector: "
              << (visible.try_push_back(11) ? "inserted" : "full") << '\n';
#endif

#if defined(__cpp_lib_hive) || defined(STUDY_USE_HIVE_PREVIEW)
    std::hive<int> particles;
    const auto first = particles.insert(10);
    const auto keep = particles.insert(20);
    particles.erase(first);
    particles.insert(30);
    std::cout << "hive: " << *keep << '\n';
#endif
}
```

`span` と行優先の `mdspan` はどちらも元の配列の要素20を読みます。`inplace_vector` の容量は2なので3つ目を追加すると `full` です。`hive` で消したのは10だけなので、既存の20へのイテレーターを使えます。GCC 16.2と付属のlibstdc++で実行しました。C++20モードは `span: 20`、C++23モードはさらに `mdspan: 20` と `flat_map: 7,5` を表示します。C++26モードでは `submdspan: 22` と `inplace_vector: full` も表示します。初回のVisual Studio 2022 17.5.5での確認は `span` の分岐が対象でした。Microsoftの適合表では `<mdspan>` はVisual Studio 2022 17.9からです。

`hive` は、GCC 16.2.0にlibstdc++の開発パッチ（2026年10月6日のRFC v2）とGCC開発版の依存ヘッダーを作業用のインクルード先で組み合わせ、C++26モードで実行しました。`hive: 20` が表示され、10を削除して30を挿入した後も、保存していたイテレーターで20を読めました。このパッチは `__cpp_lib_hive` を公開していないため、開発版での実行時だけ `-DSTUDY_USE_HIVE_PREVIEW` を指定しました。通常の配布版では、標準の機能テストマクロ `__cpp_lib_hive` を持つ環境でこの分岐が有効になります。

## 理解度チェック

1. `span` を保持したまま、元の `vector` が要素を再確保した場合、何を作り直しますか。
2. 2行3列の `layout_right` で添字 `(1, 2)` はどのオフセットですか。
3. `flat_map` と `hive` のうち、順序付きの一意なキーで検索する用途に合うのはどちらですか。

::: details 解答
1. 再確保後のデータと長さを使ってビューを作り直します。古いビューは以前の領域を指しています。
2. $1\cdot3+2=5$ です。
3. `flat_map` です。`hive` は各要素をブロックに保管するシーケンスコンテナです。
:::

## 関連項目

- [配列と動的配列](/algorithms/arrays-and-dynamic-arrays.html)
- [探索木](/algorithms/search-trees.html)
- [世代付きハンドル](/algorithms/generational-handles.html)

## 参考資料

- [WG21、C++20草案N4861のspan](https://timsong-cpp.github.io/cppwp/n4861/span.overview)
- [WG21、C++23草案N4950のmdspanとレイアウト](https://timsong-cpp.github.io/cppwp/n4950/mdspan.layout)
- [WG21、C++23草案N4950のflat_map](https://timsong-cpp.github.io/cppwp/n4950/flat.map.overview)
- [WG21、C++26 DISの基礎となったN5050のinplace_vector](https://timsong-cpp.github.io/cppwp/n5050/inplace.vector)
- [WG21、N5050のhive](https://timsong-cpp.github.io/cppwp/n5050/hive)
- [WG21 N5050 — submdspan](https://timsong-cpp.github.io/cppwp/n5050/mdspan.sub)
- [GCC 16 — 標準ライブラリの実装状況](https://gcc.gnu.org/gcc-16/changes.html#libstdcxx)
- [GCC — libstdc++のhive実装 RFC v2](https://gcc.gnu.org/pipermail/gcc-patches/2026-October/733588.html)
- [Microsoft — Visual Studio 2022 17.9のC++適合性の改善](https://learn.microsoft.com/en-us/cpp/overview/cpp-conformance-improvements#conformance-improvements-in-visual-studio-2022-version-179)
