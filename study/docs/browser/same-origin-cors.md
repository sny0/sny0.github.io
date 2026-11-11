---
title: 同一オリジンポリシーとCORS — 送信と応答の公開
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: オリジンの境界、同一オリジンポリシー、CORSの応答検査を整理する。OPTIONSによるプリフライト、資格情報、no-corsで見える応答を区別する。
  aliases: [オリジン, origin, 同一オリジンポリシー, same-origin policy, SOP, same-site, opaque origin, CORS, Cross-Origin Resource Sharing, プリフライト, preflight, Access-Control-Allow-Origin, credentials, no-cors, opaque response, CSRF]
  verification: 一次資料照合（2026-11-05）
---

# 同一オリジンポリシーとCORS — 送信と応答の公開

**同一オリジンポリシー**（Same-Origin Policy）は、あるページのコードが別のオリジンにある情報にアクセスできる範囲を制限します。**CORS**（Cross-Origin Resource Sharing）は、HTTPの応答を別のオリジンのコードに公開するための仕組みです。サーバーは公開条件を応答ヘッダーで示し、ブラウザがその条件を検査します。要求がサーバーに届くか、応答をJavaScriptから読めるかは別々に判断します。[WHATWG HTMLのOrigins](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin)、[WHATWG FetchのCORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)

## オリジンを決める3つの要素

