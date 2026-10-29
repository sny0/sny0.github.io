---
title: "第3部 演習 — GoFデザインパターン"
study:
  source: "C++ Wiki"
  kind: "演習"
  status: "既存原稿"
  summary: "パターン名の暗記ではなく「問題→選択肢→判断」の練習です。まず自力で解いてから解答を開いてください。 次の要求に対して第一候補となるパターン(または「パターン不要」)を答えてください。"
---

# 第3部 演習 — GoFデザインパターン

パターン名の暗記ではなく「問題→選択肢→判断」の練習です。まず自力で解いてから解答を開いてください。

## 問1. 概念確認(逆引き)

次の要求に対して第一候補となるパターン(または「パターン不要」)を答えてください。

1. ミドルウェアSDKの型と作法がコード全域に漏れている
2. バフが複数同時に乗り、時間で切れる
3. 「敵を倒したら」に反応するシステムが5つある
4. レベルエディタにUndoが必要
5. ボタンが2つある設定画面を作る
6. 起動時に全読みしているアセットで、メモリピークが問題になった

<details><summary>解答</summary>

1. [Adapter](/design/patterns/adapter.html)(境界に変換層)。2. [Decorator](/design/patterns/decorator.html)のリスト方式(修飾パイプライン)。3. [Observer](/design/patterns/observer.html)(発生源は5システムを知らない)。4. [Command](/design/patterns/command.html)(逆操作)または[Memento](/design/patterns/memento.html)(スナップショット)、規模で選ぶ。5. **パターン不要**(直接書く)。6. [Proxy](/design/patterns/proxy.html)(遅延ロード)+事前ロードAPI。——複数解が成立する問いもある。理由を言えることが重要。
</details>

## 問2. コード読解

```cpp
// C++20
class Door {
public:
    void Update(Player& p) { state_ = state_->Update(*this, p); }
    // ...
private:
    IDoorState* state_;   // Open/Closed/Lockedのいずれか
};
```

1. これは何パターンですか。StrategyではなくそのパターンだとU判断できる根拠は?
2. `state_` が生ポインタでも安全に設計できる方法を1つ挙げてください。

<details><summary>解答</summary>

1. [State](/design/patterns/state.html)。`Update` の戻り値で**自分自身が次の状態を決めて遷移**している(Strategyなら外部が装着し、自分では替わらない)。
2. 状態オブジェクトを状態ごとに1個のstaticインスタンス(状態自身がデータを持たない設計)にして共有する——寿命が問題にならなくなる。あるいは`unique_ptr`所有に変える。前者はアロケーションも消えるため、頻繁に遷移するゲームでは定石([State](/design/patterns/state.html)の変形)。
</details>

## 問3. 問題のあるコードの改善

「武器強化画面を開くたび、強化値計算・素材チェック・UI更新・保存のコードが `UpgradeScreen::OnClick` に600行」——この画面で使えるパターンを2つ以上組み合わせた改善案の骨格(クラス名と責務のみ)を書いてください。

<details><summary>解答の要点</summary>

例: 計算・素材チェックを `UpgradeService`(ロジック、UIなし)に抽出([SRP](/design/solid/srp.html))。画面部品間の連動は `UpgradeScreen` を[Mediator](/design/patterns/mediator.html)に。保存はイベント発行([Observer](/design/patterns/observer.html))か `SaveFacade`([Facade](/design/patterns/facade.html))へ。強化結果のプレビューは計算を純関数にすれば無料でつく。**「どのパターンか」より「変更理由ごとの分離が先、パターンはその手段」**という順序が正解の骨格。
</details>

## 問4. 設計比較

「敵のドロップ抽選」を (a) `Enemy::RollDrop()` に直書き、(b) `IDropStrategy` 注入、(c) ドロップテーブルをデータ化([Type Object](/game/patterns/type-object-and-sandbox.html)方向)で比較し、「運用でドロップ率を毎週調整するタイトル」ならどれを選ぶか判断してください。

<details><summary>解答の要点</summary>

(a) 最小コスト。調整=コード修正+ビルド+配信。(b) 抽選**アルゴリズム**が複数あるなら意味があるが、率の調整だけなら過剰。(c) 率・内容の調整がデータ配信で完結——毎週調整の運用ならこれ一択に近い。パターン(Strategy)は「アルゴリズムの差」に効く道具で、「数値の差」にはデータ化が効く、という区別が本問の核心。
</details>

## 問5. デバッグ問題

Observer実装で「ステージを2周すると、敵死亡時のスコア加算が2倍になる」バグが出ました。最も疑わしい原因と、恒久対策を答えてください。

<details><summary>解答</summary>

原因: ステージ開始時に購読(`Subscribe`)し、終了時に解除していない——2周目で同じリスナーが二重登録され、通知が2回届く。対策: 解除を購読と対で書く(C#: OnDisableで`-=`、C++: 購読トークンのRAII化)、または二重登録を検出するアサート。[Observer](/design/patterns/observer.html)の「解除忘れ」はリークだけでなく**多重実行**としても現れる、が教訓。
</details>

## 問6. 説明問題

「DecoratorとProxyとAdapterは全部『包む』パターンですよね。何が違うんですか?」への回答を3文で書いてください。

<details><summary>解答例</summary>

包んだ結果のインターフェースと目的が違う。Adapterは**形を変えて**合わないものを繋ぎ、Proxyは**同じ形のまま**アクセスを管理し(遅延・保護)、Decoratorは**同じ形のまま機能を積み増す**(何枚も重ねる前提)。「形が変わるか」「目的が管理か追加か」の2軸で見分けるとよい([Adapter](/design/patterns/adapter.html)/[Proxy](/design/patterns/proxy.html)/[Decorator](/design/patterns/decorator.html))。
</details>

## 問7. 小規模実装問題

ミニ実装課題(検証サンプルを土台にしてよい):

1. [Command](/design/patterns/command.html): 盤上の駒の移動をUndo付きで実装(<a href="/study/samples/cpp/pattern_command.cpp">samples/pattern_command.cpp</a>を拡張し「駒の生成」コマンドを追加)
2. [Observer](/design/patterns/observer.html)+[State](/design/patterns/state.html)の連携: 敵の状態遷移(巡回→追跡)をイベントで通知し、BGM切替の購読者を付ける
3. [Flyweight](/design/patterns/flyweight.html): 弾種データ共有の弾幕(1万発)を実装し、共有なし版とのメモリ差をsizeof計算で示す

<details><summary>取り組みの指針</summary>

各サンプル(samples/pattern_*.cpp)がコンパイル可能な出発点。評価基準は「動く」ことより、(a) 所有権が明確か(誰がdeleteするか)、(b) パターンの可変点が要件と一致しているか、(c) 「これはパターンなしでも書けたか?」に答えられるか。3問とも「なしで書いた場合」との差分を一言で書けたら合格。
</details>

---

前: [Visitor](/design/patterns/visitor.html) | [カテゴリ目次](/design/patterns/) | [第4部: ゲームプログラミングパターンへ](/game/patterns/)
