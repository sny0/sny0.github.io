---
title: Worker poolと待ち行列の制御 — 受付・実行・取消しを分ける
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: Workerを再利用するpoolを、受付上限、待ち行列、実行枠、結果の採用という別の状態で設計する。backpressureの上流への伝達、待機取消しと実行中の結果破棄、世代、終了、待ち時間とタイムアウトを整理する。
  aliases: [Worker pool, ワーカープール, job queue, 待ち行列, bounded queue, backpressure, バックプレッシャー, admission control, 受付制御, concurrency limit, slot, 実行枠, queued, running, dispatch, drain, shutdown, head-of-line blocking, starvation, 結果破棄, soft timeout]
  verification: 一次資料照合（2026-11-05）
---

# Worker poolと待ち行列の制御 — 受付・実行・取消しを分ける

**Worker pool**は、用意したWorkerを再利用し、仕事を割り当てるアプリ側の仕組みです。Web標準に、待ち行列の上限や取消しまで決めてくれる汎用のWorkerPool APIがあるわけではありません。**何件受け付けるか、何件を実行中として扱うか、不要になった結果をどう扱うか**を、自分の契約として決めます。

[Web Workerとメッセージ通信](/browser/web-workers-messages.html)の、別の実行環境、ready通知、コピー・移譲、要求IDと世代が前提です。ここでの**job**は、入力を渡して結果を得るアプリの仕事一件を指します。[イベントループ](/browser/event-loop-promises.html)のHTML taskや、言語仕様のECMAScript Jobとは同じ単位ではありません。[ECMAScript: Jobs and Host Operations](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-jobs)

## Workerの数と、仕事の数を分ける

