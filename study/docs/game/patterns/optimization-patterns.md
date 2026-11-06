---
title: "最適化系パターン: Dirty Flag・Spatial Partition・Data Locality・Double Buffer"
study:
  source: C++ Wiki
  status: published
  summary: 4つとも「計測で問題が確認されてから使う」パターンです。共通の代償は「コードが素直でなくなる」こと。先に早すぎる最適化を読んでください。 高価な再計算を「変更があったときだけ」行うための目印(dirty=汚れた=要再計算)。
  section: reference
  format: article
  domain: game
---

# 最適化系パターン: Dirty Flag・Spatial Partition・Data Locality・Double Buffer

4つとも「**計測で問題が確認されてから**使う」パターンです。共通の代償は「コードが素直でなくなる」こと。先に[早すぎる最適化](/design/foundations/yagni-kiss-dry.html)を読んでください。

---

## Dirty Flag

### 一言で言うと

高価な再計算を「変更があったときだけ」行うための目印(dirty=汚れた=要再計算)。

### 問題 → 適用

```cpp
// 問題: 毎フレーム、変わってもいないワールド行列を再計算
// Matrix World() const { return parent->World() * local_; }  // 毎回・再帰的に高価

// C++20 — Dirty Flag適用
class TransformNode {
public:
    void SetLocal(const Matrix& m) { local_ = m; MarkDirty(); }
    const Matrix& World() const {
        if (dirty_) {                       // 汚れているときだけ再計算
            world_ = parent_ ? parent_->World() * local_ : local_;
            dirty_ = false;
        }
        return world_;
    }
private:
    void MarkDirty() {
        dirty_ = true;
        for (auto* c : children_) c->MarkDirty();   // 自分が汚れたら子も全部汚れる
    }
    Matrix local_{}, mutable world_{};
    mutable bool dirty_ = true;
    TransformNode* parent_ = nullptr;               // 非所有(親が子を所有)
    std::vector<TransformNode*> children_;
};
```

### トレードオフ

- 得: 変更頻度 &lt;&lt; 参照頻度 のとき劇的に速い(UIレイアウト、Transform、ライトマップ)
- 失: **フラグの伝播漏れ=「たまに表示が古い」バグ**(再現困難の代表)。変更経路が増えるほど漏れやすい
- 使わない: 再計算が安い/毎フレームどうせ変わるもの(dirty管理コストの方が高い)

Unity/UEでは Transform・UIレイアウト(`SetDirty`, `MarkRenderStateDirty`)に内蔵済み。「エンジンのdirty機構を尊重する」(毎フレームSetLocalPositionで同じ値を書き込まない等)が実務の第一歩です。

---

## Spatial Partition(空間分割)

### 一言で言うと

「近くのオブジェクトだけ調べたい」ために、グリッドやツリーで位置から候補を引けるようにします。候補が少なければ詳しく調べる組を減らせます。多数の対象が同じセルに集まり、その全組を調べる場合は、二次の組み合わせが残ります。

### 問題 → 適用

点を1セルずつ登録する例では、検索距離がセルの一辺以下なら、自分のセルと周囲の3×3セルから候補を集めて距離を測れます。大きさのある物体を探す場合は、形を包む箱が触れるセルに登録する方法もあります。[均等グリッドと空間ハッシュ](/algorithms/uniform-grid-and-spatial-hash.html)

C++の点検索例は総当たりと命中数を照合します。ブラウザの実験では円の配置や検索範囲も変えられます。<a href="/study/samples/cpp/spatial_grid.cpp">C++サンプル</a> · [空間インデックスの実験](/practice/algorithms/spatial-query-observation.html)

### 構造の選択

| 構造 | 向く状況 |
|---|---|
| [均等グリッド](/algorithms/uniform-grid-and-spatial-hash.html) | 同程度の大きさの物体を一定の粒度で調べる |
| [四分木・八分木](/algorithms/quadtrees-and-octrees.html) | 場所によって領域を分ける細かさを変える |
| [BVH](/algorithms/bounding-volume-hierarchies.html) | 大きさの異なる対象を境界箱でまとめ、衝突候補やレイの交差を調べる |

### トレードオフ

- 検索では、対象の分布と範囲に応じて、当たり判定や索敵の候補を減らせます。
- 移動でセルや境界箱が変わったときは、登録や境界を更新します。
- 小規模な場面では総当たりを基準にして、検索と更新にかかる時間を比べます。

Unity/UEの物理エンジンは内部でこれを実装済み(ブロードフェーズ)。`Physics.OverlapSphere` で済むなら自作は不要。自作するのは物理エンジンを通さない自前ロジック(弾幕、RTSの索敵)のとき。

