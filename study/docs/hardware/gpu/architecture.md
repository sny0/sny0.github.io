---
title: GPUアーキテクチャ詳解
study:
  source: RenderingWiki
  status: published
  summary: GPUの内部構造を、シェーダコア (SM/CU)、SIMT実行、メモリ階層、固定機能ユニットの4つから説明します。分岐、メモリアクセス、occupancyが性能とどう関係するかを扱います。
  section: reference
  format: article
  domain: hardware
---

# GPUアーキテクチャ詳解

## 概要

GPUの内部構造を、シェーダコア (SM/CU)、SIMT実行、メモリ階層、固定機能ユニットの4つに分けて説明します。これらの構造から、分岐に時間がかかる理由、メモリアクセスのパターンが性能を左右する理由、occupancyの意味を理解できます。

## なぜ必要なのか

シェーダはCに似た言語で書けますが、実行環境はCPUと根本的に異なります。GPUの構造を考慮せずに書くと、演算器の大半が使われないまま処理が進むことがあります。構造に合わせて処理を組むと、同じ結果を数分の一のコストで得られます。GPUの構造は、最適化、Compute Shader、GPU Drivenを学ぶ前提です。

## 歴史・誕生した背景

- **2001〜2005 (分離シェーダ)**: 頂点シェーダ用とピクセルシェーダ用に**別々の専用ユニット**を搭載。頂点重視のシーンではピクセルユニットが遊び、その逆も起きた
- **2005〜 (統合シェーダ)**: コンソールではATIの**Xenos（Xbox 360、2005年）**が先行。PCではNVIDIA **G80（2006年）**やATI/AMDのR600/TeraScale（2007年）へ続く。頂点/ピクセル/コンピュート等の処理へ同じ演算資源を配分する設計が広がった
- **2012〜 (GCN/Kepler以降)**: コンピュート性能重視の設計へ。AMD GCNの「Compute Unit (CU)」、明示的なWavefront実行
- **2018〜 (Turing/RDNA)**: RTコア・Tensorコアという新たな固定機能の追加。RDNA (2019) はWave32をネイティブに追加し、Wave64にも対応
- **現在**: NVIDIA (Ada/Blackwell)、AMD (RDNA3/4)、Intel (Xe)、Apple (Mシリーズ)、Qualcomm (Adreno) がそれぞれの方言を持つが、基本構造は共通

## それ以前の技術

固定機能パイプライン時代のGPUは「頂点処理回路 → ラスタライザ → ピクセル処理回路」が固定配線されたASICでした。プログラム可能性がなく、演算とデータフローが完全にハードコードされていました。

## 解決した課題

統合シェーダアーキテクチャは (1) ユニット稼働率の平準化、(2) シェーダステージの追加をソフトウェアで実現可能に (GS/Tessellation/Compute/Mesh はすべて同じSM上で動く)、(3) GPGPUへの道、の3つを一挙に解決しました。

## 現在の位置づけ

全ベンダーが統合シェーダ+SIMTを採用しています。ベンダー間の主な違い:

| | NVIDIA | AMD | Intel | Apple |
|---|---|---|---|---|
| 実行単位の呼称 | SM | CU / WGP | Xe-core | GPU Core |
| SIMD幅 (スレッド束) | Warp = 32 | Wave32 / Wave64 | SIMD8〜32 | SIMD32 |
| キャッシュ戦略 | 大きなL2 | Infinity Cache (巨大LLC) | L2 | TBDR + タイルメモリ |
| ラスタライズ方式 | タイルド即時 (IMR系) | IMR系 | IMR系 | **TBDR** |

モバイルGPU (Apple/Adreno/Mali) は **TBDR (Tile-Based Deferred Rendering)** という根本的に異なる方式を採ります(後述)。

## 内部動作

### 階層構造

```mermaid
flowchart TB
    subgraph GPU["GPU (例: 典型的なディスクリートGPU)"]
        CP[コマンドプロセッサ] --> GPC
        subgraph GPC["GPC / Shader Engine (数個)"]
            RAS[ラスタライザ] 
            subgraph SM["SM / CU (数十〜百数十個)"]
                direction TB
                WS[Warpスケジューラ x4] --> ALU[FP32 ALU x128]
                WS --> SFU[SFU 超越関数]
                WS --> TEX[テクスチャユニット]
                WS --> LDS[Shared Memory 64〜128KB]
                WS --> RF[レジスタファイル 256KB]
                RT[RTコア] 
                TC[Tensorコア]
            end
        end
        SM --> L2[L2キャッシュ 数MB〜]
        L2 --> MC[メモリコントローラ] --> VRAM[(GDDR6/HBM)]
    end
```

