---
title: モデルとメッシュの基本 — 頂点から形を作る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: キャラクターや箱の形を例に、モデル、メッシュ、頂点、辺、面、三角形、インデックス、法線の役割を説明する。
  aliases: [3Dモデル, モデル, メッシュ, mesh, 頂点, vertex, 辺, edge, 面, face, ポリゴン, 三角形, インデックス, 法線, normal]
  verification: Unityのメッシュデータ資料、Blenderのメッシュ構造の説明とKhronosのglTF 2.0仕様に照合（2026-11-07）
---

# モデルとメッシュの基本 — 頂点から形を作る

ゲームに登場するキャラクターや箱は、形のデータを使って描きます。**3Dモデル**という言葉は、形に加え、見た目や動かすための情報を含む素材を指すこともあります。そのうち、点や面のつながりで形を表すものが**メッシュ**です。一つのモデルに、体や装備など複数のメッシュを含められます。[Unityのメッシュ入門](https://docs.unity3d.com/6000.0/Documentation/Manual/mesh-introduction.html)

## 点を置き、辺と面でつなぐ

| 用語 | 何を表すか | 箱を考える例 |
| --- | --- | --- |
| **頂点** | 形を構成する点。3Dでは位置を通常三つの座標で表す。 | 箱の角にある点。 |
| **辺** | 頂点同士のつながり。 | 角と角を結ぶ線。 |
| **面・ポリゴン** | 複数の辺で囲む表面の部分。 | 箱の上面や側面。 |
| **三角形** | 三つの頂点で作る面。 | 四角い面を対角線で分けた二つの面。 |

モデリングツールでは四角形や、さらに多くの頂点を持つ面も編集できます。ゲームの一般的な三角形描画へ渡す際は、そうした面を三角形へ分けます。この処理を**三角形化**と呼びます。描画方式によっては線や点なども使うため、メッシュのデータを読むときは、どの単位で組み立てるかも確認します。[Blenderの頂点・辺・面](https://docs.blender.org/manual/en/4.0/modeling/meshes/structure.html) · [Unityのメッシュのトポロジー](https://docs.unity.com/en-us/engine/6000.0/manual/assets-and-media/asset-types/mesh/get-started-with-meshes/anatomyofa/topology-data)

## 頂点番号で三角形を指定する

四つの頂点に`0`から`3`の番号を付けます。三角形を作る頂点番号を並べたものが**インデックス**です。例えば`0, 1, 2`で一つ、`0, 2, 3`でもう一つの三角形を作れば、四角い面を表せます。番号0と2は両方の三角形で再利用できます。[Unityのインデックスデータ](https://docs.unity.com/en-us/engine/6000.0/manual/assets-and-media/asset-types/mesh/get-started-with-meshes/anatomyofa/index-data)

<figure class="study-figure">
  <img src="/images/graphics/models-and-meshes.svg" alt="四角形の頂点に左下から0、1、2、3と番号を付ける。0・1・2と0・2・3の二つの三角形を指定し、同じ位置のデータを共有する。頂点には位置のほか、法線やUVなどの属性を付けられる。" width="760" height="460" loading="lazy">
  <figcaption>位置と番号を使って形を表す説明用の例です。<a href="/study/images/graphics/models-and-meshes.svg" target="_blank" rel="noopener noreferrer">頂点と三角形の図を拡大</a></figcaption>
</figure>

頂点の並び順も描画の設定に使います。片側だけを描く設定では、三角形をどちらから見ているかによって描画されるかが変わります。形があるのに片側から消える場合は、面の向きと描画設定を調べます。[KhronosのglTFのメッシュ仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes) · [ラスタライゼーション](/graphics/pipeline/rasterization.html)

## 頂点には位置以外の情報もある

描画で使う頂点には、位置だけでなく、次のような**属性**を持たせられます。使う属性はメッシュや描画方法によって変わります。[Unityの頂点データ](https://docs.unity.com/en-us/engine/6000.0/manual/assets-and-media/asset-types/mesh/get-started-with-meshes/anatomyofa/vertex-data)

| 属性 | 主な用途 |
| --- | --- |
| **位置** | 頂点をどこに置くか。 |
| **法線** | 表面の向きを表し、光の反射などの計算に使う。 |
| **UV** | テクスチャのどの場所を表面へ対応させるか。 |
| **頂点色** | 頂点に付けた色を、描画の計算に使う。 |

**法線**は向きを表す値です。面の向きにそろえた法線を使うと面ごとの境界が見えやすく、つながる面の法線をなめらかに変化させると丸みがあるように見せられます。法線による見た目の変化と、頂点位置を動かして輪郭を変える操作は、それぞれ役割が異なります。[Unityの頂点法線](https://docs.unity.com/en-us/engine/6000.0/manual/assets-and-media/asset-types/mesh/get-started-with-meshes/anatomyofa/vertex-data#normal)

## 同じ角に複数の頂点を置くことがある

立方体の角は幾何学的には一か所でも、面ごとに異なる法線を使って硬い境目を作る場合があります。描画用の一つの頂点番号で位置と法線などをまとめて選ぶ形式では、その角に位置が同じで法線が違う頂点を用意します。UVのつなぎ目も、位置が同じで別のUVを持つ例です。モデリングツールの点の数と、書き出した描画用頂点の数が変わることがあります。[頂点属性とインデックスの詳細](/graphics/mesh/vertex-and-index-input.html) · [Khronosの頂点属性とインデックス](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes)

## ゲームに置くときに足すもの

メッシュを使う物体は、シーン内での位置や向き、見た目、動作なども持ちます。同じメッシュを使い、位置や材質を変えた複数の箱を置くこともできます。[シーンとコンポーネント](/game/basics/scenes-and-components.html)

配置の基本は[座標変換とカメラ](/graphics/basics/transforms-and-cameras.html)、表面の見た目は[マテリアル・テクスチャ・シェーダー](/graphics/basics/materials-textures-and-shaders.html)へ進みます。ファイルから実際のデータを取り出す方法は、[glTFのメッシュバッファ](/graphics/mesh/gltf-mesh-buffers.html)で扱います。
