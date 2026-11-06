# Web Audioでフィードバックディレイを観察する

出力の一部を遅らせて入力側へ戻し、反響が繰り返される間隔と振幅を比べます。[公開サンプル](https://sny0.com/study/samples/browser/audio-feedback-observation/index.html)、[仕組みの解説](https://sny0.com/study/browser/audio-feedback-delay.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`feedback-engine.js` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4194 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4194/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-feedback-observation.html#run-locally)

## 測定と試聴

48,000 Hzの `OfflineAudioContext` に `DelayNode` と `GainNode` を含むループを作ります。振幅1のサンプルを一つ入力し、設定値の前後から最初の反響のピークを探します。その実測間隔をもとに後続の4回のピークも探し、各フレームの時刻と振幅を表示します。例えばゲイン0.7の場合、振幅はおよそ `1`、`0.7`、`0.49`、`0.343`、`0.2401`、`0.16807` と小さくなります。ゲイン0では反響が消えるので、遅延の設定値に沿った位置の出力を読み取ります。[W3C Web Audio APIのDelayNode](https://www.w3.org/TR/webaudio/#DelayNode)

ブラウザの処理方式により、反響が設定値より遅れて届くことがあります。実測したChromium環境では、遅延200 ms（9,600フレーム）に対し、反響は約202.67 ms（9,728フレーム）間隔でした。

試聴には、立ち上がりと終わりをなめらかにした45 msの打音を使います。反響を含む試聴音には、元の打音に対する理論上の振幅が初めて −48 dB以下になる回までを収めます。ゲイン0では試聴音の長さも同じです。
