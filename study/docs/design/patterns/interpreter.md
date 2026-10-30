---
title: Interpreter
study:
  source: C++ Wiki
  status: published
  summary: 繰り返し現れる要求のバリエーションを、小さな言語(文法を持つデータ)として表現し、それを解釈・実行する仕組みを作りたい。「企画がコードを書かずに条件式・数式・スクリプトを書ける」状態を作る道具です。
  section: reference
  format: article
  domain: design
---

# Interpreter

## 解決する問題

繰り返し現れる要求のバリエーションを、**小さな言語(文法を持つデータ)**として表現し、それを解釈・実行する仕組みを作りたい。「企画がコードを書かずに条件式・数式・スクリプトを書ける」状態を作る道具です。

GoFの中では使用頻度が低く、**本格的な言語が必要ならパーサジェネレータや既存スクリプト言語(Lua等)を使うべき**、という注意付きのパターンです。

## 登場人物と責務

- **AbstractExpression**: 式の共通インターフェース(`Evaluate(context)`)
- **TerminalExpression**: 末端(数値、変数参照)
- **NonterminalExpression**: 合成式(加算、AND、OR)— 子の式を持つ([Composite](/design/patterns/composite.html)構造)
- **Context**: 変数の値など評価に必要な環境

## 最小構成図

```
"attack * 2 + level"  →(パース)→     Add
                                    /     \
                                 Mul       Var(level)
                                /   \
                          Var(attack) Num(2)
Evaluate(context) がツリーを再帰的に評価
```

## パターンなしの実装

```cpp
// C++20(問題例)— ダメージ式がハードコードで、調整のたびに再ビルド
int CalcSkillDamage(const Stats& s, SkillId id) {
    switch (id) {
        case SkillId::Slash:    return s.attack * 2;
        case SkillId::FireBall: return s.magic * 3 + s.level;
        // 企画が式を調整するたびプログラマ作業+ビルド+配布…
    }
    return 0;
}
```

## 問題点

- バランス調整のイテレーションにプログラマとビルドが挟まる
- 式の種類がコードの分岐として増殖する

## パターン適用後のC++コード

