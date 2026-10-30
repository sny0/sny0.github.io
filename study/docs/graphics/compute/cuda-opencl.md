---
title: CUDA と OpenCL
study:
  source: RenderingWiki
  status: published
  summary: CUDA (NVIDIA, 2007) と OpenCL (Khronos, 2009) は、グラフィックスAPIから独立した汎用GPU計算 (GPGPU) のためのプラットフォームです。ゲーム開発では Compute Shader が主役ですが、CUDAは機械学習・オフラインレンダリング・ツール開
  section: reference
  format: article
  domain: graphics
---

# CUDA と OpenCL

## 概要

CUDA (NVIDIA, 2007) と OpenCL (Khronos, 2009) は、グラフィックスAPIから独立した**汎用GPU計算 (GPGPU) のためのプラットフォーム**です。ゲーム開発では [Compute Shader](/graphics/compute/compute-shader.html) が主役ですが、CUDAは機械学習・オフラインレンダリング・ツール開発で圧倒的な地位を持ち、その概念と用語 (カーネル、Warp、Shared Memory) はGPU計算全体の共通語になっています。

## なぜ必要なのか

- **概念の原点**: Compute Shaderのスレッドグループ・共有メモリ・アトミックはすべてCUDAが確立したモデルの輸入
- DLSSのようなAI機能、PhysX、OptiX (RTレンダラー)、機械学習パイプラインとの連携 — ゲーム産業の周辺はCUDAだらけ
- ツール (ライトマップベイカー、アセット処理) をGPU化する際の選択肢

## 歴史・誕生した背景

- 2003-06: FSを悪用したGPGPU研究 (BrookGPU — スタンフォードのIan Buck、後のCUDAの父)
- **2007: CUDA 1.0** — G80と共に。C言語拡張・専用コンパイラ (nvcc)・ランタイムを揃えた垂直統合
- **2009: OpenCL 1.0** — Apple主導でKhronos標準化。CPU/GPU/DSPを跨ぐ移植性を目標に
- 2010年代: CUDAはcuDNN (2014) を軸に深層学習を制覇。OpenCLはドライバ品質のばらつき・Appleの離脱 (Metal移行)・NVIDIAの消極対応で失速
- 現在: CUDA一強。対抗はAMD **ROCm/HIP** (CUDA互換層)、Intel **oneAPI/SYCL**、そしてコンピュートに限れば **Vulkan Compute / WebGPU** も選択肢

## それ以前の技術

FSによる擬似GPGPU (テクスチャ=配列、描画=カーネル起動)。

## 解決した課題

1. グラフィックスの語彙 (テクスチャ・ラスタライズ) なしでGPUを叩ける計算モデル
2. C/C++でのカーネル記述、ホストコードとの統合 (単一ソース)
3. スレッド階層・共有メモリ・アトミックという**現在の全GPU計算モデルの標準化**

## 現在の位置づけ

| 用途 | 第一選択 |
|---|---|
| ゲーム内のGPU計算 | Compute Shader (DX12/Vulkan/Metal) |
| 機械学習・研究 | CUDA (PyTorch等の下層) |
| DCCツール・オフラインレンダラー | CUDA (OptiX) / Metal |
| クロスベンダーの計算 | Vulkan Compute / SYCL / WebGPU |
| OpenCL | レガシー保守・一部組み込み (新規は縮小) |

**ゲームエンジニアにとっての実践的結論**: 書くのはCompute Shader、読むのはCUDAの資料 — NVIDIAの最適化文書 (Best Practices Guide) はCompute Shader最適化にそのまま応用できる最良の教材です。

## 内部動作 — 用語対応

CUDAの概念はCompute Shaderと1対1対応します:

| CUDA | HLSL Compute | OpenCL | 意味 |
|---|---|---|---|
| kernel (`__global__`) | Compute Shader | kernel | GPU側関数 |
| grid | Dispatch | NDRange | 起動全体 |
| block | thread group | work-group | 協調単位 |
| thread | thread | work-item | 最小単位 |
| warp | wave | sub-group | SIMT実行幅 |
| `__shared__` | `groupshared` | `__local` | 共有メモリ |
| `__syncthreads()` | `GroupMemoryBarrierWithGroupSync()` | `barrier()` | グループバリア |
| `threadIdx` | `SV_GroupThreadID` | `get_local_id()` | グループ内ID |
| `blockIdx` | `SV_GroupID` | `get_group_id()` | グループID |

### CUDAだけが持つ強み (Compute Shaderとの差)