### SIMT実行モデル (要点)

- スレッドは **Warp (32) / Wave (32 or 64)** 単位で束ねられ、1つのプログラムカウンタを共有して同じ命令を実行する
- `if` で分岐が割れると両方のパスを**マスク付きで順番に実行** (divergence) → 実効性能が半減しうる
- SMは多数のWarpを保持し、あるWarpがメモリを待つ間に、実行可能な別のWarpの命令を発行できる(レイテンシ隠蔽)
- **Occupancy（占有率）**は、SMの上限に対する常駐Warp数の割合。常駐できる数の上限は、レジスタやShared Memoryの使用量、スレッドグループの大きさなどで変わる。[NVIDIAのoccupancyの説明](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html)

この詳細は [GPU並列実行モデル (Warp/Wave)](/graphics/compute/execution-model.html) で徹底的に扱います。

### メモリ階層

| 階層 | 容量の目安 | レイテンシ | 備考 |
|---|---|---|---|
| レジスタ | 256KB/SM | 即時 | スレッドごとに割当。使いすぎるとOccupancy低下 |
| Shared Memory (LDS/groupshared) | 世代依存（Adaは最大100KB/SM） | 数十cycleの例 | スレッドグループ内共有。NVIDIAの多くの世代ではL1等と同じSRAMから配分 |
| L1/テクスチャキャッシュ | Shared Memoryと合計128KB/SM（Adaの例） | 数十cycleの例 | 上の行と足し算しない。容量・配分はGPU世代で異なる |
| L2 | 4〜96MB | 数百cycle | 全SM共有 |
| VRAM | 例: 8〜32GBの民生製品 | 数百cycle等、計測条件依存 | RTX 5090は32GB GDDR7・約1.8TB/s。HBM搭載の計算用GPUは別に比較 |
| PCIe経由のシステムRAM | - | 極めて遅い | 転送は最小化する |

メモリアクセスは重要な最適化対象ですが、重いシェーダーでは演算、RT処理では交差・走査、描画によってはラスタライズ等も律速になります。メモリ帯域・待ち時間・演算器の利用状況をプロファイラーで測り、どこを改善するか決めます → [GPU最適化の基礎](/graphics/optimization/basics.html)

### 固定機能ユニット

次の処理は今も専用回路が担います。

- **ラスタライザ**: 三角形→ピクセル変換 → [ラスタライゼーション](/graphics/pipeline/rasterization.html)
- **テクスチャユニット**: アドレス計算・フィルタリング・フォーマット展開
- **ROP / Output Merger**: 深度テスト・ブレンド → [出力結合](/graphics/pipeline/output-merger.html)
- **RTコア**: BVHトラバーサルと三角形交差 → [ハードウェアレイトレーシング](/graphics/lighting/raytracing.html)
- **Tensorコア**: 行列積 (DLSSなどで使用) → [アップスケーリング](/graphics/postprocess/upscaling.html)

### IMR と TBDR

```mermaid
flowchart LR
    subgraph IMR["IMR (デスクトップ)"]
        A1[三角形ごとに即描画] --> A2[フレームバッファはVRAM上<br/>帯域を大量消費]
    end
    subgraph TBDR["TBDR (モバイル/Apple)"]
        B1[全三角形をタイルごとに分類 Binning] --> B2[タイル単位でオンチップメモリ上に描画] --> B3[完成タイルのみVRAMへ書出し]
    end
```

TBDRは帯域(=消費電力)を劇的に節約でき、モバイルで支配的です。ただし「全ジオメトリを一旦バッファに溜める」ため、ジオメトリ量が多いシーンや `discard` 多用に弱いという特性があります。モバイル向け最適化ではこの違いが決定的に重要です。

## 各環境での扱い

