---
title: BVHとAABB — 箱でまとめて衝突候補を絞る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 物体を囲む箱を階層にして候補を絞り、箱の重なりと物体の移動が問い合わせに及ぼす影響を調べる。
  aliases: [BVH, Bounding Volume Hierarchy, 境界ボリューム階層, AABB, 軸平行境界ボックス, 動的AABB木, broad phase, ブロードフェーズ, レイキャスト, refit, リフィット]
  verification: pbrtのBVH実装、Box2DのDynamic Tree API、KoptaらのBVH更新論文に照合（2026-11-06）
---

# BVHとAABB — 箱でまとめて衝突候補を絞る

画面上の範囲にいる敵を探すとき、すべての敵の形状と範囲を照合する方法があります。遠くの敵をまとめて除外できれば、形状を調べる回数を減らせます。**BVH（Bounding Volume Hierarchy）**は、物体を囲む領域を階層にして、その内側の物体にまとめて当たりを付けるデータ構造です。[pbrtのBVH解説と実装](https://www.pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies)

## 物体を分け、囲む箱を階層にする

**AABB（Axis-Aligned Bounding Box）**は、各辺が座標軸と平行な境界ボックスです。2Dなら `minX, minY, maxX, maxY` の4値で表せます。円なら中心の各成分から半径を引いた値が最小、足した値が最大です。箱は物体全体を含むので、箱に届かない問い合わせは内側の物体にも届きません。内側に空きがあるため、箱に届いた段階では物体との交差は未確定です。[pbrtの境界ボックス実装](https://www.pbr-book.org/4ed/Geometry_and_Transformations/Bounding_Boxes)

ここで扱うBVHでは物体の集合を二つのグループに分け、各グループを再帰的に分けます。各物体は一つの葉だけに入ります。内部ノードでは子の箱を囲む箱を持ちます。例えば親の `minX` は子の `minX` の最小、親の `maxX` は子の `maxX` の最大です。グループ間で物体を共有しなくても、箱が囲む空間は重なり得ます。[均等グリッド](/algorithms/uniform-grid-and-spatial-hash.html)や[四分木・八分木](/algorithms/quadtrees-and-octrees.html)は、先に空間を区画へ分けます。[pbrtの物体分割と空間分割](https://www.pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies)

<figure class="study-figure">
  <img src="/images/algorithms/bounding-volume-hierarchies.svg" alt="円AとBを枝1、円CとDを枝2に割り当てた例。二つの枝の箱は一部が重なる。問い合わせの矩形が枝1の箱にだけ重なるのでAとBを個別に調べ、Aだけがヒットする。枝2のCとDは個別判定を省く。" width="760" height="374" loading="lazy">
  <figcaption>子の箱は一部が重なります。この問い合わせでは、枝2をまとめて除外できます。<a href="/study/images/algorithms/bounding-volume-hierarchies.svg" target="_blank" rel="noopener noreferrer">BVHの図を拡大</a></figcaption>
</figure>

## 箱で枝を絞り、葉で実際の形状を調べる

図の矩形問い合わせは根の箱に重なります。次に枝1と枝2の箱を調べ、重ならない枝2を除外します。枝1の葉にあるAとBは候補です。円と矩形の正確な交差を調べると、Aだけが残ります。矩形の各軸の範囲へ円の中心座標を収めると、矩形内で円の中心に最も近い点を得られます。その点までの距離の二乗が半径の二乗以下なら、接する場合も含めてヒットです。

```text
query(node, area):
    if node is empty or disjoint(node.bounds, area):
        return
    if node is a leaf:
        for each object in node:
            if intersects(object.shape, area):
                report(object)
        return
    for each child of node:
        query(child, area)
```

接触を含める場合、箱の片方の最大値がもう片方の最小値と等しいときも調べます。箱の重なりを見たノード数を `v`、正確に調べた物体数を `c` とすると、各判定のコストが一定なこの例では `O(v + c)` です。問い合わせが広い場合や子の箱の重なりが多い場合は、両方の枝へ進む箇所が増えます。木の高さを抑えても訪問先が一経路に絞られるとは限らず、1回の問い合わせが全物体を調べる場合もあります。[pbrtのBVH走査と箱の重なり](https://www.pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies)

## 物体が動いたら箱や木を更新する

| 更新方法 | 変えるもの | 観察すること |
| --- | --- | --- |
| 初回構築・再構築（build / rebuild） | 現在の配置から物体をグループに分け直し、木と箱を作る | 構築コストと、その後に何回問い合わせを行うか |
| 箱の再計算（refit） | 葉の箱を更新し、親の箱を子から順に計算し直す。所属グループは維持する | 物体が離れると箱が広がり、除外しにくくなる場合がある |
| 動的木での局所更新 | 動いた物体を別の枝へ付け直すなど、一部の構造を変える | 移動・追加・削除にかかる時間と、問い合わせで訪れたノード数 |

pbrtはレイとプリミティブの交差を絞るためにBVHを構築します。Box2Dの動的AABB木では、物体の代理データを葉に持たせて範囲問い合わせやレイキャストを行います。例えば `b2DynamicTree_MoveProxy` は移動した代理データを木から外し、新しいAABBで挿入し直します。物理の**ブロードフェーズ**ではこのような木で衝突候補を集め、その後に実際の形状を照合します。レイキャストでも、箱との交差を通過した葉で形状との交差を調べます。[pbrtの構築と走査](https://www.pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies) · [Box2DのDynamic Tree API](https://box2d.org/documentation/group__tree.html) · [Koptaらのリフィットと局所更新の論文](https://hwrt.cs.utah.edu/papers/hwrt_rotations.pdf)

[範囲問い合わせの実験](/practice/algorithms/spatial-query-observation.html)では、円の中心で物体をおおむね半分ずつに分け、葉に最大4個の円を置いた2DのBVHを使います。範囲を動かして、全件を調べる場合や均等グリッドと、候補数とヒット結果を比べられます。3D描画での使い方は[ハードウェアレイトレーシング](/graphics/lighting/raytracing.html)で扱います。
