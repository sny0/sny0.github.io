---
title: Web Audioでドップラー効果を再現する
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 動く音源から波の山が届く間隔を求め、近づくと音が高く、遠ざかると低く聞こえる変化をWeb Audioの再生速度で再現する。
  aliases: [Web Audio API, ドップラー効果, Doppler effect, 視線方向の速度, 音速, 周波数, AudioBufferSourceNode, playbackRate]
  verification: OpenStax University Physicsの移動音源の式とW3C Web Audio APIのAudioBufferSourceNodeおよびPannerNodeの仕様に照合（2026-11-06）
---

# Web Audioでドップラー効果を再現する

車が一定の音を出しながら近づくと高く聞こえ、遠ざかると低く聞こえます。音源が同じ間隔で波を出していても、動いている間は波を出す位置がずれ、聞き手に波が届く間隔が変わります。この変化が**ドップラー効果**です。ここでは風のない空気中で聞き手を固定し、音源が音速より遅い速さで動く場合を扱います。[OpenStaxのドップラー効果](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect)

## 波が届く間隔から周波数を求める

音源が周波数 `f` で鳴ると、波の山を `T = 1 / f` 秒ごとに出します。波面は山がある場所をつないだ面です。静止した空気では、どの波面も出たときの音源の位置を中心として音速 `c` で広がります。動く音源から出た波面は、山を出した位置が一つずつ異なります。進行方向では波面どうしが近づき、後ろでは間隔が広がります。[OpenStaxの移動音源の波面](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect)

<figure class="study-figure">
  <img src="/images/browser/audio-doppler-wavefronts.svg" alt="右へ進む音源を上から見る。各波面は発生時の音源の位置を中心とし、古い波面ほど大きい。右側の静止した聞き手に向かう波面は間隔が狭く、左側の聞き手に向かう波面は間隔が広い。" width="760" height="416" loading="lazy">
  <figcaption>丸は同じ時刻に見た複数の波面です。間隔の違いが見えるよう、図では音源の移動を大きく描いています。<a href="/study/images/browser/audio-doppler-wavefronts.svg" target="_blank" rel="noopener noreferrer">波面の図を拡大</a></figcaption>
</figure>

音源と聞き手を結ぶ直線上で、音源が聞き手に向かう速度を正の `v` とします。音源が次の山を出すまでの `T` 秒に、聞き手までの距離は `v × T` だけ縮まります。次の山が出るのは `T` 秒後ですが、届くまでにかかる時間は `v × T / c` 秒短くなります。聞き手に届く間隔を `T'`、聞こえる周波数を `f'` とすると、次の式になります。遠ざかるときは `v` が負になり、届く間隔が延びます。[OpenStaxの移動音源の式](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect)

```text
T' = T − v × T / c = T × (1 − v / c)
f' = 1 / T' = f × c / (c − v)
```

実践と同じく音速を343 m/s、音源の周波数を440 Hzとします。音源が40 m/sで近づくと約498.09 Hz、同じ速さで遠ざかると約394.05 Hzです。止まっていれば440 Hzのままです。

<figure class="study-figure">
  <img src="/images/browser/audio-doppler-speed.svg" alt="音速343 m/s、音源440 Hzでの理論値。聞き手に向かう速度がマイナス40 m/sでは394.05 Hz、ゼロでは440 Hz、プラス40 m/sでは498.09 Hzになる。" width="760" height="416" loading="lazy">
  <figcaption>横軸は聞き手に向かう速度です。左側は遠ざかる動き、右側は近づく動きを表します。<a href="/study/images/browser/audio-doppler-speed.svg" target="_blank" rel="noopener noreferrer">速度と周波数の図を拡大</a></figcaption>
</figure>

## ゲーム内の速度を再生速度に反映する

車が聞き手の前を横切る場面では、車の速度のうち、聞き手に向かう成分を使います。音源から聞き手に向かう単位ベクトルと音源の速度ベクトルの内積を取ると、この成分を求められます。進路上で聞き手に最も近い位置では、音源の速度はその方向と直交し、成分はゼロです。そこを過ぎると成分が負になります。ゲームでは音が出た時刻と届く時刻の差を省略し、そのときの位置と速度から周波数の変化を近似できます。[OpenStaxの進行方向と速度成分](https://openstax.org/books/physics/pages/14-3-doppler-effect-and-sonic-booms)

Web Audioでは、`AudioBufferSourceNode.playbackRate` に周波数の比 `f' / f` を渡します。1より大きいと元のサンプルを速く読み進め、1より小さいとゆっくり読み進めます。有限の音声素材を最後まで再生する場合は、音の高さと再生時間が一緒に変わります。エンジン音のループを鳴らす場合は、移動に合わせてこの値を更新できます。[W3C Web Audio APIのAudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode)

`PannerNode` は聞き手から見た方向と距離に応じて左右の出力を作ります。Web Audioでドップラー効果を加える場合は、音源側で再生速度を計算し、位置や向きはパンニングに渡します。例えば聞き手がその場で向きを変えると左右の定位は変わりますが、音源との位置関係から求める速度成分は同じです。[W3C Web Audio APIのPannerNode](https://www.w3.org/TR/webaudio/#PannerNode) · [Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)

## 波形と音の高さを比べる

実践では440 Hzの音を使い、音源が進む向きと速さを選んで、一定の再生速度で波形を作ります。近づく場合と遠ざかる場合を同じ時間幅で表示すると、波の山の間隔が短くなるほど周波数が高いことを確かめられます。[ドップラー効果の実践](/practice/browser/audio-doppler-observation.html)

音源が目の前を横切る間は、聞き手に向かう速度の成分が連続して変わります。位置と距離も同じ時刻から計算すると、音の高さと左右の移動を合わせられます。[Web Audioで音源の通過音を作る](/browser/audio-flyby.html)