- **単一ソース**: ホストとカーネルを同じC++ファイルに書き、`<<<grid, block>>>` で呼ぶ
- **ライブラリ資産**: cuBLAS/cuFFT/CUB/Thrust/cuDNN — 実装済み高速部品の山
- **高度な機能**: Unified Memory、Dynamic Parallelism (カーネルからカーネル起動)、Cooperative Groups、CUDA Graphs
- **プロファイラ**: Nsight Compute のカーネル分析は他の追随を許さない

### グラフィックスとの相互運用

CUDA↔DX12/Vulkan/GLはリソース共有API (external memory / semaphore) で連携できます。DLSSがゲーム内で動くのは、この相互運用でTensorコアの推論をレンダリングと同期させているためです。

## 各環境での扱い

### Unity / Unreal Engine
直接の統合はありません (Compute Shaderを使う)。エディタ拡張・パイプラインツールでCUDA製ライブラリ (テクスチャ圧縮・ML) を使うことはあります。UEのML Deformer等はプラットフォームのML API経由。

### DirectX 12
相互運用 (shared handle) でCUDAバッファと共有可能。DirectML がDX12ネイティブのML推論APIとして対応関係にあります。

### Vulkan
`VK_KHR_external_memory` / `VK_KHR_external_semaphore` でCUDAと共有。Vulkan Compute自体がOpenCLの後継的役割を担いつつあります (clspvによるOpenCL C→SPIR-V変換も存在)。

## コード例

CUDA — ベクトル加算の完全な例 (単一ソースの威力):

```cpp
#include <cuda_runtime.h>
#include <cstdio>

__global__ void vecAdd(const float* a, const float* b, float* c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;  // SV_DispatchThreadID相当
    if (i < n) c[i] = a[i] + b[i];
}

int main() {
    const int N = 1 << 20;
    float *a, *b, *c;
    cudaMallocManaged(&a, N * sizeof(float));   // Unified Memory
    cudaMallocManaged(&b, N * sizeof(float));
    cudaMallocManaged(&c, N * sizeof(float));
    for (int i = 0; i < N; ++i) { a[i] = i; b[i] = 2 * i; }

    int block = 256;
    int grid  = (N + block - 1) / block;
    vecAdd<<<grid, block>>>(a, b, c, N);        // カーネル起動構文
    cudaDeviceSynchronize();

    printf("c[100] = %f\n", c[100]);
    cudaFree(a); cudaFree(b); cudaFree(c);
}
```

同じ処理のOpenCLは、プラットフォーム列挙→コンテキスト→キュー→プログラムビルド→カーネル引数設定と、Vulkan並みのボイラープレートが必要です (それが標準APIの宿命でもあります)。

## 前提知識

- [Compute Shader](/graphics/compute/compute-shader.html)
- [GPU並列実行モデル](/graphics/compute/execution-model.html)

## 次に読むべきページ

- [並列アルゴリズム](/graphics/compute/parallel-algorithms.html) — CUB/Thrustが実装している中身
- [アップスケーリング (DLSS/FSR/XeSS)](/graphics/postprocess/upscaling.html) — CUDA/Tensorコアの成果物
- [レイトレーシング](/graphics/lighting/raytracing.html) — OptiXとの関係

## 理解度チェック

1. **CUDAが機械学習で覇権を取れた要因を、技術とエコシステムの両面で挙げよ。**
   ::: details 解答
   技術面: 単一ソースC++・成熟したコンパイラ/プロファイラ・世代を跨ぐ安定した実行モデルで開発生産性が高かった。エコシステム面: cuDNN等の高速ライブラリを自社で整備し、フレームワーク(TensorFlow/PyTorch)の標準バックエンドの地位を確保、ハードとソフトの垂直統合で他社が追随できない好循環を作った。
   :::

2. **OpenCLが失速した理由を3つ挙げよ。**
   ::: details 解答
   (1)ベンダー間のドライバ品質・対応バージョンのばらつきで「書けば動く」が成立しなかった。(2)主導者Appleが自社Metalへ移行し離脱。(3)NVIDIAがCUDA優先でOpenCL対応に消極的だったため、最大シェアのGPUで二級市民だった。結果、移植性という唯一の売りが実効性を失った。
   :::

3. **ゲーム内のGPU計算にCUDAではなくCompute Shaderを使う理由は。**
   ::: details 解答
   CUDAはNVIDIA専用でありAMD/Intel/コンソール/モバイルで動かない。またゲームのGPU計算はレンダリングと密結合(同じリソース・同じフレーム内同期)であり、グラフィックスAPI内のComputeなら追加の相互運用層なしで統合できる。
   :::

## 参考資料

- NVIDIA, *CUDA C++ Programming Guide* / *Best Practices Guide*
- *Programming Massively Parallel Processors* (Kirk & Hwu) — GPGPUの標準教科書
- Khronos, *OpenCL Guide* / AMD *HIP documentation*
