---
title: Command Buffer と入力処理(Commandパターンとの関係)
study:
  source: C++ Wiki
  status: published
  summary: "Command Buffer: 「やるべき操作」をその場で実行せずリストに記録し、後でまとめて実行する仕組み。Commandパターン+Event Queue的な遅延実行の複合形。描画・物理・並列処理の世界の基盤技術"
  section: reference
  format: article
  domain: game
---

# Command Buffer と入力処理(Commandパターンとの関係)

## 一言で言うと

- **Command Buffer**: 「やるべき操作」をその場で実行せず**リストに記録し、後でまとめて実行**する仕組み。[Command](/design/patterns/command.html)パターン+[Event Queue](/game/patterns/event-queue-and-pubsub.html)的な遅延実行の複合形。描画・物理・並列処理の世界の基盤技術
- 入力処理におけるCommand: ボタンと実際の処理の間にコマンドやアクションを挟む。この分離をリバインド、リプレイ、AI操作、ネット同期に利用できる。

## Command Buffer(描画の世界)

### 解決したい問題

ゲームロジックの途中で描画APIの呼び出し（ドローコール）をその都度発行すると、次の問題が起こります。

- 描画状態の切り替えが無秩序に発生(性能最悪)
- 即時発行を一つのコンテキストへ集める構造では、コマンド記録を並列化しにくい
- 実行順の制御(不透明→半透明の順など)ができない

### 適用

```cpp
// C++20 — 描画コマンドを積んで、フレーム末尾で一括実行
#include <variant>
#include <vector>

struct DrawSprite { int textureId; float x, y; int sortKey; };
struct SetCamera { float x, y, zoom; };
using RenderCmd = std::variant<DrawSprite, SetCamera>;

class RenderQueue {
public:
    void Push(RenderCmd c) { cmds_.push_back(c); }        // ゲームロジック中は積むだけ
    void SortAndExecute() {
        // ソート(マテリアル・レイヤー順に並べ替えて状態切替を最小化)してから
        // 実際のAPI(GPU)へ流す。ここが唯一GPUに触る場所
        cmds_.clear();
    }
private:
    std::vector<RenderCmd> cmds_;
};
```

- **記録と実行の分離**により: ソート最適化/記録の並列化(各スレッドが自分のバッファに積み、最後に結合)/[Double Buffer](/game/patterns/optimization-patterns.html)化(メインスレッドがNフレーム目を積む間、描画スレッドがN-1フレーム目を実行)が可能になる
- 現代グラフィックスAPI(Vulkan/D3D12/Metal)は**APIそのものがコマンドバッファ方式**。Unityの `CommandBuffer` クラス、URP/HDRPのレンダーパス、UEのRHIコマンドリストも同じ構造

