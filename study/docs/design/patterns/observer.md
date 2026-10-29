---
title: "Observer"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "「Aで起きたことに、B・C・Dが反応したい。しかしAはB・C・Dを知りたくない」。変化の発生源と反応する側を疎結合にする、ゲーム開発で最重要のパターンです。C#の event はこのパターンの言語機能化です。"
---

# Observer

## 解決する問題

「Aで起きたことに、B・C・Dが反応したい。しかしAはB・C・Dを知りたくない」。変化の**発生源**と**反応する側**を疎結合にする、ゲーム開発で最重要のパターンです。C#の `event` はこのパターンの言語機能化です。

## 登場人物と責務

- **Subject(発行者)**: 状態変化を持つ側。Observerのリストを保持し、変化時に全員へ通知
- **Observer(購読者)**: 通知を受けるインターフェース。登録・解除で購読を管理

## 最小構成図

```
[PlayerHealth(Subject)] ──OnDamaged通知──> [HPバーUI]
        │                                  [画面振動]
        └── observerリスト ───────────────> [実績システム]
発行者は「誰が聞いているか」を知らない(リストとして持つだけ)
```

## パターンなしの実装

```cpp
// C++20(問題例)— 発生源が反応者を全部知っている
class PlayerHealth {
public:
    void TakeDamage(int amount) {
        hp_ -= amount;
        hpBar_->SetRatio(hp_ / 100.0f);          // UI
        cameraShake_->Play(0.3f);                 // 演出
        achievements_->NotifyDamageTaken(amount); // 実績
        // 反応者が増えるたびここに追記。PlayerHealthがUI・演出・実績に依存
    }
private:
    int hp_ = 100;
    HpBar* hpBar_; CameraShake* cameraShake_; Achievements* achievements_;
};
```

## 問題点

- 中核(HP)が末端(UI・演出・実績)に依存し、[依存の方向](/design/foundations/dependency.html)が逆。UIなしでテスト不能
- 反応の追加・削除のたびに PlayerHealth を修正([OCP](/design/solid/ocp.html))
- 「メニュー画面ではUIだけ反応」のような構成変更ができない

## パターン適用後のC++コード

```cpp
// C++20 — C++にeventはないので、std::functionのリストで実装するのが現代の定番
#include <functional>
#include <vector>

class PlayerHealth {
public:
    using Listener = std::function<void(int newHp, int damage)>;

    // 戻り値のIDで解除できるようにする(解除を作らないと必ず後悔する)
    int Subscribe(Listener l) {
        listeners_.push_back({nextId_, std::move(l)});
        return nextId_++;
    }
    void Unsubscribe(int id) {
        std::erase_if(listeners_, [id](const auto& e) { return e.first == id; });
    }

    void TakeDamage(int amount) {
        hp_ -= amount;
        for (auto& [id, l] : listeners_) l(hp_, amount);   // 通知するだけ
    }
private:
    int hp_ = 100;
    int nextId_ = 0;
    std::vector<std::pair<int, Listener>> listeners_;
};

// 配線(起動時などに1か所で):
// health.Subscribe([&bar](int hp, int) { bar.SetRatio(hp / 100.0f); });
// health.Subscribe([&shake](int, int dmg) { if (dmg > 0) shake.Play(0.3f); });
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_observer.cpp">samples/pattern_observer.cpp</a>

GoF原典のインターフェース版(`IObserver` を継承して `OnNotify` を実装)も同じ構造です。C++20では用途がなければラムダ版の方が短く柔軟です。

## C#またはUnityでの実装

```csharp
public class PlayerHealth : MonoBehaviour {
    public event System.Action<int, int> Damaged;   // C#のeventはObserverの言語内蔵版
    private int hp = 100;
    public void TakeDamage(int amount) {
        hp -= amount;
        Damaged?.Invoke(hp, amount);
    }
}

