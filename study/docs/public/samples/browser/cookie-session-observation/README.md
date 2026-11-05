# Cookieとセッションの観察

[公開サンプル](https://sny0.com/study/samples/browser/cookie-session-observation/index.html)で、ページのJavaScriptから書いたCookieをどのパスで読めるか比べます。[実践手順とコード](https://sny0.com/study/practice/browser/cookie-session-observation.html)

## CookieのPathを公開サンプルで比べる

「保存して観察」を押して、サンプルのディレクトリ用と子ディレクトリ用の固定Cookieを作ります。「現在の見え方を確認」で、親と子の文書に見える項目を読み直せます。子ディレクトリでは両方が見え、親ディレクトリでは親側のCookieが見えます。「教材用Cookieを削除」で、実験用の2件を元のPathで期限切れにできます。

2件のCookieはhost-onlyで、`SameSite=Lax` と120秒の `Max-Age` を指定します。HTTPSで動かす場合は `Secure` も付きます。静的配信で試すときは `index.html`、`styles.css`、`main.js`、`child/probe.html` のフォルダ構成を保ち、HTTP(S)で開きます。

## ローカルのHTTPサーバーでセッションを観察する

`server.py`、`session.html`、`session.js` を同じフォルダに置き、Python 3.9以降で実行します。

```powershell
python server.py --port 4179
```

端末に表示された `http://127.0.0.1:4179/study-cookie-demo/session.html` を開きます。ポートを変更した場合は、起動時に出力されたURLを使います。

1. 「状態を確認」を押して、現在のCookieとセッションの有無を見ます。
2. 「セッションを開始」を押すと、サーバーが `Set-Cookie` でセッションIDと比較用の目印を返します。次のGETでサーバーは両方を受け取り、`document.cookie` では目印が見えます。セッションの世代は1です。
3. 「IDを更新」を押すと、サーバーが旧IDを無効にして新しいIDを発行します。世代は2に進みます。
4. 「ログアウト」を押すと、サーバーは現在のIDに対応するレコードを削除し、2件のCookieの `Max-Age=0` を返します。直後の状態確認に結果が表示されます。実験の終了後は端末でCtrl+Cを押してサーバーを停止します。

セッションIDには `HttpOnly` が付きます。Cookieはどちらもhost-onlyで、`Path=/study-cookie-demo/`、`SameSite=Strict`、`Max-Age=120` を指定します。配信先はループバックのHTTPです。保存期限と別に、サーバーも発行または更新から120秒で照合を打ち切ります。レコードはプロセスのメモリに置き、起動し直すと空になります。

観察画面はCookie名ごとの有無とサーバーの世代を表示します。DevToolsのNetworkでは、操作のPOSTに付く応答ヘッダー `Set-Cookie` と、その後のGETに付く要求ヘッダー `Cookie` を確認できます。セッションIDは教材用のランダム値です。
