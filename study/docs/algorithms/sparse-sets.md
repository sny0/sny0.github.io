---
title: スパースセットとECSのコンポーネント管理
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 整数IDから密な配列の位置を引き、所属判定と末尾を移す削除を定数時間で行う仕組みを調べる。
  aliases: [スパースセット, sparse set, dense array, sparse array, packed array, swap-and-pop, ECS, 世代付きID]
---

# スパースセットとECSのコンポーネント管理

ゲーム内で、エンティティID `2`、`7`、`4` が位置コンポーネントを持っているとします。毎フレーム、位置を持つものだけを並べて処理したい一方で、ID `7` が位置を持っているかもすぐ調べたい場面です。**スパースセット**では、現在使っているIDを詰めた `dense` と、IDからその位置を引く `sparse` を組み合わせます。EnTTなどのECSでは、この考え方をコンポーネントの格納に使っています。[EnTTのコンポーネント格納とスパースセット](https://skypjack.github.io/entt/md_docs_2md_2entity.html)

## IDと配列の位置を行き来する

`dense[i]` は位置 `i` にいるID、`sparse[id]` はIDがいるはずの位置です。使っていないIDの `sparse` に以前の位置が残っていても、そこに現在どのIDがいるかを見れば区別できます。IDが属している条件は、`sparse[id]` が `dense` の有効な位置にあり、かつ `dense[sparse[id]] == id` であることです。ID自体の範囲も先に調べます。

<figure class="study-figure">
  <img src="/images/algorithms/sparse-sets.svg" alt="削除前のdenseは2、7、4。sparseのID7とID4はそれぞれ位置1と2を指す。ID7を削除すると、末尾のID4が位置1に移り、sparseのID4も1になる。sparseのID7には1が残るが、denseの位置1はID4なのでID7は含まれない。" width="760" height="346" loading="lazy">
  <figcaption>ID 7を消すと、ID 4が移動します。所属判定には移動先から元のIDに戻れるかも使います。<a href="/study/images/algorithms/sparse-sets.svg" target="_blank" rel="noopener noreferrer">配列の図を拡大</a></figcaption>
</figure>

## 追加と、順序を保たない削除

追加では新しいIDを `dense` の末尾に置き、`sparse` にその位置を書きます。中間を削除する例では、空いた位置に末尾のIDを移し、移動したIDの `sparse` を更新してから、`dense` の末尾を取り除きます。この方法を **swap-and-pop** と呼びます。コンポーネント本体も同じ並びで格納する実装では、移動したIDと対応する値を一緒に移します。処理中に密な配列の位置を保持している場合、その位置が別のIDを指すようになります。

| 操作 | このモデルのコスト |
| --- | --- |
| IDが含まれるか調べる | `O(1)` |
| 追加する | 領域確保済みなら `O(1)`。幾何的に拡張する動的配列なら償却 `O(1)` |
| 削除する | 順序を維持せず、固定サイズのIDを移すなら `O(1)` |
| 使っているIDをすべて列挙する | `O(n)`。`n` は現在の件数 |

単純な `sparse` 配列の要素数は、格納している件数よりもIDの範囲に依存します。上限が大きく、使うIDが飛び飛びなら、必要なページだけに表を作る方法や、IDから位置を引く部分にハッシュ表を使う方法があります。EnTTにはページ分割されたスパース配列と複数の削除方式があり、ここで使った古い添字を残すモデルとは実装上の細部が異なります。[EnTTのスパース配列の実装](https://skypjack.github.io/entt/sparse__set_8hpp_source.html) · [ハッシュ表](/algorithms/hash-tables.html)

ECSでIDを再発行する場合、同じ数値のスロットが別のエンティティに使われます。古いハンドルを識別するには、スロットに加えて世代の一致を確認します。密に並べて走査すること、削除時の順序、参照の安定性はそれぞれ独立した設計条件です。[世代付きハンドル](/algorithms/generational-handles.html) · [ECSのコンポーネント管理](/game/patterns/component-and-ecs.html) · [動的配列の再確保と参照](/algorithms/arrays-and-dynamic-arrays.html)

[IDを追加・削除して二つの配列を観察する](/practice/algorithms/sparse-set-observation.html)
