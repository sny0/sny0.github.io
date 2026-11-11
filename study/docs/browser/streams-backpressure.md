---
title: Streams APIとストリーミング処理 — データの流れとbackpressure
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: ReadableStream、WritableStream、TransformStreamの役割とchunk・待ち行列を説明する。highWaterMarkとdesiredSize、writeとreadyのPromise、pipeToの伝播、終了・取消し・lock、UTF-8の分割境界を整理する。
  aliases: [Streams API, streaming, ストリーミング, ReadableStream, WritableStream, TransformStream, chunk, underlying source, underlying sink, pull, push, backpressure, desiredSize, highWaterMark, writer.ready, pipeTo, pipeThrough, cancel, abort, close, releaseLock, TextDecoderStream]
  verification: 一次資料照合（2026-11-05）
---

# Streams APIとストリーミング処理 — データの流れとbackpressure

**ストリーミング処理**は、届いた部分から順に受け取り、変換し、次の処理へ渡す方式です。ブラウザの**Streams API**は、その流れ、待ち行列、終了や失敗を扱う標準APIです。

[Worker poolの受付制御](/browser/worker-pool-backpressure.html)と同様に、作る側が速いとデータがたまります。ただし、Streamの閾値は「待機4件を超えたら拒否」という固定上限とは異なります。**供給を抑える合図、処理完了、資源の解放を分けて読みます。**

## readable、writable、transformとchunk

| 種類 | 役割 |
| --- | --- |
| `ReadableStream` | データを読み出す側へ提供する。下に実際の生成元であるsourceがある |
| `WritableStream` | データを書き込む入口を提供する。下に実際の処理先であるsinkがある |
| `TransformStream` | writable側で入力を受け、変換結果をreadable側へ出す |

