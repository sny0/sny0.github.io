---
title: イベントループ・Promise・async/await — 実行順と描画の関係
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: ブラウザのJavaScriptで、同期実行、task、microtask、Promiseの状態確定、await後の継続を分けて説明する。非同期I/OとCPU仕事、タイマーと描画の機会、エラー処理と実行順の観測の限界を整理する。
  aliases: [event loop, イベントループ, task, task source, microtask, マイクロタスク, microtask checkpoint, run-to-completion, execution stack, Promise, executor, settlement, reaction, async, await, continuation, 継続, queueMicrotask, setTimeout, requestAnimationFrame, starvation]
  verification: 一次資料照合（2026-11-04）
---

# イベントループ・Promise・async/await — 実行順と描画の関係

ブラウザでは、クリックへの反応、タイマー、通信の結果、画面の更新などが進みます。しかし、JavaScriptの文をすべて同時に実行しているわけではありません。**今実行している処理、後で実行する処理、結果を待っている処理を分ける仕組み**が、イベントループやPromiseです。

ここではWebページのWindowを対象に、言語を定めるECMAScriptと、taskや描画を定めるHTMLの仕様を組み合わせて説明します。Node.js固有の実行順や、C#のTask／awaitの実行基盤まで同じ規則として扱いません。

## 実行スタックとrun-to-completion

**実行スタック**は、呼び出し中の関数などの実行状態を積み重ねて管理する仕組みです。関数AがBを呼ぶと、その場でBを実行し、Bから戻るとAの続きを実行します。通常の関数呼び出しをすべて後で実行するためのキューに入れるわけではありません。

