---
title: Unreal Engineと標準C++の演習
study:
  source: C++ Wiki
  status: published
  summary: 正誤を判定し、誤りは訂正してください。 UPROPERTYを付けないUObjectポインタは、GCから見えず、対象が回収されてもnullにならない。 UEのUCLASSマクロは、C++コンパイラが解釈する言語拡張である。
  section: practice
  format: exercise
  domain: game
  collection: cpp-exercises
  order: 10
---

<div id="第10部-演習-—-unreal-engineとの対応" class="study-legacy-anchor" aria-hidden="true"></div>

# Unreal Engineと標準C++の演習

## 問1. 概念確認

正誤を判定し、誤りは訂正してください。

1. UPROPERTYを付けないUObjectポインタは、GCから見えず、対象が回収されてもnullにならない。
2. UEのUCLASSマクロは、C++コンパイラが解釈する言語拡張である。
3. SlateウィジェットはUObjectなので、TObjectPtrで保持する。
4. Dynamicデリゲートは速度面で有利なので、C++内部の通知に適する。
5. UObjectはNewObject/SpawnActorで生成し、newやdeleteを直接使わない。

<details><summary>解答</summary>

1. **正**(UE C++事故の筆頭 → [GC](/game/unreal/gc-and-object-pointers.html))。2. **誤**。マクロ自体はほぼ空で、UHT(外部ツール)がコード生成する([UHT](/game/unreal/reflection-and-uht.html))。3. **誤**。Slateは非UObjectでTSharedPtrの世界([スマートポインタ](/game/unreal/smart-pointers.html))。4. **誤**。逆(名前検索で遅い。BP連携が必要なときだけ → [Delegate](/game/unreal/delegates-and-interfaces.html))。5. **正**(GCの台帳に載せるため → [UObject](/game/unreal/uobject-actor-component.html))。
</details>

## 問2. コード読解

```cpp
UCLASS()
class ATurret : public AActor {
    GENERATED_BODY()
    AEnemy* Target;                        // (A)
public:
    void SetTarget(AEnemy* InTarget) { Target = InTarget; }
    void Fire() { if (Target) FireAt(Target->GetActorLocation()); }   // (B)
};
```

このコードの2つの危険(GC観点)と修正を書いてください。

<details><summary>解答</summary>

(A) UPROPERTYなし → GCから不可視。Targetの敵が他から参照されなくなれば回収され、(B)のnullチェックはdanglingを検出できない(非nullのまま死ぬ)→ UAF相当。さらにUPROPERTYがないと参照として数えられないため意図せぬ回収を招く。修正: `UPROPERTY() TObjectPtr<AEnemy> Target;`(延命したい場合)または「敵は先に消えうる」仕様なら `TWeakObjectPtr<AEnemy> Target;`+`Target.IsValid()` チェック([GC](/game/unreal/gc-and-object-pointers.html))。仕様(延命すべきか)を決めるのが先、という点まで書ければ満点。
</details>

## 問3. 問題のある設計の改善

「UnityのGameManager.Instance の移植として、AGameManagerというActorをレベルに置き、static変数で公開した」。UEの流儀での改善案を2つ挙げてください。

<details><summary>解答の要点</summary>

(1) **GameInstanceSubsystem**(ゲーム全体の寿命)または**WorldSubsystem**(レベル寿命)に移す——寿命管理と取得(GetSubsystem)をエンジンに任せる([Subsystem](/game/unreal/gameplay-framework.html))。(2) 役割がルール審判なら**GameMode/GameState**という既存の枠に乗せる(ネットワーク時の存在場所も正しくなる)。staticなActorポインタはレベル遷移でdangling化する(Actorの寿命はレベル持ち)ため最悪の選択、という理由も添える。
</details>

## 問4. 設計比較

「敵撃破の通知を、UI・実績・クエストが受け取る」を、(a) 標準C++(std::functionリスト自作 → [Observer](/design/patterns/observer.html))、(b) UEの非DynamicなMulticastDelegate、(c) DynamicMulticast+BP、で実装する場合の比較表(速度・BP連携・寿命安全・記述量)を作ってください。

<details><summary>解答の要点</summary>

(a) 速度○・BP不可・寿命は自作(RAIIトークン等)・記述量多。(b) 速度○・BP不可・AddUObjectがUObject生死を考慮(自作より安全)・記述量少。(c) 速度△(名前検索)・**BP可**(デザイナーが購読を追加できる)・シリアライズ可・UFUNCTION必須。判断: UEプロジェクトなら(b)が既定、デザイナーに開く通知だけ(c)。(a)は非UObject層(純ロジック)でのみ選択肢([Delegate](/game/unreal/delegates-and-interfaces.html))。
</details>

## 問5. デバッグ問題

「エディタ起動しただけで自作Actorのコンストラクタ内クラッシュが起きる。BeginPlayはまだ呼ばれていないのに」。原因の見立てを書いてください。

<details><summary>解答</summary>

UEはエディタ起動時に全UCLASSの**CDO(Class Default Object)**を構築するため、コンストラクタはゲーム開始前に必ず実行される([UObject](/game/unreal/uobject-actor-component.html))。コンストラクタ内でワールド取得・他Actor参照・アセットの実行時ロードなど「ゲーム実行中でないと成立しない処理」を書いたのが原因。ゲームプレイ初期化はBeginPlayへ、コンストラクタはデフォルト値とコンポーネント生成(CreateDefaultSubobject)のみに限定する。
</details>

## 問6. 説明問題

「UEはなぜ標準C++のSTL・shared_ptr・RTTI・例外を使わないのか」を、このカテゴリで学んだ理由から3〜4文でまとめてください。

<details><summary>解答例</summary>

UEは全プラットフォームで同一の挙動・メモリ管理・ABIを保証するため、コンテナやスマートポインタを独自実装で完全制御している(STL実装は処理系ごとに異なるため)。型情報はRTTIでは足りず(プロパティ列挙・BP連携・GCに必要)、UHTによるコード生成で本格的なリフレクションを自作した。例外はコスト・プラットフォーム事情からオフにし、check/ensureで代替する文化を取る。つまり「標準が嫌い」なのではなく、エンジンとして保証したい性質を優先した結果の選択である([スマートポインタ](/game/unreal/smart-pointers.html)、[UHT](/game/unreal/reflection-and-uht.html)、[例外](/languages/cpp/exceptions.html))。
</details>

## 問7. 小規模実装問題(UE環境がなくても可)

「HealthComponent」を2通りで設計してください:

1. UE版の骨格(ヘッダーのみ): UActorComponent派生、UPROPERTYでMaxHp、OnDamagedのMulticastDelegate、BlueprintCallableなApplyDamage
2. 標準C++版(<a href="/study/samples/cpp/component_entity.cpp">samples/component_entity.cpp</a>の流儀): 同じ機能をUEマクロなしで

両者を並べ、「UE版がマクロで追加している能力」を列挙してください(エディタ公開・BP・GC追跡・シリアライズ)。

---

関連項目：[Gameplay Framework](/game/unreal/gameplay-framework.html) | [この分野の学習ガイド](/game/unreal/) | [関連項目](/design/case-studies/)
