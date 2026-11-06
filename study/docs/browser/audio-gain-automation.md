---
title: Web Audioのゲインオートメーション — フェードとクリックノイズ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: ゲインの切り替えとフェードを音声の時間軸で予約し、同じ音を止めたときの波形の段差を比べる。
  aliases: [Web Audio API, AudioParam, GainNode, setValueAtTime, linearRampToValueAtTime, a-rate, k-rate, フェード, クリックノイズ]
  verification: W3C Web Audio APIのAudioParam・GainNode・BaseAudioContext・OfflineAudioContextに照合（2026-11-06）
---

# Web Audioのゲインオートメーション — フェードとクリックノイズ

ゲームで再生中の効果音を消すとき、波形が大きく振れている途中で音を切ると、切った位置に段差ができます。この急な変化が短いクリック音として聞こえることがあります。音の終わりを数ミリ秒かけて小さくするフェードアウトでは、波形の振れ幅がゼロに近づいてから無音になります。

## 音声の時間軸でゲインを予約する

フレーム `n` の入力を `x[n]`、そのときのゲインを `g[n]` とすると、 `GainNode` の出力は `y[n] = x[n] × g[n]` です。音を足し合わせるときに固定の倍率を使ったのと同じ掛け算を、ここではフレームごとに変わる倍率で行います。[Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)、[W3C Web Audio APIのGainNode](https://www.w3.org/TR/webaudio-1.1/#GainNode)

`GainNode.gain` は `AudioParam` です。 `setValueAtTime(value, time)` は指定時刻に値を設定するイベントを追加します。 `linearRampToValueAtTime(value, endTime)` は直前のイベントから指定の終点まで、値を時間に比例して変化させます。値を保つ区間の後でフェードを始めるには、フェード開始時刻にも `setValueAtTime()` で開始値を置きます。[W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio-1.1/#AudioParam)

予約時刻は `BaseAudioContext.currentTime` と同じ、コンテキストの開始から数える秒単位です。 `AudioParam` のイベントは音声グラフのレンダリング時に評価されます。JavaScript の `setTimeout()` は指定した待ち時間の後にコールバックを実行できるようにします。実際の呼び出し時刻は、イベントループの進み方にもよります。[W3C Web Audio APIのcurrentTime](https://www.w3.org/TR/webaudio-1.1/#dom-baseaudiocontext-currenttime)、[WHATWG HTMLのタイマー](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

## 250 ms でゲインを変える

実践では、48,000 Hzのモノラル音源に、ピーク振幅が `0.40` の400 Hzの余弦波を使います。再生開始側の変化をそろえるため、両方のゲインを最初の10 msで `0` から `1` に上げます。250 msになったら、次の二通りで下げます。

- **一度に下げる**。 `setValueAtTime(0, 0.25)` で250 msにゲインを `0` にします。
- **10 ms かけて下げる**。 `setValueAtTime(1, 0.25)` で250 msのゲインを `1` に置き、 `linearRampToValueAtTime(0, 0.26)` で260 msに `0` へ到達させます。

<figure class="study-figure">
  <img src="/images/browser/audio-gain-timeline.svg" alt="同じ立ち上がりを持つ二つのゲインを比較する。上段は250ミリ秒で1から0へ切り替わる。下段は250ミリ秒で1を保ち、260ミリ秒までに直線で0へ下がる。" width="760" height="930" loading="lazy">
  <figcaption>同じ開始時刻に、一方は段差を作り、もう一方は直線で変化します。<a href="/study/images/browser/audio-gain-timeline.svg" target="_blank" rel="noopener noreferrer">ゲインの時間軸を拡大</a></figcaption>
</figure>

## 出力波形の段差を読む

フレーム番号を `0` から数えると、250 msはフレーム `12,000` です。400 Hzの波形はここでちょうど100周期を終え、振幅が `0.40` の山に来ます。1つ手前のフレーム `11,999` は約 `0.399452` です。ゲインを一度にゼロにすると、出力は次のフレームで `0` に飛びます。フェードでは開始点のゲインが `1` なので、そのフレームは `0.40` 付近を保ち、次のフレームからゲインが下がります。この境界の振幅差の絶対値は、それぞれ約 `0.399452` と `0.000548` です。10 msは480フレーム分の時間に当たります。

<figure class="study-figure">
  <img src="/images/browser/audio-fade-waveform.svg" alt="245から265ミリ秒の出力波形を同じ振幅目盛で比較する。上段は250ミリ秒の波形の山からゼロに切り替わる。下段は250ミリ秒から山と谷が小さくなり、260ミリ秒でゼロに達する。" width="760" height="960" loading="lazy">
  <figcaption>切り替え前の振幅が大きいほど、ゼロへ落としたときの段差が大きくなります。<a href="/study/images/browser/audio-fade-waveform.svg" target="_blank" rel="noopener noreferrer">出力波形の比較を拡大</a></figcaption>
</figure>

フェードが長いほど同じゲイン差を小さな刻みに分けられ、そのぶん消え切る時刻は後ろへ移ります。ゲームでは、消音が完了してから音源を取り外す設計なら、演出で必要な停止の時刻とフェードの長さを一緒に決められます。

## フレーム単位のパラメーターと実践

`GainNode.gain` の既定のオートメーションレートは `a-rate` です。この設定ではパラメーターをフレームごとに評価します。 `k-rate` ではレンダリングブロック先頭のフレームで評価し、その値をブロック全体に使います。[W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio-1.1/#AudioParam)、[GainNode](https://www.w3.org/TR/webaudio-1.1/#GainNode)

実践は `OfflineAudioContext` で両方の結果を `AudioBuffer` に描き出します。境界の前後1フレームの振幅とその差は、描き出したデジタル信号の値です。試聴時に聞こえる大きさは、再生ゲインや使う装置でも変わります。[W3C Web Audio APIのOfflineAudioContext](https://www.w3.org/TR/webaudio-1.1/#OfflineAudioContext)、[ゲインとフェードの実践](/practice/browser/audio-fade-observation.html)

一方の音を下げながら別の音を上げると、重なる区間の振幅は二つの波形とゲインで決まります。[Web Audioのクロスフェード](/browser/audio-crossfade.html)で、途中の実効値がへこむ場合と膨らむ場合を比べられます。
