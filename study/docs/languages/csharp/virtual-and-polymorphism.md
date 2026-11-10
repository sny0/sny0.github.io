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

## C#より危険な3ポイント

### 1. overrideを書かなくても通る

```cpp
class Enemy { public: virtual void Attack(); };
class Boss : public Enemy {
public:
    void Atack();      // タイポ。C++でもC#でも、overrideなしなら別関数として通る
                       // void Atack() override; と書けば上書き対象がなくエラーになる
    void Attack(int);  // 引数違いも同様に「隠蔽」— 基底のAttack()がBossから見えなくなる
};
```

**規約: 上書きには必ず `override` を書く**(C++11以降)。書けばC#と同等の検査が手に入ります。

C++では`void Attack();`のように基底のvirtual関数とシグネチャが一致すれば、`override`を省略してもオーバーライドになります。C#は上書きに`override`が必要です。どちらも、名前を誤った普通の新規メソッドの宣言まで禁止するわけではありません。[C++の仮想関数](https://eel.is/c++draft/class.virtual)・[C#のoverride](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/override)

### 2. スライシング(C#に存在しない事故)

```cpp
std::vector<Enemy> v;
v.push_back(Boss{});    // BossのEnemy部分だけコピーされる(C#では起き得ない)
```

多態対象は `vector<std::unique_ptr<Enemy>>` などポインタで持つ——C#の「classは常に参照」が自動でやっていたことを、C++では自分で選びます(→ [値セマンティクス](/languages/csharp/pointers-references-value-semantics.html))。

### 3. コンストラクタ内の仮想呼び出しの解決先が逆

- C#: 派生のoverrideが呼ばれる(初期化前のフィールドを触る危険)
- C++: **その時点のクラス**の実装が呼ばれる(派生には決して届かない)
- どちらの言語でも「コンストラクタから仮想を呼ばない」が安全規約という結論は同じ

## コンパイル時多態と実行時多態(C++の二刀流)

C#にもstructとジェネリック制約による特殊化や、C# 11以降のstatic abstractインターフェースメンバーがあります。C++ではテンプレートと仮想関数を次のように使い分けます:

| | 実行時多態(仮想関数) | コンパイル時多態(テンプレート/オーバーロード) |
|---|---|---|
| 相手が決まる | 実行時(vtable) | コンパイル時(実体化・オーバーロード解決) |
| コスト | 間接呼び出し+インライン化阻害 | ゼロ(型ごとに最適コード) |
| 異なる型を同じ容器に | できる | できない |
| C#での近似 | virtual / interface | structジェネリックの特殊化、static abstractインターフェースメンバーなど |

**使い分けの直感**: 「実行中に相手が入れ替わる・混ざる」なら実行時多態、「コンパイル時に決まっている」ならテンプレート(→ [判断ガイド](/design/decisions/cpp-choices.html))。C#との違いは、ジェネリックの制約や実行環境の最適化も含めて比較します。[C#のstatic abstractメンバー](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters#type-arguments-implement-declared-interface)

## Unity開発者が誤解しやすい点

1. 「interfaceがないからC++は不便」— 純粋仮想クラスで同じ設計ができ、さらに多重継承でinterface複数実装も可能(→ [ISPの例](/design/solid/isp.html))
2. 「GetComponent的な型問い合わせ」を`dynamic_cast`連発で再現しない——コストと設計の両面で悪手になりがち([キャスト](/languages/cpp/casts.html))
3. UnityのMessage(SendMessage)やUnityEventの遅い動的ディスパッチに慣れていると、C++の仮想関数は桁違いに軽いことに驚くはず——「virtualは遅い」の基準が違う

## 理解度チェック

1. C++でoverrideを「必ず書く」べき理由を、C#との仕様差から説明できますか。
2. スライシングがC#に存在しない理由は?
3. C#のstructジェネリックやstatic abstractメンバーは、仮想関数による実行時多態と何が違いますか。

## 演習

<a href="/study/samples/cpp/inheritance_virtual.cpp">samples/inheritance_virtual.cpp</a> で、(a) virtual関数を同じシグネチャで宣言し、`override`を省略しても基底ポインタ経由で派生側が呼ばれること、(b) 非virtualな基底関数と同名の関数を派生側に宣言すると、基底ポインタ経由では基底側が呼ばれることを比較してください。最後に名前や引数を誤った宣言へ`override`を付け、エラーを確認します。

---

関連項目：[テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html) / [学習ガイド](/languages/csharp/) / [関数ポインタとdelegate](/languages/csharp/delegates-events-function-pointers.html)
