---
title: Web Audioで音源が通過する前後の音を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-flyby-observation
  order: 1
  summary: 左から右へ通過する音源の位置をたどり、周波数、左右の出力、距離減衰を図とステレオ試聴で比べる。
  aliases: [Web Audio API, 通過音, フライバイ, flyby, ドップラー効果, 最接近, PannerNode, playbackRate, 距離減衰]
  verification: WindowsのChromium系ブラウザで全6設定の周波数と左右の出力、試聴に連動する位置図とグラフを確認（2026-11-06）
---

# Web Audioで音源が通過する前後の音を比べる

440 Hzの音を出す音源が、静止した聞き手の前を左から右へ横切ります。2秒の再生のうち、開始から **1秒** が最接近です。実験画面の時刻は、最接近を **0秒** として表示します。位置と周波数のグラフを見ながら、左右の出力と音の高さがどう変わるか比べます。[通過の軌道と音の関係を読む](/browser/audio-flyby.html)

<p><a href="/study/samples/browser/audio-flyby-observation/index.html" target="_blank" rel="noopener noreferrer">通過音の実験を新しいタブで開く</a></p>

## 通過の前後をたどる

1. 速さを **40 m/s**、最接近距離を **10 m** にして「計算する」を押します。時間を動かすと、位置図の音源とグラフ上の時刻が連動します。
2. **−0.5秒、0秒、+0.5秒** の順に確認します。最接近前は左にあり、聞こえる周波数は440 Hzより高くなります。最接近では左右の配分が等しくなり、予測周波数は440 Hzです。その後、音は右に移り、周波数は低くなります。
3. 速さを保ち、最接近距離を **5 m** と **20 m** で比べます。最接近時の距離ゲインはそれぞれ **1** と **0.25** です。試聴しながら、音量の差と、高い音から低い音へ移る速さの違いを確かめます。

| 最接近からの時刻 | 音源の位置 | 予測周波数 | 距離ゲイン |
| ---: | --- | ---: | ---: |
| −0.5秒 | 左 | 491.24 Hz | 0.224 |
| 0秒 | 正面 | 440.00 Hz | 0.500 |
| +0.5秒 | 右 | 398.44 Hz | 0.224 |

表は40 m/s、最接近距離10 mで、各時刻の位置と速度から計算した値です。

## 設定した軌道と、生成した音を比べる

48,000 Hzの `OfflineAudioContext` で、音源が位置を変える時刻と `playbackRate` を同じ時間軸に予約します。`PannerNode` の位置を左から右へ動かし、等電力パンニングと逆距離モデルを適用します。グラフの予測値は、その時点の位置と速度から求めます。[W3C Web Audio APIのPannerNode](https://www.w3.org/TR/webaudio/#PannerNode) · [AudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode)

実測値には、各時刻の前後10 msにある音声を使います。周波数はパンニング前の波形が0を横切る間隔から求めます。左右のゲインは、パンニング後の各チャンネルの実効値を、パンニング前の実効値で割った値です。この20 msの間にも音が変わるため、瞬間の予測値と実測値には小さな差が出ます。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-flyby-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-flyby-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-flyby-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-flyby-observation/flyby-engine.js" download>flyby-engine.js</a>
- <a href="/study/samples/browser/audio-flyby-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4200/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4200 --bind 127.0.0.1
```

## コード

### 軌道と再生速度を計算し、ステレオ出力を測る

<<< @/public/samples/browser/audio-flyby-observation/flyby-engine.js{js}

### 位置とグラフを描き、試聴と連動させる

<<< @/public/samples/browser/audio-flyby-observation/main.js{js}
