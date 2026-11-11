---
title: Shared Memory と Atomic
study:
  source: RenderingWiki
  status: published
  summary: Shared Memoryは、スレッドグループ内の全スレッドが共有する高速なオンチップメモリです。Atomic操作やバリアと組み合わせて、GPU上でスレッド同士がデータを受け渡す方法を説明します。
  section: reference
  format: article
  domain: graphics
---

# Shared Memory と Atomic

## 概要

Shared Memory (HLSL: `groupshared`、CUDA: `__shared__`、GLSL: `shared`) は、スレッドグループ内の全スレッドが共有する、SMオンチップの高速メモリです。Atomic操作は、複数のスレッドが同じアドレスへの書き込みで競合しても、安全に処理するための命令群です。GPU上でスレッド同士が協力して処理するには、Shared Memory、Atomic操作、バリア (`GroupMemoryBarrierWithGroupSync`) を組み合わせます。

## なぜ必要なのか

- VRAMはレイテンシ数百サイクル、Shared Memoryは数十サイクル・広帯域 — **同じデータを複数スレッドが読むなら、一度Sharedに載せてから使う**のが基本戦略
- タイルベースの画像処理 (ぼかし等) は、Sharedなしでは同じピクセルを何十回もVRAMから読むことになる
- ヒストグラム・カウンタ・リスト構築のような「みんなが同じ場所に書く」処理はAtomicなしには書けない

## 歴史・誕生した背景

- 2006: G80/CUDAが**プログラマブルなオンチップメモリ**としてShared Memoryを導入 — それまでのGPUのオンチップメモリは固定機能 (キャッシュ・レジスタ) のみだった
- 2009: DirectCompute (DX11) で `groupshared` としてグラフィックスAPIに輸入
- Atomicも同時期にハードウェア実装 (まずグローバル、後にShared内も)
- 以降、容量は世代ごとに拡大 (16KB→48KB→64KB→128KB/SM級)。近年はL1キャッシュと物理を共有し、分配を設定できるアーキテクチャが主流

## それ以前の技術

FSベースGPGPUではスレッド間通信が完全に不可能で、複数パスに分割してテクスチャ経由で受け渡すしかありませんでした。

## 解決した課題

1. グループ内のデータ再利用によるVRAM帯域の劇的削減
2. スレッド間協調 (タイル処理、並列集約、ソート)
3. 競合書き込みの安全化 (Atomic)

## 現在の位置づけ

Compute最適化の中心概念であり続けています。ただし近年は (1) Wave命令がWave幅内の交換をより高速に代替、(2) キャッシュの大容量化、により「まずSharedありき」ではなく**計測して使う**バランス感覚が求められます。

## 内部動作

### メモリ階層の中での位置

| | レジスタ | Shared Memory | L2 | VRAM |
|---|---|---|---|---|
| レイテンシ | ~0 | ~20-30 cycle | ~200 | ~400-800 |
| 帯域 | 高い（命令とGPU次第） | 非常に高い | 高い | 製品により数百GB/s〜TB/s級 |
| スコープ | スレッド | **グループ** | 全体 | 全体 |
| 管理 | コンパイラ | **プログラマ** | HW | HW |

数値は階層の差を示す概算です。実際のレイテンシ・帯域はGPU、アクセス方法、キャッシュヒット、同時実行数等で変わります。

### バリアの意味論

```hlsl
groupshared float tile[16][16];

[numthreads(16, 16, 1)]
void CS(uint3 gtid : SV_GroupThreadID, uint3 dtid : SV_DispatchThreadID) {
    tile[gtid.y][gtid.x] = LoadPixel(dtid.xy);  // 各自1ピクセル書く
    GroupMemoryBarrierWithGroupSync();           // ★全員の書き込み完了を待つ
    // ここから全員がtile全体を安全に読める
}
```