### Unity
アーキテクチャ差は基本的に抽象化されますが、モバイル(TBDR)向けには `RenderPass` API / URPの `RenderGraph` がタイルメモリを活かすように設計されています。シェーダのターゲットレベルは `#pragma target 4.5` などで指定します。

### Unreal Engine
RHIが差を吸収しますが、`r.Mobile.*` 系のCVarやモバイルレンダラーはTBDR前提の設計です。SM5/SM6 (Shader Model) のフィーチャーレベルでハードウェア世代を区別します。

### DirectX 12
アーキテクチャに最も近いAPIの一つ。`D3D12_FEATURE_DATA_D3D12_OPTIONS` 群でWaveサイズ・RT Tier・Mesh Shader Tierなどを問い合わせます。HLSL SM6.0以降のWave Intrinsicsでハードウェアの実行単位を直接操作できます。

### Vulkan
`VkPhysicalDeviceSubgroupProperties` でsubgroup(=Warp/Wave)サイズを取得。render passのsubpass/input attachmentや`VK_KHR_dynamic_rendering_local_read`は、対応する実装でタイル内データの再利用を表現する手段です。`VK_KHR_fragment_shading_rate`はシェーディング密度を変えるVRSの機能で、TBDR専用ではありません。

## コード例

Waveの集約を利用する例です（HLSL SM6、入力・出力の要素数と起動数を合わせる前提）。Wave幅はGPUと実行条件で変わり、64スレッドのグループが一つのWaveとは限りません。これは**グループ全体の合計ではなく、各Waveの合計**です。共有メモリを明示的に使いませんが、GPU命令一つに対応する保証もありません。

```hlsl
// 各レーンが、自分のWaveのアクティブレーンの合計を受け取る
StructuredBuffer<float> Input : register(t0);
RWStructuredBuffer<float> Output : register(u0);

[numthreads(64, 1, 1)]
void CSMain(uint3 id : SV_DispatchThreadID) {
    float waveSum = WaveActiveSum(Input[id.x]);
    Output[id.x] = waveSum;  // 同じWave内では同じ合計を各入力位置へ出す
}
```

レジスタの使用量を考えるときは、値を使い終わるまでの期間がどれだけ重なるかを見ます。次のHLSL SM6の例は、各スレッドで`SamplesPerItem`個の`float4`を成分ごとに足し、最後に4成分を一つの値にまとめます。`Input`には`ItemCount * SamplesPerItem`要素、`Output`には`ItemCount`要素を用意し、X方向だけに起動します。

```hlsl
StructuredBuffer<float4> Input : register(t0);
RWStructuredBuffer<float> Output : register(u0);
cbuffer Counts : register(b0) {
    uint ItemCount;
    uint SamplesPerItem;
};

// 1回の走査中に4成分の途中和を持ち続ける。
[numthreads(64, 1, 1)]
void TogetherCS(uint3 id : SV_DispatchThreadID) {
    if (id.x >= ItemCount) return;
    uint start = id.x * SamplesPerItem;
    float4 sum = float4(0, 0, 0, 0);
    [loop]
    for (uint i = 0; i < SamplesPerItem; ++i) {
        sum += Input[start + i];
    }
    Output[id.x] = (sum.x + sum.y) + (sum.z + sum.w);
}

// 前半の2成分を1値にまとめてから、残りの2成分を足す。
[numthreads(64, 1, 1)]
void SplitCS(uint3 id : SV_DispatchThreadID) {
    if (id.x >= ItemCount) return;
    uint start = id.x * SamplesPerItem;
    float2 first = float2(0, 0);
    [loop]
    for (uint i = 0; i < SamplesPerItem; ++i) {
        first += Input[start + i].xy;
    }
    float firstSum = first.x + first.y;

    float2 second = float2(0, 0);
    [loop]
    for (uint j = 0; j < SamplesPerItem; ++j) {
        second += Input[start + j].zw;
    }
    Output[id.x] = firstSum + (second.x + second.y);
}
```

