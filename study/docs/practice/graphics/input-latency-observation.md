---
title: 入力遅延を待ち時間と描画時間に分けてみる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: input-latency-observation
  order: 1
  summary: 入力を読む周期、GPUの待ち、画面の更新周期や表示位置を変え、入力から対象の行が更新されるまでをタイムラインで比べる。
  aliases: [入力遅延, input-to-photon, ポーリング周期, 走査, GPU待ち]
  verification: Nodeで全1500通りの設定を検証し、Chromium系ブラウザで走査の境界・設定変更・初期値への復帰を確認（2026-11-06）
---

# 入力遅延を待ち時間と描画時間に分けてみる

ゲームは時刻7 msに入力を受け取ります。CPUとGPUが処理し、入力を反映した絵が画面の対象位置に出るまでを追います。初期設定ではCPU処理が2 ms、GPUでの描画が4 msです。その前後の待ち時間を変え、絵が次の走査に間に合うかを比べます。[入力から画面に出るまでの仕組み](/graphics/optimization/input-to-display-latency.html)

<p><a href="/study/samples/graphics/input-latency-observation/index.html" target="_blank" rel="noopener noreferrer">入力遅延の実験を開く</a></p>

1. 初期設定ではGPUが3 ms待つため、描画完了は **17.00 ms** です。仮想60 Hzの **16.67 ms** の走査に間に合わず、画面中央に絵が出るのは **41.67 ms** です。
2. GPUの待ちを **1 ms** に変更します。描画完了が15 msになり、一つ前の走査に間に合います。入力が届いてから画面中央までの時間は **34.67 msから18.00 ms** に変わります。
3. 同じ設定で対象位置を上端から90%に動かします。描画完了時刻は変わらず、表示開始から対象の行までの時間だけが増えます。入力を読む周期や、60 Hzと120 Hzの切り替えも試せます。

計算では、描画が完了した時刻以降で最初の走査境界を選び、画面上の位置に比例した時間を足します。走査が始まる境界と描画完了が同時の場合は、その走査に間に合うと仮定します。OSの合成、入力機器、パネル応答を省いた仮想モデルです。

## 手元で動かす {#run-locally}

<a href="/study/samples/graphics/input-latency-observation/index.html" download>index.html</a>、<a href="/study/samples/graphics/input-latency-observation/styles.css" download>styles.css</a>、<a href="/study/samples/graphics/input-latency-observation/main.js" download>main.js</a>を同じフォルダに保存します。そのフォルダで次を実行し、ブラウザで `http://127.0.0.1:4203/` を開きます。停止はCtrl+Cです。

```powershell
python -m http.server 4203 --bind 127.0.0.1
```

## コード

<<< @/public/samples/graphics/input-latency-observation/main.js{js}

## 関連項目

- [フレーム生成](/graphics/postprocess/frame-generation.html)で、中間フレームを挿入するときの表示順と待ち時間を確認する。
