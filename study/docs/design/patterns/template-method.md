---
title: "Template Method"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "複数のクラスで処理の骨格(手順)は同じだが、一部の工程だけが違う。骨格を基底クラスに1回だけ書き、可変部分だけをサブクラスに上書きさせたい。 ※ C++のテンプレート(template)とは無関係の用語です。「手順のひな型(template)」の意。"
---

# Template Method

## 解決する問題

複数のクラスで**処理の骨格(手順)は同じだが、一部の工程だけが違う**。骨格を基底クラスに1回だけ書き、可変部分だけをサブクラスに上書きさせたい。

※ C++の[テンプレート](/languages/cpp/templates-and-concepts.html)(template)とは無関係の用語です。「手順のひな型(template)」の意。

## 登場人物と責務

- **AbstractClass**: 骨格メソッド(template method)を持ち、可変工程を仮想関数(フック)として宣言
- **ConcreteClass**: フックだけを実装・上書きする

## 最小構成図

```
GameMode(基底)
  RunMatch() {          ← 骨格: 順序はここで固定。finalにして子に触らせない
      Setup();            ← フック(純粋仮想: 必ず実装)
      SpawnPlayers();     ← フック(デフォルトあり: 任意で上書き)
      while(!IsMatchOver()) Tick();   ← フック
      ShowResult();       ← フック
  }
├ DeathmatchMode: IsMatchOver = キル数到達
└ RaceMode:       IsMatchOver = ゴール到達
```

## パターンなしの実装

```cpp
// C++20(問題例)— モードごとに手順全体をコピペ
class DeathmatchMode {
public:
    void RunMatch() {
        LoadStage(); ResetScore(); SpawnAll();      // 共通部分(コピー1)
        while (topKills_ < 10) TickBattle();
        ShowRanking();                               // 共通部分(コピー1)
    }
};
class RaceMode {
public:
    void RunMatch() {
        LoadStage(); ResetScore(); SpawnAll();      // 共通部分(コピー2)…微妙に順番が違ったりする
        while (!goalReached_) TickRace();
        ShowRanking();
    }
};
```

## 問題点

- 手順の共通部分がコピペされ、「マッチ開始の仕様変更」で全モードを修正(知識の重複 → [DRY](/design/foundations/yagni-kiss-dry.html))
- コピペ時の微妙な差分(順序の違い)が意図か事故か分からなくなる

## パターン適用後のC++コード

