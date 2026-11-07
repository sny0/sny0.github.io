---
title: シェーダーの第一歩 — 頂点から三角形の色を作る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 三角形を描く例から、頂点シェーダー、ラスタライゼーション、補間、フラグメントシェーダーを追う。GLSLとHLSLの型や演算を読み、値を変えて見た目を変える。
  aliases: [シェーダー, シェーダ, shader, 頂点シェーダー, Vertex Shader, ピクセルシェーダー, Fragment Shader, GLSL, HLSL, UV, 補間, mix, lerp]
  verification: KhronosのGLSL ES 3.00仕様とMicrosoftの描画パイプライン・HLSL資料に照合（2026-11-07）
---

# シェーダーの第一歩 — 頂点から三角形の色を作る

三角形を右へ動かし、表面に色のグラデーションを付ける場面を考えます。**シェーダー**は、描画の途中で位置や色などを計算するプログラムです。CPU側のアプリが使うデータと描画の指示を用意し、GPU側が設定されたシェーダーを実行します。ここでは、頂点シェーダーとフラグメントシェーダーを使う三角形描画を追います。[Microsoftの描画パイプライン](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-graphics-pipeline)

## 位置を決める処理と、色を作る処理

| 段階 | 受け取るもの | 主な仕事 |
| --- | --- | --- |
| **頂点入力** | 位置、UVなどの頂点データ。 | 描画で使う頂点の属性を渡す。 |
| **頂点シェーダー（VS）** | 入力した頂点の属性、共通の設定。 | 頂点の出力位置を計算し、UVなどを後段へ渡す。 |
| **三角形の組み立て・ラスタライゼーション** | 頂点シェーダーの出力。 | 三角形が画面のどこを覆うか調べ、途中の属性を補間する。 |
| **フラグメントシェーダー（FS）** | 補間されたUVなど、共通の設定。 | 描画候補の色などを計算する。Direct3DではPixel Shaderとも呼ぶ。 |
| **深度・ブレンドなど** | 色や深度、描画先の内容。 | 採用する値を判定し、必要なら色を混ぜて画像を更新する。 |

<figure class="study-figure">
  <img src="/images/graphics/shader-first-steps.svg" alt="CPUが三角形の頂点と共通設定を用意する。頂点シェーダーが位置とUVを出力し、ラスタライザーが三角形を組み立ててUVを補間する。フラグメントシェーダーが色を計算し、深度やブレンドの処理を経て画像になる。" width="760" height="492" loading="lazy">
  <figcaption>三角形を描くための概念図です。深度判定の一部を先に行う構成など、実際の処理順には最適化もあります。<a href="/study/images/graphics/shader-first-steps.svg" target="_blank" rel="noopener noreferrer">シェーダーの処理図を拡大</a></figcaption>
</figure>

フラグメントは、物体が画面を覆う場所について計算する描画候補です。シェーダーが色を返しても、深度判定などで画像へ残らない場合があります。また、物体の重なりやサンプル単位の実行、補助的な実行などがあるため、見えている画素数とFSの実行回数は必ずしも一致しません。[Microsoftのラスタライズと補助的な実行](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-rasterizer-stage-rules) · [深度と出力の処理](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-output-merger-stage)

## 頂点シェーダーで、三角形を右へ動かす

実践では、各頂点へ2次元の位置`a_position`とUV座標`a_uv`を渡します。WebGL 2のGLSL ES 3.00で、処理の中心は次のように書けます。これは説明用の抜粋です。

```glsl
gl_Position = vec4(a_position + vec2(u_offset, 0.0), 0.0, 1.0);
v_uv = a_uv;
```

`u_offset`をX位置に足すと、三角形全体が横へ動きます。`gl_Position`へ書く値は**クリップ座標**です。この例では`w`を`1`にして、入力した2次元の位置をそのまま扱いやすくしています。3Dの物体では、モデル、カメラ、投影の変換を組み合わせて出力位置を作ります。[KhronosのGLSL ESの頂点出力](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) · [座標とカメラの基礎](/graphics/basics/transforms-and-cameras.html)

