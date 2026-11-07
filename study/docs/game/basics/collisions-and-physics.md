---
title: 衝突と物理の基本 — コライダー・Rigidbody・トリガー
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: 描画用の形と当たり判定の形を分け、接触の検出、物理の応答、ゲームのルールへつなぐ。Unityの3D物理を例に、Rigidbody、トリガー、すり抜け、レイの検査を説明する。
  aliases: [衝突, 当たり判定, collision, Collider, コライダー, Rigidbody, 剛体, 静的, 動的, kinematic, キネマティック, trigger, トリガー, CCD, レイキャスト]
  verification: Unity 6.0の3D Collider・Rigidbody・イベント・CCD・Raycastの公式資料に照合（2026-11-07）
---

# 衝突と物理の基本 — コライダー・Rigidbody・トリガー

ゲームの弾が敵に触れる、箱が床へ落ちる、入口へ入ると次の場面へ進む。どれも空間での接触や重なりを使いますが、その後に起こしたい処理は違います。ここでは**Unity 6.0の3D物理**を例に、形を用意して結果を使うまでを見ます。Unityの2D物理は、別のコンポーネントとシミュレーションを使います。[Unityの衝突の基本](https://docs.unity3d.com/6000.0/Documentation/Manual/CollidersOverview.html)

## 見える形と、接触を調べる形

**メッシュ**は、頂点や面からなる描画用の形です。**コライダー（Collider）**は、当たり判定に使う形です。人型キャラクターにカプセル形のコライダーを付けるなど、見た目より単純な形を使えます。球、箱、カプセルなどの形を組み合わせる方法もあります。[Unityのコライダーの形](https://docs.unity3d.com/6000.0/Documentation/Manual/CollidersOverview.html) · [モデルとメッシュ](/graphics/basics/models-and-meshes.html)

**衝突判定**は、形同士が接触したり重なったりしたかを調べます。**物理シミュレーション**は、速度や力、接触などをもとに、次の位置や動きを計算します。重なりをゲームへ知らせるだけの使い方も、物理計算で箱を跳ね返す使い方もあります。[Unityの衝突の扱い](https://docs.unity3d.com/6000.0/Documentation/Manual/collider-types-interaction.html)

<figure class="study-figure">
  <img src="/images/game/collisions-and-physics.svg" alt="同じ物の見た目をメッシュで描き、当たり判定を単純な箱のコライダーで表す。接触を調べた結果は、物理の応答で箱の動きを変えたり、ゲームの処理へ渡してHPを減らしたりするために使う。" width="760" height="470" loading="lazy">
  <figcaption>接触の検出から、物理の動きとゲーム固有のルールへつなぎます。<a href="/study/images/game/collisions-and-physics.svg" target="_blank" rel="noopener noreferrer">衝突と応答の図を拡大</a></figcaption>
</figure>

## Rigidbodyで動きを扱う

**Rigidbody（剛体）**は、質量や速度などを持ち、物理計算で扱う物体のまとまりです。Unityの3D物理では、ColliderとRigidbodyの組み合わせによって、次のような使い方になります。[UnityのRigidbody](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Rigidbody.html)

| 種類 | Unityでの基本構成 | 使う場面 |
| --- | --- | --- |
| **静的（Static）** | Colliderがあり、Rigidbodyがない。 | 動かさない床や壁。 |
| **動的（Dynamic）** | ColliderとRigidbodyがあり、Is Kinematicがオフ。 | 重力で落ち、接触で動きが変わる箱。 |
| **キネマティック（Kinematic）** | ColliderとRigidbodyがあり、Is Kinematicがオン。 | スクリプトやアニメーションが動きを決める足場など。 |

動的な物体には力や重力を使い、物理計算に移動を任せられます。キネマティックな物体は、外から指定する動きを使いながら、対応する相手との物理的なやり取りに参加します。用途に合う構成を選び、物理が扱う位置を更新するAPIも確認します。[UnityのColliderの種類](https://docs.unity3d.com/6000.0/Documentation/Manual/CollidersOverview.html) · [Rigidbodyの設定](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Rigidbody.html)

## トリガーで重なりを知らせる

**トリガー**は、相手を押し返す衝突応答を行わず、重なりを知らせるコライダーです。入口の領域やアイテムの取得範囲に使えます。UnityではColliderの**Is Trigger**を有効にし、`OnTriggerEnter`などで通知を受け取ります。[Unityのトリガーイベント](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Collider.OnTriggerEnter.html)

Unityの3Dトリガーでは、組のうち少なくとも片方にRigidbodyが必要です。キネマティックなRigidbodyでも対象になります。一方、通常の`OnCollision`の通知は、少なくとも片方が動的なColliderの組で発生します。通知の有無は、Colliderの組み合わせや、レイヤーの衝突設定も含めて確認します。[UnityのColliderの組み合わせ](https://docs.unity3d.com/6000.0/Documentation/Manual/collider-types-interaction.html) · [レイヤーによる衝突の選別](https://docs.unity3d.com/6000.0/Documentation/Manual/LayerBasedCollision.html)

## 「触れた」からゲームのルールへ

弾と敵の接触を通知されたら、ゲーム側が相手を調べ、HPを減らし、弾を消すなどの処理を決めます。物理エンジンが扱う接触と、「敵に30ダメージ」というルールを結び付けるのがゲームのコードです。複数のコライダーや継続する接触から通知を受ける設計では、一発の攻撃を何度適用するかも決めます。[Unityの接触イベント](https://docs.unity3d.com/6000.0/Documentation/Manual/collider-types-interaction.html) · [シューティングの設計](/game/shooter-design.html)

## 速い物体は、途中を通り過ぎることがある

物理は時間を区切った**ステップ**で進みます。位置を区切りごとに調べる**離散的な衝突判定**では、速い小さな弾が、前の位置と次の位置の間にある薄い壁を通り過ぎる場合があります。**CCD（連続衝突判定）**は、その間の移動も考慮して、すり抜けを減らすための仕組みです。対象の形や動きに応じて方式を選び、実際の速度で確かめます。[UnityのCCD](https://docs.unity3d.com/6000.0/Documentation/Manual/ContinuousCollisionDetection.html) · [ゲームループと時間](/game/basics/game-loop-and-time.html)

**レイキャスト**は、始点からある方向へ線を伸ばし、設定した距離内でどのコライダーに当たるかを調べる問い合わせです。地面の位置、照準、遮られているかの確認などに使えます。太さを持つ物体の移動を調べたい場合は、球などの形を使う問い合わせもあります。[UnityのPhysics.Raycast](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.Raycast.html) · [Physics.SphereCast](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.SphereCast.html)

部品の付け方と配置の関係は[シーンとコンポーネント](/game/basics/scenes-and-components.html)、位置や大きさの基準は[座標とカメラ](/graphics/basics/transforms-and-cameras.html)へ進みます。
