---
title: CSRFとリクエスト検証 — Cookie付きの要求を受理する条件
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: ブラウザがCookieを付けて別オリジンへフォームを送る経路と、サーバーがOriginやCSRFトークンで状態変更を検証する手順を説明する。
  aliases: [CSRF, Cross-Site Request Forgery, クロスサイトリクエストフォージェリ, リクエスト偽造, ambient authority, Origin, Referer, SameSite, synchronizer token, CSRFトークン, CORS, preflight]
  verification: WHATWG標準、RFC 9110、CookieのIETF改訂草案、OWASP資料と照合（2026-11-05）
---

# CSRFとリクエスト検証 — Cookie付きの要求を受理する条件

**CSRF**（Cross-Site Request Forgery）は、攻撃者が利用者のブラウザに要求を送らせ、ログイン中のサイトなどで意図しない操作を行わせる攻撃です。たとえば別のページが設定変更先へフォームを送信し、ブラウザが対象サイトのセッションCookieを付けるとします。サーバーがセッションの有効性だけで更新を受理すれば、その利用者の設定が変更されます。サーバーが確認するべきなのは、Cookieに対応する利用者に加え、その操作をどの文脈で受理するかです。[OWASPのCSRF対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#introduction)、[Cookieとセッション](/browser/cookies-and-sessions.html)

## フォームの送信にCookieが付くまで

HTMLのフォームは、`action` に別オリジンのURLを指定して送信できます。ブラウザはその宛先、要求の文脈、Cookieの属性などを照合し、条件に合うCookieを要求に付けます。フォームを作ったページがCookieの値を知っている必要はありません。このように宛先に応じて自動的に使われる資格情報を、**ambient authority** と呼びます。[WHATWG HTMLのフォーム送信](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm)、[IETF Cookie改訂草案のambient authority](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-8.2)

たとえば、`https://account.example.test` がアカウント設定を持ち、`https://community.example.test` が利用者のコンテンツを表示できる別のページだとします。両者は別オリジンですが同一サイトです。利用者がコミュニティ側のフォームから設定のURLへ送信すると、条件を満たす場合は次のような要求がアカウント側に届きます。[WHATWG HTMLのオリジンとサイト](https://html.spec.whatwg.org/multipage/browsers.html#sites)、[WHATWG FetchのOriginヘッダー](https://fetch.spec.whatwg.org/#origin-header)

```http
POST /settings/theme HTTP/1.1
Host: account.example.test
Origin: https://community.example.test
Cookie: sid=example-session-id
Content-Type: application/x-www-form-urlencoded
Content-Length: 10

theme=dark
```

この例では `Origin` がフォームを送ったページのオリジンを示し、Cookieの選択先はアカウント側です。セッションCookieをアカウント側だけのhost-onlyにしていても、アカウント側へ向かう要求には付き得ます。送信と応答の読み取りも別の段階です。元のページが別オリジンの応答の内容を読めなくても、更新の結果はサーバー側に残り得ます。[WHATWG FetchのCORSプロトコル](https://fetch.spec.whatwg.org/#http-cors-protocol)、[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

<figure class="study-figure">
  <img src="/images/browser/csrf-request-flow.svg" alt="アカウントサイトのセッションCookieを持つブラウザが、別オリジンのコミュニティからアカウントサイトへフォームを送る。ブラウザが宛先に合うCookieを付けるため、セッションだけを検証するサーバーでは設定が変更される場合がある。" width="760" height="1120" loading="lazy">
  <figcaption>フォームが送る値、ブラウザが付ける資格情報、サーバーが更新を受理する判断を順番に追います。<a href="/study/images/browser/csrf-request-flow.svg" target="_blank" rel="noopener noreferrer">Cookie付きの要求の流れを拡大</a></figcaption>
</figure>

## SameSiteとオリジンの違い

`SameSite` はサイトを単位にCookieの送信条件を絞ります。たとえば明示的な `Lax` は、別サイトからのトップレベル移動でも、GETなどHTTPのsafeメソッドなら送信を許す場合があります。`Strict` の条件はより狭く、同一サイトの文脈が必要です。埋め込みページでは祖先の文書も同一サイトかどうかの判断に関わります。[IETF Cookie改訂草案のSameSite](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-4.1.2.7)、[同一サイトの判定](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.2)

オリジンはスキーム、ホスト、ポートの組で決まります。通常のHTTP(S)ページでは、スキームとサイトの単位が同じでも、ホストやポートが違えば別オリジンになり得ます。たとえば同じループバックIPとスキームを使う二つのポートは同一サイトで、フォームを送るページと受けるページのオリジンは異なります。Cookieのホスト照合にもポートの区別がありません。ローカル実験では、この関係を使って、`SameSite=Strict` でも条件に合う別オリジンのフォーム送信にCookieが付くことを観察します。[WHATWG HTMLのオリジン](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin)、[IETF Cookie改訂草案の分離の限界](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-8.5)

## 状態変更の入口を分ける

HTTPでGETやHEADなどがsafeとされるのは、利用者がリソースの状態変更を要求する用途を想定しないためです。たとえば `GET /settings/theme` は現在の設定の取得に使い、保存はPOSTやPATCHなどの専用の経路に分けます。リンクを開くことやプリフェッチが状態変更につながる設計では、GETでCookieが付く条件がそのまま攻撃経路になり得ます。変更用の経路では、メソッドと認証・認可に加えてCSRFの検証を行います。[RFC 9110のSafe Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1)、[HTTPメッセージ](/network/http-messages.html)

## 送信元のオリジンを確認する

変更を受け付けるサーバーでは、ブラウザが送った `Origin` を、アプリで定めた許可オリジンと正確に照合できます。比較するのはスキーム、ホスト、有効なポートの組です。たとえば `https://account.example.test` を許可する場合、単純な文字列の前方一致では `https://account.example.test.other.test` のような別ホストも通ってしまいます。期待するオリジンはアプリの設定から取り、リバースプロキシがある場合は、信頼するプロキシが確定した転送情報だけを使います。[OWASPの送信元検証](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#using-standard-headers-to-verify-origin)、[WHATWG HTMLのオリジン](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin)

ブラウザや要求の種類によっては `Origin` が付かない場合があります。互換性のために `Referer` を使う構成では、`Origin` が欠けたときだけ参照元URLを解析し、そのオリジンを同じ規則で照合します。参照元もプライバシー方針などで省略され得ます。`Origin: null` は不透明なオリジンなどで使われる値です。許可オリジンと一致する値を確認できないときに更新を拒否する方針なら、`null`、不正な値、検証できるヘッダーがない場合も拒否に含めます。[WHATWG FetchのOriginヘッダー](https://fetch.spec.whatwg.org/#origin-header)、[OWASPの送信元検証](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#using-standard-headers-to-verify-origin)

ブラウザは、ページのJavaScriptから `Origin` を任意の値に書き換えることを制限します。ブラウザ外のHTTPクライアントは任意の値を送れるため、利用者の認証と認可はセッションなどを使って確認します。[WHATWG Fetchの禁止された要求ヘッダー](https://fetch.spec.whatwg.org/#forbidden-request-header)

## セッションに結び付いたトークンを照合する

サーバー側にセッションがある構成では、**同期トークン方式**（synchronizer token pattern）が使えます。サーバーは暗号学的に安全な乱数で推測しにくい値を作り、セッションに結び付けます。正規のフォームにはその値を隠しフィールドとして含めます。フォーム送信時に、サーバーは受け取った値を該当セッションの値と照合し、欠落や不一致があれば更新を拒否します。Cookieはブラウザが自動で送りますが、フォームのフィールドは送信元のページが内容を用意する必要があります。[OWASPの同期トークン方式](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern)

フォームなら要求本文、JavaScriptのAPI呼び出しなら要求ヘッダーなどでトークンを渡します。URLに置くとアクセスログ、履歴、条件によっては `Referer` に残るため、本文やヘッダーを使います。この方式ではサーバーが持つトークンを照合し、Cookieの存在はセッションの確認に使います。[OWASPのトークンの受け渡し](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#transmitting-csrf-tokens-in-synchronized-patterns)

<figure class="study-figure">
  <img src="/images/browser/csrf-validation-flow.svg" alt="状態変更を受けるサーバーがメソッド、セッションと権限、送信元のオリジン、セッションに結び付いたCSRFトークンを検証する。条件を満たした場合に更新し、検証に失敗した場合は変更を拒否する。" width="760" height="1220" loading="lazy">
  <figcaption>送信元とトークンを併用する構成の例です。更新は必要な検証が通ってから行います。<a href="/study/images/browser/csrf-validation-flow.svg" target="_blank" rel="noopener noreferrer">状態変更の検証手順を拡大</a></figcaption>
</figure>

## JavaScriptのAPIとCORSの境界

APIが `X-CSRF-Token` のような独自の要求ヘッダーを必須にすると、変更をヘッダー付きの呼び出しに絞れます。通常のHTMLフォームから指定できるのは、宛先やメソッド、送るフィールドなどです。別オリジンのJavaScriptが独自ヘッダーを付けて `fetch()` する場合は、ブラウザが必要に応じてpreflightのOPTIONSを送り、API側のCORS方針が許可した場合に本要求を送ります。API側ではヘッダーが必要なルートに確実に適用し、資格情報付きのCORSを使う場合は信頼するオリジンを明示します。信頼しないオリジンにもpreflightを許可すると、この境界は緩みます。[OWASPのカスタムヘッダーとCORS](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#custom-headers-and-cors)、[WHATWG Fetchのpreflight](https://fetch.spec.whatwg.org/#cors-preflight-fetch)

通常のURLエンコードされたフォームPOSTは、カスタムヘッダー付きのCORS要求とは異なる経路で送れます。CORSで応答を公開しない設定だけでフォーム経由の状態変更を防ぐことはできません。フォームとJavaScriptの両方を受けるAPIでは、どの経路にも状態変更前の検証がかかることを確かめます。[WHATWG HTMLのフォーム送信](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm)、[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

## XSSとの違いと組み合わせる防御

CSRFは別ページなどからブラウザに対象サイトへの要求を送らせます。XSSでは攻撃者のコードが対象サイトのページの中で動きます。その場合は正規ページと同じオリジンから要求を送り、ページに置かれたトークンを読み取れることがあります。Cookieの送信範囲、変更用のメソッド、送信元の検証やトークン、XSSを防ぐ出力処理は、それぞれ異なる経路を受け持ちます。[XSSとCSP](/browser/xss-and-csp.html)、[OWASPのCSRF対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#introduction)

## 実践との対応

公開版は、フォーム、Cookie、送信元、トークンの条件と、サーバーでの受理・拒否をたどるシミュレーションです。ローカル版では、別ポートの二つの教材オリジンでブラウザのフォームPOSTを実際に送ります。この二つを実験範囲として、CSRFの追加検査を行わないルート、アプリのオリジンと照合するルート、同期トークンのルートを比べます。[CSRFで要求の送信と検証を観察する](/practice/browser/csrf-observation.html)
