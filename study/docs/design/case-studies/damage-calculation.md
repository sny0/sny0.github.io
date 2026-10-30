---
title: ダメージ計算の設計
study:
  source: C++ Wiki
  status: published
  summary: 純粋関数(入力→出力、副作用なし)で始めるのが正解。この形はテストが1行で書けます。 クリティカル、属性相性、バフ/デバフ、装備効果、スキル倍率… → 引数が増え続け、関数内が仕様の堆積地層に
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-07-ダメージ計算" class="study-legacy-anchor" aria-hidden="true"></div>

# ダメージ計算の設計

## 素朴な実装

```cpp
// C++20
int CalcDamage(const Attacker& atk, const Defender& def) {
    return std::max(1, atk.power * 2 - def.defense);
}
```

**純粋関数(入力→出力、副作用なし)で始めるのが正解**。この形はテストが1行で書けます。

## 機能追加で破綻する過程

1. クリティカル、属性相性、バフ/デバフ、装備効果、スキル倍率… → 引数が増え続け、関数内が仕様の堆積地層に
2. 「盾は最初の10ダメージを吸収」「HPが1残る加護」→ **計算だけでなく適用順序と副作用**(盾の耐久減少)が混ざる
3. 「毒は防御無視」「このボスは炎無効」→ 特例のif文が地層に割り込み、**どの仕様が生きているか誰にも分からない**
4. バランス調整のたびプログラマ作業+「表示用の予測ダメージ」(UI)と実計算がコピペで乖離

## 案A: フェーズ分けした計算パイプライン(定石)

仕様書の形(「基礎値→加算→乗算→軽減→最終補正」)をそのままコードにします。

```cpp
struct DamageContext {                 // 計算の途中経過を運ぶ(入力は全部ここに)
    const Attacker& atk; const Defender& def;
    float base = 0, addBonus = 0, multiplier = 1.f;
    int final_ = 0;
    std::vector<std::string> log;      // ★計算ログ(デバッグ・検証の命綱)
};

int CalcDamage(DamageContext& ctx) {
    ComputeBase(ctx);        // フェーズ1: 基礎値
    ApplyAdditives(ctx);     // フェーズ2: 加算系を全部合計(装備・バフを列挙)
    ApplyMultipliers(ctx);   // フェーズ3: 乗算系(クリティカル・相性)
    ApplyReductions(ctx);    // フェーズ4: 軽減(防御・盾)
    ApplyFinalRules(ctx);    // フェーズ5: 最終(最低1、HP1残しの加護)
    return ctx.final_;
}
```

- **順序が構造として固定**され、「加算してから乗算」問題([Decoratorの適用順問題](/design/patterns/decorator.html))が消える
- 修飾の列挙(フェーズ2,3)は効果リスト([ステート異常](/design/case-studies/status-effects.html))から集める——効果側は「自分は加算+10」と申告するだけ
- 純粋関数性を保てばUIの予測ダメージも**同じ関数**で出せる(乖離の根絶)。乱数(クリティカル)は「乱数値を引数で渡す」ことで純粋性を守る(→ リプレイ・テストも可能に)

## 案B: Chain of Responsibility / Decorator案

軽減段階を[Chainのページ](/design/patterns/chain-of-responsibility.html)のように処理オブジェクトの鎖にする。

- 利点: キャラごとに鎖の構成を変えられる(この敵だけ特殊軽減)
- 欠点: 計算全体が鎖になると順序が実行時構成に依存し、**バランス検証が困難**に。「軽減フェーズの内部」だけ鎖にする限定適用が現実的

## 案C: データ駆動(式のデータ化)案

倍率・相性表をデータ化(これは案Aと併用で必須)。さらに式自体をデータにする([Interpreter](/design/patterns/interpreter.html)/[Bytecode](/game/patterns/type-object-and-sandbox.html))のは、調整主体が完全に企画で頻度が高いタイトル(運営型RPG)向け。

- 利点: 調整がデータ配信で完結
- 欠点: 式のエラー処理・デバッグ環境まで作る大工事。フェーズ構造+係数のデータ化で足りるなら不要

## 案D: パターンを使わない簡潔案

素朴な純粋関数のまま、**仕様をコメントで章立てして1関数に保つ**。仕様が10個以下で安定なら、1画面で全仕様が読めるこの形が最強の可読性を持ちます。

## 継承案について

`Damage` クラスの継承階層(PhysicalDamage/MagicDamage/...)は、計算という「手続き」を型階層にする無理があり、属性×クリティカル×貫通の組み合わせで破綻します。**属性はデータ(enum+相性表)、手続きはフェーズ**が素直です。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(仕様5個以下) | 案D(1つの純粋関数) |
| 中(修飾が増え続ける) | 案A(フェーズ+効果申告)+係数データ化 |
| 大(運営・毎週調整) | 案A+案C(相性・係数は完全データ)+計算ログをQAツール化 |

## この題材の教訓

- **計算は純粋関数に、適用(HP減少・耐久減少)は分離**——テスト・UI予測・リプレイの全てがこれで手に入る([テスト容易性](/design/foundations/quality-attributes.html))
- パターン(Chain/Decorator)より先に「**仕様書のフェーズ構造をそのまま写す**」——構造が仕様と同型なら、仕様変更は必ず1か所に落ちる

---

関連項目：[セーブデータ](/design/case-studies/save-data.html) / [学習ガイド](/design/case-studies/) / [UI通知](/design/case-studies/ui-notification.html)
