---
title: "Composite"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "「個」と「個の集まり」を同じインターフェースで扱いたい。ツリー構造(UI階層、シーングラフ)で、葉(単体)と枝(グループ)を区別せずに操作したい。 Component: 葉と枝に共通のインターフェース(Draw(), Move())"
---

# Composite

## 解決する問題

「個」と「個の集まり」を**同じインターフェースで**扱いたい。ツリー構造(UI階層、シーングラフ)で、葉(単体)と枝(グループ)を区別せずに操作したい。

## 登場人物と責務

- **Component**: 葉と枝に共通のインターフェース(`Draw()`, `Move()`)
- **Leaf**: 子を持たない末端(スプライト)
- **Composite**: 子Componentのリストを持ち、操作を子へ**再帰的に転送**する(グループ)

## 最小構成図

```
SceneNode(Component)
 ├── Sprite(Leaf)
 └── Group(Composite)
      ├── Sprite(Leaf)
      └── Group(Composite)
           └── Sprite(Leaf)
呼び出し側は root->Draw() と呼ぶだけ。個か集まりかを知らない
```

## パターンなしの実装

```cpp
// C++20(問題例)— 個とグループを別型で扱う
void DrawAll(const std::vector<Sprite>& sprites,
             const std::vector<SpriteGroup>& groups) {
    for (const auto& s : sprites) s.Draw();
    for (const auto& g : groups) {
        for (const auto& s : g.sprites) s.Draw();   // グループのグループは? → さらに入れ子ループ…
    }
}
```

## 問題点

- 「グループのグループ」など任意の深さに対応できない(型が階層を固定している)
- 全操作(Draw, Move, SetVisible…)で個/グループの分岐を書く
- 「ボスと取り巻きをまとめて移動」のような要求のたびに特別対応

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>
#include <vector>

class SceneNode {
public:
    virtual ~SceneNode() = default;
    virtual void Draw(float parentX, float parentY) const = 0;
    float x = 0, y = 0;   // 親からの相対位置
};

class Sprite : public SceneNode {          // Leaf
public:
    void Draw(float px, float py) const override {
        // (px + x, py + y) に描画。親の移動が自動で伝わる
    }
};

class Group : public SceneNode {           // Composite
public:
    void Add(std::unique_ptr<SceneNode> child) { children_.push_back(std::move(child)); }
    void Draw(float px, float py) const override {
        for (const auto& c : children_) c->Draw(px + x, py + y);   // 再帰
    }
private:
    std::vector<std::unique_ptr<SceneNode>> children_;   // 親が子を所有
};

// 使用: root.Draw(0, 0); — 深さが何段でも1呼び出し。グループごと移動は group.x += 10 だけ
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_composite.cpp">samples/pattern_composite.cpp</a>

## C#またはUnityでの実装

**UnityのTransform階層がCompositeそのもの**です。

```csharp
// 親Transformを動かせば子が全部ついてくる = Compositeの再帰転送
parentObject.transform.position += Vector3.up;   // 子は自動追従
// SetActive(false) も階層全体へ伝播する — これもComposite的転送
```

自作するより「エンジンが既に提供しているCompositeに乗る」のがUnity/UEでの現実的な使い方です。自作が必要になるのは、GameObjectを使わない軽量な独自ツリー(UIの論理構造、クエストの入れ子条件など)を作るときです。

## ゲームでの具体例

- シーングラフ・Transform階層(位置・回転・スケールの親子伝播)
- UIツリー(パネルの表示切替が子に伝播)
- 入れ子になったクエスト条件(「AかつB」のAが「CまたはD」)— 論理式ツリー
- 編隊(ボス+パーツ+取り巻きをまとめて操作)

## 利点

- 任意の深さの階層を、同じコードで扱える(再帰の力)
- クライアントから個/集合の分岐が消える
- グループ単位の操作(移動・表示・削除)が自然に書ける

## 欠点

- **葉には意味のない操作**の扱いに困る(`Add()` はLeafに不要 → インターフェースをどこまで共通化するかのジレンマ。共通化しすぎは[ISP](/design/solid/isp.html)違反)
- ツリー走査は**キャッシュに不利**(ポインタ追跡だらけ → [Data Locality](/game/patterns/optimization-patterns.html))。数万ノードの毎フレーム走査は性能問題になりうる
- 親子の所有関係・循環防止など、構造管理のコードが必要

## 適用条件

- データが本質的にツリーである(部分-全体関係がある)
- 個と集合に同じ操作を適用したい

## 避けるべき条件

- 階層が1段しかない(ただのリストで十分)
- 大量要素の高速一括処理が主目的(フラットな配列 + [ECS](/game/patterns/component-and-ecs.html)的な構造が向く)

## 似たパターンとの違い

- [Decorator](/design/patterns/decorator.html): 子が常に1つのCompositeと構造が似るが、目的は「機能追加」であり集合の表現ではない
- [Visitor](/design/patterns/visitor.html): Compositeツリーに対する「操作の追加」を外部化したいときの相棒
- [Iterator](/design/patterns/iterator.html): ツリーの走査方法を外に出したいときに併用

## 実務でよく見かける変形

- 安全版と透過版: `Add/Remove` をCompositeだけに持たせる(安全・型で区別)か、Componentに持たせる(透過・実行時エラー)か。現代は型安全を優先して**安全版**が主流
- 親ポインタ付き: 子から親を辿る要求(バブリングするUIイベント → [Chain of Responsibility](/design/patterns/chain-of-responsibility.html))のために `parent_` を持つ(生ポインタでよい: 親が子を所有し、子は親より長生きしないため)

## 過剰設計になる例

インベントリの「アイテム一覧」を、入れ子の予定がないのにCompositeで組む——フラットな `std::vector<Item>` で済むものにツリー管理のコストを払うことになります。

## 関連項目

- [Decorator](/design/patterns/decorator.html) / [Visitor](/design/patterns/visitor.html) / [Chain of Responsibility](/design/patterns/chain-of-responsibility.html)
- [Data Locality](/game/patterns/optimization-patterns.html)(ツリーの性能面の注意)

## 理解度チェック

1. Compositeが可能にする「再帰的な一括操作」の仕組みを説明できますか。
2. `Add()` をComponentに置くか、Compositeだけに置くかのトレードオフは?
3. Transform階層が深すぎると性能に響くのはなぜですか。

## 演習

クエスト条件「(スライム10体討伐 AND 薬草5個収集) OR ボス討伐」を表現する条件ツリー(`ICondition { bool IsMet(const GameStats&); }` + And/Or/葉)を実装してください。新しい複合条件「N個中M個達成」を追加し、既存コードの変更が不要なことを確認してください。

---

前: [Bridge](/design/patterns/bridge.html) | [カテゴリ目次](/design/patterns/) | 次: [Decorator](/design/patterns/decorator.html)
