# 同一オリジンとCORSの観察

[公開サンプル](https://sny0.com/study/samples/browser/cors-observation/index.html)では、同じ固定テキストを通常のページとサンドボックス内のiframeから取得できます。[実践手順とコード](https://sny0.com/study/practice/browser/cors-observation.html)

`index.html`、`styles.css`、`observe.js`、`main.js`、`frame.html`、`frame.js`、`payload.txt`を同じフォルダに置き、HTTP(S)で配信します。通常の静的サーバーでも配信元のヘッダーに従った結果を観察できます。

## 4つの操作

1. **通常ページからGET**。同一オリジンの `fetch()` が本文を読めることを確認します。
2. **別オリジンからCORS GET**。sandbox内のiframeから取得し、配信元がCORSを許可した場合に本文を読めることを確認します。
3. **別オリジンからno-cors GET**。ブラウザが応答をopaqueとして扱う場合、ステータスが `0` と表示され、本文は取得結果から読めません。
4. **カスタムヘッダー付きGET**。iframeから `X-Study-Demo: 1` を指定します。新たに許可が必要なとき、ブラウザがまずOPTIONSを送ります。

iframeに `allow-scripts` だけを指定するため、同じサイトから配信しても文書は独自のopaque originを持ちます。この実験の別オリジンからのCORSリクエストでは、ブラウザは `Origin: null` を送ります。iframeは結果だけを `postMessage()` で親に伝え、親はiframeのWindowとメッセージの形式を照合します。

## ローカルで許可と拒否を比べる

同じフォルダに `server.py` も置きます。Python 3が使える端末で次のいずれかを実行します。起動時に表示されたURLをブラウザで開きます。

```sh
python server.py --policy deny --port 4176
python server.py --policy read --port 4177
python server.py --policy preflight --port 4178
```

| ポリシー | 通常ページ | CORS GET | no-cors GET | カスタムヘッダー付きGET |
| --- | --- | --- | --- | --- |
| `deny` | basic、200 | Fetch失敗 | opaque、0 | OPTIONS 403、GETなし |
| `read` | basic、200 | cors、200 | opaque、0 | OPTIONS 403、GETなし |
| `preflight` | basic、200 | cors、200 | opaque、0 | OPTIONS 204の後にGET 200、cors |

端末にはパス、HTTPステータス、関連する要求ヘッダーが出ます。`deny` でCORS GETを実行すると、端末にはGET 200が出ても、画面ではFetch失敗になります。`preflight` のカスタムヘッダー付きGETでは、端末でOPTIONSと実際のGETを順に確認できます。

サーバーは `127.0.0.1` に限って接続を受け付けます。実験のデータは公開用の固定テキストで、Fetchには資格情報を含めません。試し終えたら端末で Ctrl+C を押してサーバーを停止します。
