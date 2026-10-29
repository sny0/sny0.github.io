---
title: "Component と Entity Component System(比較つき)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "Component パターン: ゲームオブジェクトを「機能の部品(コンポーネント)の入れ物」にする。継承ツリーの爆発を防ぐ、Unityの基本構造。 ECS (Entity Component System): さらに進めて、データ(Component)とロジック(System)を完全に分離し、データ"
---

# Component と Entity Component System(比較つき)

## 一言で言うと

- **Component パターン**: ゲームオブジェクトを「機能の部品(コンポーネント)の入れ物」にする。継承ツリーの爆発を防ぐ、Unityの基本構造。
- **ECS (Entity Component System)**: さらに進めて、**データ(Component)とロジック(System)を完全に分離**し、データを配列に詰めてキャッシュ効率を最大化する設計。

この2つは名前が似ていますが、動機が違います(Componentは**設計の柔軟性**、ECSは主に**性能**)。

## 継承方式 → Component方式(設計の問題)

### 継承方式の破綻

```cpp
// C++20(問題例)
class GameObject { /* 位置、更新 */ };
class Visible : public GameObject { /* 描画 */ };
class Movable : public Visible { /* 移動 */ };
class Enemy : public Movable { /* AI */ };
// 「見えないが動く(透明な敵)」は? 「動かないが撃つ(砲台)」は?
// → 単一の継承軸では機能の組み合わせを表現できない(組み合わせ爆発)
```

詳細は[継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)で扱った通りです。

### Component方式

```cpp
// C++20 — オブジェクト = コンポーネントの入れ物
#include <memory>
#include <vector>

class Component {
public:
    virtual ~Component() = default;
    virtual void Update(class Entity& owner, float dt) = 0;
};
class Entity {
public:
    void Add(std::unique_ptr<Component> c) { components_.push_back(std::move(c)); }
    void Update(float dt) { for (auto& c : components_) c->Update(*this, dt); }
    float x = 0, y = 0;   // 全員が使う最小共有データ
private:
    std::vector<std::unique_ptr<Component>> components_;   // 所有
};
// 透明な敵 = Move + AI(描画なし)。砲台 = Render + Shoot(移動なし)。組み合わせ自由
```

検証済みサンプル: <a href="/study/samples/cpp/component_entity.cpp">samples/component_entity.cpp</a>

### Component方式 vs 継承方式(比較)

| | 継承方式 | Component方式 |
|---|---|---|
| 機能の組み合わせ | ツリーで固定、爆発する | 自由(実行時変更も可) |
| 「この敵は何ができる?」 | 型を見れば分かる | 部品リストを見る必要がある |
| 機能間の連携 | メンバ直接アクセス(楽) | 部品間の参照解決が必要(GetComponent) |
| データ駆動 | 困難 | 部品構成をデータ化できる |
| 少数・固定の種類 | 単純で読みやすい | 過剰になりがち |

**部品間通信**がComponent方式の設計難所です: 同一Entity内は `GetComponent<T>()`(結合は残る)、疎にしたければEntity経由のイベント(→ [Observer](/design/patterns/observer.html))。

## ECS(性能の問題)

### MonoBehaviour/Component方式の性能限界

- 各Entityがヒープ上にバラバラに置かれ、Updateのたびにポインタを追ってメモリをランダムアクセス(**キャッシュミスの嵐** → [キャッシュ](/runtime/cpp-internals/cache-branch-simd.html))
- 仮想関数呼び出しがオブジェクト数ぶん(インライン化不可、分岐予測に不利)

### ECSの構造

```
Entity   = ただのID(uint32など)。データもロジックも持たない
Component = ただのデータ(Position{x,y}, Velocity{dx,dy})。ロジックなし
System   = ロジックだけ。「PositionとVelocityを持つ全Entity」を一括処理

メモリ: Position[] ■■■■■■■■(連続配列)
        Velocity[] ■■■■■■■■(連続配列)
MoveSystem: for i in 0..n: pos[i] += vel[i] * dt   ← キャッシュに最高に優しいループ
```