- `GroupMemoryBarrierWithGroupSync()`: グループ内の**実行同期 + Sharedメモリ可視化**。書いた後に読む前、必ず挟む
- **グループ内で行き先が分かれる非一様な分岐の中で呼んではならない**（全スレッドが同じ回数到達する必要がある。一様な条件分岐は可能） — WGSLはこれをコンパイル時に強制する → [WGSL](/graphics/shader/wgsl.html)
- `DeviceMemoryBarrier` 系はUAV (VRAM) の可視化用で別物

### バンクコンフリクト

NVIDIA CUDAの代表的な構成では、Shared Memoryは32個の**バンク**に4バイト単位でインターリーブされています（他のGPUではバンク構成等を個別に確認します）。同一Warpの複数レーンが**同じバンクの異なるアドレス**を叩くとアクセスが直列化されます:

```text
float tile[32][32] の列アクセス tile[tid][i]（iは全レーン共通、tidがレーンごとに異なる） → 全レーン同一バンク → 32-way conflict!
対策: float tile[32][33] とパディング → バンクがずれて衝突解消 (古典的定石)
```

(全レーンが**同一アドレス**を読む場合はブロードキャストされ衝突しません)

### Atomic操作

| HLSL | 動作 |
|---|---|
| `InterlockedAdd(dest, v, orig)` | 加算し、元の値を返す |
| `InterlockedMin/Max` | 最小/最大 |
| `InterlockedAnd/Or/Xor` | ビット演算 |
| `InterlockedExchange` | 交換 |
| `InterlockedCompareExchange` | CAS (これでスピンロック等も組めるが非推奨) |

- 対象: `RWStructuredBuffer` 等のUAVと `groupshared` 変数
- 浮動小数点の加算atomicはSM6.6の標準`InterlockedAdd`にはない。SM6.6で追加されたfloat atomicは交換やビット単位の比較交換で、加算の代わりにはならない。float加算が必要なら対応する拡張や、整数のビット表現を使ったCASループ等を別途設計する
- **性能特性**: 同一アドレスへの競合が多いほど直列化で遅くなる。「Shared内で集約→グローバルへ1回」の2段構えが定石 → [Wave集約](/graphics/compute/execution-model.html) と併用

## 各環境での扱い

### Unity
`.compute` 内で `groupshared` をそのまま使用可。上限はAPIにより32KB (D3D) 程度。`SystemInfo.maxComputeWorkGroupSize` 等で能力確認。

### Unreal Engine
USFで同様に `groupshared`。Lumen/Naniteのシェーダにタイル集約の実例が多数あります (`LumenScreenProbeGather.usf` 等)。

### DirectX 12
`groupshared` 上限32KB/グループ (D3D12規定)。SM6.6で64bit整数atomicと、floatの交換・ビット比較交換が追加されました。64bit操作の必須範囲と、groupshared/typed resource等のoptionalな対応範囲は機能照会で確認します。floatのatomic加算が追加されたわけではありません。

### Vulkan
GLSL `shared`。上限は `maxComputeSharedMemorySize` (実機は32〜64KB+)。Subgroup操作との併用で段階的集約を組みます。

## コード例

セパラブルぼかしのタイル読み込み (帯域最適化の教科書例):

```hlsl
#define TILE 256
#define RADIUS 8
groupshared float3 sLine[TILE + RADIUS * 2];

Texture2D<float4> gSrc : register(t0);
RWTexture2D<float4> gDst : register(u0);

[numthreads(TILE, 1, 1)]
void BlurH(uint3 gtid : SV_GroupThreadID, uint3 dtid : SV_DispatchThreadID)
{
    // 1. タイル+袖領域を協調ロード (1スレッド1〜2回の読みで済む)
    int2 base = int2(dtid.x - RADIUS, dtid.y);
    sLine[gtid.x] = gSrc[ClampCoord(base)].rgb;
    if (gtid.x < RADIUS * 2)
        sLine[TILE + gtid.x] = gSrc[ClampCoord(base + int2(TILE, 0))].rgb;

    GroupMemoryBarrierWithGroupSync();

    // 2. Sharedからのみ読んで畳み込み (VRAM読みはもう発生しない)
    float3 sum = 0;
    [unroll]
    for (int i = 0; i <= RADIUS * 2; ++i)
        sum += sLine[gtid.x + i] * gWeights[i];
    gDst[dtid.xy] = float4(sum, 1);
}
```

