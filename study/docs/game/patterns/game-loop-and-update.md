---
title: "Game Loop と Update Method"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "Game Loop: 「入力を読み→世界を更新し→描画する」を回し続ける、ゲームの心臓部。時間の進め方を決めるパターン。 Update Method: ループの中で、各オブジェクトに「1フレーム分の自分の処理」(Update(dt))をさせるパターン。UnityのUpdate()の正体。"
---

# Game Loop と Update Method

## 一言で言うと

- **Game Loop**: 「入力を読み→世界を更新し→描画する」を回し続ける、ゲームの心臓部。**時間の進め方**を決めるパターン。
- **Update Method**: ループの中で、各オブジェクトに「1フレーム分の自分の処理」(`Update(dt)`)をさせるパターン。UnityのUpdate()の正体。

## 解決したい問題

通常のプログラムは「入力を待って」処理します。ゲームは**誰も操作していなくても世界が動き続ける**必要があり、しかも実行マシンの速度に関係なく同じゲーム速度でなければなりません。

## 最も単純な例(問題のある実装)

```cpp
// C++20(問題例)— 回るだけのループ
while (running) {
    ProcessInput();
    Update();      // 1回で世界を1ステップ進める
    Render();
}
// 速いPCでは敵が高速化し、遅いPCではスローモーションになる
// (ステップがフレーム数に固定されているため)
```

古いゲームがこの作りで、高速な現代CPUで動かすと超高速になります。

## 改善1: 可変タイムステップ

```cpp
// C++20 — 前フレームからの経過時間で世界を進める
auto prev = Clock::now();
while (running) {
    auto now = Clock::now();
    float dt = DurationSec(now - prev);   // 経過秒
    prev = now;
    ProcessInput();
    Update(dt);        // 移動は speed * dt のように書く
    Render();
}
```

実時間に追従するのでゲーム速度は安定。しかし `dt` が毎回違うため、**物理や当たり判定の結果がフレームレート依存**になります(dtが大きいと壁を突き抜ける等)。浮動小数点の誤差蓄積も再現性を壊します。

## 改善2: 固定タイムステップ+補間(現代の標準形)

```cpp
// C++20 — 更新は固定刻み、描画は可変。Gaffer on Games "Fix Your Timestep" の形
constexpr float kFixedDt = 1.0f / 60.0f;
float accumulator = 0.0f;
auto prev = Clock::now();
while (running) {
    auto now = Clock::now();
    accumulator += DurationSec(now - prev);
    prev = now;

    ProcessInput();
    while (accumulator >= kFixedDt) {   // 溜まった実時間を固定刻みで消化
        FixedUpdate(kFixedDt);          // 物理・ロジックの時間刻みを1/60秒にそろえる
        accumulator -= kFixedDt;
    }
    Render(accumulator / kFixedDt);     // 端数は描画の補間に使う(カクつき防止)
}
```

サンプル: <a href="/study/samples/cpp/game_loop.cpp">samples/game_loop.cpp</a>(今回の訂正では説明・コメントに加え、消化回数の上限に達した場合の描画係数も修正。GCC 9.2での再ビルド・実行確認は修正記録で管理し、決定性や実機描画の検証とは区別します)

