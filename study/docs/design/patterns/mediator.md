---
title: "Mediator"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "多数のオブジェクトが互いに直接参照し合って通信すると、N個の部品にN×Nの結合が生まれる。相互作用を仲介役1つに集約し、各部品は仲介役だけを知る形にしたい。 Mediator: 部品間の調整ロジックを一手に持つ(誰が変わったら誰を更新するか)"
---

# Mediator

## 解決する問題

多数のオブジェクトが**互いに直接参照し合って**通信すると、N個の部品にN×Nの結合が生まれる。相互作用を**仲介役1つに集約**し、各部品は仲介役だけを知る形にしたい。

## 登場人物と責務

- **Mediator**: 部品間の調整ロジックを一手に持つ(誰が変わったら誰を更新するか)
- **Colleague(部品)**: 自分の変化をMediatorに通知するだけ。他の部品を知らない

## 最小構成図

```
悪い: 装備画面で  [装備リスト]⇄[ステータス表示]⇄[プレビュー]⇄[比較パネル] が相互参照(N×N)

良い:              [装備リスト] ─┐
                   [ステータス] ─┼──> EquipScreenMediator(調整はここだけ)
                   [プレビュー] ─┤
                   [比較パネル] ─┘
```

## パターンなしの実装

```cpp
// C++20(問題例)— UI部品が互いを直接知っている
class EquipListView {
public:
    StatusPanel* status;      // 生ポインタ多数: 誰が誰を所有しているかも曖昧
    PreviewPane* preview;
    ComparePanel* compare;
    void OnSelect(const Item& item) {
        status->ShowWith(item);       // 選択が変わったら3つを自分で更新
        preview->ShowModel(item);
        compare->CompareWith(item);
    }
};
// ComparePanelも選択に影響し…と続くと、部品追加のたび全部品を修正
```

## 問題点

- 部品追加・削除で**他の全部品**を修正(結合がN×Nで成長)
- 各部品が画面全体の仕様(誰を更新すべきか)を知ってしまい、単体で再利用できない
- 更新の連鎖(AがBを更新→BがCを…)で無限ループや順序バグ

## パターン適用後のC++コード

```cpp
// C++20
#include <string>

class EquipScreenMediator;   // 前方宣言

class Widget {                    // Colleague基底
public:
    explicit Widget(EquipScreenMediator& m) : mediator_(m) {}
    virtual ~Widget() = default;
protected:
    EquipScreenMediator& mediator_;   // 仲介役だけを知る(参照: 画面が全体を所有)
};

class EquipListView : public Widget {
public:
    using Widget::Widget;
    void OnSelect(const Item& item);   // 実装は下(Mediatorに伝えるだけ)
};
class StatusPanel : public Widget {
public:
    using Widget::Widget;
    void ShowWith(const Item& item) { /* 表示更新 */ }
};
class PreviewPane : public Widget {
public:
    using Widget::Widget;
    void ShowModel(const Item& item) { /* 3D表示 */ }
};

class EquipScreenMediator {       // 画面の調整ロジックはここに凝集
public:
    void OnItemSelected(const Item& item) {
        status_->ShowWith(item);
        preview_->ShowModel(item);
        // 部品が増えてもこの1か所に足すだけ
    }
    // 部品の生成・所有・接続(省略)
private:
    StatusPanel* status_ = nullptr;    // 生ポインタ: Mediator(画面)が部品の寿命を管理
    PreviewPane* preview_ = nullptr;
};

inline void EquipListView::OnSelect(const Item& item) {
    mediator_.OnItemSelected(item);   // 「選択された」と伝えるだけ。誰が反応するかは知らない
}
```

構造検証用サンプル: <a href="/study/samples/cpp/pattern_mediator.cpp">samples/pattern_mediator.cpp</a>

## C#またはUnityでの実装

