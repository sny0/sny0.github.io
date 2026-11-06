---
title: AudioWorkletと音声バッファ — フレーム・先読み・アンダーラン
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 音声をフレーム単位で出力する仕組みと、供給が遅れたときの無音、先読みが吸収できる遅れを図解する。
  aliases: [Web Audio API, AudioWorklet, AudioWorkletNode, AudioWorkletProcessor, OfflineAudioContext, PCM, sample rate, render quantum, アンダーラン, underrun, 先読み, プリバッファ]
  verification: W3C Web Audio APIのAudioBuffer・AudioWorklet・音声グラフのレンダリングに照合（2026-11-06）
---

# AudioWorkletと音声バッファ — フレーム・先読み・アンダーラン

ゲームの音を連続して出すには、これから再生する分の音声データが必要です。供給側はまとまった量を用意し、音声を処理する側は短いブロックを順に出力します。音声バッファに蓄えたデータが尽きると、次の出力に使う値が足りなくなります。この章では、ブラウザが音声のブロックを処理する流れと、先読みが供給の遅れを吸収する仕組みを分けて見ます。

## サンプルとフレームを数える

**PCM**（pulse-code modulation）は、時間ごとに標本化した音の振幅を数値で表す方式です。ある時点の一つのチャンネルの値を**サンプル**、同じ時点の全チャンネル分をまとめて**フレーム**と呼びます。モノラルの1フレームは1サンプル、ステレオの1フレームは左と右の2サンプルです。サンプルレートが48,000 Hzなら、1秒はどちらも48,000フレームです。Web Audio APIの `AudioBuffer` はチャンネルごとの32ビット浮動小数点PCMを持ち、`length` はフレーム数を表します。[W3C Web Audio APIのAudioBuffer](https://www.w3.org/TR/webaudio-1.1/#AudioBuffer)

## AudioWorkletが短いブロックを出力する

ページは `audioWorklet.addModule()` で処理コードを読み込み、`AudioWorkletNode` を音声グラフにつなぎます。そのノードに対応する `AudioWorkletProcessor` の `process()` が、音声をレンダリングする側で呼ばれます。 `outputs[0][0]` は最初の出力の最初のチャンネルです。実験はモノラルなので、この `Float32Array` に今回のブロックの値を書き込みます。[W3C Web Audio APIのAudioWorklet](https://www.w3.org/TR/webaudio-1.1/#AudioWorklet)、[AudioWorkletProcessor](https://www.w3.org/TR/webaudio-1.1/#AudioWorkletProcessor)

グラフが一度に処理するブロックを **render quantum** と呼びます。既定の128フレームは48,000 Hzで約2.67 ms分の音に当たります。処理する配列の長さは `outputs[0][0].length` から読みます。2.67 msはグラフ内の音の長さです。実時間再生を駆動するOS側のコールバックには別のバッファサイズがあり、音声出力までの遅延にはその先の処理も関わります。[W3C Web Audio APIの音声グラフのレンダリング](https://www.w3.org/TR/webaudio-1.1/#rendering-loop)、[AudioContextのoutputLatency](https://www.w3.org/TR/webaudio-1.1/#dom-audiocontext-outputlatency)

<figure class="study-figure">
  <img src="/images/browser/audio-worklet-pipeline.svg" alt="ページでモノラルPCMと供給予定を用意し、AudioWorkletNodeを音声グラフにつなぐ。Processorは供給時刻に届いたPCMをキューへ置き、出力配列の長さだけ順に読み出して、足りないフレームを0にする。OfflineAudioContextは処理結果をAudioBufferへまとめる。" width="760" height="1050" loading="lazy">
  <figcaption>公開サンプルの処理経路です。供給の時刻と出力の位置は、同じグラフのフレーム番号で数えます。<a href="/study/images/browser/audio-worklet-pipeline.svg" target="_blank" rel="noopener noreferrer">AudioWorkletの処理経路を拡大</a></figcaption>
</figure>

実時間の音声処理では、次のブロックを必要な時刻までに計算します。ネットワークの応答を同期的に待つ処理や、長い処理でレンダリングを止める設計は避けます。供給側が先に用意したフレームを受け取り側が使う設計には、FIFOのキューを使えます。固定サイズの領域を繰り返し使うときは、リングバッファが使えます。[リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)、[W3C Web Audio APIの音声グラフのレンダリング](https://www.w3.org/TR/webaudio-1.1/#rendering-loop)

## 供給が遅れた分だけ出力に無音を入れる

実験では、48,000フレームのモノラルPCMを、4,800フレームずつ10個のまとまりに分けます。先頭のまとまりを番号0とし、番号4の供給を予定より3,600フレーム遅らせます。処理コードは各出力フレームの位置を見て、供給時刻に達したまとまりを9,600フレーム分のリングバッファへ入れます。キューにある値を順に読み、足りないフレームには `0` を出力します。

先読みが0 msのとき、番号4は出力の19,200フレーム目（400 ms）から必要です。到着は22,800フレーム目（475 ms）なので、フレーム番号19,200以上22,800未満の3,600フレームが無音になります。番号4が届くと、遅れて届いた値も順に読みます。出力は48,000フレームで終わるため、先読みなしでは末尾の3,600フレームがキューに残ります。

100 ms先読みすると、供給予定が4,800フレーム早まります。開始前に当たるデータは開始時点で用意し、番号0と1がフレーム0でキューに入ります。同じ3,600フレームの遅れがあっても番号4は18,000フレーム目（375 ms）に届き、出力が必要とする400 msに間に合います。今回は不足が0フレームになります。先読み量は供給と消費の間に確保する余裕です。実時間のストリームでは、再生開始前に蓄える量や、保持するメモリ量にも影響します。供給速度が長く消費速度を下回れば、蓄えはやがて尽きます。[Streams APIとバックプレッシャー](/browser/streams-backpressure.html)

<figure class="study-figure">
  <img src="/images/browser/audio-buffer-underrun.svg" alt="番号4のまとまりを出力する予定は400ミリ秒。先読みがない場合は475ミリ秒に届き、400以上475ミリ秒未満の75ミリ秒が無音になる。100ミリ秒の先読みがある場合は375ミリ秒に届き、出力予定に間に合う。" width="760" height="1010" loading="lazy">
  <figcaption>同じ75 msの供給遅れを比較します。描いた横軸は1秒の出力のうち、番号4の供給を含む範囲です。<a href="/study/images/browser/audio-buffer-underrun.svg" target="_blank" rel="noopener noreferrer">先読みと欠損の比較図を拡大</a></figcaption>
</figure>

## アプリ内の供給不足と音声デバイスへの出力を区別する

この実験の**アンダーラン**は、`process()` が要求されたフレームを出力する時点で、アプリのキューに値がなかったことを指します。不足フレーム数は、キューが空で0を補った回数です。元のPCMにも振幅が0のサンプルはあり得るので、波形の値だけでは区別できません。無音で埋めた部分も含め、結果はブラウザが実際にレンダリングした `AudioBuffer` です。 `OfflineAudioContext` で計算するため、供給時刻はフレーム番号で制御できます。実際の再生で、処理時間が音声デバイスへの供給に追いつかない場合のアンダーランは、別の計測で調べます。[W3C Web Audio APIのOfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)、[システム側のアンダーラン](https://www.w3.org/TR/webaudio-1.1/#audio-buffer-underrun)

[実践サンプル](/practice/browser/audio-buffer-observation.html)では、二つの条件でレンダリングし、出力波形と不足フレーム数を比べられます。完成した音は再生ボタンで確認できます。

用意したPCMを複数の音源から同時に出すときは、足し合わせた振幅も確認します。信号経路のどこでゲインをかけるかと、クリップで波形が変わる様子は[Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)で扱います。
