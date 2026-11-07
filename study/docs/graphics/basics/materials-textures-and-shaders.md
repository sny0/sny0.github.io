---
title: マテリアル・テクスチャ・シェーダーの基本
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 同じ形の箱に木目や金属の見た目を付ける例から、マテリアル、テクスチャ、UV、シェーダー、サンプラーの役割を説明する。
  aliases: [マテリアル, material, テクスチャ, texture, UV, テクセル, シェーダー, shader, サンプラー, sampler, フィルタリング, metallic, roughness]
  verification: Unityのマテリアル・テクスチャ資料、KhronosのglTF仕様、Microsoftの描画パイプライン資料に照合（2026-11-07）
---

# マテリアル・テクスチャ・シェーダーの基本

同じ形の箱でも、木目のある箱や、光を反射する金属の箱として描けます。[メッシュ](/graphics/basics/models-and-meshes.html)が形を表すのに対し、表面の見え方を指定するために使うのが**マテリアル**です。形のデータと表面の設定を組み合わせて、一つの物体を描きます。[Unityのマテリアルの説明](https://docs.unity.com/en-us/engine/6000.0/manual/materials-and-shaders/materials/introduction)

## 表面の設定、参照するデータ、計算するプログラム

コードで色ができる流れは、[シェーダーの第一歩](/graphics/shader/shader-first-steps.html)から追えます。

| 名前 | 担当すること | 木の箱の例 |
| --- | --- | --- |
| **マテリアル** | 表面の計算に使う値やデータへの参照、利用するシェーダーなどを指定する。 | 茶色、表面の粗さ、木目の画像を設定する。 |
| **テクスチャ** | 描画中に参照する、画素状に並んだ値などのデータ。 | 木目の画像を保持する。 |
| **シェーダー** | 頂点や画面上の領域などを処理するプログラム。 | 木目、光、表面の向きなどから色を計算する。 |

例えばUnityのマテリアルは、シェーダーへの参照を持ち、そのシェーダーが公開する色やテクスチャなどの値を設定します。マテリアルが含む項目や描画設定の分担は、エンジンや描画方式で変わります。同じシェーダーへ異なる値を渡し、複数の見た目を作ることもできます。[Unityのマテリアルの構成](https://docs.unity.com/en-us/engine/6000.0/manual/materials-and-shaders/materials/introduction) · [Microsoftのプログラム可能な描画ステージ](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-graphics-pipeline)

<figure class="study-figure">
  <img src="/images/graphics/materials-textures-and-shaders.svg" alt="マテリアルが色・粗さ・テクスチャなどを指定し、シェーダーが頂点から渡されたUVや光の情報と組み合わせて色を計算する。UVはテクスチャのどこを参照するかを表し、サンプラーは周辺の値の読み方を決める。" width="760" height="476" loading="lazy">
  <figcaption>ゲームでGPUを使う例で、設定するデータと、処理するプログラムの役割を比べます。<a href="/study/images/graphics/materials-textures-and-shaders.svg" target="_blank" rel="noopener noreferrer">マテリアルとテクスチャの図を拡大</a></figcaption>
</figure>

## UVは、テクスチャのどこを見るかを表す

**UV**は、メッシュの表面と2次元のテクスチャを対応付ける座標です。例えば箱の角に「画像のこの位置を使う」というUVを設定します。三角形の内部を描くときは、頂点から渡されたUVを補間して、途中の位置でも対応するテクスチャの値を読めるようにします。[glTFの頂点属性とテクスチャ座標](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes) · [Microsoftの頂点属性の補間](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-rasterizer-stage)

画像を0〜1の範囲で参照する例では、`(0.5, 0.5)`は中央です。範囲の外を繰り返すか、端で止めるかは読み方の設定で決まります。画像の上下の扱いやUVの原点は、形式やAPIの規約と合わせます。[glTFのテクスチャ座標とサンプラー](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#texture-data)

同じメッシュの場所でも、面ごとに画像の別の位置へ対応付けたいことがあります。UVを切り分ける境界を**シーム**と呼びます。描画用の頂点にはUVも含まれるため、同じ位置にUVの異なる頂点を用意する場合があります。[glTFのメッシュの属性](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes) · [頂点とインデックスの詳細](/graphics/mesh/vertex-and-index-input.html)

## サンプラーが、値の読み方を決める

テクスチャ内の一つの要素を**テクセル**と呼びます。画面に描く位置とテクセルの位置は、常に一対一にはなりません。**サンプラー**には、近くのテクセルを選ぶか、周辺の値を混ぜるかといった**フィルタリング**や、座標が範囲外のときの扱いを指定します。[Microsoftのテクセル](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-resources-textures-intro) · [サンプラーの設定](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_sampler_desc) · [フィルタリング](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ne-d3d11-d3d11_filter)

遠くにある物体には、元画像より小さい**mip（ミップ）**の画像を使うこともあります。読み取る範囲に合う解像度を選ぶことで、細かな模様のちらつきや読み取り負荷を抑えられます。[Unityのテクスチャとmip](https://docs.unity.com/en-us/engine/6000.0/manual/materials-and-shaders/textures/textures-getting-started/textures) · [mipの常駐とストリーミング](/graphics/texture/texture-streaming-and-mip-residency.html)

## テクスチャに入るものは、色のほかにもある

| データの例 | 表すもの |
| --- | --- |
| **ベースカラー** | 表面の基本となる色。照明計算への入力として使う。 |
| **ラフネス** | 表面の微細な粗さ。反射の広がり方に関係する。 |
| **メタリック** | 金属としての反射の扱いを指定する値。 |
| **法線マップ** | 細かな表面の向きを表し、陰影の計算に使う。 |

色のデータと、粗さや向きなどの数値では、読み取り時に必要な色空間の扱いも異なります。例えばglTFではベースカラーのRGBにsRGBの符号化を使い、粗さや金属度の値には線形の値を使います。保存形式と、シェーダーが期待する値を合わせます。[glTFのマテリアルと追加テクスチャ](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#materials)

## 一つのモデルを複数の表面で描く

キャラクターの服、肌、金属の装備には、異なるマテリアルを割り当てられます。描画時には、メッシュの部分と対応するマテリアルを組にして扱います。例えばglTFでは、メッシュを構成する各プリミティブがマテリアルを参照できます。[glTFのメッシュとマテリアルの対応](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes)

画面の色ができるまでの全体は[光とレンダリングの基本](/graphics/basics/light-and-rendered-images.html)、シェーダーの種類は[シェーダ言語の総論](/graphics/shader/overview.html)、表面と光の詳しい計算は[PBR](/graphics/lighting/pbr.html)へ進めます。
