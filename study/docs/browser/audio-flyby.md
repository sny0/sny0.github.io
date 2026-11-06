---
title: Web Audioで音源の通過音を作る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 聞き手の前を音源が通過するとき、軌道から位置、距離、聞き手に向かう速度を求め、音の左右の位置と大きさ、高さを変える。
  aliases: [Web Audio API, 通過音, フライバイ, flyby, ドップラー効果, 視線方向の速度, 距離減衰, PannerNode, AudioBufferSourceNode, playbackRate, setValueCurveAtTime]
  verification: OpenStaxの移動音源の式とW3C Web Audio APIの再生速度、パンニング、距離モデルの仕様に照合（2026-11-06）
---

# Web Audioで音源の通過音を作る

車が左から右へ通過するとき、接近中は左寄りで高く聞こえ、正面を通るときに音が大きくなり、遠ざかると右寄りで低く聞こえます。音源の軌道を一つ決めると、同じ時刻の位置から左右の配分と距離による減衰を、聞き手に向かう速度から音の高さを求められます。[音の定位と距離減衰](/browser/audio-spatial-panning.html) · [ドップラー効果](/browser/audio-doppler.html)

## 音源の位置と聞き手までの距離

聞き手は原点に止まり、前方の `−Z` を向きます。音源は聞き手の `b` メートル前にある直線を、速度 `v` で左から右へ進みます。正面を通る時刻を `t = 0` とすると、音源の位置は `(x, y, z) = (v × t, 0, −b)` です。聞き手と音源の距離 `d` は、この位置を直角三角形の斜辺として求められます。

```text
x = v × t
d = √(x² + b²)
```

<figure class="study-figure">
  <img src="/images/browser/audio-flyby-trajectory.svg" alt="聞き手を原点に置き、音源が前方10 mの直線を左から右へ進む。40 m/sの例では、時刻マイナス0.5秒で左20 m、0秒で正面、プラス0.5秒で右20 mにあり、正面が最も近い。" width="760" height="416" loading="lazy">
  <figcaption>同じ速度で進んでいても、音源と聞き手を結ぶ線の向きと長さは時刻によって変わります。<a href="/study/images/browser/audio-flyby-trajectory.svg" target="_blank" rel="noopener noreferrer">音源の軌道を拡大</a></figcaption>
</figure>

## 速度を聞き手の方向に投影する

この例では、音源の速度ベクトルは `(v, 0, 0)`、音源から聞き手を向く単位ベクトルは `(−x / d, 0, b / d)` です。両者の内積 `u = −v × x / d` が、聞き手に向かう速度です。接近中は `u > 0`、正面では速度と聞き手の方向が直交するので `u = 0`、通過後は `u < 0` になります。音源の速さ `v` は全区間で一定です。[OpenStaxの音源の速度成分とドップラー効果](https://openstax.org/books/physics/pages/14-3-doppler-effect-and-sonic-booms)

音速を343 m/s、元の音を440 Hzとすると、再生速度の倍率は `343 / (343 − u)`、その時刻の予測周波数は `440 × 343 / (343 − u)` です。この例ではゲーム内の現在位置を使って高さを計算します。物理的な到達時刻まで求める場合は、音を出した位置から聞き手までの伝播時間も加わります。[ドップラー効果](/browser/audio-doppler.html) · [W3C Web Audio APIのAudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode)

## 位置で左右と音量を変える

音源の位置を `PannerNode` に渡すと、モノラル音を聞き手から見た方向に応じて左右に配分できます。実践は `panningModel = "equalpower"` を使い、音源が正面を通る瞬間の左右の振幅は等しくなります。距離によるゲインには `distanceModel = "inverse"`、`refDistance = 5`、`rolloffFactor = 1` を使います。この例では常に `d ≥ 5` なので、距離ゲインは `5 / d` です。左右の各チャンネルに同じ距離ゲインが掛かります。[W3C Web Audio APIのPannerNode](https://www.w3.org/TR/webaudio/#PannerNode)

| 正面を通る時刻からの差 | 音源の位置 `x` | 距離 | 予測周波数 | 距離ゲイン |
| ---: | ---: | ---: | ---: | ---: |
| −0.5 秒 | −20 m | 22.36 m | 491.24 Hz | 0.224 |
| 0 秒 | 0 m | 10 m | 440.00 Hz | 0.500 |
| +0.5 秒 | +20 m | 22.36 m | 398.44 Hz | 0.224 |

<figure class="study-figure">
  <img src="/images/browser/audio-flyby-curves.svg" alt="音源が40 m/sで最短距離10 mの直線を通過する。上のグラフでは周波数が接近中の高い値から正面の440 Hzを通り、通過後の低い値へ変わる。下のグラフでは距離ゲインが正面で最大の0.5になる。" width="760" height="416" loading="lazy">
  <figcaption>距離が同じ時刻では距離ゲインも同じです。聞き手に向かう速度は符号が変わるので、予測周波数は異なります。<a href="/study/images/browser/audio-flyby-curves.svg" target="_blank" rel="noopener noreferrer">周波数と距離ゲインの図を拡大</a></figcaption>
</figure>

## 音声と表示で同じ時刻を使う

実践では正面を通る前後1秒ずつを、2秒の `OfflineAudioContext` に対応させます。音声の開始が `t = −1`、開始から1秒が `t = 0` です。位置は `PannerNode.positionX` に直線の動きとして予約し、再生速度は各時刻の軌道から計算した倍率の配列を `setValueCurveAtTime()` に渡します。配列内の値は指定した時間幅に配置され、間は補間されます。`playbackRate` は処理ブロックごとに値を読む k-rate のパラメーターです。[W3C Web Audio APIのsetValueCurveAtTime](https://www.w3.org/TR/webaudio/#dom-audioparam-setvaluecurveattime) · [AudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode)

実践では、速さと最短距離を選んで通過音を作ります。再生中の位置とグラフを見ながら、音が左から右へ移り、高さが変わる様子を聴けます。表示する予測値は各時刻の軌道から求めます。実測では時刻を中心とする20 msの区間を使い、パンニング前の波形から周波数を、パンニング後の波形から左右の振幅を求めます。[通過音の実践](/practice/browser/audio-flyby-observation.html)