- 更新の時間刻みをそろえ、描画フレーム時間の変動をシミュレーションから切り離せる。ただし**固定刻みだけでは決定性は保証されない**。入力をどのtickに適用するか、初期状態、乱数seedと使用順、オブジェクトの処理順、並列処理、浮動小数点演算・コンパイラ設定、外部時刻やI/Oの結果もそろえる必要がある
- 可変刻みでも、同じ時間刻みの列と入力を再生し、ほかの条件も一致すれば再現できる方式はある。固定刻みは再現性を設計しやすくする選択肢であり、決定性の普遍的な必要条件ではない([Box2Dもアプリ全体の決定性は別と説明](https://box2d.org/documentation/md_simulation.html))
- 注意: 更新が1/60秒より遅いマシンでは accumulator が溜まり続ける「死のスパイラル」になるため、実務では消化回数に上限を設けます
- **消化回数の制限と描画の補間方針は別の問題**です。上限に達して `accumulator >= kFixedDt` が残ると、単に割った係数は1を超えます。対応サンプルでは残積算を捨てずに次フレームへ持ち越し、描画係数だけを `std::min(accumulator / kFixedDt, 1.0f)` で最大1に制限します。追いつくまでは最新のシミュレーション状態を表示する方針で、外挿はしません。サンプルは係数を表示するデモで、実際の補間描画は省略しています

## Update Method

ループが直接全オブジェクトの処理を書くと神関数化するので、各オブジェクトに委ねます。

```cpp
// C++20
class GameObject {
public:
    virtual ~GameObject() = default;
    virtual void Update(float dt) = 0;   // 「自分の1フレーム」を自分で書く
};
// ループ側: for (auto& obj : objects) obj->Update(dt);
```

これは[Template Method](/design/patterns/template-method.html)的構造(ループが骨格、Updateがフック)+[Composite](/design/patterns/composite.html)的な一括処理です。

### Update Methodの注意点

- **更新順序**: AがBの位置を参照するとき、Bが先に動いたか後かで結果が変わる。順序を保証しない設計(前フレームの値を読む → [Double Buffer](/game/patterns/optimization-patterns.html))か、明示的な順序付けが必要
- **更新中のリスト変更**: Update中にスポーン・削除するとイテレータ破壊(→ [Iterator](/design/patterns/iterator.html)の落とし穴)。追加・削除は遅延リストで
- 数万オブジェクトの仮想Update呼び出しはキャッシュ・分岐に不利(→ [Data Locality](/game/patterns/optimization-patterns.html)、[ECS](/game/patterns/component-and-ecs.html))

## Unity/C# との対応

- `Update()` = 可変ステップ(`Time.deltaTime`)、`FixedUpdate()` = 固定ステップ(物理用)。**「物理はFixedUpdate、見た目はUpdate」の使い分けはこのページの2方式そのもの**
- `Time.timeScale` はループの時間の進みを操作する仕組み(ポーズ・スロー演出)
- MonoBehaviourのUpdateはリフレクションで収集され、C++側から一括呼び出しされる(1個あたりのオーバーヘッドがあるため、大量オブジェクトでは自前のManagerが束ねるテクニックがある)

## Unreal Engine との対応

- `AActor::Tick(float DeltaSeconds)` が可変ステップUpdate。`Substepping` 設定で物理は内部的に固定刻み化
- Tickの実行順は `TickGroup`(PrePhysics/DuringPhysics/PostPhysics)で制御——更新順序問題への明示的な回答

## 使う場面 / 使わない場面

- **固定ステップ**: 物理の安定性や、入力とシミュレーションtickの対応を管理したいネット同期・リプレイなどで有力。決定性はほかの条件も含めて設計・検証する
- **可変ステップ**: カメラ、UIアニメ、パーティクルなど見た目だけのもの
- **Update Methodを使わない場面**: 毎フレーム処理が不要なオブジェクト(イベント駆動で十分な設置物)にまで空Updateを持たせない(呼び出しコストの無駄。Unityでは空Updateを消すだけで速くなる)

## よくある誤解

- 「deltaTimeを掛ければ全部フレームレート非依存になる」— 単純な等速移動と違い、数値積分・減衰・離散的な衝突判定では時間刻みが結果に影響する。固定刻みは差を抑えて条件をそろえやすいが、固定刻みだけで同じ結果になるとは限らず、唯一の再現方式でもない
- 「ゲームループは自分で書くもの」— Unity/UEでは書けない(エンジンが所有)。自分で書くのはエンジン自作・組み込み・サーバーのとき

## 関連項目

- [Double Buffer / Data Locality(最適化系)](/game/patterns/optimization-patterns.html)
- [ECS](/game/patterns/component-and-ecs.html) / [Command Buffer](/game/patterns/command-buffer-and-input.html)
- [Template Method](/design/patterns/template-method.html)

## 理解度チェック

1. 可変タイムステップで物理が壊れる理由を説明できますか。
2. accumulator方式の固定ステップで、描画側の補間は何のためにありますか。
3. UnityのUpdateとFixedUpdateはこのページのどの方式に対応しますか。

## 演習

対応サンプル(samples/game_loop.cpp)の「更新消化回数の上限」を変え、重いフレームを表す時間を入力してください。1描画フレームの更新回数が上限以内、描画係数が0〜1であること、未消化の時間が後続フレームへ持ち越されることを観察してください。負荷が継続して高い場合にシミュレーションが実時間から遅れる点も考えてください。

---

前: [カテゴリ目次](/game/patterns/) | 次: [Component と ECS](/game/patterns/component-and-ecs.html)
