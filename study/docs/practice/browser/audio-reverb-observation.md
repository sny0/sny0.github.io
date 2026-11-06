---
title: Web Audioで畳み込みリバーブを聴き比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: audio-reverb-observation
  order: 1
  summary: 同じ短い打音に小部屋とホールを模したインパルス応答を適用し、音が途切れたあとの波形と響きを比べる。
  aliases: [Web Audio API, 畳み込みリバーブ, convolution reverb, ConvolverNode, インパルス応答, IR, 初期反射, 残響, dry, wet]
  verification: WindowsのChromium系ブラウザで全6設定の波形と実効値、元の打音と響きを加えた音の試聴を確認（2026-11-06）
---

# Web Audioで畳み込みリバーブを聴き比べる

約60 msの打音に、小部屋またはホールを模したインパルス応答を使って残響を加えます。一方の図は処理に渡すインパルス応答で、もう一方の図は打音を処理して得た出力です。[経路と畳み込みの図を読む](/browser/audio-convolution-reverb.html)

<p><a href="/study/samples/browser/audio-reverb-observation/index.html" target="_blank" rel="noopener noreferrer">リバーブの実験を新しいタブで開く</a></p>

## 響きの長さと残響側のゲインを変える

設定を変えるたびに「波形を計算」を押します。

1. 小部屋を選び、残響側のゲインを **0.35** にして計算します。インパルス応答の最初の反射は **12 ms** で、打音が終わったあとも合成波形が続きます。
2. ゲインを0.35のままにして、ホールに変えます。最初の反射は **40 ms** になり、打音が終わってから波形が残る範囲も長くなります。同じ打音を試聴し、響きが消えていく速さを比べます。
3. 同じプリセットでゲインを **0 → 0.35 → 0.7** と変えます。ゲイン0では打音だけが聞こえます。0.35から0.7に上げると、打音が終わったあとに残る波形の振幅は2倍になります。

| プリセット | 最初の反射 | インパルス応答の長さ | 出力バッファの長さ |
| --- | ---: | ---: | ---: |
| 小部屋 | 12 ms | 300 ms | 約360 ms |
| ホール | 40 ms | 1,200 ms | 約1,260 ms |

この二つの応答は実験用に合成した波形です。いくつかの反射を置き、そのあとに細かく揺れながら減衰する波形を加えています。表の長さはバッファに入っている時間の範囲です。

## 直接音と残響を合成する

48,000 Hzの `OfflineAudioContext` で、同じ打音を直接経路と `ConvolverNode` を通る経路に流します。応答の係数を保つため、`normalize = false` を設定してから `buffer` を渡します。合成出力は「直接音 + 残響側の出力 × 残響側のゲイン」です。応答に直接音の成分を入れず、直接音は別の経路から足します。[W3C Web Audio APIのConvolverNode](https://www.w3.org/TR/webaudio/#ConvolverNode)

入力が `N` フレーム、インパルス応答が `M` フレームなら、畳み込みを最後まで収めるバッファは `N + M − 1` フレームです。打音の終了位置からバッファの最後までの実効値（RMS）を、振幅1を基準にしたdBFSで表示します。同じプリセットで残響側のゲインを倍にすると、この値は約 **6.02 dB** 上がります。プリセット間では測定区間の長さも変わります。

## 手元で動かす {#run-locally}

次の5ファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/audio-reverb-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/audio-reverb-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/audio-reverb-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/audio-reverb-observation/reverb-engine.js" download>reverb-engine.js</a>
- <a href="/study/samples/browser/audio-reverb-observation/README.md" download>README.md</a>

保存先のフォルダからPython 3で次を実行し、ブラウザで `http://127.0.0.1:4195/` を開きます。終了時はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 4195 --bind 127.0.0.1
```

## コード

### インパルス応答を作り、打音に畳み込む

<<< @/public/samples/browser/audio-reverb-observation/reverb-engine.js{js}

### 波形と残響の実効値を表示する

<<< @/public/samples/browser/audio-reverb-observation/main.js{js}
