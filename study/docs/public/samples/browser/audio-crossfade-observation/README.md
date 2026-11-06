# Web Audioでクロスフェードの音量を比べる

同じ振幅の音源AとBを、直線と等電力の二通りのゲインで入れ替えます。音源Bの周波数を変え、同じゲインの組み合わせでも音源の関係によって中点の実効値が変わる様子を比べられます。[公開サンプル](https://sny0.com/study/samples/browser/audio-crossfade-observation/index.html)、[解説](https://sny0.com/study/browser/audio-crossfade.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`crossfade-engine.js` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4192 --bind 127.0.0.1
```

`http://127.0.0.1:4192/` を開き、音源の組み合わせを選んで計算します。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-crossfade-observation.html#run-locally)

## 観察する値

音源Aは400 Hzの正弦波です。音源Bを600 HzまたはAと同じ400 Hzに切り替えられます。どちらも48,000 Hzで1秒、ピーク振幅は0.35です。試聴時に音の両端が滑らかになるよう、最初と最後の約10 msで共通のフェードをかけています。

200 msから800 msまでクロスフェードします。`setValueCurveAtTime()` で各ゲインを予約し、直線と等電力の出力を `OfflineAudioContext` の二つのチャンネルに記録します。95 ms以上105 ms未満を基準にし、495 ms以上505 ms未満の実効値（RMS）との比をdBで表示します。[Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio-1.1/#AudioParam)

| 音源の組み合わせ | 直線の中点付近 | 等電力の中点付近 |
| --- | ---: | ---: |
| 400 Hzと600 Hz | 約 −3 dB | 約 0 dB |
| 同じ位相の400 Hz同士 | 約 0 dB | 約 +3 dB |

表の数値は再生前の波形から求めた、基準区間に対する変化量です。計算対象の10 msの間にもゲインが変わるため、中点でゲインを固定した理論値との差がわずかに出ます。
