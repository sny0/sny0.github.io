---
title: Web Audioのミキシング — ゲイン・ヘッドルーム・クリッピング
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 同じ時点の音声サンプルを加算し、ゲインを掛ける順序と、クリッピングで波形が変わる仕組みを図解する。
  aliases: [Web Audio API, audio mixing, ミキシング, GainNode, ゲイン, マスターゲイン, WaveShaperNode, ヘッドルーム, クリッピング, hard clip, dBFS, ピーク]
  verification: W3C Web Audio APIのノード入力のミックス・GainNode・WaveShaperNode・AudioBufferに照合（2026-11-06）
---

# Web Audioのミキシング — ゲイン・ヘッドルーム・クリッピング

ゲームでは、効果音や音楽が同時に鳴ります。複数の音を一つの出力へ流すと、同じ時点のサンプルが足し合わされます。それぞれの音の振幅に余裕があっても、足した結果のピークは出力先で扱える範囲を超えることがあります。[W3C Web Audio APIのチャンネルのミックス](https://www.w3.org/TR/webaudio-1.1/#channel-up-mixing-and-down-mixing)

## ゲインを掛けてから、同じ時点の値を足す

**ゲイン**はサンプルの振幅に掛ける倍率です。たとえばゲインを `0.5` にすると、正のサンプルも負のサンプルも、絶対値が半分になります。Web Audioでは `GainNode` が各入力サンプルに `gain` を掛けます。複数の信号を同じ入力につなぐと、その入力で対応するチャンネルの値が足されます。[W3C Web Audio APIのGainNode](https://www.w3.org/TR/webaudio-1.1/#GainNode)、[チャンネルのミックス](https://www.w3.org/TR/webaudio-1.1/#channel-up-mixing-and-down-mixing)

実践では、二つのモノラル音源をそれぞれの `GainNode` に通し、まとめてマスターの `GainNode` に接続します。フレーム `n` の音源を `A[n]` と `B[n]` とすると、マスターの出力は `(A[n] × gA + B[n] × gB) × gM` です。 `gA` と `gB` で各音源のバランスを変え、 `gM` で足し合わせた音全体の大きさを調整できます。

<figure class="study-figure">
  <img src="/images/browser/audio-mixing-graph.svg" alt="二つのモノラル音源の値に個別ゲインを掛け、同じ入力で足し合わせる。マスターゲインを掛けた信号は、直接とWaveShaperNodeを経由する二つの経路に分かれ、結果はAudioBufferのチャンネル0と1に入る。" width="760" height="1040" loading="lazy">
  <figcaption>同じ入力で音源を足し、マスターの出力を二つの経路に分けます。<a href="/study/images/browser/audio-mixing-graph.svg" target="_blank" rel="noopener noreferrer">ミキシングの信号経路を拡大</a></figcaption>
</figure>

## 合計のピークからヘッドルームを読む

実践の音源は両方とも400 Hzの正弦波で、ピークは `0.65` です。同じ位相で同時に鳴るので、正の山と負の谷がそれぞれ重なります。すべてのゲインを `1` にすると、合計は `+1.30` まで上がり、 `−1.30` まで下がります。音源の位相や波形が変われば、同じ時点で足される値も変わります。たとえば同じ正弦波でも、一方の符号を逆にすると打ち消し合います。

**ピーク**は、調べる範囲にあるサンプルの絶対値の最大です。この実践では振幅 `1` をフルスケールの基準とし、ピークの dBFS を `20 × log10(ピーク ÷ 1)` で求めます。 `1` が `0 dBFS`、 `0.65` が約 `−3.74 dBFS`、浮動小数点の合計 `1.30` はこの基準で約 `+2.28 dBFS` です。ピークが `0.65` のとき、基準まで約 `3.74 dB` の**ヘッドルーム**があります。これは一瞬の振幅の余裕を表すので、聴こえる音量を比較するときは音の長さや周波数も関わります。

## クリップする前にゲインを下げる

**ハードクリッピング**では、しきい値を超えたサンプルをその境界の値にそろえます。実践では、マスターの出力を `WaveShaperNode` に送り、 `curve` を `[-1, 1]` に設定します。 `−1` から `1` までは直線で補間されて入力と同じ値が出ます。入力がこの範囲を超えると、出力は近い側の端点になります。[W3C Web Audio APIのWaveShaperNode](https://www.w3.org/TR/webaudio-1.1/#dom-waveshapernode-curve)

ピーク `1.30` の波形にクリッピングを掛けると、山と谷の先が平らになります。正弦波にこの処理を掛けると、元の周波数の整数倍にあたる成分が加わり、音色が変わります。クリップの手前でマスターゲインを `0.5` にすると、ピークは `0.65` まで下がり、波形の形が保たれます。クリップの後で `0.5` 倍にした場合は、平らになった部分も一緒に小さくなります。

<figure class="study-figure">
  <img src="/images/browser/audio-clipping-waveform.svg" alt="同じ400ヘルツの波形を共通の振幅目盛で比較する。上段の合計波形はピークが1.30で正負の境界を超える。中段は境界で山と谷が平らになる。下段はクリップ前のマスターゲインを0.5にした波形で、ピーク0.65の正弦波になる。" width="760" height="1130" loading="lazy">
  <figcaption>横軸は400 Hzの正弦波2周期分の5 msです。縦軸は全段で共通です。<a href="/study/images/browser/audio-clipping-waveform.svg" target="_blank" rel="noopener noreferrer">クリッピング前後の波形を拡大</a></figcaption>
</figure>

## 二つの経路を同時にレンダリングする

実践の `OfflineAudioContext` は、マスターの出力を二つの経路に分けて一度に計算します。直接つないだ信号を `ChannelMergerNode` の入力0、 `WaveShaperNode` を通した信号を入力1に入れます。レンダリング結果のチャンネル0と1を読むと、同じフレームでクリップする前と後を比べられます。[W3C Web Audio APIのChannelMergerNode](https://www.w3.org/TR/webaudio-1.1/#ChannelMergerNode)、[OfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)

`AudioBuffer` は浮動小数点PCMを保持し、振幅の基準範囲を超える値も格納できます。この実践で観察するクリッピングは、グラフに置いた `WaveShaperNode` の処理です。実際の再生経路や整数PCMへの変換でどこまで表せるかは、使う出力先や形式の仕様で決まります。[W3C Web Audio APIのAudioBuffer](https://www.w3.org/TR/webaudio-1.1/#AudioBuffer)

個別ゲインとマスターゲインを操作して、しきい値を超えたフレーム数や波形を比べられます。連続して出力する音声データを用意する仕組みは、前回の記事で扱います。[ミキシングとクリッピングの実践](/practice/browser/audio-mixing-observation.html)、[AudioWorkletと音声バッファ](/browser/audio-worklet-buffering.html)

再生中にゲインを変えるときは、値に加えて、いつどのくらいの速さで変えるかも波形に影響します。[Web Audioのゲインオートメーション](/browser/audio-gain-automation.html)で、急な消音とフェードの違いを確認できます。
