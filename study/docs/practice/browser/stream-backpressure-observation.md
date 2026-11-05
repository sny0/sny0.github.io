---
title: Streams APIで遅いsinkとbackpressureを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: stream-backpressure-observation
  order: 1
  summary: ReadableStreamをpipeToで遅いWritableStreamへ接続し、enqueue前後のdesiredSize・教材側の未消費数・通常完了・中断後の後片付けを区別して観察する。
  aliases: [Streams API, ReadableStream, WritableStream, pipeTo, desiredSize, CountQueuingStrategy, backpressure, AbortController]
  verification: 一次資料照合・Node.js実行（2026-11-05）
---

# Streams APIで遅いsinkとbackpressureを観察する

pullでデータを生成するReadableStreamと、timerを待って消費するWritableStreamを`pipeTo`で接続します。実際のStreams APIを使い、先読みを抑える仕組みと、教材側で数える未消費分を区別する実験です。設計と図は[Streams APIとバックプレッシャー](/browser/streams-backpressure.html)を参照してください。

<p><a href="/study/samples/browser/stream-backpressure-observation/index.html" target="_blank" rel="noopener noreferrer">ストリームの実験ページを新しいタブで開く</a></p>

## 入手して開く

下の4ファイルを同じフォルダへ保存し、静的HTTPサーバーで配信する方法でも試せます。main.jsはclassic scriptのdefer読み込みです。外部ライブラリ、ネットワークfetch、storage、analyticsは使いません。

- <a href="/study/samples/browser/stream-backpressure-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/stream-backpressure-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/stream-backpressure-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/stream-backpressure-observation/README.md" download>README.md</a>

Python 3がある場合は、保存したフォルダで次を実行し、`http://127.0.0.1:8765/index.html`を開けます。使用後はCtrl+Cで停止します。ポートが使用中なら別の空いている番号へ変更してください。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

## 固定8chunkを遅いsinkへ接続する

「8chunkのpipeToを開始」を押します。sourceはpullのたびに`Uint8Array([id, 10, 20, 30])`を一つ生成します。idは1〜8で、8個をenqueueしたらcloseを要求します。sinkは順序と内容を検査し、writeごとに600msを指定したtimer Promiseを待ちます。

|設定|このコードでの意味|
|---|---|
|Readable HWM 2|CountQueuingStrategyでchunkを1ずつ数える|
|Writable HWM 1|同じくcount単位。下流のwriteの進行がpipeへ伝わる|
|writeのPromise|この教材ではtimer待機と、消費または中断時の後片付けを表す|
|pipeToのPromise|接続全体の終端を確認する|

