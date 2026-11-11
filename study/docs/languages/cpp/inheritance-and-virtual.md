---
title: 継承・仮想関数・純粋仮想関数・抽象クラス・多重継承・override/final
study:
  source: C++ Wiki
  status: published
  summary: C++の継承は「基底のメンバを引き継ぎ、基底として扱える」仕組み。C++もC#も既定では非virtualですが、仮想関数の上書きで override を省略したときの挙動が異なります。
  section: reference
  format: article
  domain: languages
---

# 継承・仮想関数・純粋仮想関数・抽象クラス・多重継承・override/final

## 一言で言うと

C++の継承は「基底のメンバを引き継ぎ、基底として扱える」仕組み。ただし**メンバ関数は既定で非virtual**(同名の関数を派生側に宣言しても基底経由の呼び出しは切り替わらない)で、**動的に振る舞いを切り替えたい関数だけ `virtual`** を付けます。C#も既定では非virtualですが、仮想関数の上書きで`override`を省略したときの挙動が異なります。

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

仮想関数を持つオブジェクトはvptr(仮想関数テーブルへのポインタ、8バイト)を持ち、仮想関数をテーブル経由で間接的に呼び出します(詳細: [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))。コストには間接参照とインライン化の制約があり、通常のゲームロジックでは差が小さいものの、頻繁に実行するループでは考慮します。

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

`override` はC++11から。**上書きのつもりの関数には全部書く**と、基底の仮想関数を実際に上書きしているか検査できます。C++では省略してもシグネチャが一致すれば上書きされます。C#では基底の通常の`virtual`メソッドと同じシグネチャに`override`も`new`も付けないと、隠蔽としてCS0114が出ます。[C++の仮想関数](https://eel.is/c++draft/class.virtual)・[CS0114](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0114)

### 3. スライシング(C#にない事故)

上の`Enemy`は純粋仮想関数を持つ抽象クラスなので、`std::vector<Enemy>`の要素として生成できません。ここでは、同じ名前の**具象クラス**を使う独立した例で、派生から基底への値コピーを観察します。[C++草案: 抽象クラス](https://eel.is/c++draft/class.abstract)・[コピーコンストラクタ](https://eel.is/c++draft/class.copy.ctor)

```cpp
#include <cstdio>
#include <vector>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual void Attack() const { std::puts("Enemy: basic attack"); }
};

class Dragon : public Enemy {
public:
    void Attack() const override { std::puts("Dragon: breath!"); }
};

int main() {
    Dragon dragon;
    const Enemy& ref = dragon;
    ref.Attack();                   // Dragonのブレス

    std::vector<Enemy> enemies;     // 具象クラスEnemyの値を格納する
    enemies.push_back(dragon);      // Dragonの「Enemy部分だけ」をコピー
    enemies[0].Attack();            // Enemyの通常攻撃
}
```

多態的に扱うオブジェクトは、基底型の値へコピーせず `std::vector<std::unique_ptr<Enemy>>` のようにポインタで持ちます。C#のclassは常に参照で扱うので、このスライシングは起きません。UnityからC++を学ぶときに特に見落としやすい違いです。

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
- `final` な型や関数では、コンパイラの最適化によって仮想呼び出しを直接呼び出しにできることがあります。この変換を脱仮想化(devirtualization)と呼びます。

## 多重継承

C++は複数の基底を持てます(C#はclass1つ+interface複数)。

- **推奨される使い方**: 「実装を持つ基底1つ+純粋仮想だけのインターフェース複数」— 実質C#と同じ規律([ISP](/design/solid/isp.html)の例のように)
- **避けるべき使い方**: 実装を持つ基底を複数継承(データの重複、菱形継承問題)。菱形(D→B,C→A)では基底Aが2つ入り、`virtual継承`という複雑な仕組みが必要になる。**ゲームコードで菱形継承が必要になったら、設計をコンポジションに変えるサイン**(→ [継承かコンポジションか](/design/decisions/inheritance-or-composition.html))

## C#との違い(まとめ)

| | C# | C++ |
|---|---|---|
| メソッドの既定 | 非virtual | 非virtual |
| override | 上書きに必須。同じシグネチャで`override`も`new`も省略すると、通常のvirtualメソッドは隠蔽されCS0114が出る | 任意。省略しても一致すれば上書きされるが、上書きの意図を検査できない |
| 基底の破棄 | GCが型を知っている | 仮想デストラクタを自分で書く |
| interface | 専用構文 | 純粋仮想関数のみの抽象クラスで表現(慣習) |
| スライシング | 存在しない(classは参照) | 値コピーで発生する |
| sealed | sealed | final |

## ゲーム開発での使用例

- インターフェース(`IDamageable`, `IWeapon`)による差し替え: [ポリモーフィズム](/design/foundations/polymorphism-interface.html)、[Strategy](/design/patterns/strategy.html)、[State](/design/patterns/state.html)の実装手段
- エンジン規約への準拠(UEの `AActor::Tick` override → [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html))
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
2. 具象基底へ値コピーすると何が切り落とされますか。抽象基底の値を作ろうとした場合はどうなりますか。
3. C++の多重継承の「推奨される形」は?

## 演習

samples/inheritance_virtual.cpp で、(a) overrideを外してタイポした場合に何が起きるか、(b) 具象基底`Enemy`の`std::vector<Enemy>`に`Dragon`を値コピーした場合に、出力がどう変わるかを確認してください。

---

関連項目：[RAII](/languages/cpp/raii.html) / [学習ガイド](/languages/cpp/) / [関数オーバーロードと演算子オーバーロード](/languages/cpp/overloading.html)
