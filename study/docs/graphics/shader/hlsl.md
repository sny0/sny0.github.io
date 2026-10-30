---
title: HLSL
study:
  source: RenderingWiki
  status: published
  summary: HLSL (High-Level Shading Language) はMicrosoftのシェーダ言語で、DirectX・Unity・Unreal Engine・(DXC経由で)Vulkanまでカバーする、実務上最も重要なシェーダ言語です。Shader Model (SM) というバージョン体系で
  section: reference
  format: article
  domain: graphics
---

# HLSL

## 概要

HLSL (High-Level Shading Language) はMicrosoftのシェーダ言語で、**DirectX・Unity・Unreal Engine・(DXC経由で)Vulkanまでカバーする、実務上最も重要なシェーダ言語**です。Shader Model (SM) というバージョン体系で機能が拡張され、現在はSM 6.x (DXILコンパイラDXC) が現行世代です。

## なぜ必要なのか

- Unity・UEのシェーダはHLSLで書く — ゲーム開発者の共通言語
- SM6.xのWave命令・Mesh Shader・DXR (レイトレーシング) など、**新ハードウェア機能はHLSLから触るのが最速**
- HLSL→SPIR-V変換の成熟により「HLSLだけ書けばDX12もVulkanも動く」時代になった

## 歴史・誕生した背景

- 2001: DX8のアセンブリシェーダ — 保守不能な命令列
- **2003: DirectX 9 で HLSL 登場**。NVIDIAのCgと共通の起源を持つ (後に分岐、Cgは2012年終了)
- 2009: DX11 / SM5.0 — Compute Shader、Tessellation対応
- **2015-17: DXC (DirectX Shader Compiler)** — LLVMベースの新コンパイラ。出力はDXIL。旧FXCを置換
- 2016以降: SM6.0 Wave命令 / SM6.3 DXR / SM6.5 Mesh Shader / SM6.6 Dynamic Resources / SM6.8 Work Graphs
- 2024: HLSL 202x 仕様策定が公開プロセスに (constexpr等の近代化)

## それ以前の技術

アセンブリシェーダ (`vs_1_1` / `ps_1_1`)。レジスタ割り当て・命令数管理をすべて手動で行っていました。

## 解決した課題

高級言語化 (2003) はシェーダ開発の生産性を桁で変えました。DXC世代 (SM6.x) は、旧コンパイラFXCの閉鎖性・最適化の限界・新機能追加の遅さを、LLVM採用とオープンソース化で解決しました。

## 現在の位置づけ

デファクトスタンダード。Unity/UE/DX12はもちろん、Vulkan開発でもDXC経由の利用が拡大しています。仕様はGitHub (microsoft/hlsl-specs) で公開駆動になり、ClangベースのHLSLコンパイラ開発 (upstream) も進行中です。

## 内部動作 — 言語の要点

### セマンティクス

入出力変数の「意味」をコロン構文で宣言します。`SV_` 接頭辞はシステム値 (ハードウェアが解釈):

```hlsl
struct VSOut {
    float4 pos : SV_Position;   // ラスタライザが使う (必須)
    float2 uv  : TEXCOORD0;     // 任意のユーザーセマンティクス
    uint   id  : SV_InstanceID; // システムが供給
};
```

主要システム値: `SV_Position`, `SV_Target[N]`, `SV_Depth`, `SV_VertexID`, `SV_InstanceID`, `SV_DispatchThreadID`, `SV_GroupThreadID`, `SV_IsFrontFace`, `SV_Coverage`

### リソースモデル

| 宣言 | 種類 | レジスタ空間 |
|---|---|---|
| `cbuffer` / `ConstantBuffer<T>` | 定数バッファ (読み取り専用・小容量) | `b` |
| `Texture2D` 等 | テクスチャ (SRV) | `t` |
| `StructuredBuffer<T>` / `ByteAddressBuffer` | 読み取りバッファ (SRV) | `t` |
| `RWTexture2D` / `RWStructuredBuffer<T>` | 読み書き (UAV) | `u` |
| `SamplerState` | サンプラ | `s` |

`register(t0, space1)` の **space** はDX12のディスクリプタ設計 (Root Signature) に対応します。SM6.6の **Dynamic Resources** (`ResourceDescriptorHeap[i]`) はバインドレス設計を言語レベルで直接サポートします → [DirectX 12](/graphics/api/directx12.html)

### 数値と演算の注意点

- HLSLの `*` は成分ごとの乗算。行列・ベクトルの線形代数上の積には `mul(a, b)` を使う。例えば `mul(v, M)` はvを行ベクトル、`mul(M, v)` はvを列ベクトルとして扱う。`row_major` / `column_major` は格納順序の指定であり、`*` の意味を行列積へ変えるものではない
- `saturate()` は無料 (モディファイアとして命令に融合される)
- `half` (SM6.2の `-enable-16bit-types`) はモバイル/帯域最適化で重要
- 暗黙の型変換が多く事故りやすい (`int`/`uint` 混在の比較など)

### SM6.x の主要機能

