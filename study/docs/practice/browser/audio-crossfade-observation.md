---
title: Web Audioで線形と等電力のクロスフェードを比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-crossfade-observation
  order: 1
  summary: 周波数の異なる二つの音と、位相をそろえた同じ音を入れ替え、線形と等電力で実効値とピークがどう変わるかを確認する。
  aliases: [Web Audio API, AudioParam, setValueCurveAtTime, crossfade, クロスフェード, 等電力, RMS, 相関]
  verification: Windowsのブラウザで二つの音源条件の実効値とピーク、両方の試聴の終了を確認（2026-11-06）
---

# Web Audioで線形と等電力のクロスフェードを比べる

音源Aを下げながらBを上げ、1秒の音を作ります。画面の「等ゲイン（直線）」は、二つのゲインの和を1に保つ線形クロスフェードです。「等電力」はゲインの二乗和を1に保ちます。グラフは、レンダリングした出力の実効値（RMS）を10 msの区間ごとに求めたものです。[Web Audioのクロスフェード](/browser/audio-crossfade.html)

<p><a href="/study/samples/browser/audio-crossfade-observation/index.html" target="_blank" rel="noopener noreferrer">クロスフェードの実験を新しいタブで開く</a></p>

## 二つの音源の組み合わせを変える

音源Aは400 Hzの正弦波で、音源Bは600 Hzの正弦波、またはAと同じ位相の400 Hzです。どちらも48,000 Hzで生成し、ピーク振幅は0.35です。音源の組み合わせを選び、「波形を計算」を押します。

クロスフェードは200 msに始まり、800 msに終わります。切り替え前の95〜105 msの実効値を基準に、切り替えの中点を含む495〜505 msの実効値が何 dB 変化したかを表示します。

| 音源の組み合わせ | 線形クロスフェード | 等電力クロスフェード |
| --- | ---: | ---: |
| 400 Hzと600 Hz | 約 −3.01 dB | 約 0.00 dB |
| 同じ位相の400 Hz同士 | 約 0.00 dB | 約 +3.01 dB |

400 Hzと600 Hzでは、この測定区間で二つの波形の積がほぼ打ち消し合います。等電力では各音源のゲインを線形より大きく保つので、切り替え途中の実効値が下がりにくくなります。同じ位相の400 Hz同士では山と谷がそろい、等電力で足すと実効値もピークも大きくなります。[DAFxの相関とクロスフェードの論文](https://www.dafx.de/paper-archive/details/gUO-U6xEDk0Z_m4S-PivJQ)

## ゲインを予約し、出力を測る

`setValueCurveAtTime()` で音源AとBのゲインの変化を予約します。 `OfflineAudioContext` がミックスを作り、比較用の二つのチャンネルに線形と等電力の出力を記録します。中点付近の dB は、実際の出力から求めた二つの実効値を `20 × log10(中点付近のRMS / 切り替え前のRMS)` で比べた値です。測定区間の間もゲインが動くため、式に中点のゲインを代入した値とは少し異なります。ピークは1秒の全出力から求めます。[W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio-1.1/#AudioParam)、[OfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-crossfade-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-crossfade-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-crossfade-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-crossfade-observation/crossfade-engine.js" download>crossfade-engine.js</a>
- <a href="/study/samples/browser/audio-crossfade-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4192/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4192 --bind 127.0.0.1
```

## コード

### 二種類のゲインの変化を予約して出力を測る

<<< @/public/samples/browser/audio-crossfade-observation/crossfade-engine.js{js}

### 入力を受け取り、実効値の変化を表示する

<<< @/public/samples/browser/audio-crossfade-observation/main.js{js}
