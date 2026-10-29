---
title: "ケーススタディ 09: オブジェクト生成"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "「敵・弾・エフェクト・アイテムをいつ、誰が、どうやって作るか」。生成はFactory Method/Prototype/Object Poolの交差点です。 敵種が増える → make_unique の分岐がスポーン箇所ごとに複製(Factory Methodの問題そのもの)"
---

# ケーススタディ 09: オブジェクト生成

「敵・弾・エフェクト・アイテムをいつ、誰が、どうやって作るか」。生成は[Factory Method](/design/patterns/factory-method.html)/[Prototype](/design/patterns/prototype.html)/[Object Pool](/game/patterns/object-pool.html)の交差点です。

## 素朴な実装

```cpp
// C++20
void WaveManager::Update(float dt) {
    timer_ -= dt;
    if (timer_ <= 0) {
        world_.enemies.push_back(std::make_unique<Goblin>(RandomEdgePos()));
        timer_ = 3.f;
    }
}
```

## 機能追加で破綻する過程

1. 敵種が増える → `make_unique<Goblin>` の分岐がスポーン箇所ごとに複製([Factory Methodの問題](/design/patterns/factory-method.html)そのもの)
2. 「レベルデータから湧き構成を読む」→ 型名の文字列から生成する仕組みがない
3. 生成時の付随処理(出現演出、ミニマップ登録、実績カウント)が生成箇所ごとにコピペされ、**登録漏れの敵**(ミニマップに映らない)が発生
4. 弾・ヒットエフェクトが毎フレーム大量生成され、スパイクとGC/断片化([Pool](/game/patterns/object-pool.html)の問題領域)
5. 「スポーン中にスポーンする」(死亡時に分裂)でコンテナ走査中の追加([Iterator破壊](/design/patterns/iterator.html))

## 案A: 生成の一元化(Factory+登録処理の集約)

```cpp
class EnemySpawner {
public:
    using Creator = std::function<std::unique_ptr<Enemy>(const SpawnParams&)>;
    void Register(std::string_view typeId, Creator c);          // 登録制ファクトリ

    Enemy* Spawn(std::string_view typeId, const SpawnParams& p) {
        auto e = creators_.at(std::string(typeId))(p);
        Enemy* raw = e.get();
        world_.Add(std::move(e));          // 所有はWorldへ
        minimap_.Register(*raw);           // ★付随処理はここに1回だけ書く
        events_.Publish(EnemySpawned{raw->Id()});
        return raw;                        // 非所有ポインタを返す(借用)
    }
};
```

- データ駆動(typeIdはレベルデータの文字列)+付随処理の一元化で破綻1〜3を同時に解決
- 「スポーン中のスポーン」は**スポーン予約キュー**(このフレームの生成要求を溜め、更新ループの外で実行 → [Event Queue](/game/patterns/event-queue-and-pubsub.html)の応用)で解決

## 案B: Prototype(見本コピー)案

種類ごとに設定済みの見本を持ち、`Clone()` で量産([Prototype](/design/patterns/prototype.html))。エディタで調整した個体を種類にできる。UnityのPrefab/UEのBlueprint Classは**エンジンがこの案を提供している**ので、エンジン上ではこれが自動的に第一候補になります。

## 案C: Object Pool案(高頻度物専用)

弾・エフェクト・ダメージ数字は生成頻度が桁違い(毎秒数百)なので、[Pool](/game/patterns/object-pool.html)で使い回す。**「敵はFactory、弾はPool」のように対象で使い分ける**のが実務形(全部Poolにする必要はない)。

## 案D: パターンを使わない簡潔案

小規模なら: 生成関数を1つだけ書く(`SpawnEnemy(world, type, pos)` 自由関数)。分岐はその中のswitchでよい——「生成と付随処理が1か所」という本質だけ守る形。

## 継承案について

`SpawnerBase` → `GoblinSpawner` / `OrcSpawner` のような**スポナーの継承階層**([Factory Methodの古典形](/design/patterns/factory-method.html))は、現代では登録制(案A)やデータ駆動に置き換えられることが多い——「何を作るか」はクラスではなくデータの差だからです。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小 | 案D(生成関数1つ)。弾が多いならそこだけ案C |
| 中 | 案A(登録制+付随処理集約)+案C(高頻度物)+スポーン予約 |
| 大 | 同上+非同期ロード連携([Proxy/ソフト参照](/game/unreal/smart-pointers.html)——生成要求時にアセットがまだ無い問題)+ストリーミング境界での湧き管理 |
| Unity | Prefab(案B)+ObjectPool(公式)+Addressablesで非同期 |
| UE | SpawnActor+Blueprint Class(案B)+自作Pool。付随処理はGameModeやSubsystemに集約 |

## この題材の教訓

- 生成の設計とは「newの隠蔽」ではなく「**生成に必ず伴う付随処理(登録・通知・演出)を1か所に集める**」こと——漏れたときのバグ(ミニマップに映らない敵)は再現条件が生成経路依存で、追跡がとても高くつく
- 生成頻度で道具が変わる: 低頻度=Factory/Prototype、高頻度=Pool。**1つの仕組みに統一しようとしない**

---

前: [UI通知](/design/case-studies/ui-notification.html) | [カテゴリ目次](/design/case-studies/) | 次: [画面遷移](/design/case-studies/screen-transition.html)
