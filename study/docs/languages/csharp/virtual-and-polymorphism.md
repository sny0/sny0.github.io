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
| `new` による隠蔽 | overrideなしの同名関数(警告なしで隠蔽!) | **C++の方が危険**(下記) |

## C#より危険な3ポイント

### 1. overrideを書かなくても通る

```cpp
class Enemy { public: virtual void Attack(); };
class Boss : public Enemy {
public:
    void Atack();      // タイポ。C#なら「overrideがない」でコンパイルエラー。
                       // C++では「新しい別関数」として合法に通り、差し替わらない
    void Attack(int);  // 引数違いも同様に「隠蔽」— 基底のAttack()がBossから見えなくなる
};
```

**規約: 上書きには必ず `override` を書く**(C++11以降)。書けばC#と同等の検査が手に入ります。

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

C#の多態はほぼ実行時(virtual/interface。ジェネリックも制約はinterface経由)。C++は2系統を明確に使い分けます:

| | 実行時多態(仮想関数) | コンパイル時多態(テンプレート/オーバーロード) |
|---|---|---|
| 相手が決まる | 実行時(vtable) | コンパイル時(実体化・オーバーロード解決) |
| コスト | 間接呼び出し+インライン化阻害 | ゼロ(型ごとに最適コード) |
| 異なる型を同じ容器に | できる | できない |
| C#での近似 | virtual / interface | (ほぼ該当なし。structジェネリックのJIT特殊化が近い) |

**使い分けの直感**: 「実行中に相手が入れ替わる・混ざる」なら実行時多態、「コンパイル時に決まっている」ならテンプレート(→ [判断ガイド](/design/decisions/cpp-choices.html))。C#では選択肢がなかった場所に選択肢がある、というのがC++の姿です。

## Unity開発者が誤解しやすい点

1. 「interfaceがないからC++は不便」— 純粋仮想クラスで同じ設計ができ、さらに多重継承でinterface複数実装も可能(→ [ISPの例](/design/solid/isp.html))
2. 「GetComponent的な型問い合わせ」を`dynamic_cast`連発で再現しない——コストと設計の両面で悪手になりがち([キャスト](/languages/cpp/casts.html))
3. UnityのMessage(SendMessage)やUnityEventの遅い動的ディスパッチに慣れていると、C++の仮想関数は桁違いに軽いことに驚くはず——「virtualは遅い」の基準が違う

## 理解度チェック

1. C++でoverrideを「必ず書く」べき理由を、C#との仕様差から説明できますか。
2. スライシングがC#に存在しない理由は?
3. コンパイル時多態に対応するC#の機能がほぼ無い、とはどういうことですか。

## 演習

<a href="/study/samples/cpp/inheritance_virtual.cpp">samples/inheritance_virtual.cpp</a> に、C#の `new` キーワードによる隠蔽に相当するコード(overrideなしの同名関数)を書き、基底ポインタ経由の呼び出しがどうなるかを確認してください。その後overrideを付けてコンパイラが何を教えてくれるかを見てください。

---

関連項目：[テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html) / [学習ガイド](/languages/csharp/) / [関数ポインタとdelegate](/languages/csharp/delegates-events-function-pointers.html)
