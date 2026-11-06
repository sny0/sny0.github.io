---
title: FIFO・MAILBOX・IMMEDIATEで画面の切り替わりを比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: swap-chain-observation
  order: 1
  summary: 同じ描画完了時刻を3つの提示方式に与え、画面に出た絵、表示待ち、ティアリング、入力から最初に見えるまでの時間を比べる。
  aliases: [スワップチェーン, VSync, scanout, FIFO, MAILBOX, IMMEDIATE, ティアリング]
  verification: Nodeで全7走査の表示順と切り替え位置を検証し、Chromium系ブラウザで走査の切り替えと再生を確認（2026-11-06）
---

# FIFO・MAILBOX・IMMEDIATEで画面の切り替わりを比べる

仮想の60 Hzディスプレイに、右へ動く目印を描いたフレームA〜Gを渡します。3方式とも新しい絵を描き終える時刻は同じです。上から下へ順に画面を更新する1回分を選び、どの絵がどの高さに出るか、次に出す絵が待っているかを比べます。[スワップチェーンとVSyncの解説](/graphics/optimization/swap-chain-and-vsync.html)

<p><a href="/study/samples/graphics/swap-chain-observation/index.html" target="_blank" rel="noopener noreferrer">画面の切り替わりを比べる実験を開く</a></p>

## 2回目の走査を比べる

実験を開いたときに表示される、**16.67〜33.33 ms** の区間を見ます。この走査の開始前にはBとCが、走査中にはDとEが提示可能になります。

| 方式 | この走査で見える絵 | 走査が始まった直後の状態 |
| --- | --- | --- |
| FIFO | 上から下までB | Cは次の表示を待つ |
| MAILBOX | 上から下までC | BはCに置き換わり、表示されない |
| IMMEDIATE | 上からC → D → E | Cから走査を開始し、23 msと30 msで切り替わる |

IMMEDIATEの図では、上端から約38%と80%の位置で目印が横にずれます。走査中に表示元を切り替えたので、画面に異なるフレームの一部が並びます。これがティアリングです。「前の走査」「次の走査」や「順に再生」で、境目の位置と画面に出る絵の組み合わせを確かめられます。[Vulkan仕様の提示方式](https://docs.vulkan.org/refpages/latest/refpages/source/VkPresentModeKHR.html)

## フレームGが初めて見える時刻を探す

Gは **43 ms** の入力を反映し、**47 ms** に提示可能になります。後続の走査を順に見ると、最初にGが画面に出る時刻は次のように分かれます。

| 方式 | Gが最初に見える時刻 | 入力の取得からの時間 |
| --- | ---: | ---: |
| FIFO | 100 ms | 57 ms |
| MAILBOX | 50 ms | 7 ms |
| IMMEDIATE | 47 ms | 4 ms |

FIFOは待っている絵を古い順に出すため、Gまでに時間がかかります。MAILBOXではGが同じ走査を待っていたFを置き換えます。IMMEDIATEではGが現在の走査の下側から見え始めます。この実験の時間は、入力を取り込んでから、その入力を反映した絵の最初の行がモデル上で出るまでです。

## モデルの前提

1 msを3単位として扱い、60 Hzの走査1回を50単位で進めます。新しい絵が提示可能になる時刻と、走査を始める時刻をこの時間軸で比較します。画面の高さは0から1で表し、走査中の切り替え位置を経過時間の割合から求めます。

モデルには描画を予定どおり進められるだけの画像があり、画面は一定周期で走査します。OSの画面合成やディスプレイの画素応答は省略し、待ち行列と切り替えの関係を取り出しています。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/graphics/swap-chain-observation/index.html" download>index.html</a>
- <a href="/study/samples/graphics/swap-chain-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/graphics/swap-chain-observation/main.js" download>main.js</a>
- <a href="/study/samples/graphics/swap-chain-observation/presentation-engine.js" download>presentation-engine.js</a>
- <a href="/study/samples/graphics/swap-chain-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4202/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4202 --bind 127.0.0.1
```

## コード

### 走査する時刻ごとに表示元を決める

<<< @/public/samples/graphics/swap-chain-observation/presentation-engine.js{js}

### 選んだ走査を3方式で描く

<<< @/public/samples/graphics/swap-chain-observation/main.js{js}
