---
title: Flyweight
study:
  source: C++ Wiki
  status: published
  summary: 同種のオブジェクトが大量(数千〜数百万)にあり、各個体が同じデータのコピーを持つせいでメモリを浪費している。共有できる部分(不変)と個体ごとの部分(可変)を分離し、共有部分を1つだけ持ちたい。
  section: reference
  format: article
  domain: design
---

# Flyweight

## 解決する問題

同種のオブジェクトが**大量**(数千〜数百万)にあり、各個体が同じデータのコピーを持つせいでメモリを浪費している。**共有できる部分(不変)と個体ごとの部分(可変)を分離**し、共有部分を1つだけ持ちたい。

## 登場人物と責務

- **Flyweight**: 共有される不変データ(内因的状態 intrinsic state)。例: 樹木のメッシュ・テクスチャ
- **個体側(外因的状態 extrinsic state)**: 個体ごとに違うデータ。例: 位置・スケール
- **FlyweightFactory**: 共有インスタンスの生成・キャッシュ(同じものを2度作らない)

## 最小構成図

```
TreeInstance{x,y,scale, type*} ─┐
TreeInstance{x,y,scale, type*} ─┼──> TreeType{メッシュ, テクスチャ, 当たり判定}(1個だけ)
TreeInstance{x,y,scale, type*} ─┘        ↑ 共有(不変)
     個体データ 16バイト程度            数MB
```

## パターンなしの実装

```cpp
// C++20(問題例)
struct Tree {
    Mesh mesh;              // 数MBのメッシュを個体ごとにコピー
    Texture bark, leaves;   // テクスチャも個体ごと
    float x, y, scale;      // 個体差はこの12バイトだけなのに…
};
std::vector<Tree> forest(10000);   // メッシュ1万個分のメモリが吹き飛ぶ
```

## 問題点

- メモリの浪費(同一データの大量コピー)。ロード時間・帯域も浪費
- 「樹木の見た目を変える」修正が概念上1か所のはずなのに、実体は1万個ある

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

// Flyweight: 共有される不変データ(constで不変性を表現)
struct TreeType {
    // Mesh mesh; Texture bark, leaves; などの重いデータ(ここでは省略)
    std::string name;
    float baseRadius = 1.0f;
};

// 個体: 軽い外因的状態 + 共有データへのポインタ
struct TreeInstance {
    float x = 0, y = 0, scale = 1.0f;
    const TreeType* type = nullptr;   // 生ポインタ: 所有しない。TreeTypeRegistryが全型を所有し
                                      // インスタンスより長生きすることが保証されているため
};

class TreeTypeRegistry {              // FlyweightFactory
public:
    const TreeType* GetOrCreate(const std::string& name) {
        auto it = types_.find(name);
        if (it == types_.end())
            it = types_.emplace(name, std::make_unique<TreeType>(TreeType{name})).first;
        return it->second.get();
    }
private:
    std::unordered_map<std::string, std::unique_ptr<TreeType>> types_;  // 共有データを所有
};

// 使用: 1万本植えても TreeType は種類数ぶんだけ
// forest.push_back({x, y, s, registry.GetOrCreate("oak")});
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_flyweight.cpp">samples/pattern_flyweight.cpp</a>

**共有データは不変にする**のが安全の要です。可変にすると「1本の木の色を変えたら全部変わった」という共有の罠を踏みます。

## C#またはUnityでの実装

Unityは至る所でFlyweightを実装済みです。

- **Mesh/Material/Texture のアセット共有**: 1万個のGameObjectが同じMeshアセットを参照(コピーしない)。`renderer.sharedMaterial` は共有(Flyweight)、`renderer.material` は**個体コピーを作る**(アクセスした瞬間に複製が走る)——この違いを知らないとメモリとバッチングを壊します。
- **ScriptableObject**: 「敵の種類データ」を1アセットにして全個体が参照する定石は、Flyweightと[Type Object](/game/patterns/type-object-and-sandbox.html)の併用。

