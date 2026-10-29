---
title: "第17章 Unreal Engineの内部 ── UE5ソースコードリーディング"
study:
  source: "IT教本"
  kind: "学習ガイド"
  status: "学習計画・概要"
  summary: "UE5はソースが読める産業最高峰エンジンであり、この教本の卒業試験場だ。 ここまでの16章はすべて「UE5を原文で読むための語彙」だったと言ってよい。 UObject/GC/リフレクション(第9章の拡張)、モジュールとDLL(第7章)、"
---

# 第17章 Unreal Engineの内部 ── UE5ソースコードリーディング

## 学ぶ理由

UE5は**ソースが読める産業最高峰エンジン**であり、この教本の卒業試験場だ。
ここまでの16章はすべて「UE5を原文で読むための語彙」だったと言ってよい。
UObject/GC/リフレクション(第9章の拡張)、モジュールとDLL(第7章)、
TaskGraph(第8章)、RHI(第13章)、レンダースレッド(第8,11章)──
UEの各機構を「一般原理の実装例」として読み解く。

## 到達目標

- UE5のソースをビルドし、デバッガでエンジン内部にステップインできる
- FEngineLoop::Tick()から始まる1フレームの流れをソース上で追える
- UObject・リフレクション・GCの仕組みを説明できる
- ゲームスレッド/レンダースレッド/RHIスレッドの分業を説明できる
- Actor/Component/Tick/レプリケーション等の主要機構の実装位置を知っている
- UnrealのタスクをC++で実装するとき、内部を意識した設計判断ができる

## 前提知識

第7章(DLL・リンク)、第8章(スレッド)、第9章(C++・vtable)、
第13章(RHI相当の知識)、第15章(エンジン一般論)。

## 学ぶ内容

1. **環境構築とコードの歩き方**
   - GitHubからUE5取得→GenerateProjectFiles→VSでビルド(DebugGame Editor)
   - モジュール構造: Runtime/Core, CoreUObject, Engine, RHI, Renderer...
     各モジュール=DLL(第7章の実物)。`*.Build.cs`と`MODULE_API`
   - 歩き方: シンボル検索(Ctrl+T)、参照検索、そして
     **「ブレークポイント+コールスタック」が最強の読解ツール**
2. **Coreモジュール ── ここまでの教本の答え合わせ**
   - TArray/TMap/FString(第9章自作コンテナの産業版)
   - FMemory/FMallocBinned2(第6章アロケータの産業版)
   - FRunnable/FTaskGraph/UE::Tasks(第8章ジョブシステムの産業版)
   - FPlatformMisc等のプラットフォーム抽象(第15章レイヤの実物)
3. **UObjectシステム(UEの心臓)**
   - UCLASS/UPROPERTY/UFUNCTIONマクロ → **UnrealHeaderTool(UHT)**が
     コード生成(*.generated.h)── 「C++にリフレクションを後付けする」手法
   - UClass(実行時型情報)、CDO(クラスデフォルトオブジェクト)
   - **ガベージコレクション**: UPROPERTYが参照グラフを形成し
     マーク&スイープ(第16章GCと比較せよ)。AddToRoot、TWeakObjectPtr
   - FName(文字列インターン)、FProperty(プロパティ反復)
   - シリアライズ(FArchive)とBlueprintがこの上に建つ構図
4. **ゲームプレイフレームワーク**
   - UWorld→ULevel→AActor→UActorComponent の所有構造
   - Tick系統(TickGroup、依存)、BeginPlay/EndPlayのライフサイクル
   - 入力の旅(UEの中): FSlateApplication→PlayerController→
     InputComponent(第14章の入力経路のUE版)
   - Blueprint VM(バイトコードインタプリタ! 第7章の知識で読める)と
     C++との呼び出し関係・コスト
5. **レンダリングの3スレッド構造(UE理解の要)**
   - **ゲームスレッド**(UWorldを更新)→ プロキシ(FPrimitiveSceneProxy)を
     介して → **レンダースレッド**(FSceneRendererがパスを構築)→
     **RHIスレッド**(D3D12/Vulkanへコマンド変換)→ GPU
   - 「ゲームスレッドはレンダーデータを直接触らない」規約と
     ENQUEUE_RENDER_COMMAND(第8章スレッド間通信の実物)
   - RDG(Render Dependency Graph)── レンダーグラフの産業実装
   - Nanite/Lumenは「存在と原理の概要」(GPU駆動描画・SDF/レイの融合)
     を知り、深掘りは発展編
6. **ソースリーディング演習ルート(この章の本体)**
   - ルートA: 起動 ── WinMain→GuardedMain→FEngineLoop::PreInit/Init/Tick
   - ルートB: 入力 ── XInput読み取り(WindowsApplication)→Slate→
     PlayerController→あなたのBindAction
   - ルートC: Tick ── TickTaskManagerがTickGroupをTaskGraphに投げる様子
   - ルートD: 描画 ── AStaticMeshActorが画面に出るまで
     (プロキシ生成→可視性判定→BasePass→RHICmdList→D3D12)
   - ルートE: UObject ── NewObject→GUObjectArray登録→GC実行
7. **UEでの実務に効く知識**
   - モジュール追加・プラグイン構造、UBT/UATの役割
   - スタッツ(stat unit/stat game)、Unreal Insights(第18章へ)
   - よくあるクラッシュ(GC済みActorへのアクセス等)の内部的理由

