# Web Audioでドップラー効果を聴き比べる

音を聞く人と空気が静止しているとき、近づく音源から届く波の間隔は短くなり、遠ざかる音源から届く波の間隔は長くなります。このサンプルでは、音速を343 m/s、音源の周波数を440 Hzとし、音源が聞き手と一直線上を一定の速さで動く場合を再現します。[公開サンプル](https://sny0.com/study/samples/browser/audio-doppler-observation/index.html) · [仕組みの解説](https://sny0.com/study/browser/audio-doppler.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`doppler-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4199 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4199/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-doppler-observation.html#run-locally)

## 音の作り方と周波数の測り方

音源が聞き手へ近づく速度を正、遠ざかる速度を負として、`v` で表します。聞き手に届く周波数は `440 × 343 / (343 − v)` Hzです。40 m/sで近づく場合は約498.09 Hz、40 m/sで遠ざかる場合は約394.05 Hzになります。[OpenStaxのドップラー効果の解説](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect)

48,000 Hzの `OfflineAudioContext` で、同じ440 Hzのバッファを二通りに再生します。基準音の `playbackRate` は1、ドップラー効果を再現する音は `343 / (343 − v)` です。再生速度を変えると同じバッファを読み切るまでの時間も変わります。ここでは十分な長さのバッファから両方とも0.8秒分を取り出し、両端に同じフェードを掛けて比べます。[W3C Web Audio APIのAudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode)

周波数を測るときは、出力波形の100〜700 msで、値が0を下から上へ横切る時刻を探します。0を挟んだサンプルの間を直線で補間し、最初と最後の通過時刻から1周期の平均時間を求めます。その逆数を、出力から測った周波数として表示します。
