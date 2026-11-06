# Web Audioで壁越しの音を聴き比べる

聞き手から音源へ線を伸ばして壁と交差するかを判定します。壁に当たったときだけ音量を半分にし、設定に応じて高い周波数を弱めます。[公開サンプル](https://sny0.com/study/samples/browser/audio-occlusion-observation/index.html) · [仕組みの解説](https://sny0.com/study/browser/audio-occlusion.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`occlusion-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4197 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4197/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-occlusion-observation.html#run-locally)

## 位置と音の処理

聞き手を原点に置き、壁を `z = −2.5`、`−2 ≤ x ≤ 2` の線分とします。音源の位置 `(x, z)` を `(4.8, −3.6)` と `(0, −6)` で切り替えます。どちらも距離は6です。聞き手と音源を結ぶ線分が壁を横切るのは `(0, −6)` のときです。

48,000 Hzの `OfflineAudioContext` で、250 Hzと4,000 Hzを混ぜた0.8秒のモノラル音を処理します。元の音と処理後の音を別のチャンネルに書き出し、試聴では一方ずつモノラルとして再生します。壁で遮られる場合は `GainNode` のゲインを0.5にし、高音も弱める設定では遮断周波数1,000 Hzの `BiquadFilterNode` を通します。ローパスの `Q` は約−3.01 dBです。[W3C Web Audio APIのBiquadFilterNode](https://www.w3.org/TR/webaudio/#BiquadFilterNode)

グラフは `getFrequencyResponse()` が返す振幅比にゲインを掛け、`20 × log10(振幅比)` でdBに換算した値です。低音と高音の両方を同じ割合で弱めた場合、250 Hzも4,000 Hzも約−6.02 dBになります。ローパスを加えると250 Hzは約−6.04 dB、4,000 Hzは約−30.50 dBです。[W3C Web Audio APIの周波数応答](https://www.w3.org/TR/webaudio/#dom-biquadfilternode-getfrequencyresponse)
