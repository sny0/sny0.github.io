---
title: UEの Delegate と Interface
study:
  source: C++ Wiki
  status: published
  summary: C++にはdelegate/eventの言語機能がないため、UEはマクロで型を生成する独自Delegateシステムを持ちます。 C++内で完結する通知は非Dynamic(速い)、BPに公開する・保存する通知だけDynamic——Unityの「C# event vs UnityEvent」の使い分け(
  section: reference
  format: article
  domain: game
---

# UEの Delegate と Interface

## Delegate — C#のevent相当をマクロで実現

[C++にはdelegate/eventの言語機能がない](/languages/csharp/delegates-events-function-pointers.html)ため、UEはマクロで型を生成する独自Delegateシステムを持ちます。

```cpp
// 宣言(マクロが専用型を生成する)
DECLARE_DELEGATE_OneParam(FOnDamaged, float);                     // 単一バインド
DECLARE_MULTICAST_DELEGATE_OneParam(FOnDamagedMulti, float);      // 多播(C#のevent相当)
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDamagedDyn, float, Amount);  // BP対応版

class UHealthComponent : public UActorComponent {
    // ...
public:
    UPROPERTY(BlueprintAssignable)          // BPからバインドできる(Dynamicのみ)
    FOnDamagedDyn OnDamaged;

    void ApplyDamage(float Amount) {
        OnDamaged.Broadcast(Amount);        // C#の Invoke 相当
    }
};

// 購読側
// Health->OnDamaged.AddDynamic(this, &AMyHud::HandleDamaged);   // Dynamic: 関数名で登録
// Health->OnDamagedMulti.AddUObject(this, &AMyHud::Handle);     // 非Dynamic: 直接バインド
```

### 種類と使い分け(重要)

| 種類 | 速度 | BP連携 | シリアライズ | バインド方式 |
|---|---|---|---|---|
| Delegate / Multicast | 速い | 不可 | 不可 | 関数ポインタ+オブジェクト直接 |
| **Dynamic** Delegate / Multicast | 遅い(**名前で検索**して呼ぶ) | **可** | 可 | リフレクション([UFUNCTION必須](/game/unreal/reflection-and-uht.html)) |

- **C++内で完結する通知は非Dynamic**(速い)、**BPに公開する・保存する通知だけDynamic**——Unityの「C# event vs UnityEvent」の使い分け(→ [Observer](/design/patterns/observer.html))と完全に同型の判断です
- 寿命の安全: `AddUObject`系はUObjectの生死をチェックして死んだ購読を呼ばない(→ [通知のRAIIトークン](/languages/csharp/delegates-events-function-pointers.html)の役割をGC統合で実現)。それでも明示的な `Remove`(EndPlay等で)が行儀の良い作法

## Interface — UINTERFACEの独自形式

[標準C++のインターフェース(純粋仮想クラス)](/design/foundations/polymorphism-interface.html)をそのまま使わず、UEは専用マクロを使います。

```cpp
// 宣言は2クラス1組(UHTの要請)
UINTERFACE(MinimalAPI, Blueprintable)
class UDamageable : public UInterface { GENERATED_BODY() };   // リフレクション用の殻

class IDamageable {                                            // 実体(こちらに関数を書く)
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintNativeEvent)      // BPで実装も上書きもできる仮想関数
    void TakeDamage(float Amount);
};

// 実装クラス
class ABarrel : public AActor, public IDamageable { /* ... */ };

// 使う側: 「この相手はこの能力を持つか?」
// if (AActor* Hit = ...; Hit->Implements<UDamageable>()) {
//     IDamageable::Execute_TakeDamage(Hit, 10.f);    // BP実装も考慮した呼び出し作法
// }
```

### なぜ独自形式か

1. **Blueprintがインターフェースを実装できる**ようにするため(BPクラスはC++の継承に参加できない→リフレクション経由の呼び出し `Execute_` が必要)
2. `Implements<T>()` による問い合わせ([RTTIなし環境](/runtime/cpp-internals/exceptions-and-rtti-impl.html)のdynamic_cast代替)
3. UnityのC# interface+`TryGetComponent<I>`([ISPの実践](/design/solid/isp.html))とほぼ同じ設計意図を、リフレクション基盤の上で実現したもの

- **C++内でしか使わないインターフェースなら、普通の純粋仮想クラスでもよい**(UObjectの世界に入れる必要がなければ標準C++で書く——[この章の原則](/game/unreal/))

## Unity開発者が誤解しやすい点

1. UnityEventの感覚で全部Dynamicにする——C++内部の高頻度通知が名前検索呼び出しになり遅い。**公開範囲で種類を選ぶ**
2. C# interfaceの感覚で `dynamic_cast` や直接キャストで判定——UEでは `Implements<U>()`+`Execute_` の作法(BP実装を取りこぼすため)
3. 「マクロだらけで気持ち悪い」— マクロの裏の必然(リフレクション・BP連携・RTTIなし)を[Unreal Engineの学習ガイド](/game/unreal/)で追えば、全部説明がつく

## 理解度チェック

1. DynamicデリゲートとC++デリゲートの違い(速度・BP・仕組み)を言えますか。
2. UEのInterfaceが2クラス1組で宣言される理由は?
3. 「C++内でしか使わない通知・インターフェース」にはそれぞれ何を使うのが適切ですか。

## 演習

[ケーススタディ: イベント通知](/design/case-studies/event-notification.html)の「敵死亡→複数システムが反応」を、UEのMulticastDelegate(非Dynamic)で設計し、どのシステムをBP公開(Dynamic)にすべきか判断を書いてください。

---

関連項目：[UEのスマートポインタ](/game/unreal/smart-pointers.html) | [この分野の学習ガイド](/game/unreal/) | [Gameplay Framework](/game/unreal/gameplay-framework.html)
