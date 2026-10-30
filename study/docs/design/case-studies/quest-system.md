---
title: クエストの設計
study:
  source: C++ Wiki
  status: published
  summary: 「スライムを10体倒せ」「薬草を5個集めて村長に渡せ」——受注・進捗・達成・報酬の管理です。 クエスト30本 → OnEnemyKilled / OnItemPicked / OnNpcTalked がクエスト別ifの山に。進捗変数(killCount_)がクエストの数だけManagerに増殖
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-13-クエスト" class="study-legacy-anchor" aria-hidden="true"></div>

# クエストの設計

「スライムを10体倒せ」「薬草を5個集めて村長に渡せ」——受注・進捗・達成・報酬の管理です。

## 素朴な実装

```cpp
// C++20
class QuestManager {
public:
    void OnEnemyKilled(int enemyType) {
        if (activeQuest_ == 1 && enemyType == kSlime) {
            killCount_++;
            if (killCount_ >= 10) CompleteQuest(1);
        }
        if (activeQuest_ == 2 && /* ... クエストごとにここへ追記 */) {}
    }
private:
    int activeQuest_ = 0;
    int killCount_ = 0;
};
```

## 機能追加で破綻する過程

1. クエスト30本 → OnEnemyKilled / OnItemPicked / OnNpcTalked がクエスト別ifの山に。**進捗変数(killCount_)がクエストの数だけManagerに増殖**
2. 複数クエスト同時受注 → 単一activeQuest_では持てない
3. 複合条件「(A討伐 AND B収集) OR ボス討伐」、段階クエスト(1章→2章)→ if では書けない構造
4. セーブ対応 → 進捗がManagerのバラバラの変数で、直列化の形がない
5. 企画がクエストを追加できない

## 案A: クエスト=データ+進捗オブジェクト(定石)

```cpp
// 定義(データ: JSON/ScriptableObject/DataTable → [Type Object](../04_game_patterns/type_object_and_sandbox.md))
struct ObjectiveDef { std::string type; int targetId; int required; };  // {"kill", slime, 10}
struct QuestDef {
    int id; std::string title;
    std::vector<ObjectiveDef> objectives;    // 基本はANDのリスト(ORは後述)
    std::vector<int> rewardItemIds;
};

// 実行時の進捗(定義と分離 → セーブはこちらだけ)
struct ObjectiveProgress { int current = 0; };
struct QuestProgress {
    int questId;
    std::vector<ObjectiveProgress> objectives;
    bool IsComplete(const QuestDef& def) const;
};

// 進捗更新はゲームイベントの購読([Observer/Pub-Sub](../04_game_patterns/event_queue_and_pubsub.md))
class QuestSystem {
    void OnEvent(const GameEvent& e) {       // EnemyDied / ItemPicked / NpcTalked...
        for (auto& qp : active_)
            UpdateObjectives(qp, e);         // 定義表と突き合わせて該当カウンタを進める
    }
    std::vector<QuestProgress> active_;      // 複数同時受注が自然に表現される
};
```

- **定義(不変)と進捗(可変)の分離**が核: セーブ=進捗のみ、クエスト追加=データのみ、複数受注=進捗のvector
- ゲームロジックはイベントを発行するだけでクエストを知らない([実績システム](/design/case-studies/achievements.html)と同じ疎結合構図——実際、実績とクエストは同じ基盤に乗せられる)

## 案B: 条件ツリー案(複合条件が本当に必要なら)

「(A AND B) OR C」は[Composite](/design/patterns/composite.html)の条件ツリー(And/Or/葉)で表現([Compositeの演習](/design/patterns/composite.html)と同じ)。データ形式も入れ子になり、エディタ(ツリーUI)が欲しくなります。

- 利点: 任意の論理構造
- 欠点: データ・UI・デバッグ表示の全部が複雑化。**大半のゲームの「OR」は「別クエストに分ける」で回避できる**——ツリー導入は本当に必要か疑うべき([YAGNI](/design/foundations/yagni-kiss-dry.html))

## 案C: 段階(チェーン)はFSMで

「1章クリア→2章解放」はクエスト間の依存(前提クエストIDのリスト)で表現し、個々のクエストの状態(未受注/進行中/達成/報告済み)は小さな[FSM](/game/patterns/state-machines.html)で持つ——状態遷移(報告前に達成、など)のバグがここに集中するため、状態を明示する価値が高い場所です。

## 案D: パターンを使わない簡潔案

クエスト5本以下: `struct Quest { int id; std::function<bool()> isComplete; }` ——達成判定をラムダで直書き(ゲーム状態をポーリング)。進捗表示が「達成/未達成」だけでよいならこれで完結します。

## 継承案について

`Quest` → `KillQuest` / `CollectQuest` の継承([Template Methodの演習](/design/patterns/template-method.html)にも登場)は中規模までは働きますが、「討伐と収集の混合クエスト」で合成が必要になり、結局**目標(Objective)のリスト**(案A)に行き着きます。目標を合成単位にするのが分かれ道。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(〜5本) | 案D(ラムダ判定) |
| 中(〜50本、定型が多い) | 案A(データ+進捗分離+イベント購読)+案C(状態FSM) |
| 大(数百本・章構造・運用) | 案A+前提グラフ+エディタツール。ORが多いなら案B |
| Unity | 案AをScriptableObject+イベントチャネルで |
| UE | DataTable+Gameplay Message。大規模ならクエストエディタ自作圏 |

## この題材の教訓

- **定義と進捗の分離**は、セーブ([ケース06](/design/case-studies/save-data.html))・複数受注・データ駆動の3つを同時に解く——1つの分離が3つの要求に効く好例
- 実績・クエスト・チュートリアルは全部「ゲームイベントを購読して条件を数える」同族——**基盤を1つ作って3システムで使う**視点を持つと設計が締まる

---

関連項目：[アイテム効果](/design/case-studies/item-effects.html) / [学習ガイド](/design/case-studies/) / [イベント通知](/design/case-studies/event-notification.html)
