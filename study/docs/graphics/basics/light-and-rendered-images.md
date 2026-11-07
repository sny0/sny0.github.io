---
title: 光とレンダリングの基本 — シーンから画像を作る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 形、表面、光、カメラから画像を作る流れを説明する。ラスタライゼーション、深度、影、直射光と間接光を、CPU・GPUと画面表示につなげる。
  aliases: [レンダリング, rendering, ライティング, lighting, 直射光, 間接光, 陰影, 影, 深度バッファ, ラスタライゼーション, リアルタイム, オフラインレンダリング]
  verification: Microsoftの描画パイプライン・深度テスト、Unityの照明・影、KhronosのPBR資料に照合（2026-11-07）
---

# 光とレンダリングの基本 — シーンから画像を作る

3Dの形や表面の設定を用意しても、そのままではディスプレイの2次元の画像にはなりません。**レンダリング**は、シーンのデータから画像を計算する処理です。何を、どこから、どんな光で見るかを決めて、画面に使う色を求めます。[Microsoftの描画パイプライン](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-graphics-pipeline) · [カメラと座標の基礎](/graphics/basics/transforms-and-cameras.html)

## 画像を作るための入力

| 入力 | 決めること |
| --- | --- |
| **シーン** | 物体、カメラ、ライトなどの配置。 |
| **メッシュ** | 物体の形と、頂点の位置や表面の向き。 |
| **マテリアル** | 色、粗さ、参照するテクスチャなど、表面の計算に使う設定。 |
| **カメラ** | どこから、どちらを向いて、どの範囲を見るか。 |
| **光の情報** | 光源の位置や方向、強さ、周囲から届く光など。 |

同じ物体でも、ライトやカメラを動かすと見た目が変わります。光と表面の関係から明るさや色を計算する処理を**ライティング**、表面の色などを求める処理を広く**シェーディング**と呼びます。[Unityのライティングの導入](https://docs.unity3d.com/2022.3/Documentation/Manual/LightingInUnity.html) · [マテリアルの基礎](/graphics/basics/materials-textures-and-shaders.html)

<figure class="study-figure">
  <img src="/images/graphics/light-and-rendered-images.svg" alt="形・表面・光・カメラのデータをもとに、CPUが描画する仕事を用意し、GPUが画面に覆われる範囲と色・深度を計算する。完成した画像を表示に使う。光源から直接届く光と、別の表面で反射して届く光を区別する。" width="760" height="476" loading="lazy">
  <figcaption>三角形を画面へ写す描画方式の概念図です。実際には複数の描画パスを組み合わせます。<a href="/study/images/graphics/light-and-rendered-images.svg" target="_blank" rel="noopener noreferrer">光と画像生成の図を拡大</a></figcaption>
</figure>

## 三角形から画面の色へ

ゲームでよく使う**ラスタライゼーション**では、三角形などをカメラから見た画面へ写し、どの画素・サンプルを覆うかを調べます。頂点から渡されたUVや向きなどを補間し、シェーダーがテクスチャや光の情報を使って色などを求めます。[Microsoftのラスタライザー](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-rasterizer-stage)

複数の物体が重なる場所では、手前の物体を見せる必要があります。**深度バッファ**は、画面の各位置について奥行きの情報を保持します。一般的な不透明物体の描画では、新しく描く面の深度と保存済みの深度を比較する**深度テスト**で、手前の面を選びます。半透明の面は、色を混ぜる順序なども考えて描きます。[Microsoftの深度テストとブレンド](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-output-merger-stage) · [ラスタライゼーションの詳細](/graphics/pipeline/rasterization.html)

## 直接届く光と、反射して届く光

**直射光**は、光源から表面へ直接届く光です。**間接光**は、別の表面などで反射してから届く光です。例えば白い箱を赤い壁の近くへ置くと、壁で反射した光が箱の色へ影響する場合があります。このような光の回り込みを含めて扱う仕組みを、**グローバルイルミネーション（GI）**と呼びます。[Unityの照明の考え方](https://docs.unity3d.com/2022.3/Documentation/Manual/LightingInUnity.html) · [GIの詳解](/graphics/lighting/gi.html)

リアルタイムのゲームでは、照明をその場で計算する部分と、前もって計算しておく部分を組み合わせることがあります。例えば、静止した壁に届く光を画像へ保存した**ライトマップ**や、空間の点に記録する**ライトプローブ**を使います。動く物体や光にどう対応するかは、採用した方式で変わります。[Unityの照明データと事前計算](https://docs.unity.com/en-us/engine/6000.0/manual/lighting-overview/direct-and-indirect-lighting)

## 影には、光が遮られるかの計算が必要

物体の向きによって暗くなる**陰影**に加え、別の物体が光を遮ってできる**影**もあります。影を付けるには、ライトから見てどこが遮られるかを調べるなど、影のための処理を用意します。**シャドウマップ**は、光源側から見た深度を使い、表面へ光が届くかを判定する方式です。[Unityのリアルタイムシャドウ](https://docs.unity.com/en-us/engine/6000.0/manual/lighting-overview/shadows/shadow-realtime)

影を落とすか・受けるか、対象距離、解像度などの設定は見た目と負荷に影響します。画面にモデルとライトがあっても、影の計算方式と対応する設定を確認します。[Unityの影の設定](https://docs.unity.com/en-us/engine/6000.0/manual/lighting-overview/shadows) · [シャドウの詳解](/graphics/lighting/shadow.html)

## リアルタイムとオフライン

**リアルタイムレンダリング**では、入力や世界の変化に応じて画像を継続的に作り、表示に間に合わせます。**オフラインレンダリング**では、映像や静止画などのために、出力する画像を時間をかけて計算できます。同じ目的でも、許される計算時間に応じて方式や設定を選びます。ゲームでも画像制作でも、光を反射しながら追うパストレーシングを使う構成があります。[パストレーシング](/graphics/lighting/path-tracing.html) · [フレームタイム](/graphics/optimization/frame-pacing.html)

**PBR（物理ベースレンダリング）**は、光と表面の関係を物理的なモデルに基づいて扱う考え方です。例えばglTFでは、ベースカラー、金属度、粗さで表面を指定するモデルを使います。光の計算やカメラの露出なども、最終的な見た目に関わります。[glTFのPBRマテリアル](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#materials) · [PBRの詳解](/graphics/lighting/pbr.html)

## CPUが用意し、GPUが描き、画像を表示する

CPU側でゲームの状態を更新し、見える物体や描画に必要な仕事を用意します。GPUへ渡すコマンドで、頂点の変換、色や深度の計算、後処理などを進めます。描画の完了と、ディスプレイがその画像を見せる時点には、それぞれの待ち時間や表示の仕組みが関わります。[描画パイプラインの全体像](/graphics/pipeline/overview.html) · [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)

ゲームの更新と描画のつながりは[ゲームループと時間](/game/basics/game-loop-and-time.html)、形のデータは[モデルとメッシュ](/graphics/basics/models-and-meshes.html)へ進めます。
