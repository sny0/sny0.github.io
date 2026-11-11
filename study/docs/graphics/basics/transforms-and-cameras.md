---
title: 座標変換とカメラの基本 — モデルの位置が画面に映るまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 物体を移動・回転・拡縮する操作から、ローカル、ワールド、ビュー、投影、画面座標の意味を説明する。透視投影と正投影、座標規約の違いも比べる。
  aliases: [座標変換, transform, ローカル座標, モデル座標, ワールド座標, ビュー座標, カメラ座標, 投影, 透視投影, 正投影, FOV, 視野角, クリッピング]
  verification: Microsoftの座標変換、UnityのTransformとCamera、KhronosのglTFの座標・カメラ仕様に照合（2026-11-07）
---

# 座標変換とカメラの基本 — モデルの位置が画面に映るまで

箱の形を用意したあとも、ゲームの中で床に置く、横へ移す、斜めに回すといった操作が必要です。どこから眺めるかによって画面での見え方も変わります。物体の配置からカメラで映すまで、座標が何を基準にするかを順に追います。[モデルとメッシュ](/graphics/basics/models-and-meshes.html)

## 座標は、基準と数値を組み合わせて読む

**座標**は、基準点である**原点**と、向きを定める軸を使って位置を表す値です。3Dでは通常`(x, y, z)`の三つを使います。同じ`(1, 0, 0)`でも、「箱の中心から測るか」「ステージの原点から測るか」で示す場所が変わります。[Microsoftのモデル空間とワールド空間](https://learn.microsoft.com/en-us/windows/win32/direct3d9/transforms)

| 座標の段階 | 基準と用途 |
| --- | --- |
| **ローカル・モデル座標** | そのメッシュや物体の基準から、形や配置を表す。 |
| **ワールド座標** | シーン全体で共有する基準に、物体やカメラを配置する。 |
| **ビュー・カメラ座標** | カメラを基準に、どの方向・距離にあるかを表す。 |
| **投影後の座標** | カメラの投影設定を使い、画面に対応する位置を計算する途中の値。 |
| **スクリーン座標** | 描画先の幅と高さに対応する位置。ピクセル単位などで扱う。 |

**座標変換**は、ある基準で表した値を、別の基準での値へ移す計算です。一般的な描画では、投影後に表示範囲で切り取り、透視除算などを経て、描画先へ配置します。各段階の詳しい数式は[行列と変換](/math/rendering/transform.html)で扱います。[Microsoftの変換の流れ](https://learn.microsoft.com/en-us/windows/win32/direct3d9/transforms)

## 移動、回転、拡大縮小

**移動**は位置をずらし、**回転**は基準となる向きを変え、**拡大縮小**は軸ごとの大きさを変えます。これらをまとめて**トランスフォーム**と呼びます。UnityのTransformも、位置、回転、拡縮と親子関係を持ちます。[UnityのTransform](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Transform.html)

例えば、メッシュ内の頂点が`(1, 0, 0)`で、物体をX方向に`3`だけ移動し、回転も拡縮もしなければ、その頂点のワールド位置は`(4, 0, 0)`です。メッシュ内の形とシーン内の配置を別々に持つと、同じ形を何か所にも置けます。

親子関係のある物体では、子の配置は親を基準にして表せます。親を動かすと子のワールド上の位置も変わります。複数の変換は順序で結果が変わるため、どの基準で、どの順に操作するかを確認します。[Unityの親子関係](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Transform.html) · [シーンとコンポーネント](/game/basics/scenes-and-components.html)

<figure class="study-figure">
  <img src="/images/graphics/transforms-and-cameras.svg" alt="モデル内の位置をワールドへ配置し、カメラ基準に変換して、投影と画面への配置を行う。画面で見える大きさの概念比較では、透視投影は同じ大きさでも遠い箱が小さく、正投影は距離で大きさが変わらない。" width="760" height="500" loading="lazy">
  <figcaption>上は位置を扱う基準、下は同じ大きさの物体の投影の比較です。<a href="/study/images/graphics/transforms-and-cameras.svg" target="_blank" rel="noopener noreferrer">座標と投影の図を拡大</a></figcaption>
</figure>

## カメラは、どこから何を見るかを決める

**カメラ**は、位置と向き、見える範囲、投影方法などを持ち、描画する視点を決めます。ビュー変換では、世界の位置をカメラ基準に表し直します。カメラを右へ動かせば、動いていない物体でも画面上の位置は変わります。[Khronosのカメラとビュー行列](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#cameras)

**透視投影**は、遠い物体ほど小さく映す方式です。見える角度を表す**視野角（FOV）**を変えると、一度に映る範囲が変わります。カメラの位置を変える操作と、視野角を変える操作は、別の設定です。[UnityのCameraと投影の設定](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Camera.html)

**正投影**では、カメラからの距離による大きさの変化を付けずに投影します。同じ向き・同じ大きさの物体は、距離だけが違っても同じ大きさに映ります。2Dゲームや設計図のような表示にも使えます。物体の重なりや描画範囲の判定は、この場合も扱います。[Khronosの正投影](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#cameras) · [Unityの正投影設定](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Camera.html)

## カメラに向いていても映らない場合

カメラには、どこからどこまでを描くかという範囲があります。**近クリップ面**と**遠クリップ面**は、カメラからの奥行きの範囲を定める境界です。左右上下の範囲も合わせた外側にある部分は切り取られます。物体が消えるときは、位置と大きさに加え、カメラの向きや表示範囲も確認します。[Unityのクリップ面](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Camera.html) · [カメラと射影の詳解](/math/rendering/camera.html)

## ツールごとの座標の約束を確認する

上向きの軸、正面の方向、長さの単位、画面の原点、奥行きの範囲などは、ファイル形式やエンジン、APIの約束に従います。例えばglTFは右手系、上方向を`+Y`、距離の単位をメートルと定めています。読み込む側は、自分の座標の約束へ合わせて変換します。[Khronosの座標と単位](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units)

頂点の位置が画面の色へ変わる続きは、[光とレンダリングの基本](/graphics/basics/light-and-rendered-images.html)と[レンダリングパイプライン](/graphics/pipeline/overview.html)へ進みます。
