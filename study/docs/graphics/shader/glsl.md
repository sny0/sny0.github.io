---
title: GLSL
study:
  source: RenderingWiki
  status: published
  summary: GLSL (OpenGL Shading Language) はKhronosのOpenGL/Vulkan向けシェーダ言語です。2004年にOpenGL 2.0で標準化され、20年にわたりクロスプラットフォームシェーダの共通語として使われてきました。現在は「OpenGL用の実行時コンパイル言語」と「
  section: reference
  format: article
  domain: graphics
---

# GLSL

WebGL 2とGLSL ES 3.00で実際に描く例は、[シェーダーの第一歩](/graphics/shader/shader-first-steps.html)と[三角形の実践](/practice/graphics/shader-first-steps.html)へ進みます。

## 概要

GLSL (OpenGL Shading Language) は**KhronosのOpenGL/Vulkan向けシェーダ言語**です。2004年にOpenGL 2.0で標準化され、20年にわたりクロスプラットフォームシェーダの共通語として使われてきました。現在は「OpenGL用の実行時コンパイル言語」と「Vulkan用のSPIR-V生成ソース言語」という2つの顔を持ちます。

## なぜ必要なのか

- OpenGL / OpenGL ES / WebGL の資産は膨大 — 既存コードの読解に必須
- Vulkanのサンプル・チュートリアルの多くはGLSLで書かれている
- シェーダ芸 (Shadertoy) やモバイル開発の共通語

## 歴史・誕生した背景

- 2002: ARB拡張としてのアセンブリシェーダ (`ARB_vertex_program`)
- **2004: OpenGL 2.0でGLSL 1.10標準化**。3Dlabsが主導。「ドライバがソースを直接コンパイルする」設計を採用 — 当時は先進的、後に断片化の元凶に
- 2008-10: GLSL 1.30〜4.00 (GL3/GL4対応、in/out構文へ刷新、Compute対応は4.30)
- OpenGL ES系: **GLSL ES 1.00** (WebGL 1) / **3.00** (WebGL 2) が分岐して存在
- 2016: Vulkan登場 — GLSLは `glslang` でSPIR-Vへ事前コンパイルするソース言語になり、`gl_VertexIndex` 等のVulkan方言 (`GL_KHR_vulkan_glsl`) が定義された

## それ以前の技術

ARBアセンブリ拡張と、ベンダー独自拡張 (NV_register_combiners等)。

## 解決した課題 / 生んだ課題

**解決**: プラットフォーム中立の高級シェーダ言語。
**生んだ課題**: ドライバ直接コンパイル方式のため、ベンダーごとのコンパイラ差異 (方言の許容度・バグ・性能) が深刻化。「NVIDIAでは動くがAMDでは動かない」が頻発しました。この反省がSPIR-V設計の直接の動機です → [SPIR-V](/graphics/shader/spirv.html)

## 現在の位置づけ

新規プロジェクトの第一言語としては減少傾向 (HLSL/WGSL/Slangへ)。ただしOpenGL ES/WebGLが生きる限り現役であり、Vulkan学習資料の標準言語でもあります。

## 内部動作 — 言語の要点

### バージョンとプロファイル

```glsl
#version 450            // GL 4.5 / Vulkan系サンプルの定番
#version 300 es         // WebGL2 / GLES3
precision mediump float; // ES系では精度修飾子が必須
```

**精度修飾子** (`highp/mediump/lowp`) はES系特有で、モバイルGPUの半精度ユニットに直結する重要な最適化手段です。

### 入出力モデル

ステージ間は `in` / `out` 変数を **location** で接続します:

```glsl
// Vertex Shader
layout(location = 0) in vec3 inPos;
layout(location = 0) out vec2 vUV;
void main() {
    gl_Position = ubo.mvp * vec4(inPos, 1.0);  // 組み込み変数
    vUV = ...;
}
```

HLSLのセマンティクスに対し、GLSLは**組み込み変数 (`gl_Position`, `gl_FragCoord`, `gl_VertexIndex`...) + location番号**という設計です。

### リソースバインディング (Vulkan方言)

```glsl
layout(set = 0, binding = 0) uniform UBO { mat4 mvp; } ubo;
layout(set = 0, binding = 1) uniform sampler2D albedo;   // 結合型
layout(set = 1, binding = 0, std430) buffer Particles { vec4 p[]; };
layout(push_constant) uniform Push { vec4 tint; } pc;
```

- `set` / `binding` はVulkanのDescriptor Setに直結 → [Vulkan](/graphics/api/vulkan.html)
- **std140 / std430の配置規則**では、型の大きさ、ベースアラインメント、配列・行列のストライドを確認し、CPU側の構造体と対応させる。
- OpenGL版では `set` がなく `binding` のみ、UBOは `glUniformBlockBinding` で接続

### OpenGL版とVulkan版の差分

| | OpenGL GLSL | Vulkan GLSL |
|---|---|---|
| コンパイル | ドライバが実行時に | glslang等で事前にSPIR-Vへ |
| 頂点ID | `gl_VertexID`。BaseVertex付きの描画では、その値を含む | `gl_VertexIndex`。開始値・頂点オフセットを含む |
| uniform単体宣言 | 可 (`uniform float x;`) | 不可 (ブロック必須、push constant除く) |
| descriptor set | なし | `layout(set=N)` |
| 画面上のY方向 | ビューポートまで含めて確認する | ビューポートの高さを負にして反転できる → [座標変換](/math/rendering/transform.html) |

