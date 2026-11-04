---
title: Web Workerでコピー・transfer・停止を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: worker-message-observation
  order: 1
  summary: 同じ16バイトをWorkerへコピーまたはtransferで送り、送信元・返信・返却後の状態を比較する。ready待ち、一件の未完了要求、遅延応答、同期DataCloneError、停止と古い返信の無効化も扱う。
  aliases: [Web Worker, Worker, postMessage, structured clone, ArrayBuffer, transfer, detached, DataCloneError, terminate]
  verification: ブラウザ実行確認（2026-11-04、ローカルHTTP）
---

# Web Workerでコピー・transfer・停止を観察する

ブラウザのmainと専用workerの間でメッセージを送り、元のデータと返信を比べます。16バイトの小さなfixtureを使い、コピーとtransferの違いを値で確認する実験です。仕組みと図は[Web Workerとメッセージ](/browser/web-workers-messages.html)を参照してください。

<p><a href="/study/samples/browser/worker-message-observation/index.html" target="_blank" rel="noopener noreferrer">Workerの実験ページを新しいタブで開く</a></p>

## HTTP(s)で開く

この実験は、ページと外部classic worker.jsをHTTPまたはHTTPSで同じoriginから配信する構成です。`file://`では起動ボタンを無効にして配信方法を案内します。Workerの生成・スクリプト取得はブラウザのWorker APIに任せます。[WHATWG HTML：Worker interface](https://html.spec.whatwg.org/multipage/workers.html#dedicated-workers-and-the-worker-interface)

下の5ファイルを同じフォルダへ保存します。main.jsはclassic scriptの`defer`読み込みです。外部ライブラリは使いません。

- <a href="/study/samples/browser/worker-message-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/worker-message-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/worker-message-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/worker-message-observation/worker.js" download>worker.js</a>
- <a href="/study/samples/browser/worker-message-observation/README.md" download>README.md</a>

公開中の実験ページを使うほか、既存の静的HTTPサーバーでも試せます。Python 3が入っている場合は、保存したフォルダで次を実行する方法があります。サーバーは127.0.0.1へ限定し、使い終わったらCtrl+Cで停止します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

ブラウザで`http://127.0.0.1:8765/index.html`を開きます。8765番が使用中なら、別の空いているポートへ変えてください。この教材の実行コードはfetch、storage、analyticsを使いません。HTML・CSS・main.js・worker.jsの配信はありますが、追加の外部データを取得する処理はありません。

## 起動と要求を分ける

最初は停止状態です。「Workerを起動」を押すと`new Worker('./worker.js')`を呼び、workerからの`ready`メッセージを待ちます。コンストラクターが返っただけで起動完了として扱わず、ready後にA〜Dのボタンを有効にします。

ready時にも未完了の要求は一件に限定します。返信には`type`と`id`を付け、現在の要求と内容が一致したことを確認してから完了にします。mainカウンターは、起動待ち・返信待ち・停止中にも操作できます。ログは最新40件で、「表示ログを消す」は通信状態を変えません。

## A：コピーして送る

payloadは16バイトの`0, 1, 2, …, 15`です。mainは転送リストを指定せず`postMessage({ type, id, buffer })`します。workerは受け取ったbufferの長さ・先頭・合計を調べ、先頭だけ255へ変更して、転送リストなしで返信します。

|観察点|このfixtureの検査条件|
|---|---|
|mainの送信元|16バイト、先頭0のまま|
|workerの変更前|16バイト、先頭0、合計120|
|返信buffer|16バイト、先頭255、残りは1〜15|

mainがworkerのメモリを直接読む処理ではありません。workerが返信した変更前の値と、mainで受け取ったbufferを検査しています。通常のArrayBufferを転送リストなしで送る場合と、所有を移す場合を区別します。[WHATWG HTML：Structured data](https://html.spec.whatwg.org/multipage/structured-data.html#structured-cloning)

## B：transferして送る

同じbufferをpayloadにも転送リストにも入れます。

```js
worker.postMessage({ type: "transfer", id, buffer }, [buffer]);
```

送信直後、元bufferの`byteLength`は0になります。元のJavaScriptオブジェクト自体が消えるのではなく、bufferがdetachedになった状態です。このコードはdetached後の先頭バイトを読もうとしません。

workerは受け取った16バイトについてAと同じ検査・変更を行い、返信bufferもtransferします。その直後にworker自身の`buffer.byteLength`を調べ、別の`transfer-state`メッセージへ0を入れて送ります。

|観察点|このfixtureの検査条件|
|---|---|
|mainの送信直後|元bufferのbyteLength 0|
|workerの変更前|16バイト、先頭0、合計120|
|mainが受け取った返信|16バイト、先頭255、残りは1〜15|
|workerが返却した後|別メッセージ内のbyteLength 0|

mainは返信bufferとtransfer-stateの両方がそろってから、ジョブを完了にします。これは共有メモリの例ではありません。また、この小さな値の観察から、実装内部の全コピー回数や転送速度を測ったとは判断しません。[WHATWG HTML：StructuredSerializeWithTransfer](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializewithtransfer)

## C：3秒の遅延応答と停止

workerのtimerへ3000msを指定し、callbackから固定の返信を送ります。待機中にmainカウンターを増やし、停止・再起動も試せます。重いCPU処理をworkerへ移した実験ではなく、遅れて届くメッセージとmainの操作を分けて観察する例です。

timerの3000msは正確な実行時刻の保証ではありません。表には指定値と、mainで要求を始めてから返信を扱うまでの経過時間を表示します。背景タブや負荷による遅延もあり、CPU性能や処理時間の比較には使いません。[WHATWG HTML：Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

「Workerを停止」はmainから`terminate()`を呼びます。ジョブの完了やbufferの返却を待つ停止手順ではないため、transfer中のデータを必ず返してくれるという契約もありません。再起動後の要求では、新しい16バイトを作ります。[WHATWG HTML：terminate](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate)

停止ボタンのクリック処理もmainで実行されます。mainで実行中のJavaScriptへ割り込む停止命令ではありません。このページはbusy loopや重い同期処理を実行せず、待機中にも操作できる構成にしています。

## D：送信時の同期DataCloneError

関数を含む値を送ろうとし、main側の`postMessage`が同期的に投げる`DataCloneError`をcatchします。期待どおりの例外を確認するとreadyへ戻ります。これは、workerが処理を始めてから`error`イベントを返したという観測ではありません。[WHATWG HTML：StructuredSerializeInternal](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)

## timeout・古い返信・所有するworker

ready待ちと各ジョブにmain側の8秒soft timeoutを設けます。これは厳密な実時間の終了保証ではなく、timer自体もブラウザのスケジューリングに従います。timeout、workerのerror/messageerror、プロトコル不一致では、mainのtimerと未完了要求を片付け、workerをterminateしてエラーを表示します。

各callbackはworkerの世代と、所有しているWorkerオブジェクトのidentityを確認します。停止や再起動の前に並んだ古い返信が、現在の表や状態を上書きしないためです。止めたworkerのメッセージを新しいworkerの応答として使い回しません。表は直近の要求の記録で、停止後も表示された値が現在動作中のworkerを示すものではありません。

この実験は専用worker一つ・未完了要求一つ・16バイトのfixtureに限定しています。worker pool、共有メモリ、実ファイルや画像処理、GPU転送、負荷試験は扱いません。ログの時刻はmainで記録した時刻で、paintや画面表示の完了時刻でもありません。

## 実行して確認した範囲

Windows上のブラウザで、ローカルHTTP配信した実験を確認しました（2026-11-04）。画面サイズは1280×900と390×844です。起動・要求・停止、mainカウンター、Enterキーでのコピー要求、表示ログの消去を試しています。

|操作|今回の観測|
|---|---|
|起動|ready受信後にA〜Dが有効になった|
|A：コピー|両画面サイズで送信元16バイト・先頭0を保持。worker変更前は16/0/120、返信は16バイト・先頭255|
|B：transfer|両画面サイズで元buffer長が16から0へ変化。返信は16バイト・先頭255、別のtransfer-stateはworker返却後の長さ0。両返信後に完了した|
|C：遅延応答の受信|timer指定3000msの返信を受信。今回のmain経過時間は3000.8msで、厳密な実行時刻の保証ではない|
|C：待機中の停止と再起動|pending中にカウンター0→1を操作し、返信前に停止。再起動で新しいreadyを受信し、次の要求が成功した。停止した要求の完了表示はなかった|
|D：関数の送信|同期DataCloneErrorをcatchし、readyへ復帰した|
|ログ|41件記録後は最新40件を保持し、番号2〜41を表示。消去後もreadyと直近の表は保たれた|

最終的に停止ボタンでWorkerを終了しました。停止した要求に対して意図的に遅いcallbackを注入した試験ではなく、通常の遅延応答待ちをterminateした観察です。世代・Worker identityの照合はコードをレビューしています。

他ブラウザ、`file://`での案内表示、起動失敗、error・messageerror、不正返信、8秒timeoutの注入は未実測です。OSスレッド数、物理コピー回数、CPU処理の速度向上、共有メモリ、画面表示完了も測っていません。

## ソース全体

### HTML

<<< @/public/samples/browser/worker-message-observation/index.html{html}

### CSS

<<< @/public/samples/browser/worker-message-observation/styles.css{css}

### main.js

<<< @/public/samples/browser/worker-message-observation/main.js{js}

### worker.js

<<< @/public/samples/browser/worker-message-observation/worker.js{js}
