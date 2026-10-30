---
title: Event Queue・Message Bus・Publish/Subscribe(Observerとの比較)
study:
  source: C++ Wiki
  status: published
  summary: 「起きたことを他へ伝える」仕組みの一族です。違いはいつ届くかと誰を知っているかの2軸で整理できます。 Observerは発行者と購読者を疎結合にしますが、2つの結合が残ります。
  section: reference
  format: article
  domain: game
---

# Event Queue・Message Bus・Publish/Subscribe(Observerとの比較)

## 一言で言うと

「起きたことを他へ伝える」仕組みの一族です。違いは**いつ届くか**と**誰を知っているか**の2軸で整理できます。

| 方式 | いつ届くか | 発行者と購読者の関係 |
|---|---|---|
| [Observer](/design/patterns/observer.html) | **即時**(同期呼び出し) | 購読者が**発行者オブジェクトを知って**登録する |
| **Event Queue** | **後で**(キューに溜めて別のタイミングで処理) | キューを挟んで時間的に分離 |
| **Publish/Subscribe** | 実装による(即時も遅延もある) | **チャネル(トピック/型)**経由。互いに完全匿名 |
| **Message Bus** | 実装による | Pub/Subの実装形態。全域に1本(または数本)のバス |

## 解決したい問題

[Observer](/design/patterns/observer.html)は発行者と購読者を疎結合にしますが、2つの結合が残ります。

1. **時間的結合**: 通知は同期呼び出し。発行の瞬間に全購読者の処理が走る(重い購読者がフレームを食う/通知の連鎖が絡まる)
2. **参照結合**: 購読者は発行者オブジェクトへの参照が必要(`enemy.OnDied += ...` — どの敵? いつ手に入れる?)

## Event Queue: 時間的結合を切る

```cpp
// C++20 — イベントを溜めて、フレームの決まった場所でまとめて処理
#include <queue>
#include <variant>

struct EnemyDied { int enemyId; int score; };
struct ItemPicked { int itemId; };
using Event = std::variant<EnemyDied, ItemPicked>;

class EventQueue {
public:
    void Push(Event e) { queue_.push(std::move(e)); }   // 発行は積むだけ(軽い)
    template <class Handler>
    void DrainAll(Handler&& handle) {                    // フレーム内の決まった場所で処理
        while (!queue_.empty()) {
            handle(queue_.front());
            queue_.pop();
        }
    }
private:
    std::queue<Event> queue_;
};
```

検証済みサンプル: <a href="/study/samples/cpp/event_queue.cpp">samples/event_queue.cpp</a>

### Observer と Event Queue の比較(重要)

| | Observer(即時) | Event Queue(遅延) |
|---|---|---|
| 処理タイミング | 発行の瞬間(コールスタック上) | 自分の決めた場所(例: Update後) |
| 通知の連鎖 | 深く絡まりうる(A→B→C→A?) | 次フレームに平坦化される |
| 発行側の負荷 | 購読者全員分の処理を背負う | Pushのみ(一定) |
| 即時性 | その場で反映 | 1フレーム遅れうる(**UIなら大抵無害、当たり判定なら致命的**) |
| 集約・間引き | 不可 | 可能(同種イベントをまとめる: 同フレームの被弾SE 10件→1件) |
| デバッグ | スタックトレースで発行元が分かる | キュー経由で発行元が消える(イベントに発行元情報を積む必要) |
| 状態の鮮度 | 発行時の状態がそのまま見える | 処理時には状態が変わっているかも(**イベントに必要な値を全部積む**のが鉄則) |

**サウンドリクエスト**が古典的な適用例です(Game Programming Patterns): 再生要求をキューに溜め、オーディオスレッド/フレーム末尾で重複除去してから再生。

## Publish/Subscribe: 参照結合を切る

```cpp
// C++20 — 型をチャネルとするイベントバス(即時配送版)
#include <functional>
#include <typeindex>
#include <unordered_map>
#include <vector>

class EventBus {
public:
    template <class E>
    void Subscribe(std::function<void(const E&)> handler) {
        handlers_[typeid(E)].push_back([h = std::move(handler)](const void* e) {
            h(*static_cast<const E*>(e));
        });
    }
    template <class E>
    void Publish(const E& e) {
        auto it = handlers_.find(typeid(E));
        if (it == handlers_.end()) return;
        for (auto& h : it->second) h(&e);
    }
private:
    std::unordered_map<std::type_index, std::vector<std::function<void(const void*)>>> handlers_;
};
// 発行者: bus.Publish(EnemyDied{id, 100});  — 誰が聞いているか知らない
// 購読者: bus.Subscribe<EnemyDied>([](auto& e){ ... });  — 誰が発行するか知らない
```

