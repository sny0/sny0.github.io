---
title: GPUアーキテクチャ詳解
study:
  source: RenderingWiki
  status: published
  summary: このページではGPUの内部構造を、シェーダコア (SM/CU)・SIMT実行・メモリ階層・固定機能ユニットの4つの軸で解説します。ここを理解すると、「なぜ分岐が遅いのか」「なぜメモリアクセスパターンが性能を支配するのか」「occupancyとは何か」といった、シェーダ最適化のすべての疑問に答えられる
  section: reference
  format: article
  domain: hardware
---

# GPUアーキテクチャ詳解

## 概要

このページではGPUの内部構造を、**シェーダコア (SM/CU)・SIMT実行・メモリ階層・固定機能ユニット**の4つの軸で解説します。ここを理解すると、「なぜ分岐が遅いのか」「なぜメモリアクセスパターンが性能を支配するのか」「occupancyとは何か」といった、シェーダ最適化のすべての疑問に答えられるようになります。

## なぜ必要なのか

シェーダは「気軽に書けるC風言語」に見えますが、その実行環境はCPUと根本的に異なります。アーキテクチャを知らずに書いたシェーダは、**演算器の大半を遊ばせたまま**動くことがあります。逆に構造を知っていれば、同じ結果を数分の一のコストで得られます。最適化・Compute Shader・GPU Drivenの全ての土台です。

## 歴史・誕生した背景

- **2001〜2005 (分離シェーダ)**: 頂点シェーダ用とピクセルシェーダ用に**別々の専用ユニット**を搭載。頂点重視のシーンではピクセルユニットが遊び、その逆も起きた
- **2005〜 (統合シェーダ)**: コンソールではATIの**Xenos（Xbox 360、2005年）**が先行。PCではNVIDIA **G80（2006年）**やATI/AMDのR600/TeraScale（2007年）へ続く。頂点/ピクセル/コンピュート等の処理へ同じ演算資源を配分する設計が広がった
- **2012〜 (GCN/Kepler以降)**: コンピュート性能重視の設計へ。AMD GCNの「Compute Unit (CU)」、明示的なWavefront実行
- **2018〜 (Turing/RDNA)**: RTコア・Tensorコアという新たな固定機能の追加。RDNAはWave64からWave32へ移行
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
- SMは多数のWarpを保持し、あるWarpがメモリ待ちになると**即座に別のWarpへ切替**える(レイテンシ隠蔽)
- 保持できるWarp数は**レジスタ使用量とShared Memory使用量**で決まる = **Occupancy**

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

シェーダ化されず、今も専用回路であり続けるもの:

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

Occupancyを意識したレジスタ削減の考え方 (擬似コード):

```text
// 悪い例: ループ外で大量の値を生かし続ける → レジスタ圧迫 → Occupancy低下
big1..big40 = 事前計算した40個の値
for each light: color += Shade(big1..big40, light)

// 良い例: ループ内で都度計算 (ALUは余っている)
for each light:
    a, b, c = 必要になった時点で再計算
    color += Shade(a, b, c, light)
```

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
   1つのSMに多数のWarpを常駐させ、メモリ待ちが発生したWarpから実行可能な別のWarpへハードウェアが1サイクルで切り替えることで、演算器を遊ばせない(レイテンシ隠蔽)。これが可能なWarp数の余裕をOccupancyと呼ぶ。
   :::

3. **シェーダのレジスタ使用量を減らすと性能が向上することがあるのはなぜか。**
   ::: details 解答
   SMのレジスタファイルは全常駐Warpで分け合うため、1スレッドのレジスタ消費が多いと常駐できるWarp数(Occupancy)が減り、レイテンシ隠蔽能力が下がる。レジスタを削れば同時常駐Warpが増え、メモリ待ちを隠しやすくなる。
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
