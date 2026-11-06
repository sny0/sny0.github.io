# Web Audioでミックスとクリッピングを比べる

ピークがそれぞれ0.65の同じ波形を、タイミングをそろえて足します。`OfflineAudioContext` で、合成後の波形と `WaveShaperNode` で絶対値を1以下に制限した波形を同時にレンダリングします。[公開サンプル](https://sny0.com/study/samples/browser/audio-mixing-observation/index.html)、[解説](https://sny0.com/study/browser/audio-mixing-and-headroom.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`mix-engine.js` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4190 --bind 127.0.0.1
```

`http://127.0.0.1:4190/` を開き、音A、音B、マスターのゲインを設定してレンダリングします。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-mixing-observation.html#run-locally)

## 数値と波形を確認する

| 音A | 音B | マスター | 制限前のピーク | 制限後のピーク | 制限前に絶対値1を超えたフレーム |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 1 | 約1.30 | 1.00 | 21,600 |
| 1 | 1 | 0.50 | 約0.65 | 約0.65 | 0 |
| 1 | 0 | 1 | 約0.65 | 約0.65 | 0 |
| 1 | 1 | 0 | 0.00 | 0.00 | 0 |

信号は48,000 Hzのモノラルで、どちらも1秒の400 Hzです。制限前後のサンプルを `ChannelMergerNode` で二つのチャンネルに分け、同じ `AudioBuffer` から読み取ります。試聴ではクリップ後の波形を1チャンネルで小さく再生します。ここで観察するクリッピングは、実験用に追加した `WaveShaperNode` が適用する処理です。[Web Audio APIのWaveShaperNode](https://www.w3.org/TR/webaudio-1.1/#WaveShaperNode)
