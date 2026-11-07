---
title: シーン・オブジェクト・コンポーネントの基本
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: ゲーム内の物をシーンに配置し、位置や描画、当たり判定の部品を組み合わせる考え方を説明する。親子関係と、Unity・Unreal Engineの用語もつなげる。
  aliases: [シーン, scene, ゲームオブジェクト, GameObject, コンポーネント, Component, Transform, 親子関係, ヒエラルキー, Actor, ActorComponent, SceneComponent]
  verification: Unity 6.0のシーン・GameObject・TransformとUnreal EngineのActor・Componentの公式資料に照合（2026-11-07）
---

# シーン・オブジェクト・コンポーネントの基本

ゲームの中には、プレイヤー、地面、カメラ、照明などがあります。これらを配置し、役割を組み合わせると、遊べる場面を作れます。まずUnityを主な例に、物の配置と機能の持たせ方を見ます。[Unityのシーン](https://docs.unity3d.com/6000.0/Documentation/Manual/CreatingScenes.html) · [ゲームエンジンの基本](/game/basics/game-engine-basics.html)

## シーンは、配置する内容をまとめる

**シーン**は、オブジェクトの配置や関連する設定をまとめる単位です。Unityでは、シーンをアセットとして保存し、読み込んでゲームを動かします。一つのシーンでゲーム全体を作ることも、複数のシーンを同時に読み込んで、背景とUIなどを分けて扱うこともできます。ステージとシーンの対応は、ゲームの構成によって決まります。[Unityのシーンの役割](https://docs.unity3d.com/6000.0/Documentation/Manual/CreatingScenes.html) · [複数シーンの読み込み](https://docs.unity3d.com/6000.0/Documentation/Manual/MultiSceneEditing.html)

**オブジェクト**という言葉は、ここではゲーム内の物や機能を表すまとまりとして使います。Unityの**GameObject**は、そのまとまりに名前を付け、**コンポーネント**という部品を付けて役割を持たせる仕組みです。例えば同じGameObjectに、位置、見た目、当たり判定、独自の操作処理を組み合わせます。[UnityのGameObject](https://docs.unity3d.com/6000.0/Documentation/Manual/GameObjects.html) · [コンポーネントを使う](https://docs.unity3d.com/6000.0/Documentation/Manual/UsingComponents.html)

## コンポーネントが担当すること

| 部品の例 | 担当すること |
| --- | --- |
| **Transform** | 位置、回転、大きさを表す。親子の配置関係も持つ。 |
| **MeshFilter・MeshRenderer** | メッシュの参照を持ち、その形状とマテリアルを使って描画する。 |
| **Collider** | 当たり判定に使う形状を定める。 |
| **Rigidbody** | 質量などを持ち、物理シミュレーションでの移動を扱う。 |
| **独自のスクリプト** | 入力に応じた移動、HP、攻撃など、ゲーム固有の処理を持たせる。 |

すべてのGameObjectが描画や物理の部品を持つ必要はありません。カメラだけを持つものや、他のオブジェクトをまとめるためのものも作れます。**メッシュ**は描画に使う形状、**コライダー**は当たり判定に使う形状です。[Unityのコンポーネント](https://docs.unity3d.com/6000.0/Documentation/Manual/UsingComponents.html) · [モデルとメッシュ](/graphics/basics/models-and-meshes.html) · [衝突と物理](/game/basics/collisions-and-physics.html)

<figure class="study-figure">
  <img src="/images/game/scenes-and-components.svg" alt="シーン内にPlayerとGroundがあり、CameraはPlayerの子に配置されている。選択したPlayerにはTransform、描画、当たり判定、操作処理のコンポーネントが付く。親子の配置と、オブジェクトが持つ部品は別の関係として表す。" width="760" height="470" loading="lazy">
  <figcaption>左は配置の親子関係、右は一つのGameObjectが持つ部品の例です。<a href="/study/images/game/scenes-and-components.svg" target="_blank" rel="noopener noreferrer">シーンと部品の図を拡大</a></figcaption>
</figure>

## 親子関係で位置をまとめる

UnityのGameObjectはTransformによる**親子関係**を作れます。例えばPlayerを親、Cameraを子にすると、子のローカルな位置は親を基準に表せます。親の位置や回転が変わると、その変換を受けた場所に子も配置されます。この配置の階層を**ヒエラルキー**と呼びます。[UnityのTransformと親子関係](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Transform.html)

例えば回転や拡縮をしていない親がワールド位置`(10, 0, 0)`、子のローカル位置が`(0, 2, 0)`なら、子のワールド位置は`(10, 2, 0)`になります。親を右へ動かすと、子のローカル位置を変えずに一緒に動かせます。回転や拡縮も含む一般的な配置は、変換を組み合わせて求めます。[座標とカメラの基本](/graphics/basics/transforms-and-cameras.html)

## Unreal Engineの名前を読む

Unreal Engineでは、レベルに配置するまとまりを**Actor**と呼びます。Actorに**ActorComponent**を付け、機能を組み合わせられます。位置や回転を持つ部品は**SceneComponent**で、Actorの位置はルートのSceneComponentを基準に扱います。ActorComponent全般が位置を持つわけではないため、部品の種類まで見ます。[Unreal EngineのActor](https://dev.epicgames.com/documentation/en-us/unreal-engine/actors-in-unreal-engine) · [Componentの種類](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine)

UnityのGameObjectとUnreal EngineのActorは、どちらも配置するまとまりを理解する入口になりますが、所有や寿命、実行の仕組みはそれぞれのエンジンで確認します。[UObject・Actor・ActorComponentの詳解](/game/unreal/uobject-actor-component.html)

## 配置データと、実行中に変わる状態

同じ設定から敵や弾を作りたい場合は、[プレハブとオブジェクトの寿命](/game/basics/prefabs-and-object-lifetimes.html)へ進めます。

シーンに保存した配置から実行を始めると、移動したり、敵を生成したり、HPを減らしたりして状態が変わります。次回のプレイでも残したい情報は、ゲームが選んでセーブします。エディターで保存するシーンの配置と、プレイヤーの進行を保存する仕組みを、それぞれ用意します。[ゲームの小さな設計例](/game/shooter-design.html) · [ファイルとパス](/os/files-and-paths.html)

部品の組み合わせをさらに設計へつなぐときは、[ComponentとECS](/game/patterns/component-and-ecs.html)へ進みます。フレームごとの更新は[ゲームループと時間](/game/basics/game-loop-and-time.html)で扱います。
