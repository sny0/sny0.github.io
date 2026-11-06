---
title: Web Audioの音の定位と距離減衰
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 音源と聞き手の相対位置から方位角と距離を求め、左右の振幅と距離による音量の変化を計算する。
  aliases: [Web Audio API, PannerNode, AudioListener, StereoPannerNode, 音の定位, 立体音響, 距離減衰, 方位角, equalpower, 等電力パンニング, HRTF, HRIR]
  verification: W3C Web Audio APIのPannerNodeと空間化の計算手順に照合（2026-11-06）
---

# Web Audioの音の定位と距離減衰

ゲームで右前方の敵が足音を立てたとき、音を右寄りにし、遠くにいれば小さくすると、姿が見えなくても方向と距離の手がかりになります。Web Audioの `PannerNode` は、聞き手に対する音源の位置から左右2チャンネルの出力を作ります。ここではモノラルの音源に、左右の振幅を決める**等電力パンニング**と、離れるほど音を小さくする**距離減衰**を適用します。[W3C Web Audio APIのPannerNode](https://www.w3.org/TR/webaudio/#PannerNode)

## 聞き手から見た方向と距離を求める

音源の位置は `PannerNode` の `positionX`、`positionY`、`positionZ` で指定します。聞き手を表す `AudioListener` は、位置と向きを持ちます。初期状態では聞き手が原点にいて、前が **−Z**、上が **+Y**、右が **+X** です。聞き手が回転すると、同じ位置の音源でも聞き手から見た方向は変わります。[W3C Web Audio APIのAudioListener](https://www.w3.org/TR/webaudio/#AudioListener)

音源の位置から聞き手の位置を引くと、聞き手から音源へ向かうベクトルが得られます。その長さ `d` が距離です。ベクトルを聞き手の水平面に投影し、前から測った角度を**方位角**と呼びます。前が0°、右が+90°、左が−90°です。同じ方位角のまま音源を遠ざけると、角度を変えずに距離だけを変えられます。[W3C Web Audio APIの方位角と仰角](https://www.w3.org/TR/webaudio/#azimuth-elevation)

<figure class="study-figure">
  <img src="/images/browser/audio-spatial-coordinates.svg" alt="聞き手を上から見た図。前はマイナスZ、右はプラスX。右前の音源への線の長さが距離d、前からその線までの角度が方位角a。" width="760" height="416" loading="lazy">
  <figcaption>聞き手と音源が同じ高さにある例です。上方向の+Yは画面の手前を向きます。<a href="/study/images/browser/audio-spatial-coordinates.svg" target="_blank" rel="noopener noreferrer">座標と方位角の図を拡大</a></figcaption>
</figure>

聞き手を原点に固定し、音源を同じ高さに置くと、距離 `d` と方位角 `a` から音源の座標を求められます。三角関数には度で表した `a` をラジアンに直して渡します。

```text
x = d × sin(a × π / 180)
y = 0
z = −d × cos(a × π / 180)
```

## 左右の振幅を等電力で分ける

`panningModel` を `"equalpower"` にし、モノラルの入力を与えます。前半分の方位角 `a`（−90°〜+90°）から `θ = (a + 90) × π / 360` を求めると、距離減衰を掛ける前の左右の振幅比は `cos(θ)` と `sin(θ)` です。正面では左右とも約0.707、真横では音源がある側が1で反対側が0になります。左右の振幅比の二乗を足すと、どの角度でも1です。ここでの「等電力」はこの二乗和を指します。聞こえ方は再生機器や周囲の環境にも左右されます。[W3C Web Audio APIの等電力パンニング](https://www.w3.org/TR/webaudio/#Spatialization-equal-power-panning)

## 距離のゲインを両方に掛ける

`distanceModel` を `"inverse"`、基準距離 `refDistance` と減衰の強さ `rolloffFactor` をともに1とします。音源はどの向きにも同じ強さで音を出す設定です。距離が1以下ならゲインは1です。1より遠くでは `g = 1 / d` になり、距離2で0.5、距離4で0.25になります。この `g` を左右の振幅比に同じように掛けるため、向きが同じなら左右の比を保ったまま両方が小さくなります。この設定では距離が1以上の範囲で2倍になるたび、振幅が半分になり、約6.02 dB下がります。[W3C Web Audio APIの距離モデル](https://www.w3.org/TR/webaudio/#enumdef-distancemodeltype)

<figure class="study-figure">
  <img src="/images/browser/audio-spatial-gains.svg" alt="左の図では方位角に応じて左の振幅比が1から0に下がり、右が0から1に上がる。正面では両方とも約0.707。右の図では距離1まではゲイン1で、距離2では0.5、距離4では0.25、距離8では0.125。" width="760" height="412" loading="lazy">
  <figcaption>方位角から左右への配分を決め、距離に応じた同じゲインを両方に掛けます。<a href="/study/images/browser/audio-spatial-gains.svg" target="_blank" rel="noopener noreferrer">振幅比と距離ゲインの図を拡大</a></figcaption>
</figure>

例えば右前45°、距離2では、距離ゲインを掛けた出力の振幅比は左が約0.191、右が約0.462です。左右それぞれの出力の実効値（RMS）を入力の実効値で割って `L`、`R` とすると、`√(L² + R²)` は約0.5です。この指標で、左右への振り分けと両方に共通する距離減衰を分けて確認できます。

## 左右の配分から方向ごとの耳への届き方へ

`equalpower` は後方の方位角を前方側に折り返して計算し、仰角を使いません。例えば同じ距離で正面と真後ろに置いた音源は、左右への配分が同じです。方向によって左右の耳に音が届く時刻や周波数ごとの強さが変わる効果も加えるなら、`panningModel` に `"HRTF"` を使えます。HRTFは頭や耳の形による方向ごとの伝わり方を表し、実装ではその時間領域の応答であるHRIRを左右の耳ごとに畳み込みます。[W3C Web Audio APIのHRTFパンニング](https://www.w3.org/TR/webaudio/#Spatialization-hrtf-panning)、[Web Audioの畳み込みリバーブ](/browser/audio-convolution-reverb.html)

画面のUI効果音のように、空間上の位置を与えず左右の配分だけを直接指定したい場合は、`StereoPannerNode` の `pan` を使えます。`pan` の範囲は−1〜1で、0が中央です。[W3C Web Audio APIのStereoPannerNode](https://www.w3.org/TR/webaudio/#StereoPannerNode)

## ゲームの座標と結び付ける

プレイヤーが見ている方向に音を合わせるなら、カメラの位置、前、上を聞き手に設定し、足音などの発生位置を音源に設定します。ゲーム側の前方向や座標の単位が異なる場合は、向きと位置を同じ基準で変換し、想定する距離で音量が落ちるように基準距離を調整します。壁越しの音を小さくしたりこもらせたりする場合は、ゲーム側で遮蔽を判定し、別のゲインやフィルターに反映します。[W3C Web Audio APIの空間化とパンニング](https://www.w3.org/TR/webaudio/#Spatialization)

実践では同じモノラル音を `OfflineAudioContext` の `PannerNode` に通し、左右の出力の実効値を測ります。距離を固定して角度を変え、次に角度を固定して距離を変えると、左右への配分と距離減衰を一つずつ確かめられます。[音の定位と距離減衰の実践](/practice/browser/audio-spatial-observation.html)

音源が近づいたり遠ざかったりすると、聞こえる音の高さも変わります。聞き手に向かう速度から、どれだけ音が高くなるかを計算できます。[Web Audioでドップラー効果を再現する](/browser/audio-doppler.html)

同じ距離でも、音源との間に壁があると音量と音色が変わります。直接経路に壁があるかを調べ、その結果をゲインとローパスに反映する例もあります。[Web Audioの音の遮蔽](/browser/audio-occlusion.html)