HTTP(S)のオリジンは、**スキーム・ホスト・ポート**の組で決まります。ポートを省略したHTTPS URLは、既定の443番を明示したURLと同じオリジンです。パスやクエリが違っても、この3要素が一致すれば同一オリジンです。ローカル開発でも、同じホストの5173番と8000番を使うフロントエンドとAPIは別オリジンになります。[WHATWG HTMLのOrigins](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin)、[WHATWG URLのOrigin](https://url.spec.whatwg.org/#concept-url-origin)

| ページが `https://app.example.com/study/` の場合 | 同一オリジン | 判定の理由 |
| --- | --- | --- |
| `https://app.example.com/assets/data.json` | はい | パスだけが違う |
| `https://app.example.com:443/` | はい | 443番はHTTPSの既定ポート |
| `https://app.example.com:8443/` | いいえ | ポートが違う |
| `https://api.example.com/` | いいえ | ホストが違う |
| `http://app.example.com/` | いいえ | スキームが違う |

**同一サイト**（same-site）と同一オリジンでは、比較する項目が違います。たとえば `https://app.example.com` と `https://api.example.com` は、スキームと登録可能ドメインが同じなので同一サイトですが、別オリジンです。このため、Cookieの`SameSite`属性とCORSでは判定の単位が異なります。[WHATWG HTMLのSites](https://html.spec.whatwg.org/multipage/browsers.html#sites)

`iframe sandbox="allow-scripts"` で読み込んだ文書には、同じホストのファイルを使っていても、ブラウザが個別の**不透明なオリジン**（opaque origin）を割り当てます。このオリジンがHTTPの`Origin`ヘッダーに現れるときの値は文字列の`null`です。別々の不透明なオリジンも同じ文字列に変換されるので、`null`だけでは発行元を識別できません。[WHATWG HTMLのSandboxing](https://html.spec.whatwg.org/multipage/browsers.html#sandboxing)、[WHATWG FetchのOriginヘッダー](https://fetch.spec.whatwg.org/#origin-header)

<figure class="study-figure">
  <img src="/images/browser/cors-origin-boundary.svg" alt="スキーム、ホスト、ポートがそろうURLは同一オリジンになる。ホストやポートが変わると別オリジンになる。同じ配信元でも、サンドボックス内の文書は独自の不透明なオリジンを持つことを示す図" width="760" height="978" loading="lazy">
  <figcaption>パスだけが違うURLと、ホストやポートが違うURLを比べます。サンドボックス内では文書自身のオリジンも確認します。<a href="/study/images/browser/cors-origin-boundary.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## 埋め込み、DOMへのアクセス、応答の読み取り

画像の表示、別ページへの移動、フォームの送信など、別オリジンへ要求を送れる場面はあります。たとえば別オリジンのページを`iframe`に表示できても、親ページのスクリプトが子ページのDOMを直接読むことは制限されます。両方の文書が協力する場合は、`postMessage()`で決めた形式のデータを渡せます。受信側は`event.origin`とデータの形式を確認し、必要に応じて`event.source`で想定したウィンドウからの通知か確かめます。[WHATWG HTMLのオリジン間でアクセス可能なプロパティ](https://html.spec.whatwg.org/multipage/nav-history-apis.html#cross-origin-objects)、[WHATWG HTMLのCross-document messaging](https://html.spec.whatwg.org/multipage/web-messaging.html#crossDocumentMessages)

HTTP応答を`fetch()`で読む場合、別オリジンへの通常の取得には`mode: "cors"`を使います。ブラウザが要求に`Origin`を付け、サーバーの`Access-Control-Allow-Origin`などを検査します。通過すると、ブラウザが公開できる部分を`Response`として渡します。これは取得した応答をスクリプトに公開する手続きなので、別オリジンのウィンドウや保存領域へアクセスできる範囲は変わりません。[WHATWG FetchのCORS check](https://fetch.spec.whatwg.org/#cors-check)、[ブラウザの保存領域](/browser/storage-lifetime.html)

## 本要求の前にOPTIONSを送る条件

別オリジンへのCORS要求で、たとえば`PUT`を使う、独自ヘッダーを付ける、`POST`に`Content-Type: application/json`を指定する、といった場合は、ブラウザが本要求に先立って**プリフライト**（preflight）の`OPTIONS`を送ります。その内容を送ってよいか、相手サーバーに確かめるためです。以前に得た許可を専用のプリフライトキャッシュから使えるときは、その通信を省略できます。[WHATWG FetchのCORS-preflight fetch](https://fetch.spec.whatwg.org/#cors-preflight-fetch)、[CORS-preflight cache](https://fetch.spec.whatwg.org/#cors-preflight-cache)

`GET`、`HEAD`、`POST`はCORSの**safelisted method**です。要求ヘッダーについても、名前と値に応じた条件があります。`Content-Type`の種類では`application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`が候補です。ほかにプリフライトを要求する条件がなければ、safelistの範囲内の要求は直接送ります。ここで見る`Content-Type`は要求側のヘッダーです。追加ヘッダーのないGETにサーバーがJSONを返す場合、その応答の`Content-Type: application/json`でプリフライトが起きることはありません。[WHATWG FetchのCORS-safelisted method](https://fetch.spec.whatwg.org/#cors-safelisted-method)、[CORS-safelisted request-header](https://fetch.spec.whatwg.org/#cors-safelisted-request-header)

### プリフライトと本要求はそれぞれ検査される

次は、`https://app.example.com`から`https://api.example.com/score`へJSONを`PUT`する場合のヘッダー例です。要求を始めるJavaScriptは`PUT`を指定し、プリフライトはブラウザが組み立てます。[WHATWG FetchのCORS-preflight fetch](https://fetch.spec.whatwg.org/#cors-preflight-fetch)

```http
OPTIONS /score HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type
```

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: PUT
Access-Control-Allow-Headers: Content-Type
```

ブラウザはプリフライト応答のHTTP statusが成功範囲で、必要なオリジン、メソッド、ヘッダーが許可されていることを確かめます。失敗すると本要求を送らず、`fetch()`が拒否されます。プリフライトを通過すると本要求を送り、その応答でも`Access-Control-Allow-Origin`などを検査します。ここで失敗した場合、サーバーでは本要求による更新がすでに実行されていても、JavaScriptには応答を渡せません。[WHATWG FetchのCORS-preflight fetch](https://fetch.spec.whatwg.org/#cors-preflight-fetch)、[CORS check](https://fetch.spec.whatwg.org/#cors-check)

<figure class="study-figure">
  <img src="/images/browser/cors-preflight.svg" alt="別オリジンへのCORS取得では、必要な場合にOPTIONSで先に許可を検査する。そこで失敗すると本要求を送らない。通過した場合とプリフライト不要の場合は本要求へ進み、受け取った応答のCORS条件を検査することを示す図" width="760" height="1200" loading="lazy">
  <figcaption>拒否が起きた時点で、本要求が送られているかが変わります。プリフライトの許可を専用キャッシュから再利用できる場合もあります。<a href="/study/images/browser/cors-preflight.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## JavaScriptから見えるResponse

| 取得経路 | 代表的な結果 | JavaScriptから見える内容 |
| --- | --- | --- |
| 同一オリジンへの通常の取得 | `type: "basic"` | status、本文、公開可能な応答ヘッダー |
| 別オリジンでCORS検査を通過 | `type: "cors"` | status、本文、safelistや`Access-Control-Expose-Headers`に従う応答ヘッダー |
| 別オリジンへの`no-cors`取得でopaque応答を受領 | `type: "opaque"` | `status: 0`、`ok: false`、空のヘッダー、本文の公開なし |
| CORS検査の失敗や通信エラー | `fetch()`が拒否 | 検査できるHTTP応答は渡されない |

`mode: "no-cors"`では、指定できる要求メソッドやヘッダーが限られ、別オリジンの応答を読める範囲も狭くなります。opaque応答の0は、実際に受信したHTTP statusを伏せた値です。取得先や応答の種類、ブラウザのポリシーによっては`no-cors`取得自体が失敗することもあります。取得したデータをJavaScriptで処理する用途では、CORSで公開条件を整えます。[WHATWG Fetchの要求モード](https://fetch.spec.whatwg.org/#concept-request-mode)、[filtered response](https://fetch.spec.whatwg.org/#concept-filtered-response)

CORS検査を通過した`404`や`500`の本応答は、HTTP statusを持つ`Response`として扱えます。一方、CORSによる失敗はJavaScriptからは通信エラーに近い形で見えます。DevToolsのConsoleで失敗の理由を確認し、Networkで`OPTIONS`と本要求を分けて、status・要求側の`Origin`・応答側の`Access-Control-Allow-*`を照合します。配信側のログがあれば、どの要求が届いたかも確認できます。[WHATWG Fetchのfetchメソッド](https://fetch.spec.whatwg.org/#fetch-method)、[Chrome DevToolsのNetworkリファレンス](https://developer.chrome.com/docs/devtools/network/reference/)

## 資格情報と公開する相手

`fetch()`の`credentials`は、CookieやHTTP認証などの資格情報を取得で使うかを指定します。既定の`same-origin`では同一オリジンに限って使い、`omit`では使いません。別オリジンへの`include`では資格情報の利用を要求しますが、実際に送られるCookieは`SameSite`やブラウザのCookie制限にも従います。[WHATWG Fetchのcredentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode)、[CORS protocol and credentials](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials)

| 条件 | 公開を許可する応答ヘッダーの例 |
| --- | --- |
| 誰でも読める公開ファイルを`credentials: "omit"`で取得 | `Access-Control-Allow-Origin: *` |
| `https://app.example.com`から`credentials: "include"`で取得 | `Access-Control-Allow-Origin: https://app.example.com` と `Access-Control-Allow-Credentials: true` |

`include`では、実際にCookieが送られたかにかかわらず、`Access-Control-Allow-Origin: *`は検査を通過しません。プリフライトのOPTIONSには資格情報が付きませんが、資格情報付きの本要求を許可するには、その許可をプリフライト応答にも示します。`Authorization`のような要求ヘッダーは、必要なときに`Access-Control-Allow-Headers`へ名前を明示します。独自の**応答**ヘッダーをJavaScriptに公開する指定は`Access-Control-Expose-Headers`です。[WHATWG FetchのCORS protocol and credentials](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials)、[CORS-preflight fetch](https://fetch.spec.whatwg.org/#cors-preflight-fetch)

複数のオリジンを許可する構成では、要求の`Origin`を許可リストと照合し、一致した値を`Access-Control-Allow-Origin`に返します。応答が`Origin`によって変わる場合は`Vary: Origin`を指定し、HTTPキャッシュが別のオリジン用の応答を使い回すことを防ぎます。プリフライトの許可を再利用する時間は、別に`Access-Control-Max-Age`で指定できます。[WHATWG FetchのCORS protocol and HTTP caches](https://fetch.spec.whatwg.org/#cors-protocol-and-http-caches)、[HTTPキャッシュ](/network/http-caching.html)

要求にCookieが付く条件と、受け取ったIDをサーバーがどう照合するかは、[Cookieとセッション](/browser/cookies-and-sessions.html)で扱います。

ページが別オリジンの画像などを埋め込む条件には、COEPやCORPも関わります。CORSとどこで判断が分かれるかは、[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)で扱います。

## 更新を許可する判断はサーバーで行う

サーバーには、利用者の認証、その操作を行う権限の確認、必要に応じた**CSRF**（利用者のセッションを使った意図しない送信）への対策が必要です。たとえば状態を変更するフォームが別サイトから送信され、条件次第でCookieが付くことがあります。応答の読み取りが制限されても更新は起き得るため、サーバーがCSRFトークンの照合などで要求を検査します。[OWASPのCSRF対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

[Service Workerとオフライン動作](/browser/service-worker-offline.html)では、制御中のページが行った取得に対し、ワーカーが保存済み応答を選ぶ場面を扱いました。ワーカー自身が別オリジンへ`fetch()`するときも、要求モードとCORS検査に従います。別オリジンのopaque応答をCache APIへ保存して取り出しても、JavaScriptから見える部分は変わりません。[WHATWG FetchのMain fetch](https://fetch.spec.whatwg.org/#main-fetch)、[Service WorkersのCache](https://w3c.github.io/ServiceWorker/#cache-interface)

## 実践との対応

実践では、通常のページと不透明なオリジンを持つ`iframe`から、同じ固定ファイルを要求します。要求モードと独自ヘッダーの有無を切り替え、画面の`Response.type`、status、本文の公開状態を見比べます。DevToolsやローカル配信のログを併用すると、プリフライトと本要求のどちらが届いたかまで確かめられます。[同一オリジンとCORSの応答を観察する](/practice/browser/cors-observation.html)
