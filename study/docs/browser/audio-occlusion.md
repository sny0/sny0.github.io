---
title: Web Audioの音の遮蔽 — 壁越しの音量と音色
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 聞き手と音源の間に壁があるかを調べ、ゲインとローパスフィルターで直接音の弱まり方を変える。
  aliases: [Web Audio API, 音の遮蔽, occlusion, レイキャスト, ローパスフィルター, lowpass, BiquadFilterNode, GainNode, カットオフ, 周波数応答]
  verification: W3C Web Audio APIのフィルターとゲインの仕様、Unreal Engine公式ドキュメントの遮蔽機能に照合（2026-11-06）
---

# Web Audioの音の遮蔽 — 壁越しの音量と音色

壁の向こうの足音は、同じ距離にある足音でも小さく、こもって聞こえることがあります。ゲームでこの違いを表すには、聞き手と音源の間に壁があるかを調べ、音量と周波数ごとの強さを変えます。Unreal Engineの遮蔽機能にも、障害物を調べる設定と、遮蔽時のゲインやローパスフィルターを決める設定があります。[Unreal Engineの音の減衰と遮蔽](https://dev.epicgames.com/documentation/en-us/unreal-engine/sound-attenuation-in-unreal-engine#attenuationocclusion)

## 直接届く経路に壁があるか調べる

聞き手から音源に向かってレイキャストし、音源までの区間で壁などに当たるかを調べます。描画用の形と遮蔽判定用の形を分ける場合は、閉じた扉など、音を遮るものが判定に含まれるようにします。[Unreal Engineの遮蔽判定に使うトレース](https://dev.epicgames.com/documentation/en-us/unreal-engine/sound-attenuation-in-unreal-engine#occlusiontracechannel)

実践では、聞き手を `(x, z) = (0, 0)`、壁を `z = −2.5` の `x = −2〜2` に置きます。聞き手と音源を結ぶ線分が `z = −2.5` に達したとき、そこでの `x` が壁の範囲に入れば遮蔽です。真っすぐ先の音源 `(0, −6)` への線分は `x = 0` で壁に当たり、右前の音源 `(4.8, −3.6)` への線分は `x ≈ 3.33` で壁の右を通ります。どちらも聞き手からの距離は6です。

<figure class="study-figure">
  <img src="/images/browser/audio-occlusion-path.svg" alt="上から見た聞き手と壁と二つの音源。聞き手から真っすぐ先の音源への線分は壁に当たり、右前の音源への線分は壁の右を通る。どちらの音源も聞き手からの距離は6。" width="760" height="416" loading="lazy">
  <figcaption>距離が同じでも、音源との間に壁があるかどうかで遮蔽の判定が変わります。<a href="/study/images/browser/audio-occlusion-path.svg" target="_blank" rel="noopener noreferrer">遮蔽判定の図を拡大</a></figcaption>
</figure>

## 全体を小さくする処理と高音を弱める処理

`GainNode` のゲインを0.5にすると、すべての周波数成分の振幅が半分になります。振幅比を `20 × log10(振幅比)` で表すと約−6.02 dBです。そこに `BiquadFilterNode` の `lowpass` を重ねると、カットオフ周波数付近から周波数が上がるにつれて振幅が徐々に弱まり、音色も変わります。[W3C Web Audio APIのGainNode](https://www.w3.org/TR/webaudio/#GainNode) · [BiquadFilterNode](https://www.w3.org/TR/webaudio/#BiquadFilterNode)

実践では、サンプルレート48,000 Hz、カットオフ1,000 Hzの2次ローパスを使います。この型の `Q` はdBで指定するため、カットオフでフィルター単体の振幅比が `1 / √2` になる設定では `Q ≈ −3.0103` です。ゲインとフィルターを直列につなぐと各周波数の振幅比が掛け合わされるので、dBで表した増減は足し算できます。[W3C Web Audio APIのBiquadFilterNodeと係数](https://www.w3.org/TR/webaudio/#BiquadFilterNode)

| 処理 | 250 Hzの振幅の増減 | 4,000 Hzの振幅の増減 |
| --- | ---: | ---: |
| 遮蔽なし | 0 dB | 0 dB |
| ゲイン0.5 | −6.02 dB | −6.02 dB |
| ゲイン0.5とローパス | 約−6.04 dB | 約−30.50 dB |

<figure class="study-figure">
  <img src="/images/browser/audio-occlusion-response.svg" alt="遮蔽なしは全周波数で0 dB。ゲイン0.5は全周波数で約マイナス6.02 dB。ゲイン0.5にカットオフ1,000 Hzのローパスを重ねると、250 Hzで約マイナス6.04 dB、4,000 Hzで約マイナス30.50 dBになる。" width="760" height="416" loading="lazy">
  <figcaption>ゲインだけを変えると曲線は水平です。ローパスを加えると、高い周波数ほど大きく弱まります。<a href="/study/images/browser/audio-occlusion-response.svg" target="_blank" rel="noopener noreferrer">周波数応答の図を拡大</a></figcaption>
</figure>

## ゲームでは遮蔽と音の位置を別々に更新する

モノラルの効果音なら、音源ごとにゲインとフィルターで遮蔽を表し、`PannerNode` で方向と距離を反映できます。再生中に扉が開閉するときは、ゲインとカットオフ周波数を `AudioParam.setTargetAtTime()` などで新しい値に近づけると、音量や音色が急に変わるのを抑えられます。壁の端で判定が頻繁に切り替わる場合は、少し時間を置いて状態を確定する方法もあります。[Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html) · [W3C Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio/#AudioParam)

壁を挟んだときも、扉や廊下を通る音、壁に反射した音などが聞き手に届く場合があります。線分1本のモデルは直接経路の判定に使い、ほかの経路の強さは必要に応じて別に調整します。ゲイン0.5やカットオフ1,000 Hzはこの実験の設定です。実際の聞こえ方は壁の材質や厚さ、周囲の形にも左右されます。[Web Audioの畳み込みリバーブ](/browser/audio-convolution-reverb.html)

## ブラウザで同じ音を聴き比べる

実践では、同じ距離の二つの位置を切り替え、壁の判定とフィルターの効果を比べます。`getFrequencyResponse()` でローパスの振幅比を求め、ゲインと合わせた結果をグラフにします。壁に当たる位置を選び、同じ音を「ゲインのみ」と「ゲイン＋ローパス」で聴き比べると、音量の変化と高音の弱まりを確認できます。[音の遮蔽の実践](/practice/browser/audio-occlusion-observation.html) · [W3C Web Audio APIの周波数応答](https://www.w3.org/TR/webaudio/#BiquadFilterNode-methods)
