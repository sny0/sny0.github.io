---
title: "LSP: リスコフの置換原則 (Liskov Substitution Principle)"
study:
  source: C++ Wiki
  status: published
  summary: "> 基底型のオブジェクトを使っている場所は、その派生型のオブジェクトに置き換えても、プログラムの正しさが保たれなければならない。 ポイントは「コンパイルが通る」ではなく「呼び出し側が基底型に対して持っている期待(契約)を裏切らない」ことです。契約には次が含まれます。"
  section: reference
  format: article
  domain: design
---

# LSP: リスコフの置換原則 (Liskov Substitution Principle)

## 原則の正確な意味

> 基底型のオブジェクトを使っている場所は、その派生型のオブジェクトに置き換えても、プログラムの正しさが保たれなければならない。

ポイントは「コンパイルが通る」ではなく「**呼び出し側が基底型に対して持っている期待(契約)を裏切らない**」ことです。契約には次が含まれます。

- **事前条件を強めない**: 基底が受け付ける入力は派生も受け付ける
- **事後条件を弱めない**: 基底が保証する結果は派生も保証する
- **例外・副作用のサプライズを増やさない**

is-a が日本語として自然でも、契約が破れていればLSP違反です。

## よくある誤解

- **「継承すればLSPは自動的に満たされる」** — 型の互換はコンパイラが保証しますが、**振る舞いの互換**は保証されません。LSPは振る舞いの原則です。
- **「LSP違反 = 派生クラスの書き方が悪い」** — 多くの場合、**基底クラスの契約設計(またはis-aのモデリング自体)が悪い**のが原因です。
- **「数学のis-aは安全」** — 有名な反例が正方形と長方形(下記)。現実の分類とプログラムの契約は別物です。

## 違反している小さなコード例(C++版)

ゲームで頻出の形にします。「全ての敵は倒せる」という契約を、不死の敵が破る例です。

```cpp
// C++20(問題例)
#include <stdexcept>

class Enemy {
public:
    virtual ~Enemy() = default;
    // 契約(暗黙): ダメージを与えれば hp が減り、いつかは Dead になる
    virtual void TakeDamage(int amount) { hp_ -= amount; }
    bool IsDead() const { return hp_ <= 0; }
protected:
    int hp_ = 100;
};

class GhostEnemy : public Enemy {
public:
    void TakeDamage(int amount) override {
        if (!weakened_) return;      // 弱体化するまで完全無効(事後条件を破る)
        Enemy::TakeDamage(amount);
    }
    void Weaken() { weakened_ = true; }
private:
    bool weakened_ = false;
};

// 呼び出し側: 基底の契約を信じて書かれている
void KillAll(std::vector<std::unique_ptr<Enemy>>& enemies) {
    for (auto& e : enemies)
        while (!e->IsDead()) e->TakeDamage(50);   // Ghostが混ざると無限ループ
}
```

型としては完全に置換可能なのに、プログラムは壊れます(無限ループ)。これがLSP違反の怖さで、**コンパイラは何も警告しません**。

## 改善後のコード例(C++版)

対処は「派生を直す」ではなく「契約を直す」方向になります。

```cpp
// C++20 — 案1: 契約を弱める(基底の約束を現実に合わせる)
class Enemy {
public:
    virtual ~Enemy() = default;
    // 新しい契約: ダメージは「効かないこともある」。戻り値で通知する
    virtual bool TakeDamage(int amount) { hp_ -= amount; return true; }
    bool IsDead() const { return hp_ <= 0; }
protected:
    int hp_ = 100;
};

// 呼び出し側は「効かない場合」を前提に書き直される(無限ループの前提が消える)
```

```cpp
// C++20 — 案2: 継承をやめ、無効化を部品にする(コンポジション)
// 「ダメージへの反応」を差し替え可能な部品にすれば、Ghostは特別な派生型ではなくなる
class Enemy {
public:
    std::function<int(int)> damageFilter = [](int d) { return d; };  // 素通し
    void TakeDamage(int amount) { hp_ -= damageFilter(amount); }
    // ... 省略
};
// Ghost: damageFilter = [this](int d) { return weakened_ ? d : 0; };
```

**何が変わったか**: 案1は「呼び出し側が信じてよいこと」を明文化して全派生が守れる契約にした。案2はそもそも振る舞い差分を継承で表すのをやめた(→ [継承かコンポジションか](/design/foundations/inheritance-delegation-composition.html))。

## 古典例: 正方形と長方形

「正方形は長方形の一種」は数学では真ですが、`SetWidth`/`SetHeight` を持つ可変な長方形クラスの契約(「幅を変えても高さは変わらない」)を正方形は守れません。**契約は操作とセットで決まる**ため、不変(immutable)にすれば成立したりもします。is-a判定は言葉ではなく契約で行う、という教訓の定番例です。

