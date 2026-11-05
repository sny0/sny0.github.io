---
title: リングバッファの満杯・折り返し・読み出し順を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: ring-buffer-observation
  order: 1
  summary: 4枠のリングバッファを操作し、満杯で拒否された値の入れ直し、位置の折り返し、入れた順に値が出ることを確認する。
  aliases: [リングバッファ, ring buffer, circular buffer, SPSC, FIFO, enqueue, dequeue, 折り返し]
  verification: Node.jsで満杯・空・枠の再利用を検査し、Windowsのブラウザで二つのWorkerが12件を順番に受け渡すことを確認（2026-11-05）
---

# リングバッファの満杯・折り返し・読み出し順を観察する

整数を一つ入れるか、一つ取り出すたびに、4つの枠と二つの位置を見比べます。読み取り位置 `R` は次に取り出す枠、書き込み位置 `W` は次に書き込む候補です。空と満杯を二つの位置で区別するため、一度に保持できるのは3件です。[リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)

<p><a href="/study/samples/browser/ring-buffer-observation/index.html" target="_blank" rel="noopener noreferrer">リングバッファの実験を新しいタブで開く</a></p>

## 満杯になった枠を空けて使い回す

公開ページの操作欄では、通常の `ArrayBuffer` を使ってキュー本体を実行します。「最初に戻す」で `R = W = 0` に戻してから、「入れる」「取り出す」で操作します。入れる候補は、書き込みが成功したときだけ次の値に進みます。

| 操作 | 操作後の `R` | 操作後の `W` | 次に取り出せる順 |
| --- | --- | --- | --- |
| 10、20、30を入れる | 0 | 3 | 10、20、30 |
| 40を入れようとする | 0 | 3 | 10、20、30 |
| 10を取り出す | 1 | 3 | 20、30 |
| 40を入れ直す | 1 | 0 | 20、30、40 |
| 20を取り出す | 2 | 0 | 30、40 |
| 50を入れる | 2 | 1 | 30、40、50 |
| 3回取り出す | 1 | 1 | 空 |

満杯で40を入れようとすると、位置も中身もそのままです。10を取り出した後は枠3に40を書けます。書き込み位置が3から0へ戻り、20を取り出してから50を入れると枠0が再利用されます。値が置かれる物理的な順番と、取り出す順番を画面で比べます。

最後にもう一度取り出すと空と表示されます。枠を取り出したときに使える場所として扱うのは、読み取り位置が進むためです。コードではバイトを消去せず、画面ではキューに含まれる枠の値だけを表示します。

## 手元で動かす {#run-locally}

次の7ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/ring-buffer-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/ring-buffer-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/ring-buffer-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/ring-buffer-observation/ring-buffer.js" download>ring-buffer.js</a>
- <a href="/study/samples/browser/ring-buffer-observation/ring-worker.js" download>ring-worker.js</a>
- <a href="/study/samples/browser/ring-buffer-observation/server.py" download>server.py</a>
- <a href="/study/samples/browser/ring-buffer-observation/README.md" download>README.md</a>

Python 3で保存先のフォルダから次を実行します。ブラウザで `http://127.0.0.1:4188/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python server.py
```

付属サーバーは文書とWorkerのスクリプトに分離用の応答ヘッダーを付けます。この配信環境で、必要なAPIが使えるときにWorkerの実験ボタンが有効になります。公開ページでも上の操作欄は使えます。[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)

Workerの実験では、同じキュー本体を `SharedArrayBuffer` で使います。書き手が整数1から12までを順に入れ、読み手は取り出した値の順序を確認します。満杯や空で進めないときは、そのWorkerが間を置いて試し直します。画面は二つのWorkerが完了してから、成功した件数と順序の照合結果を表示します。

## コード

### 4枠のキューと読み書き位置

<<< @/public/samples/browser/ring-buffer-observation/ring-buffer.js{js}

### ページ側の操作と結果表示

<<< @/public/samples/browser/ring-buffer-observation/main.js{js}

### 書き手と読み手のWorker

<<< @/public/samples/browser/ring-buffer-observation/ring-worker.js{js}

### ローカル配信の分離用ヘッダー

<<< @/public/samples/browser/ring-buffer-observation/server.py{python}
