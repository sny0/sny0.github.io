---
title: Facade
study:
  source: C++ Wiki
  status: published
  summary: 複雑なサブシステム(多数のクラス・正しい呼び出し順・初期化の作法)を使うたびに、利用側がその複雑さを全部知る必要がある。よく使う操作をまとめた「一枚窓口」を置いて、日常の利用を単純にしたい。
  section: reference
  format: article
  domain: design
---

# Facade

## 解決する問題

複雑なサブシステム(多数のクラス・正しい呼び出し順・初期化の作法)を使うたびに、利用側がその複雑さを全部知る必要がある。**よく使う操作をまとめた「一枚窓口」**を置いて、日常の利用を単純にしたい。

## 登場人物と責務

- **Facade**: サブシステムの典型的な使い方を、少数の高水準メソッドとして提供する窓口
- **サブシステム群**: 実際の仕事をする複数のクラス。Facadeの存在を知らない
- **Client**: 普段はFacadeだけを使う(直接サブシステムを触ることも禁止はされない)

## 最小構成図

```
[ゲームコード] ──> AudioFacade.PlayBgm("boss")
                       │ 内部で正しい手順を実行
                       ├> SoundBank(ロード確認)
                       ├> ChannelPool(チャンネル確保)
                       ├> Mixer(BGMバスへ接続)
                       └> Fader(クロスフェード開始)
```

## パターンなしの実装

```cpp
// C++20(問題例)— BGMを変えるだけで全利用箇所がこの手順を知る必要がある
void OnBossAppear() {
    if (!soundBank.IsLoaded("bgm_boss")) soundBank.Load("bgm_boss");
    auto ch = channelPool.Acquire(ChannelType::Music);
    mixer.Route(ch, Bus::Bgm);
    fader.CrossFade(currentBgmChannel, ch, 2.0f);
    currentBgmChannel = ch;   // ←この状態管理を全呼び出し箇所が正しくやれるのか?
}
```

## 問題点

- 呼び出し手順・順序・状態管理の知識が**全利用箇所に複製**される(1か所でも間違うと不具合)
- サブシステムの内部変更(チャンネル管理の変更)が全利用箇所に波及
- 「正しい使い方」がコードとして1か所に存在しない

## パターン適用後のC++コード

```cpp
// C++20(骨格。サブシステムの型は省略)
#include <string>

class AudioFacade {
public:
    AudioFacade(SoundBank& bank, ChannelPool& pool, Mixer& mixer, Fader& fader)
        : bank_(bank), pool_(pool), mixer_(mixer), fader_(fader) {}

    // 「よくある使い方」を高水準の語彙で提供
    void PlayBgm(const std::string& name, float fadeSec = 2.0f) {
        if (!bank_.IsLoaded(name)) bank_.Load(name);
        auto ch = pool_.Acquire(ChannelType::Music);
        mixer_.Route(ch, Bus::Bgm);
        fader_.CrossFade(current_, ch, fadeSec);
        current_ = ch;    // 状態管理はFacadeが1か所で担う
    }
    void PlaySe(const std::string& name) { /* 同様に定型手順 */ }

private:
    SoundBank& bank_; ChannelPool& pool_; Mixer& mixer_; Fader& fader_;  // 参照: 所有はアプリ側
    Channel current_{};
};
// 使用: audio.PlayBgm("bgm_boss");  — 1行になった
```

構造検証用サンプル(サブシステムをスタブ化): <a href="/study/samples/cpp/pattern_facade.cpp">samples/pattern_facade.cpp</a>

## C#またはUnityでの実装

```csharp
// Unityでの例: シーン遷移の窓口(ロード画面・フェード・BGM停止・GC を正しい順で)
public class SceneFlow {
    public static async UniTask GoTo(string sceneName) {
        await FadeScreen.Out(0.3f);
        AudioFacade.StopBgm();
        LoadingUi.Show();
        await SceneManager.LoadSceneAsync(sceneName);
        LoadingUi.Hide();
        await FadeScreen.In(0.3f);
    }
}
```

「シーン遷移のたびに5行の作法を書く」状態を1呼び出しにするのは、Unityプロジェクトで最も費用対効果の高いFacadeです(→ [ケーススタディ: 画面遷移](/design/case-studies/screen-transition.html))。

## ゲームでの具体例

- サウンド窓口(PlayBgm/PlaySe)、シーン遷移窓口、セーブ窓口(集める→変換→書く)
- エンジン自体がFacadeの塊: Unityの `Physics.Raycast` は物理エンジンの巨大な内部への窓口

## 利点

- 利用側コードが劇的に単純になり、「正しい使い方」が1か所に定義される
- サブシステム内部の変更がFacadeで吸収される(利用側の安定)
- 新メンバーがサブシステムの全貌を知らなくても使える

## 欠点

- **神クラス化の危険**: 「窓口に足せば楽」が続くと、Facadeが数千行のManagerに育つ([SRP](/design/solid/srp.html)崩壊)。窓口は複数に分けてよい(AudioFacadeとSaveFacadeは別物)
- 高水準APIで表現できない特殊用途が出ると、結局サブシステム直叩きと混在する(それ自体は許容されるが、無秩序になりやすい)
- Facadeが[Singleton](/design/patterns/singleton.html)化されがちで、そちらの問題を併発しやすい

## 適用条件

- 定型の呼び出し手順が複数箇所で必要
- サブシステムの詳細を知るべきでない利用者が多い

## 避けるべき条件

- サブシステムが単純(1〜2クラス)→ 窓口はただの転送
- 利用パターンが毎回違う → 高水準APIが作れない

## 似たパターンとの違い

- [Adapter](/design/patterns/adapter.html): 形の**変換**(合わないものを合わせる)。Facadeは**単純化**(多を少に)
- [Mediator](/design/patterns/mediator.html): サブシステム同士の**相互通信**を仲介する。Facadeは外から内への一方向の窓口
- [Proxy](/design/patterns/proxy.html): 同一インターフェースの代理。Facadeは新しい(より単純な)インターフェースを定義する

## 実務でよく見かける変形

- 「Manager」と呼ばれるクラスの多くは、Facade+Singleton+状態管理の混合物。Facade部分(定型手順)と状態は分離できるとレビューしやすい
- レイヤードアーキテクチャの層間APIは、層全体へのFacadeとみなせる

## 過剰設計になる例

`InputFacade.IsJumpPressed()` が `Input.GetButtonDown("Jump")` を転送するだけ——1行を1行で包んでも単純化していません(入力の場合はリバインド対応など**別の目的**があれば正当化されます → [ケーススタディ: プレイヤー入力](/design/case-studies/player-input.html))。

## 関連項目

- [Adapter](/design/patterns/adapter.html) / [Mediator](/design/patterns/mediator.html) / [Singleton](/design/patterns/singleton.html)
- [ケーススタディ: サウンド管理](/design/case-studies/sound-manager.html) / [画面遷移](/design/case-studies/screen-transition.html)

## 理解度チェック

1. FacadeとAdapterの目的の違いを一言で言えますか。
2. Facadeが神クラス化する典型経路と予防策は?
3. 「Facadeを通さずサブシステムを直接使う」ことは違反ですか?

## 演習

「実績解除」の手順(条件確認→解除記録→プラットフォームAPI送信→UI通知)が3か所にコピペされている状況を想定し、Facadeを設計してください。また、このFacadeに置く**べきでない**機能(例: 実績条件の判定ロジック自体)を1つ挙げ、理由を書いてください。

---

関連項目：[Decorator](/design/patterns/decorator.html) / [学習ガイド](/design/patterns/) / [Flyweight](/design/patterns/flyweight.html)
