---
title: MVC・MVP・MVVM(比較)
study:
  source: C++ Wiki
  status: published
  summary: "UIの設計で「データとロジック(Model)」と「見た目(View)」を分離し、その間の仲介者の作り方で3流派に分かれます。 MVC (Model-View-Controller): 入力をControllerが受け、Modelを更新。ViewはModelを(多くの場合Observerで)監視して表"
  section: reference
  format: article
  domain: game
---

# MVC・MVP・MVVM(比較)

## 一言で言うと

UIの設計で「**データとロジック(Model)**」と「**見た目(View)**」を分離し、その間の**仲介者の作り方**で3流派に分かれます。

- **MVC (Model-View-Controller)**: 入力をControllerが受け、Modelを更新。ViewはModelを(多くの場合Observerで)監視して表示
- **MVP (Model-View-Presenter)**: **ViewとModelを完全に切り離し**、Presenterがすべて仲介。Viewは受け身の表示装置(Passive View)
- **MVVM (Model-View-ViewModel)**: ViewModelが「表示用の状態」を持ち、**データバインディング**(自動同期機構)でViewと繋がる

## 解決したい問題

```csharp
// 問題例: 全部入りUI(Unityで最頻出)
public class ShopItemCell : MonoBehaviour {
    void OnBuyButtonClicked() {
        var player = FindObjectOfType<Player>();          // ViewがModelを直接触る
        if (player.gold >= price) {                        // 業務ロジックがViewに
            player.gold -= price;
            player.inventory.Add(itemId);
            priceLabel.color = Color.gray;                 // 表示更新も混在
            GetComponent<AudioSource>().Play();
        }
    }
}
```

- 購入ルールのテストにUIシーンが必要
- UIデザイン変更(セル→リスト化)で購入ロジックが壊れる
- 同じ購入ロジックを別画面で使い回せない

つまり[関心の分離](/design/foundations/responsibility-and-separation.html)の問題です。3流派はその分離の定型です。

## MVP(ゲームUIで最も実用的な形)

```csharp
// Model: ルールとデータ。UIを一切知らない(Unityにも依存しないのでテスト可能)
public class ShopService {
    public event System.Action<int> GoldChanged;
    public bool TryBuy(ItemDef item) {
        if (gold < item.price) return false;
        gold -= item.price;
        inventory.Add(item.id);
        GoldChanged?.Invoke(gold);
        return true;
    }
    // gold, inventory は省略
}

// View: 表示と入力通知だけ。判断しない(Passive View)
public class ShopView : MonoBehaviour {
    public event System.Action<int> BuyRequested;          // 「押された」と報告するだけ
    [SerializeField] private Text goldLabel;
    public void ShowGold(int gold) => goldLabel.text = $"{gold} G";
    public void ShowBuyResult(bool ok) { /* 成功演出 or 失敗演出 */ }
    // ボタンのOnClickから BuyRequested?.Invoke(itemId)
}

// Presenter: 唯一両方を知る仲介者(Mediator的立場)
public class ShopPresenter {
    public ShopPresenter(ShopService model, ShopView view) {
        view.BuyRequested += id => view.ShowBuyResult(model.TryBuy(FindItem(id)));
        model.GoldChanged += view.ShowGold;
    }
}
```

依存の向き: View → Presenter ← Model(互いを知らない)。**ModelはUnity非依存になり単体テスト可能**、Viewは差し替え可能(モバイル版UI、デバッグ用CUI)。

## MVVM

```
[View] ←──データバインディング(自動同期)──→ [ViewModel] ──→ [Model]
         「goldTextはViewModel.GoldDisplayに紐付く」と宣言するだけで、
         ViewModel.GoldDisplay の変更が自動でViewに反映される
```

- ViewModelは「**表示のための状態**」(表示用文字列、ボタンの活性状態、選択中インデックス)を持つ。Viewのコードがほぼ消えるのが理想形
- **バインディング機構が言語/フレームワークにあるかが決定的**: WPFやWebフレームワークでは自然。素のUnity uGUIにはないため、R3/UniRx(`ReactiveProperty` → [Reactive](/game/patterns/reactive-and-message-bus.html))やUI Toolkitのruntime bindingで再現する
- 代償: バインディングは魔法的で、**繋がりがコードから見えずデバッグしにくい**。機構自体の学習・導入コスト

