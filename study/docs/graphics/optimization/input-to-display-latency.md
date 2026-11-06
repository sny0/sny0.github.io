---
title: 入力から画面に出るまでの遅延
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 入力を読んだ時点から画面の対象位置が更新されるまでを追い、入力待ち、CPU・GPUの処理と待ち、表示待ちを分けて調べる。
  aliases: [入力遅延, input latency, input-to-photon, click-to-photon, ポーリング, レンダーキュー, scanout, 入力マーカー]
---

# 入力から画面に出るまでの遅延

クリックして発射しても、同じ瞬間に発射の絵が出るわけではありません。入力機器とOSからゲームに情報が届き、ゲームが入力を反映した状態を作り、GPUが描き、ディスプレイがその絵を読み出します。**入力遅延**を測るときは、「マウスを押した瞬間」「OSが受け取った時刻」「ゲームが入力を読んだ時刻」のどこを始点にするかを決めます。画面上の変化を光として検知する場合は、測る位置と検知条件も終点の一部です。[NVIDIAのPC遅延とシステム遅延の解説](https://developer.nvidia.com/blog/understanding-and-measuring-pc-latency/)

## 一つの入力が画面に出るまでを追う

<figure class="study-figure">
  <img src="/images/graphics/input-to-display-latency.svg" alt="入力が7 msに届き、ゲームが8 msに読み、CPU処理が10 msに終わる。GPUは3 ms待って13 msに開始し、17 msに描き終える。16.67 msの走査開始には間に合わず、33.33 msに走査を始め、画面中央に41.67 msで到達する。" width="760" height="312" loading="lazy">
  <figcaption>一つの入力を追う仮想60 Hzの例。処理中の区間と、処理を始められるまでの待ちを分けています。<a href="/study/images/graphics/input-to-display-latency.svg" target="_blank" rel="noopener noreferrer">タイムラインを拡大</a></figcaption>
</figure>

| 区間 | 調べるときに見るもの |
| --- | --- |
| 入力が届く → ゲームが読む | 次に入力を読む機会、イベントの処理、入力を使うシミュレーションの刻み |
| 入力を読む → GPUへ仕事を渡す | CPU上のゲーム更新、描画コマンドの準備、スレッド間の待ち |
| GPUへ仕事を渡す → 描画完了 | GPUが処理を始めるまでの待ち、描画やコピーにかかった時間 |
| 描画完了 → 表示が始まる | 提示待ち、次の走査開始時刻、OSの合成や提示方式 |
| 表示が始まる → 対象位置が変わる | 走査がその位置に到達する時間、画素の応答 |

同じフレームのCPU処理とGPU処理だけを足すと、処理を待っている区間が抜けます。一方、複数のフレームの仕事は並行するので、タイムライン全体のCPU・GPU時間の合計も、ある入力の遅延を表す値にはなりません。入力に番号を付け、その入力を使った更新・描画・提示を対応付けます。[GPU時間をタイムスタンプで測る](/graphics/optimization/gpu-timestamp-queries.html) · [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)

## 2 msの待ちが、表示時刻を約16.67 ms動かす例

図では、前の仕事を待つ時間が3 msあるため、描画完了は17 msです。仮想ディスプレイの次の走査は33.33 msから始まり、画面中央には41.67 msで届きます。入力が届いた7 msから数えると **34.67 ms** です。

同じ条件でGPUの待ちだけを1 msに減らすと、描画完了は15 msです。16.67 msの走査に間に合い、中央の表示時刻は25 ms、入力からの遅延は **18.00 ms** になります。仕事を2 ms早く始めたことで一つ前の走査に入るため、この例では表示が約16.67 ms早まります。走査に間に合うかどうかで、処理時間の改善量と表示時刻の変化量は異なります。[待ち時間を変えて試す](/practice/graphics/input-latency-observation.html)

## 実機では測る範囲をそろえる

1. **何に反応させるかを決める。** 例えばボタンを押すと、毎回同じ位置の四角が白くなる場面を作ります。測定対象の入力に番号を付け、同じ入力で変わったフレームを追います。
2. **ゲーム内の区間を分ける。** 入力取得、シミュレーション更新、描画の提出にマーカーを置きます。GPUの開始・完了と提示も記録し、時間が延びた箇所の前後を比べます。CPUとGPUの時刻を並べるときは、プロファイラの統合された時間軸か、校正されたタイムスタンプを使います。[MicrosoftのPIX Timing Captures](https://learn.microsoft.com/en-us/windows/pix/timing-captures/timing-captures-overview)
3. **機器込みの遅延を測る。** 物理入力と光の変化が分かる治具や、入力の目印と画面の対象を同時に撮る高速度カメラを使います。撮影で数える場合は、撮影フレーム間隔の分だけ時刻の分解能が限られます。画面位置、表示設定、入力機器をそろえて複数回測り、中央値とばらつきを比べます。[NVIDIAの入力機器・PC・画面を含む測定例](https://www.nvidia.com/en-us/geforce/news/reflex-latency-analyzer-360hz-g-sync-monitors/)

DXGIの待機可能なスワップチェーンで、フレームを受け付けられるまで待ってから最新の入力を読む方法があります。対策を入れたら、入力が使われるまでの待ちと、表示間隔のばらつきの両方を確認します。[MicrosoftのDXGI遅延低減手順](https://learn.microsoft.com/en-us/windows/uwp/gaming/reduce-latency-with-dxgi-1-3-swap-chains) · [フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)
