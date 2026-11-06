---
title: Web Audioの畳み込みリバーブ — インパルス応答から響きを作る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 音に対する部屋の応答をサンプル列で表し、入力に合わせてずらして足すと残響を作れる。ConvolverNodeで処理し、元の音と響きを別々に調整する仕組みを解説する。
  aliases: [Web Audio API, 畳み込み, 畳み込みリバーブ, convolution reverb, インパルス応答, impulse response, IR, ConvolverNode, 残響, 初期反射, ドライ, ウェット]
  verification: W3C Web Audio APIのConvolverNodeとJulius O. SmithのIntroduction to Digital Filtersに照合（2026-11-06）
---

# Web Audioの畳み込みリバーブ — インパルス応答から響きを作る

フィードバックディレイでは、音をループに戻して一定の間隔で繰り返します。部屋では壁や天井からの反射が異なる時刻に届き、いくつもの経路を通った音が重なります。短い刺激に対して届く音を**インパルス応答**（IR）として表すと、別の音にもその響きを加えられます。[フィードバックディレイ](/browser/audio-feedback-delay.html)、[W3C Web Audio APIのConvolverNode](https://www.w3.org/TR/webaudio/#ConvolverNode)

## 部屋の響きを波形にする

音源とマイクの位置を決めて部屋のインパルス応答を測ると、音源から直接届いた音に続いて、壁などを経由した**初期反射**が現れます。その後は多くの反射が重なり、全体として弱くなっていきます。この応答には部屋の形や材質のほか、音源とマイクの位置も反映されます。測定には、周波数を連続的に変えた信号をスピーカーから流し、録音からインパルス応答を求める方法もあります。[Julius O. Smithの人工残響](https://www.dsprelated.com/freebooks/pasp/Artificial_Reverberation.html)、[Angelo Farinaのスイープ信号による測定](https://angelofarina.it/Public/Papers/134-AES00.PDF)

実践では、初期反射と減衰する尾をコードで作った2種類のIRを使います。IRに直接音を含めず、別の経路で元の音（ドライ）を加えます。響きだけの音（ウェット）にかけるゲインを変えると、ドライ経路の振幅を保ったまま残響の量を調整できます。直接音を含んだ実測のIRで同じように重ねると、直接成分も足し合わさります。[Web Audioのミキシングとヘッドルーム](/browser/audio-mixing-and-headroom.html)

<figure class="study-figure">
  <img src="/images/browser/audio-convolution-paths.svg" alt="入力を二つに分ける。ドライ経路は入力をそのまま、ウェット経路はインパルス応答との畳み込みにゲインを掛け、最後に二つを足す。" width="760" height="404" loading="lazy">
  <figcaption>響きだけを別の経路に置くと、元の音にどれだけ加えるかを調整できます。<a href="/study/images/browser/audio-convolution-paths.svg" target="_blank" rel="noopener noreferrer">ドライとウェットの経路を拡大</a></figcaption>
</figure>

## 入力のサンプルごとに応答をずらして足す

IRを `h[k]`、入力を `x[n]` とします。時刻 `n` に値 `x[n]` があると、そのサンプルの寄与として、IRを `n` サンプルずらして `x[n]` 倍した波形が加わります。すべての入力サンプルの寄与を重ねる演算が**畳み込み**です。IRが `M` サンプルなら、出力 `y[n]` は同じ計算を次の形で表せます。入力の範囲外は0とします。[Julius O. Smithの畳み込みの導出](https://www.dsprelated.com/freebooks/filters/Convolution_Representation.html)

```text
y[n] = Σ (h[k] × x[n − k])    k = 0 … M − 1
```

例えば `x = [1, 0.5]` と `h = [0.6, 0.3, 0.15]` では、時刻0の入力から `[0.6, 0.3, 0.15, 0]`、時刻1の入力から `[0, 0.3, 0.15, 0.075]` が生じます。重なった値を足すと `[0.6, 0.6, 0.3, 0.075]` です。時刻1の出力 `0.6` には、時刻0に入ったサンプルの遅れた成分 `0.3` と、時刻1に入ったサンプルからの成分 `0.3` が含まれています。

<figure class="study-figure">
  <img src="/images/browser/audio-convolution-overlap.svg" alt="入力の1番目から0.6、0.3、0.15、0が生じる。入力の2番目から1サンプルずれた0、0.3、0.15、0.075が生じる。列ごとの合計は0.6、0.6、0.3、0.075。" width="760" height="416" loading="lazy">
  <figcaption>IRを入力の時刻に合わせてずらし、同じ時刻に届く成分を足します。<a href="/study/images/browser/audio-convolution-overlap.svg" target="_blank" rel="noopener noreferrer">サンプルごとの畳み込みを拡大</a></figcaption>
</figure>

入力が `N` サンプル、IRが `M` サンプルあると、線形畳み込みの出力は `N + M − 1` サンプルです。最後に入った音からも遅れて届く成分があるため、入力が止まったあとに響きが残ります。インパルスとして `[1]` だけを入力すると、出力は `h` そのものになります。[Julius O. Smithの短い信号の畳み込み](https://www.dsprelated.com/freebooks/sasp/Convolution_Short_Signals.html)

## ConvolverNodeにインパルス応答を渡す

`ConvolverNode.buffer` にIRを `AudioBuffer` として設定します。バッファのサンプルレートはコンテキストに合わせます。仕様上、IRのチャンネル数は1、2、4のいずれかで、実践ではモノラルの入力とモノラルのIRを使います。`normalize` の既定値は `true` で、IRごとの出力レベルの差を抑えるためにIRをスケーリングします。バッファに書いた係数で畳み込む場合は、`normalize = false` を `buffer` に代入する前に設定します。[W3C Web Audio APIのConvolverNode](https://www.w3.org/TR/webaudio/#ConvolverNode)

畳み込みの式をそのまま計算すると、長いIRでは出力サンプルごとの積和が増えます。実装によってはIRを分割してFFTで周波数領域へ移し、掛け算した結果を時間領域に戻して重ねます。Web Audioの仕様が定めるのは線形畳み込みの結果です。処理方法はブラウザの実装に委ねられます。[Julius O. Smithの畳み込み定理](https://www.dsprelated.com/freebooks/mDFT/Convolution_Theorem.html)、[William G. GardnerのブロックFFTを用いる畳み込み](https://aes.org/publications/elibrary-page/?id=6335)

## ゲームの空間ごとに響きを変える

例えば、プレイヤーが通路から広いホールへ入るとき、足音をホール用のIRへ送る量を増やせます。この送り出しを**センド**と呼びます。元の音には距離による音量や方向を適用し、残響経路では空間の響きを加えます。IRを再生中に差し替えると不連続が生じることがあるため、空間の境目では別の `ConvolverNode` を用意し、両方の響きを重ねながら切り替える方法があります。[W3C Web Audio APIのConvolverNode](https://www.w3.org/TR/webaudio/#ConvolverNode)、[Web Audioのクロスフェード](/browser/audio-crossfade.html)

## ブラウザで残響の始まりと尾を比べる

実践では `OfflineAudioContext` と `ConvolverNode` でウェット信号を生成し、サンプル値にゲインを掛けてドライ信号に加えます。小部屋を想定したIRでは12 ms、ホールを想定したIRでは40 msで最初の反射が始まります。同じ打音を使い、IRを切り替えたときの波形と聴こえ方を比べます。[畳み込みリバーブの実践](/practice/browser/audio-reverb-observation.html)、[W3C Web Audio APIのOfflineAudioContext](https://www.w3.org/TR/webaudio/#OfflineAudioContext)