```cpp
// C++20 — 最小のECS風構造(教育用。実物はentt等のライブラリを参照)
#include <vector>
struct Position { float x = 0, y = 0; };
struct Velocity { float dx = 0, dy = 0; };

struct World {
    std::vector<Position> positions;   // 同じindex = 同じEntity(単純化した密配列)
    std::vector<Velocity> velocities;
};
void MoveSystem(World& w, float dt) {
    for (std::size_t i = 0; i < w.positions.size(); ++i) {
        w.positions[i].x += w.velocities[i].dx * dt;
        w.positions[i].y += w.velocities[i].dy * dt;
    }
}
```

検証済みサンプル: <a href="/study/samples/cpp/ecs_minimal.cpp">samples/ecs_minimal.cpp</a>(→ データ配置の詳細は [AoSとSoA](/runtime/memory/cache-locality-aos-soa.html))

### ECS vs GameObject/MonoBehaviour方式(比較)

| | GameObject/MonoBehaviour | ECS |
|---|---|---|
| データとロジック | 同居(オブジェクト指向) | 完全分離(データ指向) |
| メモリ配置 | ヒープに分散 | 連続配列(キャッシュ効率) |
| 大量処理(1万〜) | 苦しい | 本領(SIMD・並列化も容易) |
| 書きやすさ・直感性 | 高い(1体=1物) | 低い(処理が横断的、発想の転換が必要) |
| 少数の複雑なオブジェクト | 自然 | 冗長 |
| デバッグ | インスペクタで1体を見る | 「この弾がなぜ曲がった」を追いにくい |

## Unity/C# との対応

- GameObject + MonoBehaviour = Component パターンそのもの(`AddComponent`, `GetComponent<T>`)
- Unity DOTS/Entities = ECS の公式実装(Burst + Job System で並列化まで込み)。**全ゲームをDOTSにする必要はなく**、大量ユニット・弾幕・群衆だけECSにするハイブリッドが現実的
- 空Updateの削除、`GetComponent` のキャッシュなど、MonoBehaviour方式のまま効く緩和策も多い

## Unreal Engine との対応

- Actor + ActorComponent = Component パターン(→ [第10部](/game/unreal/uobject-actor-component.html))。ただしUEはActor継承(ACharacter等)も太く、**継承とComponentの混合設計**
- Mass Entity フレームワークがUEのECS(群衆向け)

## 使う場面 / 使わない場面

- **Component**: ほぼすべてのゲームオブジェクト設計の既定解(エンジンがそうなっている)。ただし2〜3種類しかない固定的なオブジェクトに自作Component基盤を作るのは過剰
- **ECS**: 同種の大量(数千〜)オブジェクト、性能が計測で問題になっている、決定的シミュレーションが欲しい場合。**チーム全員の発想の転換が必要**なので、性能要件なしに採用しない

## よくある誤解

- 「ECSはComponentパターンの上位互換」— 違います。動機が別(柔軟性 vs 性能)で、少数の複雑なオブジェクトにはComponentの方が向きます
- 「UnityのGameObjectはECS」— 違います。Unityの従来方式はComponentパターンで、ECSはDOTS/Entities
- 「オブジェクト指向は遅いから駄目」— 数に依ります。100体の敵ならMonoBehaviourで何の問題もありません

## 関連項目

- [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)
- [Data Locality](/game/patterns/optimization-patterns.html) / [AoSとSoA](/runtime/memory/cache-locality-aos-soa.html)
- [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html)

## 理解度チェック

1. ComponentパターンとECSの動機の違いは?
2. ECSでEntityが「ただのID」になる理由は?
3. ECSを採用すべきでないプロジェクトの特徴を2つ挙げてください。

## 演習

samples/ecs_minimal.cpp に「寿命(Lifetime)コンポーネント」と「寿命切れEntityを除去するSystem」を追加してください。除去時に配列の詰め方(swap-and-pop)がindexの意味を壊す問題にどう対処するか考えてください(ヒント: これがEntity IDと世代が必要になる理由です → [Object Pool](/game/patterns/object-pool.html))。

---

前: [Game Loop と Update Method](/game/patterns/game-loop-and-update.html) | [カテゴリ目次](/game/patterns/) | 次: [Event Queue・Message Bus・Pub/Sub](/game/patterns/event-queue-and-pubsub.html)
