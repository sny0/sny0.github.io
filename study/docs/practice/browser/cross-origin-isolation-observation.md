---
title: Workerへのコピーと共有メモリをブラウザで観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: cross-origin-isolation-observation
  order: 1
  summary: WindowとWorkerの分離状態、ArrayBufferのコピーとSharedArrayBufferの共有、COEPが別オリジン画像に与える影響を比べる。
  aliases: [COOP, COEP, CORP, crossOriginIsolated, SharedArrayBuffer, Atomics, Web Worker, structured clone]
  verification: Windows上のブラウザで4種類の応答とコピー・共有・別オリジン画像の読み込みを実行確認（2026-11-05）
---

# Workerへのコピーと共有メモリをブラウザで観察する

1個の32ビット整数をWorkerへ渡し、Workerが0を1に変えたあと、Window側で何が読めるかを比べます。公開版ではArrayBufferのコピーと、いま開いているページの分離状態を確認できます。付属のローカル配信では、HTTP応答ヘッダーを切り替えて共有メモリの利用条件まで観察します。[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)

<p><a href="/study/samples/browser/cross-origin-isolation-observation/index.html" target="_blank" rel="noopener noreferrer">Workerと分離状態の実験を新しいタブで開く</a></p>

## 同じ整数をコピーする場合と共有する場合

| 操作 | Workerで読む値 | Workerの更新後にWindowで読む値 |
| --- | --- | --- |
| ArrayBuffer のコピー | 0 → 1 | 0 |
| SharedArrayBuffer の共有 | 0 → 1 | 1 |

「ArrayBuffer のコピーを試す」は、transfer listを渡さずに `postMessage()` します。構造化クローンでWorker側にバイト列のコピーができるため、Workerが書き換えてもWindowの配列は0のままです。転送時に送信元のバッファが切り離される動作は、別の実験で観察できます。[HTML Standardの構造化データ](https://html.spec.whatwg.org/multipage/structured-data.html#structured-data)、[Web Workerのコピーと転送](/practice/browser/worker-message-observation.html)

「SharedArrayBuffer の共有を試す」は、分離状態と必要なAPIを確認できた場合に使えます。Workerは `Atomics.add()` で1を足し、Windowは完了通知を受けてから `Atomics.load()` で読みます。2つの側で使うJavaScriptオブジェクトは別ですが、読み書きするデータは共有されています。[ECMAScriptのAtomics.add](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.add)、[Atomics.load](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.load)

画面の `isSecureContext`、Windowの `crossOriginIsolated`、APIの有無は、実際にブラウザから読んだ値です。Worker側の分離状態は、Workerを使う操作の結果として届きます。HTTPSでページを開けることと、クロスオリジン分離が成立していることは別々に確認します。

## ローカル配信で4種類の応答を比べる

次の6ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/cross-origin-isolation-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/cross-origin-isolation-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/cross-origin-isolation-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/cross-origin-isolation-observation/worker.js" download>worker.js</a>
- <a href="/study/samples/browser/cross-origin-isolation-observation/server.py" download>server.py</a>
- <a href="/study/samples/browser/cross-origin-isolation-observation/README.md" download>README.md</a>

Python 3.8以降で、保存したフォルダで次を実行します。ブラウザの新しいタブで `http://127.0.0.1:4194/plain/` を開きます。終了時はCtrl+Cで停止します。

```powershell
python server.py
```

| パス | ページ応答のCOOP | ページ応答のCOEP | Windowの `crossOriginIsolated` の目安 |
| --- | --- | --- | --- |
| `/plain/` | なし | なし | `false` |
| `/coop-only/` | `same-origin` | なし | `false` |
| `/coep-only/` | なし | `require-corp` | `false` |
| `/isolated/` | `same-origin` | `require-corp` | `true` |

ローカル版のページ上部にあるリンクでモードを切り替えます。各ページでコピーを試し、WindowとWorkerの分離状態を読みます。`/isolated/` では、共有も試してWindow側の値が1になることを確認します。開発者ツールのNetworkでは、ページの応答とWorkerスクリプトの応答を別々に確認できます。[HTML StandardのcrossOriginIsolated](https://html.spec.whatwg.org/multipage/webappapis.html#dom-crossoriginisolated)

## COEPと画像の読み込みを切り分ける

ローカル版の「2つの画像の読み込みを試す」は、別ポートの `127.0.0.1:4195` から、同じSVGを2種類の応答ヘッダーで読み込みます。どちらも `crossorigin` 属性を付けない画像です。

| ページのCOEP | CORPを付けない画像 | `Cross-Origin-Resource-Policy: cross-origin` 付きの画像 |
| --- | --- | --- |
| なし | `load` | `load` |
| `require-corp` | `error` | `load` |

`/coep-only/` でも、COEPの条件を満たさない画像は拒否されます。この比較では、画像を読み込む条件と、分離状態が成立して共有メモリを使える条件を分けて観察できます。画面に表示するのは画像要素のイベントです。拒否の理由はNetworkやConsoleの診断と照合します。[Fetch StandardのCORP検査](https://fetch.spec.whatwg.org/#cross-origin-resource-policy-check)

## コード

### Windowで値を送り、結果を読む

<<< @/public/samples/browser/cross-origin-isolation-observation/main.js{js}

### Workerで値を更新する

<<< @/public/samples/browser/cross-origin-isolation-observation/worker.js{js}

### ローカル配信の応答ヘッダー

<<< @/public/samples/browser/cross-origin-isolation-observation/server.py{python}
