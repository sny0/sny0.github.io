---
title: "Shared Memory と Atomic"
study:
  source: "RenderingWiki"
  kind: "本文"
  status: "既存原稿"
  summary: "Shared Memory (HLSL: groupshared、CUDA: __shared__、GLSL: shared) は、スレッドグループ内の全スレッドが共有するSMオンチップの高速メモリです。Atomic操作は複数スレッドから同一アドレスへの競合書き込みを安全に行う命令群です。この2つと"
---

# Shared Memory と Atomic

## 概要

**Shared Memory** (HLSL: `groupshared`、CUDA: `__shared__`、GLSL: `shared`) は、スレッドグループ内の全スレッドが共有する**SMオンチップの高速メモリ**です。**Atomic操作**は複数スレッドから同一アドレスへの競合書き込みを安全に行う命令群です。この2つとバリア (`GroupMemoryBarrierWithGroupSync`) が、GPU上で「協調するアルゴリズム」を書くための三種の神器です。

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
| 帯域 | 最大 | 非常に高い | 高い | 数百GB/s |
| スコープ | スレッド | **グループ** | 全体 | 全体 |
| 管理 | コンパイラ | **プログラマ** | HW | HW |

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
- **分岐の中で呼んではならない** (全スレッドが到達する場所のみ) — WGSLはこれをコンパイル時に強制する → [WGSL](/graphics/shader/wgsl.html)
- `DeviceMemoryBarrier` 系はUAV (VRAM) の可視化用で別物

### バンクコンフリクト

Shared Memoryは32個の**バンク**に4バイト単位でインターリーブされています。同一Warpの複数レーンが**同じバンクの異なるアドレス**を叩くとアクセスが直列化されます:

```text
float tile[32][32] の列アクセス tile[i][tid] → 全レーン同一バンク → 32-way conflict!
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
- float版は標準にはない (CASループで自作、またはNV/AMD拡張、SM6.6のfloat atomic)
- **性能特性**: 同一アドレスへの競合が多いほど直列化で遅くなる。「Shared内で集約→グローバルへ1回」の2段構えが定石 → [Wave集約](/graphics/compute/execution-model.html) と併用

## 各環境での扱い

### Unity
`.compute` 内で `groupshared` をそのまま使用可。上限はAPIにより32KB (D3D) 程度。`SystemInfo.maxComputeWorkGroupSize` 等で能力確認。

### Unreal Engine
USFで同様に `groupshared`。Lumen/Naniteのシェーダにタイル集約の実例が多数あります (`LumenScreenProbeGather.usf` 等)。

### DirectX 12
`groupshared` 上限32KB/グループ (D3D12規定)。SM6.6でグローバルfloat atomic、64bit atomicが追加されました。

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

1. **バリアを分岐内に書いてはいけない理由をハードウェアレベルで説明せよ。**
   ::: details 解答
   バリアは「グループ内の全スレッドが到達する」ことを前提にした待ち合わせ機構であり、一部スレッドしか到達しない場所に置くと、到達したスレッドは永遠に他を待ちハング(または未定義動作)する。分岐がWarp単位でマスク実行されるため、コンパイラ・ハードウェアともに部分到達のバリアの意味を定義できない。
   :::

2. **バンクコンフリクトはなぜ起きるか。`tile[32][33]` パディングが効く理由は。**
   ::: details 解答
   Shared Memoryは4バイト単位で32バンクにインターリーブされ、同一サイクルに同一バンクの異なるアドレスへアクセスすると直列化される。tile[32][32]の列方向アクセスは全レーンのアドレス差が32*4バイト=バンク数の倍数となり全員同じバンクに当たる。1要素パディングして33にすると行ごとにバンクが1ずつずれ、列アクセスが32バンクに分散する。
   :::

3. **ヒストグラムをグローバルAtomicだけで実装した場合と、Shared 2段構えの場合の性能差の要因は。**
   ::: details 解答
   グローバルのみだと全スレッド(数百万)のAtomicがL2/VRAM上の256アドレスに集中し、激しい直列化とメモリトラフィックが起きる。2段構えではグループ内(256スレッド)の競合が高速なShared内で処理され、グローバルへは「グループ数×256回」の整列した加算だけになり、競合と帯域が桁で減る。
   :::

## 参考資料

- NVIDIA, *CUDA C++ Best Practices Guide* — Shared Memory章
- Mark Harris, *"Optimizing Parallel Reduction in CUDA"* — 古典
- Microsoft Learn, *Interlocked Functions (HLSL)*
