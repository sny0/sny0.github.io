---
title: Web Audioで音の方向と距離を変えて聴く
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-spatial-observation
  order: 1
  summary: 音源の角度と距離を変え、PannerNodeが処理した左右の出力を図と試聴で比べる。
  aliases: [Web Audio API, 音の定位, パンニング, 距離減衰, PannerNode, AudioListener, 等電力, 方位角, spatial audio]
  verification: WindowsのChromium系ブラウザで方位角と距離の全25設定、測定した音の試聴を確認（2026-11-06）
---

# Web Audioで音の方向と距離を変えて聴く

聞き手を原点に置き、前を向いたまま音源の方位角と距離を変えます。上から見た位置の図と、モノラルの入力からブラウザが作った左右の出力を比べられます。試聴するときは、左右を分けて聞ける機器を使うと配分の違いが分かりやすくなります。[座標とゲインの式を読む](/browser/audio-spatial-panning.html)

<p><a href="/study/samples/browser/audio-spatial-observation/index.html" target="_blank" rel="noopener noreferrer">音の方向と距離の実験を新しいタブで開く</a></p>

## 方位角と距離を別々に変える

設定を変えるたびに「測定する」を押します。

1. 方位角を **0°**、距離を **1** にします。音源は真正面にあり、左右の出力は同じです。左右それぞれの振幅は入力の約0.707倍です。
2. 距離を1のまま、方位角を **−90°** から **+90°** に変えます。左だけに出ていた音が右だけに移り、左右を合わせた出力の指標は同じままです。
3. 方位角を **+45°** にして距離を **1 → 2 → 4** と変えます。右に多く出る比率は保たれます。距離を倍にするたびに左右の振幅は半分になり、合成ゲインは約6.02 dBずつ下がります。
4. 距離を **0.5** と **1** で比べます。今回の設定では、基準距離1より近い範囲の距離ゲインは1です。

| 方位角 | 距離 | 左のゲイン | 右のゲイン | 左右の合成ゲイン |
| ---: | ---: | ---: | ---: | ---: |
| 0° | 1 | 0.707 | 0.707 | 1.000 |
| −90° | 1 | 1.000 | 0.000 | 1.000 |
| +90° | 1 | 0.000 | 1.000 | 1.000 |
| +45° | 2 | 0.191 | 0.462 | 0.500 |

## 左右の出力からゲインを測る

48,000 Hzの `OfflineAudioContext` で短いモノラル音を `PannerNode` に通します。パンニングには `equalpower`、距離減衰には `inverse` を指定し、`refDistance` と `rolloffFactor` はともに1にします。距離は座標の単位で表します。[W3C Web Audio APIのPannerNode](https://www.w3.org/TR/webaudio/#PannerNode)

左右の実効値（RMS）をそれぞれ入力の実効値で割り、左右のゲインを求めます。左右の合成ゲインは二つのゲインを二乗して足し、平方根を取った値です。合成ゲインを1と比較したdB値は `20 × log10(合成ゲイン)` で求めます。試聴には測定した左右の出力を使い、両方を同じ割合で小さくして再生します。[W3C Web Audio APIの等電力パンニング](https://www.w3.org/TR/webaudio/#Spatialization-equal-power-panning)

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-spatial-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-spatial-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-spatial-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-spatial-observation/spatial-engine.js" download>spatial-engine.js</a>
- <a href="/study/samples/browser/audio-spatial-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4196/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4196 --bind 127.0.0.1
```

## コード

### 座標を設定し、左右の実効値を測る

<<< @/public/samples/browser/audio-spatial-observation/spatial-engine.js{js}

### 位置と左右のゲインを描き、測定音を再生する

<<< @/public/samples/browser/audio-spatial-observation/main.js{js}
