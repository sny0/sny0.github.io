---
title: シェーダーへ渡すデータ — 頂点属性・uniform・テクスチャ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 三角形の位置とUV、共通の色を例に、頂点属性、ステージ間の補間、uniformと定数バッファ、テクスチャとサンプラーの渡し方を説明する。
  aliases: [シェーダー入力, 頂点属性, attribute, varying, uniform, 定数バッファ, cbuffer, セマンティクス, binding, バインディング, テクスチャ, サンプラー]
  verification: KhronosのGLSL ES 3.00仕様、MDNのWebGL API、MicrosoftのHLSL定数・配置とD3D12バインディング資料に照合（2026-11-07）
---

# シェーダーへ渡すデータ — 頂点属性・uniform・テクスチャ

三角形の形を保ったまま全体の色を変えるとき、シェーダーには「頂点ごとに違う位置」と「描画に共通する色」が必要です。コードに書く変数がどこから来るかを見分けると、CPU側で何を用意するかが分かります。[シェーダーの基礎](/graphics/shader/shader-first-steps.html)

## データを使う範囲から見る

| 入力の種類 | この例の値 | 用意するもの |
| --- | --- | --- |
| **頂点属性** | 各頂点の位置とUV。 | 頂点バッファと、その中の値を取り出す配置の指定。 |
| **uniform・定数** | 三角形全体に掛ける色、横方向への移動量。 | CPU側で指定する共通の値。HLSLでは定数バッファなどにまとめる。 |
| **テクスチャ** | 表面の色や粗さなどを記録したデータ。 | GPUから参照するデータと、読む場所の接続。 |
| **サンプラー** | テクスチャの拡縮や範囲外をどう読むか。 | フィルタリングや繰り返しなどの設定。 |

