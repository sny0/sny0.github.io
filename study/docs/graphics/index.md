---
{
  "title": "3DCGとグラフィックス",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": false,
    "section": "reference",
    "format": "index",
    "domain": "graphics"
  }
}
---

# 3DCGとグラフィックス

制作データからGPUの処理、最終表示までをつなぐ。

## 辞典の本文

- [4大API横断比較 — OpenGL / Vulkan / DirectX 12 / WebGPU](/graphics/api/comparison.html)
- [BRDF の中身 — Lambert・Blinn–Phong・GGX](/graphics/shader/brdf-internals.html)
- [Compute Shader](/graphics/compute/compute-shader.html)
- [CUDA と OpenCL](/graphics/compute/cuda-opencl.html)
- [D3D12でテクスチャに描き、次のパスで読む](/graphics/postprocess/render-to-texture.html)
- [D3D12でテクスチャをアップロードする](/graphics/texture/d3d12-texture-upload.html)
- [D3D12のキューをフェンスでつなぐ](/graphics/optimization/gpu-queue-synchronization.html)
- [D3D12のコマンドリストを複数スレッドで記録する](/graphics/optimization/parallel-command-recording.html)
- [D3D12のディスクリプタヒープとテーブルを使う](/graphics/optimization/d3d12-descriptor-heaps.html)
- [D3D12のリソースバリアと状態遷移](/graphics/optimization/d3d12-resource-barriers.html)
- [DDSの中身とテクスチャのサブリソース](/graphics/texture/dds-and-subresources.html)
- [Deferred Rendering](/graphics/path/deferred.html)
- [DirectX 11](/graphics/api/directx11.html)
- [DirectX 12](/graphics/api/directx12.html)
- [Enhanced Barriers と Vulkan synchronization2 — 順序・アクセス・レイアウト](/graphics/optimization/enhanced-barriers-and-synchronization2.html)
- [Forward Rendering](/graphics/path/forward.html)
- [Forward+ / Tiled / Clustered Rendering](/graphics/path/forward-plus.html)
- [Fragment Shader (Pixel Shader)](/graphics/pipeline/fragment-shader.html)
- [Geometry Shader](/graphics/pipeline/geometry-shader.html)
- [GLSL](/graphics/shader/glsl.html)
- [glTFのバッファから頂点とインデックスを読む](/graphics/mesh/gltf-mesh-buffers.html)
- [GPU Driven Rendering](/graphics/optimization/gpu-driven.html)
- [GPUが使うメモリはいつ再利用できるか — フェンスとリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)
- [GPUタイムスタンプクエリ — 描画パスの時間をGPUの時計で測る](/graphics/optimization/gpu-timestamp-queries.html)
- [GPUパーティクル — Computeで更新し、Indirectで描く](/graphics/shader/gpu-particles.html)
- [GPU最適化の基礎](/graphics/optimization/basics.html)
- [GPU並列実行モデル — Warp / Wave / SIMT](/graphics/compute/execution-model.html)
- [HDRP (High Definition Render Pipeline)](/graphics/engine/hdrp.html)
- [HLSL](/graphics/shader/hlsl.html)
- [IBL (イメージベースドライティング)](/graphics/lighting/ibl.html)
- [Lumen](/graphics/lighting/lumen.html)
- [Mesh Shader / Task Shader](/graphics/pipeline/mesh-shader.html)
- [Metal](/graphics/api/metal.html)
- [MSL (Metal Shading Language)](/graphics/shader/msl.html)
- [OpenGL](/graphics/api/opengl.html)
- [PBR (物理ベースレンダリング)](/graphics/lighting/pbr.html)
- [RenderGraph / FrameGraph](/graphics/optimization/render-graph.html)
- [Sampler Feedbackとテクスチャストリーミング — 必要なミップをGPUで記録する](/graphics/texture/sampler-feedback.html)
- [SDF とレイマーチング — 距離を使って形状・影・AO を描く](/graphics/shader/sdf-and-raymarching.html)
- [Shared Memory と Atomic](/graphics/compute/shared-memory.html)
- [SPIR-V と中間表現](/graphics/shader/spirv.html)
- [SSAO (Screen-Space Ambient Occlusion)](/graphics/lighting/ssao.html)
- [SSR (Screen-Space Reflections)](/graphics/lighting/ssr.html)
- [TAA (Temporal Anti-Aliasing)](/graphics/postprocess/taa.html)
- [Tessellation](/graphics/pipeline/tessellation.html)
- [Unity のレンダラーと SRP](/graphics/engine/unity-renderer.html)
- [Unreal Engine のレンダラー](/graphics/engine/unreal-renderer.html)
- [URP (Universal Render Pipeline)](/graphics/engine/urp.html)
- [Vertex Shader](/graphics/pipeline/vertex-shader.html)
- [Visibility Buffer と Deferred Texturing — 可視面から材質を復元する](/graphics/path/visibility-buffer.html)
- [Vulkan](/graphics/api/vulkan.html)
- [WebGPU](/graphics/api/webgpu.html)
- [WGSL](/graphics/shader/wgsl.html)
- [アップスケーリング — DLSS / FSR / XeSS](/graphics/postprocess/upscaling.html)
- [アニメーションシステム — クリップの選択から GPU スキニングまで](/graphics/basics/animation-systems.html)
- [アンチエイリアシング (MSAA / FXAA / SMAA)](/graphics/postprocess/antialiasing.html)
- [キーフレームとアニメーションの基本 — 時間から値を決める](/graphics/basics/keyframes-and-animation.html)
- [グラフィックスAPIの歴史](/graphics/api/history.html)
- [グローバルイルミネーション総論](/graphics/lighting/gi.html)
- [シェーダーコンパイルのカクつきとパイプラインキャッシュ](/graphics/optimization/pipeline-compilation-stutter.html)
- [シェーダーのデバッグ — 値の可視化と NaN の追跡](/graphics/shader/shader-debugging.html)
- [シェーダーの第一歩 — 頂点から三角形の色を作る](/graphics/shader/shader-first-steps.html)
- [シェーダーバリアントの管理 — コンパイルの組み合わせを減らす](/graphics/shader/shader-variants.html)
- [シェーダーへ渡すデータ — 頂点属性・uniform・テクスチャ](/graphics/shader/shader-inputs-and-uniforms.html)
- [シェーダー最適化の実践 — 精度・分岐・フェッチを計測する](/graphics/shader/shader-optimization.html)
- [シェーダ言語総論と比較](/graphics/shader/overview.html)
- [シャドウ](/graphics/lighting/shadow.html)
- [スワップチェーンとVSync — 描画した絵が画面に出るまで](/graphics/optimization/swap-chain-and-vsync.html)
- [テクスチャストリーミングとmipの常駐](/graphics/texture/texture-streaming-and-mip-residency.html)
- [テクスチャのフィルタリングとミップマップ — 遠くの模様はなぜちらつく？](/graphics/texture/texture-filtering-and-mipmaps.html)
- [デバッグ・プロファイリングツール — RenderDoc / PIX / Nsight / Frame Debugger](/graphics/optimization/tools.html)
- [トゥーンとNPR — 陰影の段と輪郭線を描き分ける](/graphics/shader/toon-and-npr.html)
- [ニューラルレンダリング — フレームを再構成する推論とシェーダー内の推論](/graphics/path/neural-rendering.html)
- [ノイズと手続き的テクスチャ — 格子・fBm・ドメインワープ](/graphics/shader/procedural-noise.html)
- [ハードウェアレイトレーシング (DXR / Vulkan Ray Tracing)](/graphics/lighting/raytracing.html)
- [パストレーシング](/graphics/lighting/path-tracing.html)
- [フレーム生成 — 2枚の間を補い、表示を滑らかにする](/graphics/postprocess/frame-generation.html)
- [ポストプロセスパイプライン](/graphics/postprocess/overview.html)
- [ボリューメトリック — 高さフォグ・フロクセル・雲と大気](/graphics/shader/volumetrics.html)
- [マテリアル・テクスチャ・シェーダーの基本](/graphics/basics/materials-textures-and-shaders.html)
- [メッシュをインポートして描画用データに変える](/graphics/mesh/mesh-import-and-cooking.html)
- [モデルとメッシュの基本 — 頂点から形を作る](/graphics/basics/models-and-meshes.html)
- [ラスタライゼーション](/graphics/pipeline/rasterization.html)
- [リアルタイム3D技術全史](/guide/rendering/timeline.html)
- [リグとスキニングの基本 — 骨の姿勢でメッシュを動かす](/graphics/basics/rigs-and-skinning.html)
- [レンダーパスのアタッチメントを読み込み、保持し、引き渡す](/graphics/optimization/render-pass-attachments.html)
- [レンダリングパイプライン全体像](/graphics/pipeline/overview.html)
- [後処理のピンポンバッファとフレーム履歴](/graphics/postprocess/ping-pong-and-history.html)
- [光とレンダリングの基本 — シーンから画像を作る](/graphics/basics/light-and-rendered-images.html)
- [座標変換とカメラの基本 — モデルの位置が画面に映るまで](/graphics/basics/transforms-and-cameras.html)
- [最新のシェーダー技術 — Slang・bindless・Work Graphs・VRS・Cooperative Vectors](/graphics/shader/modern-shader-technologies.html)
- [材質モデルの拡張 — 異方性・クリアコート・シーン・皮膚と髪](/graphics/shader/extended-material-models.html)
- [視差とデカール — 表面の凹凸と模様を重ねる](/graphics/shader/parallax-and-decals.html)
- [出力結合 (Depth / Stencil / Blend)](/graphics/pipeline/output-merger.html)
- [色空間と HDR — リニア光量からディスプレイ出力まで](/graphics/shader/color-space-and-hdr.html)
- [水面の表現 — 波の法線・反射・屈折・泡を合成する](/graphics/shader/water-shading.html)
- [大量光源のサンプリング — ReSTIR DI・GIとMegaLights](/graphics/lighting/many-light-sampling.html)
- [地形とバーチャルテクスチャ — 高さの格子と材質ページを別々に配る](/graphics/texture/terrain-and-virtual-texturing.html)
- [頂点シェーダーでの表現 — 風・波・VATで形を動かす](/graphics/shader/vertex-effects.html)
- [頂点バッファとインデックスバッファから三角形を組み立てる](/graphics/mesh/vertex-and-index-input.html)
- [入力から画面に出るまでの遅延](/graphics/optimization/input-to-display-latency.html)
- [平均60 FPSでもカクつくのはなぜか — フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)
- [並列アルゴリズム — Reduction / Prefix Sum (Scan)](/graphics/compute/parallel-algorithms.html)
- [法線マップと接空間 — TBN・MikkTSpace・チャンネル規約](/graphics/shader/normal-mapping.html)