## 重要概念

- **UHTによるコード生成** ── リフレクション・GC・BP・ネットワークの土台
- **3スレッドパイプライン** ── 1フレームの遅延と引き換えの並列性
- **プロキシパターン** ── スレッド間のデータ所有権分離
- **「UEは一般原理の実装例」** ── 暗記でなく対応付けで読む

## ゲーム開発との関係

| 現場の事象 | この章の知識 |
|---|---|
| UPROPERTYを付け忘れてActorが消える | GCの参照グラフ |
| BPが重い→C++化の判断 | BP VMのコスト |
| ゲームスレッドからRTデータを触って稀にクラッシュ | 3スレッド規約 |
| stat unitのGame/Draw/GPUの意味 | 3スレッド+GPU計測 |
| ビルド構成(DebugGame/Development)の使い分け | モジュール・最適化 |
| エンジン改造(自社カスタムUE) | この章全部 |

## 演習

1. UE5をソースビルドし、空プロジェクトを **DebugGame Editor** で起動、
   `FEngineLoop::Tick` にブレークを張ってコールスタックを観察せよ。
2. ルートB(入力): パッドのAボタンに反応する自作ActorのC++ハンドラに
   ブレークを張り、コールスタックを**上に**辿って入力の発生源
   (WindowsApplication/XInput)までノートに記録せよ。
3. ルートD(描画): RenderDocプラグインでUEのフレームをキャプチャし、
   BasePass等をソース(FDeferredShadingSceneRenderer::Render)と
   対応付けよ。
4. `NewObject`で作ったUObjectをUPROPERTYなし参照で保持し、
   GCで消される事故を意図的に起こし、原因をGCソースの動作で説明せよ。
5. 最小のエンジン改造: FEngineLoop::Tickに自作ログ(フレーム番号と
   Δt)を仕込み、ビルドして動作確認せよ(「エンジンは編集できる
   ただのC++」という感覚を得る)。
6. stat unit で Game/Draw/GPU の数値を読み、自分のプロジェクトが
   どのスレッドバウンドか判定せよ。

## おすすめ書籍

- 『Unreal Engine 4で極めるゲーム開発』(historia)── UE和書の定番
  (UE5でも思想は通用)
- 公式ドキュメント「Unreal Architecture」「Threaded Rendering」
  「Actor Lifecycle」(一次情報として熟読)
- 『InsideUE4/UE5』系Web連載(知乎発の詳細解析の英訳・和訳記事群)
- Michael Noland等のEpic技術ブログ

## おすすめOSS

- **UnrealEngine 本体**(EpicGames/UnrealEngine ── 要アカウント連携)
  この章の教材そのもの
- Lyra Starter Game(公式サンプル。現代UEゲームプレイ設計の見本)
- UnrealSharp等のバインディング系(UObjectリフレクションの応用例)

## おすすめ動画

- Inside Unreal(Epic公式)のエンジン解説回
- "Unreal Engine Game Framework: From int main() to BeginPlay"
  (Alex Forsythe ── **UE内部解説動画の最高傑作。必見**)
- "Multithreading and Performance in Unreal"(同氏)
- UE Fest / CEDECのEpic Japan講演(おかず氏らのエンジン深掘り)

## 読むべきソースコード(読解ルートの再掲)

- `Launch/Private/LaunchEngineLoop.cpp`(FEngineLoop::Tick)
- `CoreUObject/Private/UObject/UObjectGlobals.cpp`(NewObject)、
  `GarbageCollection.cpp`
- `Engine/Private/Components/PrimitiveComponent.cpp` →
  `Renderer/Private/DeferredShadingRenderer.cpp`
- `Core/Private/HAL/MallocBinned2.cpp`(第6章の答え合わせ)
- `TickTaskManager.cpp`(第8章の答え合わせ)

## 理解度チェック

1. UPROPERTYマクロは最終的に何を生成し、GCとどう関係するか。
2. CDOとは何か。SpawnActorのコストとの関係は?
3. ゲームスレッドとレンダースレッドはどうデータを受け渡すか。
   なぜ直接共有しないのか(第8章の言葉で)。
4. stat unitでGame 20ms / Draw 8ms / GPU 10ms のとき何を最適化すべきか。
5. BlueprintはどうやってC++関数を呼ぶか(リフレクションの言葉で)。
6. 「Actorへの生ポインタをメンバに持つと危険」な理由をGCの仕組みから。
7. FEngineLoop::Tickの中で行われる主要な仕事を5つ挙げよ。

---

## この章がゲームのどこで使われているか

```
UE5製ゲームの1フレーム(3スレッド並走)
──────────────────────────────────────────────────────
GameThread   : 入力→PlayerController→Actor Tick群(TaskGraph並列)
               →プロキシ更新をRTへEnqueue ─┐
RenderThread : (1フレーム遅れ)可視性判定→RDGでパス構築→ ─┐
RHIThread    : RHICmdListをD3D12コマンドへ変換→Submit ──→ GPU
──────────────────────────────────────────────────────
裏方: UObject GC(ヒッチの原因にも) / FMallocBinned2(全確保)
      UHT生成コード(BP・ネット・エディタ連携の土台)
= 第8章(スレッド)+第13章(API)+第15章(エンジン)の最大実装例
```
