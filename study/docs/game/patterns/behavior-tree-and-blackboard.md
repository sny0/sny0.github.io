---
title: Behavior Tree と Blackboard
study:
  source: C++ Wiki
  status: published
  summary: Behavior TreeはAIの行動選択を条件と優先度の木で表す。毎Tick評価する単純な実装と、UEのようなイベント駆動の再評価を区別し、Blackboardで知識を受け渡す。
  section: reference
  format: article
  domain: game
---

# Behavior Tree と Blackboard

## 一言で言うと

- **Behavior Tree(BT、行動ツリー)**: AIの行動選択を条件と優先度の木で表す。以下の単純な実装では毎Tick根から評価し、UEのような実装では関連する変化を受けてイベント駆動で再評価する
- **Blackboard(黒板)**: AIが使うデータ(標的、目的地、警戒度)を**1つの共有メモ帳**に集め、ノード間・システム間で受け渡すパターン。BTとセットで使われることが多い

## 解決したい問題(FSMの限界)

FSMは「今の状態」から書きますが、AIの仕様は大抵**優先度**で書かれます:「HPが低ければ逃げる。さもなくば敵が見えれば攻撃。さもなくば巡回」。FSMでこれをやると、**全状態から全状態への遷移**が必要になり(逃げるへは全状態から行ける…)、遷移の網が絡まります。

## Behavior Tree の構造

```
                    [Selector(優先度順に試す。成功したら止まる)]
                      │
     ┌────────────────┼──────────────────┐
 [Sequence]        [Sequence]         [Patrol(Action)]
  逃げる系          攻撃系             (最後の砦: 必ず成功)
  │                 │
  ├[HP<30%?]        ├[敵が見える?]     ← Condition(判定)
  └[逃げる]         ├[近づく]          ← Action(実行)
                    └[攻撃]
```

- **Selector(選択)**: 子を順に試し、最初に成功(または実行中)の子を採用 = **優先度**
- **Sequence(逐次)**: 子を順に全部実行。1つ失敗したら失敗 = **手順**
- **Action/Condition(葉)**: 実際の行動・判定。戻り値は Success / Failure / **Running**(実行中: 複数フレームかかる行動の表現)

以下の単純な実装は、毎Tick根から評価し直します。巡回中にHPが下がると、次のTickで優先度の高い「逃げる」を選べます。これはBTの一つの実行方式です。UEのBTは不要な全木走査を避けるイベント駆動型で、Blackboardの変化やDecoratorのObserver Aborts設定などを使って再評価・中断します。[UEのBTとイベント駆動](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview)

```cpp
// C++20 — 最小のBT
#include <memory>
#include <vector>

enum class BtStatus { Success, Failure, Running };

class BtNode {
public:
    virtual ~BtNode() = default;
    virtual BtStatus Tick(class Blackboard& bb) = 0;
};

class Selector : public BtNode {
public:
    void Add(std::unique_ptr<BtNode> c) { children_.push_back(std::move(c)); }
    BtStatus Tick(Blackboard& bb) override {
        for (auto& c : children_) {
            BtStatus s = c->Tick(bb);
            if (s != BtStatus::Failure) return s;   // 成功/Runningの子で確定
        }
        return BtStatus::Failure;
    }
private:
    std::vector<std::unique_ptr<BtNode>> children_;
};

class Sequence : public BtNode {
public:
    void Add(std::unique_ptr<BtNode> c) { children_.push_back(std::move(c)); }
    BtStatus Tick(Blackboard& bb) override {
        for (auto& c : children_) {
            BtStatus s = c->Tick(bb);
            if (s != BtStatus::Success) return s;   // 失敗/Runningで中断
        }
        return BtStatus::Success;
    }
private:
    std::vector<std::unique_ptr<BtNode>> children_;
};
```

検証済みサンプル: <a href="/study/samples/cpp/behavior_tree.cpp">samples/behavior_tree.cpp</a>([Composite](/design/patterns/composite.html)構造そのもの)

## Blackboard

```cpp
// C++20 — 型消去を避けた最小形(実務ではキーごとに型付きアクセサを持たせる)
struct Blackboard {
    // AIの知識をここに集約。ノードは黒板とだけ話す
    float selfHp = 100;
    bool canSeePlayer = false;
    Vec2 lastSeenPos{};
    int targetId = -1;
};
```

