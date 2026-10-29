---
title: "3. リソースとパイプライン構築"
study:
  source: "RenderingWiki"
  kind: "本文"
  status: "既存原稿"
  summary: "GPUにデータを送り込み、描画の設計図 (パイプライン) を組み立てます。バッファ・テクスチャ・ディスクリプタ・PSOという明示的APIの4大リソース概念 (DX12/Vulkan) を、実際に手を動かして体得するステップです。"
---

# 3. リソースとパイプライン構築

## このステップの目標

GPUにデータを送り込み、描画の設計図 (パイプライン) を組み立てます。**バッファ・テクスチャ・ディスクリプタ・PSO**という明示的APIの4大リソース概念 ([DX12](/graphics/api/directx12.html)/[Vulkan](/graphics/api/vulkan.html)) を、実際に手を動かして体得するステップです。

## 3.1 メモリとバッファ — VMAで作る

Vulkanの生メモリ管理 (memoryTypeの選択・アラインメント・サブアロケーション) はVMAに任せ、**「どの種類のメモリに置くか」の判断**に集中します:

| 用途 | VMAの指定 | 実体 |
|---|---|---|
| 頂点/インデックス (不変) | `VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE` | VRAM。ステージング経由で転送 |
| ユニフォーム (毎フレームCPU書き) | `AUTO_PREFER_HOST` + `HOST_ACCESS_SEQUENTIAL_WRITE` | CPU可視。**フレーム数分multiバッファ化** |
| ステージング | `AUTO_PREFER_HOST` + mapped | 転送の踏み台 |

```cpp
// ステージング → GPU専用メモリへの転送 (cpu-vs-gpuの「転送は明示」の実践)
Buffer CreateVertexBuffer(const void* data, size_t size) {
    Buffer staging = CreateBuffer(size, VK_BUFFER_USAGE_TRANSFER_SRC_BIT, HostVisible);
    memcpy(staging.mapped, data, size);

    Buffer vb = CreateBuffer(size,
        VK_BUFFER_USAGE_VERTEX_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_DST_BIT,
        DeviceLocal);

    // 使い捨てコマンドバッファで転送 (実務ではフレームに統合)
    ImmediateSubmit([&](VkCommandBuffer cmd) {
        VkBufferCopy region{0, 0, size};
        vkCmdCopyBuffer(cmd, staging.buffer, vb.buffer, 1, &region);
    });
    DestroyBuffer(staging);
    return vb;
}
```

## 3.2 テクスチャとミップマップ

glTFのアルベド/法線/ORMテクスチャをロードし、ミップ付きでGPUへ:

1. stb_imageでデコード → ステージングバッファ
2. `VkImage` 作成 (`mipLevels = floor(log2(max(w,h))) + 1`)
3. レベル0へコピー → `vkCmdBlitImage` の連鎖で縮小生成 (各レベル間にバリア)
4. 全体を `SHADER_READ_ONLY_OPTIMAL` へ遷移
5. `VkSampler` 作成 (異方性フィルタ+リピート)

**sRGBの規律** ([ポストプロセス](/graphics/postprocess/overview.html)): アルベドは `VK_FORMAT_R8G8B8A8_SRGB` (ハードウェアがリニア変換)、法線/ORMは `UNORM` (データであって色ではない)。ここを間違えると眠い絵になります。

## 3.3 ディスクリプタ — 更新頻度で層を分ける

[Vulkanの定石](/graphics/api/vulkan.html) 通り、セットを更新頻度で分割します:

```text
set=0 (フレームごと): カメラUBO / ライトUBO / シャドウマップ / IBL 3点
set=1 (マテリアルごと): アルベド / 法線 / ORM テクスチャ
push constant: オブジェクトのワールド行列 (64B) — 最速の毎ドロー定数
```

```cpp
// set=0 のレイアウト定義 (シェーダの宣言と1対1で対応させる)
VkDescriptorSetLayoutBinding bindings[] = {
    {0, VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER,         1, VK_SHADER_STAGE_ALL_GRAPHICS},
    {1, VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER, 1, VK_SHADER_STAGE_FRAGMENT_BIT}, // shadow
    {2, VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER, 1, VK_SHADER_STAGE_FRAGMENT_BIT}, // irradiance
    {3, VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER, 1, VK_SHADER_STAGE_FRAGMENT_BIT}, // prefiltered
    {4, VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER, 1, VK_SHADER_STAGE_FRAGMENT_BIT}, // brdfLUT
};
```