コマンドの記録、キューへの提出、GPUでの実行は別の段階です。D3D12やVulkanでは、各スレッドが別のコマンドリスト/バッファと必要な割り当て器を使って記録し、依存関係をそろえて提出する構成を取れます。提出順とキュー間同期も設計します。[D3D12の並列記録と提出](https://learn.microsoft.com/en-us/windows/win32/direct3d12/recording-command-lists-and-bundles)

### トレードオフ

- 得: 順序制御・ソート・並列化・スレッド分離
- 失: 「積んだ時点」と「実行時点」で世界の状態が違いうる(コマンドに必要な値をすべてコピーして積む必要がある——[Event Queue](/game/patterns/event-queue-and-pubsub.html)と同じ鉄則)。即時の結果(クエリ)が欲しい処理とは相性が悪い

## 入力処理とCommand

### 素朴な実装の問題(再掲+入力特有の問題)

```cpp
// 問題例
if (input.Pressed(Key::Space)) player.Jump();
```

- キー割り当て変更・パッド対応のたびに全操作コードを修正
- 「押した」の解釈(押した瞬間? 長押し? 同時押し?)が各所に散らばる
- リプレイ・自動テスト・ネット送信・AI操作が「本物のキーボード」なしにできない

### 段階的な設計(実務の形)

```
[物理入力層] キーボード/パッド/タッチ
     ↓ バインド設定(データ)で変換
[アクション層] Jump / Attack / Move(値つき)   ← ここが「入力のCommand化」
     ↓ 記録すればリプレイ、送信すればネット同期、AIが直接発行も可能
[ゲームロジック] player.Jump()
```

```cpp
// アクション層の骨組み。下の配布例では実際に記録・再生する。
struct FrameInput {          // 1フレーム分の「意図」。デバイス非依存
    float moveX = 0;         // -1..1
    bool jump = false;
    bool attack = false;
};

class IInputSource {         // 本物・リプレイ・AIを差し替え可能に(DIP)
public:
    virtual ~IInputSource() = default;
    virtual FrameInput Poll() = 0;
};

class KeyboardSource : public IInputSource {
public:
    FrameInput Poll() override { /* バインド表を見て変換 */ return {}; }
};
class ReplaySource : public IInputSource {
public:
    FrameInput Poll() override { /* 記録データの次のフレームを返す */ return {}; }
};
// ゲームは FrameInput しか見ない。record: Pollの結果を毎フレーム保存するだけ
```

**FrameInput(意図の構造体)方式**は、Commandオブジェクト列より単純で、固定レートの記録・ネット送信と相性がよく、アクションゲームの主流です。Undoや可変長の操作(エディタ)なら[Commandオブジェクト](/design/patterns/command.html)方式が向きます。

## Unity/C# との対応

- **新Input System**がこの構造の製品版: Action(Jump)とBinding(Space/パッド南ボタン)の分離、`InputActionAsset` でリバインドをデータ化
- 旧 `Input.GetKey` 直書きは素朴な実装そのもの(小規模なら悪くない)
- `UnityEngine.Rendering.CommandBuffer` / `ScriptableRenderContext` が描画側のCommand Buffer

## Unreal Engine との対応

- **Enhanced Input**(UE5)が同構造: InputAction + InputMappingContext(状況ごとにバインド一式を差し替え——乗り物に乗ったらマッピング切替、など)
- 描画はRHICmdList、ネット同期は「入力(移動)を送りサーバが検証」というCommand的構造が標準(CharacterMovementの予測と訂正)

## 使う場面 / 使わない場面

- **アクション層(入力の抽象化)**: リバインド・複数デバイス・リプレイ・ネットのいずれかが要件にあるなら最初から。完全に固定操作のジャム作品なら直書きでよい
- **Command Buffer**: 描画・物理など「順序とスレッドの都合が支配する」領域。自作するのはエンジン層を書くとき。ゲームロジックでは「スポーン予約リスト」「フレーム末尾の一括適用」として小さく現れる
- **使わない場面**: 即時性が要る単発処理に遅延バッファを挟まない。「積む→実行」の2段化はデバッグの手間を1段増やすコスト

## よくある誤解

- 「Command Buffer=Commandパターン」— 思想は同じ(操作のデータ化)だが、Bufferは**大量・毎フレーム・実行順最適化**が主目的で、Undoは目的にない
- 「入力抽象化すると操作感が犠牲になる」— 抽象化と応答性は独立。むしろ「押した瞬間の解釈」(バッファリング、先行入力)を1か所で丁寧に実装できる

## 関連項目

- [Command](/design/patterns/command.html) / [Event Queue](/game/patterns/event-queue-and-pubsub.html) / [Double Buffer(最適化系)](/game/patterns/optimization-patterns.html)
- [ケーススタディ: プレイヤー入力](/design/case-studies/player-input.html)

## 理解度チェック

1. Command Bufferの「記録と実行の分離」が可能にする3つのことは?
2. FrameInput方式とCommandオブジェクト方式の使い分けは?
3. 「積む時点の値をすべてコピーする」鉄則の理由は?

## 演習

<a href="/study/samples/cpp/input_actions.cpp" download>記録・再生の配布例</a>は、`Poll` の結果を更新ごとに `std::vector<FrameInput>` へ保存し、`ReplaySource` で再生します。最初から記録と再生が入り、両方で `x=2.5 jumps=1` が出ると `match` を表示して終了コード0を返します。練習では、記録した2回目の `jump` を再生前に `false` に変え、再生側のジャンプが0回になって終了コード1になることを確認できます。これは同じ初期状態と入力列を使う小さなモデルの確認です。実ゲームで結果を再現するには、更新の刻みや浮動小数点の条件などもそろえます。[ゲームループ](/game/patterns/game-loop-and-update.html)・[浮動小数点の決定性](/languages/cpp/floating-point-determinism.html)

---

関連項目：[Behavior Tree と Blackboard](/game/patterns/behavior-tree-and-blackboard.html) | [この分野の学習ガイド](/game/patterns/) | [MVC・MVP・MVVM](/game/patterns/mvc-mvp-mvvm.html)
