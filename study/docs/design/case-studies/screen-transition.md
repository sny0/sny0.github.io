---
title: 画面遷移の設計
study:
  source: C++ Wiki
  status: published
  summary: タイトル→ステージ選択→ゲーム→ポーズ→リザルト——「今どの画面で、次にどこへ行けるか」の管理です。 小さいゲームならこのenum+switchのFSMで十分です(FSM)。
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-10-画面遷移" class="study-legacy-anchor" aria-hidden="true"></div>

# 画面遷移の設計

タイトル→ステージ選択→ゲーム→ポーズ→リザルト——「今どの画面で、次にどこへ行けるか」の管理です。

## 素朴な実装

```cpp
// C++20
enum class Screen { Title, StageSelect, Game, Result };
Screen g_current = Screen::Title;

void Update() {
    switch (g_current) {
        case Screen::Title:
            if (Input::Decide()) g_current = Screen::StageSelect;
            break;
        // ...各画面の更新と遷移
    }
}
```

小さいゲームならこの**enum+switchのFSM**で十分です([FSM](/game/patterns/state-machines.html))。

## 機能追加で破綻する過程

1. **ポーズは「重なる」**: ゲーム画面の上にポーズが乗り、閉じたら**元の状態のまま**ゲームに戻る——単一currentの遷移では「戻り先」を覚えられない
2. 遷移時の後始末・準備(BGM停止、アセットのロード/解放、フェード)が遷移箇所ごとにコピペされ、抜け漏れ(前の画面のBGMが残る)
3. 非同期ロードを挟む遷移(ロード画面)で、遷移中にさらに遷移要求が来て競合(連打で二重遷移)
4. 「設定画面はタイトルからもポーズからも開ける」→ 戻り先が呼び出し元依存に

## 案A: スタック型画面管理(定石)

「重なる・戻る」をスタックで表現します([Stateのスタック型変形](/design/patterns/state.html))。

```cpp
class Screen {
public:
    virtual ~Screen() = default;
    virtual void OnEnter() {}
    virtual void OnExit() {}
    virtual void OnPause() {}        // 上に画面が乗った
    virtual void OnResume() {}       // 上の画面が消えた
    virtual void Update(float dt) = 0;
};

class ScreenStack {
public:
    void Push(std::unique_ptr<Screen> s);   // ポーズ・設定 = Push(下は生きたまま)
    void Pop();                              // 閉じる = Pop(下がOnResume)
    void Replace(std::unique_ptr<Screen> s); // タイトル→ゲーム = 入れ替え
    void Update(float dt) { if (!stack_.empty()) stack_.back()->Update(dt); }
private:
    std::vector<std::unique_ptr<Screen>> stack_;   // 所有
};
```

- 「設定画面の戻り先」問題はPopするだけで自動解決(呼び出し元を知る必要がない)
- OnEnter/OnExitに準備・後始末が集約され、コピペ抜け漏れが消える([Template Method](/design/patterns/template-method.html)的なフック)
- 描画は「スタック全部を下から」、更新は「最上位のみ」(または画面ごとに透過フラグ)が定石

## 案B: 遷移をFacade+非同期フローで包む

連打・競合対策として、遷移手続きを1か所に(→ [Facadeの例](/design/patterns/facade.html)がまさにこれ)。

```cpp
// 遷移中フラグ+要求の直列化。「フェード→ロード→切替→フェードイン」を1つの関数(コルーチン)に
// 遷移中の新規要求は拒否 or 最後の1件だけ保持、をここで一元的に決める
```

## 案C: データ駆動遷移(大規模向け)

「どの画面からどの画面へ行けるか」を遷移テーブル(データ)にし、汎用マシンが実行。画面数十・フロー変更が頻繁なタイトル(ソシャゲのアウトゲーム)で採用されます。デバッグ(任意画面ジャンプ)もテーブルから作れる。

- 欠点: 個別画面の特殊事情(この遷移だけ演出が違う)がデータの表現力を超えがち

## 案D: パターンを使わない簡潔案

enum+switch(素朴版)+ポーズだけ特別扱い(`bool paused` でゲーム更新を止め、ポーズUIを上に描く)。**画面が5個以下・重なりがポーズのみ**なら、これが最短で正しい。

## 継承 vs コンポジションの観点

案AのScreen派生(継承)はフレームワーク規約としての浅い継承で健全([Template Method](/design/patterns/template-method.html)の適用条件)。画面の中身が複雑になったら、画面クラス自体は薄くし、中身をコンポーネント/[Mediator](/design/patterns/mediator.html)(部品調整)に分けます。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(画面〜5、重なりはポーズのみ) | 案D |
| 中 | 案A(スタック)+案B(遷移Facade) |
| 大(画面数十・アウトゲーム複雑) | 案A+案C(テーブル)+画面のプリロード管理 |
| Unity | 案AをSceneManager(Additive)やPrefab画面で実装。遷移FacadeはasyncメソッドID |
| UE | レベル遷移+UMGのWidgetスタック(CommonUIプラグインがまさに案Aの製品化) |

## この題材の教訓

- 「画面」には**入れ替わる遷移**と**重なる遷移**の2種類がある。単一FSMは前者しか表現できず、後者が現れた瞬間がスタック導入の合図
- 遷移の競合(連打・非同期中の要求)は必ず起きる。**遷移の入口を1つに絞る**(Facade)ことが品質の分かれ目

---

関連項目：[オブジェクト生成](/design/case-studies/object-spawning.html) / [学習ガイド](/design/case-studies/) / [サウンド管理](/design/case-studies/sound-manager.html)
