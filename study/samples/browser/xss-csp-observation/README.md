# HTMLの解釈とCSPの観察

[公開サンプル](https://sny0.com/study/samples/browser/xss-csp-observation/index.html)で、同じ固定文字列を3通りに扱い、HTML要素の生成とインラインイベントハンドラーの実行を別々に観察します。[実践手順とコード](https://sny0.com/study/practice/browser/xss-csp-observation.html)

| 操作 | button要素 | 実行の印 | CSP違反通知 |
| --- | --- | --- | --- |
| textContentで試す | なし | なし | 未観測 |
| innerHTMLで試す | あり | あり | 未観測 |
| 実行を制限するCSPで試す | あり | なし | `script-src-attr` |

教材の文字列に含まれる `onclick` は、実行されるとボタン自身に固定の印を付けます。各実験で `button` 要素が生成された場合は、観察コードが `click()` を1回呼び出します。「CSP違反通知」はブラウザの `securitypolicyviolation` イベントで観測した指令です。通知が届かなかった場合は「未観測」と表示します。

## 手元で試す

`index.html`、`styles.css`、`main.js`、`frame-allow.html`、`frame-block.html`、`frame.js` を同じディレクトリに置き、静的なHTTPサーバーで開きます。Python 3がある場合は、配布ファイルのディレクトリで次を実行します。

```powershell
python -m http.server 4183 --bind 127.0.0.1
```

`http://127.0.0.1:4183/index.html` を開き、各操作を実行します。確認後はCtrl+Cで終了できます。CSP違反をブラウザの開発者ツールで調べる場合は、Consoleを開いてから3番目の操作を実行します。

## 実験用文書

親ページは操作ごとに `sandbox="allow-scripts"` のiframeを作ります。観察コードはその文書の中で実行し、結果は `postMessage()` で返します。親ページは送信元のウィンドウ、opaque origin、操作名と結果の形式を照合します。実験に使う文字列はコード内で固定してあります。

`frame-allow.html` では `script-src-attr` に `'unsafe-hashes'` と固定の `onclick` 本文のSHA-256ハッシュを指定します。`frame-block.html` では `script-src-attr 'none'` にします。両方の文書で、観察用の外部スクリプトは `script-src 'self'` で許可します。ブラウザの対応状況によって、許可側のハッシュ指定や違反イベントの観測結果が異なる場合があります。
