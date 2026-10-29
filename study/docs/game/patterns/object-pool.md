---
title: "Object Pool(通常のnew/deleteとの比較)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "頻繁に生成・破棄されるオブジェクト(弾、パーティクル、ヒット表示)を、毎回new/deleteせず、確保済みの「プール」から貸し出して返却・再利用するパターン。 速度: ヒープ確保・解放は(自作の単純なアロケータに比べて)高価で、実行時間が不定(→ ヒープ)"
---

# Object Pool(通常のnew/deleteとの比較)

## 一言で言うと

頻繁に生成・破棄されるオブジェクト(弾、パーティクル、ヒット表示)を、**毎回new/deleteせず、確保済みの「プール」から貸し出して返却・再利用**するパターン。

## 解決したい問題

```cpp
// C++20(問題例)— 毎フレーム大量のnew/delete
void Weapon::Fire() {
    bullets_.push_back(std::make_unique<Bullet>(pos_, dir_));  // 毎発ヒープ確保
}
void World::Update() {
    std::erase_if(bullets_, [](auto& b) { return b->IsDead(); });  // 毎フレーム解放
}
```

1. **速度**: ヒープ確保・解放は(自作の単純なアロケータに比べて)高価で、実行時間が不定(→ [ヒープ](/runtime/cpp-internals/memory-layout.html))
2. **断片化**: 確保と解放を繰り返すとヒープに穴が空き、長時間動くゲームでメモリ不足を招く(→ [fragmentation](/runtime/memory/allocators-and-pools.html))
3. **C#/Unityでは**: newはGC Allocであり、後で**GCスパイク**(フレーム落ち)として返ってくる(→ [UnityのGC](/languages/csharp/memory-management-vs-gc.html))

## パターン適用後のC++コード

```cpp
// C++20 — 固定サイズプール(フリーリスト方式)
#include <cstdint>
#include <vector>

struct Bullet {
    float x = 0, y = 0, dx = 0, dy = 0;
    bool alive = false;
};

class BulletPool {
public:
    explicit BulletPool(std::size_t capacity) : bullets_(capacity) {
        free_.reserve(capacity);
        for (std::size_t i = 0; i < capacity; ++i) free_.push_back(capacity - 1 - i);
    }
    Bullet* Acquire() {                       // 生ポインタを返す: 所有権はプールに残る
        if (free_.empty()) return nullptr;    // 満杯ポリシー: ここでは失敗を返す
        Bullet& b = bullets_[free_.back()];
        free_.pop_back();
        b.alive = true;
        return &b;
    }
    void Release(Bullet* b) {
        b->alive = false;
        free_.push_back(static_cast<std::size_t>(b - bullets_.data()));  // indexへ戻す
    }
    // 全弾走査(連続メモリなのでキャッシュに優しい)
    std::vector<Bullet>& All() { return bullets_; }
private:
    std::vector<Bullet> bullets_;         // 起動時に一括確保。以後ヒープ操作なし
    std::vector<std::size_t> free_;       // 空きスロットのindex
};
```

検証済みサンプル: <a href="/study/samples/cpp/object_pool.cpp">samples/object_pool.cpp</a>

### new/delete との比較

| | new/delete(都度確保) | Object Pool |
|---|---|---|
| 確保・解放コスト | 不定(ヒープ管理の処理) | ほぼゼロ(index操作のみ) |
| メモリ使用量 | 使う分だけ | **最大数を常時確保**(使わなくても) |
| 断片化 | 進行する | しない(固定領域) |
| 上限 | メモリが尽きるまで | 容量で頭打ち(満杯ポリシーが必要) |
| メモリ配置 | 分散(キャッシュに不利) | 連続([Data Locality](/game/patterns/optimization-patterns.html)の利益も同時に得る) |
| 実装コスト | ゼロ | プール管理+**状態リセットの規律** |

### 満杯時のポリシー(設計判断が必要)

1. 失敗を返す(呼び出し側が対処) — 上の実装
2. 一番古いものを奪って使い回す(弾・エフェクトの定石: 見た目がわずかに破綻するだけ)
3. 拡張する(プールの利点が減るが、クラッシュよりまし)

### 二大事故

- **リセット漏れ**: 再利用時に前の状態が残る(「前の弾のバフが新しい弾に付いてる」)。`Acquire` で必ず全フィールド初期化する規約に
- **解放後アクセス(stale reference)**: 誰かが持っていたポインタの先が、別の用途で再利用される——生ポインタ配布の宿命。対策は**世代付きハンドル**(indexと世代番号のペアで貸し出し、Releaseで世代を進める。古いハンドルは無効と判定できる)。use-after-freeがクラッシュせず「別人にすり替わる」形で現れるため、たちが悪い(→ [メモリバグ](/runtime/memory/memory-bugs.html))

## Unity/C# との対応

- `UnityEngine.Pool.ObjectPool<T>`(公式実装)、パーティクルやAudioSourceのプールは事実上必須の定石
- `Instantiate/Destroy` の都度実行は、生成コスト+GC Allocの二重苦。プール化は「SetActive(false)で寝かせて使い回す」形が基本
- ただし**少数・低頻度のオブジェクトのプール化は無意味**(管理コードのバグリスクだけ増える)。プロファイラでGC Allocとスパイクを見てから

## Unreal Engine との対応

- 発射物・エフェクトのActorプールは自作が一般的(SpawnActorは高価)。Niagaraはエミッタ内部でプール管理
- UObjectのライフサイクル(GC)とプールの相性に注意: 参照を`UPROPERTY`で保持して回収を防ぐ(→ [第10部](/game/unreal/gc-and-object-pointers.html))

## 使う場面 / 使わない場面

- **使う場面**: 生成・破棄が高頻度(毎秒数十〜)の同種オブジェクト。フレームスパイクが計測で確認された。メモリ断片化が問題になる長時間セッション
- **使わない場面**: 低頻度の生成(画面遷移ごとの敵数体)。サイズがまちまちのオブジェクト(プールは同種・同サイズで真価)。**計測前**(「プールにしとけば速いでしょ」は[早すぎる最適化](/design/foundations/yagni-kiss-dry.html))

## よくある誤解

- 「プールは常に速い」— 常時メモリを占有し、リセット漏れという新種のバグを飼う。**トレードオフの購入**です
- 「C++ではGCがないからプール不要」— 断片化と確保コストはC++でも問題。ただし優先度はC#より下がることが多い

## 関連項目

- [Flyweight](/design/patterns/flyweight.html)(データ共有と併用) / [allocatorとmemory pool](/runtime/memory/allocators-and-pools.html)(より低レイヤの同種技術)
- [ケーススタディ: オブジェクト生成](/design/case-studies/object-spawning.html)

## 理解度チェック

1. プールが解決する3つの問題(速度・断片化・GC)をそれぞれ説明できますか。
2. 満杯ポリシー3種と、弾幕ゲームでの定石は?
3. 世代付きハンドルは何の事故を防ぎますか。

## 演習

samples/object_pool.cpp に世代付きハンドル(`struct Handle { uint32_t index; uint32_t generation; }`)を実装し、解放済みハンドルでのアクセスが検出できることを確認してください。

---

前: [Service Locator と DI](/game/patterns/service-locator-and-di.html) | [カテゴリ目次](/game/patterns/) | 次: [最適化系パターン](/game/patterns/optimization-patterns.html)
