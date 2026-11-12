---
title: 平均60 FPSでもカクつくのはなぜか — フレームタイムとフレームペーシング
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 同じ平均FPSでも画面が切り替わる間隔で見え方が変わる。フレーム生成を含む表示間隔を図と実践で比べ、CPU・GPU・提示のどこでカクついたかを調べる。
  aliases: [フレームタイム, frame time, フレームペーシング, frame pacing, スタッター, stutter, Present, VSync, p99, PresentMon]
  verification: Android Frame Pacing、DXGI Present、PresentMon 2.6.0、PIX、AMD FSR Frame Generation Swapchainの公式資料に照合（2026-11-13）
---

# 平均60 FPSでもカクつくのはなぜか — フレームタイムとフレームペーシング

カメラを一定の速さで動かしていても、画面が一瞬止まり、そのあと大きく進むことがあります。1秒あたりに表示されたフレーム数が同じでも、次の絵が出るまでの時間は揃っているとは限りません。**フレームペーシング**は、ゲームの更新・描画と表示側のタイミングを合わせ、画面の切り替わりを狙った間隔に整えることです。[Android Frame Pacingの仕組み](https://developer.android.com/games/sdk/frame-pacing#background)

## 同じ平均60 FPSで、画面の切り替わり方を比べる

固定120 Hzの仮想ディスプレイは約8.33 msごとに更新します。60 FPSを等間隔で表示するには、新しい絵に切り替える間隔を2更新分の約16.67 msにします。ここでは、**ある絵に切り替わってから次の絵に切り替わるまでの時間**を表示間隔と呼びます。同じ絵のままリフレッシュしても、新しい表示フレームには数えません。

2秒間の表示を二つ用意します。等間隔の例では全120フレームをそれぞれ2更新分だけ表示します。スパイクのある例では、31枚目と91枚目をそれぞれ6更新分（50 ms）表示し、その直後の4フレームは1更新分（約8.33 ms）ずつにします。どちらも合計は240更新分で、120フレーム ÷ 2秒 = **60 FPS**です。50 ms同じ絵が続くところでは動きが一瞬止まったように見え、その次の絵でまとめて進みます。

<figure class="study-figure">
  <img src="/images/graphics/frame-pacing-intervals.svg" alt="仮想120 Hzで500 msから583.33 msまでを比較する。上段は2更新ごとにフレーム31から35へ切り替わる。下段は31が6更新続き、その後の32から35は1更新ずつで切り替わる。両段とも10更新の間に5フレームを表示する。" width="760" height="302" loading="lazy">
  <figcaption>2秒間のうち、最初のスパイク周辺を拡大。横幅は表示していた時間です。<a href="/study/images/graphics/frame-pacing-intervals.svg" target="_blank" rel="noopener noreferrer">表示間隔の図を拡大</a></figcaption>
</figure>

| 指標 | 等間隔 | スパイクあり |
| --- | ---: | ---: |
| 平均FPS | 60 | 60 |
| 平均表示間隔 | 16.67 ms | 16.67 ms |
| p99表示間隔 | 16.67 ms | 50.00 ms |
| 最長の表示間隔 | 16.67 ms | 50.00 ms |
| 60 FPSの目安（約16.67 ms）を超えた間隔 | 0回 | 2回 |

表は表示間隔を最後まで観測できた120フレームで集計しています。平均FPSはフレーム数を経過秒数で割って求めます。p99（99パーセンタイル）は、ここでは間隔を短い順に並べ、`ceil(0.99 × 件数)` 番目の値を取ります。120件なら119番目なので、50 msの間隔が1回だけの場合はp99に現れません。どの場面で何度起きたかを調べるには、最長値と時系列も見ます。

ブラウザ実践では、同じ時刻を使った二つの動きとグラフを見比べ、再生を止めてスパイクの前後を調べられます。数値は仮想120 Hzのモデルから計算します。[表示間隔を見比べる実践](/practice/graphics/frame-pacing-observation.html)

<a href="/study/samples/graphics/frame-pacing-observation/index.html" target="_self">表示間隔の比較デモを開く</a>

## フレーム生成でも表示間隔はそろえる

30 FPSで描いたAとBの間に、[フレーム生成](/graphics/postprocess/frame-generation.html)で中間画像Mを作るとします。物体がAでは位置0、Mでは10、Bでは20にあり、順番も同じです。変えるのは各画像をいつ表示するかです。

等間隔ではA、M、Bを約16.67 msずつ離して表示します。不等間隔の例では、Aを25 ms保持し、Mを約8.33 msだけ表示してBに切り替えます。どちらもAからBまでは約33.33 msですが、不等間隔では**止まって見える時間のあとに、MとBが立て続けに出ます**。同じ距離を進む表示が長い間隔と短い間隔を交互に通るので、進む速さにむらがあるように見えます。

<figure class="study-figure">
  <img src="/images/graphics/frame-pacing-generated-intervals.svg" alt="固定120 Hzで描画A、生成M、描画B、生成Nの4枚を比較。等間隔では各16.67 ms。不等間隔では描画AとBが各25 ms、生成MとNが各8.33 ms。どちらも約66.67 msに4枚を表示する。" width="760" height="295" loading="lazy">
  <figcaption>描画と生成の順番は共通です。表示間隔が違うと、生成した位置を見せる時間も変わります。<a href="/study/images/graphics/frame-pacing-generated-intervals.svg" target="_blank" rel="noopener noreferrer">フレーム生成の表示間隔の図を拡大</a></figcaption>
</figure>

図の時間軸は、Aを表示し始めた時点からの相対時刻です。実際の表示では描画、生成、UI合成の完了を待つため、提示側が順番と間隔を調整します。例えばAMD FSR Frame Generationのスワップチェーンは、複数フレームの時間を使って目標の提示間隔を決め、生成画像と描画画像を順に提示します。どの絵が長く残るかは、処理の完了時刻やディスプレイの更新条件で変わります。[AMDのフレームペーシングと提示](https://gpuopen.com/manuals/fsr_sdk/techniques/frame-interpolation-swap-chain/#frame-pacing-and-presentation)

実践の**フレーム生成で間隔が不均等**では、二つのレーンで同じ目印の位置を使います。時刻を20 ms付近で止めると、等間隔のレーンは中間画像へ進み、不等間隔のレーンはAのままです。グラフの高さは、その絵を保持する時間を示します。

## CPU、GPU、ディスプレイは別の時刻で動く

ゲームはCPUで入力や状態を更新し、GPUに描画コマンドを送ります。GPUがその絵を描いている間に、CPUが次のフレームの準備を始めることもあります。アプリの `Present()` などの呼び出しは表示への要求です。描画完了やOSの合成、提示方式によって、実際に画面が切り替わる時刻は後になります。キューに入った絵が提示方式によって表示されずに破棄される場合もあります。[DXGI Presentとフリップキュー](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-idxgiswapchain-present#flip-presentation-model-queue)

<figure class="study-figure">
  <img src="/images/graphics/frame-pacing-pipeline.svg" alt="固定60 Hzの例。CPUがフレームBの描画を依頼し、GPUがBを描いている間にCPUがCの準備を始める。Bが16.67 msの更新に間に合わないので画面はAのまま。33.33 msでB、50 msでCが表示される。" width="760" height="358" loading="lazy">
  <figcaption>固定60 Hzの例では、Bが予定した更新に間に合わず、Aが2更新分表示されます。<a href="/study/images/graphics/frame-pacing-pipeline.svg" target="_blank" rel="noopener noreferrer">CPU・GPU・画面の図を拡大</a></figcaption>
</figure>

図は固定リフレッシュレートで、更新の境目に絵を切り替える簡略モデルです。Bを表示する予定の時刻にGPUの仕事が終わっていなければ、画面にはAがもう1更新分残ります。実機ではVSync、可変リフレッシュレート（VRR）、OSの合成や提示方式によってタイミングが変わります。例えばVRRは対応範囲内で更新周期を変えられるので、固定周期のように表示間隔を一律に数える方法は適しません。[Androidの表示パイプライン](https://developer.android.com/games/sdk/frame-pacing#background) · [DXGIの可変リフレッシュレート](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/variable-refresh-rate-displays)

「フレームタイム」と書かれたグラフでは、先に何から何まで測った値かを確かめます。

| どの時間か | 測る範囲 | 分かること |
| --- | --- | --- |
| CPU側のフレーム間隔 | このフレームのCPU処理開始から次の開始まで | CPU側の更新ペース。実行に加え待ちも入る |
| CPU・GPUの実行時間 | 各プロセッサーでフレームの仕事をしていた区間 | どの処理が長いか。CPUとGPUで区間が重なる場合がある |
| Present間隔 | アプリが表示要求を出してから次の要求まで | アプリ側の提示要求のペース |
| 表示間隔 | この絵が表示されてから次の絵に切り替わるまで | 絵が更新された間隔。画面側のカクつきを追う手掛かり |

## Windowsでカクついた区間を追う

1. **再現条件を揃える。** 同じビルド、カメラ経路、画面設定で記録します。リフレッシュレート、VSync、VRR、FPS制限を控え、読み込み直後と再訪時で挙動が違う場合は両方記録します。
2. **表示が長く止まった区間を見つける。** PresentMonのCSVを対象プロセスとスワップチェーンで絞ります。バージョン2.6.0の既定CSVでは、`MsBetweenDisplayChange` が、現在の絵に切り替わるまでに**直前の絵**が表示されていた時間です。数値のある行を時系列で見て、表示要求の間隔を示す `MsBetweenPresents` と比べます。要求の間隔が安定していて表示側の間隔が跳ねる場合は、GPUや表示経路での遅れを調べます。同じCSVでCPU側のフレーム間隔は `MsBetweenAppStart`、CPUとGPUの稼働時間は `MsCPUBusy` と `MsGPUBusy` です。`--v2_metrics` を指定したCSVでは、各行の絵の表示時間は `DisplayedTime` に出ます。[PresentMon 2.6.0の指標定義](https://github.com/GameTechDev/PresentMon/blob/v2.6.0/README-ConsoleApplication.md#csv-columns) · [CSVヘッダーの実装](https://github.com/GameTechDev/PresentMon/blob/v2.6.0/PresentMon/CsvOutput.cpp#L530-L605)
3. **前後の普通のフレームと比較する。** Direct3D 12なら、PIXのTiming CaptureでCPUスレッドとGPUキューを同じ時刻軸に並べます。CPU側で長いイベントや待ちがないか、GPU側で描画・コピーの区間が延びていないか、送信からGPUの実行開始までの待ちが増えていないかを順に見ます。CPUとGPUは並行して進むため、両方の実行時間を足しても表示間隔にはなりません。[PIX Timing Captures](https://learn.microsoft.com/en-us/windows/pix/timing-captures/timing-captures-overview)
4. **原因候補を一つ変え、同じ条件で計り直す。** 例えばマップの境目でだけCPUの待ちが増えるなら、ファイル読み込みのマーカーと待ち始めの時刻を照らし合わせます。CPUとGPUの仕事量が普段通りなら、表示キューの待ちや提示方式の変化を確認します。修正前後は平均FPSに加え、同じ場面で表示間隔のスパイクが短くなったか、回数が減ったかを比べます。[GPU最適化の基礎](/graphics/optimization/basics.html)

描画が終わった絵をどの順番で出すか、表示の途中で絵を替えると何が見えるかは、[スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)で扱います。

関連項目は[入力とゲームループ](/guide/low-level/input-and-game-loop.html)と[デバッグ・プロファイリングツール](/graphics/optimization/tools.html)です。

CPU側のスパイクを関数やスレッドまで追う手順は、[CPU プロファイリング](/tools/profiling/cpu-profiling.html)で確認できます。

## 理解度チェック

1. 2秒で120枚を表示したとき、平均FPSだけで50 msの停止があったか判断できますか。

   ::: details 解答
   平均FPSは60です。50 msの間隔があったかは、表示間隔の時系列や最長値を調べます。
   :::

2. 生成Mの位置が同じでも、Aを長く保持してMを短く表示するとどう見えますか。

   ::: details 解答
   Aの位置で長く止まり、MとBが短い間隔で続きます。表示枚数が同じでも、動く速さにむらがあるように見えます。
   :::

## 関連項目

- [同じ60 FPSで表示間隔を比べる](/practice/graphics/frame-pacing-observation.html)で、表示間隔と目印の動きを同じ時刻で調べる。
- [フレーム生成](/graphics/postprocess/frame-generation.html)で、中間画像を作る仕組みと入力への反応を確認する。
- [3DCG・描画ロードマップの「GPU最適化」](/learn/roadmap.html?node=gfx-optimization#graphics)
