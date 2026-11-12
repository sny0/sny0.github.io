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
  summary: 平均60 FPSの表示間隔をグラフで見比べる。フレーム生成の例では同じ絵を等間隔と不等間隔で表示し、動きの違いを観察する。
  aliases: [フレームタイム, フレームペーシング, frame pacing, 表示間隔, p99, スタッター]
  verification: 仮想120 Hzのタイムラインを使用。フレーム生成の提示間隔はAMDの開発者向け資料に照合（2026-11-13）
---

# 同じ60 FPSで表示間隔を比べる

左から右へ動く目印を使って、一定の間隔で表示する場合と、表示間隔にばらつきがある場合を比べます。どちらも2秒で120フレームを表示するので、平均は60 FPSです。画面に新しい絵が出る時刻と、前の絵を保持する長さに注目します。[フレームタイムとフレームペーシングの解説](/graphics/optimization/frame-pacing.html)

<a href="/study/samples/graphics/frame-pacing-observation/index.html" target="_self">表示間隔の比較デモを開く</a>

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

## フレーム生成の等間隔と不等間隔を比べる

1. **比較する表示間隔**で **フレーム生成で間隔が不均等**を選びます。両方のレーンで、30 FPS相当の描画フレームの間に生成フレームを1枚ずつ挟みます。目印の位置もフレームの順番も共通です。
2. 一時停止し、時間のつまみを**20 ms付近**に合わせます。等間隔では約16.67 msから中間位置の絵が出ます。不等間隔では最初の絵が25 msまで残ります。両方のレーンで、画面に出ている絵の種類と時刻を見ます。
3. 4分の1速で再生します。不等間隔では描画フレームを25 ms、生成フレームを約8.33 msずつ表示します。長く残った後に次の2枚が続き、速度が変わったように見えます。グラフで高い段と低い段を確かめます。

どちらも2秒で120枚、平均60 FPSです。グラフの横軸は**表示時刻**、縦軸は画面に出た絵を保持する時間です。**絵の時刻**はその画像が表すシーンの時刻です。例えば2枚目が表す位置はどちらも約16.67 ms時点のものです。不等間隔のレーンでは、その絵を表示するのが25 msからになります。

この比較では、同じ描画位置とその中間位置をあらかじめ用意します。生成処理そのものや、その待ち時間は、[フレーム生成の記事](/graphics/postprocess/frame-generation.html)と[フレーム生成のオン・オフを比べる実践](/practice/graphics/frame-generation-observation.html)で扱います。

## ブラウザでどう再生するか

仮想ディスプレイの1更新は `1 / 120` 秒です。各フレームの表示開始時刻をあらかじめ求め、再生中は `requestAnimationFrame()` が渡すタイムスタンプから、二つの表示に共通する経過時刻を求めます。その時刻が入る表示区間の絵を選び、その絵が表すシーンの時刻から目印の位置を決めます。通常の比較では絵の時刻を各表示区間の開始時刻に合わせます。フレーム生成の比較では、絵の時刻を両レーンで約16.67 ms刻みにそろえます。[HTML仕様のAnimation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)

実際に目で見える動きはブラウザとディスプレイの描画機会にも左右されます。グラフと数値には仮想ディスプレイの計算結果を使います。

[3DCG・描画ロードマップの「GPU最適化」](/learn/roadmap.html?node=gfx-optimization#graphics)からも実践を開けます。

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
