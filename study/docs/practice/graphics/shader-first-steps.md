---
title: シェーダーで三角形の位置と色を変える
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: shader-first-steps
  order: 1
  summary: WebGL 2で頂点シェーダーとフラグメントシェーダーを実行し、横位置、色、UV表示を変えて、属性とuniformの働きを確かめる。対応するHLSLのコードも読む。
  aliases: [シェーダー実践, shader, WebGL 2, GLSL ES, HLSL, UV, uniform, 頂点シェーダー, ピクセルシェーダー]
  verification: ChromeのANGLE・SwiftShaderで描画画素、操作、失敗時の表示を確認。HLSLのVS・PSをDXCでShader Model 6.0へコンパイル確認（2026-11-07）
---

# シェーダーで三角形の位置と色を変える

三つの頂点から三角形を描きます。頂点シェーダーは位置を計算してUVを渡し、フラグメントシェーダーはそのUVや共通の色から、出力する色を計算します。ブラウザー版は**WebGL 2とGLSL ES 3.00**を使います。[シェーダーの第一歩](/graphics/shader/shader-first-steps.html)

## ブラウザーで試す

<a href="/study/samples/graphics/shader-first-steps/index.html">三角形のシェーダー教材を開く</a>

1. 最初の三角形は、赤にUVのU、緑にV、青に`0.25`を使います。頂点の間で値が変わる様子を見ます。
2. **全体を同じ色にする**へ切り替えます。今度は全体が共通の色から計算されます。
3. **色を掛ける**を変えます。例えば赤なら、出力の緑と青の成分が0になります。
4. **横位置**を変えます。形が動いても、UVの模様は形に付いたままです。描画範囲を越えた部分は切り取られます。
5. **初期状態に戻す**で元に戻し、下に表示するuniformの数値と見比べます。

初期化時に二つのシェーダーをコンパイルし、プログラムへリンクします。操作するたびに、JavaScriptがuniformを更新して再描画します。コンパイルやリンクの失敗は、実行ログへ表示します。[WebGLのシェーダー作成](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/compileShader) · [プログラムのリンク](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/linkProgram)

## 入力と、シェーダーで使う値

| 値 | どう渡すか | この例での使い道 |
| --- | --- | --- |
| `a_position` | 頂点ごとに渡す2成分。 | 三角形の位置。 |
| `a_uv` | 頂点ごとに渡す2成分。 | 色の計算に使うUV。 |
| `u_offset` | 描画前に設定するuniform。 | 横方向へ加える値。 |
| `u_tint` | 描画前に設定する3成分のuniform。 | 赤・緑・青へ掛ける値。 |
| `u_useUv` | `0`または`1`のuniform。 | 一定色か、UVを使う色かを選ぶ。 |

一つの頂点を`位置X・位置Y・U・V`の4個の32ビット浮動小数点数で用意します。頂点一件は16バイトで、位置は先頭から、UVは8バイト目から読みます。JavaScriptの`vertexAttribPointer`が、バッファのどこを各属性へ渡すかを指定します。[WebGLの頂点属性](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer) · [シェーダーへ渡すデータ](/graphics/shader/shader-inputs-and-uniforms.html)

## 頂点シェーダー

位置に横移動の値を加え、`gl_Position`へ出します。今回は投影行列を使わず、出力位置の`w`を`1`にした例です。UVはそのまま次の段階へ渡します。

<<< @/public/samples/graphics/shader-first-steps/triangle.vert{glsl}

## フラグメントシェーダー

`u_useUv`が`0`なら`base`は白、`1`ならUVから作る色です。その値に`u_tint`を成分ごとに掛けます。この例のアルファは`1`です。UVの数値を直接見るための、照明計算前の描画です。

<<< @/public/samples/graphics/shader-first-steps/triangle.frag{glsl}

## 同じ計算をHLSLで書く

HLSLの`VSMain`と`PSMain`で、同じ位置と色の計算を表します。`tint.rgb`が色、`controls.x`が横移動、`controls.y`がUV表示の選択です。定数バッファの宣言は、16バイトの`float4`を二つ持ちます。[HLSLの定数バッファ](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-constants)

<<< @/public/samples/graphics/shader-first-steps/triangle.hlsl{hlsl}

DirectX Shader Compiler（DXC）を用意した環境では、次のコマンドでそれぞれコンパイルできます。HLSL版を描画に使うには、Direct3D側で入力レイアウト、定数バッファ、描画先などを用意して接続します。[DXCの使い方](https://github.com/microsoft/DirectXShaderCompiler/wiki/Using-dxc.exe) · [HLSLの入出力セマンティクス](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics)

```powershell
dxc -T vs_6_0 -E VSMain -Fo triangle-vs.dxil triangle.hlsl
dxc -T ps_6_0 -E PSMain -Fo triangle-ps.dxil triangle.hlsl
```

## 手元で動かす {#run-locally}

次の6ファイルを同じフォルダーに保存します。

- <a href="/study/samples/graphics/shader-first-steps/index.html" download>index.html</a>
- <a href="/study/samples/graphics/shader-first-steps/main.js" download>main.js</a>
- <a href="/study/samples/graphics/shader-first-steps/styles.css" download>styles.css</a>
- <a href="/study/samples/graphics/shader-first-steps/triangle.vert" download>triangle.vert</a>
- <a href="/study/samples/graphics/shader-first-steps/triangle.frag" download>triangle.frag</a>
- <a href="/study/samples/graphics/shader-first-steps/triangle.hlsl" download>triangle.hlsl</a>

Pythonがある環境なら、そのフォルダーでHTTPサーバーを起動し、`http://127.0.0.1:8000/`を開きます。`Ctrl+C`でサーバーを止められます。

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

ブラウザー版が読み込むシェーダーは`triangle.vert`と`triangle.frag`です。編集後に再読み込みすると、変更したシェーダーのコンパイル結果と描画を確認できます。WebGL 2を利用できない場合には、画面へ説明を表示します。
