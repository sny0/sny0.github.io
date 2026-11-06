---
title: 総当たり・グリッド・BVHで範囲検索を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: algorithms
  collection: spatial-query-observation
  order: 1
  summary: 同じ48個の円に対し、総当たり・均等グリッド・BVHで検索範囲に触れる円を探し、詳細判定まで残る候補を比べる。
  aliases: [範囲検索, 空間インデックス, broad phase, 均等グリッド, BVH, AABB, 候補の絞り込み]
  verification: Nodeで5148通りの検索範囲と接触境界を照合し、Chromium系ブラウザで配置・セルサイズ・検索範囲の変更を確認（2026-11-06）
---

# 総当たり・グリッド・BVHで範囲検索を比べる

ゲームで範囲攻撃や索敵をするときは、すべての相手に対して形の交差を調べる方法と、近くにいる候補を集めてから詳しく調べる方法があります。この実験では同じ48個の円に対して、長方形の検索範囲に触れる円を探します。候補を集める仕組みは[均等グリッドと空間ハッシュ](/algorithms/uniform-grid-and-spatial-hash.html)と[BVHとAABB](/algorithms/bounding-volume-hierarchies.html)で解説しています。

<p><a href="/study/samples/algorithms/spatial-query-observation/index.html" target="_blank" rel="noopener noreferrer">範囲検索の比較実験を開く</a></p>

## 配置を変えて候補を比べる

1. 最初は円が画面全体に分散し、セルの一辺は64です。総当たりは48個、グリッドは7個、BVHは6個を詳しく調べます。命中する円はどの方式でも4個です。
2. セルの一辺を **128** にすると、読むセルは9個から4個に減りますが、詳細判定は7個から13個に増えます。セルの数と、その中に入っている候補数を分けて見ます。
3. 一辺を **64** に戻し、円の配置を **左上に密集** に切り替えます。今度は検索範囲の近くに円が集まり、命中が39個、グリッドの詳細判定が40個、BVHが45個になります。図をクリックするかスライダーを動かし、中心を外へ移すと、調べる候補が変わります。

## 図と数値が表すもの

- **均等グリッド**は、円を包む軸平行の境界箱（AABB）を、触れているセルに登録します。淡い青は検索で読むセルです。複数のセルから同じ円が出てきたら、一つにまとめます。
- **BVH**は円を半分ずつのグループに分け、各グループをAABBで包みます。円が4個以下になるまで分け、検索時は箱が重ならなかった枝を省きます。青い破線は重なった箱です。箱が重なった葉の円は、最後に一つずつ調べます。
- **詳細判定**はどの方式でも同じです。検索範囲内で円の中心に最も近い点を求め、その距離が半径以下なら命中です。オレンジの円は候補に入ったものの、この判定では範囲外だった対象です。

詳細判定の件数と、読むセル数・調べるノード数を別々に表示します。構造の作成や移動時の更新にかかる時間も含めて比較する場合は、実際のゲームの分布と検索の頻度で計測します。場所によって分割の細かさを変える構造は[四分木と八分木](/algorithms/quadtrees-and-octrees.html)で扱います。

## 手元で動かす {#run-locally}

<a href="/study/samples/algorithms/spatial-query-observation/index.html" download>index.html</a>、<a href="/study/samples/algorithms/spatial-query-observation/styles.css" download>styles.css</a>、<a href="/study/samples/algorithms/spatial-query-observation/main.js" download>main.js</a>、<a href="/study/samples/algorithms/spatial-query-observation/spatial-query.js" download>spatial-query.js</a>を同じフォルダに保存します。そのフォルダで次を実行し、ブラウザで `http://127.0.0.1:4205/` を開きます。停止はCtrl+Cです。

```powershell
python -m http.server 4205 --bind 127.0.0.1
```

## コード

### グリッド・BVHの構築と範囲検索

<<< @/public/samples/algorithms/spatial-query-observation/spatial-query.js{js}

### 選んだ方式の候補と検査結果を描く

<<< @/public/samples/algorithms/spatial-query-observation/main.js{js}
