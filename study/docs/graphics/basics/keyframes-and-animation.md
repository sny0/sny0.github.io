---
title: キーフレームとアニメーションの基本 — 時間から値を決める
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 箱を動かす例から、時刻と値を記録するキーフレーム、補間、カーブ、クリップ、ループを説明する。描画のFPSや回転の補間との関係も調べる。
  aliases: [アニメーション, animation, キーフレーム, keyframe, トラック, チャンネル, 補間, animation curve, カーブ, クリップ, ループ, slerp]
  verification: Unity 6.0のアニメーションクリップ・カーブとKhronosのglTF 2.0アニメーション仕様に照合（2026-11-07）
---

# キーフレームとアニメーションの基本 — 時間から値を決める

箱を左から右へ動かすとき、各時刻での位置を決めれば、続けて表示して動きにできます。**アニメーション**は、位置、回転、形、色などを時間に応じて変える仕組みです。まず、箱のX位置だけを変える例から見ます。[Unityのアニメーションクリップ](https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationClips.html)

## どの時刻に、どの値にするかを記録する

**キーフレーム**は、ある時刻に置く値や姿勢を指定するものです。例えば「0秒でX位置0」「1秒でX位置2」という二つのキーを用意できます。位置、回転、色など、動かす対象の項目を**プロパティー**と呼びます。その項目の時間変化を、トラックやチャンネルにまとめて扱います。[Unityのカーブとキー](https://docs.unity3d.com/6000.0/Documentation/Manual/animeditor-AnimationCurves.html)

| クリップ内の時刻 | X位置 | この例での扱い |
| --- | --- | --- |
| 0秒 | 0 | 記録したキー。 |
| 0.5秒 | 1 | 二つのキーから線形補間で求めた値。 |
| 1秒 | 2 | 記録したキー。 |

キーの間を計算で埋めるのが**補間**です。**線形補間**では、時間の進み具合に比例して値を変えます。この例の0.5秒は区間の半分なので、X位置も0と2の中間の1になります。[glTFの時間と補間](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animations)

<figure class="study-figure">
  <img src="/images/graphics/keyframes-and-animation.svg" alt="0秒のX位置0と1秒のX位置2をキーとして記録する。線形補間では、その間の0.5秒でX位置1になる。グラフは横軸が時間、縦軸がX位置で、両端のキーを直線で結んでいる。" width="760" height="470" loading="lazy">
  <figcaption>中央は、キーの間を評価した位置です。<a href="/study/images/graphics/keyframes-and-animation.svg" target="_blank" rel="noopener noreferrer">キーと補間の図を拡大</a></figcaption>
</figure>

## カーブの形で、変化の速さも変わる

時間を横軸、値を縦軸に描いたものを**アニメーションカーブ**と呼びます。直線なら一定の割合で値が変わり、曲線にすると出だしをゆっくりにしたり、途中を速くしたりできます。キーの値が同じでも、間の計算方法が変われば動きが変わります。[Unityのアニメーションカーブ](https://docs.unity3d.com/6000.0/Documentation/Manual/animeditor-AnimationCurves.html)

例えばglTFには、次のキーまで値を保つ`STEP`、直線的に変える`LINEAR`、接線の情報も使う`CUBICSPLINE`があります。どの方法が使えるか、端の外側をどう扱うかは、ファイル形式や再生側の仕様で確認します。[glTFの補間モード](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animation-sampler-interpolation)

## クリップは、ひとまとまりの動き

**アニメーションクリップ**は、「歩く」「扉を開く」など、時間変化をまとめたデータです。一つのクリップに、複数のボーンの回転や、物体の位置など、複数の項目を含められます。ゲーム側は再生するクリップ、速度、開始時刻などを選び、現在の時刻に対応する値を使います。[Unityのクリップ](https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationClips.html)

**ループ再生**では、終端へ来た後に先頭へ戻して再生を続けます。歩行をなめらかにつなぐなら、終わりと始まりの姿勢や動く速さも確認します。箱をX位置0から2へ動かした例をそのまま戻せば、継ぎ目で位置が0へ戻ります。[Unityのループするクリップの設定](https://docs.unity3d.com/6000.0/Documentation/Manual/LoopingAnimationClips.html)

## タイムラインのフレーム番号と、描画のFPS

制作ツールでは、時間を**フレーム番号**でも表します。例えば開始をフレーム0、基準を毎秒30フレームとするタイムラインなら、フレーム15は0.5秒です。これは制作時の時刻の表し方です。ゲーム側で画像を何回描くかというFPSは、別に数えます。[UnityのAnimationウィンドウ](https://docs.unity3d.com/6000.0/Documentation/Manual/animeditor-UsingAnimationEditor.html) · [ゲームループと時間](/game/basics/game-loop-and-time.html)

キーが0秒と1秒にしかなくても、再生側は0.1秒や0.2秒など、必要な時刻で値を評価できます。glTFではキーの入力時刻を秒で記録します。[glTFのキーの時刻](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animation-sampler-input)

図を使って確かめるなら、0.25秒と0.75秒の値を求めます。この線形補間ではX位置はそれぞれ0.5と1.5です。次に、キー間を一定の値で保つ方式へ変えると、1秒に達する前はX位置0のままになります。

## 回転は、表現と補間の規則も見る

回転では、向きの表し方と、どちらへ回るかも関わります。例えば角度350度から10度へ回すとき、数値をそのまま直線でつなぐ場合と、短い経路で向きをつなぐ場合では動きが違います。glTFの回転は**クォータニオン**で記録し、線形モードの回転には球面線形補間（slerp）の使用が推奨されています。一周以上回したいときは、途中のキーなどで意図を表す必要があります。[glTFの回転の補間](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#interpolation-slerp) · [クォータニオンの詳解](/math/rendering/quaternion.html)

## 関連する仕組み

キャラクターの腕や脚を動かす仕組みは、[リグとスキニング](/graphics/basics/rigs-and-skinning.html)へ進みます。位置や回転の基準は、[座標変換とカメラ](/graphics/basics/transforms-and-cameras.html)で確認できます。