- **ノード同士が直接通信しない**(黒板経由)ため、ノードの再利用性が上がる(「近づく」ノードは `targetId` さえあれば誰のBTでも動く)
- センサー系(視界判定)が黒板に**書き**、行動系が**読む**、という分業ができる
- 代償: 黒板は**型のないグローバル変数の束**になりがち。キーのタイポ・型違い・「誰が書いたか分からない」問題(実務ではキー定義の一元化とデバッグ表示が必須)

## FSM vs BT の使い分け

| | FSM | Behavior Tree |
|---|---|---|
| 得意 | 排他的な状態と明示的遷移(キャラの動作、画面) | 優先度つき行動選択(AIの意思決定) |
| 割り込み | 遷移を書いた分だけ | 優先度と再評価・中断規則による(毎Tick評価やイベント駆動など) |
| 状態の記憶 | 自然(今の状態が明確) | 苦手(Runningの管理・「さっき何してた」はBlackboardに置く) |
| 規模の伸び | 遷移が絡まる | ツリーの深さで管理可能 |

実務では併用が普通: **意思決定はBT、実行中の動作(ジャンプ・攻撃モーション)はFSM/アニメステートマシン**。

## Unity/C# との対応

- GameObjectの基本機能とは別に、Unity Behavior(公式パッケージ)、外部アセット、または自作を使う。採用時は必要機能とパッケージ版を確認します。
- 2025年2月10日、Behaviorの開発チームは人員整理に伴い従来の支援を続けられなくなると告知しました。同年4月10日、UnityはUnity 6向けパッケージのサポートを継続し、不具合の修正と安定性の向上に注力すると説明しました。2026年5月1日にもUnityは、保守と安定性を優先する方針を示しました。[2025年2月の告知](https://discussions.unity.com/t/an-update-on-behavior/1598451) · [2025年4月のサポート方針](https://discussions.unity.com/t/an-update-on-behavior/1598451?page=8) · [2026年5月の更新](https://discussions.unity.com/t/update-on-behavior-package-support-and-team-presence/1718517)
- ScriptableObjectでノードをアセット化すると、企画がツリーをエディタで組める

## Unreal Engine との対応

- **Behavior Tree + Blackboard は標準搭載**(BTノードをBPで拡張、BlackboardアセットでキーをGUI定義、デバッガ付き)。AI Perceptionの結果は自動でBlackboardへ入るわけではありません。`OnTargetPerceptionUpdated`などを受けたAIControllerやServiceでキーを更新し、BTがその値を使うように配線します。[AI Perceptionの更新イベント](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine)
- UE5では[StateTree](/game/patterns/state-machines.html)という代替も登場(FSM+BTのハイブリッド)

## 使う場面 / 使わない場面

- **使う場面**: 優先度・条件の組み合わせが多い敵AI・NPC。仕様が「〜なら〜する。さもなくば〜」形式で書かれるもの。企画がAIを調整するワークフロー
- **使わない場面**: 行動が2〜3個の単純な敵(FSMかswitchで十分——雑魚全員にBTは過剰)。1フレームも無駄にできない大量AI(毎フレーム根から評価は数百体で重くなる。イベント駆動化・評価間引きが必要)。厳密な状態管理が主で優先度割り込みがない場合(FSM向き)

## よくある誤解

- 状態を記憶し、遷移を明示する処理にはFSMの方が向いている。BTとFSMは、扱う問題に合わせて選ぶ。
- 「Blackboardは何でも置いていい場所」— グローバル変数の束と同じ危険を持つ。書き込み責任(どのセンサーがどのキーを書くか)を決めて運用する

## 関連項目

- [ゲームAIの意思決定](/game/ai-decision-making.html)
- [ステートマシン(FSM/HSM)](/game/patterns/state-machines.html) / [Composite](/design/patterns/composite.html)
- [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html)
- [経路探索 — A* とナビメッシュ](/algorithms/pathfinding.html) — 移動タスクが使う経路を求める

## 理解度チェック

1. 毎Tick評価するBTと、イベント駆動のBTでは、再評価と割り込みをいつ起こしますか。
2. Runningステータスは何のためにありますか。
3. Blackboardの利点と、それがもたらす危険は表裏一体です。説明してください。

## 演習

samples/behavior_tree.cpp に「HPが30%未満なら逃げる(最優先)」の枝を追加し、巡回中にHPを下げると次のTickで逃げ始めることを確認してください。同じ仕様をFSM(samples/fsm_guard.cpp)に足す場合に必要な遷移の本数を数えて比較してください。

---

関連項目：[ステートマシン(FSM/HSM)](/game/patterns/state-machines.html) | [この分野の学習ガイド](/game/patterns/) | [Command Buffer と入力処理](/game/patterns/command-buffer-and-input.html)