sourceが8個を作った時点や、sink.close callbackが呼ばれた時点で、画面を通常完了にはしません。`pipeTo`のPromiseがfulfilledになった時点で、generated・started・completedがすべて8になったことを確認します。[WHATWG Streams：pipeTo](https://streams.spec.whatwg.org/#rs-pipe-to)

HWMはcount単位の流量調整です。chunkのバイト数を直接数えた設定でも、ブラウザ全体のメモリ量のhard capでもありません。この例は同時に動くwrite一つと有限8chunkで、CPU並列処理や速度比較のベンチマークにはしていません。[WHATWG Streams：CountQueuingStrategy](https://streams.spec.whatwg.org/#count-queuing-strategy)

## desiredSizeと自前カウンターを分ける

生成時に`controller.desiredSize`をenqueueの直前・直後で読み、最大8行の表へ残します。これはReadable側の公開APIで読める値です。Writable側のwriterを別途取得してpipeToのlockと競合させる処理は行いません。

一方、次の件数は教材側のカウンターです。

|件数|増やす時点|
|---|---|
|generated|sourceがchunkをenqueueしたとき|
|started|sinkのwriteが呼ばれたとき|
|completed|中断されずtimer待機後の通常消費を終えたとき|
|outstanding|`generated − completed`という累計差|

outstandingは現在の内部queue長ではありません。進行中のwrite、write未開始の生成分、中断後に消費されなかった分も含む履歴の差です。生成済み・write未開始を示す`generated − started`も、Readableのqueue・pipeの既読分・Writableのqueueを分解した値にはなりません。保持メモリ量としても読みません。

`desiredSize`の変化とカウンターを並べることで、下流が遅い間に生成がどのように進むかを観察します。HWMだけから生成済みの総数を決め打ちしたり、全内部queueの配列を覗いた値として説明したりしない点が要点です。[WHATWG Streams：desiredSize](https://streams.spec.whatwg.org/#rs-default-controller-desired-size)

## 中断要求と終端を分ける

「中断を要求」はAbortControllerを使います。要求直後はabortingとし、開始ボタンを無効のままにします。`pipeTo`のfulfilledまたはrejectedを回収してからlock状態を表示し、再実行できるようにします。source.cancel・sink.abortのcallbackも記録しますが、順序や両方が必ず呼ばれることを固定期待にしません。例えばsourceが既にclosedなら、同じcancel経路になるとは限りません。

中断要求後も、既に読み取られたchunkのwriteが始まる場合があります。「abortを呼んだ後はwriteが一つも始まらない」とは想定しません。このコードは、そのwriteを含めた待機へ同じsignalを直接渡します。

進行中のtimerはsignalのabortでclearし、待機Promiseとwriteを同じsignal.reasonでrejectして後片付けを進めます。既にsignalがabortedなら、新しい待機もすぐrejectします。timerがresolveした直後からthen継続までの間に中断される場合も、継続側でsignalを再確認します。sink.abort callbackが来るまでtimerを片付けずに待つと、pipe側がそのwriteの終端を待って進めない設計になり得るためです。

中断されたwriteはinterruptedへ数え、通常消費のcompletedへは加算しません。実ファイル・ネットワーク等への部分的な作用が自動rollbackされる仕組みでもありません。実際の出力先を使うなら、そのAPIの取消しと部分完了の契約が別に必要です。

sourceが既にclosedで最後のwriteが進行中の場合、pipeのclose処理が始まっていて、pipeToへ渡したsignalによる中断処理だけでは止まらない経路があります。このコードは待機へも同じsignalを渡してwriteをrejectするため、その失敗をpipeToの終端まで伝えます。その際、source.cancelとsink.abortが両方0回でも中断を回収できる場合があります。callback回数だけで中断の成否を判断しません。

pipeToの拒否をcatchし、signalのreasonと一致する中断か、それ以外のエラーかを分けます。正常にfulfilledになった後の教材カウンター検査も、pipe自体のrejectと混同しません。終端後にReadableStream.lockedとWritableStream.lockedを読み、利用者側のtimerとsignal listenerも片付けます。[WHATWG Streams：ReadableStreamPipeTo](https://streams.spec.whatwg.org/#readable-stream-pipe-to)

## 再実行と初期化

再実行では新しいstreamとAbortControllerを作り、今回の表示・ログを入れ替えます。mainカウンターは実行中も使えます。「中断して初期化」も、実行中なら中断を要求し、pipeToがsettledになってから表示とカウンターを消します。中断要求だけで古い接続を捨てて次を始める構成にはしません。

各callbackでは実行オブジェクトと世代を確認し、古い処理が新しい実行の表示を上書きしないようにします。timerは通常終了でも中断でも一度だけsettleさせ、abort listenerを除きます。ログは最新60件、enqueue記録は最大8行です。毎フレーム処理やbusy loopはありません。

## 実行して確認した範囲

2026-11-05に、Node.js 20.19.1の組込みStreamsで確認しました。配布するmain.jsを変更せず、最小限のDOM代替オブジェクトでボタンの処理と表示値を受け取り、実際の600ms timerとPromiseを実行しています。`node --check`による構文確認も通しています。これはブラウザの実操作・描画を確認した試験ではありません。

|確認した操作|今回の観測|
|---|---|
|最初のwriteの待機|generated 3・started 1・completed 0。待機中の200msでは生成数が増えず、直近のdesiredSizeは1→0だった|
|通常完了|generated・started・completedがすべて8、outstanding 0、pipeTo fulfilled。両lockはfalseになった|
|一件を消費した後の中断|completed 1を保持し、中断したwriteをinterrupted 1へ。pipeToは同じAbortErrorでrejectし、両lockと待機timerを解放した|
|最後のwriteの中断|sourceが閉じ、started 8・completed 7の時点で中断。completed 7・interrupted 1でrejectを回収した。今回のcancel／abort callbackは両方0回だった|
|実行中の初期化と再実行|終端後にidle・集計0・ログ0へ戻った。新しい実行は8個すべて通常完了した|
|カウンターとログ上限|処理中もmainカウンターの処理が動き、70回の追加操作後もログは最新60件に収まった|

各終端で利用者側の待機timerは0件、未処理のPromise rejectionも0件でした。中断後に待っても古い実行による表示値の更新はなく、再実行は新しい記録になりました。本文のTextDecoderStreamのコード断片も同じNode環境で実行し、UTF-8の「あ」を1byteと2byteに分割した入力から復元でき、不完全な末尾はTypeErrorになりました。

生成数、callback数、ログ順はこの実装・実行条件での観測です。全ブラウザで同じ途中値になる保証としては扱いません。ブラウザの実操作、表示・画面幅への対応、他のStreams実装、ネットワーク受信、実ファイルへの書き込み、メモリ使用量、描画完了は未確認です。

## ソース全体

### HTML

<<< @/public/samples/browser/stream-backpressure-observation/index.html{html}

### CSS

<<< @/public/samples/browser/stream-backpressure-observation/styles.css{css}

### JavaScript

<<< @/public/samples/browser/stream-backpressure-observation/main.js{js}
