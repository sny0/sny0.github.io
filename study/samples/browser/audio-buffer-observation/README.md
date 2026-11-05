# AudioWorkletで先読みと音声バッファの不足を観察する

同じ1秒のモノラルPCMを、先読み0 msと100 msの2条件でレンダリングします。`OfflineAudioContext` の `AudioWorkletProcessor` が実際に出力したフレームを比較できます。供給時刻は実験用に固定しています。[公開サンプル](https://sny0.com/study/samples/browser/audio-buffer-observation/index.html)、[解説](https://sny0.com/study/browser/audio-worklet-buffering.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`audio-processor.js` を同じフォルダに保存します。そのフォルダでPython 3を使い、ループバック専用のHTTPサーバーを起動します。

```powershell
python -m http.server 4189 --bind 127.0.0.1
```

`http://127.0.0.1:4189/` をAudioWorkletに対応したブラウザで開き、比較を実行します。比較結果は画面で確認でき、生成した音を聴く場合は再生を選びます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-buffer-observation.html#run-locally)

## 確認する値

| 条件 | PCMを出力したフレーム | 0で補ったフレーム | 終了時の未出力PCM |
| --- | ---: | ---: | ---: |
| 先読み0 ms | 44,400 | 3,600 | 3,600 |
| 先読み100 ms | 48,000 | 0 | 0 |

先読み0 msでは、出力フレーム19,200から22,799までの75 msにPCMが足りません。後着のPCMは受け取った順に読み出すため、1秒のレンダリングが終わる時点で末尾がキューに残ります。先読み100 msでは到着を4,800フレーム分前にずらし、開始前に相当する分は出力フレーム0で受け取ります。

この数値はアプリ側のキューを空にした実験結果です。各呼び出しで処理するフレーム数はWorkletへ渡された配列の長さから読みます。音声デバイスのアンダーランや実時間のレイテンシーは別の測定対象です。[Web Audio APIのオーディオグラフのレンダリング](https://www.w3.org/TR/webaudio-1.1/#rendering-loop)
