---
title: スマートポインタ
study:
  source: C++ Wiki
  status: published
  summary: "「deleteを人間が書かない」ためのRAIIラッパ。所有権の形ごとに3種類あります。 std::unique_ptr : 所有者は常に1人。コピー不可・ムーブで譲渡。既定の選択肢"
  section: reference
  format: article
  domain: languages
---

# スマートポインタ

## 一言で言うと

「**deleteを人間が書かない**」ためのRAIIラッパ。所有権の形ごとに3種類あります。

- **`std::unique_ptr<T>`**: 所有者は常に1人。コピー不可・ムーブで譲渡。**既定の選択肢**
- **`std::shared_ptr<T>`**: 所有者が複数(参照カウント)。最後の1人が破棄で解放
- **`std::weak_ptr<T>`**: shared_ptrの中身を「所有せずに見る」。使う時に生存確認

## 解決したい問題

```cpp
// C++20(問題例)— 生のnew/delete
Enemy* SpawnBoss() { return new Enemy(); }
void Battle() {
    Enemy* boss = SpawnBoss();
    if (PlayerRanAway()) return;   // deleteし忘れ → リーク
    delete boss;
}
// さらに: 誰がdeleteすべきか型から分からない / 二重delete / delete後アクセス(UAF)
```

生ポインタは「見ているだけ」なのか「解放責任があるのか」を**型で区別できない**——これが諸悪の根源です(→ [所有権](/runtime/memory/ownership-and-borrowing.html))。

## unique_ptr(既定)

```cpp
// C++20
#include <memory>

auto boss = std::make_unique<Enemy>();      // 生成(newを直接書かない)
boss->TakeDamage(10);                       // 生ポインタと同じ使い心地(operator->)

// コピー不可 = 所有者が2人になる事故がコンパイルエラーになる
// auto copy = boss;                        // エラー
auto newOwner = std::move(boss);            // ムーブ=所有権の譲渡(bossは空に)

std::vector<std::unique_ptr<Enemy>> enemies;   // 多態コンテナの定石(スライシング回避)
enemies.push_back(std::make_unique<BossEnemy>());
```

- **コストほぼゼロ**: サイズは生ポインタと同じ(カスタムデリータなしの場合)、操作もほぼ同じ機械語。使わない理由がない
- スコープ終了・所有者の破棄で自動delete([RAII](/languages/cpp/raii.html))
- 関数が `unique_ptr<T>` を**返す**=「所有権をあげる」、**受け取る**=「所有権をもらう」——**シグネチャが所有権のドキュメントになる**

## shared_ptr(共有が本当に必要なときだけ)

```cpp
auto texture = std::make_shared<Texture>("boss.png");
auto a = texture;    // 参照カウント2(コピーで共有)
a.reset();           // カウント1
// 最後の所有者が消えた瞬間に解放
```

- **コストあり**: 制御ブロック(カウンタ)の確保、カウント操作は**スレッド安全のためアトミック**(コピーのたびに同期コスト)、サイズは生ポインタの2倍
- **循環参照で解放されない**: AがBを、BがAをshared_ptrで持つと、カウントが0にならず両方リーク。GCと違い**循環を検出しない**——これがC#経験者の最重要注意点

## weak_ptr(循環切りと「消えたかもしれない相手」)

```cpp
class Enemy {
    std::weak_ptr<Player> target_;   // 所有しない(Playerの寿命を延ばさない)
public:
    void Update() {
        if (auto p = target_.lock()) {   // 生存確認+一時的なshared_ptr化
            ChaseTowards(p->Position());
        } else {
            // プレイヤーは既に消えていた(dangling にならない!)
        }
    }
};
```

- 「相手が先に死んでいるかもしれない参照」を安全に表現(生ポインタのdangling問題への型レベルの回答)
- 親子の循環は「親→子: shared(またはunique)、子→親: weak(または生ポインタ)」で切る

## 使い分けフローチャート

```
所有する?
 ├ No → 生ポインタ or 参照(「見ているだけ」。相手の寿命が保証される文脈で)
 │       相手が先に消えうる → weak_ptr(相手がshared管理の場合)/ ハンドルID方式
 └ Yes → 所有者は1人で足りる? 
          ├ Yes → unique_ptr(まずこれ。9割はこれで足りる)
          └ No(本当に複数?) → shared_ptr(+循環にはweak_ptr)
```

**「迷ったらshared_ptr」は間違い**。所有者が曖昧になり、「いつ解放されるか誰も分からない」設計になります。uniqueで設計を試み、破綻したときだけsharedへ(→ [判断ガイド](/design/decisions/cpp-choices.html))。

