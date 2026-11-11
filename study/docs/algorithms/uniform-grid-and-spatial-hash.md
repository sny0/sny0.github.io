---
title: 均等グリッドと空間ハッシュ — 近くの候補をセルで絞る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 座標をセル番号へ変換し、物体の境界箱を複数のセルに登録する。範囲検索で候補を絞る仕組みと、疎な空間をハッシュ表に格納する方法を調べる。
  aliases: [均等グリッド, uniform grid, 空間ハッシュ, spatial hash, 空間分割, セル, AABB, ブロードフェーズ, broad phase]
---

# 均等グリッドと空間ハッシュ — 近くの候補をセルで絞る

爆発の範囲に入った敵を探すとき、爆発範囲から離れた敵まで交差判定する必要はありません。**均等グリッド**は空間を同じ大きさのセルに区切り、セルごとに重なる物体のIDを持ちます。検索範囲と重なるセルだけを読めば、離れた物体を候補から外せます。この絞り込みを**ブロードフェーズ**、残った候補の形状を詳しく判定する段階を**ナローフェーズ**と呼びます。ブロードフェーズでは、候補に余分な物体が入ってもかまいませんが、実際に当たる物体は漏らさないようにします。[GPU Gems 3のブロードフェーズと空間分割](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-32-broad-phase-collision-detection-cuda)

## 負の座標でも同じ大きさのセルに分ける

セルの一辺を `h > 0`、セル番号 `0` の始点を座標 `0` とします。座標 `x` が属するセル番号は `floor(x / h)` です。セル `i` の範囲は `[i × h, (i + 1) × h)` とし、右端は隣のセルに含めます。2Dなら `x` と `y` を別々に変換し、座標の組 `(cx, cy)` をセルのキーにします。

| `x` | セル番号（`h = 10`） | セルの範囲 |
| ---: | ---: | --- |
| −10 | −1 | `[−10, 0)` |
| −1 | −1 | `[−10, 0)` |
| 0 | 0 | `[0, 10)` |
| 9 | 0 | `[0, 10)` |
| 10 | 1 | `[10, 20)` |

