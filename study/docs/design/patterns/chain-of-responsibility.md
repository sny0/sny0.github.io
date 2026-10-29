---
title: "Chain of Responsibility"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "要求(イベント・リクエスト)を処理できる候補が複数あり、誰が処理すべきかを送信側が知らずに済ませたい。候補を鎖状に繋ぎ、処理できる者が現れるまで順に回す。 Handler: 要求を処理するか、次へ回すかを決めるインターフェース"
---

# Chain of Responsibility

## 解決する問題

要求(イベント・リクエスト)を処理できる候補が複数あり、**誰が処理すべきかを送信側が知らずに**済ませたい。候補を鎖状に繋ぎ、処理できる者が現れるまで順に回す。

## 登場人物と責務

- **Handler**: 要求を処理するか、次へ回すかを決めるインターフェース
- **ConcreteHandler**: 処理条件と処理内容。処理しない場合は次のHandlerへ転送
- **Client**: 鎖の先頭に要求を投げるだけ

## 最小構成図

```
Damage要求 ──> [シールド] ──> [鎧] ──> [バリアバフ] ──> [本体HP]
               吸収できれば     軽減して    無効化なら      残りを受ける
               ここで停止      次へ回す     ここで停止
```

## パターンなしの実装

```cpp
// C++20(問題例)— 処理の優先順位と条件が1関数に密集
void ApplyDamage(Player& p, int damage) {
    if (p.HasShield()) {
        int absorbed = std::min(damage, p.ShieldValue());
        p.SetShield(p.ShieldValue() - absorbed);
        damage -= absorbed;
        if (damage <= 0) return;
    }
    if (p.HasArmor()) { damage = damage * (100 - p.ArmorPercent()) / 100; }
    if (p.HasBarrierBuff()) { p.ConsumeBarrier(); return; }
    p.SetHp(p.Hp() - damage);
}
```

## 問題点

- 軽減要素の追加・削除・**順序変更**のたびにこの関数を書き換え([OCP](/design/solid/ocp.html))
- 装備・バフ・スキルなど別システム由来の軽減が1か所に集まり、全システムがここに依存
- 「このキャラだけ処理順が違う」を表現できない

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>

struct DamageContext { int amount = 0; bool finished = false; };

class DamageHandler {
public:
    virtual ~DamageHandler() = default;
    void SetNext(std::unique_ptr<DamageHandler> next) { next_ = std::move(next); }
    void Handle(DamageContext& ctx) {
        Process(ctx);
        if (!ctx.finished && next_) next_->Handle(ctx);   // 未完なら次へ
    }
protected:
    virtual void Process(DamageContext& ctx) = 0;
private:
    std::unique_ptr<DamageHandler> next_;   // 鎖の次を所有
};

class ShieldHandler : public DamageHandler {
protected:
    void Process(DamageContext& ctx) override {
        int absorbed = std::min(ctx.amount, shield_);
        shield_ -= absorbed;
        ctx.amount -= absorbed;
        if (ctx.amount <= 0) ctx.finished = true;   // 吸収しきったら停止
    }
private:
    int shield_ = 30;
};

class ArmorHandler : public DamageHandler {
protected:
    void Process(DamageContext& ctx) override { ctx.amount = ctx.amount * 70 / 100; }
};

class HpHandler : public DamageHandler {        // 鎖の終端
protected:
    void Process(DamageContext& ctx) override { hp_ -= ctx.amount; ctx.finished = true; }
private:
    int hp_ = 100;
};
// 組み立て: shield->SetNext(armor); armor->SetNext(hp);
// キャラごとに鎖の構成・順序を変えられる
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_chain.cpp">samples/pattern_chain.cpp</a>

## C#またはUnityでの実装

Unity自身がこのパターンを内蔵しています: **UIイベントのバブリング**(uGUIの `ExecuteEvents.ExecuteHierarchy` は子→親へイベントを回し、処理した者で停止)、物理のレイヤーマトリクスの後段の当たり処理など。

```csharp
// リスト方式(C#での実用形): 鎖のポインタ繋ぎよりリスト走査が扱いやすい
public interface IDamageStep { bool Process(ref int damage); }  // trueで停止

public class DamagePipeline {
    private readonly List<IDamageStep> steps = new();  // 順序 = リストの順
    public void Add(IDamageStep s) => steps.Add(s);
    public int Apply(int damage) {
        foreach (var s in steps)
            if (s.Process(ref damage)) break;
        return damage;
    }
}
```

## ゲームでの具体例

- ダメージ軽減の段階処理(上の例)
- UI入力: クリックをボタン→パネル→画面の順に「処理できる者」へ(バブリング)
- 入力の消費: ポーズメニュー→UI→プレイヤー操作の優先度つきディスパッチ
- デバッグコマンドの解釈(コマンドを解釈できるモジュールに順に回す)

## 利点

- 処理段階の追加・削除・並べ替えが、鎖の組み替えだけでできる
- 各段の処理が独立したクラスに凝集([SRP](/design/solid/srp.html))
- 送信側は先頭しか知らない(処理者の存在すら不定でよい)

## 欠点

- **処理される保証がない**(終端まで素通りする可能性を設計に含める必要がある)
- 実行時に鎖を追わないと処理の全貌が分からない(デバッグしにくい)
- 段が少なく固定なら、if連鎖の方がはるかに読みやすい

## 適用条件

- 処理候補の数・順序が実行時・キャラごと・設定で変わる
- 段階ごとに独立した拡張(装備・バフの重ね合わせ)が繰り返し追加される

## 避けるべき条件

- 処理順が固定で3段以下 → 素直なif列で書く
- 全段が必ず処理に参加する(誰も止めない)→ それは[Decorator](/design/patterns/decorator.html)のリスト方式やパイプラインの方が意図に合う

## 似たパターンとの違い

- [Decorator](/design/patterns/decorator.html): 全員が参加する重ね掛け vs **誰かが止める**選択的処理
- [Command](/design/patterns/command.html): 要求のオブジェクト化。Chainは要求の**受け手側**の構造。併用可(Commandを鎖に流す)
- [Observer](/design/patterns/observer.html): 全購読者に配る(止まらない)vs 処理者を探して止まる

## 実務でよく見かける変形

- リスト+優先度方式(実務の主流): 鎖のポインタ管理より `sorted vector` 走査が単純で速い
- ミドルウェアパイプライン(Webのmiddleware、Unityの `InputSystem` のprocessors)

## 過剰設計になる例

「将来軽減の種類が増えるかも」で最初から鎖を組む——2種類の軽減が固定なら関数2行です。**順序・構成が動く証拠が出てから**で間に合います。

## 関連項目

- [Decorator](/design/patterns/decorator.html) / [Command](/design/patterns/command.html)
- [ケーススタディ: ダメージ計算](/design/case-studies/damage-calculation.html)

## 理解度チェック

1. DecoratorとChainの「参加の仕方」の違いは?
2. 「処理されない可能性」への対処はどう設計しますか?
3. リスト方式が鎖ポインタ方式より好まれる実務的理由は?

## 演習

「入力イベント(決定ボタン)」を ポーズ画面→ダイアログ→インベントリUI→プレイヤー操作 の優先順で1つだけに処理させる仕組みを、リスト方式で実装してください。「ダイアログ表示中はプレイヤーが動かない」ことがこの構造から自然に導かれることを確認してください。

---

前: [Proxy](/design/patterns/proxy.html) | [カテゴリ目次](/design/patterns/) | 次: [Command](/design/patterns/command.html)
