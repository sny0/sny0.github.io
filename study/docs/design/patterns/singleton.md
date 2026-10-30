---
title: Singleton
study:
  source: C++ Wiki
  status: published
  summary: あるクラスのインスタンスがプログラム全体で1つだけであることを保証し、どこからでもアクセスできるようにしたい。 ただし先に言っておくと、この2つの要求(唯一性と全域アクセス)は別物で、問題を起こすのは主に後者です。Singletonは「最も有名で、最も乱用されるパターン」であり、このページの主目的は
  section: reference
  format: article
  domain: design
---

# Singleton

## 解決する問題

あるクラスのインスタンスが**プログラム全体で1つだけ**であることを保証し、どこからでもアクセスできるようにしたい。

ただし先に言っておくと、この2つの要求(唯一性と全域アクセス)は**別物**で、問題を起こすのは主に後者です。Singletonは「最も有名で、最も乱用されるパターン」であり、このページの主目的は**正しく避ける方法**を含めて判断できるようになることです。

## 登場人物と責務

- **Singleton**: 自身の唯一のインスタンスを管理し、`Instance()` で公開する。コンストラクタはprivate

## 最小構成図

```
[任意のコード] ──> AudioManager::Instance() ──> [唯一のAudioManager]
     (どこからでも同じ実体に到達できる = 隠れた共有)
```

## パターンなしの実装(素朴なグローバル変数)

```cpp
// C++20(問題例)
AudioManager g_audio;   // グローバル変数
// 問題: 他のグローバル変数の初期化から使われると初期化順が未規定で危険
//(いわゆる static initialization order fiasco → 記憶域期間と寿命の項目を参照)
```

## パターン適用後のC++コード

```cpp
// C++20 — Meyers' Singleton(関数ローカルstatic)
class AudioManager {
public:
    static AudioManager& Instance() {
        static AudioManager instance;   // 初回呼び出し時に構築。C++11以降スレッドセーフ保証
        return instance;
    }
    AudioManager(const AudioManager&) = delete;             // コピー禁止
    AudioManager& operator=(const AudioManager&) = delete;

    void Play(const std::string& name) { /* 再生 */ }
private:
    AudioManager() = default;   // 外から作れない
};
// 使用: AudioManager::Instance().Play("explosion");
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_singleton.cpp">samples/pattern_singleton.cpp</a>

- 関数ローカルstaticの初期化はC++11以降、**言語仕様でスレッドセーフ**(初回に1回だけ構築)が保証されています。
- 破棄はプログラム終了時。**破棄順は他のstaticと相互依存すると未規定領域に踏み込む**ため、Singleton同士がデストラクタで参照し合う設計は避けます(→ [静的記憶域期間](/runtime/memory/storage-duration-and-lifetime.html))。

## C#またはUnityでの実装

```csharp
// Unityで最もよく見る形(DontDestroyOnLoad型)
public class AudioManager : MonoBehaviour {
    public static AudioManager Instance { get; private set; }
    private void Awake() {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
    public void Play(string name) { /* 再生 */ }
}
```

Unity特有の注意: シーン再読込・実行順・エディタのドメインリロード無効化設定によって `Instance` の生存が揺れるため、「nullチェック+自動生成」や初期化シーン方式など、プロジェクトで方針を1つに統一することが重要です。

## なぜ乱用が問題になるのか(このパターンの本題)

1. **隠れた依存**: `Instance()` は関数の引数にも型にも現れない。クラスの依存関係がシグネチャから読めなくなり、「このクラスを動かすのに何が必要か」が不明になる(→ [依存関係](/design/foundations/dependency.html))。
2. **グローバル可変状態**: どこからでも書き換えられる状態は、バグの再現条件を「プログラム全体」に広げる。
3. **テスト困難**: テスト間で状態が持ち越される。差し替え(モック)が難しい。
4. **初期化・破棄順の制御困難**: Singleton同士の依存は起動・終了時の不具合の温床。
5. **「便利な置き場」化**: 一度作ると何でも入る神クラスに育つ([SRP](/design/solid/srp.html)崩壊の入口)。

## 利点

- アクセスが圧倒的に簡単(配線コード不要)
- 唯一性の保証と遅延初期化が手軽に手に入る
- 小規模プロジェクトでは、DIの配線より総コストが低いことも多い

## 欠点

上記「乱用が問題になる理由」の5点。特に**依存が隠れる**ことが、規模が大きくなったときの主コスト。

## 適用条件(許容しやすい場合)

- **本当に1つで、状態がほぼない**もの: ログ出力、乱数(シード管理するなら注意)、設定の読み取り専用ビュー
- アクセス箇所が少数に限定されている(全コードから触れる必要はないなら、公開範囲を絞る)
- プロジェクトが小さく、テストの分離要求がない

## 避けるべき条件

- 可変状態を持ち、多数のシステムが読み書きする(ゲーム進行状態、プレイヤーデータ)→ 明示的に渡す/DIへ
- テストで差し替えたい(セーブ、時間、乱数)
- 「グローバルにアクセスしたいだけ」で唯一性は不要 → それはSingletonの動機ではない

## 似たパターンとの違い・代替手段

| 代替 | 何が変わるか |
|---|---|
| 引数で渡す | 依存がシグネチャに現れる。最も単純で最強の代替 |
| [Dependency Injection](/game/patterns/service-locator-and-di.html) | 生成と配線を起動時に集約。テスト差し替え可能 |
| [Service Locator](/game/patterns/service-locator-and-di.html) | 全域アクセスは残るが、差し替え可能になる(中間形) |
| 単なる名前空間関数 | 状態がないなら、そもそもインスタンス不要 |

判断フロー: [判断ガイド: Singletonを許容できるか](/design/decisions/events-di-singleton.html)

## 実務でよく見かける変形

- **明示的な生成・破棄を持つ形**: `AudioManager::Startup()/Shutdown()` をmainが呼ぶ。生成順・破棄順を制御下に置ける(エンジンでよく使われる。全域アクセスは残るがfiascoを避けられる)
- 「Singletonだが実体はmainが所有し、staticはポインタだけ」— テスト時に差し替え可能

## 過剰設計になる例(逆パターン)

逆に「Singleton絶対禁止」も過剰です。ログのような無状態・全域横断の機能にDI配線を強制すると、全クラスのコンストラクタがLogger引数で汚れます。**状態の有無とアクセス範囲で個別判断**が正解です。

## 関連項目

- [Service Locator と DI](/game/patterns/service-locator-and-di.html)
- [静的記憶域期間と初期化順](/runtime/memory/storage-duration-and-lifetime.html)
- [判断ガイド: Singletonを許容できるか](/design/decisions/events-di-singleton.html)

## 理解度チェック

1. Singletonが混ぜている2つの別々の要求は何ですか。問題を起こすのは主にどちらですか。
2. Meyers' Singletonのスレッド安全性は何によって保証されていますか。
3. 「Singletonでよいもの」の条件を2つ挙げてください。

## 演習

自分のプロジェクトにあるSingleton(またはUnityのstatic Instance)を1つ選び、(a) それを読むコードと書くコードの数を数え、(b) 「引数渡し」「Service Locator」「現状維持」のどれが妥当か、テスト要求と規模を根拠に判断してください。

---

関連項目：[Prototype](/design/patterns/prototype.html) / [学習ガイド](/design/patterns/) / [Adapter](/design/patterns/adapter.html)
