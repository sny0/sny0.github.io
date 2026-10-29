---
title: "Memento"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "オブジェクトの内部状態を、カプセル化を壊さずに外部へ保存し、後で復元したい(Undo、セーブ、チェックポイント、リトライ)。状態の中身は本人だけが知り、保管者は中身を見ない。"
---

# Memento

## 解決する問題

オブジェクトの内部状態を、**カプセル化を壊さずに**外部へ保存し、後で復元したい(Undo、セーブ、チェックポイント、リトライ)。状態の中身は本人だけが知り、保管者は中身を見ない。

## 登場人物と責務

- **Originator**: 状態の持ち主。スナップショット(Memento)の作成と復元ができる唯一の存在
- **Memento**: 状態のスナップショット。外部からは不透明(opaque)な箱
- **Caretaker**: Mementoを保管・管理する(履歴スタック、セーブスロット)。中身には触らない

## 最小構成図

```
[Player(Originator)] ──CreateSnapshot()──> [Memento(不透明)] ──保管──> [History(Caretaker)]
[Player] <──Restore(memento)────────────────────────────────────┘
Caretakerは中身を知らない。知るのはOriginatorだけ
```

## パターンなしの実装

```cpp
// C++20(問題例)— 復元のために内部を全公開
class Player {
public:
    int hp;              // Undoシステムから書き戻せるように全部public
    float x, y;
    std::vector<int> items;
};
void SaveCheckpoint(const Player& p) { g_savedHp = p.hp; g_savedX = p.x; /* ... */ }
// 保存側がPlayerの全フィールドを知る=フィールド追加のたびに保存側も修正(そして忘れる)
```

## 問題点

- 復元のために[情報隠蔽](/design/foundations/abstraction-encapsulation.html)を放棄している
- 状態の項目追加のたびに、保存側・復元側の**両方**を修正(片方忘れると「復元したのに一部だけ古い」バグ)
- 保存内容の整合性(HPとバフの対応など)を外部が保証することになる

## パターン適用後のC++コード

```cpp
// C++20
#include <vector>

class Player {
public:
    // Memento: 中身はPlayerだけが知る(ネストクラス+privateメンバ)
    class Snapshot {
    private:
        friend class Player;              // Playerだけが読み書きできる
        int hp = 0;
        float x = 0, y = 0;
        std::vector<int> items;
    };

    Snapshot CreateSnapshot() const {
        Snapshot s;
        s.hp = hp_; s.x = x_; s.y = y_; s.items = items_;
        return s;
    }
    void Restore(const Snapshot& s) {
        hp_ = s.hp; x_ = s.x; y_ = s.y; items_ = s.items;
    }
    // 通常のゲームプレイ用インターフェース(TakeDamage等)は省略
private:
    int hp_ = 100;
    float x_ = 0, y_ = 0;
    std::vector<int> items_;
};

// Caretaker: 中身に触れない(触れようとするとコンパイルエラー)
class CheckpointStore {
public:
    void Push(Player::Snapshot s) { history_.push_back(std::move(s)); }
    Player::Snapshot PopLast() {
        auto s = std::move(history_.back());
        history_.pop_back();
        return s;
    }
private:
    std::vector<Player::Snapshot> history_;
};
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_memento.cpp">samples/pattern_memento.cpp</a>

状態項目を追加するとき、触るのは `Player` と `Snapshot` だけ。**保存の知識が持ち主に閉じる**のが本質です。

## C#またはUnityでの実装

```csharp
[System.Serializable]
public struct PlayerSnapshot {   // C#では不透明性よりシリアライズ互換を優先しがち
    public int hp;
    public Vector2 pos;
    public List<int> items;
}

