# Web Audioで遮蔽の切り替えを聴き比べる

扉が開く場面を想定し、同じ音を鳴らしたまま音量とカットオフ周波数を変えます。両方を瞬時に変える場合と、滑らかに目標へ近づける場合の出力を波形と試聴で比べます。[公開サンプル](https://sny0.com/study/samples/browser/audio-occlusion-transition-observation/index.html) · [仕組みの解説](https://sny0.com/study/browser/audio-occlusion-transition.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`transition-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4198 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4198/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-occlusion-transition-observation.html#run-locally)

## 音とゲインの測り方

250 Hzと4,000 Hzを重ねた1秒のモノラル音を48,000 Hzの `OfflineAudioContext` で処理します。同じ入力を二つの経路に分け、それぞれでローパスフィルターを通してからゲインを掛けます。開始時のゲインは0.5、カットオフ周波数は1,000 Hzです。扉が開く400 msで、ゲイン1とカットオフ8,000 Hzへの変更を始めます。両方の経路でローパスフィルターを使い、8,000 Hzは試聴に使う二つの音より高い値に設定しています。[W3C Web Audio APIのBiquadFilterNode](https://www.w3.org/TR/webaudio/#BiquadFilterNode)

瞬時の経路は `setValueAtTime()` で指定時刻に値を切り替えます。滑らかな経路は `setTargetAtTime()` で設定した時定数に従って値を変えます。ゲインを0.5から1へ変える例では、開始から時定数と同じ時間が経つと約0.816、時定数の3倍の時間が経つと約0.975になります。実際のゲインを表示するため、値1の定数信号に滑らかな経路と同じゲインを掛け、音の波形とは別のチャンネルに書き出しています。[W3C Web Audio APIのsetTargetAtTime](https://www.w3.org/TR/webaudio/#dom-audioparam-settargetattime)