```csharp
// 画面(Presenter/Screenクラス)がMediatorになる形がUnity UIの定石
public class EquipScreen : MonoBehaviour {
    [SerializeField] private EquipListView list;
    [SerializeField] private StatusPanel status;
    [SerializeField] private PreviewPane preview;

    private void Awake() {
        list.ItemSelected += OnItemSelected;   // 部品→画面はevent(部品は画面を知らない)
    }
    private void OnItemSelected(Item item) {   // 画面→部品は直接呼ぶ(画面は部品を知ってよい)
        status.ShowWith(item);
        preview.ShowModel(item);
    }
}
```

「部品は上(画面)に**イベントで**報告、画面は下(部品)を**直接**制御」— この非対称が保守しやすいMediatorの形です(→ [MVC/MVP/MVVM](/game/patterns/mvc-mvp-mvvm.html)のPresenterはこの発展形)。

## ゲームでの具体例

- 複雑なUI画面(装備、ショップ、スキルツリー): 部品間の連動を画面クラスに集約
- 対戦の審判(GameRules): プレイヤー・盤面・タイマーの相互作用を審判が調整
- 管制塔の比喩: 飛行機(部品)同士は交信せず、管制塔(Mediator)とだけ交信 — ただし比喩の限界として、実際のMediatorは「調整ロジックの置き場所」であり、通信の中継だけではない

## 利点

- 結合がN×NからN×1に減る。部品が画面仕様から独立し再利用可能に
- 相互作用のルールが1か所に集まり、「この画面で何が起きるか」が1ファイルで読める
- 更新の順序・ループ防止を1か所で制御できる

## 欠点

- **Mediatorが神クラス化しやすい**(全調整ロジックが集まるため必然的に大きくなる)。画面単位で分割し、肥大したら画面自体の分割を疑う
- 間接化により「ボタンを押すと何が起きるか」を追うのにMediator経由の1ホップが挟まる
- 部品→Mediatorの通知手段(イベント/インターフェース)の設計が別途必要

## 適用条件

- 部品同士の相互作用が多く(目安: 3部品以上が連動)、追加・変更が続く
- 部品を他の画面でも再利用したい

## 避けるべき条件

- 部品が2つで連動が単純 → 直接参照で十分
- 相互作用がない(単に並んでいるだけ)→ 調整役は不要

## 似たパターンとの違い

- [Observer](/design/patterns/observer.html): Mediatorの実装部品としてよく使う(部品→Mediatorの通知)。Observerだけだと「誰が誰を購読しているか」が分散する。Mediatorは調整を**中央集権**にする
- [Facade](/design/patterns/facade.html): 外→内の一方向の窓口 vs 内部部品同士の相互作用の調整
- [Message Bus](/game/patterns/event-queue-and-pubsub.html): 全域の疎結合通信。Mediatorは**局所**(1画面・1システム内)の密な調整。全部Busに流すと調整ロジックの置き場が消えて追跡不能になる

## 実務でよく見かける変形

- Presenter(MVP)/ Controller: UIにおけるMediatorの制度化
- GameMode/審判クラス: ルール調整のMediator(UEのGameModeもこの役割 → [第10部](/game/unreal/gameplay-framework.html))

## 過剰設計になる例

ボタン2つの確認ダイアログにMediator+イベント+インターフェースの完全装備——OKボタンがダイアログを直接閉じてよいのです。

## 関連項目

- [Observer](/design/patterns/observer.html) / [Facade](/design/patterns/facade.html) / [MVC・MVP・MVVM](/game/patterns/mvc-mvp-mvvm.html)
- [ケーススタディ: UI通知](/design/case-studies/ui-notification.html)

## 理解度チェック

1. Mediatorが減らす結合は「何から何へ」ですか。
2. 「部品は上にイベント、画面は下に直接」の非対称が良い理由は?
3. MediatorとMessage Busの使い分けの基準は?

## 演習

ショップ画面(商品リスト・所持金表示・購入ボタン・詳細パネル)の連動仕様を書き出し、Mediator方式で設計してください。「所持金不足なら購入ボタンを無効化」のロジックがどこに置かれるべきかに注目。

---

前: [Iterator](/design/patterns/iterator.html) | [カテゴリ目次](/design/patterns/) | 次: [Memento](/design/patterns/memento.html)
