---
title: Cookieとセッション — 要求への付与とサーバー側の寿命
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: Set-Cookieを受け取ってからCookieが次の要求に付くまでを説明する。属性とcredentialsの条件、セッションIDの照合、ブラウザとサーバーそれぞれの期限を整理する。
  aliases: [Cookie, HTTP cookie, Set-Cookie, cookie jar, host-only, Domain, Path, Expires, Max-Age, Secure, HttpOnly, SameSite, credentials, セッション, セッションID, session fixation, CSRF, XSS]
  verification: RFC 6265、IETFの改訂草案、WHATWG標準と照合（2026-11-05）
---

# Cookieとセッション — 要求への付与とサーバー側の寿命

**Cookie**は、ブラウザが名前と値を保存し、条件が合うHTTP要求に付ける仕組みです。たとえば**セッションID**をCookieに入れると、サーバーは次の要求でそのIDを受け取り、ログイン情報や期限などの状態を照合できます。ブラウザでCookieが残る期間と、サーバーがIDを有効と判断する期間は別々に決まります。[RFC 6265の例](https://www.rfc-editor.org/rfc/rfc6265.html#section-3.1)、[NISTのセッション管理](https://pages.nist.gov/800-63-4/sp800-63b/session/)

## 応答で設定し、次の要求で送る

たとえば `https://app.example.com/study/` の応答で、サーバーが次のヘッダーを返します。

```http
Set-Cookie: study_theme=dark; Path=/study/; Max-Age=600; Secure; SameSite=Lax
```

ブラウザはこの指示を検査し、受け入れたCookieを属性と一緒に保存します。以後、同じホストの `/study/chapter.html` を同一サイトの文脈でHTTPS取得するとき、保存期限などの条件を満たせば次のように送ります。要求に戻すのは名前と値です。サーバーは受信した `Cookie` ヘッダーだけから、そのCookieの `Max-Age` や `Path` を判定できません。[RFC 6265のCookieヘッダー](https://www.rfc-editor.org/rfc/rfc6265.html#section-4.2.2)

```http
Cookie: study_theme=dark
```

ブラウザ上の `fetch()` では、呼び出し元のコードが `Cookie` 要求ヘッダーを直接指定できません。`Set-Cookie` 応答ヘッダーも `response.headers` には公開されません。ブラウザがヘッダーを処理した結果は、開発者ツールで要求・応答と保存内容を分けて確認できます。JavaScriptから `document.cookie` で取得できるのは、現在の文書から利用できるCookieのうち、`HttpOnly` が付いていないものです。[WHATWG Fetchのヘッダー規則](https://fetch.spec.whatwg.org/#forbidden-request-header)、[応答ヘッダーの制限](https://fetch.spec.whatwg.org/#forbidden-response-header-name)、[WHATWG HTMLのdocument.cookie](https://html.spec.whatwg.org/multipage/dom.html#dom-document-cookie)

<figure class="study-figure">
  <img src="/images/browser/cookie-request-flow.svg" alt="HTTPS応答のSet-Cookieを受けたブラウザが値と属性を保存し、次の要求の送信先や期限などを確認して、条件が合うとCookieヘッダーに名前と値を付ける。例のPathではstudy配下の要求に付き、assets配下の要求には付かない。" width="760" height="1180" loading="lazy">
  <figcaption>保存するときに使う属性と、サーバーへ戻す名前と値を分けます。<a href="/study/images/browser/cookie-request-flow.svg" target="_blank" rel="noopener noreferrer">Cookieが要求に付く流れを拡大</a></figcaption>
</figure>

## ブラウザが保存・送信の判断に使う属性

| 属性 | 判断する条件 |
| --- | --- |
| `Domain` | 省略すると **host-only** になり、設定元と同じホストが対象。許される親ドメインを指定すると、そのドメインと配下のサブドメインが対象になる。無関係なドメインは指定できない。 |
| `Path` | 要求先URLのパスが範囲に入るか。たとえば `/study/` は `/study/a.html` に一致し、`/study-other/a.html` には一致しない。 |
| `Expires` / `Max-Age` | `Expires` は期限日時、`Max-Age` は受理からの秒数。両方に有効な値があると `Max-Age` が優先される。 |
| `Secure` | ブラウザが安全とみなす通信経路に限定する。一般のWeb配信ではHTTPSを使う。 |
| `HttpOnly` | `document.cookie` などから値を参照できなくする。他の条件を満たすHTTP要求には付く。 |
| `SameSite` | 要求の文脈が同一サイトかどうかを使って、送信や一部の保存を制限する。 |

Cookieのホスト照合にはポートを使いません。同じホストの別ポートは別オリジンでも、Cookieの候補になり得ます。`Path` で決まるのはCookieを送る範囲などです。同じオリジンの別パスのページ同士ではDOMへアクセスできるため、パスに機密情報の隔離を任せられません。同じ名前でもパスやドメインの異なるCookieは共存でき、サーバーが複数を受け取る場合があります。[RFC 6265の属性とヘッダーの意味](https://www.rfc-editor.org/rfc/rfc6265.html#section-4)、[Cookieの分離の限界を整理したIETF改訂草案 §8.5](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-8.5)

`Expires` と `Max-Age` を省略したものは、ブラウザが定義するセッションの終了までの **セッションCookie** です。セッション復元の仕方はブラウザに依存するため、タブやブラウザを閉じる操作だけでアプリのログアウトを判断できません。期限付きのCookieも、ユーザーによる削除、保存上限、ブラウザの方針などで先に消える場合があります。[RFC 6265の保存モデル](https://www.rfc-editor.org/rfc/rfc6265.html#section-5.3)、[OWASPのブラウザ終了とログアウト](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#limits-of-logout-on-browser-close)

削除するときは対象と同じ名前、`Domain` の指定有無と値、`Path` で、期限が切れたCookieを設定します。例の `study_theme` なら、同じホストのHTTPS応答から `Set-Cookie: study_theme=; Path=/study/; Max-Age=0; Secure; SameSite=Lax` を返します。別のパスに同じ名前があれば、そのCookieは別に扱います。[RFC 6265の削除例](https://www.rfc-editor.org/rfc/rfc6265.html#section-3.1)、[IETF改訂草案の保存モデル](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.7)

## SameSiteと、別オリジンへのfetch

HTTP(S)のオリジンはスキーム・ホスト・ポートで区別します。一方、通常のWebサイト同士では、スキームと登録可能ドメインが一致するかがサイト比較の基準です。たとえば `https://app.example.com` と `https://api.example.com` は別オリジンでも同一サイトです。埋め込みでは祖先の文書もCookieのサイト判定に関わります。[WHATWG HTMLのSites](https://html.spec.whatwg.org/multipage/browsers.html#sites)、[IETF改訂草案のSame-site判定](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.2)

| 明示した `SameSite` | 送信の判断 |
| --- | --- |
| `Strict` | 同一サイトの文脈に限る。別サイトのリンクをたどって開く最初の要求にも付かない。 |
| `Lax` | 同一サイトに加え、別サイトからでもトップレベルの移動でGETなどのsafeメソッドを使う場合は候補になる。 |
| `None` | 別サイトにも送信できる設定。保存時に `Secure` が必要で、ブラウザのCookie制限も適用される。 |

属性の省略にはブラウザの既定規則が適用されます。互換動作によって作成直後のCookieに追加の例外を設ける場合があり、明示的な `Lax` と常に同じ結果になるとは限りません。属性の値はクロスサイトのサブリソース応答などから設定できるかにも影響します。[IETF改訂草案のSameSite属性](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-4.1.2.7)、[保存モデル](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.7)

`fetch()` の `credentials: "same-origin"` は既定値で、同一オリジンに限って資格情報を扱います。`"omit"` ではCookieを送らず、応答の `Set-Cookie` も無視します。`"include"` は別オリジンでも資格情報を扱う指定ですが、ブラウザは宛先に合うCookieを選び、その `SameSite` やプライバシー設定も適用します。[WHATWG Fetchのcredentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode)

たとえば `https://app.example.com` のコードが `https://api.example.com/profile` を取得するとします。APIのホスト用に保存済みのCookieを送るには、`credentials: "include"` とCookieの送信条件が関わります。取得した応答をコードが読むには、API側の `Access-Control-Allow-Origin: https://app.example.com` と `Access-Control-Allow-Credentials: true` が関わります。CORS検査で応答がコードに公開されなくても、本要求が送られていればサーバー処理やブラウザによる `Set-Cookie` の処理が起き得ます。[WHATWG Fetchの資格情報付きCORS例](https://fetch.spec.whatwg.org/#cors-protocol-examples)、[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

## セッションIDを使って、サーバーが状態を引く

サーバー側に状態を持つ方式では、認証に成功したときなどにサーバーが推測しにくいランダムなIDを発行し、IDに対応する利用者・権限・期限を保存します。ブラウザのCookieに入れるのはIDです。次の要求では、サーバーが受け取ったIDを状態と照合し、その操作の権限を確認します。有効なIDを知る相手が本人として扱われる構成では、IDの漏えいを認証情報の漏えいとして扱います。[NISTのセッション管理](https://pages.nist.gov/800-63-4/sp800-63b/session/)、[OWASPのセッションIDの値](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-id-content-or-value)

ログインや権限の変化ではIDを更新し、古いIDを無効化します。認証前に使っていたIDをそのまま使うと、攻撃者があらかじめ知っているIDを利用者に使わせる **セッション固定攻撃** が成り立ち得ます。ログアウトではサーバー側でIDを失効させ、応答でブラウザ側のCookieも期限切れにします。無操作時間や開始からの経過時間による期限もサーバーで判定できます。[OWASPの権限変更時のID更新](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#renew-the-session-id-after-any-privilege-level-change)、[OWASPのセッションの期限](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-expiration)

<figure class="study-figure">
  <img src="/images/browser/cookie-session-lifetime.svg" alt="ブラウザはCookieにIDを持ち、サーバーは同じIDに対応する利用者、権限、期限を記録する。Cookieが消えた場合とサーバーでIDが失効した場合では、次の要求で失敗する箇所が異なる。ログアウト時は両方を処理する。" width="760" height="1150" loading="lazy">
  <figcaption>Cookieの有無と、サーバーがそのIDを受理するかを別々に観察します。<a href="/study/images/browser/cookie-session-lifetime.svg" target="_blank" rel="noopener noreferrer">セッションの寿命を拡大</a></figcaption>
</figure>

**セッションCookie**という呼び名はブラウザ側の保持方式を指し、**セッションID**はサーバー側で状態を探す手掛かりです。セッションIDを期限付きCookieに入れる構成もあります。`sessionStorage` はタブなどのページセッションに結び付く保存APIで、値がHTTP要求へ自動で付くことはありません。[ブラウザの保存領域](/browser/storage-lifetime.html)

## HttpOnlyとSameSiteが守る範囲

**XSS** により攻撃者のスクリプトがページ内で実行されると、`HttpOnly` でセッションCookieの直接読取りを抑えられても、そのページから送られた要求にCookieが付くことがあります。データがHTMLやコードに変わる箇所と、実行を制限する仕組みは次の章で扱います。[OWASPのHttpOnly解説](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#httponly-attribute)、[XSSとCSP](/browser/xss-and-csp.html)

**CSRF** では、別のページから利用者のブラウザに要求を送らせ、そこに付くCookieを利用して状態変更を起こそうとします。`SameSite` はCookieの送信範囲を絞ります。要求を受け取ったアプリが送信元やトークンを照合する手順は、次の章で扱います。[CSRFとリクエスト検証](/browser/csrf-and-request-validation.html)

## 実践との対応

公開版では、教材フォルダ用と子ディレクトリ用に短い期限の固定Cookieを設定し、親ページと子ページで見える名前を比べます。ローカル版では、サーバーの `Set-Cookie`、続く要求の `Cookie`、`HttpOnly` の有無による見え方、サーバー側のセッション失効を観察します。[Cookieとセッションを観察する](/practice/browser/cookie-session-observation.html)
