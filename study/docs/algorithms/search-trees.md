---
title: 二分探索木と順序付き連想コンテナ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 左右の部分木にキーを分け、検索・更新・範囲走査にかかる時間が木の高さで変わる理由を調べる。
  aliases: [二分探索木, binary search tree, BST, 平衡木, 赤黒木, red-black tree, B木, B-tree, ordered map, std::map, lower_bound, SortedDictionary, SortedSet]
  verification: C++の順序付き連想コンテナの仕様、.NETのSortedDictionaryとSortedSet、PostgreSQLのB-tree公式資料に照合（2026-11-06）
---

# 二分探索木と順序付き連想コンテナ

リプレイに「シミュレーションtick → スナップショット」の対応を保存するとします。あるtickの記録を引くだけでなく、指定した範囲の記録を時刻順に取り出したいなら、キーの順序を保つ**順序付きマップ**が使えます。キーだけを持つ**順序付き集合**にも、同じような範囲操作があります。これらを実装する方法の一つが**二分探索木**です。[C++作業草案の順序付き連想コンテナ](https://eel.is/c++draft/associative.reqmts.general)

## 左右の部分木にキーの範囲を分ける

キーが重複しない二分探索木では、あるノードの左側の**部分木全体**に、そのノードより小さいキーが入ります。右側の部分木全体には、大きいキーが入ります。例えば図で50を探すなら、40より大きいので右、60より小さいので左へ進みます。次の子がなければ、そのキーは木にありません。

<figure class="study-figure">
  <img src="/images/algorithms/search-trees.svg" alt="根40の左右に20と60があり、20の下に10と30、60の下に50と70がある。25以上65未満の範囲には30、40、50、60が含まれる。左部分木から順に読んだ結果は10、20、30、40、50、60、70。" width="760" height="354" loading="lazy">
  <figcaption>どのノードにも左右の範囲の規則が成り立ちます。25以上65未満の範囲を太枠で示しています。<a href="/study/images/algorithms/search-trees.svg" target="_blank" rel="noopener noreferrer">探索木の図を拡大</a></figcaption>
</figure>

左の部分木、自分、右の部分木の順でたどると、キーが小さい順に並びます。範囲の下端まで木を下り、そこから後続のキーを順にたどれば、先頭から全件を読む必要がなくなります。C++の `lower_bound(k)` は比較順で `k` より前にない最初のキーを、`upper_bound(k)` は `k` より後の最初のキーを探します。既定の昇順では、それぞれ `>= k` と `> k` の境界です。[C++作業草案のlower_bound・upper_bound](https://eel.is/c++draft/associative.reqmts.general)

## 木の高さが操作のコストを決める

| 操作 | 高さ `h` の二分探索木 | 高さを `O(log n)` に保つ平衡木 |
| --- | --- | --- |
| キーの検索、範囲の端を探す | `O(h)` | `O(log n)` |
| キーの追加、キーを探して削除 | `O(h)` | `O(log n)` |
| 範囲内の `k` 件を順に読む | `O(h + k)` | `O(log n + k)` |
| 全件を順に読む | `O(n)` | `O(n)` |

表の高さは、根から最も深い葉までのノード数です。範囲走査は、端を見つけたあとに探索経路を引き継いで順にたどる場合です。要素数 `n` が同じでも、単純な二分探索木に小さい順で追加し続けると、右の子だけが伸びて高さは `n` になります。平衡木は挿入や削除に合わせて形を整え、木が深くなり過ぎるのを防ぎます。[GuibasとSedgewickによる平衡木の論文](https://sedgewick.io/wp-content/themes/sedgewick/papers/1978Dichromatic.pdf)

- **赤黒木**は二分探索木に各ノードの色を加え、色の条件を保つために色や親子のつなぎ方を変更します。キーの順序を保ちながら、根から葉までの経路の長さを抑えます。[赤黒木の色と平衡条件](https://sedgewick.io/wp-content/themes/sedgewick/papers/1978Dichromatic.pdf)
- **B木**は1ノードに複数のキーと子を持てる平衡木です。多くの分岐先を1ページで判定できるので、ページ単位で読み書きする索引に向きます。PostgreSQLにも複数方向へ分岐するB-tree索引があります。[PostgreSQLのB-tree索引](https://www.postgresql.org/docs/current/btree.html)

## `std::map` からtickの範囲を取り出す

`std::map` の既定のキー順で、25以上65未満を取り出します。`lower_bound(25)` は30を指し、`lower_bound(65)` は70を指します。70を出力する前に止めるので、30、40、50、60だけが出ます。C++規格が定めるのは操作の意味と計算量などで、実装が使う木の種類までは指定していません。[C++作業草案のmap](https://eel.is/c++draft/map.overview)

```cpp
#include <iostream>
#include <map>

int main() {
    const std::map<int, const char*> snapshots = {
        {40, "D"}, {20, "B"}, {60, "F"}, {10, "A"},
        {30, "C"}, {50, "E"}, {70, "G"},
    };
    const auto stop = snapshots.lower_bound(65);
    for (auto it = snapshots.lower_bound(25); it != stop; ++it) {
        std::cout << it->first << ' ' << it->second << '\n';
    }
}
```

C#ではキーと値の対応に `SortedDictionary<TKey, TValue>`、キーだけの集合に `SortedSet<T>` を使えます。`SortedSet<T>.GetViewBetween` は両端を含む範囲のビューを返します。元の集合の変更がビューにも反映されるので、ある時点の内容を保存したい場合はコピーします。[.NETのSortedDictionary](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sorteddictionary-2) · [.NETのGetViewBetween](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sortedset-1.getviewbetween?view=net-10.0)

キーが一致する要素を主に探すなら[ハッシュテーブル](/algorithms/hash-tables.html)が候補になります。順序付きの範囲を繰り返し取り出し、途中のキーも追加・削除するなら平衡木が対応します。最小値や最大値を先頭から取り出すだけなら[二分ヒープ](/algorithms/binary-heaps.html)でも扱えます。
