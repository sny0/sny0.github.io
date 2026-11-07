---
title: 3DCGの形と見た目から読む
study:
  source: 新規執筆
  section: learning
  format: path
  status: published
  domain: graphics
  collection: foundations
  order: 4
  summary: メッシュ、座標とカメラ、材質と光、アニメーション、リグとスキニングを図で確かめる読み順。
---

# 3DCGの形と見た目から読む

「モデルを置く」「マテリアルを設定する」といった操作が、画像とどう結び付くかを知りたいときの入口です。まず形、位置、見た目、画像を作る処理を順に見ます。

## 読む順番

1. [モデルとメッシュ](/graphics/basics/models-and-meshes.html)で、頂点や面がどのように形を表すかを調べます。
2. [座標変換とカメラ](/graphics/basics/transforms-and-cameras.html)で、物体の位置と、画面からの見え方を追います。
3. [マテリアル・テクスチャ・シェーダー](/graphics/basics/materials-textures-and-shaders.html)で、形の表面にどんな情報を与えるかを見ます。
4. [光と描画された画像](/graphics/basics/light-and-rendered-images.html)で、シーンから画像を作る流れをつなげます。

## 形を時間に合わせて動かす

1. [キーフレームとアニメーション](/graphics/basics/keyframes-and-animation.html)で、時間に沿って位置や値を変える仕組みを見ます。
2. [リグとスキニング](/graphics/basics/rigs-and-skinning.html)で、骨の配置とメッシュの変形をつなげます。

## 図から確かめること

- 同じ形でも、位置、カメラ、材質、光が変わると見え方が変わる理由を説明できる。
- 頂点やUV、テクスチャなどのデータと、それを使う計算の役割を区別できる。
- ゲーム内の配置から、画面に表示する画像が作られるまでの段階をたどれる。

## さらに調べる

数学から確認したいときは[ベクトル](/math/rendering/vector.html)、[座標変換](/math/rendering/transform.html)、[カメラ](/math/rendering/camera.html)へ進みます。GPUでの処理を追う場合は[レンダリングパイプライン](/graphics/pipeline/overview.html)、制作したモデルの取り込みは[メッシュのインポート](/graphics/mesh/mesh-import-and-cooking.html)が次の入口です。

ゲームを組み立てる側の基礎は、[ゲームの動きと構成から読む](/guide/game-development-basics.html)へ進めます。
