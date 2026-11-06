---
title: Web Audioで扉が開くときの音の切り替えを比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-occlusion-transition-observation
  order: 1
  summary: 再生中にゲインとローパスのカットオフを変え、瞬時に切り替えた音と徐々に変えた音を聴き比べる。
  aliases: [Web Audio API, 遮蔽, occlusion, setTargetAtTime, setValueAtTime, 時定数, time constant, AudioParam]
  verification: WindowsのChromium系ブラウザで時定数20 msと60 msの実測ゲインと出力波形、二つの試聴を確認（2026-11-06）
---

# Web Audioで扉が開くときの音の切り替えを比べる

同じ音を流したまま、再生開始から **400 ms** で扉が開く場面を再現します。ゲインは **0.5 → 1**、ローパスのカットオフは **1,000 Hz → 8,000 Hz** に向かいます。二つの経路の目標値は共通で、値を変える速さが異なります。[処理の経路と時定数の解説](/browser/audio-occlusion-transition.html)

<p><a href="/study/samples/browser/audio-occlusion-transition-observation/index.html" target="_blank" rel="noopener noreferrer">扉が開く音の実験を新しいタブで開く</a></p>

## 時定数を変えて比べる

1. 時定数を **20 ms** にして「波形を計算」を押します。扉が開いた時刻を境に、瞬時に切り替える経路ではゲインが0.5から1に跳び、徐々に切り替える経路では0.5から上がり始めます。
2. 時定数を **60 ms** にして、もう一度計算します。ゲインが約0.816に達するまでの時間は、20 msから60 msに伸びます。どちらも開始時の値から目標までの差の約63.2%を進んだ地点です。
3. 切り替え前後の出力波形を拡大したグラフを見てから、二つの経路の音を聴き比べます。時定数20 msと60 msで、こもり方が戻る速さを比べてください。

| 時定数 | 約0.816に達する時刻 | 約0.975に達する時刻 |
| ---: | ---: | ---: |
| 20 ms | 開いた20 ms後 | 開いた60 ms後 |
| 60 ms | 開いた60 ms後 | 開いた180 ms後 |

## 制御値と出力を分けて測る

48,000 Hzの `OfflineAudioContext` に、同じ250 Hzと4,000 Hzを含む音を入れます。音声経路はローパス、ゲインの順です。瞬時の経路は `setValueAtTime()`、徐々に変える経路は `setTargetAtTime()` で両方の値を予約します。開いた状態でもローパスを通し、カットオフを8,000 Hzに近づけます。[W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio/#AudioParam)

ゲインの変化を測るため、別の経路に振幅1の一定の信号を流し、同じゲインの変化を予約します。出力のサンプル値が、その時刻のゲインになります。出力波形のグラフは音声経路を通った実測値なので、フィルターの状態と元の音の位相も反映されます。試聴では一定の信号を再生せず、二つの音声出力を同じ割合で小さくして再生します。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-occlusion-transition-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-occlusion-transition-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-occlusion-transition-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-occlusion-transition-observation/transition-engine.js" download>transition-engine.js</a>
- <a href="/study/samples/browser/audio-occlusion-transition-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4198/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4198 --bind 127.0.0.1
```

## コード

### 二つの切り替えを予約し、音声とゲインを測る

<<< @/public/samples/browser/audio-occlusion-transition-observation/transition-engine.js{js}

### グラフを描き、二つの出力を試聴する

<<< @/public/samples/browser/audio-occlusion-transition-observation/main.js{js}
