---
title: Web Workerと共有メモリの同期 — Atomics・競合・待機
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 二つのWorkerが同じ整数を更新するときの更新の取りこぼしと、Atomicsによる不可分な加算、フラグを使ったデータの受け渡しを図解する。
  aliases: [Web Worker, Dedicated Worker, SharedArrayBuffer, 共有メモリ, Atomics, Atomics.add, Atomics.load, Atomics.store, Atomics.wait, Atomics.notify, RMW, lost update, 更新の取りこぼし, 条件待ち]
  verification: ECMAScriptのAtomics・メモリモデルとWHATWG HTMLのエージェントの定義に照合（2026-11-05）
---

# Web Workerと共有メモリの同期 — Atomics・競合・待機

二つのWorkerが同じ `SharedArrayBuffer` に `Int32Array` のビューを作ると、別々のJavaScript実行環境から同じバイト列を読み書きできます。カウンターを一つ増やす場合でも、どの処理をまとめるかで結果が変わります。値を渡す場合は、受け取り側が読み始めてよい時点も決めます。ここでは整数一つの加算と、準備完了を知らせるフラグを使って、この二つを観察します。[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)、[Web Workerとメッセージ通信](/browser/web-workers-messages.html)

## 個々の読み書きが不可分でも更新を取りこぼす

共有カウンター `view[0]` を0から始めます。Worker AとBがそれぞれ `Atomics.load(view, 0)` で読んで、取得した値に1を足し、`Atomics.store(view, 0, old + 1)` で書き戻すとします。AとBの両方が先に読んだ場合、それぞれが持つ `old` は0です。両方の書き戻しが終わった時点のカウンターは1になります。この現象を**更新の取りこぼし**（lost update）と呼びます。[ECMAScriptのAtomics.load](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.load)、[Atomics.store](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.store)

`Atomics.load` と `Atomics.store` はそれぞれ一つのアトミック操作です。二つの呼び出しの間には、別のWorkerの操作が入れます。実践では両方のWorkerの読み取りが終わってから書き戻しを指示し、取りこぼしが起きる順序を再現します。

## Atomics.addで読み取りと書き戻しを一つにする

