---
title: Web Audioでドップラー効果を聴き比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-doppler-observation
  order: 1
  summary: 音源の速さと進行方向を変え、基準の440 Hzと、聞き手に届く音の周波数を波形と試聴で比べる。
  aliases: [Web Audio API, ドップラー効果, Doppler effect, ドップラーシフト, playbackRate, AudioBufferSourceNode, ゼロ交差]
  verification: WindowsのChromium系ブラウザで全8設定の周波数と波形、基準音と移動時の音の試聴を確認（2026-11-06）
---

# Web Audioでドップラー効果を聴き比べる

聞き手は止まったまま、440 Hzを出す音源がまっすぐ近づく場合と遠ざかる場合を比べます。音速は343 m/sに固定し、基準の音と変化後の音を同じ長さのグラフに描きます。[波の間隔と周波数の関係を読む](/browser/audio-doppler.html)

<p><a href="/study/samples/browser/audio-doppler-observation/index.html" target="_blank" rel="noopener noreferrer">ドップラー効果の実験を新しいタブで開く</a></p>

## 速さと進行方向を変える

1. 進行方向を **近づく**、速さを **40 m/s** にして「測定する」を押します。周波数は約 **498.09 Hz** になり、同じ時間に含まれる波の数が基準の440 Hzより増えます。
2. 速さを保ったまま **遠ざかる** に変えて測定します。約 **394.05 Hz** になり、波の数が減ります。音量をそろえた試聴で高さの違いを比べます。
3. 速さを **0 m/s** にすると、どちらの進行方向を選んでいても440 Hzです。

| 速さ | 近づくときの理論値 | 遠ざかるときの理論値 |
| ---: | ---: | ---: |
| 0 m/s | 440.00 Hz | 440.00 Hz |
| 20 m/s | 467.24 Hz | 415.76 Hz |
| 40 m/s | 498.09 Hz | 394.05 Hz |
| 60 m/s | 533.29 Hz | 374.49 Hz |

## 再生速度を設定し、出力から周波数を測る

聞き手に向かう速度を正の `v` とすると、聞こえる周波数と元の周波数の比は `343 / (343 − v)` です。この比を `AudioBufferSourceNode.playbackRate` に指定し、基準と変化後の音を48,000 Hzの `OfflineAudioContext` で生成します。比較する出力は両方とも0.8秒です。[OpenStaxのドップラー効果の式](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect) · [W3C Web Audio APIのAudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode)

出力が負から正に変わる箇所を探し、前後のサンプル値から波形が0を横切る時刻を補間します。波の周期は同じ向きの交差が繰り返される間隔です。複数周期を数えて周波数を求め、再生速度を決めるときに使った式の値と比べます。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-doppler-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-doppler-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-doppler-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-doppler-observation/doppler-engine.js" download>doppler-engine.js</a>
- <a href="/study/samples/browser/audio-doppler-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4199/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4199 --bind 127.0.0.1
```

## コード

### 再生速度を変えて出力の周波数を測る

<<< @/public/samples/browser/audio-doppler-observation/doppler-engine.js{js}

### 波形を描き、二つの音を試聴する

<<< @/public/samples/browser/audio-doppler-observation/main.js{js}
