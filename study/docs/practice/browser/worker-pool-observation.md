---
title: Worker poolで受付上限・待機取消し・結果破棄を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: worker-pool-observation
  order: 1
  summary: 固定2つのWorkerと4件のFIFO待機枠で7件をまとめて依頼し、受付拒否・未送信の取消し・実行中の結果破棄・全停止を別々に集計する。
  aliases: [Worker pool, Web Worker, backpressure, バックプレッシャー, FIFO, queue, 取消し, 結果破棄, 受付上限]
  verification: ブラウザ実行確認（2026-11-05、ローカルHTTP）
---

# Worker poolで受付上限・待機取消し・結果破棄を観察する

2つのWorkerへ一件ずつ処理を送り、空きがなければ最大4件を待たせます。7件をまとめて依頼したとき、受付上限をどう扱うかを実際のブラウザで比べる実験です。設計と図は[Worker poolとバックプレッシャー](/browser/worker-pool-backpressure.html)、単一workerの基礎は[コピー・transfer・停止の実験](/practice/browser/worker-message-observation.html)を参照してください。

<p><a href="/study/samples/browser/worker-pool-observation/index.html" target="_blank" rel="noopener noreferrer">Worker poolの実験ページを新しいタブで開く</a></p>

## HTTP(s)で開く

下の5ファイルを同じフォルダへ保存し、HTTPまたはHTTPSで同じoriginから配信します。file://では起動ボタンを無効にします。main.jsはclassic scriptのdefer読み込み、worker.jsも外部classic workerです。[WHATWG HTML：Worker interface](https://html.spec.whatwg.org/multipage/workers.html#dedicated-workers-and-the-worker-interface)

- <a href="/study/samples/browser/worker-pool-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/worker-pool-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/worker-pool-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/worker-pool-observation/worker.js" download>worker.js</a>
- <a href="/study/samples/browser/worker-pool-observation/README.md" download>README.md</a>

Python 3が入っている場合は、保存したフォルダで次を実行する方法があります。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

`http://127.0.0.1:8765/index.html`を開き、使用後はCtrl+Cでサーバーを停止します。ポートが使用中なら別の空いている番号へ変更してください。外部ライブラリ、fetch、storage、analyticsは使いません。ページとworker.js等の配信はありますが、追加の外部データを要求する処理はありません。

## まず7件を依頼する

「poolを起動」で2つのWorkerを生成し、両方のreadyを受け取ります。readyが2件そろい、未完了の要求がないidle状態で「7件まとめて依頼」を押せます。

同じ同期的なクリック処理の中で7件を受け付けるため、初期の割当ては次の形になります。workerからの返信処理は、この同期処理の途中へ割り込みません。

|依頼|扱い|
|---|---|
|最初の2件|各slotへ一件ずつdispatchし、runningへ|
|次の4件|main側のFIFO queueでwaitingへ|
|7件目|待機枠が満杯なのでrejectedへ。workerへ送信しない|

依頼直後はrunning 2、waiting 4、accepted 6、rejected 1になります。acceptedに拒否した1件は含みません。この上限と拒否方針は、このサンプルがmain側で実装したルールです。ブラウザが自動的に待機数を4件へ制限してくれるわけではありません。

workerは受け取った固定16値`0, 1, …, 15`を検査し、件数16・合計120を求めます。その後、timerへ3000msを指定して返信します。遅延は状態を操作しやすくするためで、重いCPU処理や並列化の性能を比較する実験ではありません。何も取り消さず通常完了した場合は、採用完了6、拒否1になります。

## 待機取消しと結果破棄を比べる

一括依頼の直後に、次のボタンを一度ずつ押して比較できます。待機枠や未指定の実行枠がなくなった場合、そのボタンは無効になります。

|操作|すぐに起きること|終端に達する時点|
|---|---|---|
|待機先頭1件を取り消す|FIFO先頭をqueueから除く。未送信のままwaitingが減る|その場でqueuedCancelledへ|
|実行中1件の結果を使わない|最初の未指定slotの要求へ破棄印を付ける。running数は減らさない|返信を回収したときdiscardedへ|
|poolを停止|全workerをterminateし、残った実行・待機を打ち切る|未完了の全件をabortedへ|

結果破棄を指定しただけで実行枠を空けると、まだ働いているworkerへ次の要求を重ねて送りかねません。この実験では返信を受けるまでslotを保持します。返信のtype/id・件数・合計は検証しますが、破棄対象の結果は採用完了として扱いません。

待機取消しを1件、結果破棄を1件指定し、残りが正常に終わった場合は次の集計になります。

```text
accepted=6
completed=4
rejected=1
queuedCancelled=1
discarded=1
aborted=0
running=0 / waiting=0
```

破棄印を付けた後、返信前にpoolを停止した要求はabortedになります。まだ回収していない結果をdiscardedへ先に計上しません。これらは同じ一件に対する排他的な終端です。

## 集計の不変条件と履歴上限

このコードは状態変更後に次の式と、queue・slot・未完了Mapの対応を検査します。

```text
accepted = running + waiting + completed
         + queuedCancelled + discarded + aborted
```

結果破棄待ちはrunningに含め、rejectedはacceptedの外です。一件の終端化では未完了Mapから削除してから一つの終端カウンターへ加算します。同じ返信をもう一度受け取っても、二重にcompletedへ足す処理にはしません。不正・重複返信はpool全停止の対象です。

