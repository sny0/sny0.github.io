---
title: "Visitor"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "安定したクラス階層(シーンノード、式ツリー)に対して、新しい操作を階層側のクラスを変更せずに追加したい。「型ごとの処理」を階層の外に置き、操作の追加を新クラス1つで済ませる。"
---

# Visitor

## 解決する問題

安定したクラス階層(シーンノード、式ツリー)に対して、**新しい操作を階層側のクラスを変更せずに**追加したい。「型ごとの処理」を階層の外に置き、操作の追加を新クラス1つで済ませる。

ポリモーフィズムの通常形(操作を階層の**中**に置く)と正反対のトレードオフを持つ、使いどころが狭い上級パターンです。

## 登場人物と責務

- **Element**: 訪問を受け入れる側の階層(`Accept(visitor)`を持つ)
- **ConcreteElement**: 各具象型。`Accept` で自分の型に対応する `Visit` を呼び返す
- **Visitor**: 型ごとの `Visit(ConcreteElementA&)` 群を宣言
- **ConcreteVisitor**: 1つの操作(保存、描画、集計)の型ごとの実装をまとめたもの

## 最小構成図(ダブルディスパッチ)

```
node->Accept(visitor)
   │ 仮想呼び出し1回目: nodeの実際の型が判明
   └─> SpriteNode::Accept { visitor.Visit(*this); }
          │ オーバーロード解決2回目: visitorの実際の型で処理が決まる
          └─> SaveVisitor::Visit(SpriteNode&) が実行される
「実行時の型」×「操作」の2軸で処理が選ばれる = double dispatch
```

## パターンなしの実装

```cpp
// C++20(問題例)— 操作追加のたびに階層全クラスへメソッド追加
class SceneNode {
public:
    virtual ~SceneNode() = default;
    virtual void Draw() = 0;
    virtual void SaveTo(SaveWriter&) = 0;      // セーブ機能追加で全クラス修正
    virtual int CountPolygons() const = 0;     // 統計機能追加で全クラス修正
    // 操作が増えるたび、階層の全クラス+このインターフェースが膨らむ
};
```

あるいはdynamic_castの連鎖:

```cpp
void SaveNode(SceneNode* n, SaveWriter& w) {
    if (auto* s = dynamic_cast<SpriteNode*>(n)) { /* ... */ }
    else if (auto* m = dynamic_cast<MeshNode*>(n)) { /* ... */ }
    // 型追加時にこの連鎖を書いた全関数を探して修正(コンパイラは漏れを教えてくれない)
}
```

## 問題点

- 操作の追加が階層全体の修正になる(階層が安定・操作が増える状況では辛い)
- dynamic_cast連鎖は型追加時の**修正漏れを検出できない**

## パターン適用後のC++コード

