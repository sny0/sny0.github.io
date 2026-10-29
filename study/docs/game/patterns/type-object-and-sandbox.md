---
title: "Type Object・Subclass Sandbox・Bytecode"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "「振る舞いや種類をコードからデータへ移す」系譜の3パターンです。データ化の度合いが軽い順に並べています。共通の動機: 種類の追加・調整をプログラマとビルドから切り離し、企画のイテレーションを速くする。"
---

# Type Object・Subclass Sandbox・Bytecode

「振る舞いや種類を**コードからデータへ**移す」系譜の3パターンです。データ化の度合いが軽い順に並べています。共通の動機: **種類の追加・調整をプログラマとビルドから切り離し、企画のイテレーションを速くする**。

---

## Type Object

### 一言で言うと

「種類」をクラス(継承)ではなく**データオブジェクト**として表現する。`class Dragon : Enemy` の代わりに、`EnemyType{"dragon", hp:500, ...}` というデータを個体が参照する。

### 問題のある実装

```cpp
// C++20(問題例)— 種類=クラス
class Enemy { /* 共通 */ };
class Slime : public Enemy { /* maxHp=10, 弱点=火 */ };
class Dragon : public Enemy { /* maxHp=500, 弱点=氷 */ };
// 種類追加=クラス追加=プログラマ作業+再ビルド。データテーブルで100種、は不可能
```

### 適用後

```cpp
// C++20
#include <string>
#include <vector>

struct EnemyType {                 // 「種類」はただのデータ(JSONやCSVからロードできる)
    std::string name;
    int maxHp = 10;
    std::string weakness;
    // ドロップテーブル、攻撃力曲線、AI種別のID…
};

class Enemy {                      // 個体はタイプへの参照+個体状態
public:
    explicit Enemy(const EnemyType& type) : type_(&type), hp_(type.maxHp) {}
    const EnemyType& Type() const { return *type_; }
private:
    const EnemyType* type_;        // 非所有: 全EnemyTypeはテーブルが所有し個体より長生き
    int hp_;
};
// 種類追加 = データ1行。100種でも1000種でもクラスは2つのまま
```

検証済みサンプル: <a href="/study/samples/cpp/type_object.cpp">samples/type_object.cpp</a>

### トレードオフ

- 得: 種類追加がデータ作業に(ノンプログラマが作業可能・ホットリロード可能)。[Flyweight](/design/patterns/flyweight.html)のメモリ利益も同時に
- 失: **種類ごとの特殊な振る舞い**が表現しにくい(データは値しか持てない)。「ドラゴンだけ3回行動」はどうする? → 振る舞いIDでコード側の分岐を引く/次のSubclass Sandboxとの併用/Bytecodeへ
- 使わない: 種類が数個で振る舞いの差が大きい(素直にクラスで)

Unity: **ScriptableObjectがType Objectの公式実装**。UE: DataTable / DataAsset(→ [第10部](/game/unreal/gameplay-framework.html))。

---

## Subclass Sandbox

### 一言で言うと

基底クラスが**安全で便利な操作セット(砂場)**を protected で提供し、派生クラスは**その操作だけを組み合わせて**振る舞いを定義する。派生が外部システムに直接触れない形にする。

### 問題のある実装

```cpp
// 問題例: スキルの派生クラスがそれぞれ勝手にサウンド・パーティクル・カメラへ直接依存
class FireballSkill : public Skill {
    void Activate() override {
        AudioEngine::Play("fire");         // 派生100個がそれぞれ外部システムに結合
        ParticleSystem::Spawn("fireball"); // 外部の変更で全派生が壊れる
    }
};
```

### 適用後

```cpp
// C++20
class Skill {
public:
    virtual ~Skill() = default;
    void Activate() { OnActivate(); }        // Template Method的な入口
protected:
    virtual void OnActivate() = 0;           // 派生はこれを実装する
    // ---- 砂場: 派生が使ってよい道具はここにある物だけ ----
    void PlaySound(const std::string& id) { /* 内部でAudioへ */ }
    void SpawnParticle(const std::string& id) { /* 内部でVFXへ */ }
    void ShakeCamera(float strength) { /* 内部でCameraへ */ }
};

class FireballSkill : public Skill {
protected:
    void OnActivate() override {
        PlaySound("fire");        // 外部システムを知らない。砂場の道具だけで書く
        SpawnParticle("fireball");
    }
};
```

### トレードオフ

