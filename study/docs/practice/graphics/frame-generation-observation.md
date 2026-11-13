---
title: フレーム生成を切り替えて滑らかさと入力への反応を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: frame-generation-observation
  order: 1
  summary: 30 Hzで更新するロボットに中間フレームを挿入し、表示する位置の数と、入力で色が変わる時刻を比べる。
  aliases: [フレーム生成の実践, フレーム補間, 表示FPS, 入力遅延, Canvas]
  verification: AMDのフレーム補間・表示タイミング資料とNVIDIA Streamlineの開発者向け資料に照合（2026-11-13）
---

# フレーム生成を切り替えて滑らかさと入力への反応を比べる

横に移動するロボットを、両モードとも毎秒30回の基礎フレームで更新します。生成をオンにすると、連続する2枚の間にロボットの中間位置を描きます。[フレーム生成の記事](/graphics/postprocess/frame-generation.html)で、実際のゲームが動きや遮蔽を扱う方法も図解しています。

<a href="/study/samples/graphics/frame-generation-observation/index.html" target="_self">フレーム生成の比較デモを開く</a>

## ロボットの動きを比べる

1. オフのままロボットを見ます。基礎フレームが切り替わるたびに、ロボットが次の位置へ移ります。
2. **フレーム生成をオンにする**を選びます。ロボットの移動速度と基礎フレームの更新間隔は共通で、画面では途中の位置も通ります。
3. **スロー表示（1/4倍速）**を有効にして、表示中のフレームの種類を見ます。オンでは基礎フレームと生成した中間フレームが交互に表示されます。

| 設定 | 基礎更新の目標 | 表示する画像の目標（通常速度） |
| --- | --- | --- |
| オフ | 30回／秒 | 30枚／秒。基礎フレームを表示 |
| オン | 30回／秒 | 60枚／秒。基礎フレームの間に1枚を追加 |

中間位置は、連続する2枚のロボットの座標から計算します。例えば `xA` と `xB` の中間は `xA + (xB - xA) * 0.5` です。物体の座標が分かる教材用の実装なので、画像から動きを推定する処理は省いています。

## 入力が色に反映されるまでを比べる

1. 通常速度に戻して、生成オフで**色を切り替える**を押すか、Spaceキーを押します。入力は次の基礎フレームでロボットの色に反映されます。
2. オンにしてもう一度押します。この実践では、オン時の予定表示に1基礎フレーム分の待ちを加え、中間フレームには手前の基礎フレームの色を使います。色が切り替わるのは、入力を反映した基礎フレームが表示されたときです。
3. オン・オフそれぞれで数回押し、表の「入力からCanvas更新」と「表示用の待ち（等速）」を比べます。押した時点が基礎更新の直前か直後かによって、次の更新までの待ちも変わります。

例えばBがシーン開始から約33.3 msで完成したとします。オフではBをそこで表示する予定です。オンではAを約33.3 ms、中間フレームを約50.0 ms、Bを約66.7 msで表示する予定です。このデモの予定表示の差は、通常速度で約33.3 msです。

Canvasに反映する時刻は、ブラウザーが描画処理を呼ぶ周期にも左右されます。実際の表示枚数にはディスプレイの更新頻度も関わります。入力機器からディスプレイが発光するまでの測定は、[入力遅延の記事](/graphics/optimization/input-to-display-latency.html)で扱います。

## 理解度チェック

1. 生成オンで途中の位置が増えても、ロボットの色を決める処理はいつ走りますか。

   ::: details 解答
   次の基礎フレームを作る時点です。このデモは基礎フレームの更新で入力を読み、追加した中間フレームでは位置を補間します。
   :::

2. 生成オンとオフの反応時間の差を比べるとき、1回ずつの測定だけでは判断しにくいのはなぜですか。

   ::: details 解答
   入力が次の基礎更新のどれだけ前に届いたかによって、色が決まるまでの時間も変わるためです。予定表示までの待ちを見ると、この実践が追加した分を分けて確認できます。
   :::

## 関連項目

- [フレーム生成](/graphics/postprocess/frame-generation.html)で、画像の動きと遮蔽を使った補間の仕組みを確認する。
- [アップスケーリングの実践](/practice/graphics/taau-observation.html)で、1枚あたりの画素数を変える処理を試す。
- [フレームペーシングの実践](/practice/graphics/frame-pacing-observation.html)で、表示間隔の違いを比べる。
- [3DCG・描画ロードマップの「ポストプロセスとAA」](/learn/roadmap.html?node=gfx-postprocess#graphics)

## 参考資料

- [AMD — FidelityFX Frame Interpolation 1.1.3](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/frame-interpolation/) · [Frame Generation Swapchain](https://gpuopen.com/manuals/fsr_sdk/techniques/frame-interpolation-swap-chain/)
- [WHATWG HTML — Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)
