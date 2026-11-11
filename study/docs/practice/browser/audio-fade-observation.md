---
title: Web Audioで急な消音とフェードを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-fade-observation
  order: 1
  summary: 同じ音を決めた時刻に消し、急なゲイン変更と線形フェードで隣り合うサンプル値や波形がどう変わるかを比べる。
  aliases: [Web Audio API, AudioParam, GainNode, setValueAtTime, linearRampToValueAtTime, フェード, クリックノイズ]
  verification: Windowsのブラウザで5種類のフェード終了位置、境目のサンプル値と試聴の終了を確認（2026-11-06）
---

# Web Audioで急な消音とフェードを観察する

同じ音に二通りのゲイン変更を予約し、波形を比べます。どちらも250 msから消音の処理を始めます。一方はその時点でゲインを0にし、もう一方は1から0まで少しずつ下げます。[Web Audioのゲインオートメーション](/browser/audio-gain-automation.html)

<p><a href="/study/samples/browser/audio-fade-observation/index.html" target="_blank" rel="noopener noreferrer">急な消音とフェードの実験を新しいタブで開く</a></p>

## 切り替わる瞬間のサンプルを比べる

48,000 Hzで、振幅0.40、周波数400 Hzの音を0.5秒分用意します。最初の10 msは両方とも同じように立ち上げます。フェードを10 msにして「波形を計算」を押します。波形の250 msの線を見て、隣り合う二つのサンプルの値を比べます。

| 250 ms付近の値 | 急な消音 | 10 msフェード |
| --- | ---: | ---: |
| 直前のフレーム 11,999 | 約0.399452 | 約0.399452 |
| 切り替え位置のフレーム 12,000 | 0 | 約0.400000 |
| 二つの値の差の絶対値 | 約0.399452 | 約0.000548 |

切り替え位置は、音源の振幅が0.40になる時刻です。急に消音すると、出力はほぼ0.40から0に飛びます。フェードではその位置から480フレームかけてゲインを下げ、260 msで0にします。表の差はこの境目の二つのサンプルを比べた値です。

フェード時間を変えて再計算すると、消音の開始位置は同じまま、0に達する時刻が変わります。例えば5 msでは255 ms、50 msでは300 msです。フェード時間が長いほど、この実験では音が残る区間も長くなります。

## 音声の時刻を使って変化を予約する

二つの `GainNode` の `gain` に、別々のイベントを登録します。急な消音には `setValueAtTime(0, 0.25)` を使います。フェードでは、`setValueAtTime(1, 0.25)` で始点を決め、`linearRampToValueAtTime(0, 0.25 + fadeMs / 1000)` で0に達する時刻を指定します。ブラウザが `OfflineAudioContext` で両方をレンダリングし、比較用の二つのチャンネルから波形と差を読み取ります。[W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio-1.1/#AudioParam)、[GainNode](https://www.w3.org/TR/webaudio-1.1/#GainNode)

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-fade-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-fade-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-fade-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-fade-observation/fade-engine.js" download>fade-engine.js</a>
- <a href="/study/samples/browser/audio-fade-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4191/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4191 --bind 127.0.0.1
```

## コード

### 同じ音に別々のゲイン変更を予約する

<<< @/public/samples/browser/audio-fade-observation/fade-engine.js{js}

### 設定を受け取り、比較結果を表示する

<<< @/public/samples/browser/audio-fade-observation/main.js{js}
