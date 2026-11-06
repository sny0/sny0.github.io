# Web Audioで音の定位と距離減衰を観察する

音源の方位角と距離を変え、左右のチャンネルに同じ音がどのくらい入るかを比べます。500 msのモノラル音をブラウザでステレオに変換し、左右の出力を測定します。[公開サンプル](https://sny0.com/study/samples/browser/audio-spatial-observation/index.html) · [仕組みの解説](https://sny0.com/study/browser/audio-spatial-panning.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`spatial-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4196 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4196/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-spatial-observation.html#run-locally)

## 測定と試聴

48,000 Hzの `OfflineAudioContext` でモノラルの音を `PannerNode` に通します。聞き手は原点に置き、正面を −Z、右を +X とします。方位角0°は正面で、+90°は真右です。パン方式は `equalpower`、距離モデルは `inverse`、基準距離と減衰係数はともに1です。[W3C Web Audio APIのPannerNode](https://www.w3.org/TR/webaudio/#PannerNode)

左右それぞれの実効値（RMS）を入力のRMSで割り、振幅比を求めます。左右の振幅比を `L` と `R` とすると、合成比は `√(L² + R²)` です。左右を足してモノラルに戻す処理とは計算が異なります。試聴では左右の出力を同じ割合で縮小してステレオで再生します。

| 方位角 | 距離 | 左の振幅比 | 右の振幅比 | 合成比 |
| ---: | ---: | ---: | ---: | ---: |
| 0° | 0.5 | 0.707 | 0.707 | 1.000 |
| 0° | 1 | 0.707 | 0.707 | 1.000 |
| +90° | 1 | 0.000 | 1.000 | 1.000 |
| +45° | 2 | 0.191 | 0.462 | 0.500 |

表は理論値の丸めです。距離2では合成比が0.5になり、入力を基準に約−6.02 dBです。距離を0.5にしても、減衰計算には基準距離1が使われます。
