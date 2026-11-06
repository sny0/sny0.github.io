# Web Audioで急な消音とフェードを比べる

同じ音源を二つのゲインノードにつなぎ、250 msの時点で一方を消音し、もう一方をフェードさせます。波形とフレーム番号11,999から12,000への振幅差を比べると、切り替え方によって波形がどう変わるかを確認できます。[公開サンプル](https://sny0.com/study/samples/browser/audio-fade-observation/index.html)、[解説](https://sny0.com/study/browser/audio-gain-automation.html)

## 手元で動かす

`index.html`、`styles.css`、`main.js`、`fade-engine.js` を同じフォルダに保存します。そのフォルダでPython 3を使ってHTTPサーバーを起動します。

```powershell
python -m http.server 4191 --bind 127.0.0.1
```

`http://127.0.0.1:4191/` を開き、フェード時間を選んで計算します。終了時はサーバーを起動した端末でCtrl+Cを押します。[実践手順](https://sny0.com/study/practice/browser/audio-fade-observation.html#run-locally)

## 観察する値

音源はピーク0.40の400 Hzのコサイン波です。48,000 Hzで0.5秒分を作り、両方の経路で冒頭の10 msをかけてゲインを0から1へ上げます。フレーム番号12,000ではコサイン波の振幅が0.40です。このときのゲインを段差で0にする場合と、1から直線的に0へ下げる場合を、同じ `OfflineAudioContext` の二つのチャンネルに記録します。

| 250 msの処理 | フレーム11,999 | フレーム12,000 | 振幅差の絶対値 |
| --- | ---: | ---: | ---: |
| すぐ消音する | 約0.399452 | 0 | 約0.399452 |
| フェードを始める | 約0.399452 | 約0.400000 | 約0.000548 |

フェード時間は1、5、10、20、50 msです。例えば10 msなら480フレームをかけ、フレーム番号12,480でゲインが0になります。表の振幅差は消音やフェードを始める位置での二つのサンプルを比べた値です。[Web Audio APIのAudioParam](https://www.w3.org/TR/webaudio-1.1/#AudioParam)
