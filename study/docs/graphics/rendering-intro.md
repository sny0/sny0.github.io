---
title: リアルタイムグラフィックスを学ぶ
study:
  source: RenderingWiki
  status: published
  summary: GPU・数学・パイプライン・APIの本文を順番に読み、描画の実践へ進むための入口。
  section: learning
  format: path
  domain: graphics
  collection: rendering
  order: -1
---

<div id="リアルタイムグラフィックス完全wiki" class="study-legacy-anchor" aria-hidden="true"></div>

# リアルタイムグラフィックスを学ぶ

GPUとレンダリングを順番に学ぶための入口です。各項目の詳しい説明は技術辞典にあり、このガイドでは読む順序と分野のつながりを案内します。

まず全体の読み順を選び、必要な本文を読み、実践教材で確かめます。既に知っている内容は飛ばし、疑問のある項目へ戻って使えます。

- [学習を始める](/guide/rendering/roadmap.html)
- [描画の学習ガイドについて](/guide/rendering/about.html)
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

実践・サンプルの教材です。CPUからGPUまで、1フレームが描画されるまでを設計とコード断片で追います。

[この項目を読む](/graphics/capstone/01-design.html)

## 学習ロードマップ

どこから読めばいいか迷ったらここ。知識ツリーに沿った推奨学習順序を提示。

[この項目を読む](/guide/rendering/roadmap.html)