---

## Data Locality(データ局所性)

### 一言で言うと

CPUはメモリを**キャッシュライン単位(通常64バイト)**で読む。使うデータを**メモリ上で隣接**させれば、キャッシュヒットで桁違いに速くなる。「データの並べ方こそが性能」という原則(→ 仕組みの詳細: [キャッシュ](/runtime/cpp-internals/cache-branch-simd.html))。

### 問題 → 適用

```cpp
// 問題: ポインタの配列(実体はヒープに散らばる)
// std::vector<Enemy*> enemies;  → 1体ごとにキャッシュミス

// 適用: 実体の連続配列
// std::vector<Enemy> enemies;   → 隣の敵はキャッシュに既に載っている
```

さらに「Updateで使うフィールドだけ」を分離して詰める(ホット/コールド分離、[AoSとSoA](/runtime/memory/cache-locality-aos-soa.html))、[ECS](/game/patterns/component-and-ecs.html)へ進むのがこの系譜です。

### トレードオフ

- 得: 大量オブジェクトの一括処理が数倍〜数十倍(実測例多数)
- 失: 実体の配列は**要素の移動でポインタ・参照が無効化**(→ 世代ハンドル等の仕組みが必要)。オブジェクト指向的な書き心地の放棄
- 使わない: 数が少ない、処理がメモリ律速でない(プロファイラで確認)

---

## Double Buffer

### 一言で言うと

「書き込み中の状態を読ませない」ために、バッファを2枚持ち、**読む用(front)と書く用(back)を分けて交換(swap)**する。

### 問題 → 適用

```cpp
// 問題: 全AIが「他のAIの位置」を読みながら自分の位置を書く
// → 更新順で結果が変わる(先に動いた敵の新しい位置を、後の敵が読んでしまう)

// C++20 — 状態を2枚持つ
struct WorldState { std::vector<Vec2> positions; };
class Simulation {
public:
    void Step() {
        // 全員が current(前フレーム確定値)だけを読み、next にだけ書く
        for (std::size_t i = 0; i < current_.positions.size(); ++i)
            next_.positions[i] = ComputeMove(i, current_);
        std::swap(current_, next_);   // 一斉に切り替え(swapはvectorの中身の交換で安価)
    }
private:
    WorldState current_{}, next_{};
};
```

### トレードオフ

- 得: この例では前状態だけを読み、各要素の書込先も重ならないため、ほかの要素を先に更新したかへの依存を避けられる。`ComputeMove`に共有状態への副作用がなければ並列化しやすい。ただしダブルバッファだけで処理全体の決定性やスレッド安全性を保証するわけではない。描画でも、完成したバッファを切り替えて見せる考え方が使われる
- 失: **メモリ2倍**。1フレーム分の遅延(backに書いた結果が見えるのは次のswap後)
- 使わない: 更新順序に依存する読み書きがそもそもない場合。メモリが厳しい大状態

グラフィックスのスワップチェーン、[Command Buffer](/game/patterns/command-buffer-and-input.html)(メインスレッドが書き、描画スレッドが前フレーム分を読む)、セルオートマトン、物理の前フレーム参照など、ゲームの至る所にある構造です。

---

## Unity/UE での現れ方まとめ

| パターン | Unity | UE |
|---|---|---|
| Dirty Flag | Transform、Canvasの再構築 | RenderState/Transformのdirty機構 |
| Spatial Partition | 物理ブロードフェーズ、カリング | 同左+階層LOD |
| Data Locality | DOTS/ECS、JobSystem | Mass、Chaosの内部 |
| Double Buffer | GPUスワップチェーン、JobのNativeArray分離 | レンダースレッドとの並行(FrameのGT/RT分離) |

## 理解度チェック

1. Dirty Flagのバグが「再現困難」になりがちな理由は?
2. グリッドと四分木の使い分けは?
3. Double Bufferが解決する「更新順序問題」を、具体例で説明できますか。
4. 4パターン共通の「導入前にやるべきこと」は?

## 演習

samples/spatial_grid.cpp を使い、1万点の近傍探索を総当たりとグリッドで実行時間比較してください(単純なタイマーで可)。点数を1000に減らすと差がどうなるかも確認し、「使わない場面」を体感してください。

---

関連項目：[Object Pool](/game/patterns/object-pool.html) | [この分野の学習ガイド](/game/patterns/) | [Type Object・Subclass Sandbox・Bytecode](/game/patterns/type-object-and-sandbox.html)
