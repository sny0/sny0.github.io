---
title: "ポリモーフィズムとインターフェース"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "ポリモーフィズム(polymorphism、多態性)とは、同じ呼び出しコードが相手によって違う振る舞いをすること。インターフェースとは「何ができるか」だけを定めた約束で、ポリモーフィズムの受け口です。呼ぶ側は約束だけを知り、相手が誰かを知りません。"
---

# ポリモーフィズムとインターフェース

## 一言で言うと

**ポリモーフィズム(polymorphism、多態性)**とは、同じ呼び出しコードが相手によって違う振る舞いをすること。**インターフェース**とは「何ができるか」だけを定めた約束で、ポリモーフィズムの受け口です。呼ぶ側は約束だけを知り、相手が誰かを知りません。

## 解決したい問題

「種類ごとに違う処理」をするコードは、素朴に書くと種類の列挙(switch)が呼び出し側に散らばります。種類を追加するたびに、**すべてのswitchを探して直す**ことになります。

## 問題のある実装

```cpp
// C++20(問題例)
enum class WeaponType { Sword, Bow, Staff };

void Attack(WeaponType type) {
    switch (type) {
        case WeaponType::Sword: /* 近接判定 */ break;
        case WeaponType::Bow:   /* 矢を生成 */ break;
        case WeaponType::Staff: /* 魔法弾生成 */ break;
    }
}
void PlayAttackAnim(WeaponType type) { switch (type) { /* また全種類… */ } }
void GetRange(WeaponType type)       { /* また全種類… */ }
```

## 何が問題になるか

- 武器を1種類足すと、**switchを書いた全関数**を修正。1つでも漏れると実行時に発覚。
- 武器ごとのコードが機能別にバラバラの場所にあり、「弓の仕様」を知るには全switchを読む必要がある(低[凝集](/design/foundations/cohesion-and-coupling.html))。

## 改善した実装

```cpp
// C++20
#include <memory>
#include <vector>

class IWeapon {                       // インターフェース: 約束だけ
public:
    virtual ~IWeapon() = default;     // 基底経由でdeleteするための仮想デストラクタ
    virtual void Attack() = 0;
    virtual float Range() const = 0;
};

class Sword : public IWeapon {        // 剣に関する決定がここに集まる(高凝集)
public:
    void Attack() override { /* 近接判定 */ }
    float Range() const override { return 1.5f; }
};

class Bow : public IWeapon {
public:
    void Attack() override { /* 矢を生成 */ }
    float Range() const override { return 20.0f; }
};

// 呼び出し側は相手が剣か弓かを知らない
void UseWeapon(IWeapon& weapon) {
    if (/* 敵が */ weapon.Range() > 10.0f) { /* 遠距離の立ち回り */ }
    weapon.Attack();
}
```

武器の追加 = 新クラスを1つ書くだけ。既存コードは無変更です(これを原則化したのが [OCP](/design/solid/ocp.html))。

## 仕組み: 多態には種類がある

C++には「同じ呼び出しで違う振る舞い」を実現する仕組みが複数あり、**いつ相手が決まるか**が違います。

| 種類 | 仕組み | 相手が決まる時 | コスト |
|---|---|---|---|
| 実行時多態 | 仮想関数(上の例) | 実行時 | vtable経由の間接呼び出し(→ [仕組み](/runtime/cpp-internals/vtable-and-virtual-calls.html)) |
| コンパイル時多態 | [テンプレート](/languages/cpp/templates-and-concepts.html) | コンパイル時 | 実行時ゼロ、コンパイル時間とコードサイズ増 |
| アドホック多態 | [関数オーバーロード](/languages/cpp/overloading.html) | コンパイル時 | なし |

「実行中に武器を持ち替える」なら実行時多態、「固定の型ごとに最速のコードが欲しい」ならコンパイル時多態が向きます(→ [判断ガイド: テンプレートか仮想関数か](/design/decisions/cpp-choices.html))。

## 代わりに何を失ったか

- **一覧性**: switch版は「全武器の攻撃処理」が1画面で読めた。クラス版は種類ごとにファイルが分かれ、全体を見渡しにくい。
- **性能**: 仮想関数呼び出しはインライン化を阻害し、間接参照が入る(多くのゲームロジックでは誤差。ホットループでは効く → [Data Locality](/game/patterns/optimization-patterns.html))。
- 種類が増えない・2〜3種で固定なら、switchの方が単純で優れています。**「switchは悪」ではなく「増え続けるswitchが悪」**です。

## インターフェース設計の要点

- 約束は**呼ぶ側が必要とする最小限**にする(太ったインターフェースは全実装を苦しめる → [ISP](/design/solid/isp.html))。
- C++にはC#の `interface` キーワードがなく、「純粋仮想関数のみ+仮想デストラクタの抽象クラス」で表現するのが慣習です(→ [継承と仮想関数](/languages/cpp/inheritance-and-virtual.html))。

## ゲーム開発での例

- ダメージを受けられるものすべて(`IDamageable`): 敵・箱・壁を同じ攻撃コードで処理。
- 入力デバイスの抽象(`IInputSource`): パッド・キーボード・リプレイ再生を同じ操作コードで処理(→ [ケーススタディ: プレイヤー入力](/design/case-studies/player-input.html))。

## Unity/C# との対応

- C#の `interface` がそのまま対応。`GetComponent<IDamageable>()` のようにインターフェースでコンポーネントを取れるのは強力な定石です。
- C#では全メソッドが既定で非virtualなのはC++と同じですが、C#のinterface実装は暗黙、C++のoverrideは明示という違いがあります(→ [第9部](/languages/csharp/virtual-and-polymorphism.html))。

## Unreal Engine との対応

- UEのInterfaceは `UINTERFACE` マクロで宣言する独自形式(Blueprint連携のため)。標準C++の抽象クラスとは書き方が異なります(→ [第10部](/game/unreal/delegates-and-interfaces.html))。

## よくある誤解

- 「ポリモーフィズム = 継承」ではありません。テンプレートも `std::function` もポリモーフィズムの手段です。
- 「インターフェースは常に作るべき」でもありません。実装が1つしかなく増える見込みがないなら、具象クラス直接参照で十分です(→ [判断ガイド](/design/decisions/create-interface.html))。

## 使う場面 / 使わない場面

- **使う場面**: 種類が増え続ける、実行時に差し替える、種類を知らないコード(汎用処理)を書きたい、テストでフェイクに差し替えたい。
- **使わない場面**: 種類が固定で少ない、全種類を同時に見渡したい処理(バランス調整表のような)、性能が最優先のホットループ。

## 関連項目

- [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)
- [OCP](/design/solid/ocp.html) / [ISP](/design/solid/isp.html)
- [仮想関数の仕組み(vtable)](/runtime/cpp-internals/vtable-and-virtual-calls.html)
- [Strategy](/design/patterns/strategy.html)

## 理解度チェック

1. ポリモーフィズムが解決する「switch散らばり問題」とは何ですか。
2. 実行時多態とコンパイル時多態の違い(相手が決まる時期とコスト)を言えますか。
3. switchのままにする方がよいのはどんなときですか。

## 演習

「拾えるもの(コイン・回復薬・武器)」を、(a) enum+switch、(b) `IPickup` インターフェース、の2通りで骨格実装してください。その後「拾うと3秒後に爆発する爆弾」を両方に追加し、変更したファイル数と行数を比較してください。

---

前: [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html) | [カテゴリ目次](/design/foundations/) | 次: [設計の品質特性](/design/foundations/quality-attributes.html)
