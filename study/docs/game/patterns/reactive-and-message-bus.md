---
title: "Reactive Programming"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "「値の変化」や「イベントの発生」を時間軸上のストリーム(流れ)として扱い、それを変換・合成・購読する宣言的なスタイル。「HPが変わったらUIを更新」を、手続き(変わった箇所で全部呼ぶ)ではなく関係の宣言(UIはHPに追従する)として書く。"
---

# Reactive Programming

## 一言で言うと

「値の変化」や「イベントの発生」を**時間軸上のストリーム(流れ)**として扱い、それを**変換・合成・購読**する宣言的なスタイル。「HPが変わったらUIを更新」を、手続き(変わった箇所で全部呼ぶ)ではなく**関係の宣言**(UIはHPに追従する)として書く。

[Observer](/design/patterns/observer.html)を数学的に整備し、演算子(map/filter/merge等)で合成可能にしたもの、と捉えると理解が速いです。

## 解決したい問題

イベント絡みのロジックは、素朴に書くと**状態フラグと時間管理のスパゲッティ**になります。

```csharp
// 問題例: 「0.5秒以内に2回押したらダッシュ」を手続きで書く
private float lastPressTime;
private int pressCount;
void Update() {
    if (Input.GetKeyDown(KeyCode.D)) {
        if (Time.time - lastPressTime < 0.5f) pressCount++;
        else pressCount = 1;
        lastPressTime = Time.time;
        if (pressCount >= 2) { StartDash(); pressCount = 0; }
    }
    // この種の「時間と回数の絡む条件」がゲームには無数にある(長押し、連打、コンボ…)
}
```

## Reactiveで書くと

```csharp
// C#(R3/UniRx系のイメージ)— 「関係」を宣言する
keyDownStream                       // Dキー押下のストリーム
    .TimeInterval()                 // 前回からの間隔付きに変換
    .Where(t => t.Interval < TimeSpan.FromSeconds(0.5))  // 0.5秒以内のみ通す
    .Subscribe(_ => StartDash());
```

状態変数(lastPressTime, pressCount)が**消え**、仕様がコードの形にそのまま現れます。

### ReactiveProperty(ゲームで一番使う形)

```csharp
// 「値+変更通知」のセル。MVVMのViewModel(→ MVC・MVP・MVVM参照)の部品になる
public class PlayerModel {
    public readonly ReactiveProperty<int> Hp = new(100);
}
// UI側: 宣言的に追従を張る(購読解除はAddToで寿命に紐付け)
model.Hp.Subscribe(hp => hpBar.fillAmount = hp / 100f).AddTo(this);
model.Hp.Where(hp => hp <= 20).Subscribe(_ => ShowLowHpWarning()).AddTo(this);
// 発行側: model.Hp.Value -= damage;  — UIのことは知らない
```

## 主要な演算子(概念だけ)

| 演算子 | 意味 | ゲームでの例 |
|---|---|---|
| Where | 条件で間引く | HP20%以下のときだけ |
| Select (map) | 値を変換 | HP→表示用文字列 |
| Merge | 複数ストリームを合流 | キーボードとパッドの入力を統合 |
| CombineLatest | 複数の最新値を組む | 「所持金」と「価格」から購入可否を導出 |
| Throttle/Debounce | 時間で間引く | 連打防止、検索入力の確定待ち |
| Buffer | まとめる | 同フレームのダメージ集約 |

## C++での位置づけ

C++にはUniRx級の定番はなく(RxCppはあるがゲームでの採用は少数)、同じ要求は[Event Queue](/game/patterns/event-queue-and-pubsub.html)+手書きロジック、あるいはフレーム処理として書くのが普通です。**Reactiveは「C#/Unity圏で特に発達したスタイル」**という位置づけで理解してください。

## Unity/C# との対応

- **R3**(UniRxの後継、現行推奨)/ UniRx: ReactiveProperty、UIイベントのストリーム化、`AddTo(this)` によるGameObject寿命連動の購読解除
- **UniTask**との関係: 単発の非同期(1回きりのロード完了)はasync/await(UniTask)、**繰り返すイベント**はストリーム(R3)、が使い分けの目安
- UI Toolkitのbinding、VisualScriptingにも部分的に思想が入っている

## Unreal Engine との対応

- 直接の対応物はない。Delegateの多播+BPが同ニッチを占める。「値の変更通知」はゲッター+OnRep(ネットワーク)や手書きDelegateで実現するのが普通
- つまり**UEに移るとReactive前提の設計は持ち込めない**ことに注意(エンジンの流儀に合わせる)

## 利点

- 時間・回数・合成の絡むロジックが宣言的に短く書ける(中間状態変数の消滅)
- 購読の寿命管理を機構化できる(`AddTo`)— [Observerの解除忘れ](/design/patterns/observer.html)への体系的な回答
- MVVMのバインディング基盤になる

## 欠点

- **学習コストが高い**(演算子の語彙、ストリーム思考への転換)。チーム全員が読めないと保守不能になる
- **デバッグが難しい**: ブレークポイントを張ってもラムダの中と演算子の内部を飛び回り、「なぜ発火しなかったか」の調査が困難
- アロケーション: 購読・クロージャはヒープを使う。毎フレーム大量に流すと(→ [UnityのGC](/languages/csharp/memory-management-vs-gc.html))問題化。R3はこの点を大きく改善している
- 単純な処理には過剰(`OnClick += Buy` で済むものをストリームにしない)

## 使う場面 / 使わない場面

- **使う場面**: UIの状態同期(MVVM)、時間・回数の絡む入力解釈、複数ソースの合成(CombineLatest的な導出値)。チームにRx経験者がいる
- **使わない場面**: 単発の処理、パフォーマンスクリティカルな毎フレーム処理、Rxを知らないメンバーが多いプロジェクト(可読性は共有知識に依存する)、UE移植が視野にある共通コード

## よくある誤解

- 「Reactive=UniRxというライブラリのこと」— スタイルの名前です。ライブラリはその実装(現行はR3が主流)
- 「全部ストリームにするのが正しい」— イベントスパゲッティがストリームスパゲッティになるだけ。**濃い部分(UI同期・入力解釈)に限定**が実務解

## 関連項目

- [Observer](/design/patterns/observer.html) / [Event Queue・Pub/Sub](/game/patterns/event-queue-and-pubsub.html) / [MVC・MVP・MVVM](/game/patterns/mvc-mvp-mvvm.html)
- [ケーススタディ: UI通知](/design/case-studies/ui-notification.html)

## 理解度チェック

1. Reactiveが「消してくれる」ものは何ですか(ダブルタップの例で)。
2. ReactivePropertyとC#の通常のeventの違いは?(値の保持と初回通知の観点で)
3. Reactiveを採用すべきでないチーム状況とは?

## 演習

「所持金(ReactiveProperty)と商品価格から『購入ボタンの活性状態』を導出する」処理を、(a) 手続き型(変更箇所すべてでUpdateButtonを呼ぶ)、(b) Reactive(CombineLatest相当)の擬似コードで書き比べ、(a)の「呼び忘れリスク」が(b)でどう消えるかを説明してください。

---

前: [MVC・MVP・MVVM](/game/patterns/mvc-mvp-mvvm.html) | [カテゴリ目次](/game/patterns/) | 次: [演習](/game/patterns/exercises.html)
