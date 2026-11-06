---
title: Web Audioでゲインとクリッピングを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-mixing-observation
  order: 1
  summary: 二つの音源と全体のゲインを調整し、加算後のピーク、振幅1を超えたフレーム数、ハードクリップ後の波形を比べる。
  aliases: [Web Audio API, GainNode, WaveShaperNode, オーディオミキサー, ミキシング, ゲイン, dBFS, ヘッドルーム, クリッピング]
  verification: Windowsのブラウザで両プリセット、片方の音源とマスターのミュート、ピークと超過フレーム数を確認（2026-11-06）
---

# Web Audioでゲインとクリッピングを観察する

同じ周波数と位相の音源を二つ重ねます。それぞれの信号のピークは0.65です。個別のゲインと合流後のマスターゲインを変えながら、波形の山や谷がどう変わるかを比べます。[Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)

<p><a href="/study/samples/browser/audio-mixing-observation/index.html" target="_blank" rel="noopener noreferrer">ミキシングの実験を新しいタブで開く</a></p>

## マスターゲインを変えて比べる

音源AとBは400 Hzの正弦波です。最初はすべてのゲインを1にして「ミックスを計算」を押します。次にマスターゲインを0.50にしてもう一度計算します。グラフには1秒分の出力から、先頭の240フレーム（5 ms、2周期）を表示します。

| A / B / マスターのゲイン | クリップ前のピーク | クリップ後のピーク | クリップ前に絶対値が1を超えたフレーム数 |
| --- | ---: | ---: | ---: |
| 1 / 1 / 1 | 1.30 | 1.00 | 21,600 |
| 1 / 1 / 0.50 | 0.65 | 0.65 | 0 |
| 1 / 0 / 1 | 0.65 | 0.65 | 0 |

最初の条件では、同じ向きに重なった山と谷の先が、ハードクリップで `+1` と `-1` にそろいます。二番目では、合流した信号をクリップに入れる前に半分にするので、山と谷の形が残ります。三番目もピークは0.65になります。この実験では音源が同じなので片方だけでも同じ波形になりますが、効果音とBGMなど異なる音源では、片方を消すとミックスの中身も変わります。

## 画面の数値がどこから来るか

`OfflineAudioContext` に、音源ごとの `GainNode` と合流先のマスターゲインをつなぎます。マスターの出力を二つに分け、一方をそのまま、もう一方を `WaveShaperNode` の出力として記録します。 `ChannelMergerNode` で比較用の二つのチャンネルにまとめ、出力された浮動小数点の値から、波形、絶対値のピーク、しきい値を超えた数を計算します。[W3C Web Audio APIのGainNode](https://www.w3.org/TR/webaudio-1.1/#GainNode)、[WaveShaperNode](https://www.w3.org/TR/webaudio-1.1/#WaveShaperNode)、[ChannelMergerNode](https://www.w3.org/TR/webaudio-1.1/#ChannelMergerNode)

クリップのしきい値はこの実験で明示した `±1` です。比較用の出力は、音声機器へ送る前の `AudioBuffer` に記録します。1秒の全48,000フレームを集計するので、グラフに見えている範囲より大きい数が表示されます。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-mixing-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-mixing-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-mixing-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-mixing-observation/mix-engine.js" download>mix-engine.js</a>
- <a href="/study/samples/browser/audio-mixing-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4190/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4190 --bind 127.0.0.1
```

## コード

### ミックスをレンダリングしてピークを数える

<<< @/public/samples/browser/audio-mixing-observation/mix-engine.js{js}

### 設定を受け取り、比較結果を表示する

<<< @/public/samples/browser/audio-mixing-observation/main.js{js}
