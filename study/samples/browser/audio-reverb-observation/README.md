# Web Audioでインパルス応答と残響を観察する

同じ短い打音に二つの合成インパルス応答を適用し、残響の立ち上がりと続き方を波形と試聴で比べます。[公開サンプル](https://sny0.com/study/samples/browser/audio-reverb-observation/index.html)、[仕組みの解説](https://sny0.com/study/browser/audio-convolution-reverb.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`reverb-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4195 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4195/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-reverb-observation.html#run-locally)

## 測定と試聴

48,000 Hzの `OfflineAudioContext` で60 msの打音を処理します。直接音と `ConvolverNode` の出力を別のチャンネルで受け取り、サンプルごとに `直接音 + 反響のゲイン × 畳み込み出力` を計算します。反響のゲインを0にすると、元の打音と合成音が一致します。畳み込みの長さは `打音のサンプル数 + インパルス応答のサンプル数 − 1` です。[W3C Web Audio APIのConvolverNode](https://www.w3.org/TR/webaudio/#ConvolverNode)

| 合成インパルス応答 | 最初の反射 | 応答の長さ | 出力のサンプル数 |
| --- | ---: | ---: | ---: |
| 小さな部屋 | 12 ms | 300 ms | 17,279 |
| ホール | 40 ms | 1,200 ms | 60,479 |

二つの応答は学習用に合成したものです。間隔を空けた反射と、時間とともに弱まる乱数列から作ります。直接音は別経路で足すため、応答の0番目のサンプルは0です。係数をそのまま使うため、`normalize` を `false` にしてから `buffer` を設定します。表の長さは、用意した応答バッファに含まれる時間です。
