---
title: Component と Entity Component System(比較つき)
study:
  source: C++ Wiki
  status: published
  summary: オブジェクトに機能の部品を付けるComponentパターンと、ID・データ・処理を分けるECSを比較する。組み合わせの柔軟性、データ配置、更新方式を見て、採用の条件と代償を考える。
  section: reference
  format: article
  domain: game
---

# Component と Entity Component System(比較つき)

## 一言で言うと

- **Component パターン**: ゲームオブジェクトを「機能の部品(コンポーネント)の入れ物」にする。継承ツリーの爆発を防ぐ、Unityの基本構造。
- **ECS (Entity Component System)**: Entityの識別、Componentのデータ、Systemの処理を分ける設計。型ごとの連続配列やチャンクにデータをまとめて処理する実装が多いですが、具体的な配置は実装によります。

両者とも部品の組み合わせによる柔軟性を持ち、ECSは必要なデータを選んで一括処理する構成にも向いています。性能と柔軟性を二者択一で分ける定義ではありません。[ECSの定義と実装方式](/game/ecs.html)

<div id="継承方式-→-component方式-設計の問題" class="study-legacy-anchor" aria-hidden="true"></div>

## 継承方式 → Component方式(機能の組み合わせ)

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

<div id="ecs-性能の問題" class="study-legacy-anchor" aria-hidden="true"></div>

## ECS(データと処理の分け方)

### MonoBehaviour/Component方式で調べる性能コスト

- 部品が個別に確保されている構成では、Updateでポインタを追うと、データ配置によってキャッシュミスが増えることがある(→ [キャッシュ](/runtime/cpp-internals/cache-branch-simd.html))
- 部品ごとに呼び出す構成では、対象数が増えると呼び出しのコストも増える。UnityのMonoBehaviourと、上のC++の仮想関数による実装では、呼び出しの仕組みが異なる

### ECSの構造

```
Entity    = 対象を識別するIDやハンドル
Component = 対象ごとの状態(Position{x,y}, Velocity{dx,dy})
System    = 必要なComponentを選んで処理(例: PositionとVelocityで移動)

メモリ: Position[] ■■■■■■■■(連続配列)
        Velocity[] ■■■■■■■■(連続配列)
MoveSystem: for i in 0..n: pos[i] += vel[i] * dt   ← キャッシュに最高に優しいループ
```

図は、対象ごとの状態と横断処理の役割を示しています。Componentに補助メソッドを置いたり、Systemが設定やキャッシュを持ったりする構成もあります。

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
| データと処理 | オブジェクトや部品の単位でまとめる | 対象ごとの状態をComponentに置き、Systemで処理する |
| メモリ配置 | オブジェクトごとに分散しやすい | 型ごとの配列・チャンクなど。配置と処理対象が合えば局所性を高めやすい |
| 同種データの一括処理 | 部品の配置や呼び出し方式でコストが変わる | データ配置と処理が合えば局所性や並列化を活かしやすい |
| 書きやすさ・直感性 | 高い(1体=1物) | 低い(処理が横断的、発想の転換が必要) |
| 少数の複雑なオブジェクト | 自然 | 冗長 |
| デバッグ | インスペクタで1体を見る | 「この弾がなぜ曲がった」を追いにくい |

## Unity/C# との対応

- GameObject + MonoBehaviour = Component パターンそのもの(`AddComponent`, `GetComponent<T>`)
- Unity DOTS/Entities = ECS の公式実装(Burst + Job System で並列化まで込み)。**全ゲームをDOTSにする必要はなく**、大量ユニット・弾幕・群衆だけECSにするハイブリッドが現実的
- 空Updateの削除、`GetComponent` のキャッシュなど、MonoBehaviour方式のまま効く緩和策も多い

## Unreal Engine との対応

- Actor + ActorComponent = Component パターン(→ [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html))。ただしUEはActor継承(ACharacter等)も太く、**継承とComponentの混合設計**
- Mass Entity フレームワークがUEのECS(群衆向け)

## 使う場面 / 使わない場面

- **Component**: ほぼすべてのゲームオブジェクト設計の既定解(エンジンがそうなっている)。ただし2〜3種類しかない固定的なオブジェクトに自作Component基盤を作るのは過剰
- **ECS**: 同種の大量オブジェクトの一括処理や、データの組み合わせを柔軟に扱いたい場合に候補となる。移行・デバッグの費用と実際の効果を確認する。決定的シミュレーションには処理順、乱数、固定tick、数値演算などの設計が別に必要で、ECSだけでは保証されない

## よくある誤解

- ECSとComponentパターンでは、分割する単位と更新する方法が異なります。どちらにも柔軟性と性能上のトレードオフがあります。少数の複雑なオブジェクトでは、オブジェクト単位のComponent方式が扱いやすい場合があります。
- 「UnityのGameObjectはECS」— 違います。Unityの従来方式はComponentパターンで、ECSはDOTS/Entities
- 採用の目安は固定の体数では決まりません。同じ仕事量で、更新時間・データ配置・構成変更のコストを比べます。

## 関連項目

- [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)
- [Data Locality](/game/patterns/optimization-patterns.html) / [AoSとSoA](/runtime/memory/cache-locality-aos-soa.html)
- [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html)

## 理解度チェック

1. ComponentパターンとECSでは、データと処理をどの単位で分けますか。性能や決定性は自動的に保証されますか。
2. ECSで、対象の識別とComponentの格納位置を分けて扱う理由は?
3. ECSを採用すべきでないプロジェクトの特徴を2つ挙げてください。

## 演習

samples/ecs_minimal.cpp に「寿命(Lifetime)コンポーネント」と「寿命切れEntityを除去するSystem」を追加してください。削除で末尾の要素を移したときは、IDと配列位置の対応を更新します。IDのスロットを再利用する設計なら、世代で古いハンドルを区別します。[スパースセットとECS](/algorithms/sparse-sets.html) · [Object Pool](/game/patterns/object-pool.html)

---

関連項目：[Game Loop と Update Method](/game/patterns/game-loop-and-update.html) | [この分野の学習ガイド](/game/patterns/) | [Event Queue・Message Bus・Pub/Sub](/game/patterns/event-queue-and-pubsub.html)
