---
title: "リアルタイムグラフィックス完全Wiki"
study:
  source: "RenderingWiki"
  kind: "索引"
  status: "既存原稿"
  summary: "GPUとレンダリングを一つの知識体系として学ぶ ゲームプログラマのための「一生物の教材」。GPUの仕組みから Unity / Unreal / DirectX12 / Vulkan、そして最先端のGI・アップスケーリングまで。"
---

# リアルタイムグラフィックス完全Wiki

GPUとレンダリングを一つの知識体系として学ぶ

ゲームプログラマのための「一生物の教材」。GPUの仕組みから Unity / Unreal / DirectX12 / Vulkan、そして最先端のGI・アップスケーリングまで。

- [学習を始める](/guide/rendering/roadmap.html)
- [このWikiについて](/guide/rendering/about.html)
- [技術全史年表](/guide/rendering/timeline.html)

## GPU基礎

GPUとは何か、CPUとの役割分担、SIMTアーキテクチャ、メモリ階層。すべての土台となるハードウェアの理解。

[この項目を読む](/hardware/gpu/what-is-gpu.html)

## 3D数学

ベクトル・行列・座標変換・カメラ・クォータニオン。レンダリングを支える数学を「なぜ」から理解する。

[この項目を読む](/math/rendering/vector.html)

## レンダリングパイプライン

Vertex Shader から Fragment Shader、そして Mesh Shader まで。頂点がピクセルになるまでの全工程。

[この項目を読む](/graphics/pipeline/overview.html)

## シェーダ言語

HLSL / GLSL / WGSL / MSL / SPIR-V。言語間の対応関係とコンパイルパイプラインを横断的に比較。

[この項目を読む](/graphics/shader/overview.html)

## グラフィックスAPI

OpenGL から DirectX12・Vulkan・Metal・WebGPU へ。APIの進化の歴史と、明示的APIの設計思想。

[この項目を読む](/graphics/api/history.html)

## GPUコンピューティング

Compute Shader、Warp/Wave、Shared Memory、Reduction、Prefix Sum。GPUを汎用計算機として使いこなす。

[この項目を読む](/graphics/compute/compute-shader.html)

## ライティングとGI

PBR・IBL・シャドウ・SSAO・SSR・レイトレーシング・Lumen。光の物理と近似手法の系譜。

[この項目を読む](/graphics/lighting/pbr.html)

## ポストプロセスとAA

TAA・FXAA・DLSS・FSR・XeSS。現代のゲームグラフィックスを支える画像処理技術。

[この項目を読む](/graphics/postprocess/overview.html)

## GPU最適化

RenderGraph、GPU Driven Rendering、RenderDoc / PIX / Nsight によるプロファイリング。

[この項目を読む](/graphics/optimization/basics.html)

## エンジンのレンダラー

Unity SRP / URP / HDRP、Unreal Engine のレンダラー。商用エンジンの内部実装を理解する。

[この項目を読む](/graphics/engine/unity-renderer.html)

## ゼロからレンダラーを作る

最終章。CPUからGPUまで、1フレームが描画されるまでを実装を通して総まとめ。

[この項目を読む](/graphics/capstone/01-design.html)

## 学習ロードマップ

どこから読めばいいか迷ったらここ。知識ツリーに沿った推奨学習順序を提示。

[この項目を読む](/guide/rendering/roadmap.html)
