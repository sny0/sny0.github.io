---
title: "依存関係と依存の方向"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "依存(dependency)とは「A のコードが B を知っている(B が変わると A が壊れうる)」関係。依存の方向を制御することが設計の中心技術です。原則は「変わりやすいものに依存しない。変わりにくいものに依存させる」。"
---

# 依存関係と依存の方向

## 一言で言うと

**依存(dependency)**とは「A のコードが B を知っている(B が変わると A が壊れうる)」関係。**依存の方向**を制御することが設計の中心技術です。原則は「**変わりやすいものに依存しない。変わりにくいものに依存させる**」。

## 解決したい問題

依存は避けられません(何にも依存しないコードは何もできない)。問題は、

- 依存が**多すぎる**: 1つの変更が大量のクラスに波及する
- 依存の**方向が悪い**: 安定していてほしい中核ロジックが、変わりやすい末端(UI、保存形式)に依存している
- 依存が**循環している**: A→B→A。どちらも単独で変更・テスト・再利用できない

## 「依存している」とは具体的に何か

C++では以下があれば依存です。

```cpp
#include "Enemy.h"          // includeは依存(Enemy.hの変更で再コンパイル)
class Radar {
    Enemy* target_;         // 型を知っている(生ポインタ: 所有せず参照するだけ)
    void Scan(Enemy& e);    // 引数の型
    Enemy Make();           // 戻り値の型
};
```

C#でも同じで、`using` して型名を書けば依存です。**「B が変わったとき A を再確認する必要があるか?」**が判定基準です。

## 問題のある実装(方向が悪い例)

戦闘の中核ロジックが、変わりやすいUIに依存しています。

```cpp
// C++20(問題例)
#include "HpBarWidget.h"   // 中核ロジックがUI実装をinclude

class BattleLogic {
public:
    void ApplyDamage(int amount) {
        hp_ -= amount;
        hpBar_->SetFillRate(static_cast<float>(hp_) / maxHp_);  // UIを直接更新
    }
private:
    int hp_ = 100, maxHp_ = 100;
    HpBarWidget* hpBar_;   // 生ポインタ: UIの寿命はUIシステムが管理しているため所有しない
};
```

## 何が問題になるか

- HPバーのデザイン変更(Widget差し替え)のたびに BattleLogic を触る。**安定していてほしい側が、変わりやすい側の都合で変更される**。
- UIなしで戦闘ロジックをテストできない(ヘッドレスのバランス調整シミュレーションが書けない)。
- 依存の連鎖: BattleLogic → HpBarWidget → 描画エンジン。戦闘のテストに描画エンジンが必要になる。

## 改善した実装(依存の向きを逆転する)

「通知を受けたい側(UI)」が「中核(戦闘)」に依存するように向きを変えます。

```cpp
// C++20(骨格)
#include <functional>
#include <vector>

class BattleLogic {
public:
    // UIのことは知らない。「HPが変わった」と通知するだけ
    std::function<void(int hp, int maxHp)> onHpChanged;  // 単純化のため1購読者。複数ならvector

    void ApplyDamage(int amount) {
        hp_ -= amount;
        if (onHpChanged) onHpChanged(hp_, maxHp_);
    }
private:
    int hp_ = 100, maxHp_ = 100;
};

// UI側(変わりやすい側)が、中核(変わりにくい側)に依存して購読する
void SetupUi(BattleLogic& battle, HpBarWidget& bar) {
    battle.onHpChanged = [&bar](int hp, int maxHp) {
        bar.SetFillRate(static_cast<float>(hp) / maxHp);
    };
}
```

依存の向き: 変更前 `BattleLogic → HpBarWidget`、変更後 `UI設定コード → BattleLogic`。中核は誰にも依存しなくなりました。この「抽象やコールバックを挟んで依存の向きを逆にする」技術を原則として定式化したものが [DIP(依存性逆転の原則)](/design/solid/dip.html) です。

## 何が改善されたか

- UIをいくら作り替えても BattleLogic は無変更・再コンパイル不要。
- BattleLogic 単体でテスト可能(コールバックにテスト用ラムダを渡すだけ)。

## 代わりに何を失ったか

- 「ダメージを与えたらUIがどう動くか」を追うのに、購読設定のコードを探す必要がある。
- コールバックの寿命管理という新しい注意点が生まれた(barが先に破棄されたら? → [dangling pointer](/runtime/memory/memory-bugs.html))。

## 循環依存

`Player → Inventory → Item → Player`(装備者を知りたい)のような循環は、C++では**コンパイルすら通らない**ことがあり(includeの循環)、通っても全クラスが一蓮托生になります。対処:

1. 片方をイベント通知に変える(上の手法)
2. 共通部分を第三のクラスに抽出して両方がそれに依存する
3. C++なら[前方宣言](/runtime/cpp-internals/translation-units-and-headers.html)でinclude循環だけは切れる(設計上の循環は残る)

## 図解

```
悪い:  [BattleLogic] ──依存──> [HpBarWidget] ──> [描画エンジン]
        (安定してほしい)          (よく変わる)

良い:  [UI設定コード] ──依存──> [BattleLogic]
       [HpBarWidget] <──呼ばれるだけ(コールバック)
        よく変わる側が、安定した側に依存する
```

## Unity/C# との対応

- ScriptableObject や event を使って「ロジックがUIを知らない」構造にするのが定石。
- Assembly Definition で依存の方向を**物理的に強制**できます(参照を張らなければコンパイルエラー)。C++のライブラリ分割に相当(→ [ヘッダー分割とAssembly Definition](/languages/csharp/headers-vs-asmdef.html))。

## Unreal Engine との対応

- Module 分割(Build.cs の依存リスト)が依存方向の強制に対応します(→ [UBTとModule](/game/unreal/build-system-ubt.html))。
- Actor間の直接参照より Delegate / Interface 経由が推奨されるのも同じ理屈です。

## よくある誤解

- 「依存は悪」ではありません。悪いのは方向と量です。具象クラスへの素直な依存は、変更されにくい相手なら全く問題ありません。
- 「とにかくインターフェースを挟めば良い」でもありません。変わらない相手に抽象を挟むのはコストだけ払う行為です(→ [判断ガイド](/design/decisions/create-interface.html))。

## 使う場面 / 使わない場面

- **向きを制御すべき場面**: 中核ロジックと、UI・保存・通信・エンジンAPIのような「変わりやすい末端」との境界。テストしたい境界。
- **放置してよい場面**: 同じ理由で一緒に変わる仲間内(EnemyがEnemyBulletに依存する等)。標準ライブラリやエンジンの安定APIへの依存。

## 関連項目

- [凝集度と結合度](/design/foundations/cohesion-and-coupling.html)
- [DIP: 依存性逆転の原則](/design/solid/dip.html)
- [Observer](/design/patterns/observer.html) / [Service LocatorとDI](/game/patterns/service-locator-and-di.html)

## 理解度チェック

1. 「AがBに依存する」の実務的な判定基準は何ですか。
2. 「依存の方向が悪い」とはどういう状態ですか。ゲームの例で言えますか。
3. 循環依存を切る方法を2つ挙げてください。

## 演習

`Quest → Player → Inventory → Quest`(クエストアイテム所持チェックのため)という循環があるとします。どこをどう切るか、2案作って利点欠点を比較してください(類題の解答: [第1部演習](/design/foundations/exercises.html))。

---

前: [凝集度と結合度](/design/foundations/cohesion-and-coupling.html) | [カテゴリ目次](/design/foundations/) | 次: [抽象化・カプセル化・情報隠蔽](/design/foundations/abstraction-encapsulation.html)