`SplitCS`の後半のループで必要な途中和は、前半の合計1成分と後半の2成分です。コード上で保持する途中和が減る一方で、入力を2回走査します。物理レジスタの割り当てはコンパイラとGPUで変わるので、同じ入力と起動条件で、レジスタ数、occupancy、メモリアクセス、処理時間を比較します。[NVIDIAのシェーダープロファイラー資料](https://docs.nvidia.com/nsight-graphics/UserGuide/shader-profiler.html)

実行時に添字が決まるスレッド内の配列は、スレッド専用のローカルメモリに置かれることがあります。CUDAでは、この領域の実体はデバイスメモリにあります。配列の配置に伴うアクセスと、レジスタが足りずに値がスピルする場合を分けて調べます。この例の実行時の添字は、入力バッファの要素を選ぶためのものです。スレッド内の途中和は固定のベクトル成分で扱います。[NVIDIAのローカルメモリの説明](https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/writing-cuda-kernels.html#local-memory)

## 前提知識

- [GPUとは何か](/hardware/gpu/what-is-gpu.html)
- [CPUとGPUの役割分担](/hardware/gpu/cpu-vs-gpu.html)

## 次に読むべきページ

- [GPU並列実行モデル (Warp/Wave)](/graphics/compute/execution-model.html) — SIMT実行の詳細
- [パイプライン全体像](/graphics/pipeline/overview.html) — このハードウェアの上で走る論理パイプライン
- [Shared Memory と Atomic](/graphics/compute/shared-memory.html)
- [GPU最適化の基礎](/graphics/optimization/basics.html)

## 理解度チェック

1. **統合シェーダアーキテクチャ以前の「分離シェーダ」の問題点は何だったか。**
   ::: details 解答
   頂点用・ピクセル用ユニットが固定比率で搭載されていたため、シーンの負荷特性(頂点重視/ピクセル重視)によってどちらかのユニット群が遊んでしまい、稼働率が上がらなかった。
   :::

2. **GPUがキャッシュと併せて多数の常駐スレッドを持ち、メモリレイテンシを隠す仕組みを説明せよ。**
   ::: details 解答
   1つのSMに多数のWarpを常駐させ、あるWarpがメモリを待っている間に、実行できる別のWarpの命令を発行して待ち時間を隠す。SMの上限に対する常駐Warp数の割合がoccupancy。
   :::

3. **シェーダのレジスタ使用量を減らすと性能が向上することがあるのはなぜか。**
   ::: details 解答
   レジスタが常駐Warp数の制約になっているときは、1スレッドあたりの使用量を減らすと常駐Warp数が増え、メモリ待ちを隠しやすくなることがある。スピルや入力の再読み込みが増えると処理時間が伸びる場合もあるため、occupancyと処理時間を併せて確認する。
   :::

4. **TBDRがモバイルで採用される最大の理由と、その代償を述べよ。**
   ::: details 解答
   理由: フレームバッファ操作をオンチップのタイルメモリ内で完結させ、消費電力の主因であるDRAM帯域を劇的に削減できるため。代償: 全ジオメトリをタイルごとに分類(ビニング)して溜める必要があり、ジオメトリ量の多いシーンでビニングコストとメモリが増大する。
   :::

## 参考資料

- Fabian Giesen, *"A trip through the Graphics Pipeline 2011"* — 全パート必読
- NVIDIA, 各世代 Architecture Whitepaper (Turing / Ampere / Ada)
- AMD, *RDNA Architecture* Whitepaper / GPUOpen の ISA ドキュメント
- ARM, *Mali GPU Best Practices* (TBDR理解に)
- Real-Time Rendering 4th ed., Chapter 23 "Graphics Hardware"
- [NVIDIA: AdaのShared Memory/L1配分](https://docs.nvidia.com/cuda/ada-tuning-guide/index.html)
- [NVIDIA: HopperのShared Memory/L1配分](https://docs.nvidia.com/cuda/hopper-tuning-guide/index.html)
- [NVIDIA: RTX 5090の仕様](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/)
- [Microsoft: WaveActiveSum](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/waveallsum)
- [Khronos: Dynamic Rendering Local Read](https://docs.vulkan.org/features/latest/features/proposals/VK_KHR_dynamic_rendering_local_read.html)
- [Michael Doggett（ATI）: Xenos（2005年）](https://fileadmin.cs.lth.se/cs/Personal/Michael_Doggett/talks/x05-xenos-doggett.pdf)
- [Fabian Giesen: Graphics Pipeline 2011](https://fgiesen.wordpress.com/2011/07/09/a-trip-through-the-graphics-pipeline-2011-index/)