CPU側は、頂点の並びや形式を用意して描画を依頼します。頂点シェーダーの中では、渡された頂点について出力を計算します。UVも出力すると、ラスタライザーが三角形の内部へつなぎ、FSがその場所の値を受け取れます。[Microsoftの頂点シェーダーステージ](https://learn.microsoft.com/en-us/windows/win32/direct3d11/vertex-shader-stage)

## UVを、そのまま赤と緑に使う

三角形のUVを、左下`(0, 0)`、右下`(1, 0)`、上`(0.5, 1)`とします。この例は各頂点の`w`がすべて`1`なので、途中のUVは画面上で線形に変わります。Uを赤、Vを緑、青を`0.25`にすると、その変化を色で見られます。テクスチャを読まず、座標から直接色を作る例です。[KhronosのGLSL ESの補間規則](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)

```glsl
vec3 base = mix(vec3(1.0), vec3(v_uv, 0.25), u_useUv);
outColor = vec4(base * u_tint, 1.0);
```

`vec3(v_uv, 0.25)`は、UVの二つの値と青の値を組み合わせた3成分です。`u_useUv`を`0`にすると白、`1`にするとUVからの色を選びます。さらに`u_tint`のRGBを掛け、色合いを変えます。`outColor`の4番目の成分は、この例では`1`に固定したアルファです。

## GLSLとHLSLの短い式を読む

| したいこと | GLSL | HLSL |
| --- | --- | --- |
| 浮動小数点の値を持つ | `float` | `float` |
| 2・3・4成分をまとめる | `vec2`・`vec3`・`vec4` | `float2`・`float3`・`float4` |
| 4成分からRGBを取り出す | `color.rgb` | `color.rgb` |
| 二つの値を割合で混ぜる | `mix(a, b, t)` | `lerp(a, b, t)` |
| 値を0〜1へ収める | `clamp(x, 0.0, 1.0)` | `saturate(x)` |

`.rgb`や`.xy`のように成分を選ぶ書き方を**スウィズル**と呼びます。数値の割合を使う`mix`や`lerp`は、`t = 0`なら`a`、`t = 1`なら`b`、その間なら二つを混ぜます。割合を0〜1へ収める必要がある場合は、別に`clamp`などを使います。[Khronosの型・成分選択・組み込み関数](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) · [Microsoftのlerp](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-lerp) · [saturate](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-saturate)

GLSLの抜粋と同じ色の計算は、HLSLでは次のように表せます。`input.uv`はVSからのUV、`controls.y`は0または1、`tint.rgb`は色の設定です。

```hlsl
float3 base = lerp(float3(1.0, 1.0, 1.0), float3(input.uv, 0.25), controls.y);
return float4(base * tint.rgb, 1.0);
```

言語を変えると、入出力の宣言やリソースを対応付ける書き方も変わります。HLSLの`SV_Position`や`SV_Target`、GLSLの`in`・`out`などの役割は、[シェーダーへ渡すデータ](/graphics/shader/shader-inputs-and-uniforms.html)で確認します。

## プログラムと、渡す値を分けて考える

アプリは、シェーダーのソースをコンパイルし、使う描画の設定へ組み込みます。描画中に色や移動量を変えるときは、用意したプログラムへ設定値を渡して使えます。実践では、色を変える操作は`u_tint`、横へ動かす操作は`u_offset`へ反映します。[シェーダーの入力と共通設定](/graphics/shader/shader-inputs-and-uniforms.html)

## 実際に動かす

[シェーダーで三角形の位置と色を変える実践](/practice/graphics/shader-first-steps.html)では、GLSLを使って描画し、位置、色、UVの表示を切り替えられます。完全なGLSLと対応するHLSLのコードも、実践側から確認できます。

材質や画像を読む仕組みは[マテリアル・テクスチャ・シェーダー](/graphics/basics/materials-textures-and-shaders.html)、各言語の詳しい機能は[HLSL](/graphics/shader/hlsl.html)と[GLSL](/graphics/shader/glsl.html)へ進みます。
