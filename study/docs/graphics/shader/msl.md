---
title: "MSL (Metal Shading Language)"
study:
  source: "RenderingWiki"
  kind: "本文"
  status: "既存原稿"
  summary: "MSL (Metal Shading Language) はAppleのMetal API専用シェーダ言語で、C++14ベースという他言語にない特徴を持ちます。テンプレート・ポインタ・名前空間が使え、シェーダ言語の中で最も「普通のプログラミング言語」に近い設計です。iOS/macOS/visionO"
---

# MSL (Metal Shading Language)

## 概要

MSL (Metal Shading Language) は**AppleのMetal API専用シェーダ言語**で、**C++14ベース**という他言語にない特徴を持ちます。テンプレート・ポインタ・名前空間が使え、シェーダ言語の中で最も「普通のプログラミング言語」に近い設計です。iOS/macOS/visionOSのGPUプログラミングはすべてMSLで書きます。

## なぜ必要なのか

- Apple製品 (iPhone/iPad/Mac) 向けのゲーム・アプリ開発はMetal必須 — OpenGLは非推奨化済み
- UnityやUEのシェーダも最終的にMSLへ変換されてAppleデバイスで動く — 変換結果を読める価値
- Apple Silicon (Mシリーズ) のTBDRアーキテクチャ特有の機能 (タイルシェーダ等) はMSLでしか触れない

## 歴史・誕生した背景

- 2014: **Metal発表** (iOS 8) と同時にMSL登場。A7チップの性能をOpenGL ESのオーバーヘッドなしに引き出す目的
- 設計判断: 新言語を作らず**C++14のサブセット+属性拡張**とした。LLVM/Clangをそのまま流用できる合理的選択
- 2017: Metal 2 — Argument Buffers (バインドレス)、タイルシェーダ (A11)
- 2019: macOSでOpenGL/OpenCLが非推奨に — Appleプラットフォームの唯一の選択肢へ
- 2022: Metal 3 — メッシュシェーダ、レイトレーシング強化、MetalFX (アップスケーリング)
- 2023-: visionOS、Apple Silicon Macの普及でゲーム移植 (Game Porting Toolkit) の文脈でも注目

## それ以前の技術

iOS/macOSのOpenGL ES / OpenGL。ドライバオーバーヘッドと、Appleがコントロールできない標準仕様の進化速度が課題でした。

## 解決した課題

1. 低オーバーヘッドAPI (Metal) と一体設計された言語
2. **事前コンパイル** (`.metallib`) によるロード時間とドライバ差異の解消
3. C++ベースにより既存のコード資産・エディタ支援・テンプレートによるジェネリックシェーダが可能に

## 現在の位置づけ

Appleエコシステム内で完結する言語です。クロスプラットフォーム開発では「SPIRV-CrossやTintがMSLを生成する」形で間接的に付き合うことが多く、直接書くのはApple最適化 (タイルシェーダ、Apple GPU固有機能) が必要な場面です。

## 内部動作 — 言語の要点

### C++14ベースの構文

```cpp
#include <metal_stdlib>
using namespace metal;

// テンプレートが使える(!)
template <typename T>
T lerp3(T a, T b, T c, float2 w) {
    return a * (1 - w.x - w.y) + b * w.x + c * w.y;
}

struct VSOut {
    float4 pos [[position]];     // 属性は [[ ]] 構文
    float2 uv;
};

vertex VSOut vsMain(uint vid [[vertex_id]],
                    constant float4x4& mvp [[buffer(0)]],
                    const device float3* positions [[buffer(1)]])
{
    VSOut out;
    out.pos = mvp * float4(positions[vid], 1.0);  // ポインタ経由の自由なフェッチ
    return out;
}
```

### アドレス空間

| 修飾子 | 意味 | HLSL対応 |
|---|---|---|
| `device` | 読み書き可能なGPUメモリ | RWStructuredBuffer |
| `constant` | 読み取り専用・高速パス | cbuffer |
| `threadgroup` | グループ共有メモリ | groupshared |
| `thread` | スレッドローカル | ローカル変数 |
| `ray_data` / `object_data` | RT/メッシュシェーダ用 | payload |

### Apple GPU特有の機能

