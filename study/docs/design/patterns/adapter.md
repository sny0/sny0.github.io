---
title: Adapter
study:
  source: C++ Wiki
  status: published
  summary: "既存のクラス(変更できない・したくない)のインターフェースが、こちらの欲しい形と合わない。変換器を挟んで、変更せずに接続したい。 Target: クライアントが期待するインターフェース(こちらの語彙)"
  section: reference
  format: article
  domain: design
---

# Adapter

## 解決する問題

既存のクラス(変更できない・したくない)のインターフェースが、こちらの欲しい形と合わない。**変換器を挟んで、変更せずに接続**したい。

## 登場人物と責務

- **Target**: クライアントが期待するインターフェース(こちらの語彙)
- **Adaptee**: 既存の合わないクラス(外部SDK、レガシーコード)
- **Adapter**: Targetを実装し、内部でAdapteeに変換・委譲する

## 最小構成図

```
[ゲームコード] ──> IAudioPlayer(Target) <── FmodAudioAdapter(Adapter) ──委譲──> FMOD API(Adaptee)
```

## パターンなしの実装

```cpp
// C++20(問題例)— 外部SDKの流儀がゲーム全体に漏れる
void OnExplosion() {
    FMOD::Studio::EventInstance* ev = fmodSystem->createEventInstance("event:/explosion");
    ev->setVolume(0.8f);
    ev->start();
    ev->release();   // SDK固有の作法(release必須)を全呼び出し箇所が知る必要がある
}
```

## 問題点

- SDK固有の型と作法(release、イベントパス形式)が**全使用箇所に複製**される
- ミドルウェア変更(FMOD→Wwise)で全箇所を書き換え
- SDKなしでのテスト・モック化が不可能([DIP](/design/solid/dip.html)違反そのもの)

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>
#include <string>

// Target: ゲーム側の語彙で定義した欲しい形
class IAudioPlayer {
public:
    virtual ~IAudioPlayer() = default;
    virtual void PlayOneShot(const std::string& soundId, float volume) = 0;
};

// Adapter: SDKの作法をここに閉じ込める
class FmodAudioAdapter : public IAudioPlayer {
public:
    explicit FmodAudioAdapter(FmodSystem& system) : system_(system) {}
    void PlayOneShot(const std::string& soundId, float volume) override {
        auto* ev = system_.createEventInstance(("event:/" + soundId).c_str());
        ev->setVolume(volume);
        ev->start();
        ev->release();   // SDKの作法はこの1か所だけが知っている
    }
private:
    FmodSystem& system_;   // 参照: SDK本体の所有・初期化は起動コードが担う
};

// ゲームコードはTargetしか知らない
// audio->PlayOneShot("explosion", 0.8f);
```

構造検証用サンプル(SDKをスタブ化): <a href="/study/samples/cpp/pattern_adapter.cpp">samples/pattern_adapter.cpp</a>

## C#またはUnityでの実装

```csharp
// アセットストアのSDKを自分のインターフェースに合わせる
public interface IAdsService { void ShowRewarded(Action<bool> onFinished); }

public class UnityAdsAdapter : IAdsService {
    public void ShowRewarded(Action<bool> onFinished) {
        // Unity Ads SDKのコールバック形式・列挙型を、自分の形式(bool成功)へ変換
        Advertisement.Show("rewardedVideo", new ShowOptions {
            resultCallback = r => onFinished(r == ShowResult.Finished)
        });
    }
}
```

## ゲームでの具体例

- ミドルウェアの隔離: サウンド(FMOD/Wwise)、広告、課金、アナリティクス、プラットフォームSDK(実績・セーブ)
- 旧システムの延命: リメイクで旧ゲームロジックを新エンジンのインターフェースに繋ぐ
- 入力: 各プラットフォームの入力APIを共通の `IInputSource` に変換

## 利点

- 変更できないコード同士を、双方無変更で接続できる
- 外部依存が1クラスに隔離され、差し替え・テスト・バージョンアップが局所化する
- 変換ロジック(座標系の違い、単位の違い)の置き場所が明確になる

## 欠点

- 間接層が1枚増える(コードを追うときワンホップ増える)
- Targetの設計を誤る(Adapteeの写しにする)と、隔離の意味がなくなる — **Targetは自分の語彙で**([DIP](/design/solid/dip.html)の「抽象の所有」と同じ注意)
- Adapteeの機能すべてをTargetに露出しようとすると、Targetが肥大化する(使う分だけ露出する)

## 適用条件

- 変更できない外部コードとの境界(SDK、レガシー、他チームの成果物)
- 差し替えの可能性が現実にある依存

## 避けるべき条件

- 自分で変更できるコード同士 → 直接インターフェースを合わせる方が単純
- 標準ライブラリなど安定していて差し替えない依存 → ラップは追跡コストだけ増える

## 似たパターンとの違い

- [Facade](/design/patterns/facade.html): 変換ではなく**単純化**(多数のクラスを1つの窓口に)。Adapterは既存インターフェース→目的インターフェースの形合わせ
- [Decorator](/design/patterns/decorator.html): インターフェースを**変えずに**機能を足す。Adapterは**変える**
- [Proxy](/design/patterns/proxy.html): 同じインターフェースのまま、アクセスを制御する
- [Bridge](/design/patterns/bridge.html): 事後の接続(Adapter)vs 設計時からの分離(Bridge)

## 実務でよく見かける変形

- 双方向Adapter、クラスAdapter(多重継承版。C++では可能だが委譲版が推奨)
- **腐敗防止層 (Anti-corruption layer)**: Adapterの集合で外部システムの流儀の侵入を防ぐアーキテクチャ用語

## 過剰設計になる例

エンジンAPI(UnityのTransform等)を全部自作インターフェースでラップする「エンジン非依存化」— エンジン移行が実際に計画されていない限り、膨大なAdapter層の保守だけが残ります。境界の選定は「本当に差し替えうるか」で。

## 関連項目

- [DIP](/design/solid/dip.html) / [Facade](/design/patterns/facade.html) / [Bridge](/design/patterns/bridge.html)
- [ケーススタディ: サウンド管理](/design/case-studies/sound-manager.html)

## 理解度チェック

1. AdapterとFacadeの目的の違いは?
2. Targetを「Adapteeの写し」で設計すると何が失われますか?
3. ラップすべき依存とラップ不要な依存の判断基準は?

## 演習

「プラットフォーム実績API」(Steam: `SetAchievement(const char*)` + `StoreStats()`、PS: 別作法)を想定し、ゲーム側Target `IAchievements` を設計してください。「進捗率つき実績」をSteamは%指定、PSは段階指定と仮定した場合の変換の置き場所も決めてください。

---

関連項目：[Singleton](/design/patterns/singleton.html) / [学習ガイド](/design/patterns/) / [Bridge](/design/patterns/bridge.html)
