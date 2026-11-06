# Web Audioでコムフィルターを観察する

同じ音を直接通す経路と少し遅らせる経路に分け、足し合わせます。遅延時間と遅延側の相対ゲインを変えると、周波数ごとの振幅の比と試聴音がどう変わるかを比べられます。[公開サンプル](https://sny0.com/study/samples/browser/audio-comb-observation/index.html)、[解説](https://sny0.com/study/browser/audio-comb-filter.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`comb-engine.js` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4193 --bind 127.0.0.1
```

`http://127.0.0.1:4193/` を開き、遅延時間と相対ゲインを選びます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-comb-observation.html#run-locally)

## 測定と試聴

48,000 Hzの `OfflineAudioContext` で、入力を直接通す経路に `1/(1+g)`、`DelayNode` を通る経路に `g/(1+g)` のゲインを設定して足し合わせます。`g` は直接音に対する遅延側の相対ゲインです。入力が一定なら、二つの経路のゲインの合計は1になります。[Web Audio APIのDelayNode](https://www.w3.org/TR/webaudio-1.1/#DelayNode)

先頭の1サンプルが1のインパルスを通し、出力の先頭と遅延時間に対応するサンプルを読み取ります。同じ出力の先頭1,024サンプルから、0〜2,000 Hzの範囲を5 Hz刻みでフーリエ変換して振幅比を求めます。試聴には同じ乱数列から作った1秒間のノイズを使い、入力の両端に約10 msのフェードをかけます。処理後の音は、遅延側の末尾までレンダリングします。

| 遅延時間 | 遅延サンプル数 | 最初に逆位相になる周波数 |
| --- | ---: | ---: |
| 1 ms | 48 | 500 Hz |
| 2 ms | 96 | 250 Hz |
| 5 ms | 240 | 100 Hz |
| 10 ms | 480 | 50 Hz |

`g = 0` では全周波数で振幅比が1です。`g = 0.5` では逆位相になる周波数で振幅比は理論上 `1/3`（約 −9.54 dB）です。`g = 1` では理論上完全に打ち消し合います。サンプルのグラフでは表示の下限を −60 dB に設定しており、計算上の丸めによるごく小さな値も下端に表示します。