::: tip DX12ではこう
Root Signature (Root定数=push constant相当、テーブル=セット相当) + ディスクリプタヒープ。概念対応は [DX12ページの表](/graphics/api/directx12.html) 参照。
:::

## 3.4 パイプライン (PSO) {#pipeline-pso}

[パイプライン全体像](/graphics/pipeline/overview.html) の設定をPSOへ束ねます。第5ステップのSDR出力構成では次の4本を使います。第4ステップでswapchainへ直接三角形を描く場合は、さらにそのformatに合うtrianglePSOを作ります:

| PSO | 用途 | 特徴 |
|---|---|---|
| shadowPSO | シャドウマップ | RTなし深度のみ、Depth Bias有効、正射影 |
| pbrPSO | メイン描画 | RGBA16F出力、**Reverse-Z (GREATER)**、バックフェースカル |
| postPSO (compute) | トーンマップ等 | FP16中間画像へstorage書込み |
| finalPSO (graphics) | 最終出力 | 第2ステップで選んだsRGB swapchain formatのcolor attachmentへ描画。深度不要 |

```cpp
// pbrPSO の要点 (Dynamic Rendering版)
VkPipelineRenderingCreateInfo rendering{VK_STRUCTURE_TYPE_PIPELINE_RENDERING_CREATE_INFO};
VkFormat colorFmt = VK_FORMAT_R16G16B16A16_SFLOAT;      // HDR中間バッファ
rendering.colorAttachmentCount = 1;
rendering.pColorAttachmentFormats = &colorFmt;
rendering.depthAttachmentFormat = VK_FORMAT_D32_SFLOAT;

VkPipelineDepthStencilStateCreateInfo depth{...};
depth.depthTestEnable  = VK_TRUE;
depth.depthWriteEnable = VK_TRUE;
depth.depthCompareOp   = VK_COMPARE_OP_GREATER;          // Reverse-Z!

// シェーダはCMakeでHLSL→SPIR-V (dxc -spirv) 済みのものをロード
VkShaderModule vs = LoadShader("pbr.vert.spv");
VkShaderModule fs = LoadShader("pbr.frag.spv");
// ... 頂点レイアウト / ラスタライザ / ブレンド設定を束ねて
vkCreateGraphicsPipelines(device, cache, 1, &info, nullptr, &pbrPSO);
```

**PSOは起動時に全部作る** — 実行時作成はスタッターの元 ([SPIR-V](/graphics/shader/spirv.html) のPSO問題)。

第5ステップの中間画像とbindingの契約は次の通りです。作成前に各formatの対応featureとsurfaceのusageを照会します:

- HDR color: `R16G16B16A16_SFLOAT`、`COLOR_ATTACHMENT | SAMPLED`。Forward passが書き、後続Computeが読む。
- Bloomの各中間画像: `R16G16B16A16_SFLOAT`、`STORAGE | SAMPLED`。Compute間のstorage書込み/読込みを同期する。
- トーンマップ後 `ldrLinear`: 同じFP16 format、`STORAGE | SAMPLED`。SDRの[0,1]の**リニアRGB**を保持し、まだsRGBへ符号化しない。第5ステップのfinalPSOが読む。
- swapchain: 第2ステップのsRGB format、`COLOR_ATTACHMENT`（第2ステップのtransfer clearも残すなら `TRANSFER_DST` も必要）。storage image対応は前提にしない。
- `postSet`: binding 0/1は `SAMPLED_IMAGE`（HDR/Bloom、samplerを使わずtexel load）、binding 2は `STORAGE_IMAGE`（ldrLinear、書込み時GENERAL）。`finalSet`: binding 0を `SAMPLED_IMAGE`（ldrLinear、描画時SHADER_READ_ONLY_OPTIMAL）とする。既存のframe/material setとは別のpipeline layoutで定義し、HLSLのset/bindingと一致させる。

FP16 storage画像のHLSL宣言は `[[vk::image_format("rgba16f")]] RWTexture2D<float4>` とし、DXCが出力するSPIR-V image formatと `R16G16B16A16_SFLOAT` viewを一致させます。`float4` だけからFP16 storage形式を推定しないでください。

画像とdescriptorはフレームスロットごとに用意し、そのslotのfence完了後に再利用します。resizeではextent依存の画像/view/descriptorを再構築し、旧資源はGPUとPresentそれぞれの寿命条件を満たしてから破棄します。

