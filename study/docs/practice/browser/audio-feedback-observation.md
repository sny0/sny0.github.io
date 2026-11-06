---
title: Web Audioで反響の間隔と減衰を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-feedback-observation
  order: 1
  summary: 遅延時間とフィードバックゲインを変え、反響の時刻と振幅をグラフと試聴で比べる。
  aliases: [Web Audio API, フィードバックディレイ, feedback delay, フィードバックゲイン, DelayNode, 反響, エコー, 減衰, インパルス応答]
  verification: WindowsのChromium系ブラウザで全9設定の反響時刻と振幅、元の音と反響付きの音の試聴を確認（2026-11-06）
---

# Web Audioで反響の間隔と減衰を観察する

出力の一部を少し遅らせて入力に戻すと、短い音を一度鳴らすだけで反響が続きます。遅延時間で間隔を、フィードバックゲインで一周ごとに残る振幅を調整します。グラフと表には、元の音と最初の5回の反響が出る時刻の実測値が並びます。[仕組みと経路の図を読む](/browser/audio-feedback-delay.html)

<p><a href="/study/samples/browser/audio-feedback-observation/index.html" target="_blank" rel="noopener noreferrer">反響の実験を新しいタブで開く</a></p>

## 間隔と減衰を別々に変える

設定を変えるたびに「グラフを計算」を押します。

1. 遅延時間を **200 ms**、フィードバックゲインを **0.7** にします。元の振幅1に続き、反響の振幅は0.7、0.49、0.343と小さくなります。各反響が届いた時刻も表で確認します。
2. 遅延時間を200 msのままにして、ゲインを **0.4** に変えます。反響は同じ時刻に現れますが、1回目の振幅は0.4、2回目は0.16に下がります。
3. ゲインを0.7に戻し、遅延を **400 ms** にします。反響の間隔が広がり、振幅は手順1と同じ割合で減ります。ゲインを **0** にすると、時刻0の元の音だけが残ります。

次の表は、ループ1周の遅延が設定どおりとした場合の計算です。サンプルは設定値に加え、実際に測った間隔も表示します。

| 設定した遅延時間 | 48,000 Hzでの設定フレーム数 | 最初の反響（理論値） | 5回目の反響（理論値） |
| ---: | ---: | ---: | ---: |
| 100 ms | 4,800フレーム | 100 ms | 500 ms |
| 200 ms | 9,600フレーム | 200 ms | 1,000 ms |
| 400 ms | 19,200フレーム | 400 ms | 2,000 ms |

同じ短い打音を元の音と反響を加えた音で聴き比べられます。まずゲインを固定して遅延を変え、次に遅延を固定してゲインを変えると、間隔と減衰の違いを聴き取りやすくなります。

## ブラウザが作った出力を測る

`OfflineAudioContext` で先頭の1サンプルだけが1の信号を処理します。合流点の出力を `DelayNode` に送り、`GainNode` で振幅を `g` 倍して合流点に戻します。出力から反響のピークを探し、見つかったフレームを時刻に換算します。ゲイン0では反響がないため、設定上の時刻で振幅0を確認します。[W3C Web Audio APIのDelayNode](https://www.w3.org/TR/webaudio/#DelayNode)、[OfflineAudioContext](https://www.w3.org/TR/webaudio/#OfflineAudioContext)

今回のChromium系ブラウザでは、200 ms（9,600フレーム）に設定したとき、反響の間隔は約202.67 ms（9,728フレーム）でした。循環の処理で生じるこの差はブラウザによって変わり得るため、表とグラフは実測した時刻を使います。

ゲイン0.7は一周あたり約 **−3.10 dB**、ゲイン0.4は約 **−7.96 dB** です。どちらも、一つ前の反響と比べた振幅比を `20 × log10(g)` で換算した値です。[Julius O. Smithのフィードバック・コムフィルター](https://www.dsprelated.com/freebooks/pasp/Feedback_Comb_Filters.html)

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-feedback-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-feedback-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-feedback-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-feedback-observation/feedback-engine.js" download>feedback-engine.js</a>
- <a href="/study/samples/browser/audio-feedback-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4194/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4194 --bind 127.0.0.1
```

## コード

### 出力を遅延経路に戻し、反響を測る

<<< @/public/samples/browser/audio-feedback-observation/feedback-engine.js{js}

### 設定を受け取り、グラフと測定値を表示する

<<< @/public/samples/browser/audio-feedback-observation/main.js{js}