同じ実行主体の通常の同期処理は、途中に別のタイマーコールバックやPromiseのハンドラーが勝手に割り込む形では進みません。この性質を**run-to-completion**と呼びます。ただし、呼び出した関数から別の関数を同期的に呼ぶことはあります。例えば`dispatchEvent()`は、対象のイベントリスナーを同期的に呼びます。「コールバックという名前なら必ず後で動く」とも限りません。[MDN: JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model#run-to-completion)、[MDN: dispatchEvent](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)

これはOSがそのスレッドを途中でスケジュールし直さないという保証でも、ブラウザ全体が単一スレッドという意味でもありません。[ブラウザの描画](/browser/rendering-journey.html)で述べた通信・合成などの仕事は、別の処理主体でも進みます。また、async関数の`await`による中断をまたいで、関数全体が一続きに実行されるわけではありません。

## taskは、万能なFIFO一つに並ぶ仕事ではない

HTMLの**task**は、イベントを配送する、タイマーのコールバックを呼ぶ、取得したリソースを処理するなどの仕事を表します。イベントループは、実行可能なtaskを選び、その処理を進めます。「イベントループ」は、イベントだけを扱うループという意味ではありません。

taskには**task source**という由来の区分があります。ユーザー操作、タイマー、ネットワークなどの関連する仕事をまとめ、順序を管理するための区分です。イベントループには一つ以上のtask queueがあり、ブラウザは実行可能な仕事のあるキューを選びます。同じsourceで定められる順序は保ちますが、異なるsourceを含む全taskが、登録時刻順の一つのFIFOで必ず処理されるというモデルではありません。FIFOは、先に入れたものから先に取り出す方式です。[WHATWG HTML: Event loops / Definitions](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)

通常のtaskを「macrotask」と呼ぶ解説もありますが、ここではHTML仕様に合わせてtaskと呼びます。microtaskは通常のtask queueとは別です。すべてのイベント発火が独立したtaskになるわけでもありません。

## microtask checkpointは、追加分も含めて処理する

**microtask**は、`queueMicrotask()`で予約する処理や、Promiseの反応を実行するjobなどに使われます。ECMAScript側のPromise jobは、HTML側の仕組みによってmicrotaskとして予約されます。

**microtask checkpoint**は、microtask queueの仕事を取り出して進める節目です。通常のtaskの終了時だけでなく、スクリプト実行後の後始末など、仕様で定めた箇所にもあります。普通のJavaScriptの実行スタックが残っている途中へ、任意に割り込む処理としては考えません。[WHATWG HTML: HostEnqueuePromiseJob / microtask checkpoint](https://html.spec.whatwg.org/multipage/webappapis.html#hostenqueuepromisejob)

checkpointでは、キューが空になるまで処理します。あるmicrotaskが新しいmicrotaskを追加した場合、その追加分も対象です。例えばM1、M2の順で待っていて、M1の中でM3を追加すると、単純なこの例ではM1→M2→M3と進みます。M1の途中にM3が割り込むわけではありません。[MDN: Using microtasks](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide#tasks_vs._microtasks)

microtaskが無制限に次を追加し続けると、次のtaskや描画更新へ進めなくなることがあります。必要な仕事が順番を得られない状態を**飢餓**（starvation）と呼びます。「小さく分割してPromiseでつないだ」だけでは、入力や描画に処理を譲ったことにはなりません。付属の実験は有限回にとどめます。

<figure>
  <img src="/images/browser/event-loop-cycle.svg" alt="複数のtask sourcesから選ぶtask、microtask checkpointで追加分まで処理する流れ、条件が合ったときの描画更新を分けて示す概念図" width="760" height="1510" loading="lazy">
  <figcaption>taskの実行、microtaskの処理、描画の機会を区別します。これは「task一回につき必ず一回Paintする」という固定周期の図ではありません。<a href="/study/images/browser/event-loop-cycle.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## Promiseの状態が決まることと、thenが実行されること

**Promise**は、後で利用できる結果や失敗を表すオブジェクトです。主な状態は次の三つです。

| 状態 | 意味 |
| --- | --- |
| pending | 結果がまだ確定していない |
| fulfilled | 成功側の結果が確定した |
| rejected | 失敗側の理由が確定した |

fulfilledまたはrejectedになることを**settlement**と呼びます。`then()`で登録したハンドラーなど、その結果に対する処理が**reaction**です。状態が確定することと、reactionを実行することには時間的な区別があります。なお、`resolve()`には別のPromiseなどの結果に追従させる役割もあるため、「resolveを呼んだ瞬間、必ずfulfilledになる」とは限りません。[MDN: Promiseの状態](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#description)

`new Promise(executor)`の**executor**は、Promiseを作るときに呼ばれる関数です。これは同期的に実行されます。一方、`then()`に渡したハンドラーは、すでにfulfilledのPromiseでも、`then()`の呼び出しの中で直ちに実行する形にはなりません。

```js
console.log("start");
const p = new Promise((resolve) => {
  console.log("executor");
  resolve(42);
  console.log("after resolve");
});
p.then((value) => console.log("reaction", value));
console.log("end");
```

この例の順序は、`start`→`executor`→`after resolve`→`end`→`reaction 42`です。`resolve(42)`はexecutorからの`return`でもありません。`then()`自身は新しいPromiseを返し、そのハンドラーの返り値や例外は、後続のPromiseの結果に関わります。[ECMAScript: Promise constructor / PerformPromiseThen](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-executor)

## async関数は、awaitまで同期的に進む

**async関数**はPromiseを返します。呼び出すと、最初の`await`に到達するまでの本体は同期的に進みます。`await`がない本体も同期的に実行されます。「asyncを付けた関数は、最初から全部が後回し」という意味ではありません。[MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function#description)

**await**は、対象の値をPromiseとして扱い、その結果に応じて関数の続きへ進む仕組みです。中断した位置や必要な実行状態を保持し、後の**継続**として再開します。待つ対象がすでにfulfilledでも、`await`の後を同じ同期的な呼び出しの続きとして実行するわけではありません。呼び出し元へ制御が戻り、後のPromise reactionによって再開します。[ECMAScript: Await](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#await)

```js
async function example() {
  console.log("before await");
  const value = await Promise.resolve(7);
  console.log("after await", value);
  return value;
}
const result = example();
console.log("caller continues");
result.then((value) => console.log("result", value));
```

順序は`before await`→`caller continues`→`after await 7`→`result 7`です。`result`は数値7そのものではなく、このasync関数の結果を表すPromiseです。`await`は新しいOSスレッドを作る命令ではありません。また、`await`に渡す式そのものの評価まで後回しになるわけではないため、`await expensiveFunction()`の関数呼び出しに重い同期処理があれば、その処理は先に実行します。[MDN: awaitの制御フロー](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#control_flow_effects_of_await)

<figure>
  <img src="/images/browser/async-await-flow.svg" alt="async関数のawait前の同期実行、Promiseを返して呼び出し元が進むこと、結果に応じて後の継続で再開することを示す図" width="760" height="1510" loading="lazy">
  <figcaption><code>await</code>は関数を中断・再開できる形にし、結果に依存する続きの実行を分けます。別スレッドの新設や、待つ間に必ず画面を表示することを意味しません。<a href="/study/images/browser/async-await-flow.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## 非同期I/Oの待ちと、CPUで計算する仕事は別

[HTTP](/network/http-messages.html)などの通信が非同期に進む場合、アプリのJavaScriptが待ち時間中ずっと同期ループを回す必要はありません。ブラウザやOS側で処理が進み、利用可能な結果をJavaScriptへ知らせる仕組みにつながります。I/Oの開始、完了の通知、アプリの継続という区別は[非同期ファイルI/O](/os/asynchronous-file-io.html)とも共通する観点です。ただし、ブラウザAPIとWin32／.NETのAPIが同じ内部経路とは限りません。

一方、Promiseのexecutorや`then`、`await`後に大量の計算を書くと、それを実行する時間は必要です。Promiseで包んでもCPU仕事が自動的に並列化されたり、メインスレッドから移ったりはしません。重い同期処理が長く続けば、メインスレッドで実行する入力への反応や描画側の仕事を遅らせ得ます。[web.dev: Optimize long tasks](https://web.dev/articles/optimize-long-tasks)

別の実行主体でJavaScriptを動かす[Web Worker](/browser/web-workers-messages.html)は、この問題と関係する別の仕組みです。DOMへ直接アクセスできる範囲や、メッセージでの受け渡しなどが変わるため、Promiseの言い換えとしては扱いません。Workerへの依頼と結果の受信、データのコピー・転送は専用の記事で説明します。

## timerの0と、requestAnimationFrameは別の指定

`setTimeout(callback, 0)`は、「今この場所で実行」でも「正確に0ミリ秒後に実行」でもありません。タイマーの条件を満たした後、コールバックを実行するtaskへつながります。現在の同期処理やmicrotask、ほかの仕事、ブラウザの抑制などの影響を受けます。入れ子になったタイマーの最小待ち時間の規則もあります。指定時間は、実行時刻の保証や精密なフレーム時計ではありません。[WHATWG HTML: Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

**requestAnimationFrame**（rAF）は、描画更新の機会と関係して呼ぶコールバックの予約です。2026-11-04に確認したHTML仕様は、描画の機会に応じてrendering task sourceへ更新の仕事を予約するモデルを定めています。どのtaskの直後にも必ず描画する、という規則ではありません。[WHATWG HTML: Update the rendering](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering)

rAFのコールバックは、画面への表示が終わったことの通知ではありません。`await Promise.resolve()`の後まで来たことも、「一度Paintした」「変更がディスプレイに表示済み」という証拠にはなりません。タイマーとrAFを両方予約したとき、互いの順序や間隔を固定して前提にすることも避けます。非表示ページではrAFの実行が遅延・抑制され得ます。[WHATWG HTML: Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)、[MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

## 同期例外とPromiseのrejection

Promiseの失敗はrejectedという結果で伝わります。async関数内で`await p`したとき、`p`がrejectedなら、その`await`の位置で失敗の理由をthrowした形になり、周囲の`try`／`catch`で扱えます。

async関数の`try`内で`return await p`する場合と、`return p`する場合は、その関数の`catch`で後のrejectionを捕まえたいときに違いがあります。後者はPromiseを返すので、将来その結果がrejectedになっても、その`catch`へ戻ってくるわけではありません。呼び出し元で`await`や`catch()`を使い、失敗を受け取る設計もできます。[MDN: awaitによるrejection処理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#handling_rejected_promises)

また、`then`のハンドラーがthrowした場合は、`then`が返すPromiseのrejectionにつながります。`queueMicrotask`のコールバックがthrowした場合の例外報告とは区別します。未処理のrejectionが報告されることと、例外を適切な場所で処理できていることも別です。[MDN: queueMicrotaskと例外](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide#enqueueing_microtasks)

## 実行順の観察で分かること

[イベントループとPromiseの実践](/practice/browser/event-loop-observation.html)では、外部依存のないHTML・CSS・classic JavaScriptで、同期処理、Promise、microtask、タイマー、rAFのログを比べます。無限ループや無制限のmicrotask連鎖は実行しません。

ログから分かるのは、記録用の関数が呼ばれた順序や、その時点で取得した時刻です。DOM上のログ行は、後でまとめて画面に現れる場合があります。ログの先後と、各行が物理ディスプレイへ提示された先後は同じ測定ではありません。描画処理の実行や所要時間を調べる場合は、前章と同様、開発者ツールなどによる別の観測が必要です。
