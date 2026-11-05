# Web Workerと共有メモリの同期を観察する

[公開サンプル](https://sny0.com/study/samples/browser/atomics-observation/index.html)の手順モデルで「次の操作」を押すと、2つのWorkerが同じ値を読む場合と、`Atomics.add()` で値を増やす場合を比べられます。データを書いてから準備完了フラグを立て、待ち手に通知する順序も追えます。[実践手順とコード](https://sny0.com/study/practice/browser/atomics-observation.html)

## 実際に2つのWorkerを動かす

`index.html`、`styles.css`、`main.js`、`worker.js`、`server.py` を同じフォルダに保存し、Python 3で実行します。

```powershell
python server.py
```

`http://127.0.0.1:4187/` をブラウザのアドレスバーで開きます。HTMLに `Cross-Origin-Opener-Policy: same-origin` と `Cross-Origin-Embedder-Policy: require-corp`、`worker.js` に同じCOEPを付けています。実Workerの操作は、ページがクロスオリジン分離され、ブラウザで共有メモリとWorkerを利用できる場合に使えます。サーバーは指定のファイルのみをIPv4ループバックで配信します。終わったらCtrl+Cで停止します。[クロスオリジン分離と共有メモリ](https://sny0.com/study/browser/cross-origin-isolation.html)

| ボタン | 観察する値 |
| --- | --- |
| Workerで分けて加算 | 両Workerが0を読み、両方が1を書くので最終値は1。 |
| Workerで不可分に加算 | `Atomics.add()` が返す更新前の値は0と1。先に更新するWorkerは実行ごとに変わり得る。最終値は2。 |
| Workerで待機と通知を実行 | 書き手がデータ42を書き、フラグを1にしてから通知する。待ち手はフラグ1を読んでデータ42を読む。 |

`wait()` の直前にフラグが変わると `not-equal` で戻り、通知で起こした待ち手の数は0になる場合があります。実際に待ってから通知されれば `ok` で戻ります。待ち手は戻るたびにフラグを読み直し、2秒の待機期限に達した場合も最後に読んだフラグでデータの有無を判断します。[ECMAScriptのAtomics.wait](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.wait)