public class HpBarView : MonoBehaviour {
    [SerializeField] private PlayerHealth health;
    private void OnEnable()  => health.Damaged += OnDamaged;
    private void OnDisable() => health.Damaged -= OnDamaged;   // 解除を対で書くのが鉄則
    private void OnDamaged(int hp, int damage) { /* バー更新 */ }
}
```

`UnityEvent` はインスペクタで配線できるObserver(遅い・シリアライズされる・非プログラマが繋げる)。C# `event` はコードで配線(速い・追跡しやすい)。使い分けはチーム方針で(→ [Observerとevent](/languages/csharp/delegates-events-function-pointers.html))。

## 落とし穴(このパターン最大の実務知識)

1. **解除忘れ(lapsed listener)**: 破棄されたUIがまだ購読リストにいる → C++ではdangling(未定義動作 → [メモリバグ](/runtime/memory/memory-bugs.html))、C#ではリークと `MissingReferenceException`。**購読は必ず解除とペアで設計する**(OnEnable/OnDisable、RAIIの購読トークン)。
2. **通知中のリスト変更**: 通知に反応して購読/解除されるとイテレータ破壊。コピーして走査、または遅延反映で守る。
3. **通知の連鎖と順序**: 通知が通知を呼ぶと、実行順が予測不能になり「たまに起きる」バグ化する。深い連鎖が必要なら[Event Queue](/game/patterns/event-queue-and-pubsub.html)(遅延配送)へ。
4. **重い処理を購読者に書く**: 通知は同期呼び出し。発行側のフレームを購読者が食う。

## ゲームでの具体例

- HP・スコア・所持金の変化 → UI反映(最頻出)
- 敵死亡 → ドロップ、実績、クエスト進行、スコア(→ [ケーススタディ: イベント通知](/design/case-studies/event-notification.html))
- 実績システム: ほぼObserverの塊(あらゆるゲームイベントを購読)

## 利点

- 発生源が反応者に依存しない(依存の向きが逆転し、中核が安定)
- 反応の追加・削除が発生源に無変更([OCP](/design/solid/ocp.html))
- 実行時に購読構成を変えられる(画面ごとの配線)

## 欠点

- **制御フローが追えなくなる**: 「TakeDamageすると何が起きるか」がコードを読んでも分からない(購読箇所の全検索が必要)。乱用するとプロジェクト全体がイベントスパゲッティ化
- 寿命管理の複雑さ(解除忘れ)
- 同期通知のコストとタイミング問題(上の落とし穴)

## 適用条件

- 反応者が複数、または増減する
- 発生源を反応者から独立させたい(テスト・再利用・层の分離)

## 避けるべき条件

- 反応者が1つで固定 → 直接呼び出しかコールバック1本で十分
- 発生と反応の順序・トランザクション性が重要(ダメージ→死亡判定→ドロップの厳密な順序)→ 明示的な手続きで書く方が安全
- フレームをまたぐ配送・大量イベントの集約が必要 → [Event Queue](/game/patterns/event-queue-and-pubsub.html)

## 似たパターンとの違い

- [Event Queue / Pub-Sub](/game/patterns/event-queue-and-pubsub.html): Observerは**同期・直接購読**(発行者オブジェクトを知って登録)。Queueは**遅延**、Pub/Subは**チャネル経由で相互に匿名**。詳細比較は第4部で
- [Mediator](/design/patterns/mediator.html): 調整ロジックの中央集権。ObserverはMediatorへの通知手段として併用される

## 実務でよく見かける変形

- 購読トークン(RAII): 戻り値のオブジェクト破棄で自動解除(C++で解除忘れを型で防ぐ)
- 型付きイベントバス、ScriptableObjectイベント(Unityのアセット経由配線)

## 過剰設計になる例

同一クラス内の処理をわざわざイベント経由にする(`OnJumpStarted` を自分で発行して自分で購読)——関数呼び出しでよいものをイベントにすると、追跡コストだけが増えます。

## 関連項目

- [Event Queue・Message Bus・Pub/Sub](/game/patterns/event-queue-and-pubsub.html)(比較の詳細)
- [関数ポインタとdelegate](/languages/csharp/delegates-events-function-pointers.html)
- [ケーススタディ: UI通知](/design/case-studies/ui-notification.html) / [イベント通知](/design/case-studies/event-notification.html)

## 理解度チェック

1. Observerが逆転させる「依存の向き」を、HPバーの例で説明できますか。
2. 解除忘れがC++とC#でそれぞれ何を引き起こしますか。
3. Observerではなく直接呼び出しにすべき状況を2つ挙げてください。

## 演習

検証サンプルを拡張し、「通知中に自分を解除する購読者」を追加してクラッシュ(または安全に動くこと)を確認してください。安全でなければ、コピー走査方式に修正してください。

---

前: [Memento](/design/patterns/memento.html) | [カテゴリ目次](/design/patterns/) | 次: [State](/design/patterns/state.html)
