---
title: "Service Locator と Dependency Injection(比較)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "どちらも「あるクラスが必要とする依存(サウンド、セーブ、時間)を、具象クラスのハードコードやSingleton直呼びなしで手に入れる」ための仕組みです。 Service Locator: 「サービスの電話帳」を1つ置き、必要な側が自分で問い合わせる(Locator::Get ())"
---

# Service Locator と Dependency Injection(比較)

## 一言で言うと

どちらも「あるクラスが必要とする依存(サウンド、セーブ、時間)を、**具象クラスのハードコードや[Singleton](/design/patterns/singleton.html)直呼びなしで**手に入れる」ための仕組みです。

- **Service Locator**: 「サービスの電話帳」を1つ置き、必要な側が**自分で問い合わせる**(`Locator::Get<IAudio>()`)
- **Dependency Injection (DI)**: 必要なものを**外から渡してもらう**(コンストラクタ引数など)。自分では取りに行かない

## 解決したい問題

```cpp
// C++20(問題例)— Singleton直呼び
void Explosion::Detonate() {
    AudioManager::Instance().Play("boom");   // 具象+グローバルに直結
    // テストで音を差し替えられない。依存がシグネチャに現れない
}
```

差し替え不能・依存が不可視、という[Singleton](/design/patterns/singleton.html)の問題を緩和したい。

## Service Locator

```cpp
// C++20
class IAudio {
public:
    virtual ~IAudio() = default;
    virtual void Play(const std::string& id) = 0;
};

class Locator {
public:
    static void Provide(IAudio* audio) { audio_ = audio ? audio : &null_; }
    static IAudio& Audio() { return *audio_; }
private:
    class NullAudio : public IAudio {         // Null Object: 未登録でも安全に動く
    public:
        void Play(const std::string&) override {}
    };
    inline static NullAudio null_{};
    inline static IAudio* audio_ = &null_;    // 生ポインタ: 所有しない(提供側が寿命管理)
};

// 利用: Locator::Audio().Play("boom");
// 起動時: Locator::Provide(&fmodAudio);  テスト時: Provide(&recordingFakeAudio);
```

検証済みサンプル: <a href="/study/samples/cpp/service_locator.cpp">samples/service_locator.cpp</a>

Singletonとの違い: (1) 返すのは**抽象**なので差し替え可能、(2) Null Objectで未初期化が安全、(3) 提供(Provide)の場所が1か所に集まる。ただし**全域アクセスと依存の不可視性は残ります**。

## Dependency Injection

```cpp
// C++20 — コンストラクタ注入(DIの基本形。コンテナは必須ではない)
class Explosion {
public:
    explicit Explosion(IAudio& audio) : audio_(audio) {}   // 依存がシグネチャで宣言される
    void Detonate() { audio_.Play("boom"); }
private:
    IAudio& audio_;   // 参照: 所有せず借用(注入元が寿命を保証)
};

// 組み立て(main / ブートストラップに集約される。これをComposition Rootと呼ぶ)
// FmodAudio audio;  Explosion e(audio);
```

DIコンテナ(VContainer等)は、この組み立て(誰に何を渡すか)を自動化・宣言化するツールにすぎません。**手動のコンストラクタ注入だけでもDIはDI**です。

## 比較(このページの核)

| | Service Locator | Dependency Injection |
|---|---|---|
| 依存の可視性 | **不可視**(実装を読まないと分からない) | **可視**(コンストラクタが依存の一覧) |
| 取得の方向 | 自分で取りに行く(pull) | 渡される(push) |
| 配線コスト | ほぼゼロ(Provide数回) | 組み立てコードが必要(規模に比例) |
| テスト | Provideで差し替え(全域状態なのでテスト間の掃除が必要) | 引数に渡すだけ(テストごとに独立) |
| 未登録時 | 実行時に発覚(Null Objectで緩和) | コンパイル時に発覚(引数が足りない) |
| MonoBehaviourとの相性 | 良い(どこからでも呼べる) | 工夫が要る(コンストラクタが使えない) |
| 規模との相性 | 小〜中規模で快適 | 中〜大規模で効く(依存の見える化が効く) |

**本質的な違いは「依存が型のシグネチャに現れるか」**です。DIでは `Explosion(IAudio&, IVfx&, ITime&)` と書いた瞬間に「このクラス依存多すぎでは?」が見える——設計の検査装置([テスト容易性](/design/foundations/quality-attributes.html))として機能します。Locatorはこの圧力がかからないため、依存が静かに増えます。

## Unity/C# との対応

- MonoBehaviourはコンストラクタ注入不可 → 代替: `[SerializeField]`参照(インスペクタ注入)、`Construct()`メソッド注入、VContainer/Zenject(リフレクションで注入)
- ScriptableObjectを「差し替え可能なサービスの置き場」にするのはLocatorの変形
- Unityの `Camera.main` や `Physics.Raycast` などstatic APIは事実上エンジン提供のLocator/Singleton——**エンジン境界はそういうもの**と割り切り、自分のゲームロジック側で線を引くのが現実解

## Unreal Engine との対応

- **Subsystem**(GameInstanceSubsystem等)がUE公式のService Locator: `GetSubsystem<UMyAudioSubsystem>()` で全域から取得、寿命はエンジン管理(→ [第10部](/game/unreal/gameplay-framework.html))
- Actorへの注入はSpawn時のパラメータ渡しやコンポーネント参照で行う(DIコンテナ文化は薄い)

## 使う場面 / 使わない場面

- **Service Locator**: 横断的で状態の薄いサービス(オーディオ、ログ、時間)。MonoBehaviour中心の小〜中規模。エンジンのSubsystem的な層
- **DI(手動)**: テストしたいゲームロジック、依存を明示したい中核システム。まずこちらを検討するのが筋が良い
- **DIコンテナ**: オブジェクトグラフが大きく手動配線が苦痛になったら。**最初からは要らない**
- **どちらも不要な場面**: 依存が2〜3個で固定の小さなゲーム。引数で渡せば済む

## よくある誤解

- 「DI = DIコンテナを使うこと」— コンテナなしのコンストラクタ注入が基本形
- 「LocatorはアンチパターンでDIが正義」— Locatorは「規律のあるSingleton代替」として明確に有用な中間解。規模とテスト要求で選ぶ
- 「[DIP](/design/solid/dip.html)とDIは同じ」— DIPは原則(抽象への依存)、DIは手段(注入)。LocatorでもDIPは満たせる

## 関連項目

- [Singleton](/design/patterns/singleton.html) / [DIP](/design/solid/dip.html)
- [判断ガイド: 依存性注入を使うべきか・Singletonを許容できるか](/design/decisions/events-di-singleton.html)

## 理解度チェック

1. LocatorとDIの「本質的な違い」を一文で言えますか。
2. Null Objectサービスは何を防いでいますか。
3. MonoBehaviourでコンストラクタ注入ができない制約への対処を2つ挙げてください。

## 演習

samples/service_locator.cpp をDI版(コンストラクタ注入)に書き換え、(a) テストコードの書きやすさ、(b) 依存が増えたときにどこが変わるか、を両版で比較してください。

---

前: [Event Queue・Pub/Sub](/game/patterns/event-queue-and-pubsub.html) | [カテゴリ目次](/game/patterns/) | 次: [Object Pool](/game/patterns/object-pool.html)
