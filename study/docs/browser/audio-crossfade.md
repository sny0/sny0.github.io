---
title: Web Audioのクロスフェード — 等ゲイン・等電力・相関
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 二つの音源を重ねて切り替え、ゲインの和を一定にする方法と、二乗和を一定にする方法を比較する。音源同士の相関によって中点のRMSが変わる仕組みを確かめる。
  aliases: [Web Audio API, クロスフェード, crossfade, 等ゲイン, 等電力, equal gain, equal power, AudioParam, setValueCurveAtTime, RMS, 相関]
  verification: W3C Web Audio APIのAudioParamとDAFxのクロスフェード論文に照合（2026-11-06）
---

# Web Audioのクロスフェード — 等ゲイン・等電力・相関

**クロスフェード**は、音源Aのゲインを下げながら音源Bのゲインを上げ、両方の出力を足して切り替える処理です。BGMの切り替えや、ゲームの環境音を入れ替える場面では、二つの音が重なる区間のレベルも考えます。前回のフェードで一つの音を小さくした処理と、ミキシングで複数の音を足した処理を組み合わせます。[Web Audioのゲインオートメーション](/browser/audio-gain-automation.html)、[Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)

## 二つのゲイン曲線で切り替える

切り替えの開始を `u = 0`、終了を `u = 1` とします。AとBの同じフレームの値を `a`、`b`、その時刻のゲインを `gA`、`gB` とすると、合成後の値は `y = gA × a + gB × b` です。Web Audioでは、二つの音源を別々の `GainNode` に通し、後段の同じ入力へつなぐと足し合わせられます。[W3C Web Audio APIのGainNode](https://www.w3.org/TR/webaudio-1.1/#GainNode)、[チャンネルのミキシング](https://www.w3.org/TR/webaudio-1.1/#channel-up-mixing-and-down-mixing)

| 方法 | Aのゲイン | Bのゲイン | 一定に保つ値 | 中点の各ゲイン |
| --- | --- | --- | --- | ---: |
| 等ゲイン（線形） | `1 − u` | `u` | `gA + gB = 1` | `0.50` |
| 等電力 | `cos(πu / 2)` | `sin(πu / 2)` | `gA² + gB² = 1` | 約 `0.707` |

どちらも始点ではAだけが鳴り、終点ではBだけが鳴ります。中点では、等電力のほうが両方のゲインを高く保ちます。

<figure class="study-figure">
  <img src="/images/browser/audio-crossfade-curves.svg" alt="進行度0から1までのゲインを比べる。等ゲインではAとBの直線が中点の0.50で交差する。等電力では余弦と正弦の曲線が中点の約0.707で交差する。どちらも開始時はAが1でBが0、終了時はAが0でBが1。" width="760" height="870" loading="lazy">
  <figcaption>線形ではゲインの和が1、等電力ではゲインの二乗和が1です。<a href="/study/images/browser/audio-crossfade-curves.svg" target="_blank" rel="noopener noreferrer">二つのゲイン曲線を拡大</a></figcaption>
</figure>

## 音源同士の相関で中点のレベルが変わる

ゲインを固定して短い区間を測るとき、入力の平均二乗値を `PA = mean(a²)`、`PB = mean(b²)` とします。合成後の平均二乗値 `Pout` には、AとBを同じフレームで掛けた項も入ります。平均を除いた入力なら、`mean(a × b) = ρ × √(PA × PB)` と書けます。`ρ` は相関係数です。[Fink・Holters・Zölzerのクロスフェード論文](https://www.dafx.de/paper-archive/details/gUO-U6xEDk0Z_m4S-PivJQ)

```text
Pout = gA² × PA + gB² × PB + 2 × gA × gB × mean(a × b)
RMS  = √Pout
```

同じ強さで相関が0の入力では、最後の項が0になります。そこで等電力の曲線を使うと、ゲインの二乗和が1なので、出力の平均二乗値は入力と同じになります。一方、同じ波形が同位相で重なると `a = b` になり、出力振幅は `gA + gB` 倍です。この場合は等ゲインで元の振幅を保ち、等電力では中点の振幅が `√2` 倍になります。複数の音が同じ向きに強く重なる区間では、ピークに余裕を持たせます。[Web Audioのミキシングとヘッドルーム](/browser/audio-mixing-and-headroom.html)

| 同じ強さの入力 | 等ゲインの中点 | 等電力の中点 |
| --- | ---: | ---: |
| 400 Hzと600 Hzの波形を周期がそろう窓で測る | 約 −3.01 dB | 0 dB |
| 同じ400 Hzの波形が同位相で重なる | 0 dB | 約 +3.01 dB |

ここでのdBは、片方だけが鳴っているときのRMSを基準にした `20 × log10(出力RMS / 基準RMS)` です。聞こえ方には周波数や再生環境も関わります。

<figure class="study-figure">
  <img src="/images/browser/audio-crossfade-correlation.svg" alt="入力の強さをそろえた理論値の比較。相関が0の場合、中点の等ゲインはマイナス3.01 dBで、等電力は0 dB。同じ波形が同位相で重なる場合、等ゲインは0 dBで、等電力はプラス3.01 dB。いずれも一方だけが鳴る始点と終点は0 dB。" width="760" height="870" loading="lazy">
  <figcaption>同じゲイン曲線でも、入力同士の重なり方で中点が下がる場合と上がる場合があります。<a href="/study/images/browser/audio-crossfade-correlation.svg" target="_blank" rel="noopener noreferrer">相関によるレベルの違いを拡大</a></figcaption>
</figure>

## ブラウザで音の切り替えを測る

実践では、48,000 Hzで1秒の音を用意します。ピーク振幅はどちらも `0.35` です。Aは400 Hzで、Bは600 HzまたはAと同じ波形です。200〜800 msでAからBへ切り替えます。ゲインの値を並べた配列を `AudioParam.setValueCurveAtTime()` に渡すと、ブラウザが指定区間で隣り合う値を線形に補間します。[W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio-1.1/#AudioParam)、[OfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)

レンダリングした出力から、100 msを中心とする10 msのRMSを基準に、500 msを中心とする10 msのRMSを比べます。400 Hzと600 Hzはこの窓にそれぞれ4周期と6周期が収まるため、ゲインを固定した計算では二つの波形の積の平均が0になります。実践の窓内ではゲインも時間とともに動くので、表示する値は中点にゲインを固定した表の値に近い実測値です。[クロスフェードの実践](/practice/browser/audio-crossfade-observation.html)