## 3.5 glTFメッシュのロード

```cpp
struct Vertex {
    float3 position;   // 12B
    float3 normal;     // 12B
    float4 tangent;    // 16B (w=handedness) — 法線マップ用TBN (transform章)
    float2 uv;         // 8B
};
struct Primitive { uint32_t firstIndex, indexCount; int materialIndex; };
struct MeshAsset { Buffer vb, ib; std::vector<Primitive> primitives; };
```

cgltf等でパースし、プリミティブごとにマテリアルインデックスを保持。タンジェントが無いモデルはMikkTSpaceで生成するのが正道です。

## 3.6 IBLアセットの事前計算

[IBLページ](/graphics/lighting/ibl.html) の理論を起動時Computeで実行します:

1. HDR環境マップ (equirectangular) → キューブマップ変換
2. コサイン畳み込み → Irradiance Map (32³)
3. GGX重点サンプリング畳み込み → Prefiltered Map (128², ミップ=ラフネス)
4. BRDF LUT (512²) 生成

各ステップはCompute Shader1本+ディスパッチ1回で書けます (IBLページのコード例参照)。

## 動作確認

- ロード後にRenderDocでキャプチャ → Resource Inspectorで頂点バッファの中身、テクスチャのミップ、キューブマップ6面が正しいか目視
- 検証レイヤの警告ゼロを維持

## 前提知識

- [Vulkan](/graphics/api/vulkan.html), [座標変換](/math/rendering/transform.html), [IBL](/graphics/lighting/ibl.html)

## 次に読むべきページ

- [4. 最初の三角形からメッシュ描画へ](/graphics/capstone/04-triangle.html)

## 理解度チェック

1. **ユニフォームバッファを「フレーム数分multiバッファ化」する理由を、同期の観点から述べよ。**
   ::: details 解答
   CPUがフレームN+1のカメラ行列を書き込むとき、GPUはまだフレームNを描画中で同じバッファを読んでいる可能性がある。単一バッファだと書き込みが描画中のフレームを壊す。kFramesInFlight個に複製し「フェンスで完了確認済みのスロットにだけ書く」ことで、GPU全体の待機を避けながら安全に更新できる。スロットがまだ使用中なら、そのフェンス待ちは必要。DX11ではドライバのリネーミングが隠していた問題の顕在化。
   :::

2. **アルベドをsRGBフォーマット、法線マップをUNORMにする理由をそれぞれ述べよ。**
   ::: details 解答
   この例のglTF base colorはsRGBで符号化された色なので、sRGB形式のviewからsamplingしてRGBをリニアへ復号する。alphaはその変換対象ではない。リニア値として用意した色データには復号を重ねない。法線マップは[0,1]に符号化された方向ベクトル「データ」であり、色空間変換をかけるとベクトルが歪んで法線が狂う。ORM(オクルージョン・ラフネス・メタリック)も同様に物理パラメータなのでUNORM。
   :::

3. **push constantをオブジェクト行列に使う設計の利点と制約は。**
   ::: details 解答
   利点: ディスクリプタ更新もバッファオフセット管理も不要でコマンドバッファに直接埋め込まれる最速・最简单の毎ドロー定数供給手段。制約: 保証サイズが128バイトと小さい(行列2個分)ため、スキニング行列パレットのような大きなデータには使えず、その場合はダイナミックオフセット付きUBOやストレージバッファを使う。
   :::

## 参考資料

- VMA ドキュメント (使用パターン集が実践的)
- vkguide.dev chapter 2-4 (バッファ/画像/ディスクリプタ抽象の実装)
- glTF 2.0 仕様 — PBRマテリアルの標準スキーマ
- [Microsoft: Converting data for the color space](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/converting-data-color-space)
- [Microsoft: DirectX with Advanced Color](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/high-dynamic-range)
- [Microsoft DXC: SPIR-V — Vulkan specific Image Formats](https://github.com/microsoft/DirectXShaderCompiler/blob/main/docs/SPIR-V.rst)
- [Khronos Vulkan Guide: Swapchain Semaphore Reuse](https://docs.vulkan.org/guide/latest/swapchain_semaphore_reuse.html)
- [Khronos Vulkan Guide: Synchronization Examples](https://docs.vulkan.org/guide/latest/synchronization_examples.html)
