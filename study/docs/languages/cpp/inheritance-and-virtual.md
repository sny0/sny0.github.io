---
title: "継承・仮想関数・純粋仮想関数・抽象クラス・多重継承・override/final"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "C++の継承は「基底のメンバを引き継ぎ、基底として扱える」仕組み。ただしメンバ関数は既定で非virtual(上書きしても基底経由の呼び出しは切り替わらない)で、動的に振る舞いを切り替えたい関数だけ virtual を付けます。C#(全メソッドがvirtual可能・overrideが厳格)との差分が事"
---

# 継承・仮想関数・純粋仮想関数・抽象クラス・多重継承・override/final

## 一言で言うと

C++の継承は「基底のメンバを引き継ぎ、基底として扱える」仕組み。ただし**メンバ関数は既定で非virtual**(上書きしても基底経由の呼び出しは切り替わらない)で、**動的に振る舞いを切り替えたい関数だけ `virtual`** を付けます。C#(全メソッドがvirtual可能・overrideが厳格)との差分が事故の元です。

## 基本形

```cpp
// C++20
class Enemy {
public:
    virtual ~Enemy() = default;         // ★基底として使うクラスは仮想デストラクタ必須(後述)
    virtual void Attack() { /* 通常攻撃 */ }        // 仮想: 派生で差し替え可能
    virtual int Cost() const = 0;       // 純粋仮想(=0): 実装なし。派生に実装を強制
    void TakeDamage(int d) { hp_ -= d; }            // 非仮想: 差し替え不可(全員共通の処理)
protected:
    int hp_ = 100;
};
// 純粋仮想を1つでも持つクラス=抽象クラス: インスタンス化できない(Enemy e; はエラー)

class Dragon : public Enemy {
public:
    void Attack() override { /* ブレス */ }   // override必須の習慣に(下記)
    int Cost() const override { return 10; }
};

void Battle(Enemy& e) {
    e.Attack();       // 実行時にeの実際の型のAttackが呼ばれる(動的ディスパッチ)
    e.TakeDamage(5);  // 常にEnemy::TakeDamage(静的に決まる)
}
```

検証済みサンプル: <a href="/study/samples/cpp/inheritance_virtual.cpp">samples/inheritance_virtual.cpp</a>

## virtualの仕組み(概要)

仮想関数を持つオブジェクトは**vptr(仮想関数テーブルへのポインタ、8バイト)**を持ち、呼び出しはテーブル経由の間接呼び出しになります(詳細: [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))。コストは「間接参照+インライン化阻害」で、通常のゲームロジックでは誤差、超ホットループでは考慮対象です。

## 落とし穴と対策

### 1. 仮想デストラクタ

```cpp
Enemy* e = new Dragon();
delete e;   // ~Enemy()が仮想でなければ、~Dragon()が呼ばれない = 未定義動作(実害: リーク等)
```

**規則: 基底ポインタ経由でdeleteされうるクラスは `virtual ~T() = default;`**。[スマートポインタ](/languages/cpp/smart-pointers.html)の`shared_ptr`は型消去でこの罠を回避するが、`unique_ptr<Base>`は仮想デストラクタが必要。

### 2. override(必ず書く)

```cpp
class Dragon : public Enemy {
    void Atack() override;    // タイポ → overrideのおかげでコンパイルエラー
    // overrideなしだと「新しい別関数の定義」として静かに通り、差し替わらないバグに
};
```

