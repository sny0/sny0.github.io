---
title: Workerの競合とAtomicsの待機・通知を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: atomics-observation
  order: 1
  summary: 二つのWorkerの更新順序をたどり、同じカウンターを増やす操作と、準備フラグを使ったデータの受け渡しを観察する。
  aliases: [Atomics, Atomics.add, Atomics.wait, Atomics.notify, SharedArrayBuffer, lost update, アトミック操作, 失われた更新]
  verification: Windowsのブラウザで実Workerの更新の取りこぼし、不可分な加算、待機・通知後のデータ読み取りを確認（2026-11-05）
---

# Workerの競合とAtomicsの待機・通知を観察する

同じカウンターを二つのWorkerから1ずつ増やします。読み取りと書き戻しを分けたときと、`Atomics.add()` でまとめたときに、何回分の更新が残るかを比べます。そのあと、フラグと通知を使ってWorker間で値を渡します。共有メモリと各操作の仕組みは辞典記事で確認できます。[Web Workerと共有メモリの同期](/browser/shared-memory-atomics.html)

<p><a href="/study/samples/browser/atomics-observation/index.html" target="_blank" rel="noopener noreferrer">WorkerとAtomicsの実験を新しいタブで開く</a></p>

## 公開ページで操作の順序をたどる

公開ページのステップ実験は、ボタンを押すたびに、あらかじめ選んだ順序でモデルの状態を一つ進めます。各実験はリセットして繰り返せます。

| 実験 | 操作の順序 | 最後に確認する値 |
| --- | --- | --- |
| 読み取りと書き戻しを分ける | Aが0を読む → Bが0を読む → Aが1を書く → Bが1を書く | カウンターは1 |
| 不可分に加算する | Aが加算して旧値0を得る → Bが加算して旧値1を得る | カウンターは2 |
| フラグでデータの準備を伝える | 受信側が待つ → 送信側が42を書く → フラグを1にする → 通知する → 受信側がフラグと値を読む | 受信側の値は42 |

最初の実験では、`Atomics.load()` と `Atomics.store()` がそれぞれアトミックでも、二つの呼び出しの間に別の処理が入ります。二番目では `Atomics.add()` が読み取り・加算・書き戻しを一つの操作として行います。[ECMAScriptのAtomics](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics-object)

## 手元で動かす

次の6ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/atomics-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/atomics-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/atomics-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/atomics-observation/worker.js" download>worker.js</a>
- <a href="/study/samples/browser/atomics-observation/server.py" download>server.py</a>
- <a href="/study/samples/browser/atomics-observation/README.md" download>README.md</a>

Python 3で、保存先のフォルダから次を実行します。ブラウザの新しいタブで `http://127.0.0.1:4187/` を開き、共有メモリの実測欄で `crossOriginIsolated` が `true` になったことを確かめます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python server.py
```

付属サーバーは文書とWorkerのスクリプトに、クロスオリジン分離に必要なヘッダーを付けます。公開ページでは現在の実行環境を表示し、分離と必要なAPIがそろうときに実測を有効にします。[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)

実測では、同じ `SharedArrayBuffer` から `Int32Array` のビューを作ります。添字0がカウンター、1が準備フラグ、2がデータです。実験ごとに新しいバッファを使います。

1. 読み取りと書き戻しを分ける実験では、ページ側が両方の読み取り結果を受け取ってから、書き戻しを指示します。両方が0を読んだ状態を作るため、最後に残る値は1です。
2. 不可分な加算では、どちらのWorkerが先に実行されても、二つの戻り値は0と1、最後に残る値は2になります。Worker名と戻り値の対応は実行順で変わります。
3. データの受け渡しでは、送信側が値42を書き、フラグを1にしてから通知します。受信側はフラグを確認してから値を読みます。待機が始まる前に通知されることもあるため、通知された件数と受信側の値を分けて確認します。

`Atomics.notify()` の戻り値は、その呼び出しで通知された待機の数です。待機に入る直前にフラグが変わると `Atomics.wait()` は `not-equal` を返します。受信側が最初の確認でフラグ1を読んだ場合は、待機する必要がありません。通知で `ok` が返った場合も、受信側はフラグを読み直してからデータを使います。[ECMAScriptのAtomics.wait](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.wait)、[Atomics.notify](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.notify)

## コード

### ページで操作の順序と結果を表示する

<<< @/public/samples/browser/atomics-observation/main.js{js}

### Workerで共有メモリを読み書きする

<<< @/public/samples/browser/atomics-observation/worker.js{js}

### ローカル配信で分離用のヘッダーを付ける

<<< @/public/samples/browser/atomics-observation/server.py{python}
