---
title: ブラウザで同一オリジンとCORSの応答を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: cors-observation
  order: 1
  summary: 同じ固定テキストを通常ページとsandbox付きiframeから取得し、応答を読める条件とpreflightで実際のGETが止まる条件を確かめる。
  aliases: [同一オリジン, CORS, fetch, iframe sandbox, opaque response, Origin, OPTIONS, preflight]
  verification: Windows上のブラウザでローカル配信の3条件を実行確認（2026-11-05）
---

# ブラウザで同一オリジンとCORSの応答を比べる

同じ固定テキストを、通常のページと `sandbox="allow-scripts"` のiframeから取得します。iframeのURLはページと同じ配信元にありますが、sandboxによって文書には独立したopaque originが割り当てられます。変えるのは要求を開始する文書、`fetch`のmode、カスタムヘッダーの有無です。オリジンの境界とpreflightの図は辞典記事にあります。[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

<p><a href="/study/samples/browser/cors-observation/index.html" target="_blank" rel="noopener noreferrer">CORSの実験ページを新しいタブで開く</a></p>

## 公開版で4つの要求を比べる

| 操作 | 要求元と設定 | この配信での観測の目安 |
| --- | --- | --- |
| 通常ページからGET | 親ページ、同一オリジン | `basic`、status 200、本文を読める |
| 別オリジンからCORS GET | sandbox内、`mode: "cors"`、追加ヘッダーなし | 応答の `Access-Control-Allow-Origin: *` により `cors`、status 200、本文を読める |
| 別オリジンからno-cors GET | sandbox内、`mode: "no-cors"` | `opaque`、status 0。JavaScriptに公開される本文とヘッダーはない |
| カスタムヘッダー付きGET | sandbox内、`mode: "cors"`、`X-Study-Demo` 付き | 先にpreflightのOPTIONSが出る。公開先がOPTIONSを405で拒否すると、GETへ進まず `fetch()` が失敗する |

すべて固定のGETで、`credentials: "omit"` を使います。公開版の結果は実際のブラウザと配信先の応答に従います。status 0はopaqueな `Response` のJavaScript上の値です。通信失敗でPromiseがrejectされた場合は `Response` 自体を受け取れません。[Fetch Standardのfiltered response](https://fetch.spec.whatwg.org/#concept-filtered-response)

別オリジンの `no-cors` では `redirect: "follow"` を指定します。この組み合わせで `redirect: "error"` を使うと、ブラウザは取得を始める前に失敗を返します。[Fetch StandardのMain fetch](https://fetch.spec.whatwg.org/#main-fetch)

## NetworkでOPTIONSとGETを分けて見る

1. 開発者ツールのNetworkを開き、`payload.txt` で絞り込みます。結果を見比べるときはログを一度消します。
2. 「別オリジンからCORS GET」を押します。要求の `Origin: null` と応答の `Access-Control-Allow-Origin` を確認します。表示上の `null` はopaque originをHTTPへ直列化した値です。この実験の `no-cors` のGETでは通常 `Origin` が付きません。
3. 「カスタムヘッダー付きGET」を押します。事前確認の許可がキャッシュされていなければ、先にOPTIONSが送られます。`Access-Control-Request-Method: GET` と `Access-Control-Request-Headers: x-study-demo` を確認します。失敗時は、Network上で実際のGETに応答があるかを分けて確認します。ブラウザによっては、送信されなかったGETも失敗した要求として一覧に出ます。

実験画面は、JavaScriptから観測できた値を表示します。rejectされた理由の切り分けにはNetworkとConsoleを使います。CORS、DNS、接続の失敗はいずれも `fetch()` の失敗として現れます。[Fetch Standardのpreflight](https://fetch.spec.whatwg.org/#cors-preflight-fetch)

## 手元で配信条件を切り替える

次の9ファイルを同じフォルダに置きます。ブラウザからはHTTPまたはHTTPSで開きます。

- <a href="/study/samples/browser/cors-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/cors-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/cors-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/cors-observation/observe.js" download>observe.js</a>
- <a href="/study/samples/browser/cors-observation/frame.html" download>frame.html</a>
- <a href="/study/samples/browser/cors-observation/frame.js" download>frame.js</a>
- <a href="/study/samples/browser/cors-observation/payload.txt" download>payload.txt</a>
- <a href="/study/samples/browser/cors-observation/server.py" download>server.py</a>
- <a href="/study/samples/browser/cors-observation/README.md" download>README.md</a>

Python 3があれば、まず配布フォルダで次を実行し、`http://127.0.0.1:4176/index.html` を開きます。

```powershell
python server.py --policy deny --port 4176
```

| `--policy` | 固定テキストのGET | カスタムヘッダーのpreflight |
| --- | --- | --- |
| `deny` | HTTP 200、CORS許可ヘッダーなし。別オリジンの `mode: "cors"` はrejectされる | 拒否 |
| `read` | HTTP 200、`Access-Control-Allow-Origin: *`。別オリジンのCORS GETから本文を読める | 拒否 |
| `preflight` | `read` と同じ | 対象のOPTIONSに204で許可を返し、その後のGETへ進む |

サーバーをCtrl+Cで停止してから、`--policy` を変えて再起動し、ページを再読み込みします。まず `deny` で通常ページとsandboxからGETします。ターミナルにはどちらのGETも記録されます。sandbox側のCORS GETは、サーバーで200が記録されてもページから応答を読めません。次に `preflight` でカスタムヘッダー付きGETを押し、OPTIONSとGETの両方をターミナルで確認します。

サーバーは `127.0.0.1` にbindし、固定の教材ファイルと応答を配信します。実験中のGETとOPTIONSに対してターミナルへ観測用ログを出します。

## コードで確認するところ

親ページは自分で同一オリジンのGETを実行し、別オリジンのケースごとに新しいsandbox付きiframeを作ります。親側はメッセージの送信元ウィンドウと `event.origin`、実行したケースの名前、データの形を確認します。子側は配信URLのオリジンを送信先として指定し、本文とstatusなどの観測結果だけを返します。複数のopaque originは同じ文字列 `"null"` で表されるため、文字列の一致だけで送信元を判断できません。[HTML StandardのWindow間メッセージ通信](https://html.spec.whatwg.org/multipage/web-messaging.html#crossDocumentMessages)

### 各ケースに共通するfetch

<<< @/public/samples/browser/cors-observation/observe.js{js}

### 通常ページ

<<< @/public/samples/browser/cors-observation/main.js{js}

### sandbox内で実行するfetch

<<< @/public/samples/browser/cors-observation/frame.js{js}

### ローカルサーバーの応答

<<< @/public/samples/browser/cors-observation/server.py{python}