```cpp
// C++20
class GameMode {
public:
    virtual ~GameMode() = default;

    // 骨格: 手順と順序はここだけが決める(virtualにしない=子に順序を触らせない)
    void RunMatch() {
        LoadStage();
        Setup();                       // 必須フック
        SpawnPlayers();                // 任意フック(デフォルトあり)
        while (!IsMatchOver()) Tick(); // 必須フック
        ShowResult();
    }

protected:
    virtual void Setup() = 0;                     // 必ず違う部分: 純粋仮想
    virtual void SpawnPlayers() { /* 標準の一斉スポーン */ }   // 大抵同じ部分: デフォルト実装
    virtual bool IsMatchOver() const = 0;
    virtual void Tick() = 0;

private:
    void LoadStage() { /* 共通 */ }               // 子に見せる必要すらない共通部分
    void ShowResult() { /* 共通 */ }
};

class DeathmatchMode : public GameMode {
protected:
    void Setup() override { topKills_ = 0; }
    bool IsMatchOver() const override { return topKills_ >= 10; }
    void Tick() override { /* 戦闘更新 */ }
private:
    int topKills_ = 0;
};
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_template_method.cpp">samples/pattern_template_method.cpp</a>

設計のコツ: **骨格は非virtual、フックはprotected virtual**(Non-Virtual Interfaceイディオム)。子が上書きできる範囲を意図的に絞ります。

## C#またはUnityでの実装

MonoBehaviourの `Awake/Start/Update` は、**エンジンが骨格(ゲームループ)を持ち、あなたがフックを実装している** Template Methodの巨大な実例です。UEの `BeginPlay/Tick` も同じ(→ [Game Loop](/game/patterns/game-loop-and-update.html))。

```csharp
public abstract class ScreenBase : MonoBehaviour {   // 画面遷移の骨格
    public async UniTask Open() {                    // 骨格: 順序を固定
        gameObject.SetActive(true);
        await OnLoadResources();     // フック
        OnSetup();                   // フック
        await PlayOpenAnimation();   // フック(デフォルト: フェード)
    }
    protected abstract UniTask OnLoadResources();
    protected abstract void OnSetup();
    protected virtual UniTask PlayOpenAnimation() => FadeIn(0.2f);
}
```

## ゲームでの具体例

- ゲームモード・ステージの共通フロー(準備→開始→終了判定→リザルト)
- 画面(Screen/Dialog)の開閉手順の共通化
- ターン制の1ターンの流れ(開始処理→行動→終了処理、ゲームごとに行動だけ違う)
- エンジンのライフサイクルフック(Awake/Start/Update、BeginPlay/Tick)

## 利点

- 手順の知識が1か所に(順序変更が基底の1修正で全モードに反映)
- 順序をサブクラスが壊せない(骨格が非virtualなら)
- 「何を実装すればモードが作れるか」が純粋仮想の一覧として明文化される

## 欠点

- **継承ベース**: サブクラスは基底の実装に強く結合する([継承の弱点](/design/foundations/inheritance-delegation-composition.html)をそのまま持つ)。フックの追加・変更が全サブクラスに波及
- 実行時にフックの組み合わせを変えられない(型で固定)
- フックが増えると「どれを上書きすべきか」が分かりにくくなる(ドキュメント必須化)
- 基底と子の間で処理が行き来する(yo-yo problem)ため、読み手はクラス間を往復する

## 適用条件

- 手順(順序)が安定していて共通、可変点が明確に少数
- フレームワーク的な使い方(多数の実装者に「この3つを書けば動く」を提供)

## 避けるべき条件

- 可変点の組み合わせが実行時に変わる → [Strategy](/design/patterns/strategy.html)(フックを注入に変える)
- 手順自体がモードごとに違う → 共通の骨格が嘘になる。無理に共通化しない
- 可変点が1つだけ → 関数1つの注入(コールバック)で十分

## 似たパターンとの違い

- [Strategy](/design/patterns/strategy.html): 同じ「可変点の差し替え」を、継承(Template Method)でやるかコンポジション(Strategy)でやるか。**実行時差し替え・組み合わせが要るならStrategy**、実装者への規約提供が目的で階層が浅いならTemplate Methodが簡潔
- [Factory Method](/design/patterns/factory-method.html): Template Methodの骨格の中の「生成する工程」がフックになった特殊形
- [Game Loop / Update Method](/game/patterns/game-loop-and-update.html): エンジンのTemplate Method的構造の実例

## 実務でよく見かける変形

- NVI(Non-Virtual Interface)イディオム: public非virtual+private virtualフック(C++の推奨形)
- フックのdelegate化: 継承の代わりに `std::function`/eventをフックポイントに刺す(Strategyへの中間形)

## 過剰設計になる例

2つのモードの共通部分が「LoadStage 1行」だけなのに骨格クラスを作る——共通部分が薄い骨格は、将来の手順分岐で必ず窮屈になります。共通化は手順が本当に同じだと確認できてから。

## 関連項目

- [Strategy](/design/patterns/strategy.html) / [Factory Method](/design/patterns/factory-method.html)
- [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)
- [Game Loop と Update Method](/game/patterns/game-loop-and-update.html)

## 理解度チェック

1. 骨格メソッドを非virtualにする理由は?
2. Template MethodとStrategyの選択基準は?
3. 「純粋仮想のフック」と「デフォルト実装のあるフック」の使い分けは?

## 演習

「クエスト実行の流れ(受注確認→開始演出→目標監視→報酬付与→完了演出)」をTemplate Methodで骨格化し、討伐クエストと収集クエストを実装してください。その後「開始演出だけ差し替えたい」要求に対し、継承のままとフック注入化のどちらが良いか検討してください。

---

前: [Strategy](/design/patterns/strategy.html) | [カテゴリ目次](/design/patterns/) | 次: [Visitor](/design/patterns/visitor.html)
