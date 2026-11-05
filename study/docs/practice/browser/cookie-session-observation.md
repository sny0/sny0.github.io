---
title: ブラウザでCookieの範囲とセッションIDを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: cookie-session-observation
  order: 1
  summary: 公開版でCookieのPathとdocument.cookieの見え方を比べ、ローカルサーバーでSet-Cookie、HttpOnly、セッションの照合と失効を観察する。
  aliases: [Cookie, document.cookie, Cookie Path, Set-Cookie, HttpOnly, SameSite, セッションID, ログアウト]
  verification: Windows上のブラウザでPathによる見え方、再読み込み、HttpOnly、ID更新とログアウトを確認（2026-11-05）
---

# ブラウザでCookieの範囲とセッションIDを観察する

公開版では、同じホストにある親ページと子ディレクトリのページで、`document.cookie` に現れるCookie名を比べます。ローカル版ではPythonサーバーを使い、ブラウザが受け取ったセッションIDを次の要求に付け、サーバーが記録を照合するところまで観察します。要求・応答の図と属性の意味は辞典記事にあります。[Cookieとセッション](/browser/cookies-and-sessions.html)

## 公開版でCookieのPathを比べる

<p><a href="/study/samples/browser/cookie-session-observation/index.html" target="_blank" rel="noopener noreferrer">Cookieの実験ページを新しいタブで開く</a></p>

1. 「保存して観察」を押します。教材フォルダ全体に適用するCookieと、`child/` 以下に適用するCookieを1件ずつ作ります。値は固定で、有効期間は120秒です。
2. 親ページの欄と、子ディレクトリのページの欄を比べます。親ページでは教材フォルダ用だけが見え、子ページでは両方が見えます。
3. ページを再読み込みし、期限内に「現在の見え方を確認」を押すと、保存したCookieを再び確認できます。「教材用Cookieを削除」を押すと、同じ名前・Pathを指定した教材用の2件が消えます。

| 教材用CookieのPath | 親ページで見える | `child/` のページで見える |
| --- | --- | --- |
| 教材フォルダのPath | はい | はい |
| 教材フォルダ内の `child/` | いいえ | はい |

画面は各文書の `document.cookie` から教材用の名前だけを拾います。PathはURLに対する選択条件です。この実験でも、同一オリジンの親ページは子ページの文書にアクセスできます。Pathによる選択を、同じオリジンのコード同士の隔離には使えません。[RFC 6265のPath属性](https://www.rfc-editor.org/rfc/rfc6265.html#section-4.1.2.4)、[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

## ローカル版でHTTPヘッダーとセッションを観察する

次の3ファイルを同じフォルダに保存します。Python 3.9以降の標準ライブラリで動きます。

- <a href="/study/samples/browser/cookie-session-observation/server.py" download>server.py</a>
- <a href="/study/samples/browser/cookie-session-observation/session.html" download>session.html</a>
- <a href="/study/samples/browser/cookie-session-observation/session.js" download>session.js</a>

そのフォルダで次を実行し、`http://127.0.0.1:4179/study-cookie-demo/session.html` を開きます。

```powershell
python server.py --port 4179
```

| 操作 | 観察する内容 |
| --- | --- |
| セッションを開始 | サーバーはランダムなIDを発行し、メモリに記録する。レスポンスの `Set-Cookie` でIDと観察用の印を別々に保存する |
| 状態を確認 | `document.cookie` で見えるのは観察用の印。サーバーは要求に付いたHttpOnlyのIDを読み、メモリの記録を照合する |
| IDを更新 | サーバーは旧IDを無効にして新IDを返す。次の状態確認では新しい世代になる |
| ログアウト | サーバーの記録を削除し、ブラウザ側の教材用Cookieを期限切れにする |

開発者ツールのNetworkで、`start` の応答の `Set-Cookie` と、その後の `state` の要求の `Cookie` を比べます。ヘッダーの名前と属性を確認すると、JavaScriptから見えないHttpOnlyのIDも、条件に合うHTTP要求に含まれることを追えます。画面とサーバーのログではIDの値を表示しません。[RFC 6265のHttpOnly属性](https://www.rfc-editor.org/rfc/rfc6265.html#section-4.1.2.6)

開始またはID更新から120秒が経過すると、Cookieの期限が切れ、サーバーもそのIDを無効として扱います。サーバーを停止するとメモリにある記録も消えます。教材用にループバックのHTTPで動かす構成なので、ここで使うCookieは `Secure` を付けずに観察します。利用者の資格情報を入力する欄はありません。実験を終えたらログアウトしてから、Ctrl+Cで停止します。

サーバーは `127.0.0.1` で待ち受け、指定の `Host` を確認します。開始・更新・ログアウトはPOSTで受け付け、同一オリジンの `Origin` ヘッダーを要求します。状態の観察はGETで行います。

## 配布ファイルとコード

公開版を手元で試す場合は、次のファイルを `cookie-session-observation` フォルダに置きます。`probe.html` はその中の `child` フォルダに置きます。

- <a href="/study/samples/browser/cookie-session-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/cookie-session-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/cookie-session-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/cookie-session-observation/child/probe.html" download>child/probe.html</a>
- <a href="/study/samples/browser/cookie-session-observation/README.md" download>README.md</a>

親ディレクトリで次を実行し、`http://127.0.0.1:4182/cookie-session-observation/index.html` を開きます。

```powershell
python -m http.server 4182 --bind 127.0.0.1
```

### 公開版の書き込みと読み取り

<<< @/public/samples/browser/cookie-session-observation/main.js{js}

### ローカル版の観測画面

<<< @/public/samples/browser/cookie-session-observation/session.js{js}

### ローカルサーバー

<<< @/public/samples/browser/cookie-session-observation/server.py{python}
