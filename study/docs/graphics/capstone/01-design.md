---
title: "1. 全体設計 — 1フレームの旅"
study:
  source: "RenderingWiki"
  kind: "本文"
  status: "既存原稿"
  summary: "最終章では、Wiki全体の知識を使って、ゼロからレンダラーを設計・実装します。題材はVulkan (C++) を主とし、DX12との対応を併記します。目標は「三角形」で終わらず、影・PBRライティング・ポストプロセスを備えた1フレームが、CPUのコードからGPUの実行までどう流れるかを、自分の手で説"
---

# 1. 全体設計 — 1フレームの旅

## この章について

最終章では、**Wiki全体の知識を使って、ゼロからレンダラーを設計・実装**します。題材はVulkan (C++) を主とし、DX12との対応を併記します。目標は「三角形」で終わらず、**影・PBRライティング・ポストプロセスを備えた1フレームが、CPUのコードからGPUの実行までどう流れるか**を、自分の手で説明できるようになることです。

各ステップで「これは第N章のあの知識」と往復しながら進みます。**この章は読むだけでなく、必ず手を動かしてください。**

## 完成形の仕様

| 項目 | 内容 | 使う知識 |
|---|---|---|
| API | Vulkan 1.3 (Dynamic Rendering) / DX12併記 | [第5章](/graphics/api/vulkan.html) |
| シェーダ | HLSL→SPIR-V (DXC) or GLSL | [第4章](/graphics/shader/hlsl.html) |
| メッシュ | glTF読み込み (cgltf等) | [第2章](/math/rendering/transform.html) |
| ライティング | PBR (GGX) + IBL + 平行光源 | [第8章](/graphics/lighting/pbr.html) |
| 影 | シャドウマップ (PCF) | [シャドウ](/graphics/lighting/shadow.html) |
| ポスト | ブルーム + ACESトーンマップ | [第9章](/graphics/postprocess/overview.html) |
| 方式 | シングルパスForward (拡張課題でForward+) | [第7章](/graphics/path/forward.html) |

## アーキテクチャ全体図

```mermaid
flowchart TB
    subgraph App["アプリケーション層"]
        MAIN["main loop<br/>入力・カメラ・シーン更新"]
    end
    subgraph Renderer["レンダラー層 (この章で作る)"]
        DEV["Device<br/>初期化・スワップチェイン・フレーム同期"]
        RES["Resources<br/>バッファ/テクスチャ/パイプライン管理"]
        FRAME["FrameRenderer<br/>パスの構成と記録"]
    end
    subgraph GPU["GPU"]
        SHADOW[Shadow Pass] --> MESH2[Forward Pass] --> POST2[Post Pass] --> PRESENT[Present]
    end
    MAIN --> FRAME
    DEV --> FRAME
    RES --> FRAME
    FRAME -->|コマンドバッファ| GPU
```

## 1フレームの旅 — 完成後の姿を先に見る

実装を始める前に、完成したレンダラーの1フレームを**CPU側とGPU側の時系列**で追います。この図が本章の地図です:

```mermaid
sequenceDiagram
    participant CPU
    participant GPU
    Note over CPU: フレームN開始
    CPU->>CPU: ① フェンス待ち (フレームN-2の完了確認)
    CPU->>CPU: ② シーン更新・カメラ行列計算
    CPU->>CPU: ③ ユニフォームバッファ書き込み (このフレームのスロットへ)
    CPU->>CPU: ④ スワップチェイン画像取得
    CPU->>CPU: ⑤ コマンド記録:<br/>Shadow→Forward→Post→バリア群
    CPU->>GPU: ⑥ Submit (セマフォ+フェンス)
    Note over CPU: すぐフレームN+1の処理へ (並走!)
    GPU->>GPU: ⑦ シャドウマップ描画 (ライト視点の深度)
    GPU->>GPU: ⑧ バリア: 深度書き込み→シェーダ読み取り
    GPU->>GPU: ⑨ Forwardパス: PBR+影+IBL → HDRバッファ
    GPU->>GPU: ⑩ バリア → ブルーム縮小連鎖 → トーンマップ
    GPU->>GPU: ⑪ バリア: → Present レイアウト
    GPU->>CPU: ⑫ Present + フェンスシグナル
```