### 非所有の生ポインタは「悪」ではない

```cpp
class Scene {
    std::vector<std::unique_ptr<Enemy>> enemies_;   // Sceneが所有
};
void UpdateAi(Enemy* target);   // 引数の生ポインタ=「借りて見るだけ」の合図(現代C++の慣習)
```

所有をスマートポインタで表現しきれば、**残った生ポインタは自動的に「非所有」を意味する**——この規約が現代C++の secret です。

## C#との違い

| | C#(GC) | C++(スマートポインタ) |
|---|---|---|
| 解放時期 | GC任せ(不定) | 決定的(最後の所有者の破棄の瞬間) |
| 循環参照 | GCが回収できる | **shared_ptrは回収できない**(weak_ptrで切る) |
| 「消えた相手」 | 参照があれば生き続ける(そもそも消えない) | weak_ptr/ハンドルで生存確認 |
| コスト | GCの一時停止・メモリ圧 | カウント操作(shared)、ほぼゼロ(unique) |

C#では「参照を持つ=生かし続ける」ですが、C++のunique_ptr世界では「所有者が破棄=即死」。**「まだ使ってる人がいるのに消える」事故はC++側で起き、「使い終わったのに生き続ける」事故はC#側で起きる**、と対で覚えると整理できます。

## Unity開発者が誤解しやすい点

1. `Destroy(gameObject)` の感覚(マークして後で消える、参照はnull的になる)に一番近いのは**weak_ptr+shared_ptr**やハンドル方式。unique_ptrのdeleteは即時で、残った生ポインタは**nullにならない**(danglingになる)
2. 「とりあえずshared_ptrはGCの代わり」— 循環を回収しない点で決定的に違う
3. UEには独自のスマートポインタ群(TUniquePtr/TSharedPtr)とUObject用のGCがあり、標準のshared_ptrを**UObjectに使ってはいけない**(→ [UEのスマートポインタ — TSharedPtr・TUniquePtr・TWeakPtr・TSoftObjectPtr](/game/unreal/smart-pointers.html))

## ゲーム開発での使用例

- シーン→エンティティ: `vector<unique_ptr<Entity>>`(所有の階層)
- 共有アセット(テクスチャ、サウンドデータ): `shared_ptr`(または参照カウント式アセットマネージャ)
- ターゲット参照・親参照: `weak_ptr` か 世代付きハンドル(→ [Object Pool](/game/patterns/object-pool.html)。大量オブジェクトではハンドルの方が高速)

## 使う場面 / 使わない場面

- unique_ptr: ヒープ所有の既定。**まず値で持てないか考えてから**(メンバに直接置ければポインタ自体不要)
- shared_ptr: 寿命が本当に複数の所有者に依存するものだけ(アセット等)
- **使わない場面**: 毎フレーム大量に生成・破棄するもの(カウント操作が重い→ [Object Pool](/game/patterns/object-pool.html))。C API境界。UObject(UE)

## よくある誤解

- 「モダンC++=生ポインタ禁止」— 禁止されるのは**所有する**生ポインタ。非所有の生ポインタ・参照は現役
- 「make_uniqueはnewの飾り」— 例外安全と「newを検索して0件にできる」規約的価値がある

## 関連項目

- [RAII](/languages/cpp/raii.html) / [所有権と借用](/runtime/memory/ownership-and-borrowing.html) / [メモリバグ図鑑](/runtime/memory/memory-bugs.html)
- [判断ガイド: unique_ptrかshared_ptrか](/design/decisions/cpp-choices.html)
- [UEのスマートポインタ](/game/unreal/smart-pointers.html)

## 理解度チェック

1. unique_ptrのコピーがコンパイルエラーになるのは、何の事故を型で防いでいるからですか。
2. shared_ptrの循環参照はなぜ解放されないのですか。C#との違いは?
3. 「非所有の生ポインタ」が現代C++で許される条件は?

## 演習

samples/smart_pointers.cpp(検証済み)で、(a) unique_ptrのムーブによる所有権移転、(b) shared_ptrのカウント変化、(c) 循環参照でデストラクタが呼ばれないこと、(d) weak_ptrで循環を切ると解放されること、を出力で確認してください。

---

関連項目：[キャスト](/languages/cpp/casts.html) / [学習ガイド](/languages/cpp/) / [STLコンテナ・イテレータ・アルゴリズム・ranges](/languages/cpp/stl.html)
