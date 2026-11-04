# ブラウザのイベントループを観察する

`index.html`、`styles.css`、`main.js`、このREADMEを同じフォルダに保存し、`index.html`をブラウザで開きます。classic scriptを`defer`で読み込み、ビルド、サーバー、外部ライブラリは不要です。fetch、storage、analyticsは使いません。

- A：同期処理、Promise executor、then、queueMicrotask、await後、timerの順を比べます。
- B：microtaskの中で次を予約し、3つで終わってtimerへ進みます。
- C：Promise、rAF、timerを予約し、rAFとtimerの実行順を観察します。その2つの相対順は固定期待にしません。

各ケースの予測はページ内で開いて読めます。実行中は3つの開始ボタンを無効にし、初期化ボタンは常時使えます。CはrAFとtimerの両方が完了してから開始ボタンを戻します。非表示のタブではrAFが待機したままになる場合があります。タブを表示するか初期化してください。

ログは最新40件です。初期化はtimerとrAFを取り消し、世代を更新して古いmicrotaskの記録を無視します。予約済みのPromiseやqueueMicrotask自体を取り消すAPIを実装したものではありません。

時刻はログ記録時のperformance.now()です。rAFの引数timestampは別に表示し、paintや画面表示の完了時刻とは扱いません。全処理を一つの万能FIFO task queueに並べるモデルではなく、指定した小さなブラウザ処理の順序を観察する教材です。無限連鎖、busy loop、毎フレームループはありません。

このREADMEは実ブラウザの実測記録ではありません。解説: https://sny0.com/study/practice/browser/event-loop-observation.html