## C#版(Unityでの例)

```csharp
// 問題例: 基底のUpdate契約を派生が破る
public class Pickup : MonoBehaviour {
    // 契約(暗黙): OnPickedUpは「拾えたら」呼ばれ、必ずインベントリに入る
    public virtual void OnPickedUp(Inventory inv) => inv.Add(itemId);
    [SerializeField] protected int itemId;
}

public class CursedPickup : Pickup {
    public override void OnPickedUp(Inventory inv) {
        // インベントリに入れず、代わりにダメージ(事後条件違反)
        inv.Owner.TakeDamage(10);
    }
}
// 「拾ったら所持数が増える」前提のクエスト進行コードが静かに壊れる
```

対処は同様に、契約の明文化(戻り値 `PickupResult` を返す)か、「拾ったときの効果」を部品化することです。

## ゲーム開発での例

- 「移動できるはずのユニット」に移動不能な砲台を混ぜる(`Move()` 空実装)— 空実装overrideはLSP違反の代表的なサイン
- リプレイ・AI操作を `IInputSource` で差し替える場合、「毎フレーム必ず値を返す」という契約を全実装が守る必要がある → [ケーススタディ: プレイヤー入力](/design/case-studies/player-input.html)
- 物理の `Collider` 派生が「Boundsは実形状を含む」を破ると、ブロードフェーズ(→ [Spatial Partition](/game/patterns/optimization-patterns.html))が誤動作する

## 原則同士の関係

- LSPは [OCP](/design/solid/ocp.html) の成立条件: 追加した派生が契約を破るなら、「既存コード無変更で拡張」は嘘になる(既存コードが壊れる)。
- [ISP](/design/solid/isp.html) と補完関係: インターフェースを小さく分ければ、「実装できない約束」を強制されにくくなり、LSP違反(空実装)が減る。
- 空実装・`throw NotSupported`・ダウンキャストして分岐([キャスト](/languages/cpp/casts.html))は、3点セットでLSP違反のサイン。

## 適用しすぎた場合の弊害

- 契約を厳密に文書化しようとしすぎて、基底クラスのコメントが仕様書化し、変更不能になる。ゲームロジックの大半は「大まかな期待」で十分回ります。
- 「LSP違反の可能性があるから継承全面禁止」まで振れると、フレームワーク規約(MonoBehaviour等)と衝突します。**浅い継承+明確な契約**が現実解です。

## コードレビュー用チェックリスト

- [ ] overrideが基底の処理を「呼ばない」「無効化する」「例外を投げる」になっていないか?
- [ ] 空実装のoverrideはないか?(あるならis-aのモデリングを疑う)
- [ ] 呼び出し側に `dynamic_cast` / `is` / `as` での型分岐が生えていないか?(基底の契約が不足しているサイン)
- [ ] 基底の仮想関数の「暗黙の期待」(戻り値の意味、呼ばれるタイミング、副作用)は明文化されているか?
- [ ] この派生は、基底を使う既存の全コードに黙って混ぜても安全か?

## 理解度確認問題

1. LSPの「置換可能」は型の互換とどう違いますか。
2. 「事前条件を強めない・事後条件を弱めない」を、TakeDamageの例で具体的に言ってください。
3. 空実装のoverrideがLSP違反のサインである理由は?
4. 正方形-長方形問題は、クラスを不変(setterなし)にするとなぜ解消しますか。

<details><summary>解答の要点</summary>

1. 型の互換はコンパイラが保証する構文の話。LSPは呼び出し側の期待(振る舞いの契約)が保たれるかという意味論の話。
2. 事前条件を強める例: 「弱体化済みのときしか呼ぶな」。事後条件を弱める例: 「ダメージを与えてもhpが減らないことがある」。
3. 基底が約束した操作を派生が実行できない=その約束を破っている。is-aのモデリングか基底の契約設計が誤っている兆候。
4. 破られていた契約は「幅の変更は高さに影響しない」という**可変操作**の契約。操作をなくせば契約もなくなり、「正方形は長方形」という分類だけなら矛盾しないため。
</details>

## 関連項目

- [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)
- [継承と仮想関数](/languages/cpp/inheritance-and-virtual.html)
- [判断ガイド: 継承かコンポジションか](/design/decisions/inheritance-or-composition.html)

## 演習

`class Bird { virtual void Fly(); }` に `Penguin` を追加したい状況を、(a) 契約の再設計(インターフェース分割)、(b) コンポジション化、の2案で設計してください。どちらの案でも「空を飛ぶ敵だけを全滅させる」処理が安全に書けることを確認してください。

---

関連項目：[OCP](/design/solid/ocp.html) / [学習ガイド](/design/solid/) / [ISP: インターフェース分離の原則](/design/solid/isp.html)