## 各環境での扱い

### Unity
開発者が直接書くことは通常ありません。HLSLからの変換ターゲット (GLES/GL Core向け) として内部的に生成されます。生成結果はFrame Debuggerのシェーダ逆コンパイルで確認可能。

### Unreal Engine
同様にHLSL (USF) からのクロスコンパイルターゲット。Android (Vulkan/GLES) 向けにSPIR-V経由で生成されます。

### DirectX 12
直接の関係はありません。SPIRV-CrossでGLSL→HLSL方向の変換は技術的に可能です。

### Vulkan
主要ソース言語の一つ。`glslangValidator -V shader.vert -o vert.spv` または CMakeに統合してビルド時変換。ラピッドプロトタイピングでは `shaderc` ライブラリで実行時コンパイルも。

## コード例

Vulkan向けの完全なシェーダペア:

```glsl
// shader.vert
#version 450
layout(location = 0) in vec3 inPos;
layout(location = 1) in vec3 inNormal;
layout(location = 2) in vec2 inUV;

layout(set = 0, binding = 0) uniform Camera {
    mat4 view;
    mat4 proj;
} cam;
layout(push_constant) uniform Push { mat4 model; } pc;

layout(location = 0) out vec3 vNormalWS;
layout(location = 1) out vec2 vUV;

void main() {
    vNormalWS = mat3(pc.model) * inNormal;
    vUV = inUV;
    gl_Position = cam.proj * cam.view * pc.model * vec4(inPos, 1.0);
}
```

```glsl
// shader.frag
#version 450
layout(location = 0) in vec3 vNormalWS;
layout(location = 1) in vec2 vUV;
layout(set = 0, binding = 1) uniform sampler2D albedoTex;
layout(location = 0) out vec4 outColor;

void main() {
    vec3 N = normalize(vNormalWS);
    float ndl = max(dot(N, normalize(vec3(1, 2, 1))), 0.0);
    vec3 albedo = texture(albedoTex, vUV).rgb;
    outColor = vec4(albedo * (0.1 + 0.9 * ndl), 1.0);
}
```

std140の配置を確認する例です。

```glsl
layout(std140, binding = 0) uniform LayoutExample {
    vec3 a;   // offset 0  (ベースアラインメント16、成分は12バイト)
    float b;  // offset 12
    vec3 c;   // offset 16
    float d;  // offset 28
    vec2 e;   // offset 32
};
```

CPU側では、各メンバーのオフセット、配列・行列のストライド、構造体全体のサイズを照合します。構造体の先頭に`alignas(16)`を指定するだけでは、各メンバーの配置まで一致するとは限りません。上の例の`vec3`直後の`float`は、オフセット12に置けます。[OpenGL 4.6仕様のuniformブロック配置 §7.6.2.2](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf) · [Vulkanのバッファ配置](https://docs.vulkan.org/spec/latest/chapters/interfaces.html#interfaces-resources-layout)

## 前提知識

- [シェーダ言語総論と比較](/graphics/shader/overview.html)

## 次に読むべきページ

- [SPIR-V と中間表現](/graphics/shader/spirv.html)
- [Vulkan](/graphics/api/vulkan.html) / [OpenGL](/graphics/api/opengl.html)
- [WGSL](/graphics/shader/wgsl.html)

## 理解度チェック

1. **「ドライバがGLSLソースを直接コンパイルする」設計の問題点は何だったか。**
   ::: details 解答
   各ベンダーのドライバが独自のコンパイラフロントエンドを持つため、方言の許容度・バグ・エラーメッセージ・最適化品質がバラバラになり、同じソースの互換性が保証されなかった。また実行時コンパイルのコスト(ロード時間・ヒッチ)も問題だった。SPIR-V事前コンパイルはこの両方への解答。
   :::

2. **std140レイアウトをCPUの構造体へ対応させるとき、何を確認するか。**
   ::: details 解答
   各メンバーのオフセット、配列・行列のストライド、全体のサイズを確認する。`vec3`のベースアラインメント16と、三つの成分の12バイトを分けて扱う。構造体の先頭だけをそろえても、内部の配置までそろうとは限らない。
   :::

3. **`gl_VertexID` (GL) と `gl_VertexIndex` (Vulkan) の違いは。**
   ::: details 解答
   どちらも頂点シェーダーへの頂点識別子。OpenGLでも、対応するインデックス描画の`basevertex`は`gl_VertexID`へ加わる。非インデックス描画では`first`を含む。移植時は、使う描画命令と開始値を対応させる。[Khronosの頂点入力の定義](https://wikis.khronos.org/opengl/Vertex_Shader/Defined_Inputs)
   :::

## 参考資料

- Khronos, *OpenGL Shading Language Specification* / *GL_KHR_vulkan_glsl*
- LearnOpenGL (Joey de Vries) — GLSL実践の定番教材
- KhronosGroup/glslang — リファレンスコンパイラ
- Shadertoy — GLSLフラグメントシェーダの実験場
