---
title: ブラウザでPromise・await・timer・rAFの順序を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: event-loop-observation
  order: 1
  summary: 同期処理、Promise executor、then、queueMicrotask、await後の継続、timer、rAFを有限の3ケースで実行し、予測できる順序と実行して観察する順序を区別する。
  aliases: [イベントループ, Promise, async, await, queueMicrotask, microtask, setTimeout, requestAnimationFrame, rAF]
  verification: ブラウザ実行確認（2026-11-04、ローカルHTTP）
---

# ブラウザでPromise・await・timer・rAFの順序を観察する

短い処理を予約し、いつ実行されたかを実際のブラウザで比べます。予測できる順序と、環境・実行時点に応じて観察する順序を分けた実験です。仕組みと図は[イベントループ・Promise・async/await](/browser/event-loop-promises.html)を参照してください。

<p><a href="/study/samples/browser/event-loop-observation/index.html" target="_blank" rel="noopener noreferrer">イベントループの実験ページを新しいタブで開く</a></p>

下の4ファイルを同じフォルダへ保存し、`index.html`を開く方法でも試せます。classic JavaScriptを`defer`で読み込みます。ビルドやローカルサーバーは不要で、外部ライブラリ、fetch、storage、analyticsは使いません。

- <a href="/study/samples/browser/event-loop-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/event-loop-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/event-loop-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/event-loop-observation/README.md" download>README.md</a>

## ケースA：同期・Promise・await

予測順を読んでから「ケースAを実行」を押します。ラベルは次の8件です。これはこのページの、既にfulfilledとなる通常のPromiseを使ったコードについての予測です。

```text
sync:start
Promise:executor
async:before-await
sync:end
Promise:then
queueMicrotask
async:after-await
timer:0ms
```

`new Promise(executor)`のexecutorは、Promiseを作る呼出しの中で同期実行されます。Promiseを作っただけでexecutor全体が後回しになるわけではありません。このexecutorが`resolve()`した後、`.then`へ渡した処理が予約されます。[ECMAScript：Promise constructor](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-executor)

async関数も呼出し直後に実行を始めるため、`async:before-await`は`sync:end`より前です。既にfulfilledのPromiseをawaitしていても、その後の継続は同じ同期処理の続きとして即実行される形にはなりません。この例ではthen、queueMicrotask、await後の継続の順に予約されます。[ECMAScript：Await](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#await)

ソースではtimerを予約する行が`sync:end`の記録より前にあります。それでもtimerのcallbackはその場で実行されません。`setTimeout(..., 0)`の0は即時呼出しの指示でも、厳密に0ms後に実行する保証でもありません。[WHATWG HTML：Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

## ケースB：処理中にmicrotaskを追加する

「ケースBを実行」は、一つのmicrotaskから次を予約する処理です。3つで終わります。

```text
sync:start
sync:end
microtask:1
microtask:2
microtask:3
timer:0ms
```

microtask checkpointでは、途中で追加されたmicrotaskも処理対象になります。「開始時点で並んでいた分だけ処理したら、必ずtimerへ切り替える」というモデルではありません。本例は3回に限定し、無限連鎖やbusy loopは実行しません。[WHATWG HTML：Microtask checkpoint](https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint)

## ケースC：rAFとtimerを観察する

「ケースCを実行」は、Promiseのthen、rAF、0ms timerを予約します。最初の3件は次の順です。

```text
sync:start
sync:end
Promise:then
```

その後の`rAF:callback`と`timer:0ms`の相対順は固定期待にしません。コードではrAFの予約行がtimerより前にありますが、それだけで実行順を決めません。rAFは描画更新に関係するcallbackで、timerと描画更新には異なるtask sourceがあります。すべてを一つの万能なFIFO task queueへ入れる説明にはしません。[WHATWG HTML：Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)、[Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)

ケースCはrAFとtimerの両callbackが完了するまで実行中と表示します。非表示のタブではrAFが遅延・抑制され得るため、待機したままならタブを表示するか初期化してください。rAFの代わりにtimerを動かして完了を表示する仕組みはありません。

## ログと初期化を読む

各ケースの実行中は3つの開始ボタンを無効にします。初期化ボタンは常時有効です。ログは最新40件で、ラベルに加えてケース名・実行番号・記録時の`performance.now()`を表示します。rAF行にはcallbackへ渡された引数timestampを別に記録します。

この時刻をpaint時間や画面表示の完了時刻とは読みません。ログ表示のためのDOM更新自体もJavaScript処理に含まれます。timerの遅延、フレーム周期、paint回数、GPU使用、実行速度の比較を、このログだけで測ったことにはしません。

初期化では`clearTimeout`と`cancelAnimationFrame`で未実行の予約を取り消します。一方、予約済みのPromise継続やqueueMicrotaskを取り消す処理ではありません。実行の世代を更新し、古い世代のcallbackからの表示を無視します。microtaskの連鎖でも世代を確認してから次を予約します。[WHATWG HTML：Microtask queuing](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#microtask-queuing)

初期化もクリックイベントの処理なので、現在実行中のJavaScriptへ割り込む停止命令ではありません。この実験では各処理を短く有限にし、ケースCの待機中も初期化できる構成にしています。

## 確認する範囲

このページは、ブラウザの同じWindowで実行する3ケースの順序を観察する教材です。Node.js等の別のhostのイベントループや、任意のPromise連鎖・thenable・外部I/Oまで同じ予測順になるという意味ではありません。DNS・TLS・HTML転送・外部ファイル取得や、DevToolsの描画traceを観測するコードは含みません。

画面サイズやブラウザにより表示・時刻・rAFとtimerの相対順は変わり得ます。各ケースの予測と実際のラベル順を比べ、相対順を固定しない部分は、その実行で観測した結果として記録します。

## 実行して確認した範囲

Windows上のブラウザで、ローカルHTTP配信した実験ページを確認しました（2026-11-04）。1280×900と390×844の画面サイズで表示し、ケースの実行、予測の開閉、ログの上限、初期化、EnterキーでのケースAの実行を試しています。

|ケース|今回の観測|
|---|---|
|A|PC幅・スマートフォン幅の両方で、上記の8ラベルの順と一致した|
|B|同期2件、追加されるmicrotask3件、timerの計6ラベルが予測と一致した|
|C|両画面サイズで、同期2件→Promise:then→rAF:callback→timer:0msだった。末尾2件の順は今回の観測であり、固定の保証ではない|
|連続実行|合計43件を記録した時点で最新40件を保持し、先頭の番号は4、末尾は43だった|
|初期化|ログが空になり、待機中の表示と3つの開始ボタンの有効状態へ戻った|

ケースCでは両callbackの記録後に完了表示となり、開始ボタンが再び使えることを確認しました。確認時のページはvisibleでした。ログ中の時刻やrAFの引数timestampは、その実行時の値です。

他ブラウザ、ローカルファイルの直接実行、非表示タブでの待機・取消し、意図的に遅らせた古い継続の注入は未実測です。世代の確認とAPIでの取消しはコードをレビューしています。DevTools trace、paint・GPU処理、物理画面への表示完了、外部I/Oは、この実測の対象に含めません。

## ソース全体

### HTML

<<< @/public/samples/browser/event-loop-observation/index.html{html}

### CSS

<<< @/public/samples/browser/event-loop-observation/styles.css{css}

### JavaScript

<<< @/public/samples/browser/event-loop-observation/main.js{js}