- 得: 外部システムとの結合が基底1か所に集約(サウンドAPI変更→基底のみ修正)。派生を書くのが簡単・安全になり、数十個量産できる
- 失: **基底が肥大化**する宿命(道具箱は増える一方)。基底の変更が全派生に波及する継承の弱点はそのまま
- 使わない: 派生が数個しかない/派生ごとに必要な道具がバラバラ(砂場が総合デパート化する)

これは[Template Method](/design/patterns/template-method.html)+[Facade](/design/patterns/facade.html)の複合形です。Unityでは「MonoBehaviourを継承した自作基底クラス(GameBehaviour等)にプロジェクト共通の道具を生やす」形で現れます。

---

## Bytecode

### 一言で言うと

振る舞いそのものを**データ(命令列)として定義**し、ゲーム内の小さな仮想マシン(VM)が解釈実行する。データ駆動の最終形態。

### 問題 → 適用

[Interpreter](/design/patterns/interpreter.html)の式ツリーは、ノードのポインタ辿り+仮想関数で遅く、メモリも食う。命令を平坦なバイト列にコンパイルし、スタックマシンで実行すれば、高速・コンパクト・シリアライズ自由になります。

```cpp
// C++20 — 最小のスタックマシン
#include <cstdint>
#include <vector>

enum class Op : std::uint8_t { PushConst, Add, Mul, ReadStat };

int Execute(const std::vector<std::uint8_t>& code, const std::vector<int>& stats) {
    std::vector<int> stack;
    for (std::size_t pc = 0; pc < code.size(); ++pc) {
        switch (static_cast<Op>(code[pc])) {
            case Op::PushConst: stack.push_back(code[++pc]); break;
            case Op::ReadStat:  stack.push_back(stats[code[++pc]]); break;
            case Op::Add: { int b = stack.back(); stack.pop_back(); stack.back() += b; break; }
            case Op::Mul: { int b = stack.back(); stack.pop_back(); stack.back() *= b; break; }
        }
    }
    return stack.back();
}
// 「attack * 2 + 5」= [ReadStat 0, PushConst 2, Mul, PushConst 5, Add]
```

検証済みサンプル: <a href="/study/samples/cpp/bytecode_vm.cpp">samples/bytecode_vm.cpp</a>

### トレードオフ

- 得: 振る舞いが完全にデータ(配信・MOD・エディタ生成可能)。Interpreterより高速・省メモリ。サンドボックス化(VMができること以上の悪さはできない=安全)
- 失: **デバッガが効かない**(自作VMの中はブレークポイントを張れない。デバッグ表示・逆アセンブラを自作する羽目に)。命令セットの設計・保守という言語処理系の仕事を抱え込む
- 使わない: 定義したい振る舞いが少ない・単純(Type Objectのデータ+数個の分岐で足りる)。既存スクリプト言語(Lua)で済む——**自作VMはLua導入すら重い制約(実行環境・審査・超軽量要件)があるときの手段**

実例: ポケモンの技エフェクト(原典の例)、MOD対応ゲームのスクリプト、シェーダ(GPUに送るバイトコード)、そして**UnityのIL2CPPが変換するIL自体**もバイトコードです(→ [第9部](/languages/csharp/il2cpp.html))。

---

## 3パターンの選び分け

| 欲しいもの | 選択 |
|---|---|
| 種類ごとの**数値・参照**の差 | Type Object(まずこれ。大半はこれで足りる) |
| 種類ごとの**振る舞い**の差(プログラマが書く) | Subclass Sandbox(またはStrategy注入) |
| 種類ごとの**振る舞い**の差(非プログラマ・実行時定義) | Bytecode / 既存スクリプト言語 |

## 理解度チェック

1. Type Objectで表現しにくいものは何ですか。その場合の選択肢は?
2. Subclass Sandboxが集約する「結合」はどこからどこへの結合ですか。
3. 自作Bytecode VMの最大の実務的欠点は?

## 演習

samples/type_object.cpp に「攻撃パターンID」を追加し、IDからコード側の攻撃関数を引くテーブル(`std::unordered_map<int, std::function<...>>`)を組み合わせて、「データで種類・コードで振る舞い」のハイブリッドを作ってください。

---

前: [最適化系パターン](/game/patterns/optimization-patterns.html) | [カテゴリ目次](/game/patterns/) | 次: [ステートマシン(FSM/HSM)](/game/patterns/state-machines.html)
