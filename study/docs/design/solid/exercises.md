---
title: "第2部 演習 — SOLID原則"
study:
  source: "C++ Wiki"
  kind: "演習"
  status: "既存原稿"
  summary: "まず自力で解いてから解答を開いてください。 各記述がどの原則の話か答え、正誤を判定してください。 「このクラスは企画とサーバ担当の両方から変更依頼が来る」 「派生クラスで基底のメソッドを空実装した」"
---

# 第2部 演習 — SOLID原則

まず自力で解いてから解答を開いてください。

## 問1. 概念確認

各記述がどの原則の話か答え、正誤を判定してください。

1. 「このクラスは企画とサーバ担当の両方から変更依頼が来る」
2. 「派生クラスで基底のメソッドを空実装した」
3. 「敵の種類を足すたびに、既存の5つの関数を修正している」
4. 「モックを書くのに、テストと無関係な8メソッドの実装が要る」
5. 「戦闘ロジックがFMODのヘッダーをincludeしている」

<details><summary>解答</summary>

1. [SRP](/design/solid/srp.html)違反の兆候(アクターが2種類)。2. [LSP](/design/solid/lsp.html)違反のサイン(かつ[ISP](/design/solid/isp.html)の太ったインターフェースが原因のことが多い)。3. [OCP](/design/solid/ocp.html)が閉じていない状態。4. [ISP](/design/solid/isp.html)違反。5. [DIP](/design/solid/dip.html)違反の兆候(方針が詳細に依存)。——どれも「即修正すべき」ではなく、**変更・追加が実際に繰り返されているか**で修正の投資判断をするのがSOLIDの正しい使い方。
</details>

## 問2. コード読解

```cpp
// C++20
class Achievement {
public:
    virtual ~Achievement() = default;
    virtual bool Check(const GameStats& stats) = 0;
    virtual void GrantReward(Player& p) { p.AddGold(100); }  // 既定は金100
};
class FirstKill : public Achievement {
public:
    bool Check(const GameStats& s) override { return s.kills >= 1; }
};
class Pacifist : public Achievement {
public:
    bool Check(const GameStats& s) override { return s.kills == 0 && s.stageClear; }
    void GrantReward(Player& p) override { /* 何もしない: 称号のみ(別システムが付与) */ }
};
```

1. この設計はどの原則を活かしていますか。
2. `Pacifist::GrantReward` の空overrideは問題ですか。

<details><summary>解答</summary>

1. 実績の追加が新クラスの追加だけで済む([OCP](/design/solid/ocp.html))。判定と報酬が実績ごとに凝集([SRP](/design/solid/srp.html))。
2. グレー。基底の契約が「報酬を与える(何もしなくてもよい)」なら合法だが、呼び出し側が「必ず何か貰える」と期待していれば[LSP](/design/solid/lsp.html)違反。契約を明確にする(`GrantReward`が省略可能であるとコメント・命名で示す、または報酬をデータ(`RewardList`)にしてロジックから外す)のが改善。空overrideを見たら**契約を確認する**、が学ぶべき反射。
</details>

## 問3. 問題のあるコードの改善

「プレイヤーの攻撃が当たったとき」の処理です。SOLIDの観点で問題を指摘し、改善の骨格を書いてください。

```cpp
void OnHit(GameObject* target, int damage) {
    if (auto* enemy = dynamic_cast<Enemy*>(target))       enemy->hp -= damage;
    else if (auto* barrel = dynamic_cast<Barrel*>(target)) barrel->Explode();
    else if (auto* npc = dynamic_cast<Npc*>(target))       npc->StartAngryDialog();
    SaveSystem::Instance().RecordDamageDealt(damage);   // 統計を即保存
}
```

<details><summary>解答の要点</summary>

問題: (1) dynamic_cast分岐 → 対象の種類追加のたびにこの関数を修正([OCP](/design/solid/ocp.html))。分岐は「被弾時の反応」が各クラスの外にある兆候([SRP](/design/solid/srp.html)/[LSP](/design/solid/lsp.html))。(2) Singleton直呼びで保存という詳細に依存し、統計の仕様変更が攻撃処理に波及([DIP](/design/solid/dip.html))。
改善骨格: `IDamageable { virtual void OnDamaged(const HitInfo&); }` を各クラスが実装([ISP](/design/solid/isp.html)の小さい能力)。統計は `DamageDealt` イベント発行にして購読側で保存(依存の向きを逆転)。
別解: 種類が3つで確定なら分岐を残し、Singletonだけ注入に変えるのも妥当な段階的改善。全部一度に直す必要はない。
</details>

