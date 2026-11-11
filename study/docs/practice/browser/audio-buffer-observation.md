---
title: AudioWorkletで先読みとアンダーランを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-buffer-observation
  order: 1
  summary: 到着の遅れを含む同じ音声を二つの先読み設定で処理し、不足したフレーム数、波形、出力枠に入りきらなかった末尾を比べる。
  aliases: [AudioWorklet, AudioWorkletProcessor, OfflineAudioContext, Web Audio API, PCM, underrun, アンダーラン, 先読み]
  verification: Windowsのブラウザで両条件の波形・不足区間・残量、生成した音の再生終了を確認（2026-11-06）
---

# AudioWorkletで先読みとアンダーランを観察する

同じ1秒の音声を二つの先読み設定で処理します。ブラウザの `OfflineAudioContext` が `AudioWorkletProcessor` を呼び、得られた `AudioBuffer` の波形を表示します。音声フレームと処理単位の関係は辞典記事で確認できます。[AudioWorkletと音声バッファ](/browser/audio-worklet-buffering.html)

<p><a href="/study/samples/browser/audio-buffer-observation/index.html" target="_blank" rel="noopener noreferrer">音声バッファの実験を新しいタブで開く</a></p>

## 同じ遅れを与えて先読みの有無を比べる

音声は48,000 Hzのモノラルで、1秒に48,000フレームあります。4,800フレームずつに分け、5番目の区間だけ通常の到着予定より3,600フレーム分（75 ms）遅らせます。到着時刻は実験用の予定で、Worklet内で出力フレーム番号に対応づけます。

| 観察する値 | 先読みなし | 100 ms先読み |
| --- | --- | --- |
| 遅らせたデータの到着 | 22,800番（475 ms） | 18,000番（375 ms） |
| 供給不足で0を出力する範囲 | 19,200番以上22,800番未満（400〜475 ms） | なし |
| 不足したフレーム数 | 3,600 | 0 |
| データを取り出して出力したフレーム数 | 44,400 | 48,000 |
| 1秒の出力後にキューに残るフレーム数 | 3,600 | 0 |

両条件で出力の枠は1秒です。データが足りない間は0を出し、遅れたデータが到着したら入ってきた順に出力を続けます。先読みなしでは、その間に出力位置だけが進むため、最後の3,600フレームがキューに残ります。100 ms先読みでは同じ区間を4,800フレーム早く供給するので、使う位置までに届きます。

## 実際の波形と処理単位を読む

レンダリングすると、音の振幅と、供給不足として記録した区間を見比べられます。0のサンプルがあっても、元の波形がたまたま0を通っただけかもしれません。不足フレームは、Workletがキューから値を取り出せず0を補ったときに数えます。

画面には `process()` に渡された出力配列の長さも表示します。例えば128フレームなら、48,000 Hzで約2.67 ms分の音声です。この実験は指定した1秒分をオフラインで作るので、処理にかかった実時間や、音声デバイスに届くまでの遅延とは分けて読みます。再生を選ぶと、レンダリング済みの音声を聞き比べられます。[W3C Web Audio APIの音声グラフのレンダリング](https://www.w3.org/TR/webaudio-1.1/#rendering-loop)、[OfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-buffer-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-buffer-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-buffer-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-buffer-observation/audio-processor.js" download>audio-processor.js</a>
- <a href="/study/samples/browser/audio-buffer-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4189/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4189 --bind 127.0.0.1
```

## コード

### 音声をレンダリングして結果を表示する

<<< @/public/samples/browser/audio-buffer-observation/main.js{js}

### Workletでデータの到着と出力を進める

<<< @/public/samples/browser/audio-buffer-observation/audio-processor.js{js}
