---
title: "関数ポインタと delegate / Observer と event"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "言語機能の詳細はラムダ式・関数ポインタ・std::function、設計面はObserverで説明済み。ここでは対応関係を整理します。 C#のdelegateは多機能な統合パッケージです。C++では機能ごとに別の道具に分かれます。"
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
// C++20: 分業した道具を組み合わせる(検証済み: samples/pattern_observer.cpp)
class Health {
public:
    using Handler = std::function<void(int)>;
    int Subscribe(Handler h) { handlers_.emplace_back(nextId_, std::move(h)); return nextId_++; }
    void Unsubscribe(int id) { std::erase_if(handlers_, [id](auto& p){ return p.first == id; }); }
    void Notify(int dmg) { for (auto& [id, h] : handlers_) h(dmg); }
private:
    std::vector<std::pair<int, Handler>> handlers_;
    int nextId_ = 0;
};
```

## eventキーワードに相当するもの

C#の `event` は「クラス外からは += / -= しかできない」(Invokeと=を封じる)というアクセス制御。C++で同等の設計をするなら「Subscribe/Unsubscribeだけをpublicにし、通知リストとNotifyをprivateに」——**言語機能ではなく設計で表現**します(上の例がそうなっている)。

## 寿命問題: C#が隠していた最大の差分

- C#: delegateが対象インスタンスを**GC参照で延命**する。「購読したままオブジェクトが消える」と、消えずに残り続ける(リーク方向の事故。UnityのMissingReference例外はエンジン破棄との齟齬)
- C++: `[this]` キャプチャは**延命しない**(ただの借用)。thisが先に死ねば呼び出しは[UAF](/runtime/memory/memory-bugs.html)(未定義動作)
- 対策の定石: **購読トークンのRAII化**(トークン破棄=自動Unsubscribe。メンバに持てば寿命と購読が連動)/ weak_ptr捕捉+lock確認

```cpp
// RAII購読トークンの骨子
class Subscription {   // デストラクタでUnsubscribeを呼ぶだけの小さなRAII
public:
    Subscription(Health& h, int id) : h_(&h), id_(id) {}
    ~Subscription() { if (h_) h_->Unsubscribe(id_); }
    // ムーブ可・コピー不可(所有権1つ)— 実装は samples を参照
private:
    Health* h_; int id_;
};
// UI部品がメンバに Subscription を持てば、部品の破棄と同時に購読も消える
```

## UnityEventとの対応

| UnityEvent | C++での近似 |
|---|---|
| インスペクタで配線 | 対応物なし(データ駆動の配線を自作するか、UEのBlueprint/Delegateへ → [第10部](/game/unreal/delegates-and-interfaces.html)) |
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

前: [仮想関数とvirtual/override](/languages/csharp/virtual-and-polymorphism.html) | [カテゴリ目次](/languages/csharp/) | 次: [ヘッダー分割とAssembly Definition](/languages/csharp/headers-vs-asmdef.html)