| SM | 機能 |
|---|---|
| 6.0 | **Wave Intrinsics** (`WaveActiveSum` 等) → [実行モデル](/graphics/compute/execution-model.html) |
| 6.1 | `SV_ViewID` (マルチビュー), Barycentrics |
| 6.2 | 16bit型, Denorm制御 |
| 6.3 | **DXR** (`TraceRay`, レイトレシェーダ群) → [レイトレーシング](/graphics/lighting/raytracing.html) |
| 6.4 | パックド演算 (`dot4add_u8`) |
| 6.5 | **Mesh/Amplification Shader**, DXR1.1 (`RayQuery`) |
| 6.6 | Dynamic Resources, 64bit Atomic, ComputeのDerivative |
| 6.7 | Advanced Texture Ops |
| 6.8 | **Work Graphs** |

## 各環境での扱い

### Unity
`.shader` (ShaderLab) の `HLSLPROGRAM` ブロック内に記述。`#pragma vertex/fragment` でエントリ指定、`#pragma multi_compile` / `shader_feature` でバリアント生成。コアライブラリ (`com.unity.render-pipelines.core`) の `.hlsl` をincludeする構成です。旧 `CGPROGRAM` は実体としてHLSLでした。

### Unreal Engine
`.usf` (シェーダ本体) / `.ush` (ヘッダ) がHLSL。マテリアルノードは `MaterialTemplate.ush` の穴埋めHLSLに変換されます。カスタムノードでHLSL直書きも可能。`FGlobalShader` のC++クラスとマクロでバインドします。

### DirectX 12
ネイティブ言語。`dxc -T ps_6_6 -E PSMain shader.hlsl -Fo shader.cso` でコンパイルし、PSOへバイトコードを渡します。

### Vulkan
`dxc -spirv -T ps_6_6 ...` でSPIR-V出力。`[[vk::binding(0, 0)]]` / `[[vk::push_constant]]` などVulkan専用アトリビュートで割り当てを制御します。

## コード例

Compute Shaderの典型形 (SM6.0 Wave命令活用):

```hlsl
// 輝度ヒストグラム: Wave集約でAtomic回数を1/32に削減
RWStructuredBuffer<uint> gHistogram : register(u0);
Texture2D<float4> gInput : register(t0);

[numthreads(8, 8, 1)]
void CSMain(uint3 dtid : SV_DispatchThreadID)
{
    float3 c = gInput[dtid.xy].rgb;
    uint bin = (uint)(dot(c, float3(0.299, 0.587, 0.114)) * 255.0);

    // 同じbinのレーンをWave内でまとめてから1回だけAtomic
    for (;;) {
        uint firstBin = WaveReadLaneFirst(bin);
        if (bin == firstBin) {
            uint count = WaveActiveCountBits(true);
            if (WaveIsFirstLane())
                InterlockedAdd(gHistogram[firstBin], count);
            break;
        }
    }
}
```

コンパイルコマンド一式:

```bash
# DX12向け (DXIL)
dxc -T cs_6_6 -E CSMain histogram.hlsl -Fo histogram.dxil
# Vulkan向け (SPIR-V)
dxc -T cs_6_6 -E CSMain -spirv histogram.hlsl -Fo histogram.spv
# デバッグ情報つき (PIX/RenderDoc用)
dxc -T cs_6_6 -E CSMain -Zi -Qembed_debug histogram.hlsl -Fo histogram.dxil
```

## 前提知識

- [シェーダ言語総論と比較](/graphics/shader/overview.html)
- [パイプライン全体像](/graphics/pipeline/overview.html)

## 次に読むべきページ

- [GLSL](/graphics/shader/glsl.html) — 対応関係を掴む
- [SPIR-V と中間表現](/graphics/shader/spirv.html) — DXC/DXILの立ち位置
- [Compute Shader](/graphics/compute/compute-shader.html)

## 理解度チェック

1. **FXCからDXCへの移行で何が変わったか。**
   ::: details 解答
   コンパイラ基盤がLLVMベースになり、出力がDXBCからDXILに変更。オープンソース化により新機能(Wave/DXR/Mesh等)の迅速な追加が可能になり、SPIR-V出力バックエンドによりVulkanターゲットも公式サポートされた。SM6.0以降の機能はDXCでしか使えない。
   :::

2. **`register(t0, space0)` の t と space はそれぞれ何に対応するか。**
   ::: details 解答
   tはリソース種別ごとのレジスタ種類(t=SRV, u=UAV, b=CBV, s=Sampler)のスロット番号。spaceは同じレジスタ番号空間を複数持つための次元で、DX12のRoot Signature設計(例: 頂点用とマテリアル用でspaceを分ける、バインドレス配列を別spaceに置く)に対応する。
   :::

3. **UnityとUEがともにHLSLを採用していることの実務的な利点は。**
   ::: details 解答
   シェーダ技法の知識・コード資産がエンジン間でほぼ移植可能になる。またDXC/SPIR-Vエコシステムの恩恵(新機能・最適化・ツール)を両エンジンが共有でき、学習投資が無駄にならない。
   :::

## 参考資料

- microsoft/DirectXShaderCompiler (GitHub) — DXC本体とWiki
- microsoft/hlsl-specs — 言語仕様
- Microsoft Learn, *HLSL リファレンス*
- Jasper's blog *"HLSL for Vulkan"* 系資料 / Khronos *HLSL in Vulkan* ガイド
- [Microsoft: HLSL Operators](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-operators)
- [Microsoft: mul](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-mul)