C++で `static_cast<int>(x / h)` を使うと、小数部分はゼロに向かって切り捨てられます。たとえば `x = -1.0`、`h = 10.0` のときは `0` になり、上の区切りと一致しません。整数に変換する前に `std::floor` を使い、セル番号が整数型の範囲内にあることを確かめます。[C++の浮動小数点から整数への変換規定](https://eel.is/c++draft/conv.fpint)

## 境界箱を、またがるすべてのセルに入れる

物体の中心だけを登録すると、中心が範囲外でも形が届いている物体を取りこぼすことがあります。ここでは物体を包む**軸に平行な境界箱（AABB）**を作り、その `min` と `max` を各軸でセル番号に変換して両端を含めて列挙します。検索範囲にも同じ規則を使います。

この例では境界に接した物体も候補に含めます。たとえば `x` の範囲が `[2, 10]` なら、セル `0` と、境界の `10` が属するセル `1` を登録します。二つの形が一点でも共有していれば、その点が属するセルに両方の境界箱が登録されるので、候補に残ります。

<figure class="study-figure">
  <img src="/images/algorithms/uniform-grid-and-spatial-hash.svg" alt="1辺10のセル。円Aの境界箱は4セルにまたがる。検索矩形が読む2セルにはAが2回、Bが1回現れる。重複を除いた候補はAとBで、矩形と実際に重なるのはAだけ。" width="760" height="408" loading="lazy">
  <figcaption>円Aは4セルに登録されます。検索ではAの重複を除き、円Bが範囲外であることを詳しい判定で確かめます。<a href="/study/images/algorithms/uniform-grid-and-spatial-hash.svg" target="_blank" rel="noopener noreferrer">セル登録と検索の図を拡大</a></figcaption>
</figure>

| 対象 | セルで読む情報 | 次にすること |
| --- | --- | --- |
| 円Aの境界箱 | `(-1, 0)`、`(0, 0)`、`(-1, 1)`、`(0, 1)` にAを登録 | 円そのものは精密判定の段階で使う |
| 検索矩形 | `(0, 0)` からA、`(0, 1)` からAとBを読む | IDを重複除去してからAとBを判定する |
| 検索結果 | Aだけが検索矩形に重なる | 共有セルがあったBは候補止まり |

一回の範囲検索では、見つけた**物体ID**を集合に入れれば、一つの物体を繰り返し判定せずに済みます。全物体の当たり判定候補を各セルから生成するときは、重複の単位が**物体の組**になります。自分自身との組を除き、`(小さいID, 大きいID)` をキーにすると、別のセルから同じ組を見つけても一回だけ判定できます。[GPU Gems 3の複数セルへの登録と重複の扱い](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-32-broad-phase-collision-detection-cuda)

## 空のセルを持たずに格納する

| 格納方法 | 使いどころ | 費用が増えるところ |
| --- | --- | --- |
| セルを配列に並べる | 範囲が既知で、セル数が手頃なマップ | 誰も入っていないセルにも領域を使う |
| セル座標の組をハッシュ表のキーにする | 広いマップで、物体が存在するセルが少ない | ハッシュ、キー比較、バケット管理の費用がかかる |

後者が**空間ハッシュ**の一例です。二つのセルが同じハッシュ値になっても、それだけで同じセルと判定せず、`(cx, cy)` 全体を比較します。ハッシュ値だけを辞書のキーにすると、その値が一致したセルを個別に扱えなくなります。研究例には、固定数のバケットを別々のセルで共有し、候補が増える代わりにメモリを抑える方式もあります。ここで扱う辞書方式では、セル座標と物体IDの列を対応させます。[Teschnerらの空間ハッシュの論文](https://cgl.ethz.ch/Downloads/Publications/Papers/2003/Tes03/Tes03.pdf) · [ハッシュ表](/algorithms/hash-tables.html)

JavaScriptの短い例では、`Map` に渡すキーを `"cx,cy"` とします。登録時も検索時も、同じセル範囲を列挙します。`h` は正の有限値、境界箱の座標は有限で各軸の `min` が `max` 以下とし、セル番号と列挙数は扱える範囲に収まるものとします。

```js
function* cellKeys({ minX, minY, maxX, maxY }, h) {
  const x0 = Math.floor(minX / h);
  const y0 = Math.floor(minY / h);
  const x1 = Math.floor(maxX / h);
  const y1 = Math.floor(maxY / h);
  for (let y = y0; y <= y1; ++y) {
    for (let x = x0; x <= x1; ++x) yield `${x},${y}`;
  }
}

function insert(grid, box, h, id) {
  for (const key of cellKeys(box, h)) {
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(id);
  }
}

function queryCandidates(grid, box, h) {
  const ids = new Set();
  for (const key of cellKeys(box, h)) {
    for (const id of grid.get(key) ?? []) ids.add(id);
  }
  return ids;
}
```

`queryCandidates` は候補IDだけを返します。円と矩形の交差など、ゲームに必要な条件はこのあと候補に対して判定します。[同じ範囲検索で候補と実際のヒットを見比べる](/practice/algorithms/spatial-query-observation.html)

## セルの大きさと更新の費用を見る

セルを小さくすると、空間の近さを細かく区別できます。一方、同じ範囲の検索でも読むセルが増え、大きな物体を多くのセルに登録することになります。セルを大きくすると読むセルは減りますが、一つのセルに候補が集中しやすくなります。`q` 個のセルを読み、その中のIDを重複込みで `r` 件走査するなら、セルの取得と重複除去が平均定数時間という前提で、候補を集める費用は `O(q + r)` です。全物体が一つのセルに入れば、組の列挙では依然として二乗規模の候補が生じます。[GPU Gems 3の最悪時の比較](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-32-broad-phase-collision-detection-cuda)

物体が動いたときは、新旧の境界箱が同じセル集合なら登録を使い続けられます。変わった場合は古いセルから外して新しいセルに追加します。登録を毎フレーム作り直す方法と、動いた分だけ更新する方法があり、動く物体の数や一つの物体がまたぐセル数で費用が変わります。ここで判定しているのは一時点の範囲です。フレーム間に通過した接触も扱うなら、移動の途中を含む保守的な境界と、それに合う精密判定を使います。

タイルや同程度の大きさの物体が分布する場面では、候補数と更新費用を測りながらセルの大きさを比較できます。密集する場所だけを細かく区切る構造は[四分木と八分木](/algorithms/quadtrees-and-octrees.html)、物体を包む境界箱を階層にまとめる構造は[BVH](/algorithms/bounding-volume-hierarchies.html)で扱います。