## 問4. 設計比較

「スキルのクールダウン表示UI」を作ります。次の2案を比較してください。

- 案A: UIが `SkillSystem` の具象クラスを参照し、毎フレーム `GetCooldownRemaining(i)` をポーリング
- 案B: `SkillSystem` が `ISkillObserver`(上位が定義)に `OnCooldownChanged` を通知、UIが実装

<details><summary>解答の要点</summary>

案A: 実装が単純・データフローが追いやすい。毎フレームのポーリングコスト(UI程度なら誤差)。UIがSkillSystemに依存(方向としては許容: UIは上位ではない)。テスト時はSkillSystem実物が必要。
案B: [DIP](/design/solid/dip.html)/[Observer](/design/patterns/observer.html)構成。SkillSystemはUIを知らず、通知先を差し替え可能。ただし通知の発火漏れ・寿命管理という新しいバグ源。
判断: 表示だけならAで十分なことが多い。通知を実績・サウンドも使い始めたらBへ。「UIがゲームロジックを参照する」のは依存方向として健全(逆は不健全)である点が本問の核心。
</details>

## 問5. デバッグ問題

リプレイ機能(`IInputSource` をリプレイ実装に差し替え)で、実機プレイと結果がズレます。`PadInputSource::GetMove()` は毎フレーム値を返しますが、`ReplayInputSource::GetMove()` は記録がないフレームで前回値を返し続ける実装でした。どの原則の観点で説明でき、どう直しますか。

<details><summary>解答の要点</summary>

[LSP](/design/solid/lsp.html)。呼び出し側は「GetMoveは**そのフレームの**入力を返す」という契約を期待しているが、リプレイ実装は事後条件を弱めている(古い値を返す)。修正: 記録形式を全フレーム記録にする、または契約自体を「入力イベント列」に変えて両実装が守れる形にする。教訓: 差し替え可能にした瞬間、**暗黙の契約を文書化する価値が生まれる**。
</details>

## 問6. 説明問題

「SOLIDを守ればよい設計になるんですよね?」と後輩に聞かれました。3〜4文で、誤解を解く返答を書いてください。

<details><summary>解答例</summary>

SOLIDは「変更が繰り返される場所」で効く投資の指針で、守ること自体が目的ではないよ。変更が来ない場所に適用すると、間接化と抽象のコストだけ払うことになる(例: 実装が1つしかないインターフェースだらけのコード)。まず「どこにどんな変更が来ているか」を観察して、痛みが出ている場所に対応する原則を当てる——という順番で使うのが正しい。だから「違反を全部直す」ではなく「高頻度で触る場所の違反から直す」んだ。
</details>

## 問7. 小規模実装問題

「ショップ機能」を実装します。要件: アイテムを買うと所持金が減りインベントリに入る。将来、通貨の種類(ゴールド/ジェム)と割引イベントが追加される予定が**確定**している。

1. SOLIDを意識した骨格(クラスとインターフェースの宣言のみ)を設計してください。
2. 「予定が確定していない」場合の、より単純な設計も書いてください。

<details><summary>解答の要点</summary>

1. 確定しているなら先に開く価値がある: `ICurrency`(またはenum+残高テーブル)で通貨軸に開き、価格計算を `IPriceModifier`(割引)のパイプラインにして[OCP](/design/solid/ocp.html)を確保。購入手続き(検証→支払→付与)は `PurchaseService` に凝集し、在庫・所持金の詳細へは抽象経由([DIP](/design/solid/dip.html))。
2. 未確定なら: `Shop { bool TryBuy(Player&, const Item&); }` 1クラスで直書き。gold直参照でよい。
比較: 1は追加要件に無変更で対応できるが、クラス5個+配線が必要。2は30分で書けるが通貨追加時に書き直し。**要件の確度が設計の複雑さを決める**というのが本問の狙い。実装例: <a href="/study/samples/cpp/solid_shop.cpp">samples/solid_shop.cpp</a>
</details>

---

前: [DIP](/design/solid/dip.html) | [カテゴリ目次](/design/solid/) | [第3部: GoFデザインパターンへ](/design/patterns/)
