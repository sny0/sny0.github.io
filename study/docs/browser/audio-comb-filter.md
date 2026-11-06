---
title: Web Audioのコムフィルター — 遅延と干渉
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 同じ音を二つの経路に分け、片方だけ遅らせて足すと、周波数によって強め合ったり打ち消し合ったりする。遅延時間とゲインから周波数応答を計算し、Web Audioの実測値と比べる。
  aliases: [Web Audio API, コムフィルター, くし形フィルター, comb filter, DelayNode, フィードフォワード, 位相差, 干渉, インパルス応答, 周波数応答]
  verification: W3C Web Audio APIのDelayNodeとJulius O. SmithのPhysical Audio Signal Processingに照合（2026-11-06）
---

# Web Audioのコムフィルター — 遅延と干渉

同じ音を二つの経路で鳴らし、片方だけを少し遅らせて足すと、周波数によって強め合ったり打ち消し合ったりします。周波数応答に山と谷が等間隔に並ぶため、この処理を**コムフィルター**（くし形フィルター）と呼びます。ミキシングでは二つの信号を同じ時刻に足します。ここではクロスフェードで扱った波形の重なり方が、遅延によって周波数ごとに変わります。[Web Audioのミキシングとヘッドルーム](/browser/audio-mixing-and-headroom.html)、[Web Audioのクロスフェード](/browser/audio-crossfade.html)

## 元の音と遅らせた音を足す