`override` はC++11から。**上書きのつもりの関数には全部書く**(C#では書かないと警告が出るが、C++では書かないと検査されない)。

### 3. スライシング(C#にない事故)

```cpp
std::vector<Enemy> enemies;        // 値のvector
enemies.push_back(Dragon{});       // Dragonの「Enemy部分だけ」がコピーされる!
enemies[0].Attack();               // 通常攻撃(Dragonの情報は切り落とされた)
```

**多態的に扱うオブジェクトは値でコピーしない**。`std::vector<std::unique_ptr<Enemy>>` のようにポインタで持つ。C#はclassが常に参照なのでこの問題自体が存在しない——Unity経験者が最も踏みやすいC++の罠の一つ。

### 4. コンストラクタ・デストラクタ内の仮想呼び出し

構築中は「まだ派生部分が存在しない」ため、仮想呼び出しは**その時点のクラスの実装**に解決される(C#と逆の挙動: C#は派生のoverrideが呼ばれる)。初期化フローで仮想関数に頼らない。

## final

```cpp
class Boss final : public Enemy { /* これ以上派生させない */ };
class Enemy {
    virtual void Attack() final;   // この関数はもう上書きさせない
};
```

- 設計意図の表明(この階層はここで打ち止め)
- 最適化ヒント(finalな型・関数は仮想呼び出しを直接呼び出しに脱仮想化(devirtualization)できることがある — コンパイラ最適化に依存)

## 多重継承

C++は複数の基底を持てます(C#はclass1つ+interface複数)。

- **推奨される使い方**: 「実装を持つ基底1つ+純粋仮想だけのインターフェース複数」— 実質C#と同じ規律([ISP](/design/solid/isp.html)の例のように)
- **避けるべき使い方**: 実装を持つ基底を複数継承(データの重複、菱形継承問題)。菱形(D→B,C→A)では基底Aが2つ入り、`virtual継承`という複雑な仕組みが必要になる。**ゲームコードで菱形継承が必要になったら、設計をコンポジションに変えるサイン**(→ [継承かコンポジションか](/design/decisions/inheritance-or-composition.html))

## C#との違い(まとめ)

| | C# | C++ |
|---|---|---|
| メソッドの既定 | 非virtual(ただしvirtual化は自由) | 非virtual(同じ)|
| override | キーワード必須(コンパイラ検査) | 任意だが**書かないと検査されない** |
| 基底の破棄 | GCが型を知っている | 仮想デストラクタを自分で書く |
| interface | 専用構文 | 純粋仮想関数のみの抽象クラスで表現(慣習) |
| スライシング | 存在しない(classは参照) | 値コピーで発生する |
| sealed | sealed | final |

## ゲーム開発での使用例

- インターフェース(`IDamageable`, `IWeapon`)による差し替え: [ポリモーフィズム](/design/foundations/polymorphism-interface.html)、[Strategy](/design/patterns/strategy.html)、[State](/design/patterns/state.html)の実装手段
- エンジン規約への準拠(UEの `AActor::Tick` override → [第10部](/game/unreal/uobject-actor-component.html))
- 深い実装継承の敵階層は避ける(→ [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html))

## 使う場面 / 使わない場面

- **virtualを使う**: 実行時に型で振る舞いを変える境界(インターフェース)。フレームワークのフック
- **使わない**: 型ごとの差がコンパイル時に決まる([テンプレート](/languages/cpp/templates-and-concepts.html)で足りる)、差し替えの予定がない、超ホットループの内側(→ [テンプレートか仮想関数か](/design/decisions/cpp-choices.html))
- 「とりあえず全部virtual」はC++では二重に悪い(vptr+間接呼び出しのコスト、意図の不明瞭化)

## よくある誤解

- 「virtualは遅いから禁止」— 計測せずに言うのは[早すぎる最適化](/design/foundations/yagni-kiss-dry.html)。フレームに数千回程度なら問題にならないのが普通
- 「protectedメンバ変数は便利」— 派生全部が基底の内部表現に結合する。原則privateにし、protectedは関数だけにするのが安全寄りの習慣

## 関連項目

- [vtableと仮想関数呼び出しの仕組み](/runtime/cpp-internals/vtable-and-virtual-calls.html)
- [仮想関数とvirtual/override(C#対比)](/languages/csharp/virtual-and-polymorphism.html)
- [LSP](/design/solid/lsp.html)

## 理解度チェック

1. 仮想デストラクタが必要になる条件と、なければ何が起きるかを言えますか。
2. スライシングはどんな操作で起き、どう防ぎますか。
3. C++の多重継承の「推奨される形」は?

## 演習

samples/inheritance_virtual.cpp で、(a) overrideを外してタイポした場合に何が起きるか、(b) `std::vector<Enemy>` にDragonを入れた場合(スライシング)の出力を確認してください。

---

前: [RAII](/languages/cpp/raii.html) | [カテゴリ目次](/languages/cpp/) | 次: [関数オーバーロードと演算子オーバーロード](/languages/cpp/overloading.html)
