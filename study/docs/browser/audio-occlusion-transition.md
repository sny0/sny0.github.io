---
title: Web Audioで遮蔽をなめらかに切り替える
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 扉が開いて直接音の遮蔽が外れるとき、ゲインとローパスのカットオフを音声の時刻に合わせて変える。時定数で切り替えの速さを調整する。
  aliases: [Web Audio API, 音の遮蔽, AudioParam, setTargetAtTime, 時定数, スムージング, ゲイン, ローパスフィルター, カットオフ]
  verification: W3C Web Audio APIのAudioParam・BiquadFilterNodeの仕様、cancelAndHoldAtTimeの対応状況と代替時の制約を確認（2026-11-11）
---

# Web Audioで遮蔽をなめらかに切り替える

隣室の機械音が鳴り続けている場面で扉を開けると、聞き手に届く直接音は大きくなり、高い周波数も聞こえやすくなります。ゲームでは、音源を再生したままゲインとローパスのカットオフ周波数を更新すると、この変化を表せます。音量や音色が急に変わるのを抑えるには、パラメーターを少しずつ目標値に近づけます。[音の遮蔽](/browser/audio-occlusion.html) · [W3C Web Audio APIのAudioParamの遷移](https://www.w3.org/TR/webaudio/#audioparam-transitions)

## 扉の状態を音声の設定に反映する

ゲーム側が聞き手と音源の間に扉があるかを判定し、遮蔽の状態が変わったら、音声グラフに二つの目標値を渡します。実践では、開始から400 msで扉が開き、ゲインを0.5から1へ、カットオフを1,000 Hzから8,000 Hzへ変えます。開いた後の音も同じローパスを通し、カットオフを上げて実験に使う250 Hzと4,000 Hzを通しやすくします。[W3C Web Audio APIのBiquadFilterNode](https://www.w3.org/TR/webaudio/#BiquadFilterNode)

<figure class="study-figure">
  <img src="/images/browser/audio-occlusion-transition-path.svg" alt="ゲーム側で扉が開いて遮蔽が外れたら、音声側でカットオフを1,000から8,000 Hzに、ゲインを0.5から1に変更する。再生中の音源はローパスとゲインを通って出力される。" width="760" height="416" loading="lazy">
  <figcaption>遮蔽の判定を受けて二つのパラメーターを更新します。音源は再生を続けます。<a href="/study/images/browser/audio-occlusion-transition-path.svg" target="_blank" rel="noopener noreferrer">扉と音声グラフの図を拡大</a></figcaption>
</figure>

## 時定数で目標に近づく速さを決める

`setValueAtTime()` で新しい値を予約すると、指定した時刻にその値へ切り替わります。`setTargetAtTime(target, startTime, timeConstant)` では、指定した時刻から目標値へ指数的に近づきます。`timeConstant` は**時定数**で、秒で指定します。切り替えを始めてからの経過時間を `t`、時定数を `τ` とすると、変化する全幅のうち進んだ割合は `1 − exp(−t / τ)` です。[W3C Web Audio APIのsetValueAtTime](https://www.w3.org/TR/webaudio/#dom-audioparam-setvalueattime) · [setTargetAtTime](https://www.w3.org/TR/webaudio/#dom-audioparam-settargetattime)

経過時間が `τ` になると約63.2%、`3τ` になると約95.0%まで進みます。時定数を20 msにすると、ゲイン0.5から1への変化は20 ms後に約0.816、60 ms後に約0.975です。時定数を60 msにすると、同じ値に達する目安はそれぞれ60 ms後と180 ms後になります。その先も目標値との残りの差は徐々に小さくなります。

<figure class="study-figure">
  <img src="/images/browser/audio-occlusion-transition-curve.svg" alt="扉が開く時刻を0 msとした変化の割合。瞬時切り替えは0 msで100%に変わる。時定数20 msは20 ms後に63.2%、60 ms後に95.0%。時定数60 msは60 ms後に63.2%、180 ms後に95.0%。" width="760" height="416" loading="lazy">
  <figcaption>進み具合は設定値がどこまで変わったかを表します。カットオフの変化に対して、音の振幅や音色はフィルターの応答に従って変わります。<a href="/study/images/browser/audio-occlusion-transition-curve.svg" target="_blank" rel="noopener noreferrer">時定数の比較を拡大</a></figcaption>
</figure>

## 同じ音声時刻でゲインとカットオフを動かす

音声グラフでは、ゲインとカットオフはどちらも `AudioParam` です。例えば扉が開いたことをゲーム側が検知したら、`audioContext.currentTime` を一度読み、同じ時刻を使って二つの目標値を予約します。すでに遮蔽中の値で再生している音を開いた側に移す例です。[Web Audioのゲインオートメーション](/browser/audio-gain-automation.html) · [W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio/#AudioParam)

```js
const start = audioContext.currentTime;
const timeConstant = 0.020;
occlusionGain.gain.setTargetAtTime(1, start, timeConstant);
lowpass.frequency.setTargetAtTime(8_000, start, timeConstant);
```

扉が途中で閉じるなど、切り替え中に次の状態へ移るときは、その時点の値から新しい目標へ向かわせます。上の例のように目標を時系列で追加する場合、前の`setTargetAtTime()`は次のイベント時刻まで有効です。将来の予約も取り消すなら、対応するブラウザーでは`cancelAndHoldAtTime()`でその時刻の値を保持してから、新しい目標を予約できます。ただし、このメソッドには未対応のブラウザーもあるため、機能検出が必要です。[W3CのcancelAndHoldAtTime](https://www.w3.org/TR/webaudio/#dom-audioparam-cancelandholdattime) · [対応状況](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime)

未対応時は、アプリが管理する遷移の式から切り替え時刻の値を求め、将来の予約を消した**後で**その値を置き、新しい目標を予約します。例えば、開始値`from`から`target`へ時刻`startedAt`・時定数`tau`で近づけている、一つの`setTargetAtTime`区間なら次のように扱えます。

```js
const now = audioContext.currentTime;
const held = target + (from - target) * Math.exp(-(now - startedAt) / tau);
if (typeof param.cancelAndHoldAtTime === "function") {
  param.cancelAndHoldAtTime(now);
} else {
  param.cancelScheduledValues(now);
  param.setValueAtTime(held, now);
}
param.setTargetAtTime(nextTarget, now, nextTau);
// 次回のため、from=held、target=nextTarget、startedAt=now、tau=nextTauを保存する。
```

この代替は`now >= startedAt`、`tau > 0`で、その区間をアプリが一貫して管理する場合の例です。任意のランプや音声入力による変調を含む全オートメーションの汎用代替ではありません。`AudioParam.value`を読むだけで任意の未来時刻の値を得られると考えず、管理するイベントの種類に応じて計算します。[W3Cの遷移式](https://www.w3.org/TR/webaudio/#audioparam-transitions) · [予約の取消し](https://www.w3.org/TR/webaudio/#dom-audioparam-cancelscheduledvalues)

壁の端で判定が頻繁に反転する場合は、ゲーム側で新しい判定が一定時間続いてから採用する方法があります。状態を確定するまでの待ち時間と、確定後に音を変える時定数を別に決めると、判定が落ち着く速さと音の切り替わる速さを個別に調整できます。

## ブラウザで切り替わる瞬間を比べる

実践では48,000 Hzの `OfflineAudioContext` で同じ音を二通りに処理し、瞬時に切り替えたときとなめらかに切り替えたときの波形を表示します。ゲインの推移も、一定値1の信号に同じゲイン操作を適用して測ります。出力波形には元の音の位相やフィルターの状態も影響するので、ゲインのグラフと波形はそれぞれの変化に注目して比べます。[遮蔽を切り替える実践](/practice/browser/audio-occlusion-transition-observation.html) · [W3C Web Audio APIのOfflineAudioContext](https://www.w3.org/TR/webaudio/#OfflineAudioContext)
