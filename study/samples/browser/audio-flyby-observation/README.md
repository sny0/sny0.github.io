# Web Audioで音源の通過音を比べる

正面を向いた聞き手の前を、440 Hzの音源が左から右へ通ります。速度と最接近距離を変え、音源の位置、予測した周波数、距離によるゲイン、ブラウザで処理したステレオ音を比べます。[公開サンプル](https://sny0.com/study/samples/browser/audio-flyby-observation/index.html) · [仕組みの解説](https://sny0.com/study/browser/audio-flyby.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`flyby-engine.js`、`README.md` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4200 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:4200/` を開きます。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-flyby-observation.html#run-locally)

## 音の作り方と測り方

静止した聞き手を原点に置き、音源の座標を `x = 速さ × (再生時刻 − 1秒)`、`z = −最接近距離` とします。聞き手に向かう速度成分を `u = −速さ × x / 距離` とし、音速343 m/sを使って周波数を `440 × 343 / (343 − u)` Hzと見積もります。位置と速度は再生時刻から求めます。[OpenStaxのドップラー効果の解説](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect)

48,000 Hzの `OfflineAudioContext` で2秒間のステレオ音を作ります。10 msごとの周波数比を `playbackRate` の曲線に設定し、`PannerNode` のX座標を一定の速さで動かします。パンニングは等電力方式で、距離減衰には基準距離5 mの逆距離モデルを使います。再生区間の両端には短いフェードを掛けています。[W3C Web Audio APIのAudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode) · [PannerNode](https://www.w3.org/TR/webaudio/#PannerNode)

再生開始から0.5秒、1秒、1.5秒を中心とする20 msの区間を測ります。音の高さは、パンニング前のモノラル波形が0を下から上に横切る間隔から求めます。左右のゲインは、各チャンネルの実効値を同じ区間のモノラル音の実効値で割った値です。表示する予測値は時刻ごとの値で、実測値には測定区間内での変化とブラウザのパラメーター処理間隔が反映されます。