## 3流派の比較

| | MVC | MVP | MVVM |
|---|---|---|---|
| ViewとModelの関係 | Viewが Modelを参照(監視)することを許す | 完全分離(Presenter経由のみ) | 完全分離(ViewModel経由) |
| 仲介者の仕事 | 入力→Model更新 | 全仲介(手書き) | 表示状態の保持(同期は機構任せ) |
| 手書きの配線コード | 少 | **多**(Presenterが全部繋ぐ) | 少(機構が肩代わり) |
| 必要な下部構造 | Observer程度 | Observer程度 | **バインディング機構** |
| テスト容易性 | Model○ | Model◎ Presenter○ | Model◎ ViewModel◎ |
| ゲームでの実用度 | 概念としては常在 | **手堅い主流**(小〜大) | 機構を導入したプロジェクトで強力 |

歴史的経緯: MVCはGUI黎明期の整理で、現代の「MVC」は文脈で意味が揺れます(Web MVCとデスクトップMVCも別物)。実務では厳密な流派名より「**Modelを表示から独立させ、仲介者を1種類に統一する**」ことが重要です。

## ゲームでの適用の現実

- **全UIに適用しない**: HUDのHPバー程度なら[Observer](/design/patterns/observer.html)購読1本で十分。装備画面・ショップ・ガチャなど**状態とルールが濃い画面**にMVP/MVVMを使う
- Model相当は既にいる(ゲームロジックそのもの)。「UI用に改めてModelを作る」のではなく、**ゲームロジックをViewから守る壁**としてPresenterを立てるのが実態
- 画面部品間の調整は[Mediator](/design/patterns/mediator.html)、画面遷移は[FSM/Stack](/design/case-studies/screen-transition.html)と組み合わせる

## Unity/C# との対応

- MVP: uGUI+手書きPresenter(本ページの形)が定番
- MVVM: UI Toolkit(runtime binding)、R3/UniRxの `ReactiveProperty`+購読で実質MVVM
- ScriptableObjectをModelの置き場にする流儀もある(シーンをまたぐ状態の保持)

## Unreal Engine との対応

- UMG(Widget Blueprint)+C++の親クラス、が素朴な形。UE5の **MVVM プラグイン(UMG ViewModel)** が公式のMVVM実装で、ViewModelをBPバインディングで購読する
- SlateはRetained/宣言型UIで、属性(Attribute)にラムダを束縛する形が半分バインディング的

## 使う場面 / 使わない場面

- **使う場面**: ルールが濃く変更が多いUI(ショップ、編成、設定)。UIデザインの作り直しが予定される。UIロジックをテストしたい
- **使わない場面**: 表示するだけのHUD、ジャム・プロト(直書きが正解)、バインディング機構なしでのMVVMごっこ(手書き同期コードが増えるだけでMVPに劣る)

## よくある誤解

- 「MVCのControllerはManagerクラスのこと」— 違います。入力を解釈しModelを更新する専任の役です
- 「MVVMが最新で最良」— バインディング機構がない環境ではMVPの方が単純で確実。**環境が流派を決める**のが実態です

## 関連項目

- [Mediator](/design/patterns/mediator.html) / [Observer](/design/patterns/observer.html) / [Reactive Programming](/game/patterns/reactive-and-message-bus.html)
- [ケーススタディ: UI通知](/design/case-studies/ui-notification.html)

## 理解度チェック

1. MVPの「Passive View」とは何を禁じた形ですか。
2. MVVMの導入判断で最初に確認すべき環境要件は?
3. 「全UIにMVPを適用」が誤りである理由は?

## 演習

冒頭の `ShopItemCell`(全部入り)をMVPに分解してください。Model(ShopService)のテストを、Unityを起動せずに書けることを確認するのがゴールです。

---

関連項目：[Command Buffer と入力処理](/game/patterns/command-buffer-and-input.html) | [この分野の学習ガイド](/game/patterns/) | [Reactive Programming](/game/patterns/reactive-and-message-bus.html)
