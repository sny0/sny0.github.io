---
title: "vtable・vptr・仮想関数呼び出し"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "仮想関数の「実行時に実際の型のメソッドが呼ばれる」魔法の正体は、関数ポインタの表(vtable)を型ごとに1つ作り、各オブジェクトが自分の型の表へのポインタ(vptr)を持つという単純な仕組みです。"
---

# vtable・vptr・仮想関数呼び出し

## 一言で言うと

[仮想関数](/languages/cpp/inheritance-and-virtual.html)の「実行時に実際の型のメソッドが呼ばれる」魔法の正体は、**関数ポインタの表(vtable)を型ごとに1つ作り、各オブジェクトが自分の型の表へのポインタ(vptr)を持つ**という単純な仕組みです。

※ これは標準の要求ではなく**主流実装(MSVC/GCC/Clang)の説明**です。標準は「仮想呼び出しの意味」だけを定め、実装方法は自由——ただし現実にはほぼ全処理系がこの方式です。

## 仕組みの図解

```cpp
class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void Attack();
    virtual void Die();
    int hp = 100;
};
class Dragon : public Enemy {
public:
    void Attack() override;   // 上書き
    // Dieは上書きしない
};
```

```
型ごとに1つ(静的データ領域):
  Enemy のvtable            Dragon のvtable
  [0] ~Enemy               [0] ~Dragon
  [1] Enemy::Attack        [1] Dragon::Attack   ← 上書きされたスロット
  [2] Enemy::Die           [2] Enemy::Die       ← 継承のまま

オブジェクトごと(インスタンス内):
  Enemy e:  [vptr → Enemyのvtable][hp=100]     sizeof = 8 + 4 (+パディング) = 16
  Dragon d: [vptr → Dragonのvtable][hp=100]    ← vptrはコンストラクタが設定する
```

```cpp
Enemy* e = &d;
e->Attack();
// コンパイル結果(概念): 
//   1. vptrを読む       (メモリアクセス1回)
//   2. vtable[1]を読む   (メモリアクセス1回)
//   3. その先を呼ぶ      (間接call)
// 非仮想なら: call Enemy::Attack(アドレス直埋め、1命令)
```

検証済みサンプル: <a href="/study/samples/cpp/vtable_size.cpp">samples/vtable_size.cpp</a>(vptrによるsizeof変化の観察)

## この仕組みから導かれること

1. **サイズ**: 仮想関数を1つでも持つと、インスタンスあたり**ポインタ1個分(64bitで8バイト)増える**。仮想関数の数は無関係(表は型ごとに1つ)。10万個の弾に仮想関数を持たせると800KB+キャッシュ効率低下
2. **コスト**: 間接呼び出し自体は数サイクル。本当のコストは (a) **インライン化を阻害**する(呼び先が実行時まで不明→展開できない→連鎖最適化も止まる)、(b) [分岐予測](/runtime/cpp-internals/cache-branch-simd.html)ミスの可能性、(c) vtableアクセスのキャッシュミス
3. **コンストラクタ中の仮想呼び出しが「その時点の型」になる理由**: vptrは構築の進行に合わせて書き換わる(基底コンストラクタ実行中は基底のvtableを指している)
4. **多重継承**では vptr が複数になり、キャストでthisポインタの調整(アドレスのずらし)が入る——「多重継承は複雑」の実装面の根拠
5. デバッガで「vtableが壊れている」クラッシュ(解放済みオブジェクトへの仮想呼び出し=[UAF](/runtime/memory/memory-bugs.html)の典型症状)を読めるようになる

## 脱仮想化(devirtualization)

コンパイラが実際の型を証明できると、仮想呼び出しを直接呼び出しに変えてインライン化まで進めます。

```cpp
Dragon d;
d.Attack();          // 型が確定 → 直接呼び出し(仮想のコストなし)
final指定の型・関数    // 「これ以上派生しない」証明 → 脱仮想化の材料(→ final)
```

「仮想関数=常に遅い」ではなく、**最適化器に証明材料を与えられるか**の問題でもあります。

## C#との対応

- C#のvirtualメソッドも同様の仕組み(メソッドテーブル)。ただしC#は**全オブジェクトが型情報ポインタを持つ**(GC・リフレクションのため)ので、「virtualを避けてもオブジェクトヘッダは消えない」。C++は仮想関数を持たない型なら**本当にただのデータ**になる——この「払わない選択ができる」ことがC++の特徴
- C#のinterface呼び出し・delegateも間接呼び出しで、コスト構造の直感は共通

## Unity開発者が誤解しやすい点

1. 「virtualは遅いから禁止」— フレーム数千回の呼び出しでは測定誤差。**数十万回のループの内側**で初めて設計問題になる(そこは[ECS](/game/patterns/component-and-ecs.html)/データ指向の領域)
2. 「C++のクラスは全部重い」— 仮想関数がなければヘッダすらないゼロコスト。C#の感覚より軽い
3. MonoBehaviourのUpdateが「仮想関数だから遅い」— 実際はリフレクション由来の呼び出し機構で、これとは別の話

## ゲーム開発での使用例

- インターフェース境界(IWeapon等)は仮想で設計し、内側のホットループ(弾の移動)は非仮想・データ指向で書く——**境界は仮想、内側は直接**が実務のバランス
- プロファイラで仮想呼び出しがボトルネックと出たら: 型でソートして分岐予測を助ける/finalで脱仮想化/[Type Object](/game/patterns/type-object-and-sandbox.html)やswitchへ構造変更

## 理解度チェック

1. vtableは「何ごと」に、vptrは「何ごと」に存在しますか。
2. 仮想呼び出しの本当のコストは間接callそのものより何ですか。
3. 仮想関数を持つ型のsizeofが増える理由と増加量は?

## 演習

samples/vtable_size.cpp で (a) 仮想関数の有無によるsizeofの変化、(b) 仮想関数を2個→5個に増やしてもsizeofが変わらないことを確認してください。godbolt.orgで `e->Attack()` と `d.Attack()`(具象型)の生成コードの違いも観察を推奨。

---

前: [テンプレートの実体化とinline](/runtime/cpp-internals/template-instantiation-and-inline.html) | [カテゴリ目次](/runtime/cpp-internals/) | 次: [RTTI・dynamic_cast・例外処理の仕組み](/runtime/cpp-internals/exceptions-and-rtti-impl.html)
