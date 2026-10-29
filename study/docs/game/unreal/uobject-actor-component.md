---
title: "UObject・Actor・ActorComponent"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "UObject: UEの管理対象オブジェクトの基底クラス。これを継承するとリフレクション・GC・シリアライズ・エディタ統合のフルセットが付いてくる AActor: レベルに配置できるもの(UObjectの子孫)。UnityのGameObjectに相当"
---

# UObject・Actor・ActorComponent

## 一言で言うと

- **UObject**: UEの管理対象オブジェクトの基底クラス。これを継承すると**リフレクション・GC・シリアライズ・エディタ統合**のフルセットが付いてくる
- **AActor**: レベルに配置できるもの(UObjectの子孫)。Unityの**GameObject**に相当
- **UActorComponent**: Actorに付ける部品。Unityの**MonoBehaviour(コンポーネント)**に相当

## 標準C++ではどう書くか / UEではなぜ独自か

標準C++でゲームオブジェクトを作るなら:

```cpp
// 標準C++流(本Wikiで学んだ形)
class Enemy {                        // 何も継承しない普通のクラス
public:
    void Update(float dt);
private:
    float hp_ = 100;
};
// 所有: std::vector<std::unique_ptr<Enemy>>、参照: 生ポインタ/ハンドル(第7部)
```

UEが独自の基底(UObject)を強制する理由:

1. **エディタ統合**: プロパティをエディタに表示・編集・保存するには型情報(リフレクション)が要る。C++標準のRTTIでは全く足りない(→ [リフレクション](/game/unreal/reflection-and-uht.html))
2. **GC**: レベル・Actor・アセットが複雑に参照し合う世界では、所有の木([第7部](/runtime/memory/ownership-and-borrowing.html))を人手で管理するより到達可能性ベースのGCが現実的、という設計判断(→ [GC](/game/unreal/gc-and-object-pointers.html))
3. ネットワークレプリケーション・シリアライズ・Blueprint連携も、全部リフレクションの上に載っている

つまり「UObject = これらのサービスの加入契約」。**サービスが不要な純粋ロジック(数学、アルゴリズム)はUObjectにしない**のが正しい使い分けです(普通のC++クラスもUEで普通に使えます)。

## Unity対応表

| Unity | UE | 注意 |
|---|---|---|
| GameObject | AActor | UEのActorは**C++クラスとして派生を作る**のが基本(Unityは合成のみ) |
| MonoBehaviour | UActorComponent / USceneComponent(Transform付き) | ほぼ対応 |
| Transform階層 | USceneComponentの階層 | UEでは**Actor内**のコンポーネント階層(Actor間のアタッチも可) |
| Instantiate | SpawnActor / NewObject | 生成はワールド経由 |
| Destroy | DestroyActor(+GCが後で回収) | 「破棄マーク→後で回収」構造は似ている |
| prefab | Blueprint Class | BPは「派生クラス+データ」([Prototype](/design/patterns/prototype.html)参照) |
| Awake/Start/Update | コンストラクタ(CDO注意)/BeginPlay/Tick | **コンストラクタはエディタ起動時にも走る**(CDO生成)——Unityとの大きな差 |

### 継承とコンポジションの混合(設計面の要点)

- Unityは「合成一辺倒」(GameObjectは継承しない)。UEは**Actor継承(ACharacter←APawn←AActor)+Component合成**の混合設計(→ [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html))
- 実務指針: エンジンの枠(Pawn/Character/GameMode)は継承に乗る、**ゲーム固有の機能はComponentへ**——UnityのSRP的な分割感覚はそのまま活きる

## 最小コード対比

```cpp
// UE(概念コード。UEプロジェクト外ではビルドできない — 本Wikiでは構文説明のみ)
UCLASS()
class AEnemy : public AActor {
    GENERATED_BODY()               // UHTが生成するコードの差し込み口(→ リフレクション)
public:
    AEnemy();                      // CDO(クラスデフォルトオブジェクト)構築にも使われる
    virtual void Tick(float DeltaSeconds) override;
    virtual void BeginPlay() override;

    UPROPERTY(EditAnywhere, Category="Stats")
    float MaxHp = 100.f;           // エディタ編集可+GC追跡+保存対象(→ UPROPERTY)

    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> Mesh;   // コンポーネントを所有
};
```

- `A`プレフィックス=Actor系、`U`=UObject系、`F`=通常struct、`T`=テンプレート——UEの命名規約(リフレクション・UHTの要請も絡む)
- `Tick`はUnityのUpdate相当だが、**既定でオフにできる・グループで順序制御できる**(→ [Game Loop](/game/patterns/game-loop-and-update.html))

## Unity開発者が誤解しやすい点

1. **コンストラクタ≠Awake**: UEのコンストラクタはCDO(Class Default Object=クラスの雛形インスタンス)構築のためにエディタ起動時にも実行される。ゲームプレイの初期化はBeginPlayに書く
2. 「全部Componentで作る」— UEではActor派生でBlueprint継承させる設計が主流の場面も多い(エンジンの想定に沿う方が楽)
3. UObjectを`new`/`delete`しない(**NewObject/SpawnActor経由**が必須。GCの管理台帳に載せるため)。標準C++の習慣をUObjectに適用してはいけない代表例

## 理解度チェック

1. UObject継承で得られるサービスを3つ挙げ、「不要ならUObjectにしない」理由を説明できますか。
2. UEのコンストラクタとBeginPlayの使い分けと、その背景(CDO)は?
3. UnityのGameObject/MonoBehaviourとの対応と、継承方針の違いは?

## 演習

自分のUnityプロジェクトの任意のMonoBehaviourを1つ選び、UEに移植する場合の設計(Actor派生にするか、Component化するか、非UObjectの純C++クラスに切り出せる部分はどこか)を書き出してください。

---

前: [カテゴリ目次](/game/unreal/) | 次: [UEのGCとUPROPERTY](/game/unreal/gc-and-object-pointers.html)