**chunk**は、一回に渡すデータのまとまりです。Streamの契約に合うバイト列、文字列、オブジェクトなどを扱い、大きさは一定のバイト数や文字数とは限りません。変換では、一つの入力に対する出力が0個や複数個の場合もあります。[WHATWG Streams: Model](https://streams.spec.whatwg.org/#model)

**reader**と**writer**は読み書きの窓口です。**controller**はsourceや変換処理などからデータ・終了・失敗を知らせます。`controller.enqueue(chunk)`で供給した未消費データは、内部queueへ入る場合があります。

Streamをつなぐだけで、計算を別のOSスレッドへ移すことにはなりません。自分で書いた`pull`、`transform`、`write`などの計算にも実行時間が必要です。[Worker](/browser/web-workers-messages.html)への分担は別の仕組みです。

## pullとpushでは、作る側の抑え方が異なる

**pull型**は需要に応じて次を生成・取得する方式で、独自ReadableStreamの`pull(controller)`が供給を求められる入口です。queueの空きや保留中のreadなどが関係し、`read()`一回と必ず対応するわけではありません。read前にqueueを満たすために呼ばれ得ます。[WHATWG Streams: Underlying source API](https://streams.spec.whatwg.org/#underlying-source-api)

**push型**は外側の機器やイベント源などから供給される方式で、その停止・再開へ抑制をつなぎます。`enqueue`だけで外側の生成は自動停止しません。止められない入力なら、容量や取りこぼし、失敗条件も決めます。[MDN: Streamsのsourceとbackpressure](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts)

## desiredSizeとhighWaterMarkは、抑制のための情報

**highWaterMark**は、queueの大きさに対してbackpressureを判断する閾値です。**desiredSize**は、通常の動作中には、概念的に次の差で表します。

```text
desiredSize = highWaterMark − queue内で数えているサイズの合計
```

`CountQueuingStrategy`は一chunkを1、`ByteLengthQueuingStrategy`はchunkの`byteLength`で数えます。件数とbyte数では閾値の意味が違います。また、終了・失敗などの状態によりdesiredSizeがnullなどになる場合もあり、常に単純な空き容量の数値ではありません。[WHATWG Streams: Queuing strategies](https://streams.spec.whatwg.org/#queuing-strategies)

件数単位でhighWaterMarkが2なら、queueサイズ1では差は1、サイズ3では−1です。供給を抑える情報であり、必ず三つ目を拒否してメモリを確保しない、という契約ではありません。

**highWaterMarkはメモリの厳密な上限ではありません。** 巨大なchunk、合図を無視するsource、大量の変換出力、別の配列への結果保存などでも保持量は増えます。複数段には各queueや処理中のデータもあります。chunkの最大サイズ、段ごとの保持、外側の生成元まで含めて設計します。[WHATWG Streams: Internal queues](https://streams.spec.whatwg.org/#internal-queues)

<figure>
  <img src="/images/browser/streams-flow.svg" alt="sourceからReadableStream、pipeTo、WritableStream、sinkへ流れるchunkと、消費側から上流へ戻るbackpressure、段ごとのqueueを示す図" width="760" height="1510" loading="lazy">
  <figcaption>chunkは下流へ、供給を抑える合図は上流へ伝わります。各queueの閾値だけで、処理全体のメモリ使用量が固定されるわけではありません。<a href="/study/images/browser/streams-flow.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## writeのPromiseと、writer.readyを混同しない

| API | 待つ意味 |
| --- | --- |
| `writer.write(chunk)`が返すPromise | その書き込み操作の成功または失敗 |
| `writer.ready` | writable側のbackpressureがかかっていない状態への合図 |
| `writer.close()`が返すPromise | 先行する書き込みを進め、sinkを正常に閉じる処理の完了 |

`ready`は特定chunkの書き込み完了通知ではありません。閾値に余裕があれば、書き込み未完了でもfulfilledの場合があります。正常なwritableでdesiredSizeが非正から正へ戻ることが、backpressureの解除に関係します。[WHATWG Streams: Writerによるflow control](https://streams.spec.whatwg.org/)

`write`の成功の意味はsinkの契約次第で、永続保存やネットワーク相手の処理完了まで示すとは限りません。独自sinkの`write`で非同期処理をするなら、その完了を表すPromiseを返します。timerだけ開始して戻れば、Streamには先に書き込み完了と扱われ得ます。大量のwriteやPromiseを別にためる保持量にも注意します。[MDN: writer.write](https://developer.mozilla.org/en-US/docs/Web/API/WritableStreamDefaultWriter/write)、[MDN: writer.ready](https://developer.mozilla.org/en-US/docs/Web/API/WritableStreamDefaultWriter/ready)

## pipeToで流れと伝播をつなぐ

`readable.pipeTo(writable)`は、chunkを渡し、書き込み先の状況に応じて読み進めます。`pipeThrough(transform)`は変換のwritable側へ流し、そのreadable側を返します。接続に沿ってbackpressureを扱うための仕組みです。

`pipeTo`が返すPromiseは、pipe処理が正常に終わればfulfilled、失敗すればrejectedになります。基本となる、伝播を抑止しない設定では次の関係があります。

| 起きたこと | 接続先への伝播 |
| --- | --- |
| sourceが正常に閉じる | destinationを正常にcloseする |
| sourceがerrorになる | destinationをabortする |
| destinationがerrorになる | sourceをcancelする |
| pipeへ渡したAbortSignalがabortされる | sourceをcancelし、destinationをabortする |

これは基本の伝播方向であり、終了済みの状態や競合により、sourceのcancelとsinkのabortのコールバックが両方必ず呼ばれる保証ではありません。相対順も固定しません。`preventClose`、`preventAbort`、`preventCancel`で伝播を抑止するなら、残した側を誰が扱うかも決めます。[WHATWG Streams: pipeTo](https://streams.spec.whatwg.org/#rs-pipe-to)、[MDN: pipeToのoptions](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/pipeTo#parameters)

## close、cancel、abort、errorは同じ終了ではない

readableの**close**は、供給側が正常な終わりを示す操作です。すでにqueueにあるchunkは読み出せ、その後のreadが`done: true`になります。writableのcloseは、新しい書き込みを終え、先行する書き込みとsinkの正常終了を進める操作です。

readableの**cancel**は、読み手が「残りはもう要らない」と知らせる操作で、queue内の未読データを破棄し、sourceの取消し手続きへつながります。writableの**abort**は、正常な完走をやめる操作です。**error**は、読み書きが失敗した状態を表します。error化と、独自sourceやsinkのcancel／abortコールバックが呼ばれることも、同じものとしては扱いません。

取消しやabortは、すでに起きた副作用を巻き戻しません。実行中のsinkの書き込みを、任意の瞬間で強制停止する保証もありません。`AbortController.abort()`を呼んだことと、`pipeTo`のPromiseが決着し、独自の片付けが終わったことを分けて管理します。これは前章の「結果が不要でも、実処理の枠は残る」という観点につながります。[WHATWG Streams: Readable / Writable streams](https://streams.spec.whatwg.org/#rs-model)、[Pipe処理の終了規則](https://streams.spec.whatwg.org/#readable-stream-pipe-to)

<figure>
  <img src="/images/browser/streams-lifecycle.svg" alt="正常終了close、読取側のcancel、書込側のabort、errorとpipeToでの伝播、pipe終了時のlock解放を区別する図" width="760" height="1510" loading="lazy">
  <figcaption>close、cancel、abort、errorは意味と伝播先が異なります。<code>releaseLock</code>も、取消しや正常終了の代わりにはなりません。<a href="/study/images/browser/streams-lifecycle.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## lockとreleaseは、資源の停止とは別

`getReader()`や`getWriter()`で窓口を得ると、Streamは**lock**されます。読み手や書き手の利用を排他的に管理する仕組みで、OSのmutex取得や別スレッドの生成ではありません。pipeToも処理中は両側をlockします。

`releaseLock()`はその窓口の利用権を解放し、巻き戻し・cancel・closeはしません。保留中のreadを残してreaderのlockを解放すると、そのPromiseはTypeErrorでrejectedになります。未読chunkは別のreaderで読める場合があります。処理の決着と、lock解放の順序も設計します。[MDN: reader.releaseLock](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/releaseLock)

## chunk境界は、通信や文字の境界とは限らない

Fetchの`Response.body`は本文のStreamを公開し、本文がなければnullです。chunkの区切りは、TCPパケット、HTTPの一要求、送信側のwrite一回、文字一個の境界とは別です。[WHATWG Fetch: Bodies / Body mixin](https://fetch.spec.whatwg.org/#body-mixin)

例えばUTF-8の「あ」は`E3 81 82`という3byteですが、`E3`と`81 82`の別chunkになる場合があります。chunkごとに新しいTextDecoderで完結した入力として解釈すると、途中までしかない文字を不正列として扱う原因になります。[Unicodeと文字コード](/data/unicode-and-encoding.html)の、byteと文字の区別がここでも必要です。

**TextDecoderStream**は、分割入力の状態を保ってバイト列を文字列へ変換します。次は準備済みのbyteSourceと、文字列を受け取るtextSinkの接続例です。呼び出し元で、この関数のPromiseの成功・失敗を受け取ります。

```js
async function decodeToTextSink(byteSource, textSink) {
  const textSource = byteSource.pipeThrough(
    new TextDecoderStream("utf-8", { fatal: true }),
  );
  await textSource.pipeTo(textSink);
}
```

`fatal: true`では、不正なUTF-8をTypeErrorとして扱い、変換の失敗につなげます。復元した文字列も、改行やJSON一件ずつの区切りとは限りません。必要な区切りの保持・解析は別です。[WHATWG Encoding: TextDecoderStream](https://encoding.spec.whatwg.org/#interface-textdecoderstream)

## 実践と、観測の範囲

[Streamのbackpressureを観察する実践](/practice/browser/stream-backpressure-observation.html)では、pullで4byteのUint8Arrayを8個生成します。件数単位のhighWaterMarkはreadableが2、writableが1で、sinkのwriteは600msのtimer待機を返します。これは消費の遅さを見せる教材で、CPU計算やネットワークの性能測定ではありません。

中断時は、pipeToと独自writeの待機が同じAbortSignalを監視します。待機側でtimerを解除し、中断したwriteのPromiseを同じreasonでrejectします。通常消費の完了には数えません。中断要求後も、pipeが既に読み出したchunkのwriteを始める場合があるため、write開始時にもsignalの中断状態を確認します。sinkのabortコールバックだけでtimerを解除しようとすると、pipe側が進行中writeの決着を待つため、互いに待ち続ける設計になり得ます。実践はpipeToの終端とlock解放を確認してから再実行します。

sourceの正常終了からpipeの終了処理が進み始めた後は、pipeへ送る中断要求だけで、その終了経路を変更できるとは限りません。この例は進行中write自身もsignalを監視して失敗を返すため、最後のwriteの中断を成功に取り違えません。すでに閉じたsourceやerrorになったsinkでは、cancel／abortのコールバックが呼ばれない場合もあります。

生成数generated、書き込み開始数started、消費完了数completedを表示します。`generated − completed`は内部queueの長さではなく、処理中や、中断後は未消費の累計差も含みます。ログから、全バッファ、物理メモリ上限、ネットワーク受信量、描画完了を測ったことにはしません。