未完了は最大6件、終端履歴は最新20件、ログは最新60件に制限します。履歴から古い行を除いても集計値は残します。「停止して初期化」は、未完了を打ち切った後に集計・履歴・ログ・mainカウンターを消します。要求IDと世代は巻き戻さず、再起動後の要求へ古いIDを再利用しません。

FIFOは待機からdispatchする順序です。異なるworkerの完了順や、画面に記録される返信順を固定する保証ではありません。要求表は新しいIDから表示し、ログは記録順に並べます。

## timeoutはdispatch時から数える

起動時には各workerのready待ちへ8秒のsoft timeoutを置きます。ジョブの8秒timeoutは、workerへdispatchして実行枠を占有した時点から数えます。queueへ受理した時点からは数えず、今回のqueueには待機期限を設けません。

6件すべてを2つのworkerで処理する場合、最後の2件は前の要求を待ってからdispatchされます。待機時間と実行枠占有時間を混ぜると、正常な処理でも受理からの時間だけでtimeoutにしかねません。実機用の待機期限を追加する場合も、何の期限なのかを別に定義する必要があります。

timerは正確な実行時刻の保証ではなく、負荷や背景タブ等により遅延し得ます。3000msのworker timerも、8000msの監視timerも、厳密な実時間の終了保証にはしません。[WHATWG HTML：Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

## 停止・異常と古いcallback

constructor失敗、startup/job timeout、worker error、messageerror、不正・重複メッセージではpool全体を停止します。各main側timerを取り消し、全Workerをterminateし、未完了をabortedにします。自動retryやworkerの自動補充は行いません。[WHATWG HTML：terminate](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate)

メッセージにはtype、要求ID、slot番号、世代を含め、callback側でも所有するWorkerオブジェクトのidentityと現在のpool世代を確認します。旧poolから遅れて処理されるcallbackが、新しい要求の集計や表を上書きしないためです。job timeoutのcallbackも、同じslotに同じ要求が残っているか確認します。

mainカウンターは待機中にも操作できます。停止ボタンのクリック処理自体は、mainで実行中のJavaScriptへ割り込む命令ではありません。このページはbusy loop、アニメーション、毎フレーム処理を行いません。ログはmainが受信・操作を記録した時刻で、paint完了時刻やCPU処理時間ではありません。

これは固定2worker・小さな入力・一括依頼の教材です。最適なworker数、実際のメモリ予算、priority、fairness、deadline、再試行やクラッシュ復旧を備えた汎用schedulerの完成品として扱うものではありません。受付上限はこのモデル内の未完了要求数の上限で、ブラウザ内部やOS全体のメモリ使用量を測って制限した値ではありません。

## 実行して確認した範囲

Windows上のブラウザで、ローカルHTTP配信した実験を確認しました（2026-11-05）。画面サイズは1280×900と390×844です。一括依頼、取消し・結果破棄、停止・再起動、初期化、mainカウンター、Enterキーでの一括依頼を試しています。

|操作|今回の観測|
|---|---|
|起動と一括依頼|ready 2を確認後、7件の依頼がrunning 2・waiting 4・accepted 6・rejected 1になった|
|待機先頭の取消し|waitingが4→3、queuedCancelledが1へ。要求3は未送信のまま終端になった|
|実行中の結果破棄指定|runningは2のまま、slotの一つがdiscard-pendingへ。返信前のdiscardedは0のままだった|
|最初の一括依頼の終了|completed 4・queuedCancelled 1・discarded 1・rejected 1。runningとwaitingは0で、accepted 6の集計が一致した|
|次の一括依頼を停止|破棄指定した一件も含め、未完了6件をabortedへ。既存の終端集計と重複しなかった|
|再起動後の通常完了|新しい6件の結果を採用。累計はaccepted 18・completed 10・queuedCancelled 1・discarded 1・aborted 6で一致。rejected 3は受理数の外に保たれた|
|履歴とログの上限|終端履歴は20件に収まり、古い行を除いた後も累計は保持。61件目のログ記録後は番号2〜61の最新60件を表示した|
|停止して初期化|集計・履歴・ログ・mainカウンターが0へ戻り、poolは停止。次の要求IDは22のまま保持した|

待機からのdispatch順は最初の実験で1→2→4→5→6となり、取り消した要求3は送信されませんでした。採用した各返信は件数16・合計120を検証しています。未完了中にもmainカウンターを操作できました。これらは固定入力とtimer待ちの観察で、CPU性能や最適なworker数の測定ではありません。

他ブラウザ、file://での案内、起動失敗・error・messageerror・不正返信・timeout・旧世代callbackの意図的な注入は未実測です。関連する検査と終了処理はコードをレビューしています。共有メモリ、実際のメモリ使用量、物理コピー回数、画面表示完了も測っていません。

## ソース全体

### HTML

<<< @/public/samples/browser/worker-pool-observation/index.html{html}

### CSS

<<< @/public/samples/browser/worker-pool-observation/styles.css{css}

### main.js

<<< @/public/samples/browser/worker-pool-observation/main.js{js}

### worker.js

<<< @/public/samples/browser/worker-pool-observation/worker.js{js}