public class Player : MonoBehaviour {
    private int hp; private List<int> items = new();
    public PlayerSnapshot CreateSnapshot() =>
        new() { hp = hp, pos = transform.position, items = new List<int>(items) };  // 深いコピーに注意
    public void Restore(in PlayerSnapshot s) {
        hp = s.hp; transform.position = s.pos; items = new List<int>(s.items);
    }
}
```

セーブデータ化するなら `JsonUtility` 等でSnapshotを直列化——**Mementoはセーブシステムの中核構造**になります(→ [ケーススタディ: セーブデータ](/design/case-studies/save-data.html))。

## 実装の急所: コピーの深さ

Snapshotに参照(ポインタ、List参照)をそのまま入れると、**スナップショット後の変更が過去に波及**します(浅いコピー問題)。値としての完全な複製(深いコピー)が必要です(→ [コピー](/languages/cpp/ctor-dtor-copy-move.html)、[所有権](/runtime/memory/ownership-and-borrowing.html))。大きな状態の毎フレーム保存はメモリを食うため、差分保存や[Command](/design/patterns/command.html)の逆操作方式との比較が実務の判断点です。

## ゲームでの具体例

- チェックポイント・リトライ(死亡時に部屋入場時点へ復元)
- パズル・エディタのUndo(Command逆操作方式との併用・比較)
- 格闘ゲームのロールバックネットコード(毎フレームのスナップショット+巻き戻し再計算 — Mementoの超高速版)
- 「セーブ&ロード」自体

## 利点

- カプセル化を保ったまま保存・復元できる(保存側は中身を知らない)
- 状態項目の追加が持ち主のクラスに閉じる
- 「確実に元に戻る」保証がロジックの逆算(逆操作)より単純

## 欠点

- メモリコスト: 状態が大きい・頻度が高いと深刻(ロールバック格ゲーは1フレームごとに全ゲーム状態を保存する — 状態を小さく設計する圧力になる)
- 深いコピーの実装・維持コスト
- 何を「状態」に含めるかの選定が難しい(演出・キャッシュは含めない、乱数シードは含める、など)

## 適用条件

- 「元に戻す」「その時点から再開」が要件(Undo、リトライ、セーブ)
- 状態の範囲が明確に切り出せる

## 避けるべき条件

- 状態が巨大で保存頻度が高く、差分・逆操作で済む → [Command](/design/patterns/command.html)のUndo方式
- 復元が「近似でよい」(死亡時にHPだけ戻せばよい)→ 全スナップショットは過剰

## 似たパターンとの違い

- [Command](/design/patterns/command.html): Undoの2大方式。Command=逆操作(省メモリ・実装が操作ごと)、Memento=スナップショット(実装単純・メモリ食い)。ハイブリッド(N手ごとにスナップショット+間はコマンド)が実務でよく使われる
- [Prototype](/design/patterns/prototype.html): 複製の目的が「新しい個体」か「過去の自分の復元」か

## 実務でよく見かける変形

- シリアライズ統合: SnapshotがそのままセーブデータのDTO(データ転送オブジェクト)を兼ねる
- リングバッファ保管(直近N個だけ保持)

## 過剰設計になる例

「HPだけ戻す」リトライ仕様に全状態スナップショット基盤を構築する——`int savedHp` で済むものは、それでよいのです。

## 関連項目

- [Command](/design/patterns/command.html) / [Prototype](/design/patterns/prototype.html)
- [ケーススタディ: セーブデータ](/design/case-studies/save-data.html)

## 理解度チェック

1. Mementoが守る設計上の性質(パターンなし版で失われていたもの)は何ですか。
2. CommandのUndoとMementoのUndoの使い分けは?
3. スナップショットの「浅いコピー問題」とは何ですか。

## 演習

グリッド上のユニット配置(位置と向き)を編集するミニエディタを想定し、(a) 全体スナップショット方式、(b) 逆操作コマンド方式のUndoを実装・比較してください(サンプルに(a)の骨格)。ユニット1000体・100手のUndo履歴でのメモリ量を両方式で見積もること。

---

前: [Mediator](/design/patterns/mediator.html) | [カテゴリ目次](/design/patterns/) | 次: [Observer](/design/patterns/observer.html)
