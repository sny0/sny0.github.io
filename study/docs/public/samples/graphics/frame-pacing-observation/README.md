# 平均60 FPSのフレームペーシングを見比べる

同じ2秒間に120フレームを表示する二つのパターンを、横に動く目印と表示間隔のグラフで見比べます。表示間隔が長い箇所でタイムラインを止め、何フレーム目がどれだけ長く画面に残るか確かめます。[公開サンプル](https://sny0.com/study/samples/graphics/frame-pacing-observation/index.html) · [仕組みの解説](https://sny0.com/study/graphics/optimization/frame-pacing.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`pacing-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4201 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4201/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/graphics/frame-pacing-observation.html#run-locally)

## モデルと集計方法

仮想の120 Hzディスプレイで、1回の更新間隔を1 tick（約8.33 ms）とします。各フレームが画面に残る長さを整数tickで決め、その合計から切り替え時刻を求めます。グラフと数値はこの仮想ディスプレイのデータです。動く目印はブラウザが描画するタイミングに合わせて更新します。

- **均等**は全120フレームを2 tickずつ表示します。
- **突発的なカクつき**は31・91枚目を6 tickずつ表示し、その直後の4枚ずつを各1 tickにします。ほかのフレームは各2 tickです。
- **交互に変動**は1 tickと3 tickを交互に繰り返します。

全パターンとも240 tickで120フレームを表示するため、平均60 FPS、平均表示間隔は約16.67 msです。p99は表示間隔120個を短い順に並べ、`ceil(120 × 0.99)` 番目の値を取ります。2 tickを超えたフレーム数も数えます。

| パターン | p99 | 最長 | 2 tick超過 |
| --- | ---: | ---: | ---: |
| 均等 | 16.67 ms | 16.67 ms | 0 |
| 突発的なカクつき | 50.00 ms | 50.00 ms | 2 |
| 交互に変動 | 25.00 ms | 25.00 ms | 60 |
