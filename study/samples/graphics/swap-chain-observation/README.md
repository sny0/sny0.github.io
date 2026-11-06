# 画面に出るフレームを表示方式ごとに比べる

仮想60 Hzの画面で、FIFO、MAILBOX、IMMEDIATEの3方式を同じ描画完了時刻で比べます。画面の上から下へどのフレームが出るか、待ち行列に何が残るか、入力から最初の行に反映されるまでに何 ms かかるかを確認できます。[公開サンプル](https://sny0.com/study/samples/graphics/swap-chain-observation/index.html) · [仕組みの解説](https://sny0.com/study/graphics/optimization/swap-chain-and-vsync.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`presentation-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4202 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4202/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/graphics/swap-chain-observation.html#run-locally)

## 比べ方

1. 最初に開く第2走査では、FIFOがBを表示し、Cは待ち行列に残ります。MAILBOXは待機中だったBをCで置き換え、Cを表示します。IMMEDIATEは上部をCで走査し、23 msでD、30 msでEに切り替えます。
2. 「前の走査」「次の走査」か「走査区間」の選択で前後をたどります。「順に再生」を押すと走査区間が順に進みます。
3. Gが最初に反映されるのは、FIFOで100 ms、MAILBOXで50 ms、IMMEDIATEで47 msです。Gの入力時刻は43 msなので、入力から最初の行までの時間はそれぞれ57 ms、7 ms、4 msです。

## モデルの前提

描画済みのAから始め、B〜Gは同じ順番・同じ時刻に各表示方式へ届くものとします。同期型の待ち行列は各走査の開始時に1枚を選び、更新境界と同時に届くフレームはその走査の候補に入ります。十分な描画用画像がある前提で、アプリ側の画像取得待ち、OSの合成、物理ディスプレイの応答を省いています。表示帯は1回の走査で各行へ出力したフレームを示し、時間と行の位置はこの仮想モデルから求めます。