```cpp
// C++20 — 式ツリー(パーサは省略し、ツリー構築を直接書く)
#include <memory>
#include <string>
#include <unordered_map>

using Context = std::unordered_map<std::string, int>;   // 変数環境

class Expr {
public:
    virtual ~Expr() = default;
    virtual int Evaluate(const Context& ctx) const = 0;
};

class Num : public Expr {
public:
    explicit Num(int v) : v_(v) {}
    int Evaluate(const Context&) const override { return v_; }
private:
    int v_;
};
class Var : public Expr {
public:
    explicit Var(std::string name) : name_(std::move(name)) {}
    int Evaluate(const Context& ctx) const override { return ctx.at(name_); }
private:
    std::string name_;
};
class Add : public Expr {
public:
    Add(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
    int Evaluate(const Context& ctx) const override { return l_->Evaluate(ctx) + r_->Evaluate(ctx); }
private:
    std::unique_ptr<Expr> l_, r_;
};
class Mul : public Expr {
public:
    Mul(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
    int Evaluate(const Context& ctx) const override { return l_->Evaluate(ctx) * r_->Evaluate(ctx); }
private:
    std::unique_ptr<Expr> l_, r_;
};

// "attack * 2 + level" に相当するツリー(実際はデータファイルからパースして構築)
// auto damage = std::make_unique<Add>(
//     std::make_unique<Mul>(std::make_unique<Var>("attack"), std::make_unique<Num>(2)),
//     std::make_unique<Var>("level"));
// damage->Evaluate({{"attack",10},{"level",5}}) == 25
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_interpreter.cpp">samples/pattern_interpreter.cpp</a>

## C#またはUnityでの実装

Unityで自前の式言語を組むより、既存の仕組みに乗るのが普通です。

- **条件データのツリー化**: ScriptableObjectで `AndCondition`/`OrCondition`/`StatCondition` を組む(エディタで文法を組み立てる = パーサ不要のInterpreter)
- 数式が要るだけなら、既存の式評価ライブラリやC#の `Func` 合成
- 本格スクリプトはLua(MoonSharp)や、UEなら[Blueprint](/game/unreal/reflection-and-uht.html)(ビジュアル言語のInterpreter/コンパイラ)

## ゲームでの具体例

- ダメージ式・ドロップ率式のデータ化(バランス調整の高速化)
- クエスト・実績の条件式(「レベル10以上 AND (ボス撃破 OR 隠し部屋発見)」→ [Composite](/design/patterns/composite.html)の演習と同型)
- 会話スクリプト・イベントスクリプトの簡易言語
- ビヘイビアの条件記述(→ [Behavior Tree](/game/patterns/behavior-tree-and-blackboard.html)は木構造の行動言語とみなせる)

## 利点

- 企画・非プログラマがロジックを書ける(イテレーション速度が跳ね上がる)
- 式・条件がデータになる: 保存、通信、動的生成、A/Bテストが可能
- 文法の要素追加は式クラスの追加で済む([OCP](/design/solid/ocp.html))

## 欠点

- **パーサ・エラー処理・デバッグ手段まで含めると想像の数倍のコスト**(書けるだけでは駄目で、「間違った式を書いた企画に分かるエラー」が必須)
- 実行速度はネイティブコードより桁で遅い(ツリー走査+仮想呼び出し。ホットパスなら[Bytecode](/game/patterns/type-object-and-sandbox.html)化を検討)
- 言語は育つ: 変数→条件→ループ→関数…と要求が膨らみ、気づけば貧弱な自作言語の保守者になる

## 適用条件

- 調整の主体が非プログラマで、イテレーション頻度が高い
- 表現したいものが**小さく閉じた文法**で足りる(数式、条件式)

## 避けるべき条件

- 式が数個で固定 → ハードコード+定数の外部化で十分
- 汎用性が要る → Lua等の既存言語を組み込む方が、実装・ドキュメント・デバッガすべてで勝る

## 似たパターンとの違い

- [Composite](/design/patterns/composite.html): Interpreterの式ツリーはCompositeそのもの(+評価という操作)
- [Strategy](/design/patterns/strategy.html): 振る舞いの差し替え単位がコード(クラス)かデータ(式)か
- [Visitor](/design/patterns/visitor.html): 式ツリーに評価以外の操作(最適化、表示)を足すときの相棒

## 実務でよく見かける変形

- 逆ポーランド記法での評価(ツリーを作らずスタックで評価。軽量)
- [Bytecode](/game/patterns/type-object-and-sandbox.html)パターン: 式をバイト列にコンパイルして高速に解釈(Game Programming Patternsの推奨進化形)

## 過剰設計になる例

「将来企画が式を書くかも」で自作式言語を先行整備——実際の要求は「定数を3つ外部ファイルにしたい」だけだった、はよくある話。**まず定数の外部化、次に式のデータ化、最後に言語**の順で段階を踏むこと。

## 関連項目

- [Composite](/design/patterns/composite.html) / [Visitor](/design/patterns/visitor.html) / [Bytecode(Type Objectのページ内)](/game/patterns/type-object-and-sandbox.html)
- [ケーススタディ: クエスト](/design/case-studies/quest-system.html)

## 理解度チェック

1. Interpreterの導入が正当化される中心的な条件は何ですか。
2. 「自作言語よりLua」と言われる理由を3つ挙げてください。
3. 式ツリーとCompositeの関係は?

## 演習

比較演算(`>=`)とAND/ORを追加し、「attack * 2 + level >= 30 AND stage >= 3」のような解放条件式を評価できるよう拡張してください(検証サンプルに骨格あり)。boolとintの型をどう扱うかの設計判断も記録してください。

---

関連項目：[Command](/design/patterns/command.html) / [学習ガイド](/design/patterns/) / [Iterator](/design/patterns/iterator.html)
