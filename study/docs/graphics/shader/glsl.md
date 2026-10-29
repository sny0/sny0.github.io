---
title: "GLSL"
study:
  source: "RenderingWiki"
  kind: "本文"
  status: "既存原稿"
  summary: "GLSL (OpenGL Shading Language) はKhronosのOpenGL/Vulkan向けシェーダ言語です。2004年にOpenGL 2.0で標準化され、20年にわたりクロスプラットフォームシェーダの共通語として使われてきました。現在は「OpenGL用の実行時コンパイル言語」と「"
---

# GLSL

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
- **std140 / std430 レイアウト規則**: `vec3` が16バイトに切り上げられる等、CPU構造体とのミスマッチがGLSL最大の罠
- OpenGL版では `set` がなく `binding` のみ、UBOは `glUniformBlockBinding` で接続

### OpenGL版とVulkan版の差分

| | OpenGL GLSL | Vulkan GLSL |
|---|---|---|
| コンパイル | ドライバが実行時に | glslang等で事前にSPIR-Vへ |
| 頂点ID | `gl_VertexID` (ベース頂点含まず) | `gl_VertexIndex` (含む) |
| uniform単体宣言 | 可 (`uniform float x;`) | 不可 (ブロック必須、push constant除く) |
| descriptor set | なし | `layout(set=N)` |
| Y座標系 | NDC Y上向き | Y下向き → [座標変換](/math/rendering/transform.html) |

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

std140の罠の実例:

```glsl
layout(std140, binding = 0) uniform BadLayout {
    vec3 a;   // offset 0  (16バイト消費! 12ではない)
    float b;  // offset 12 (aのパディングに入る — これは運が良いケース)
    vec3 c;   // offset 16
    float d;  // offset 28
    vec2 e;   // offset 32
};  // C++側で float3+float を素朴に並べるとズレる
```

**対策**: CPU側構造体は `alignas(16)` を使うか、すべて `vec4` 単位で設計するのが安全です。

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

2. **std140レイアウトで `vec3` を避けるべき理由を説明せよ。**
   ::: details 解答
   std140ではvec3のベースアラインメントが16バイトと規定されており、C/C++の素朴な12バイトのfloat3配置とずれる。直後のスカラがパディング位置に入るかどうかも並び順依存で、CPU-GPU間の構造体不一致による読み違えバグの典型的発生源になる。vec4単位の設計かalignas指定で回避する。
   :::

3. **`gl_VertexID` (GL) と `gl_VertexIndex` (Vulkan) の違いは。**
   ::: details 解答
   どちらも頂点シェーダでの頂点識別子だが、Vulkanのgl_VertexIndexはfirstVertex/vertexOffsetを含んだ値である一方、GLのgl_VertexIDはgl_BaseVertexを含まない(別変数)。移植時にオフセットのずれとして顕在化する。
   :::

## 参考資料

- Khronos, *OpenGL Shading Language Specification* / *GL_KHR_vulkan_glsl*
- LearnOpenGL (Joey de Vries) — GLSL実践の定番教材
- KhronosGroup/glslang — リファレンスコンパイラ
- Shadertoy — GLSLフラグメントシェーダの実験場
