---
title: Web Audioで壁越しの音量と音色を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-occlusion-observation
  order: 1
  summary: 聞き手との距離をそろえて音源を壁の横と向こうに置き、周波数ごとの減衰と音色の変化を観察する。
  aliases: [Web Audio API, 音の遮蔽, occlusion, レイキャスト, ローパス, lowpass, BiquadFilterNode, getFrequencyResponse, 周波数応答]
  verification: WindowsのChromium系ブラウザで全4設定の遮蔽判定、生成音の周波数成分、処理前後の試聴を確認（2026-11-06）
---

# Web Audioで壁越しの音量と音色を比べる

聞き手から同じ距離にある二つの音源位置を切り替えます。位置図は、聞き手と音源を結んだ線が壁に当たるかを示します。周波数応答のグラフで、音量を下げるだけの場合と、高音も弱める場合を比べられます。[遮蔽判定とローパスの仕組みを読む](/browser/audio-occlusion.html)

<p><a href="/study/samples/browser/audio-occlusion-observation/index.html" target="_blank" rel="noopener noreferrer">壁越しの音の実験を新しいタブで開く</a></p>

## 位置と処理を切り替える

設定を変えるたびに「測定する」を押します。

1. 音源を **壁の向こう** に置き、ゲインとローパスを適用します。250 Hzは約 **−6.04 dB**、4,000 Hzは約 **−30.50 dB** です。元の音と処理後の音を聴き比べます。
2. 位置を固定したまま、ゲインだけを適用します。250 Hzと4,000 Hzはともに約 **−6.02 dB** になります。音量が下がる効果と、高音が弱まって音色が変わる効果を聴き分けます。
3. 音源を **壁の横** に移します。聞き手からの距離は同じ6ですが、直接経路が壁を通らないので、ゲインは1になり、フィルターを通さなくなります。

| 位置と処理 | 250 Hz | 4,000 Hz |
| --- | ---: | ---: |
| 壁の横 | 0.00 dB | 0.00 dB |
| 壁の向こう、ゲイン0.5 | −6.02 dB | −6.02 dB |
| 壁の向こう、ゲイン0.5とローパス | −6.04 dB | −30.50 dB |

## グラフと試聴音を作る

聞き手を `(x, z) = (0, 0)` に置き、壁を `z = −2.5`、`−2 ≤ x ≤ 2` の線分で表します。音源は壁の横なら `(4.8, −3.6)`、壁の向こうなら `(0, −6)` です。聞き手と音源を結ぶ線分が `z = −2.5` に達する位置を求め、その `x` が壁の範囲に入るかを調べます。距離はどちらも6にそろえ、試聴はモノラルにします。

グラフでは、`BiquadFilterNode.getFrequencyResponse()` で求めたフィルターの振幅比に `GainNode` のゲインを掛け、入力を基準としたdBに換算します。ローパスのカットオフは1,000 Hzです。試聴用の音は48,000 Hzの `OfflineAudioContext` で元の音と処理後の音を作り、同じ割合で音量を抑えて再生します。[W3C Web Audio APIのBiquadFilterNode](https://www.w3.org/TR/webaudio/#BiquadFilterNode)、[GainNode](https://www.w3.org/TR/webaudio/#GainNode)

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-occlusion-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-occlusion-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-occlusion-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-occlusion-observation/occlusion-engine.js" download>occlusion-engine.js</a>
- <a href="/study/samples/browser/audio-occlusion-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4197/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4197 --bind 127.0.0.1
```

## コード

### 遮蔽を判定し、音と周波数応答を作る

<<< @/public/samples/browser/audio-occlusion-observation/occlusion-engine.js{js}

### 位置と周波数応答を描き、音を再生する

<<< @/public/samples/browser/audio-occlusion-observation/main.js{js}