仕事ごとにWorkerを作ると、スクリプトの取得・解析・初期化や、インスタンスごとのメモリなどの費用が繰り返し発生します。一定数を作って複数の仕事に再利用するのがpoolの基本です。ただし、長く生かす間に保持する状態や、仕事間に残してはいけないデータの初期化も必要です。[WHATWG HTML: Workersの用途と起動コスト](https://html.spec.whatwg.org/multipage/workers.html#workers)

Workerが2個だから、仕事も自動的に2件までになるわけではありません。`postMessage`は受信側のイベントループへ仕事を届ける仕組みにつながります。無制限に送れば、その先に待ちができます。また、WorkerがタイマーやPromiseを待つ設計なら、一つのWorkerに複数jobが入り込むこともあり得ます。「一つのWorkerでJavaScriptの同期処理を順に実行する」ことと、「一つのjobだけを担当させる」ことは別の契約です。[MDN: Worker.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage)

この章のモデルでは、一つのWorkerが担当する未完了jobを一つに制限します。**実行枠**（slot）は、jobを割り当てられる枠です。割り当てから終端結果を受け取るまで占有し、CPUが実際に計算中かどうかとは分けて数えます。

## 受付上限、待機上限、実行上限

仕事を送ろうとする操作を**submit**、Workerへ実際に渡す操作を**dispatch**と呼び、受付と区別します。実行枠がなければ、アプリが持つ待ち行列で**queued**として保持できます。これは、すでに送ったメッセージがブラウザ内部で待つこととは別です。

| 制御する数 | この章の実践の契約 |
| --- | --- |
| Worker数 | 2個を起動し、readyを確認する |
| 実行中の数 | Workerごとに1job、全体で最大2件 |
| アプリの待機数 | 未dispatchのjobを最大4件 |
| 受付できない場合 | 満杯、停止中などの理由を呼び出し元へ返す |

両Workerがreadyで、実行中も待機中も0件の状態から、同じ同期処理で7件をまとめて投入すると、受付直後は**実行2件・待機4件・拒否1件**になります。これはサンプルの固定ポリシーであり、Web APIが自動で決める上限ではありません。すでに仕事がある場合や、投入の間に完了を処理する場合は、同じ内訳になるとは限りません。

<figure>
  <img src="/images/browser/worker-pool-queue.svg" alt="準備済みで空のWorker poolへ7件を一括投入し、2件を実行、4件をアプリの待ち行列へ入れ、1件を拒否する受付制御の図" width="760" height="1510" loading="lazy">
  <figcaption>Worker数、実行枠、待機枠は別の上限です。2個・4件という数値は、状態を観察するための例であり、環境に応じた最適値ではありません。<a href="/study/images/browser/worker-pool-queue.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## 受付拒否を、上流の抑制へつなぐ

処理する側が追いつかないとき、その状況を作る側へ伝えて投入を抑える仕組みが**backpressure**です。Streamsの仕様にも、消費側の状況を上流へ伝える考え方があります。ただし、今回のpoolがStreams APIの自動制御を使うという意味ではありません。[WHATWG Streams: Pipe chains and backpressure](https://streams.spec.whatwg.org/#pipe-chains)、[MDN: Backpressure](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts#backpressure)

poolで満杯の要求を拒否しても、呼び出し元が即座に同じ要求を送り続ければ、受付処理やログなどの負荷は残ります。別の場所で無制限に再試行用の要求をためても、待ち行列を移しただけです。拒否を受けた側が、新しい入力を減らす、空きの通知まで待つ、不要な要求を作らない、といった動作へつなぐ必要があります。

例えば、画面に必要な最新のプレビューだけを残す、優先度の低い先読みを抑える、ユーザーへ混雑を表示する、という選択があります。どの要求を省けるかは製品の意味で決めます。全要求の実行が必要な処理で、黙ってdropすることを成功扱いにはしません。付属例は受付拒否を明示する教材で、呼び出し元を含む任意の上流全体が自動的に減速する実装ではありません。

## 件数だけでは、メモリと待ち時間を制限できない

4件の待機でも、一件が数十byteの場合と数百MBの場合では費用が違います。実製品では、待機入力、実行中入力、送信時のコピー、完了した結果、表示待ちの結果などの**保持bytes**も考えます。移譲を使う場合も、領域の所有者と寿命を決める必要があります。

待ち行列が短くても、一件の実行が長ければ待ち時間は伸びます。少なくとも、受付からdispatchまでの**待機時間**、dispatchから結果受信までの時間、受付から結果を利用するまでの時間を分けます。後者二つも、純粋なCPU計算時間そのものではありません。

**公正性**は、ある種類の要求だけが枠を占め続けないかという観点です。優先度の低い要求をいつまでも後回しにすれば、仕事が順番を得られない**飢餓**が起こり得ます。また、先頭の要求が条件待ちのため、後ろの実行可能な仕事まで止まる設計では、**head-of-line blocking**が問題になります。待ち行列の順序だけでなく、実行条件や結果を利用する側の待ち方も関係します。具体的な最適化手法の詳解は、この章の範囲に含めません。

## 投入順、完了順、表示順は別

同じ順でdispatchしても、別Workerのjobは同じ順で終わるとは限りません。短い仕事や、先に待ちが解けた仕事が先に返信できます。投入順に結果を表示したいなら、後続jobが先に完了した場合に、その結果を先行jobの完了まで保持するなど、別の規約が必要です。その場合、先頭の未完了結果を待つ間に、後続の完了結果が表示待ちになることもあります。

ページ側は、返信の`type`、要求`id`、poolの`generation`、担当slotなどを照合します。**どのjobが、どのWorkerの枠を占有しているか**を保持し、対応する結果だけでその枠を解放します。遅れた古い返信を、新しいjobの完了と取り違えてはいけません。DOMへ結果を反映することと、その結果が画面へ表示されたことも別です。

## queuedの取消しと、runningの結果破棄

未dispatchのjobなら、アプリの待ち行列から取り除き、その入力の保持を終えられます。この**待機取消し**は、Workerへまだ依頼していない仕事をなくす操作です。付属例では、待機行列の先頭一件を取り消して、待機数が減ることを観察します。

一方、**runningの結果破棄**は、Workerへ渡したjobの結果を採用しない操作です。Workerの計算やタイマー待ち自体を止めるものではありません。呼び出し元へ「取消済み」と伝える場合でも、内部のslot占有は、対応する終端結果を受け取るまで残します。

例えば、Worker Aのjobを結果破棄にした直後にAを空き扱いすると、Aに次のjobまで渡せてしまいます。一Worker一jobという契約が壊れ、旧返信で新jobの枠を解放する誤りにもつながります。**利用側の取消状態と、実行資源の占有状態を同じbool一つにしない**ことが重要です。

<figure>
  <img src="/images/browser/worker-pool-cancellation.svg" alt="未dispatchの待機取消しは行列から削除できる一方、実行中の結果破棄では返信までslotを保持し、停止と再起動では全Workerの終了と世代の更新を行う図" width="760" height="1510" loading="lazy">
  <figcaption>結果を不要にすることと、実処理を停止することは別です。実行中の結果破棄だけでslotを空きにすると、同じWorkerへ仕事を重ねてしまいます。<a href="/study/images/browser/worker-pool-cancellation.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

結果を破棄する場合も、正常な返信を検証し、対応jobの占有を解いてから次の待機jobを割り当てます。返信が来ない失敗は、結果破棄フラグだけでは解決しません。終了処理やタイムアウトなど、別の経路が必要です。

## 起動、error、タイムアウトで枠を見失わない

Workerの生成要求が戻っただけでは、アプリとしてreadyとは限りません。起動中のslotと、仕事を割り当てられる空きslotを分けます。生成時や`postMessage`時の同期例外、Workerの`error`、受信データの復元に関する`messageerror`、アプリの失敗返信も区別します。詳細は[前章のエラーと終了](/browser/web-workers-messages.html)につながります。

通信や処理が壊れたWorkerを、単に「空き」に戻して使い続けるのは危険です。pool全体を失敗として止めるか、そのWorkerを明示的に終了して入れ替えるかを決め、待っている要求へ結果を返します。起動失敗によりreadyがそろわない状態も、成功扱いにしません。

付属例のjob用8秒タイムアウトは、**dispatch時を起点とするsoft timeout**です。queuedで待っている時間を含む受付起点の8秒期限ではなく、待機jobには別の期限を設けていません。タイマーは正確な時刻で実行される保証がないため、8秒以内の応答や停止を保証する仕組みでもありません。[WHATWG HTML: Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

タイムアウトしたからといって、そのjobがWorkerへ届かなかった、実行されなかった、と確定するわけではありません。再試行をするなら、重複しても効果が増えない**冪等性**や、同じ操作の重複を検出するIDなどが関係します。副作用のある処理を、応答がないという理由だけで繰り返すのは別の設計問題です。今回のサンプルは自動再試行を行いません。

## drainと、即時停止を分ける

**drain**は、新規受付を止め、受け付け済みの仕事を処理し終えてから閉じる方式です。どの待機jobまで実行するか、いつ完了とするか、終わらない仕事の扱いを決めます。**即時停止**では、待機jobを取り消し、実行中Workerをterminateするなどして、そのpoolの利用を終えます。どちらもアプリが定めるshutdownの方針です。

`terminate()`は、Worker側の`finally`や返信の完走を保証しません。付属例のstopは全Workerをterminateし、その世代の待機・実行中の管理を終了します。restartでは新しい世代と新しいWorkerを作り、readyを確認します。古いイベントで新しいslotやUIを変更しないよう、世代を照合します。世代の更新だけで旧Workerが停止するわけではありません。[WHATWG HTML: Terminate a worker](https://html.spec.whatwg.org/multipage/workers.html#terminate-a-worker)

## 固定サンプルが示すことと、測っていないこと

[Worker poolの受付と取消しの実践](/practice/browser/worker-pool-observation.html)は、同じ配信元のHTTP(S)ページと外部classic Workerで動かします。2個のWorker、待機4件、一括7件投入、待機先頭の取消し、実行中一件の結果破棄、stopとrestartを観察します。

各jobは16個の値0～15の合計120を求め、3000msのタイマーを使って返信を遅らせます。待機や取消しを操作しやすくするための遅延であり、3秒間CPUを使い切る仕事でも、重い計算を並列化する性能測定でもありません。待機時間を含む全jobの完了時刻や、Worker間の返信順は固定しません。

`navigator.hardwareConcurrency`は、ブラウザへ潜在的に利用可能な論理プロセッサ数に関する情報です。実際より小さい値が返る場合もあり、poolの最適Worker数を返すAPIではありません。メインスレッド、メモリ、他の処理、jobの粒度や受け渡し費用も関わるため、この値と同じ数を作れば最速とは限りません。今回の2個は観察用の固定値です。[MDN: hardwareConcurrency](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency)

同じ考え方は[ゲームのアセットロード設計](/game/asset-loading.html)の、I/O要求数、展開・変換のCPU仕事、GPU登録、保持bytesなどの段階別の予算につながります。一段のWorker数だけで、ロード全体の負荷は制御できません。SharedArrayBuffer／Atomicsによる共有キューや、poolの最適化アルゴリズムは、この章では追加しません。
