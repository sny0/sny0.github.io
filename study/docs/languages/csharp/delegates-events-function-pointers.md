---
title: 関数ポインタと delegate / Observer と event
study:
  source: C++ Wiki
  status: published
  summary: 言語機能の詳細はラムダ式・関数ポインタ・std::function、設計面はObserverで説明済み。ここでは対応関係を整理します。 C#のdelegateは多機能な統合パッケージです。C++では機能ごとに別の道具に分かれます。
  section: reference
  format: article
  domain: languages
---

# 関数ポインタと delegate / Observer と event

言語機能の詳細は[ラムダ式・関数ポインタ・std::function](/languages/cpp/lambdas-and-functions.html)、設計面は[Observer](/design/patterns/observer.html)で説明済み。ここでは対応関係を整理します。

## 対応表: 「delegateの機能」はC++では分業される

C#のdelegateは多機能な統合パッケージです。C++では機能ごとに別の道具に分かれます。

| delegateの機能 | C++の対応物 |
|---|---|
| 関数を変数に入れる | 関数ポインタ(状態なし)/ ラムダ |
| インスタンスメソッド+thisを束ねる | ラムダのキャプチャ `[this]{ ... }` / `std::bind_front` |
| 型として宣言(`Action<int>`) | `std::function<void(int)>` |
| マルチキャスト(`+=`で複数登録) | **言語サポートなし** → `vector<std::function>` を自作([Observer](/design/patterns/observer.html)) |
| `-=` で解除 | 自作(ID/トークン方式。**ラムダは==比較できない**ため、C#式の-=は再現不能) |
| GCによる寿命安全 | **なし** → 参照キャプチャ・thisキャプチャの寿命は自分で保証 |

```csharp
// C#: 1つの機構で全部済む
public event Action<int> Damaged;
Damaged += OnDamaged;      // 登録
Damaged -= OnDamaged;      // 解除(メソッドグループが==比較できるから可能)
Damaged?.Invoke(10);
```

```cpp
// C++20: 分業した道具を組み合わせる（単一スレッドの説明用）
#include <algorithm>
#include <functional>
#include <utility>
#include <vector>

class Health {
public:
    using Handler = std::function<void(int)>;
    int Subscribe(Handler h) { handlers_.emplace_back(nextId_, std::move(h)); return nextId_++; }
    void Unsubscribe(int id) { std::erase_if(handlers_, [id](auto& p){ return p.first == id; }); }
    void TakeDamage(int dmg) { Notify(dmg); } // 公開するドメイン操作の例
private:
    void Notify(int dmg) {
        const auto current = handlers_; // 呼び出し前にリストをコピー
        for (const auto& entry : current) entry.second(dmg);
    }
    std::vector<std::pair<int, Handler>> handlers_;
    int nextId_ = 0;
};
```

直接`handlers_`を走査すると、コールバック内の登録・解除によって`vector`のイテレーターが無効になります。この例は通知開始時のスナップショットを走査し、追加・解除を次の通知から反映します。解除済みでも今回のコピーに残る関数は呼ばれ得るため、対象をその場で破棄する設計では`weak_ptr`で生存を確認するなどの対策が必要です。コピーによる確保の可能性があり、スレッド間の同期も提供しません。[C++草案: vectorの無効化](https://eel.is/c++draft/vector.modifiers)

## eventキーワードに相当するもの

C#の `event` は「クラス外からは += / -= しかできない」(Invokeと=を封じる)というアクセス制御。C++で同等の設計をするなら「Subscribe/Unsubscribeだけをpublicにし、通知リストとNotifyをprivateに」——**言語機能ではなく設計で表現**します(上の例がそうなっている)。

## 寿命問題: C#が隠していた最大の差分

- C#: delegateが対象インスタンスを**GC参照で延命**する。「購読したままオブジェクトが消える」と、消えずに残り続ける(リーク方向の事故。UnityのMissingReference例外はエンジン破棄との齟齬)
- C++: `[this]` キャプチャは**延命しない**(ただの借用)。thisが先に死ねば呼び出しは[UAF](/runtime/memory/memory-bugs.html)(未定義動作)
- 対策の定石: **購読トークンのRAII化**(トークン破棄=自動Unsubscribe。メンバに持てば寿命と購読が連動)/ weak_ptr捕捉+lock確認

```cpp
// Healthは、対応する全トークンより長生きするという前提
class Subscription {
public:
    Subscription(Health& h, int id) : h_(&h), id_(id) {}
    ~Subscription() { Reset(); }
    Subscription(const Subscription&) = delete;
    Subscription& operator=(const Subscription&) = delete;
    Subscription(Subscription&& other) noexcept
        : h_(std::exchange(other.h_, nullptr)), id_(other.id_) {}
    Subscription& operator=(Subscription&& other) noexcept {
        if (this != &other) {
            Reset();
            h_ = std::exchange(other.h_, nullptr);
            id_ = other.id_;
        }
        return *this;
    }
    void Reset() noexcept {
        if (auto* h = std::exchange(h_, nullptr)) h->Unsubscribe(id_);
    }
private:
    Health* h_; int id_;
};
// UI部品がメンバに Subscription を持てば、部品の破棄と同時に購読も消える
```

このトークンが保証するのは、発行元が生存している間の自動解除です。発行元が先に消える場合は、購読状態を共有しトークン側から弱参照で調べる設計などが必要です。すでに始まった通知やスナップショット内の呼び出しを取り消す保証とも区別します。

## C#の関数ポインタはdelegateと別の機能

C# 9以降は`unsafe`なコードで`delegate*<int, void>`などの関数ポインタも使えます。delegateのような対象インスタンスの保持やマルチキャストはなく、相互運用の呼出規約・対象の寿命を自分で管理する低水準の機能です。通常のイベントにはdelegate/eventを使い、ネイティブ境界など必要な場面で区別します。[Microsoft: 関数ポインタ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/unsafe-code#function-pointers)

## UnityEventとの対応

| UnityEvent | C++での近似 |
|---|---|
| インスペクタで配線 | 対応物なし(データ駆動の配線を自作するか、UEのBlueprint/Delegateへ → [UEの Delegate と Interface](/game/unreal/delegates-and-interfaces.html)) |
| SerializeされたPersistentCall | 文字列/IDベースの自作イベントテーブル |
| 動的呼び出し(遅い) | std::functionのリスト(比較にならないほど速い) |

## Unity開発者が誤解しやすい点

1. 「+=/-=が言語にあるはず」— C++にはない。**解除の仕組みを最初に設計する**(トークン・ID)のがC++流
2. 「イベントに登録すれば相手は生き続ける」— C++は逆(延命しない)。寿命はイベントと独立に設計
3. ラムダのGC Allocを恐れる癖 — C++のラムダはスタック上の値。恐れるべきはAllocではなく**参照キャプチャの寿命**

## 理解度チェック

1. C#のdelegateが束ねている機能を3つ以上挙げ、C++での対応物を言えますか。
2. C#式の `-= OnDamaged` がC++のラムダで再現できない理由は?
3. 購読トークンのRAII化は、C#とC++それぞれのどんな事故を防ぐ設計ですか(方向が逆であることに注意)。

## 演習

<a href="/study/samples/cpp/pattern_observer.cpp">samples/pattern_observer.cpp</a> にRAII購読トークン(Subscription)を実装し、「スコープを抜けたUI部品の購読が自動で消える」ことをログで確認してください。

---

関連項目：[仮想関数とvirtual/override](/languages/csharp/virtual-and-polymorphism.html) / [学習ガイド](/languages/csharp/) / [ヘッダー分割とAssembly Definition](/languages/csharp/headers-vs-asmdef.html)