CPU側で値を用意し、シェーダーが使う入力へ対応付ける操作を**バインド**と呼びます。どの値を使うかと、どの入力へ接続するかを合わせます。[Microsoftのリソースバインディング](https://learn.microsoft.com/en-us/windows/win32/direct3d12/resource-binding)

<figure class="study-figure">
  <img src="/images/graphics/shader-inputs-and-uniforms.svg" alt="CPU側が位置とUVの頂点バッファ、共通の色と移動量、テクスチャとサンプラーを用意する。頂点属性を頂点シェーダーへ渡し、UVを補間してピクセル側へ渡す。uniformや定数バッファの値と参照するデータを使って色を計算する。" width="760" height="490" loading="lazy">
  <figcaption>データの配置と接続を用意してから描画します。テクスチャは、今回の三角形の実践を発展させる場合の入力です。<a href="/study/images/graphics/shader-inputs-and-uniforms.svg" target="_blank" rel="noopener noreferrer">シェーダー入力の図を拡大</a></figcaption>
</figure>

## 頂点属性は、バッファのどこから読むかを決める

実践の頂点は、二つの数で位置を表す`a_position`と、二つの数でUVを表す`a_uv`を持ちます。例えば各頂点を`位置X・位置Y・U・V`の順に32ビット浮動小数点数で並べるなら、次の頂点までは16バイト、UVの開始は頂点先頭から8バイトです。[WebGLのvertexAttribPointer](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer)

この間隔を**ストライド**、先頭からの位置を**オフセット**と呼びます。WebGLでは、対応する属性の場所を調べるか、GLSL ESの`layout(location=...)`などで決め、型・個数・ストライド・オフセットを指定します。入力名を`a_position`と書くことに加え、CPU側でその入力とバッファを接続します。[属性の接続と有効化](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer) · [頂点とインデックス入力の詳解](/graphics/mesh/vertex-and-index-input.html)

## 頂点から渡したUVは、三角形の途中で補間する

WebGL 2で使うGLSL ES 3.00では、頂点側の`out vec2 v_uv`と、フラグメント側の`in vec2 v_uv`などを対応させます。頂点側が出したUVをもとに、三角形の内部で使うUVを求めます。こうしたステージ間で渡す値は、**varying**とも呼ばれます。[GLSL ES 3.00の入出力と補間 §4.3](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)

通常の浮動小数点数の入出力には、既定で透視補正を含む**smooth補間**を使います。実践では頂点のクリップ座標の`w`をすべて`1`にしているため、UVの変化を画面上の三角形で追いやすくしています。`flat`を指定する場合などは、受け渡しの規則が変わります。[GLSL ESの補間 §4.3.9](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) · [座標と投影の基礎](/graphics/basics/transforms-and-cameras.html)

## uniformで、描画に共通する値を渡す

実践のフラグメント側には次の共通値を渡します。`u_tint`はRGBの三つの成分、`u_useUv`は白とUVの色を混ぜる割合です。頂点側には横へ動かす`u_offset`も渡します。

```glsl
uniform vec3 u_tint;
uniform float u_useUv;
```

WebGLでは、リンクした**プログラムオブジェクト**ごとにuniformの値を持ちます。`getUniformLocation`で対象の場所を取得し、`useProgram`で選んだプログラムのuniformへ、`uniform3f`などのAPIで値を設定します。設定した値は、同じプログラムを次に使うときも保持されます。再リンクが成功すると初期値へ戻ります。[uniformの値と保持期間](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniform) · [uniformの場所を取得する](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getUniformLocation)

色の操作だけを変えるなら、描画前にuniformを設定して再び描けます。シェーダーのソースを書き換えてコンパイルする操作と、すでにある入力の値を変える操作を区別すると、画面の変化を追えます。[WebGLのプログラムのリンク](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/linkProgram)

## HLSLでは定数バッファへまとめる例がある

対応するHLSLの例では、共通の値を次のようにまとめます。`tint.rgb`が色、`controls.x`が移動量、`controls.y`がUVの色を使う割合です。

```hlsl
cbuffer Parameters : register(b0)
{
    float4 tint;
    float4 controls;
};
```

`b0`は、この定数バッファが使う入力の割り当てです。CPU側も、その割り当てに対応するデータを渡します。HLSLの頂点入力は`POSITION`や`TEXCOORD0`という**セマンティクス**を使い、CPU側の入力レイアウトと対応させます。頂点側の`SV_Position`は、ラスタライズに使うクリップ座標を出すためのシステム値です。[HLSLの定数バッファ](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-constants) · [HLSLのセマンティクス](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics)

この例の`float4`は一つ16バイトで、二つの格納データは32バイトです。型を増やすときは、余白である**パディング**や、配列・行列の配置の規則も確認します。D3D12のCBVのサイズ指定などには、格納する値の大きさとは別のアラインメント要件があります。[HLSLの配置規則](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-packing-rules) · [D3D12のCBV](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_constant_buffer_view_desc)

## テクスチャとサンプラーも、使うものを接続する

UVを色として表示する代わりに、UVでテクスチャを参照できます。WebGLの`sampler2D`には、どのテクスチャユニットを読むかを整数で設定し、そのユニットへテクスチャを接続します。HLSLの`Texture2D`と`SamplerState`では、参照するデータと読む設定を別々に指定する形があります。[MDNのWebGLテクスチャ](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL) · [HLSLのテクスチャサンプリング](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-sample)

テクスチャを読む場所はUVが示し、周囲の値の混ぜ方や範囲外の扱いはサンプラーなどの設定で決まります。詳しい役割は[マテリアル・テクスチャ・シェーダー](/graphics/basics/materials-textures-and-shaders.html)で確認できます。

## コードの準備と、描画時の設定を追う

WebGLではシェーダーをコンパイルしてプログラムをリンクし、描画時にはプログラム、頂点入力、uniform、テクスチャなどを設定します。D3D12では、コンパイルしたシェーダーや描画設定をPSOへまとめ、コマンドでPSOやリソースの接続を指定します。[WebGLのリンク](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/linkProgram) · [D3D12のPSO](https://learn.microsoft.com/en-us/windows/win32/direct3d12/managing-graphics-pipeline-state-in-direct3d-12)

実際の値を変えて追うには、[三角形の色と位置を変える実践](/practice/graphics/shader-first-steps.html)へ進みます。バッファやテクスチャをGPUで使い終える時点は、[GPUリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)で扱います。
