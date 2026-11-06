---
title: Web Audioで遅延とコムフィルターを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-comb-observation
  order: 1
  summary: 同じ音を直接通す経路と少し遅らせる経路に分け、遅延時間とゲインを変えて周波数応答と音色を比べる。
  aliases: [Web Audio API, コムフィルター, comb filter, DelayNode, 位相差, ノッチ, インパルス応答, 周波数応答]
  verification: Windowsのブラウザで遅延とゲインによる測定値の変化、両方の試聴の終了を確認（2026-11-06）
---

# Web Audioで遅延とコムフィルターを観察する

同じ音を直接通す経路と、少し遅らせる経路に分けて足します。遅延時間を変えると谷の位置が変わり、遅延側のゲインを変えると谷の深さが変わります。[仕組みと計算式を読む](/browser/audio-comb-filter.html)

<p><a href="/study/samples/browser/audio-comb-observation/index.html" target="_blank" rel="noopener noreferrer">コムフィルターの実験を新しいタブで開く</a></p>

## 遅延時間とゲインを変える

設定を変えるたびに「グラフを計算」を押します。

1. 遅延時間を **2 ms**、遅延側の相対ゲインを **1** にして測定します。48,000 Hzでは2 msは96サンプルです。インパルス応答の0番と96番に振幅0.5が現れ、最初の谷は **250 Hz** です。
2. 遅延を2 msのままにして、相対ゲインを **0.5** に変えて測定します。最初の谷の位置は同じで、約 **−9.54 dB** まで浅くなります。直接経路の振幅は `2/3`、遅延経路は `1/3` です。
3. 相対ゲインを **1** に戻し、遅延を **5 ms** にして測定します。最初の谷は **100 Hz** に移ります。相対ゲインを **0** にして測ると、遅延経路が鳴らないので谷が消えます。

| 遅延時間 | 遅延サンプル数 | 最初に半周期ずれる周波数 |
| ---: | ---: | ---: |
| 1 ms | 48 | 500 Hz |
| 2 ms | 96 | 250 Hz |
| 5 ms | 240 | 100 Hz |
| 10 ms | 480 | 50 Hz |

直接音と合成音は、同じ乱数列から作ったノイズで聴き比べられます。遅延時間を変えて、どの設定で音色の変化を聞き分けやすいか試してください。

## ブラウザが作った出力から応答を求める

先頭の1サンプルが1で、残りが0の信号を `OfflineAudioContext` で処理します。直接経路には `1/(1+g)`、`DelayNode` を通る経路には `g/(1+g)` のゲインを掛けます。ゲインの合計が1なので、二つの波が同じ位相で重なる周波数では振幅比が1（0 dB）になります。[W3C Web Audio APIのDelayNode](https://www.w3.org/TR/webaudio-1.1/#DelayNode)、[OfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)

レンダリングしたインパルス応答から、0〜2,000 Hzの振幅比を5 Hz刻みで求めます。グラフの下限は −60 dB です。相対ゲイン1の谷は理論上ゼロになり、丸めによる小さな値も下端に描かれます。下端はグラフの表示範囲を示します。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-comb-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-comb-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-comb-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-comb-observation/comb-engine.js" download>comb-engine.js</a>
- <a href="/study/samples/browser/audio-comb-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4193/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4193 --bind 127.0.0.1
```

## コード

### 二つの経路をつなぎ、インパルス応答を測る

<<< @/public/samples/browser/audio-comb-observation/comb-engine.js{js}

### 遅延と相対ゲインを受け取り、測定結果を表示する

<<< @/public/samples/browser/audio-comb-observation/main.js{js}