```cpp
// C++20
class SpriteNode; class MeshNode;   // 前方宣言

class IVisitor {
public:
    virtual ~IVisitor() = default;
    virtual void Visit(SpriteNode& n) = 0;   // 型ごとのオーバーロード
    virtual void Visit(MeshNode& n) = 0;     // 型追加時はここに追加→全Visitorがコンパイルエラーで漏れ検出
};

class SceneNode {
public:
    virtual ~SceneNode() = default;
    virtual void Accept(IVisitor& v) = 0;    // 階層側はこれ1つだけ持てばよい
};
class SpriteNode : public SceneNode {
public:
    void Accept(IVisitor& v) override { v.Visit(*this); }   // 自分の型でVisitを呼び返す
    // スプライト固有のデータ・アクセサ
};
class MeshNode : public SceneNode {
public:
    void Accept(IVisitor& v) override { v.Visit(*this); }
    // メッシュ固有のデータ
};

// 操作の追加 = Visitorを1つ書くだけ。階層は無変更
class PolygonCounter : public IVisitor {
public:
    void Visit(SpriteNode&) override { total_ += 2; }
    void Visit(MeshNode& m) override { total_ += 1000; /* m.PolyCount()等 */ }
    int Total() const { return total_; }
private:
    int total_ = 0;
};
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_visitor.cpp">samples/pattern_visitor.cpp</a>

### C++17以降の代替: std::variant + std::visit

閉じた型集合なら、継承なしで同じ問題を解けます。

```cpp
// using Node = std::variant<SpriteNode, MeshNode>;
// std::visit([](auto& n) { /* 型ごとの処理(overloadedイディオム) */ }, node);
// 型の追加漏れはコンパイルエラーで検出される。現代C++ではこちらが第一候補になりつつある
```

(→ [STL/型の道具](/languages/cpp/stl.html)。variantは値セマンティクスなので、ポインタ階層で運用する既存構造には従来Visitorが残ります)

## C#またはUnityでの実装

C#ではパターンマッチングが同じ問題の主要解です。

```csharp
// C# 8+ のswitch式: dynamic_cast連鎖より安全で読める(ただし型追加の漏れ検出は既定では警告どまり)
int CountPolygons(SceneNode node) => node switch {
    SpriteNode s => 2,
    MeshNode m   => m.PolyCount,
    _ => throw new ArgumentOutOfRangeException(nameof(node))
};
```

フルVisitor(Accept/Visit)をC#で組む価値があるのは、型追加漏れを**コンパイルエラーで**強制検出したい大規模な階層に限られます。

## ゲームでの具体例

- シーングラフ・アセットツリーへの操作追加(保存、検証、統計、エクスポート)— エディタ・ツール側で価値が出る
- [Interpreter](/design/patterns/interpreter.html)の式ツリーへの操作(評価、最適化、文字列化)
- コンパイラ・シェーダ変換などのAST処理(Visitorの本場)

ランタイムのゲームロジックでの出番は少なく、**ツール・パイプラインのパターン**と考えるのが実務的です。

## 利点

- 操作の追加が階層無変更・新クラス1つ([OCP](/design/solid/ocp.html)を「操作」軸で満たす)
- 型ごとの処理漏れをコンパイラが検出(dynamic_cast連鎖との決定的な違い)
- 1つの操作の全型分の処理が1クラスに凝集(操作単位のSRP)

## 欠点

- **型の追加に最弱**: 新Element型を足すと、IVisitorと全ConcreteVisitorを修正(OCPのトレードオフが操作軸⇔型軸で反転)
- 構造が難解(ダブルディスパッチは初見の読者を必ず混乱させる)
- ElementがVisitorに内部を公開する必要があり、カプセル化と緊張関係
- 循環依存気味の構造(ElementとVisitorが互いの一覧を知る)でビルド依存も重い

## 適用条件

- **型の集合が安定**していて(増えない)、**操作が増え続ける**
- 型ごとの処理漏れを型システムで検出したい

## 避けるべき条件

- 型が増える(ゲームの敵・アイテムは大抵増える!)→ 通常のポリモーフィズム(操作を階層の中へ)
- 操作が2〜3個で固定 → 仮想関数を2〜3個生やす方が単純
- 閉じた型集合で値セマンティクスが許される → `std::variant`+`std::visit`

## 似たパターンとの違い

- [Iterator](/design/patterns/iterator.html): 走査の抽象化(要素をどう辿るか)。Visitorは要素ごとの処理の外部化。併用される
- [Strategy](/design/patterns/strategy.html): 1つの可変点の差し替え vs 型×操作の2軸ディスパッチ
- パターンマッチング/variant: 言語機能による代替(現代の第一候補)

## 実務でよく見かける変形

- 戻り値付きVisitor(テンプレートで戻り値型を持たせる)
- Acyclic Visitor(依存の循環を切る変形)、Walker(走査も担うVisitor)

## 過剰設計になる例

敵3種にVisitorを導入して「敵の種類を追加するたびに5個のVisitorを直す」状態になる——ゲームロジックの階層は型が増えるのが普通なので、Visitorの適用条件を満たすことは稀です。迷ったら使わない、が正解率の高いパターン。

## 関連項目

- [Interpreter](/design/patterns/interpreter.html) / [Composite](/design/patterns/composite.html) / [Iterator](/design/patterns/iterator.html)
- [キャスト(dynamic_castの問題)](/languages/cpp/casts.html)

## 理解度チェック

1. Visitorが得意な変更軸と、最悪な変更軸はそれぞれ何ですか。
2. ダブルディスパッチの「2回のディスパッチ」はそれぞれ何によって行われますか。
3. std::variant+std::visitが従来Visitorを置き換えられる条件は?

## 演習

検証サンプルに「シリアライズVisitor(各ノードを1行テキスト化)」を追加し、階層側が無変更で済むことを確認してください。次に新Element型 `LightNode` を追加し、修正が必要になった箇所をすべて列挙してください(このパターンの弱点の体感が目的です)。

---

前: [Template Method](/design/patterns/template-method.html) | [カテゴリ目次](/design/patterns/) | 次: [演習](/design/patterns/exercises.html)