## この分野の学習ガイド

- [リアルタイムグラフィックスを学ぶ](/graphics/rendering-intro.html)
- [描画の学習ガイドについて](/guide/rendering/about.html)
- [描画の学習ロードマップ](/guide/rendering/roadmap.html)
- [3DCGの形と見た目から読む](/guide/graphics-basics.html)
- [第12章 レンダリングパイプラインとシェーダ](/guide/low-level/rendering-pipeline-shaders.html) — 学習計画・概要
- [第13章 グラフィックスAPI](/guide/low-level/graphics-apis.html) — 学習計画・概要

## 作って試す

- [1. 全体設計 — 1フレームの旅](/graphics/capstone/01-design.html)
- [C++でD3D12のコマンドを別スレッドで記録する](/practice/graphics/parallel-command-recording-observation.html)
- [C++でDDSの2つのmipをD3D12へ転送して読み戻す](/practice/graphics/dds-upload-observation.html)
- [C++でGLBの頂点とインデックスを読み、三角形を描く](/practice/graphics/glb-mesh-observation.html)
- [C++でテクスチャに描き、次のパスで色を変える](/practice/graphics/render-to-texture-observation.html)
- [FIFO・MAILBOX・IMMEDIATEで画面の切り替わりを比べる](/practice/graphics/swap-chain-observation.html)
- [MSAAを切り替えて輪郭と床模様を見比べる](/practice/graphics/msaa-observation.html)
- [TAAを切り替えて床のちらつきとゴーストを比べる](/practice/graphics/taa-observation.html)
- [WebGPUでシェーダーの出力を比べる](/practice/graphics/shader-lab.html)
- [シェーダーで三角形の位置と色を変える](/practice/graphics/shader-first-steps.html)
- [フレーム生成を切り替えて滑らかさと入力への反応を比べる](/practice/graphics/frame-generation-observation.html)
- [斜めの床でテクスチャのフィルタリングを比べる](/practice/graphics/texture-filtering-observation.html)
- [同じ60 FPSで表示間隔を比べる](/practice/graphics/frame-pacing-observation.html)
- [同じシーンでVSyncオフ・オン・VRRを比べる](/practice/graphics/vsync-vrr-observation.html)
- [同じシーンでネイティブ描画・バイリニア・時間方向の拡大を比べる](/practice/graphics/taau-observation.html)
- [入力遅延を待ち時間と描画時間に分けてみる](/practice/graphics/input-latency-observation.html)
- [2. デバイス初期化とスワップチェイン](/graphics/capstone/02-device.html)
- [3. リソースとパイプライン構築](/graphics/capstone/03-resources.html)
- [4. 最初の三角形からメッシュ描画へ](/graphics/capstone/04-triangle.html)
- [5. 1フレームの構成 — 影・ライト・ポスト](/graphics/capstone/05-frame.html)

## 扱う範囲・増補する項目

- メッシュ・UV・材質
- リグ・アニメーション
- シェーダ
- OpenGL・Direct3D・Vulkan
- 光・色・最適化
