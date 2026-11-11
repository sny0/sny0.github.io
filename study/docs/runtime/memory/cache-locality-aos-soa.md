---
title: キャッシュ局所性と AoS / SoA
study:
  source: C++ Wiki
  status: published
  summary: "キャッシュ局所性 (cache locality): 「次に使うデータが、既にキャッシュに載っている」度合い。空間的局所性(近くのデータを使う)と時間的局所性(同じデータを繰り返し使う)がある(ハードの仕組みは → キャッシュ)"
  section: reference
  format: article
  domain: runtime
---

# キャッシュ局所性と AoS / SoA

## 一言で言うと

- **キャッシュ局所性 (cache locality)**: 「次に使うデータが、既にキャッシュに載っている」度合い。**空間的局所性**(近くのデータを使う)と**時間的局所性**(同じデータを繰り返し使う)がある(ハードの仕組みは → [キャッシュ](/runtime/cpp-internals/cache-branch-simd.html))
- AoS (Array of Structures) は構造体の配列です。`Particle particles[N]` のようにオブジェクト単位でデータをまとめます。
- SoA (Structure of Arrays) は配列をまとめた構造です。`float xs[N]; float ys[N];` のように処理単位でデータを揃えます。

## 問題: AoSの「無駄な同乗者」

```cpp
// C++20 — AoS: 1粒 = 48バイト
struct Particle {
    float x, y, z;        // 位置(移動処理で使う: 12バイト)
    float vx, vy, vz;     // 速度(移動処理で使う: 12バイト)
    float r, g, b, a;     // 色(移動処理では使わない: 16バイト)
    float lifetime;       //(使わない: 4バイト)
    int textureId;        //(使わない: 4バイト)
};
std::vector<Particle> particles;

void Move(float dt) {
    for (auto& p : particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
}
// キャッシュライン(64バイト)には位置・速度と一緒に「色・寿命・テクスチャID」も載ってくる。
// この処理が使わないフィールドも同じラインに含まれ、転送の無駄になり得る
```

## SoA: 使うものだけを隙間なく

```cpp
// C++20 — SoA
struct Particles {
    std::vector<float> x, y, z;
    std::vector<float> vx, vy, vz;
    std::vector<float> r, g, b, a;
    std::vector<float> lifetime;
    std::vector<int> textureId;
    std::size_t count = 0;
};

void Move(Particles& ps, float dt) {
    for (std::size_t i = 0; i < ps.count; ++i) {
        ps.x[i] += ps.vx[i] * dt;    // xの配列は position データ100%の密度でラインに載る
        ps.y[i] += ps.vy[i] * dt;
        ps.z[i] += ps.vz[i] * dt;
    }
}
```

検証済みサンプル: <a href="/study/samples/cpp/aos_soa_bench.cpp">samples/aos_soa_bench.cpp</a>(同一処理のAoS/SoA時間比較)

- 必要なフィールドを連続して読めるため、不要な転送を減らし、[SIMD自動ベクトル化](/runtime/cpp-internals/cache-branch-simd.html)を助ける場合がある。速度の倍率は処理・CPU・要素数を変えて測る。
- [ECS](/game/patterns/component-and-ecs.html)のComponent配列は、この考えをアーキテクチャ化したもの

## トレードオフ(SoAは無料ではない)

| | AoS | SoA |
|---|---|---|
| 1個の全フィールドを使う処理(個体の生成・削除・シリアライズ) | 速い(1ラインに全部) | 遅い(N配列に飛ぶ) |
| 一部フィールドを全個体に(移動・物理) | 帯域を無駄にする | 最速 |
| コードの書き味 | 自然(`p.x`) | 崩れる(`ps.x[i]`)。追加・削除がN配列の同期作業 |
| 「1個のパーティクル」を関数に渡す | `Particle&` で済む | インデックス+コンテナ参照が要る |

### AoSoAと、ホット/コールド分離は別の工夫

**AoSoA（Array of Structures of Arrays）**は、固定長のSoAブロックを配列にする配置です。例えば8要素ずつをまとめるなら、次のようになります。ブロック幅はSIMD幅やアクセス方法に合わせて選びます。[CabanaのAoSoA実装](https://github.com/ECP-copa/Cabana/blob/master/core/src/Cabana_AoSoA.hpp)

```cpp
struct ParticleBlock {
    float x[8], y[8], z[8];
    float vx[8], vy[8], vz[8];
};
std::vector<ParticleBlock> blocks; // 各ブロック内はSoA、ブロック全体は配列
// 個体iは、ブロックi/8の各配列の要素i%8。末尾の有効要素数も別に管理する。
```

一方、`PosVel{x,y,z,vx,vy,vz}`の配列と、色などの別配列へ分けるのは**ホット/コールド分離**です。使うフィールド群を分ける工夫であり、各群の内部をAoS・SoA・AoSoAのどれにするかとは別の軸です。

## 判断基準

1. **計測が先**: プロファイラでメモリ律速(キャッシュミス率)と出た処理だけが対象
2. 個体数の目安: 数百ならどうでもよい。数万〜で差が出始め、数十万で支配的
3. アクセスパターンで決める: 「全個体×一部フィールド」の処理が主ならSoA、「個体単位の雑多な処理」が主ならAoS

## C#/Unityとの対応

- C#の `List<Particle>`(classなら)は**AoS以前の問題**: 参照の配列で実体はヒープに散在(ポインタ追跡)。structのList/配列でようやくAoS相当
- Unity DOTSの `NativeArray<T>`+Burst、ECSのアーキタイプ(チャンク)は、まさにSoA/AoSoAの実装。「なぜDOTSはああいう書き方を強いるのか」の答えがこのページ
- VFX GraphやパーティクルシステムのGPU実装もSoA(GPUはさらに局所性・整列に敏感)

## Unity開発者が誤解しやすい点

1. 「オブジェクト指向的に自然な形が普通」— 大量データでは**データの形は処理が決める**(データ指向設計)。個体という単位はUI/ロジック上の概念で、CPUには配列しか見えていない
2. 「structならなんでも速い」— structでもフィールドが太ればAoSの無駄同乗問題は起きる
3. SoA化を**全部に**適用しない——書き味の悪化は保守コスト。ホットな数か所だけ

## ゲーム開発での使用例

- パーティクル、弾幕、群衆、ボイド、スキニング行列、物理ブロードフェーズのAABB配列
- サーバーサイドの大量エンティティシミュレーション
- ロード時間: アセットを「使う順に並べる」のもディスクの局所性という同じ話

## 理解度チェック

1. AoSの「無駄な同乗者」問題をキャッシュラインの語彙で説明できますか。
2. SoAが苦手な操作は何ですか。
3. 固定長SoAブロックの配列であるAoSoAと、ホット/コールド分離の違いは何ですか。

## 演習

samples/aos_soa_bench.cpp で要素数を1万/10万/100万と変えて実行し、差が出始める規模を確認してください。また「削除(swap-and-pop)」をSoAに実装し、AoSと比べて何か所の同期が必要になるか数えてください。

---

関連項目：[並行処理のバグ](/runtime/memory/concurrency-bugs.html) / [学習ガイド](/runtime/memory/) / [placement new・allocator・pool・arena](/runtime/memory/allocators-and-pools.html)
