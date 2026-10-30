---
title: Command
study:
  source: C++ Wiki
  status: published
  summary: 「操作」そのものをオブジェクト(データ)として持ち運びたい。関数呼び出しは実行した瞬間に消えるが、オブジェクトにすれば、保存(リプレイ)、取り消し(Undo)、キューイング(遅延実行)、割り当て変更(キーリバインド)ができる。
  section: reference
  format: article
  domain: design
---

# Command

## 解決する問題

「操作」そのものを**オブジェクト(データ)として持ち運びたい**。関数呼び出しは実行した瞬間に消えるが、オブジェクトにすれば、保存(リプレイ)、取り消し(Undo)、キューイング(遅延実行)、割り当て変更(キーリバインド)ができる。

## 登場人物と責務

- **Command**: `Execute()`(と必要なら `Undo()`)を持つインターフェース
- **ConcreteCommand**: 具体的な操作と、その実行に必要な文脈を保持
- **Invoker**: コマンドを起動する側(入力処理、UIボタン、キュー)
- **Receiver**: 実際に作用を受けるもの(キャラクター、盤面)

## 最小構成図

```
[入力] ─生成→ JumpCommand ─┐
[UIボタン] ─生成→ ...      ├─> キュー/履歴 ──Execute()──> [キャラクター]
[AI] ─生成→ ...            ┘      (保存・遅延・取消が可能に)
```

## パターンなしの実装

```cpp
// C++20(問題例)— 入力とアクションが直結
void HandleInput(Player& player, const Input& input) {
    if (input.Pressed(Key::Space)) player.Jump();
    if (input.Pressed(Key::X))     player.Attack();
    // リバインド? リプレイ? Undo? どれも構造を変えないと無理
}
```

## 問題点

- キーとアクションの対応がハードコード(リバインド不可)
- 操作の記録・再生(リプレイ)、取り消し(レベルエディタのUndo)ができない
- AI・ネットワーク・UIから「同じ操作」を起こすのに、入力処理を経由できず重複実装になる

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>
#include <unordered_map>
#include <vector>

class ICommand {
public:
    virtual ~ICommand() = default;
    virtual void Execute(Player& player) = 0;
};

class JumpCommand : public ICommand {
public:
    void Execute(Player& player) override { player.Jump(); }
};
class AttackCommand : public ICommand {
public:
    void Execute(Player& player) override { player.Attack(); }
};

// Invoker: キー→コマンドの対応表(=リバインドはこの表の書き換え)
class InputMapper {
public:
    void Bind(Key key, std::unique_ptr<ICommand> cmd) { binds_[key] = std::move(cmd); }
    void HandleInput(Player& player, const Input& input) {
        for (auto& [key, cmd] : binds_)
            if (input.Pressed(key)) cmd->Execute(player);
    }
private:
    std::unordered_map<Key, std::unique_ptr<ICommand>> binds_;
};
```

### Undo付きの形(エディタ・パズルで必須の形)

```cpp
// C++20 — Undoは「実行前の状態を覚える」or「逆操作を実装する」
class MoveUnitCommand : public ICommand {
public:
    MoveUnitCommand(UnitId id, GridPos to) : id_(id), to_(to) {}
    void Execute(Board& board) { from_ = board.PosOf(id_); board.Move(id_, to_); }
    void Undo(Board& board)    { board.Move(id_, from_); }   // 逆操作
private:
    UnitId id_; GridPos to_; GridPos from_{};   // Undoに必要な文脈を自分で保持
};
// 履歴: std::vector<std::unique_ptr<MoveUnitCommand>> history;
// Undo: history.back()->Undo(board); history.pop_back();
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_command.cpp">samples/pattern_command.cpp</a>

### 現代的な軽量形

状態を持たない単発操作なら `std::function<void(Player&)>` で十分です。Undo・シリアライズ(リプレイ保存)が要るときに初めてクラスにします。

## C#またはUnityでの実装

