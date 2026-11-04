# ブラウザの変更と計測を分ける実験

`index.html`、`styles.css`、`main.js`、このREADMEを同じフォルダに保存し、`index.html`をブラウザで開きます。classic scriptを`defer`で読み込み、外部ライブラリ、fetch、storage、analyticsは使いません。ビルドやローカルサーバーは不要です。

1. 最初に「値を計測する」を押します。
2. テキスト、幅、背景色、位置、透明度のいずれか一つを切り替えます。
3. 再び計測し、前回との差を見ます。操作の比較は「すべて初期化」からやり直せます。

初期の箱は`box-sizing: border-box`、100×60px、padding 8px、border 2px、背景`#b8dcff`、transformなし、opacity 1です。幅は160px、位置は`translateX(40px)`、透明度は0.5に切り替わります。テキストはHello/Browser、背景色は青/オレンジです。

変更ボタンでは計測APIを呼びません。計測ボタンはgetComputedStyle、offsetWidth/Height、getBoundingClientRectの値を先に読み、その後に表を更新します。値の読み取り自体がstyle/layoutの更新を必要にする場合があります。viewport基準の位置はスクロールでも変わります。

rAFは1回だけ予約し、待機中は予約ボタンを無効にします。callbackは描画・画面表示完了の通知ではなく、非表示のタブでは遅延・抑制され得ます。初期化は未完了の予約を取り消します。ログは最新20件です。

CSSの変更からlayout/paint/compositor/GPUの実際の処理回数は断定しません。DevToolsのPerformanceやPaint flashingを使う手順は解説にあります。このREADMEはDevTools traceを実測したという記録ではありません。

解説: https://sny0.com/study/practice/browser/render-observation.html
