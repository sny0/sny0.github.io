---
title: CSRFでCookie付きの要求が届く条件を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: csrf-observation
  order: 1
  summary: 別オリジンのフォームから届くCookie付きのPOSTを、追加の検査をしない場合、Originを照合する場合、セッションに結び付けたトークンを照合する場合で比べる。
  aliases: [CSRF, Origin, SameSite, Cookie, synchronizer token, POST, フォーム送信]
  verification: Windows上のブラウザで2つの送信元と3経路の組み合わせを実行確認（2026-11-05）
---

# CSRFでCookie付きの要求が届く条件を観察する

同じサイトの中でポートが違う2ページを使います。別オリジンのフォームから送信しても、ブラウザは送信先のCookieを付ける場合があります。サーバーに届いた要求を受理する条件を変え、教材用カウンターが増えるかを見ます。仕組みの図は辞典記事にあります。[CSRFとリクエスト検証](/browser/csrf-and-request-validation.html)

## 公開版で受理の条件を比べる

<p><a href="/study/samples/browser/csrf-observation/index.html" target="_blank" rel="noopener noreferrer">CSRFのモデルを新しいタブで開く</a></p>

公開版は、セッションのCookieが送信条件を満たすとした**シミュレーション**です。送信元とサーバーの検査方法を選ぶと、要求に付くと想定した項目と、教材用カウンターの変化を表示します。

| サーバー側の検査 | アプリ側のフォーム | 別オリジンのフォーム |
| --- | --- | --- |
| 追加の検査なし | 受理 | 受理 |
| `Origin` をアプリのオリジンと照合 | 受理 | 拒否 |
| セッションに結び付けたトークンを照合 | 受理 | トークンがなく拒否 |

## ローカル版で実際のフォームを送信する

<p><a href="/study/samples/browser/csrf-observation/server.py" download>server.pyをダウンロード</a></p>

Python 3.10以降で次を実行します。待ち受け先はループバックに限ります。

```powershell
python server.py
```

1. `http://127.0.0.1:4190/csrf-lab/` を開き、教材用セッションを開始します。Cookieは `SameSite=Strict` で、発行から120秒有効です。
2. 「別オリジンのページへ」から `http://127.0.0.1:4191/csrf-other/` を開き、「追加検査なしの経路へ送信」を押します。送信先が受け取った `Origin` は4191番を含み、セッションCookieは届き、カウンターが増えます。
3. 別オリジン側に戻り、「Originを照合」「トークンを照合」をそれぞれ試します。どちらもCookieは届きます。前者は `Origin` の不一致、後者はトークンの欠落で拒否され、カウンターは増えません。
4. アプリ側からトークン付きフォームを送信し、同じ検査を通過することを確認します。最後にアプリ側でログアウトし、Ctrl+Cで停止します。

スキームとホストが同じでポートだけが違うため、この2ページは別オリジンですが同一サイトです。CookieのPathは `/csrf-lab/` なので、別オリジン側のページそのものを取得する `/csrf-other/` のGETには付きません。そこから `/csrf-lab/` へフォームを送信すると、宛先の条件を満たすCookieが使われます。[Cookieとセッション](/browser/cookies-and-sessions.html)、[HTML Standardのオリジンとサイト](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin)

サーバーは実験用の2つの `Origin` のみを受け付け、各経路で表の追加検査を行います。実際の変更は教材のカウンターに限ります。開発者ツールのNetworkでは、フォーム送信のPOSTに含まれる `Origin` と `Cookie` を確認できます。セッションが切れた場合はアプリ側で開始し直します。

## ファイルとコード

- <a href="/study/samples/browser/csrf-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/csrf-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/csrf-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/csrf-observation/server.py" download>server.py</a>
- <a href="/study/samples/browser/csrf-observation/README.md" download>README.md</a>

### 公開モデルの判定

<<< @/public/samples/browser/csrf-observation/main.js{js}

### 実際のフォームを受け取るローカルサーバー

<<< @/public/samples/browser/csrf-observation/server.py{python}
