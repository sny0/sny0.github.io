---
title: 同じ60 FPSで表示間隔を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: frame-pacing-observation
  order: 1
  summary: 平均60 FPSで表示する二つの動きを再生し、表示間隔が長くなる時刻を共通のグラフで調べる。
  aliases: [フレームタイム, フレームペーシング, frame pacing, 表示間隔, p99, スタッター]
  verification: Nodeで全フレームの切り替え境界と3パターンの集計を検証し、Chromium系ブラウザで再生と比較画面を確認（2026-11-06）
---

# 同じ60 FPSで表示間隔を比べる

左から右へ動く目印を使って、一定の間隔で表示する場合と、表示間隔にばらつきがある場合を比べます。どちらも2秒で120フレームを表示するので、平均は60 FPSです。画面に新しい絵が出る時刻と、前の絵を保持する長さに注目します。[フレームタイムとフレームペーシングの解説](/graphics/optimization/frame-pacing.html)

<p><a href="/study/samples/graphics/frame-pacing-observation/index.html" target="_blank" rel="noopener noreferrer">表示間隔の実験を新しいタブで開く</a></p>

## 目印とグラフを見比べる

1. 比較する表示間隔を **ときどき長く止まる** にして再生します。二つの目印は同じ速さで進む動きを表しますが、新しい位置を表示する時刻が違います。4分の1速にすると、同じ絵を保持する長さの差を追いやすくなります。グラフの時刻と統計はモデル上の値を示します。
2. **最長のフレームを見る**を押します。最初の長い区間は **500〜550 ms** です。目印は500 msの位置で50 ms止まり、次の4フレームはそれぞれ約8.33 msだけ表示されます。スライダーで区間の前後をたどれます。
3. 短い間隔と長い間隔が交互に来るパターンに切り替えます。最大は25 msに下がりますが、60 FPSの目安である約16.67 msを超える回数は2回から60回に増えます。どれくらい長く表示が止まるかと、長い間隔が何回あるかを分けて読みます。

| パターン | 平均FPS | 平均表示間隔 | p99 | 最長 | 約16.67 msを超える回数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 一定間隔 | 60 | 16.67 ms | 16.67 ms | 16.67 ms | 0 |
| 50 msの間隔が2回 | 60 | 16.67 ms | 50.00 ms | 50.00 ms | 2 |
| 8.33 msと25 msが交互 | 60 | 16.67 ms | 25.00 ms | 25.00 ms | 60 |

p99は表示間隔を短い順に並べた120個のうち119番目（`ceil(0.99 × 120)`）の値です。時刻や間隔の計算には仮想120 Hzの整数の更新回数を使い、画面にはミリ秒に換算して表示します。回数の判定は丸める前に2更新分を超えたかで行います。

## ブラウザでどう再生するか

仮想ディスプレイの1更新は `1 / 120` 秒です。各フレームの表示開始時刻をあらかじめ求め、再生中は `requestAnimationFrame()` が渡すタイムスタンプから、二つの表示に共通する経過時刻を求めます。その時刻が入る区間を選び、目印を区間の開始時刻に対応する位置で描きます。グラフの横軸は共通の経過時刻、縦軸はその時点のフレームを保持する時間です。[HTML仕様のAnimation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)

実際に目で見える動きはブラウザとディスプレイの描画機会にも左右されます。グラフと数値には仮想ディスプレイの計算結果を使います。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/graphics/frame-pacing-observation/index.html" download>index.html</a>
- <a href="/study/samples/graphics/frame-pacing-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/graphics/frame-pacing-observation/main.js" download>main.js</a>
- <a href="/study/samples/graphics/frame-pacing-observation/pacing-engine.js" download>pacing-engine.js</a>
- <a href="/study/samples/graphics/frame-pacing-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4201/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4201 --bind 127.0.0.1
```

## コード

### 表示区間と統計を求める

<<< @/public/samples/graphics/frame-pacing-observation/pacing-engine.js{js}

### 再生時刻に合わせて目印とグラフを更新する

<<< @/public/samples/graphics/frame-pacing-observation/main.js{js}
