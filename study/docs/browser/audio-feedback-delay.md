---
title: Web Audioのフィードバックディレイ — 反響の間隔と減衰
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 遅延させた出力を入力側に戻すと、短い音が一定間隔で繰り返される。反響の間隔と減衰を決める遅延時間と帰還ゲイン、Web Audioが循環を処理する仕組みを解説する。
  aliases: [Web Audio API, フィードバックディレイ, feedback delay, 帰還ゲイン, DelayNode, エコー, 反響, フィードバックコムフィルター, インパルス応答, IIR]
  verification: W3C Web Audio APIのDelayNodeと音声グラフのレンダリング、Julius O. SmithのPhysical Audio Signal Processingに照合（2026-11-06）
---

# Web Audioのフィードバックディレイ — 反響の間隔と減衰

短い効果音を一定の間隔で、少しずつ小さくしながら繰り返すには、遅延させた出力を入力側へ戻します。この経路を**フィードバック**（帰還）と呼びます。ループを1周する時間が反響の間隔になり、1周ごとのゲインが反響の弱まり方を決めます。[Julius O. Smithのフィードバック・コムフィルター](https://www.dsprelated.com/freebooks/pasp/Feedback_Comb_Filters.html)

## 出力を遅らせて同じ加算点に戻す

入力 `x[n]` と帰還信号を足し、出力 `y[n]` を作ります。出力の一部を `DelayNode` に送り、遅らせた信号を `GainNode` で `g` 倍して同じ加算点に戻します。理想モデルではループの遅延を `T` 秒とします。サンプルレートが `Fs` のとき、`T` が整数サンプルに相当するなら `D = T × Fs` です。[W3C Web Audio APIのDelayNode](https://www.w3.org/TR/webaudio/#DelayNode)、[Julius O. Smithの差分方程式](https://www.dsprelated.com/freebooks/pasp/Feedback_Comb_Filters.html)

```text
y[n] = x[n] + g × y[n − D]
```

<figure class="study-figure">
  <img src="/images/browser/audio-feedback-paths.svg" alt="理想モデルの信号経路。入力と帰還信号を足して出力する。加算点の出力はDelayNodeでT秒遅れ、GainNodeでg倍され、同じ加算点へ戻る。" width="760" height="388" loading="lazy">
  <figcaption>遅延経路に入る信号には、元の音に加えて、すでに戻ってきた反響も含まれます。<a href="/study/images/browser/audio-feedback-paths.svg" target="_blank" rel="noopener noreferrer">フィードバック経路の図を拡大</a></figcaption>
</figure>

`y[n − D]` は過去の**出力**です。出力が一度戻ってくると、その信号も新しい出力に含まれ、次の周回へ入ります。以前のフィードフォワード型では過去の**入力** `x[n − D]` を足すため、1サンプルの入力から生じるのは直接音と遅延音の2点です。[Web Audioのコムフィルター](/browser/audio-comb-filter.html)

## 反響は1周するたびに g 倍になる

理想モデルの初期状態を無音とし、時刻0の1サンプルだけに振幅1を入力します。最初の出力は1です。その値が1周して `T` 秒後に `g`、もう1周して `2T` 秒後に `g²` になります。`k` 回目の反響は `kT` 秒後に現れ、振幅は `g` の `k` 乗です。`g > 0` なら、1周前に対する振幅の変化は `20 × log10(g)` dB です。

| 帰還ゲイン `g` | 直接音 | 1回目 | 2回目 | 3回目 | 1周ごとの変化 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 1 | 0 | 0 | 0 | 反響なし |
| 0.4 | 1 | 0.4 | 0.16 | 0.064 | 約 −7.96 dB |
| 0.7 | 1 | 0.7 | 0.49 | 0.343 | 約 −3.10 dB |

<figure class="study-figure">
  <img src="/images/browser/audio-feedback-echoes.svg" alt="理想モデルで遅延200ミリ秒のインパルス応答。直接音から5回目の反響までを表示。反響は200ミリ秒間隔で、帰還ゲイン0.7より0.4の方が振幅が速く小さくなる。" width="760" height="600" loading="lazy">
  <figcaption>理想モデルでループの遅延を200 msにそろえています。反響の位置は同じで、帰還ゲインが小さいほど早く減衰します。<a href="/study/images/browser/audio-feedback-echoes.svg" target="_blank" rel="noopener noreferrer">反響と減衰の図を拡大</a></figcaption>
</figure>

`|g| < 1` なら反響の振幅は周回ごとにゼロへ近づきます。`g = 1` なら理想モデルでは同じ振幅で繰り返し、`g > 1` では周回ごとに大きくなります。`|g| < 1` でも、長い音を入れると過去の出力が現在の入力に重なってピークが大きくなることがあります。例えば一定の入力では、正の `g = 0.7` の出力は入力の約3.33倍に近づきます。実際に再生する音ではこの加算分も含めて振幅の余裕を取ります。[Julius O. Smithの安定条件](https://www.dsprelated.com/freebooks/pasp/Feedback_Comb_Filters.html)、[Web Audioのミキシングとヘッドルーム](/browser/audio-mixing-and-headroom.html)

## ブラウザが循環を処理する順序

Web Audioは一定数のフレームをまとめて処理します。この単位を**レンダークォンタム**と呼びます。循環に入った `DelayNode` の遅延には1レンダークォンタム分の下限があります。現在のブロックをまだ書き込んでいなくても、以前に書き込んだ信号を先に読み出せるためです。仕様では遅延の読み出し側と書き込み側を分けてノードの実行順を決め、そこで解消できない循環に含まれるノードの出力を無音にします。[W3C Web Audio APIのDelayNode](https://www.w3.org/TR/webaudio/#DelayNode)、[音声グラフのレンダリング](https://www.w3.org/TR/webaudio/#rendering-loop)

Chromium系ブラウザでこのサンプルを48,000 Hz、設定200 msで動かすと、反響間隔は9,728サンプル（約202.67 ms）でした。設定の200 msに当たる9,600サンプルとの差は128サンプルで、この実行での1レンダークォンタム分です。これはこの経路で観測した追加の時間です。上で説明した仕様の下限は、循環内の `DelayNode` に設定できる実効遅延の最小値を指します。

Chromiumの実装は、ノードの入力を取得する前に処理の開始時刻を記録します。循環して同じノードに戻ると再処理せず、バッファに残っている出力を使うので、今回の経路では1ブロックの差が生じたと考えられます。実践画面では、設定した時間と、そのブラウザの出力波形から測った実際の間隔を別々に表示します。[ChromiumのAudioHandler実装](https://chromium.googlesource.com/chromium/src/+/c3756773b1039618747068cee1080fd09f75f24e/third_party/blink/renderer/modules/webaudio/audio_handler.cc#292)

## ゲームの効果音で間隔と音色を調整する

坑道の奥で鳴った短い効果音に、一定間隔で弱まる反響を付けるときに使えます。遅延時間を短くすると反響が元の音と重なりやすくなります。1周の時間を `T`、帰還ゲインを一定の正の値としたモデルでは、1周して戻った波の位相がそろう周波数 `f = k / T`（`k = 0, 1, 2, …`）で振幅の山が並びます。この周期的な強調を持つ処理は**フィードバック・コムフィルター**とも呼ばれます。[Julius O. Smithのフィードバック・コムフィルター](https://www.dsprelated.com/freebooks/pasp/Feedback_Comb_Filters.html)

部屋で聞く反響には、壁や床を通る複数の経路があり、反射する面によって周波数ごとの減衰も変わります。単一のループは、一定間隔の反響を作り、遅延時間と帰還ゲインの影響を個別に調べるためのモデルです。

## ブラウザで測って聴く

実践サンプルは `OfflineAudioContext` で実際にノードを循環させ、直接音と5回目までの反響を測ります。設定時間を200 msから400 msに変え、波形から測った間隔を比べます。帰還ゲインを0.7から0.4に下げると、同じ回数でも反響の振幅が小さくなります。短い効果音でも間隔と減衰を聴き比べられます。[フィードバックディレイの実践](/practice/browser/audio-feedback-observation.html)、[W3C Web Audio APIのOfflineAudioContext](https://www.w3.org/TR/webaudio/#OfflineAudioContext)

反射が届く時刻と振幅を波形として用意し、その響きを別の音に加える方法もあります。[Web Audioの畳み込みリバーブ](/browser/audio-convolution-reverb.html)
