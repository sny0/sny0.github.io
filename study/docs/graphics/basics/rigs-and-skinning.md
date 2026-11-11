---
title: リグとスキニングの基本 — 骨の姿勢でメッシュを動かす
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 腕を曲げる例から、ボーンとジョイントの階層、リグ、バインド姿勢、頂点ウェイト、スキニングを説明する。FK・IKと、剛体の動きとの役割も比べる。
  aliases: [リグ, rig, ボーン, bone, ジョイント, joint, スケルトン, skeleton, バインドポーズ, bind pose, スキニング, skinning, ウェイト, FK, IK, 逆運動学]
  verification: Unity 6.0のSkinned Mesh Renderer・IKとKhronosのglTF 2.0スキン仕様に照合（2026-11-07）
---

# リグとスキニングの基本 — 骨の姿勢でメッシュを動かす

キャラクターが肘を曲げると、腕の表面も曲がります。[メッシュ](/graphics/basics/models-and-meshes.html)の頂点を一つずつ手で動かす代わりに、骨格の姿勢と、各頂点がどの骨の影響を受けるかを指定して、メッシュを変形できます。ここでは腕を二つの部分に分けた例を使います。[UnityのSkinned Mesh Renderer](https://docs.unity3d.com/6000.0/Documentation/Manual/class-SkinnedMeshRenderer.html)

## ボーンとジョイントを階層にする

**ボーン**は、骨格を構成する部品です。肩、肘、手首など、関節を表す**ジョイント**を親子につなげて、姿勢を扱います。上腕を回すと、その子に当たる前腕や手のワールド上の位置も変わります。骨と関節のデータの持ち方や名前は、ツールや形式で異なります。[Unityの骨格と関節](https://docs.unity3d.com/6000.0/Documentation/Manual/InverseKinematics.html) · [glTFのジョイント階層](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#joint-hierarchy)

この骨格と、動かすための操作用部品や制約などを組み合わせた仕組みを**リグ**と呼びます。制作画面では骨や操作用の形を表示して編集します。実際のキャラクターの表面は、リグの姿勢を使って変形したメッシュから描きます。[Unityのリグの構成](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.2/manual/RiggingWorkflow.html) · [モデルとメッシュ](/graphics/basics/models-and-meshes.html)

## 基準の姿勢と、動かした後の姿勢

メッシュと骨格を対応付けるときの基準を、**バインド姿勢（バインドポーズ）**と呼びます。例えば腕を伸ばした状態で対応を作り、そこから肘を曲げた姿勢への変化を計算します。アニメーションが再生する姿勢と、この基準の情報を合わせて使います。[Unityのバインド姿勢とスキン](https://docs.unity3d.com/6000.0/Documentation/Manual/class-SkinnedMeshRenderer.html)

glTFには、ジョイントの一覧と、頂点を各ジョイントと同じ基準で扱うための**逆バインド行列**を記録する仕組みがあります。行列の役割を確認すると、メッシュの頂点を現在の骨格の姿勢へ変換する流れを追えます。[glTFのスキン](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins) · [座標変換の基礎](/graphics/basics/transforms-and-cameras.html)

<figure class="study-figure">
  <img src="/images/graphics/rigs-and-skinning.svg" alt="左は腕を伸ばした基準姿勢、右は前腕を曲げた姿勢の概念図。上腕と前腕の変換に合わせてメッシュの輪郭が変わる。肘付近の頂点は上腕0.4、前腕0.6のウェイトを使う例で示している。" width="760" height="490" loading="lazy">
  <figcaption>骨格と表面を一緒に描いた説明用の変形図です。<a href="/study/images/graphics/rigs-and-skinning.svg" target="_blank" rel="noopener noreferrer">骨格とスキニングの図を拡大</a></figcaption>
</figure>

## 頂点ごとに、影響する骨と重みを持つ

**スキニング**は、骨格の変換を使ってメッシュを変形する処理です。各頂点には、影響するジョイントの番号と、その影響の大きさを表す**ウェイト（重み）**を持たせます。肘の近くでは上腕と前腕の両方の影響を受けるようにすると、境目をつないで動かせます。[glTFのスキニング用属性](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skinned-mesh-attributes)

| 頂点の例 | 上腕Aの重み | 前腕Bの重み | この例の動き |
| --- | --- | --- | --- |
| 上腕の中央 | 1.0 | 0.0 | 上腕側の変換に従う。 |
| 肘の近く | 0.4 | 0.6 | 二つの変換による位置を混ぜる。 |
| 手首側 | 0.0 | 1.0 | 前腕側の変換に従う。 |

**線形ブレンドスキニング**では、各ジョイントの変換で得られる頂点位置を重み付きで混ぜます。例えば、同じ頂点がAの変換では`(2, 0)`、Bの変換では`(2, 1)`へ来る説明用の2次元例なら、重み0.4と0.6で結果は`(2, 0.6)`です。実際の3Dでは基準の変換や法線の扱いも含めて計算します。[glTFの線形ブレンドスキニング](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skinned-mesh-attributes)

## FKとIKは、姿勢を決める方法

**FK（順運動学）**では、肩や肘の角度などを決め、親子の変換から手の位置を求めます。**IK（逆運動学）**では、「手をこの位置へ持っていく」という目標から、関節の向きを求めます。足を地面へ合わせる、手を取っ手へ合わせる、といった用途があります。到達できる範囲や関節の制約も設定に関わります。[UnityのFKとIK](https://docs.unity3d.com/6000.0/Documentation/Manual/InverseKinematics.html)

キーで作った姿勢を再生した後にIKで足元を調整するなど、複数の方法を組み合わせられます。Unityの標準Humanoid IKなど、利用できる機能にはリグの種類や設定の条件があります。制作ツールのリグを取り込むときは、書き出される骨格やアニメーションの内容も確認します。[UnityのHumanoid IKの条件](https://docs.unity3d.com/6000.0/Documentation/Manual/InverseKinematics.html)

## 骨につけた物と、変形する表面

手の子に剣のオブジェクトを付ければ、手の動きに剣を追従させられます。剣全体を一つのまとまりとして動かす構成と、腕の頂点を複数の骨で変形する構成は、別々に用意できます。[glTFのジョイントに付くノード](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#joint-hierarchy) · [シーンと親子関係](/game/basics/scenes-and-components.html)

物理シミュレーションや当たり判定に使う形は、[コライダーとRigidbody](/game/basics/collisions-and-physics.html)で確認できます。姿勢を時間に沿って再生する仕組みは[キーフレームとアニメーション](/graphics/basics/keyframes-and-animation.html)へ進みます。

## 変形した形を確認する

曲げたときの形を確認するときは、骨格の姿勢、影響する骨の番号、頂点のウェイトを順に見ます。基準姿勢では自然に見えても、肘を大きく曲げると境目がつぶれる場合があるため、ゲームで使う姿勢の範囲を試します。
