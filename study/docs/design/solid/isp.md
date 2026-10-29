---
title: "ISP: インターフェース分離の原則 (Interface Segregation Principle)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "> クライアントは、自分が使わないメソッドへの依存を強制されるべきではない。 「太った(fat)インターフェース」を、クライアント(呼び出し側)の種類ごとに小さく分けよ、という原則です。分割の基準は「実装側の都合」ではなく「呼び出し側がどのまとまりで使うか」である点が肝です。"
---

# ISP: インターフェース分離の原則 (Interface Segregation Principle)

## 原則の正確な意味

> クライアントは、自分が使わないメソッドへの依存を強制されるべきではない。

「太った(fat)インターフェース」を、**クライアント(呼び出し側)の種類ごと**に小さく分けよ、という原則です。分割の基準は「実装側の都合」ではなく「**呼び出し側がどのまとまりで使うか**」である点が肝です。

ここで言うインターフェースは、C#の `interface` に限らず、C++の抽象クラス、クラスのpublicメンバ全体(そのクラスの「顔」)も含みます。

## よくある誤解

- **「インターフェースは常に1メソッドまで分割すべき」** — 分割の単位はメソッド数ではなく**クライアントの種類**です。1種類のクライアントが常に3つセットで使うなら、3メソッドで1インターフェースが正解。
- **「ISPは実装クラスを楽にする原則」** — 半分正解。主目的は**呼び出し側が余計なものに依存しない**こと(再コンパイル・モック作成・誤用の削減)。実装側の空実装が減るのは良い副作用です。

## 違反している小さなコード例(C++版)

```cpp
// C++20(問題例)— 全部入りの「ゲームオブジェクト」インターフェース
class IGameObject {
public:
    virtual ~IGameObject() = default;
    virtual void Update(float dt) = 0;
    virtual void Render() = 0;
    virtual void OnDamage(int amount) = 0;
    virtual void OnInteract(class Player& p) = 0;
    virtual void Serialize(class SaveWriter& w) = 0;
};

// 背景の飾り(草)は Update と Render しか要らないのに全部書かされる
class GrassDecoration : public IGameObject {
public:
    void Update(float) override {}
    void Render() override { /* 描画 */ }
    void OnDamage(int) override {}                 // 空実装(LSP違反のサイン)
    void OnInteract(Player&) override {}           // 空実装
    void Serialize(SaveWriter&) override {}        // 空実装
};
```

## 何が問題になるか

- **空実装の量産**: 「できないことを約束させられる」= [LSP](/design/solid/lsp.html)違反の温床。呼び出し側は `OnDamage` を呼べてしまうが、何も起きない(静かなバグ)。
- **無関係な変更への連鎖**: セーブ仕様変更で `Serialize` のシグネチャが変わると、**草も再コンパイル・再修正**。呼び出し側も、ダメージ処理を書きたいだけのコードがセーブの型(SaveWriter)への依存を引きずり込む。
- **テストの苦痛**: ダメージ処理のテストのために5メソッドのモックを書く羽目になる。

## 改善後のコード例(C++版)

```cpp
// C++20 — クライアントの種類ごとに分割
class IUpdatable   { public: virtual ~IUpdatable() = default;   virtual void Update(float dt) = 0; };
class IRenderable  { public: virtual ~IRenderable() = default;  virtual void Render() = 0; };
class IDamageable  { public: virtual ~IDamageable() = default;  virtual void OnDamage(int amount) = 0; };
class IInteractable{ public: virtual ~IInteractable() = default; virtual void OnInteract(class Player& p) = 0; };

// 草は必要な2つだけ実装する
class GrassDecoration : public IUpdatable, public IRenderable {
public:
    void Update(float) override { /* 揺れる */ }
    void Render() override { /* 描画 */ }
};

// 攻撃処理は IDamageable のリストだけを持つ(草はそもそもリストに入らない)
void ApplyExplosion(std::vector<IDamageable*>& targets, int damage) {  // 生ポインタ: 所有せず一時的に参照するだけ
    for (auto* t : targets) t->OnDamage(damage);
}
```

**何が変わったか**: 「攻撃できる対象」が型で表現され、空実装が消えた。セーブ仕様の変更は `ISerializable`(必要なら別途定義)を実装するものだけに波及する。ここでは多重継承をインターフェース実装に限定して使っています(実装の多重継承より安全 → [多重継承](/languages/cpp/inheritance-and-virtual.html))。

## C#版(Unityでの例)