検証済みサンプル: <a href="/study/samples/cpp/event_bus.cpp">samples/event_bus.cpp</a>

### Observer と Pub/Sub の比較

| | Observer | Pub/Sub(バス経由) |
|---|---|---|
| 購読先 | 特定のオブジェクト(このenemyの死) | イベント型/トピック(すべてのEnemyDied) |
| 発行者への参照 | 必要 | 不要(バスだけ知る) |
| 粒度 | 個体単位で細かい | 型単位で粗い(個体filtering は購読側で) |
| 追跡性 | 参照を辿れる | **最悪**(発行と購読が全域に分散し、「なぜ起きた」が追えない) |
| 向く用途 | 局所の連携(UI部品→画面) | システム間の横断通知(実績、アナリティクス、クエスト) |

## Message Bus

Pub/Subを**プロジェクト全域の1本のバス**として運用する形。強力ですが、乱用すると「すべてがバス経由で、制御フローが誰にも分からないプロジェクト」になります。運用ルール(バスに流してよいのは「起きた事実」だけ/コマンドは流さない/ドメインごとにバスを分ける)とセットで導入するべきものです。

## Unity/C# との対応

- Observer = C# `event` / `UnityEvent`
- Event Queue = 自作が普通(UnityにはSendMessageがあるが低速で非推奨)。入力の`InputSystem`はイベントキュー内蔵
- Pub/Sub = MessagePipe等のライブラリ、ScriptableObjectイベントチャネル(アセットをバスにする定石)
- UniRx/R3も購読の一形態(→ [Reactive](/game/patterns/reactive-and-message-bus.html))

## Unreal Engine との対応

- Observer = Delegate / Multicast Delegate(→ [DelegateとInterface](/game/unreal/delegates-and-interfaces.html))
- Pub/Sub = Gameplay Message Subsystem(UE5、チャネル文字列ベース)
- 入力・アニメ通知(AnimNotify)はイベントキュー的に配送される

## 使う場面 / 使わない場面

- **Observer**: 参照が自然に手に入る局所の連携。即時性が必要な場合
- **Event Queue**: 発行タイミングと処理タイミングを分離したい(サウンド、スポーン予約、フレーム跨ぎ)。同種イベントの集約・間引きをしたい
- **Pub/Sub**: 発行者と購読者が互いを知り得ない遠いシステム間(ゲームプレイ→実績/アナリティクス)
- **使わない場面**: 順序・因果が重要な処理(ダメージ→死亡→ドロップの厳密なパイプライン)をイベントに分解しない。1フレームの遅延が許されない判定系。呼び出し1本で済む隣接クラス間

## よくある誤解

- 「イベント駆動にすれば疎結合で良い設計」— 結合は消えず**見えなくなる**だけ。見える結合(直接呼び出し)の方が保守しやすい場面は多い
- 「Pub/SubとObserverは同じもの」— 参照結合の有無という決定的な違いがある(上の比較表)

## 関連項目

- [Observer](/design/patterns/observer.html) / [Mediator](/design/patterns/mediator.html)
- [ケーススタディ: イベント通知](/design/case-studies/event-notification.html) / [UI通知](/design/case-studies/ui-notification.html)

## 理解度チェック

1. Event QueueがObserverから切り離す「結合」は何ですか。Pub/Subは?
2. 「イベントに必要な値を全部積む」べき理由は?(遅延配送との関係で)
3. バスに「コマンド(〜せよ)」を流すべきでないとされる理由を考えてください。

## 演習

samples/event_queue.cpp を拡張し、同一フレームに積まれた `PlaySeRequest` の重複(同じSE ID)を1件にまとめる処理を追加してください。「集約は即時配送(Observer)では原理的にできない」ことを確認するのが狙いです。

---

関連項目：[Component と ECS](/game/patterns/component-and-ecs.html) | [この分野の学習ガイド](/game/patterns/) | [Service Locator と DI](/game/patterns/service-locator-and-di.html)