Sharedヒストグラム (Atomic 2段構え):

```hlsl
groupshared uint sHist[256];

[numthreads(256, 1, 1)]
void HistCS(uint gi : SV_GroupIndex, uint3 dtid : SV_DispatchThreadID)
{
    sHist[gi] = 0;
    GroupMemoryBarrierWithGroupSync();

    uint bin = ComputeBin(gLoad(dtid.xy));
    InterlockedAdd(sHist[bin], 1);            // Shared内Atomic (高速・競合は局所)
    GroupMemoryBarrierWithGroupSync();

    InterlockedAdd(gGlobalHist[gi], sHist[gi]); // グローバルへは256グループ→1回ずつ
}
```

## 前提知識

- [Compute Shader](/graphics/compute/compute-shader.html)
- [GPU並列実行モデル](/graphics/compute/execution-model.html)

## 次に読むべきページ

- [並列アルゴリズム (Reduction/Scan)](/graphics/compute/parallel-algorithms.html) — この道具で作るアルゴリズム
- [GPU最適化の基礎](/graphics/optimization/basics.html)

## 理解度チェック

1. **グループバリアを非一様な分岐内に置けない理由を説明せよ。一様な分岐との違いは。**
   ::: details 解答
   グループ内の全スレッドが同じバリアへ同じ回数到達する必要がある。一部だけが通る非一様な分岐や、一部が先にreturnするコードでこの条件を破ると未定義動作になる。全スレッドが同じ結果になる一様な条件分岐なら、条件を満たす全員が同じバリアへ到達できる。Wave内で一様なだけでは、複数Waveを含むグループ全体の条件を満たすとは限らない。
   :::

2. **バンクコンフリクトはなぜ起きるか。`tile[32][33]` パディングが効く理由は。**
   ::: details 解答
   Shared Memoryは4バイト単位で32バンクにインターリーブされ、同一サイクルに同一バンクの異なるアドレスへアクセスすると直列化される。tile[32][32]の列方向アクセスは全レーンのアドレス差が32*4バイト=バンク数の倍数となり全員同じバンクに当たる。1要素パディングして33にすると行ごとにバンクが1ずつずれ、列アクセスが32バンクに分散する。
   :::

3. **ヒストグラムをグローバルAtomicだけで実装した場合と、Shared 2段構えの場合の性能差の要因は。**
   ::: details 解答
   グローバルメモリだけを使うと、数百万のスレッドによるAtomicがL2/VRAM上の256アドレスに集中し、処理が直列化してメモリトラフィックが増える。2段階に分けると、256スレッドからなる各グループ内の競合は高速なSharedメモリ内で処理できる。グローバルメモリへの処理は「グループ数×256回」の整列した加算に減り、競合と帯域消費を桁単位で抑えられる。
   :::

## 参考資料

- NVIDIA, *CUDA C++ Best Practices Guide* — Shared Memory章
- Mark Harris, *"Optimizing Parallel Reduction in CUDA"* — 古典
- Microsoft Learn, *Interlocked Functions (HLSL)*
- [NVIDIA: CUDA shared-memory banks](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/#shared-memory-and-memory-banks)
- [Microsoft: SM6.6 integer and float atomics](https://microsoft.github.io/DirectX-Specs/d3d/HLSL_SM_6_6_Int64_and_Float_Atomics.html)
- [Microsoft: GroupMemoryBarrierWithGroupSync](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/groupmemorybarrierwithgroupsync)