- ①③が[フレームインフライト](/hardware/gpu/cpu-vs-gpu.html)、⑤が[コマンドバッファ](/graphics/api/vulkan.html)、⑧⑩⑪が[バリア](/graphics/api/directx12.html)、⑦⑨が[パイプライン](/graphics/pipeline/overview.html)、⑨の中身が[PBR](/graphics/lighting/pbr.html)と[シャドウ](/graphics/lighting/shadow.html)、⑩が[ポストプロセス](/graphics/postprocess/overview.html)の実践です

## 設計判断とその理由

ゼロから作るとき、最初に決めるべきことと本章の選択:

| 決定 | 選択 | 理由 |
|---|---|---|
| API | Vulkan 1.3 | 全OS対応・検証レイヤが強力・「明示的APIの学習」という目的に最適 |
| RenderPass方式 | Dynamic Rendering | VkRenderPass地獄を回避 (モダン構成) → [Vulkan](/graphics/api/vulkan.html) |
| 同期 | フレームインフライト2 + Timeline Semaphore不使用の基本形 | まず古典形を理解する |
| メモリ | VMA (Vulkan Memory Allocator) | 手動メモリ管理はまず道具を使ってから学ぶ |
| バインディング | 更新頻度別Descriptor Set (0=フレーム, 1=マテリアル) | [定石](/graphics/api/vulkan.html) の体得 |
| 深度 | **Reverse-Z** | 最初から正しい習慣を → [カメラと射影](/math/rendering/camera.html) |
| 色空間 | HDR (RGBA16F) 中間+最後にトーンマップ | [ポストプロセス](/graphics/postprocess/overview.html) の原則 |

## プロジェクト構成

```text
mini-renderer/
├─ CMakeLists.txt          … シェーダの自動コンパイル込み (SPIR-Vページ参照)
├─ src/
│  ├─ main.cpp             … ループと入力 (GLFW)
│  ├─ device.cpp/.h        … 第2部: 初期化・スワップチェイン・同期
│  ├─ resources.cpp/.h     … 第3部: バッファ/画像/パイプライン
│  ├─ mesh.cpp/.h          … glTF読み込み
│  └─ frame.cpp/.h         … 第4-5部: パス記録
├─ shaders/
│  ├─ shadow.vert/.frag
│  ├─ pbr.vert/.frag
│  └─ post_*.comp
└─ assets/                 … glTFモデル・HDR環境マップ
```

**設計原則**: 「device (いつでも同じ)」「resources (ロード時)」「frame (毎フレーム)」の3層分離。これは[UEのRHI/Renderer分離](/graphics/engine/unreal-renderer.html)や[UnityのSRP設計](/graphics/engine/unity-renderer.html)の縮小版です。

## 前提知識

本章は総まとめです。最低限、以下を先に読んでください:

- [パイプライン全体像](/graphics/pipeline/overview.html)、[座標変換](/math/rendering/transform.html)
- [Vulkan](/graphics/api/vulkan.html) または [DirectX 12](/graphics/api/directx12.html)
- [CPUとGPUの役割分担](/hardware/gpu/cpu-vs-gpu.html) (フレームインフライト)

## 次に読むべきページ

- [2. デバイス初期化とスワップチェイン](/graphics/capstone/02-device.html) — 実装開始

## 理解度チェック

1. **「1フレームの旅」の⑧⑩⑪のバリアを1つでも忘れるとそれぞれ何が起きうるか。**
   ::: details 解答
   ⑧を忘れると、シャドウマップの書き込み完了前にForwardパスが読み始め、前フレームの深度や未定義値による影の破損(ちらつき・ゴミ)。⑩を忘れるとHDRバッファの書き込みとポストの読みが競合し画面の一部が壊れる。⑪を忘れるとPresent時のレイアウト不正で検証レイヤエラー、実機ではアーティファクトやクラッシュ。いずれも「たまに起きる」形で現れるのが怖いところで、これがRenderGraphによる自動化の動機。
   :::

2. **本章がDeferredでなくForwardを選んだ理由を、学習目的の観点で考察せよ。**
   ::: details 解答
   Forwardは「1つの三角形がライティング済みピクセルになるまで」を1本のシェーダで追える最短の因果で、パイプライン全体の初学に適する。DeferredはG-Bufferの設計・複数パスのバリア・位置再構成などの追加概念が絡み、Forwardを理解した後の拡張課題とする方が学習効率が良い。半透明やMSAAの制約もない。
   :::

## 参考資料

- vkguide.dev — 本章と同じ思想 (モダンVulkanでエンジンの骨格を作る) の英語教材
- Sascha Willems, Vulkan Samples — 個別機能の参照実装
- learnopengl.com — 概念の補助 (API は古いが理論解説が丁寧)