```csharp
// リバインド対応入力(Unityの新InputSystemはこの構造を内蔵している)
public interface ICommand { void Execute(PlayerContext p); }
public class JumpCommand : ICommand { public void Execute(PlayerContext p) => p.Jump(); }

public class InputMapper {
    private readonly Dictionary<KeyCode, ICommand> binds = new();
    public void Bind(KeyCode key, ICommand cmd) => binds[key] = cmd;
    public void Tick(PlayerContext p) {
        foreach (var (key, cmd) in binds)
            if (UnityEngine.Input.GetKeyDown(key)) cmd.Execute(p);
    }
}
```

Unityの `InputAction`(操作の抽象)と `UnityEvent`/delegateの組み合わせは、Commandの思想が製品化されたものと読めます(→ [Commandと入力処理の詳細比較](/game/patterns/command-buffer-and-input.html))。

## ゲームでの具体例

- キーリバインド、入力のリプレイ記録・再生、ネット対戦の入力同期(コマンドを送る)
- レベルエディタ・パズルのUndo/Redo
- ターン制ゲームの行動キュー(行動を貯めて順に実行・演出と分離)
- チュートリアルでの操作の自動再生

## 利点

- 操作が第一級の値になる: 保存・転送・遅延・取消・合成ができる
- 発行者(入力/UI/AI/ネット)と実行内容が分離され、同じ操作を多経路から起こせる
- 操作履歴がそのままデバッグログ・リプレイデータになる

## 欠点

- 操作1つにつきクラス1つ(または関数オブジェクト)が増える
- 「即時に関数を呼ぶだけ」の場面では純粋なオーバーヘッド
- Undo実装は各コマンドが文脈を正しく保存する規律が必要(1つでもサボると履歴が壊れる)

## 適用条件

- リバインド・リプレイ・Undo・遅延実行・ネット同期のいずれかが要件にある(または確実に来る)
- 同じ操作を複数の発行元から起こす

## 避けるべき条件

- 上記要件が何もない → 直接メソッドを呼ぶ。`player.Jump()` は悪ではない
- 操作が状態を持たない1発もの → まず `std::function`/delegateで

## 似たパターンとの違い

- [Strategy](/design/patterns/strategy.html): 「やり方」の差し替え(通常1つ選ぶ)vs 「操作」の実体化(発行・蓄積する)
- [Memento](/design/patterns/memento.html): Undoの実現手段として競合/併用(逆操作方式=Command、状態スナップショット方式=Memento)
- [Event Queue](/game/patterns/event-queue-and-pubsub.html): 「起きたこと」(過去)を運ぶ vs Commandは「やるべきこと」(意図)を運ぶ

## 実務でよく見かける変形

- データ駆動コマンド: `{"type":"move","to":[3,4]}` のようにシリアライズ可能にしてネットワーク・リプレイに流す
- マクロコマンド: 複数コマンドを1つに合成(Composite併用)
- ターン制の「予約リスト」UI(行動選択→まとめて実行)

## 過剰設計になる例

アクションゲームで「ジャンプはJumpCommandクラス、攻撃はAttackCommand…」と全操作をクラス化したが、リプレイもリバインドも要件にない——`if (input.Pressed(...)) player.Jump();` に戻す方が読みやすい、はよくある実話です。

## 関連項目

- [Command Buffer と入力処理](/game/patterns/command-buffer-and-input.html) / [Memento](/design/patterns/memento.html)
- [ケーススタディ: プレイヤー入力](/design/case-studies/player-input.html)

## 理解度チェック

1. 操作をオブジェクト化すると可能になることを4つ挙げてください。
2. Undoの2方式(逆操作/スナップショット)の違いと使い分けは?
3. Commandを使うべきでない典型状況は?

## 演習

3×3盤面のパズルで「駒を動かす」「駒を消す」の2コマンドをUndo付きで実装し、10手進めて5手戻す動作を確認してください(検証サンプル参照)。「消した駒の復元」に必要な文脈は何かに注意。

---

関連項目：[Chain of Responsibility](/design/patterns/chain-of-responsibility.html) / [学習ガイド](/design/patterns/) / [Interpreter](/design/patterns/interpreter.html)