```csharp
public class EnemyTypeData : ScriptableObject {   // 共有(不変扱い)
    public int maxHp;
    public Sprite sprite;
}
public class Enemy : MonoBehaviour {              // 個体
    [SerializeField] private EnemyTypeData type;  // 共有への参照
    private int currentHp;                        // 個体状態
    void Start() => currentHp = type.maxHp;
}
```

注意: ScriptableObjectを実行時に書き換えると全個体+エディタのアセット本体に影響します(共有ゆえ)。実行時可変値は個体側に持つこと。

## ゲームでの具体例

- 樹木・草・岩などの大量配置物(GPUインスタンシングはFlyweightのGPU版)
- 弾幕の弾(弾種データ共有+位置/速度が個体)
- タイルマップ(タイル種類データ共有+グリッドはIDのみ保持)
- 文字グリフ(フォントレンダリングの古典例)

## 利点

- メモリ使用量が「個体数×重さ」から「種類数×重さ+個体数×軽さ」へ激減
- 共有データの変更が全個体へ即時反映(種類の調整が1か所)
- キャッシュ効率の改善(個体配列が小さくなり密に詰まる → [Data Locality](/game/patterns/optimization-patterns.html))

## 欠点

- 共有/個体の分離という設計コスト。「これは種類の属性か、個体の属性か」を全項目で判断する必要がある
- 共有データは実質不変に縛られる(可変にすると共有の罠)
- 個体→共有への間接参照が1回入る(通常は誤差)

## 適用条件

- 同種オブジェクトが大量にあり、メモリまたはロードが問題になっている(**計測してから**)
- データに明確な「種類ごと不変」部分がある

## 避けるべき条件

- 個体数が少ない(数十個の敵にFlyweightは無意味)
- ほぼ全データが個体ごとに違う(共有できるものがない)

## 似たパターンとの違い

- [Prototype](/design/patterns/prototype.html): コピーして個体を作る。Flyweightはコピーせず共有する。併用形(共有部+コピーされる個体部)が実務の主流
- [Object Pool](/game/patterns/object-pool.html): 「インスタンスの再利用」(生成コスト対策)。Flyweightは「データの共有」(メモリ対策)。弾幕では両方併用する
- [Singleton](/design/patterns/singleton.html): 「種類ごとに1つ」の管理をFactoryが行う点で似るが、全域アクセスは不要

## 実務でよく見かける変形

- ID参照方式: ポインタでなく `uint16_t typeId` を持ち、配列で種類データを引く(さらに軽量・シリアライズも楽)
- GPUインスタンシング、テクスチャアトラス(リソースレベルのFlyweight)

## 過剰設計になる例

10体しか出ない敵のために共有/個体分離を厳密化する——メモリが問題になっていないなら、素直な構造の方が変更しやすい。**Flyweightは計測(メモリプロファイル)とセットで導入するパターン**です。

## 関連項目

- [Type Object](/game/patterns/type-object-and-sandbox.html) / [Object Pool](/game/patterns/object-pool.html) / [Data Locality](/game/patterns/optimization-patterns.html)
- [ケーススタディ: オブジェクト生成](/design/case-studies/object-spawning.html)

## 理解度チェック

1. 内因的状態と外因的状態の区別を、樹木の例で言えますか。
2. `sharedMaterial` と `material` の違いは何のパターンの観点で説明できますか。
3. 共有データを不変にすべき理由は?

## 演習

弾幕STGの弾(最大10万発)を設計してください。弾種データ(画像、当たり半径、基本速度)と個体データ(位置、向き、経過時間)を分離し、1発あたりの個体データを何バイトにできるか見積もってください。

---

関連項目：[Facade](/design/patterns/facade.html) / [学習ガイド](/design/patterns/) / [Proxy](/design/patterns/proxy.html)