`Atomics.add(view, 0, 1)` は、同じ要素の現在値を読み、加算し、書き戻すところまでを一つのアトミック操作として扱います。この操作を **read-modify-write**（RMW）と呼びます。戻り値は**加算前の値**です。0から一度ずつ呼ぶと、一方は0を返して1を書き、もう一方は1を返して2を書きます。どちらのWorkerが0を返すかは実行順によります。[ECMAScriptのAtomics.add](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.add)、[メモリモデルの基本](https://tc39.es/ecma262/multipage/memory-model.html#sec-memory-model-fundamentals)

<figure class="study-figure">
  <img src="/images/browser/atomics-lost-update.svg" alt="別々のloadとstoreではWorker AとBがともに0を読み、ともに1を書き、結果は1になる。Atomics.addでは先のWorkerが0を返して1を書き、次のWorkerが1を返して2を書き、結果は2になる。" width="760" height="1000" loading="lazy">
  <figcaption>同じ初期値から、操作の単位を変えたときの結果を比べます。下段はAが先に加算した例です。<a href="/study/images/browser/atomics-lost-update.svg" target="_blank" rel="noopener noreferrer">更新の取りこぼしと不可分な加算を拡大</a></figcaption>
</figure>

`Atomics.add` がまとめるのは対象の一要素です。例えば「残数と消費数の合計は常に初期在庫に等しい」という条件を守りたいとき、残数を減らす操作と消費数を増やす操作を別々に実行すると、読み手が途中の組を観察できます。どの値を一緒に変更・観察するかを決め、同じロックで守るか、更新を担当するWorkerを一つにして状態をメッセージで渡すなどの設計を選びます。[スレッドと同期](/runtime/thread-synchronization.html)、[ECMAScriptの共有メモリの指針](https://tc39.es/ecma262/multipage/memory-model.html#sec-shared-memory-guidelines)

## データを書き、フラグを立ててから通知する

一回だけ整数42を渡す例を考えます。実践の `Int32Array` では、添字1（`Ready`）に準備フラグ、添字2（`Payload`）に受け渡すデータを置きます。フラグの初期値は0です。送り手のWorkerはデータを書き、`Atomics.store` でフラグを1にして、同じフラグ位置へ `Atomics.notify` を呼びます。受け手は `Atomics.load` でその1を読んでからデータを読みます。フラグに対する書き込みと、その1を読んだ操作が同期するので、データの書き込みが受け手の読み取りに先行します。実践では実行ごとに新しいバッファを用意し、データを一度だけ書き込みます。[ECMAScriptのsynchronizes-with](https://tc39.es/ecma262/multipage/memory-model.html#sec-synchronizes-with)、[happens-before](https://tc39.es/ecma262/multipage/memory-model.html#sec-happens-before)

<figure class="study-figure">
  <img src="/images/browser/atomics-wait-notify.svg" alt="受け手のWorkerはフラグが0なら待機を試みる。送り手はデータを書いてフラグを1にしてから通知する。受け手は待機から戻ったらフラグを読み直し、1を確認してデータを読む。最初に0を読んだ後、waitの比較より先にフラグが1になった場合は待機せずに戻る。" width="760" height="1100" loading="lazy">
  <figcaption>通知で待機を解除し、フラグの値で読み取りの可否を判断します。<a href="/study/images/browser/atomics-wait-notify.svg" target="_blank" rel="noopener noreferrer">待機と通知の流れを拡大</a></figcaption>
</figure>

## Atomics.waitの戻り値とフラグを区別する

受け手のWorkerは、フラグが0の間に `Atomics.wait(view, flagIndex, 0, timeoutMs)` を呼びます。 `wait` は同じ位置をもう一度検査し、期待した値と一致する場合だけ待機に入ります。待機先は、共有データブロック内の該当位置に対応する待機リストです。 `wait` と `notify` の対象に使うビューの型は `Int32Array` または `BigInt64Array` です。[ECMAScriptのAtomics.wait](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.wait)、[DoWait](https://tc39.es/ecma262/multipage/structured-data.html#sec-dowait)、[Atomics.notify](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.notify)

| `Atomics.wait` の戻り値 | 何が起きたか |
| --- | --- |
| `"ok"` | 待機に入り、`Atomics.notify` で待機が解除された |
| `"not-equal"` | `wait` の検査で値が期待値と異なり、待機に入らなかった |
| `"timed-out"` | 待機時間が満了した |

`Atomics.notify(view, flagIndex, 1)` の戻り値は、通知した待機者の数です。通知だけではフラグが変わらないので、受け手は待機から戻ったあとにフラグを読み直し、条件がそろうまで待ち直すか、制限時間で打ち切ります。最初の `load` と `wait` の間に送り手がフラグを1にした場合、`wait` の比較で `"not-equal"` が返ります。最初から1を読んだ場合は待機を省けます。待機者がまだいなければ `notify` は0を返し、フラグに書いた1が残ります。[ECMAScriptのDoWait](https://tc39.es/ecma262/multipage/structured-data.html#sec-dowait)、[Atomics.notify](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.notify)

ブラウザのページ側のメインスレッドでは、`Atomics.wait` は `TypeError` になります。実践では、ページが二つのDedicated Workerに操作を指示します。待機中は受け手のWorkerが次のメッセージを処理できないので、もう一方のWorkerがデータとフラグを書いて通知します。[WHATWG HTMLのエージェントの定義](https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-agent-formalism)、[ECMAScriptのDoWait](https://tc39.es/ecma262/multipage/structured-data.html#sec-dowait)

## 実践との対応

公開ページのステップ実験では、操作の順番と値の変化を一つずつ追えます。実際のWorkerで動かすには、ページとWorkerが `SharedArrayBuffer` を共有できる配信環境が必要です。実践ページには、クロスオリジン分離に必要な応答ヘッダーを付けてローカルで配信する手順もあります。[Workerの競合とAtomicsの待機・通知を観察する](/practice/browser/atomics-observation.html)

複数の値を順番に受け渡し、読み終えた枠を使い回す例は、[リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)で扱います。
