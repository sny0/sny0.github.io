---
title: "学習ロードマップ"
study:
  source: "RenderingWiki"
  kind: "学習ガイド"
  status: "既存原稿"
  summary: "このWikiの全ページは一つの知識ツリーを形成しています。ここでは「どの順番で読むか」を提示します。 何をやるにもここが土台です。飛ばさないでください。 手を動かし始めるフェーズです。シェーダ言語→APIの順を推奨します。"
---

# 学習ロードマップ

このWikiの全ページは一つの知識ツリーを形成しています。ここでは「どの順番で読むか」を提示します。

## 知識ツリー全体像

```mermaid
flowchart TD
    A[第1章 GPU基礎] --> C[第3章 レンダリングパイプライン]
    B[第2章 3D数学] --> C
    C --> D[第4章 シェーダ言語]
    C --> E[第5章 グラフィックスAPI]
    A --> F[第6章 GPUコンピューティング]
    D --> F
    C --> G[第7章 レンダリング方式]
    B --> H[第8章 ライティングとGI]
    G --> H
    H --> I[第9章 ポストプロセスとAA]
    F --> J[第10章 GPU最適化]
    E --> J
    G --> K[第11章 エンジンのレンダラー]
    H --> K
    J --> K
    E --> L[最終章 ゼロからレンダラーを作る]
    K --> L
    I --> L
```

## フェーズ1: 土台 (必修)

何をやるにもここが土台です。**飛ばさないでください。**

| 順序 | ページ | 到達目標 |
|---|---|---|
| 1 | [GPUとは何か](/hardware/gpu/what-is-gpu.html) | GPUが「大量の同じ計算」に特化した理由を説明できる |
| 2 | [CPUとGPUの役割分担](/hardware/gpu/cpu-vs-gpu.html) | ドローコールがGPUに届くまでの流れを説明できる |
| 3 | [GPUアーキテクチャ詳解](/hardware/gpu/architecture.html) | SM/CU、SIMT、メモリ階層を図に描ける |
| 4 | [ベクトル](/math/rendering/vector.html) → [行列](/math/rendering/matrix.html) → [座標変換](/math/rendering/transform.html) | MVP変換を自力で導出できる |
| 5 | [カメラと射影](/math/rendering/camera.html) → [クォータニオン](/math/rendering/quaternion.html) | 透視投影行列の各要素の意味を説明できる |
| 6 | [パイプライン全体像](/graphics/pipeline/overview.html) から第3章を順に | 頂点がピクセルになるまでを工程ごとに説明できる |

## フェーズ2: シェーダとAPI

手を動かし始めるフェーズです。シェーダ言語→APIの順を推奨します。

1. [シェーダ言語総論と比較](/graphics/shader/overview.html) — まず全体像
2. [HLSL](/graphics/shader/hlsl.html) — Unity/UE/DX12の共通言語として最優先
3. [GLSL](/graphics/shader/glsl.html) / [WGSL](/graphics/shader/wgsl.html) / [SPIR-V](/graphics/shader/spirv.html)
4. [グラフィックスAPIの歴史](/graphics/api/history.html) — なぜ明示的APIに進化したか
5. [OpenGL](/graphics/api/opengl.html) → [DirectX 11](/graphics/api/directx11.html) — 「古いAPI」の設計を知ると新APIの動機が分かる
6. [DirectX 12](/graphics/api/directx12.html) → [Vulkan](/graphics/api/vulkan.html) → [WebGPU](/graphics/api/webgpu.html) → [Metal](/graphics/api/metal.html)
7. [4大API横断比較](/graphics/api/comparison.html) — 総まとめ

## フェーズ3: GPUコンピューティング

レンダリングの最先端(GPU Driven、Nanite、各種GI)はすべてCompute Shaderの上に成り立っています。

1. [Compute Shader](/graphics/compute/compute-shader.html)
2. [GPU並列実行モデル (Warp/Wave)](/graphics/compute/execution-model.html) — **最重要ページの一つ**
3. [Shared Memory と Atomic](/graphics/compute/shared-memory.html)
4. [並列アルゴリズム (Reduction/Scan)](/graphics/compute/parallel-algorithms.html)
5. [CUDA と OpenCL](/graphics/compute/cuda-opencl.html)

## フェーズ4: レンダリング技術

「現代のゲームの絵作り」を理解するフェーズです。

- 方式: [Forward](/graphics/path/forward.html) → [Deferred](/graphics/path/deferred.html) → [Forward+/Clustered](/graphics/path/forward-plus.html)
- ライティング: [PBR](/graphics/lighting/pbr.html) → [IBL](/graphics/lighting/ibl.html) → [シャドウ](/graphics/lighting/shadow.html)
- GI: [GI総論](/graphics/lighting/gi.html) → [SSAO](/graphics/lighting/ssao.html) → [SSR](/graphics/lighting/ssr.html) → [レイトレーシング](/graphics/lighting/raytracing.html) → [パストレーシング](/graphics/lighting/path-tracing.html) → [Lumen](/graphics/lighting/lumen.html)
- 画像処理: [ポストプロセス](/graphics/postprocess/overview.html) → [AA](/graphics/postprocess/antialiasing.html) → [TAA](/graphics/postprocess/taa.html) → [アップスケーリング](/graphics/postprocess/upscaling.html)

## フェーズ5: 最適化と実務

1. [GPU最適化の基礎](/graphics/optimization/basics.html)
2. [デバッグ・プロファイリングツール](/graphics/optimization/tools.html) — RenderDoc / PIX / Nsight
3. [RenderGraph / FrameGraph](/graphics/optimization/render-graph.html)
4. [GPU Driven Rendering](/graphics/optimization/gpu-driven.html)

## フェーズ6: エンジン内部

1. [Unity のレンダラーと SRP](/graphics/engine/unity-renderer.html) → [URP](/graphics/engine/urp.html) → [HDRP](/graphics/engine/hdrp.html)
2. [Unreal Engine のレンダラー](/graphics/engine/unreal-renderer.html)

## フェーズ7: 総仕上げ — ゼロからレンダラーを作る

[最終章](/graphics/capstone/01-design.html) では、これまでの全知識を使って1フレームが描画されるまでを実装します。ここまでの章を読み終えていれば、各ステップで「なぜそうするのか」がすべて分かる状態になっているはずです。

## 学習スタイル別の入り口

| あなたのタイプ | 推奨の入り方 |
|---|---|
| まず全体像を掴みたい | [技術全史年表](/guide/rendering/timeline.html) → フェーズ1 |
| Unityをすでに使っている | [Unity のレンダラーと SRP](/graphics/engine/unity-renderer.html) を読み、分からない用語を辿って戻る |
| UEをすでに使っている | [Unreal Engine のレンダラー](/graphics/engine/unreal-renderer.html) から同様に |
| 低レベルから積み上げたい | フェーズ1 → フェーズ2 を厳密に順番に |
| とにかく手を動かしたい | [最終章](/graphics/capstone/01-design.html) を読みながら、詰まったページに戻る |