```csharp
// Unityの定石: 小さなinterface + GetComponentでの能力問い合わせ
public interface IDamageable { void TakeDamage(int amount); }
public interface IInteractable { void Interact(PlayerContext player); }

public class Barrel : MonoBehaviour, IDamageable {
    public void TakeDamage(int amount) { /* 壊れる */ }
}

// 攻撃側: 「ダメージを受けられるか」だけを問う。相手が樽か敵かは知らない
void OnHit(Collider other) {
    if (other.TryGetComponent<IDamageable>(out var target))
        target.TakeDamage(damage);
}
```

`TryGetComponent<IDamageable>` は「この相手はこの能力を持つか?」という問い合わせで、ISPの分割がそのまま活きる形です。逆に `GameObject` に生えた巨大な共通基底(自作の `BaseUnit` など)に何でも生やすと、違反例と同じ道をたどります。

## ゲーム開発での例

- 「攻撃対象」「インタラクト対象」「セーブ対象」「ポーズ影響対象」— 同じオブジェクトでも、システムごとに見たい顔は違う。システム単位のインターフェースが自然な分割
- エンジンの `Renderer` に物理情報を混ぜない、`Collider` に描画情報を混ぜない、というエンジン設計自体がISP
- [ケーススタディ: アイテム効果](/design/case-studies/item-effects.html) — 「使える」「装備できる」「売れる」の分離

## 原則同士の関係

- ISPは**インターフェース版のSRP**: SRPが「変更理由ごとに実装を分ける」なら、ISPは「クライアント種別ごとに公開面を分ける」。
- ISPを守ると空実装が減り、[LSP](/design/solid/lsp.html)を守りやすくなる。
- [DIP](/design/solid/dip.html)で依存する抽象は、ISPで分割された小さい抽象であるほど安定する(変更理由が少ないため)。

## 適用しすぎた場合の弊害

- **1メソッド1インターフェースの粉塵化**: `IHpGettable` `IHpSettable` `IMaxHpGettable`... 実装宣言が儀式化し、探すコストが利益を超える。
- **常にセットで使われるものの分割**: 全クライアントが `Update` と `Render` を必ず両方使うなら、分ける意味はない。**クライアントの種類が実際に分かれてから**分割する(→ [YAGNI](/design/foundations/yagni-kiss-dry.html))。
- C++では細かすぎる多重継承はオブジェクトサイズ(vptr数 → [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))とキャストの複雑さを増やす。

## コードレビュー用チェックリスト

- [ ] このインターフェースの実装に空実装・`throw` がないか?
- [ ] このインターフェースを使うクライアントは何種類いるか? それぞれ全メソッドを使っているか?
- [ ] 1つのシグネチャ変更で、無関係な機能のコードまで再コンパイル・修正されていないか?
- [ ] モックを書くとき、テストと無関係なメソッドを何個実装させられるか?
- [ ] 逆に、常に一緒に使われるメソッドを意味なく別インターフェースに割っていないか?

## 理解度確認問題

1. ISPの分割基準は「実装側の都合」と「呼び出し側の都合」のどちらですか。なぜですか。
2. 空実装のoverrideは、ISPとLSPのどちらの観点からも問題です。それぞれの観点で説明してください。
3. 「1メソッド1インターフェース」が常に正しいとは言えない理由は?
4. UnityのTryGetComponentパターンとISPの関係を説明してください。

<details><summary>解答の要点</summary>

1. 呼び出し側。原則の主語がクライアント(「クライアントは強制されるべきではない」)であり、依存を減らしたいのは使う側だから。
2. ISP観点: 使わないメソッドへの依存を強制された結果が空実装。LSP観点: 基底の契約(呼べば何かが起きる)を果たせていない。
3. 分割単位はクライアントの種類であって、メソッド数ではない。常にセットで使われるなら1つでよい。
4. 「能力ごとの小さなinterface」を実装させ、システムは必要な能力だけを問い合わせて使う——ISPの分割がそのまま実行時の問い合わせ単位になっている。
</details>

## 関連項目

- [SRP](/design/solid/srp.html) / [LSP](/design/solid/lsp.html) / [DIP](/design/solid/dip.html)
- [ポリモーフィズムとインターフェース](/design/foundations/polymorphism-interface.html)
- [判断ガイド: インターフェースを作るべきか](/design/decisions/create-interface.html)

## 演習

自作を想定した `IWeapon { Attack(); Reload(); GetAmmo(); GetDurability(); Repair(); }` について、(a) 近接武器クライアント、(b) 銃クライアント、(c) 修理屋UI、の3種類のクライアントがどのメソッドを使うか表にし、ISPに沿った分割案を作ってください。分割しない方がよいメソッドの組があればそれも指摘してください。

---

前: [LSP](/design/solid/lsp.html) | [カテゴリ目次](/design/solid/) | 次: [DIP: 依存性逆転の原則](/design/solid/dip.html)