一つの音源を、すぐに届く**直接経路**と、`DelayNode` で `T` 秒遅らせる**遅延経路**に分けます。サンプルレートを `Fs` とし、遅延が整数サンプル `D = T × Fs` に相当するとき、`x[n]` は現在の入力、`x[n − D]` は `D` サンプル前の入力です。遅延経路の振幅を直接経路の `g` 倍（ここでは `0 ≤ g ≤ 1`）にして、二つの経路のゲインの和を1にそろえます。[W3C Web Audio APIのDelayNode](https://www.w3.org/TR/webaudio-1.1/#DelayNode)、[Julius O. Smithのフィードフォワード・コムフィルター](https://www.dsprelated.com/freebooks/pasp/Feedforward_Comb_Filters.html)

```text
y[n] = x[n] / (1 + g) + g × x[n − D] / (1 + g)
```

Web Audioでは各経路に `GainNode` を置き、同じ後段ノードの入力へつなぐと出力が足し合わされます。`DelayNode` は入力を内部バッファに蓄え、設定した時間だけ前の位置から読み出します。例えば `g = 1`、`T = 2 ms`、`Fs = 48,000 Hz` で、先頭の1サンプルだけを `1` にすると、出力には振幅 `0.5` が0番と96番に現れます。この出力が**インパルス応答**です。出力を遅延の入力へ戻すフィードバック型では、このような短い入力からも繰り返しが生まれます。ここでは入力から出力に向かうフィードフォワード型を扱います。[W3C Web Audio APIのGainNode](https://www.w3.org/TR/webaudio-1.1/#GainNode)、[チャンネルのミキシング](https://www.w3.org/TR/webaudio-1.1/#channel-up-mixing-and-down-mixing)、[Julius O. Smithのフィードバック・コムフィルター](https://www.dsprelated.com/freebooks/pasp/Feedback_Comb_Filters.html)

<figure class="study-figure">
  <img src="/images/browser/audio-comb-paths.svg" alt="同じ音源を直接経路と遅延経路に分け、各経路のゲインを掛けてから足す。遅延2ミリ秒、サンプルレート48キロヘルツ、二つのゲインが同じ場合、インパルス応答は0番と96番の振幅0.5の2点になる。" width="760" height="640" loading="lazy">
  <figcaption>一つの短い入力を通すと、直接音と遅延音がいつ届くかを確認できます。<a href="/study/images/browser/audio-comb-paths.svg" target="_blank" rel="noopener noreferrer">経路とインパルス応答の図を拡大</a></figcaption>
</figure>

## 遅延時間で谷の位置が決まる

一定時間の純粋な遅延だけなら、各周波数成分の振幅を保ったまま波形が時間方向にずれます。周波数 `f` Hz の正弦波を `T` 秒遅らせると、直接経路に対して位相が `2πfT` ラジアン遅れます。同じ `T = 2 ms` でも、250 Hzでは半周期ずれ、500 Hzではちょうど1周期ずれます。250 Hzでは山と谷がぶつかって振幅が小さくなり、500 Hzでは山同士と谷同士がそろいます。

二つを足したあとの振幅倍率は、直接経路の成分と、位相が遅れた成分のベクトルを足して求められます。分母でゲインの和を1にそろえているので、位相がそろう周波数での倍率は1（0 dB）です。0 Hzの一定入力（直流）も同じ倍率になります。

```text
|H(f)| = √(1 + g² + 2g × cos(2πfT)) / (1 + g)
```

`T > 0`、`g > 0` では、同じ位相で重なる `f = k / T` が山、半周期ずれて重なる `f = (k + 0.5) / T` が谷です。`k = 0, 1, 2, …` のうち、観測できる周波数の範囲を考えます。谷から次の谷までの間隔は `1 / T` です。`g = 1` なら谷で完全に打ち消し合います。`g = 0.5` なら谷にも振幅が `1/3` 残り、直流を基準に `20 × log10(1/3) ≈ −9.54 dB` です。`g = 0` では直接経路だけが残り、応答は平らになります。

| 遅延時間 `T` | 最初の谷 `1 / (2T)` | 谷の間隔 `1 / T` |
| ---: | ---: | ---: |
| 1 ms | 500 Hz | 1,000 Hz |
| 2 ms | 250 Hz | 500 Hz |
| 5 ms | 100 Hz | 200 Hz |
| 10 ms | 50 Hz | 100 Hz |

<figure class="study-figure">
  <img src="/images/browser/audio-comb-response.svg" alt="0から1,000ヘルツの周波数応答。遅延2ミリ秒で谷は250と750ヘルツ。gが1の谷では完全に打ち消し合い、gが0.5の谷は約マイナス9.54デシベルに留まる。遅延5ミリ秒では谷が100ヘルツから200ヘルツ間隔で並ぶ。" width="760" height="670" loading="lazy">
  <figcaption>遅延時間を伸ばすと谷の間隔が狭くなります。遅延経路のゲインを下げると谷が浅くなります。<a href="/study/images/browser/audio-comb-response.svg" target="_blank" rel="noopener noreferrer">周波数応答の図を拡大</a></figcaption>
</figure>

## ゲームで同じ音が別の経路から届く場面

壁の近くで足音が鳴る場面では、直接届く音に、少し長い距離を通って届く反射音が重なります。反射が1回だけで、反射音を一様に弱めると考えれば、この二経路のモデルに当てはまります。実際の壁は反射しやすさが周波数によって変わり、複数の面で反射します。[Julius O. Smithのフィードフォワード・コムフィルター](https://www.dsprelated.com/freebooks/pasp/Feedforward_Comb_Filters.html)

同じ効果音を、直接出力する経路と、処理を通して出力する並列経路に分けたときも、片方に遅延があれば同じ干渉が起こります。処理した音を重ねたときだけ音色が変わるなら、各経路を単独で聴き、両方を通したときの時間差と周波数応答を調べると、遅延による干渉を切り分けられます。

## ブラウザで測って聴く

[コムフィルターの実践](/practice/browser/audio-comb-observation.html)では、`OfflineAudioContext` で1サンプルの入力を二つの経路に通し、ブラウザの `DelayNode` を含むインパルス応答から周波数応答を求めます。まず遅延を2 ms、`g` を1にして最初の谷が250 Hz付近に出ることを確かめます。次に `g` を0.5にすると谷の位置が同じまま浅くなり、遅延を5 msにすると最初の谷が100 Hz付近に移ります。同じノイズを直接音と合成音で聴き比べると、応答に谷が並ぶときの音色の違いを確認できます。[W3C Web Audio APIのOfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)

足し合わせた出力を遅延経路に戻すと、音が何度も繰り返されます。間隔と減衰の関係は、[Web Audioのフィードバックディレイ](/browser/audio-feedback-delay.html)で確認できます。
