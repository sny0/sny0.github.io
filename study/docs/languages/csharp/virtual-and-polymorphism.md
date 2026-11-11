---
title: 仮想関数と virtual/override / コンパイル時多態と実行時多態
study:
  source: C++ Wiki
  status: published
  summary: "言語機能の詳細は継承と仮想関数、内部の仕組みはvtableで説明済み。ここではC#との差分に集中します。 規約: 上書きには必ず override を書く(C++11以降)。書けばC#と同等の検査が手に入ります。"
  section: reference
  format: article
  domain: languages
---

# 仮想関数と virtual/override / コンパイル時多態と実行時多態

言語機能の詳細は[継承と仮想関数](/languages/cpp/inheritance-and-virtual.html)、内部の仕組みは[vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html)で説明済み。ここでは**C#との差分**に集中します。

## 対応表

| C# | C++ | 差分 |
|---|---|---|
| `virtual void F()` | `virtual void F()` | ほぼ同じ(既定非virtualも同じ) |
| `override void F()` | `void F() override` | **C#は必須、C++は任意**(でも必ず書く) |
| `abstract void F()` | `virtual void F() = 0`(純粋仮想) | 対応 |
| `abstract class` | 純粋仮想を持つクラス(抽象クラス) | C++は専用キーワードなし |
| `interface IWeapon` | 純粋仮想のみの抽象クラス(慣習) | C++は言語構文なし([ISP](/design/solid/isp.html)参照) |
| `sealed` | `final` | 対応 |
| `base.F()` | `Base::F()` | 対応 |
| `new` による隠蔽 | 非virtualな基底関数と同名の関数を派生側に宣言 | C++では基底がvirtualでシグネチャが一致すれば、`override`なしでも上書きされる |

<div id="c-より危険な3ポイント" class="study-legacy-anchor" aria-hidden="true"></div>

## C#と挙動が異なる3ポイント

### 1. overrideを書かなくても通る

```cpp
#include <cstdio>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void Attack() { std::puts("Enemy: basic attack"); }
};

class Boss : public Enemy {
public:
    void Atack() {}      // タイポ。別関数として通る
                         // void Atack() override と書けば上書き対象がなくエラーになる
    void Attack(int) {}  // 基底のAttack()を隠すが、オーバーライドしない
};

class Mage : public Enemy {
public:
    void Attack() { std::puts("Mage: magic attack"); }  // 一致するので暗黙にオーバーライド
};

int main() {
    Boss boss;
    Mage mage;
    Enemy& bossAsEnemy = boss;
    Enemy& mageAsEnemy = mage;
    bossAsEnemy.Attack();  // Enemyの通常攻撃
    mageAsEnemy.Attack();  // Mageの魔法攻撃
}
```

**規約: 上書きには必ず `override` を書く**(C++11以降)。書けばC#と同等の検査が手に入ります。

C++では、基底のvirtual関数とシグネチャが一致すれば、`override`を省略してもオーバーライドになります。C#は上書きに`override`が必要です。基底の通常の`virtual`メソッドと同じシグネチャで`override`も`new`も付けずに宣言すると、基底メソッドを隠し、CS0114の警告が出ます。名前そのものを誤った宣言は、`override`がなければどちらの言語でも別のメソッドとして通り得ます。[C++の仮想関数](https://eel.is/c++draft/class.virtual)・[C#のoverride](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/override)・[CS0114](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0114)

### 2. スライシング(C#に存在しない事故)

次は具象クラス`Enemy`を使う独立した例です。`Boss`を基底参照で呼ぶ場合と、`Enemy`の値としてコピーする場合を比べます。

```cpp
#include <cstdio>
#include <vector>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void Attack() const { std::puts("Enemy: basic attack"); }
};

class Boss : public Enemy {
public:
    void Attack() const override { std::puts("Boss: special attack"); }
};

int main() {
    Boss boss;
    const Enemy& ref = boss;
    ref.Attack();          // Bossの特殊攻撃

    std::vector<Enemy> v;
    v.push_back(boss);    // BossのEnemy部分だけコピーされる(C#では起き得ない)
    v[0].Attack();        // Enemyの通常攻撃
}
```

多態的に扱うオブジェクトは `vector<std::unique_ptr<Enemy>>` などでポインタとして持ちます。C#のclassは常に参照で扱われますが、C++では値とポインタのどちらで持つかを自分で選びます(→ [値セマンティクス](/languages/csharp/pointers-references-value-semantics.html))。

### 3. コンストラクタ内の仮想呼び出しの解決先が逆

- C#: 派生のoverrideが呼ばれる(初期化前のフィールドを触る危険)
- C++: **その時点のクラス**の実装が呼ばれる(派生には決して届かない)
- どちらの言語でも「コンストラクタから仮想を呼ばない」が安全規約という結論は同じ

## コンパイル時多態と実行時多態(C++の二刀流)

C#にもstructとジェネリック制約による特殊化や、C# 11以降のstatic abstractインターフェースメンバーがあります。C++ではテンプレートと仮想関数を次のように使い分けます。

| | 実行時多態(仮想関数) | コンパイル時多態(テンプレート/オーバーロード) |
|---|---|---|
| 相手が決まる | 実行時(vtable) | コンパイル時(実体化・オーバーロード解決) |
| コスト | 間接呼び出し+インライン化阻害 | ゼロ(型ごとに最適コード) |
| 異なる型を同じ容器に | できる | できない |
| C#での近似 | virtual / interface | structジェネリックの特殊化、static abstractインターフェースメンバーなど |

実行中に扱う型が切り替わったり複数混在したりするなら実行時多態、コンパイル時に型が決まるならテンプレートを使います(→ [判断ガイド](/design/decisions/cpp-choices.html))。C#との違いは、ジェネリックの制約や実行環境の最適化も含めて比較します。[C#のstatic abstractメンバー](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters#type-arguments-implement-declared-interface)

## Unity開発者が誤解しやすい点

1. 「interfaceがないからC++は不便」— 純粋仮想クラスで同じ設計ができ、さらに多重継承でinterface複数実装も可能(→ [ISPの例](/design/solid/isp.html))
2. 「GetComponent的な型問い合わせ」を`dynamic_cast`連発で再現しない——コストと設計の両面で悪手になりがち([キャスト](/languages/cpp/casts.html))
3. UnityのMessage(SendMessage)やUnityEventの遅い動的ディスパッチに慣れていると、C++の仮想関数は桁違いに軽いことに驚くはず——「virtualは遅い」の基準が違う

## 理解度チェック

1. 基底のvirtualメソッドと同じシグネチャで`override`を省略すると、C++とC#でそれぞれ何が起きますか。
2. スライシングがC#に存在しない理由は?
3. C#のstructジェネリックやstatic abstractメンバーは、仮想関数による実行時多態と何が違いますか。

## 演習

<a href="/study/samples/cpp/inheritance_virtual.cpp">samples/inheritance_virtual.cpp</a> で、(a) virtual関数を同じシグネチャで宣言し、`override`を省略しても基底ポインタ経由で派生側が呼ばれること、(b) 非virtualな基底関数と同名の関数を派生側に宣言すると、基底ポインタ経由では基底側が呼ばれることを比較してください。最後に名前や引数を誤った宣言へ`override`を付け、エラーを確認します。

---

関連項目：[テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html) / [学習ガイド](/languages/csharp/) / [関数ポインタとdelegate](/languages/csharp/delegates-events-function-pointers.html)