- **タイルシェーダ / imageblock**: TBDRのオンチップタイルメモリを直接読み書きするCompute的ステージ。Deferredライティングを「G-BufferをVRAMに書かずに」実行できる → [GPUアーキテクチャ](/hardware/gpu/architecture.html)
- **`[[color(N)]]` 入力**: フラグメントシェーダで同一ピクセルの前回出力を読める (programmable blending)
- **Function constants**: コンパイル済みバイナリに対する特殊化定数 (バリアント爆発の抑制)

## 各環境での扱い

### Unity
HLSL→(内部変換)→MSL。Metal固有機能の一部 (メモリレスレンダーターゲット等) はUnityのAPIから利用可能です。

### Unreal Engine
同様にUSF/HLSL→MSL変換。Apple向けビルドでMetal RHIが使われます。

### DirectX 12 / Vulkan
直接の関係はありませんが、**MoltenVK** (Vulkan→Metal変換層) がSPIRV-CrossでシェーダをMSL化して動かします。macOSでVulkanアプリが動くのはこの仕組みです。

## コード例

Compute Shader (MSL) — スレッドグループとバリア:

```cpp
#include <metal_stdlib>
using namespace metal;

kernel void reduceSum(device const float* input   [[buffer(0)]],
                      device float* partialSums   [[buffer(1)]],
                      threadgroup float* shared   [[threadgroup(0)]],
                      uint tid  [[thread_position_in_threadgroup]],
                      uint gid  [[thread_position_in_grid]],
                      uint tgSize [[threads_per_threadgroup]],
                      uint groupId [[threadgroup_position_in_grid]])
{
    shared[tid] = input[gid];
    threadgroup_barrier(mem_flags::mem_threadgroup);

    for (uint s = tgSize / 2; s > 0; s >>= 1) {
        if (tid < s) shared[tid] += shared[tid + s];
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }
    if (tid == 0) partialSums[groupId] = shared[0];
}
```

ホスト側 (Swift) の最小呼び出し:

```swift
let library = device.makeDefaultLibrary()!            // .metallib から
let fn = library.makeFunction(name: "reduceSum")!
let pso = try device.makeComputePipelineState(function: fn)

let encoder = commandBuffer.makeComputeCommandEncoder()!
encoder.setComputePipelineState(pso)
encoder.setBuffer(inputBuf, offset: 0, index: 0)
encoder.setBuffer(outputBuf, offset: 0, index: 1)
encoder.setThreadgroupMemoryLength(256 * 4, index: 0)
encoder.dispatchThreadgroups(MTLSize(width: n/256, height: 1, depth: 1),
    threadsPerThreadgroup: MTLSize(width: 256, height: 1, depth: 1))
encoder.endEncoding()
```

## 前提知識

- [シェーダ言語総論と比較](/graphics/shader/overview.html)

## 次に読むべきページ

- [Metal](/graphics/api/metal.html) — ホストAPI
- [GPUアーキテクチャ詳解](/hardware/gpu/architecture.html) — TBDRの理解
- [SPIR-V と中間表現](/graphics/shader/spirv.html) — SPIRV-Cross経由の変換

## 理解度チェック

1. **MSLがC++14ベースで設計されたことの利点を2つ挙げよ。**
   ::: details 解答
   (1) LLVM/Clangという成熟したコンパイラ基盤をそのまま使え、言語仕様策定・実装コストを大幅に削減できた。(2) テンプレート・ポインタ・演算子オーバーロード等により、ジェネリックなシェーダライブラリやCPUコードとの共有ヘッダが書け、大規模シェーダ開発の生産性が高い。
   :::

2. **タイルシェーダ(imageblock)がDeferred Renderingにもたらす利点は。**
   ::: details 解答
   TBDRのタイルメモリ上にあるG-Bufferを、VRAMへ書き出すことなくタイル内で直接読んでライティングまで完結できる。G-Bufferの莫大なメモリ帯域(モバイルでは電力)消費を根本から削減できる。
   :::

3. **macOSでVulkanアプリケーションが動作する仕組みを説明せよ。**
   ::: details 解答
   MoltenVKがVulkan APIコールをMetalコールへ変換するレイヤとして働き、シェーダはSPIR-VをSPIRV-CrossでMSLへトランスパイルして実行する。ネイティブVulkanドライバが存在するわけではない。
   :::

## 参考資料

- Apple, *Metal Shading Language Specification*
- Apple, *Metal Best Practices Guide* / WWDCセッション各年
- KhronosGroup/MoltenVK, KhronosGroup/SPIRV-Cross
