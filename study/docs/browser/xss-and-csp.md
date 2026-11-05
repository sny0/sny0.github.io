---
title: XSSとCSP — データがコードとして実行される境界
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: XSSが成立する入力と出力の経路、文字列をテキストやHTMLとして扱う処理の違い、CSPによるスクリプト実行の制限を説明する。
  aliases: [XSS, Cross-Site Scripting, クロスサイトスクリプティング, 反射型, 蓄積型, DOM-based XSS, source, sink, textContent, innerHTML, 出力エンコード, サニタイズ, CSP, Content Security Policy, script-src, script-src-attr, nonce, hash, Report-Only]
  verification: WHATWG標準、W3CのCSP Level 3作業草案、OWASP資料と照合（2026-11-05）
---

# XSSとCSP — データがコードとして実行される境界

**XSS**（Cross-Site Scripting）は、Webアプリが外部から受け取ったデータを扱う過程で、攻撃者が用意したコードを利用者のブラウザで実行できる脆弱性です。たとえばコメントをHTMLに埋め込むとき、コメントの一部がボタンの `onclick` 属性として解釈されると、そのコードがページの実行環境で動き得ます。対策はデータをどこから受け取り、どこで何として解釈させるかを確認するところから始まります。[OWASPのXSS対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#xss-defense-philosophy)

## 入力から実行までをたどる

**source** はデータの入口です。フォーム、URLのクエリやフラグメント、APIの応答、保存済みのコメントなどがあります。**sink** はデータの行き先で、値の意味を決めるAPIやテンプレートの出力箇所です。たとえばURLの値を `innerHTML` に渡すコードでは、受け取った文字列がHTMLとして解釈される経路を追います。[OWASPのDOM Based XSS対策](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)

| 呼び方 | データがページに届く経路の例 |
| --- | --- |
| 反射型（reflected） | リクエストの検索語が、そのリクエストに対するHTML応答に埋め込まれる。 |
| 蓄積型（stored） | 投稿したコメントが保存され、後から閲覧した人のページに埋め込まれる。 |
| DOM型（DOM-based） | ページのJavaScriptがURLなどから値を読み、HTMLを解釈するAPIへ渡す。たとえばURLの `#` 以降はHTTP要求の対象に含まれなくても、ページのコードから読める。 |

反射型と蓄積型は主にデータの届き方に着目する呼び方です。DOM型はブラウザ側のコードにある実行経路に着目します。サーバーに保存された投稿をJavaScriptが取得して `innerHTML` に渡す場合は、蓄積型の経路とDOM側のsinkが組み合わさります。[OWASPのXSSの分類](https://community.owasp.org/Types_of_Cross-Site_Scripting)、[RFC 9110のターゲットURI](https://www.rfc-editor.org/rfc/rfc9110.html#section-7.1)

## 同じ文字列でも、渡すAPIで意味が変わる

`div` の中にコメントを表示するとします。`textContent` に代入するとテキストノードになります。`innerHTML` に代入すると、ブラウザは文字列をHTMLの断片として解析し、要素や属性を作ります。たとえば同じ文字列にボタンと `onclick` が含まれていると、一方は記号を含む文字として表示され、もう一方はクリック時にコードが動き得るボタンになります。[WHATWG DOMのtextContent](https://dom.spec.whatwg.org/#dom-node-textcontent)、[WHATWG HTMLのinnerHTML](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#the-innerhtml-property)、[イベントハンドラ](https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-content-attributes)

<figure class="study-figure">
  <img src="/images/browser/xss-data-to-code.svg" alt="同じ固定文字列をdivに渡したとき、textContentはテキストノードを作り、innerHTMLはHTMLを解析してボタンとonclick属性を作る。イベント発生時には許可されているハンドラが実行される。" width="760" height="1020" loading="lazy">
  <figcaption>文字列の形が同じでも、受け取るAPIがテキストとHTMLのどちらとして処理するかで、できるノードが変わります。<a href="/study/images/browser/xss-data-to-code.svg" target="_blank" rel="noopener noreferrer">テキストとHTMLの分岐を拡大</a></figcaption>
</figure>

`innerHTML` の処理では、解析した断片の中の `<script>` 要素は挿入によって実行されないように扱われます。一方、ボタンの `onclick` や画像の `onerror` のように、要素のイベントからコードを実行する経路もあります。`<script>` の文字だけを取り除く方法では、イベント属性などが残ります。[WHATWG HTMLの断片解析と挿入](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#html-parsing-methods)、[OWASPの危険なコンテキスト](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#dangerous-contexts)

## 出力先の構文に合わせて扱う

| アプリが表示したいもの | 扱い方 |
| --- | --- |
| 検索語やコメントをそのまま表示する | 通常の表示用要素に `textContent` で入れる。サーバーでHTML本文を生成する場合は、テンプレートのHTMLテキスト用エンコードを使う。 |
| 表示用の属性値を設定する | `title` など用途が決まった属性にDOM APIで値を設定する。テンプレートなら引用符で囲い、HTML属性値の文脈に合わせてエンコードする。 |
| 外部リンクを作る | URLとして解析し、用途に合うスキームを確認する。必要に応じてホストも照合する。HTMLの属性値をエンコードしても、URLの `javascript:` スキームは別の検査が必要になる。 |
| 装飾を許す投稿を表示する | 必要な要素や属性、URLの範囲を決め、HTMLを解析するサニタイザで制限してから挿入する。サニタイズ後に別の文字列を連結する場合は、連結した結果の扱いも検査する。 |

出力エンコードは、`<` などをその文脈でデータとして扱わせる変換です。HTML本文、属性値、URL、JavaScriptはそれぞれ構文が異なります。たとえば、通常の表示用要素に `textContent` を使う方法を、動的に作った `<script>` の内容に当てはめると、文書への挿入時にコードとして解釈される場合があります。値の検査と、解釈させる構文の選択を分けます。[OWASPの出力エンコード・サニタイズ・安全なsink](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#output-encoding)、[WHATWG URLのURLコンストラクタ](https://url.spec.whatwg.org/#dom-url-url)

## ページで実行されると、どの権限を使うか

ページ内で動くコードは、そのページの実行環境で許されたDOMやAPIを利用できます。たとえば同一オリジンのAPIに要求を送り、応答を読んだり状態を変更したりできる場合があります。CORSは別オリジンの応答を公開する条件を定めます。データが同じページのコードになった段階では、まずそのページで何が許されているかを調べます。[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

`HttpOnly` はJavaScriptからのCookieの直接読み取りを抑えます。条件に合う要求にはブラウザがCookieを付けるため、ページ内で実行されたコードが、利用者のセッションを伴う要求を送れる場合は残ります。[Cookieとセッション](/browser/cookies-and-sessions.html)、[OWASPのHttpOnly属性の解説](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#httponly-attribute)

## CSPでスクリプトの実行を制限する

**CSP**（Content Security Policy）は、ブラウザが文書に適用する方針です。たとえばスクリプトを取得できる場所や、インラインコードを実行できる条件を指定します。`script-src` はスクリプトの方針を指定します。インラインのイベント属性には、より具体的な `script-src-attr` を指定できます。属性用の指定がなければ `script-src`、それもなければ `default-src` が候補になります。[W3C CSP Level 3のscript-src-attr](https://www.w3.org/TR/CSP3/#directive-script-src-attr)、[フォールバックの順序](https://www.w3.org/TR/CSP3/#directive-fallback-list)

たとえば、同一オリジンから外部スクリプトを読み込み、イベント属性内のコードを禁止する指定には、次の二つが使えます。同一オリジンで配信できるスクリプトの範囲は、サーバー側の構成にも左右されます。[W3C CSP Level 3のscript-src](https://www.w3.org/TR/CSP3/#directive-script-src)

```http
Content-Security-Policy: script-src 'self'; script-src-attr 'none'
```

HTMLの解析でボタンが作られた場合、`script-src-attr 'none'` は、その要素の `onclick` などに書かれたコードの実行を制限します。ボタンの生成や属性の保持とは別の段階であり、DOMに残ったタグや属性を取り除く処理はサニタイズが担います。許可されたスクリプトから `addEventListener()` で登録したリスナーは、属性内のソースコードを実行する経路とは異なります。[W3C CSP Level 3のインライン実行の検査](https://www.w3.org/TR/CSP3/#should-block-inline)、[WHATWG DOMのaddEventListener](https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener)

<figure class="study-figure">
  <img src="/images/browser/csp-inline-handler-flow.svg" alt="innerHTMLでボタンとonclick属性が作られる。ブラウザは属性のコードをハンドラとして使えるかCSPを検査する。許可されればクリックでコードが動き、script-src-attr noneで拒否される場合はボタンが残り、CSP違反を観察できる。" width="760" height="1100" loading="lazy">
  <figcaption>ボタンの生成と、そのボタンに含まれるコードの実行は別々に観察できます。<a href="/study/images/browser/csp-inline-handler-flow.svg" target="_blank" rel="noopener noreferrer">CSPが実行を止める箇所を拡大</a></figcaption>
</figure>

### 許可するコードをnonceやハッシュで選ぶ

**nonce** はサーバーが応答ごとに推測しにくい値を生成し、CSPの許可リストと、許可する `<script>` の `nonce` 属性に対応づける方法です。**ハッシュ**は、許可するインラインスクリプトの本文から計算した値を指定する方法です。ハッシュの場合、本文の空白などを変更すると再計算が必要になります。これらでスクリプト要素を許可する判断と、`onclick` のような属性の判断は区別します。[W3C CSP Level 3のnonce](https://www.w3.org/TR/CSP3/#security-nonces)、[要素とソースリストの照合](https://www.w3.org/TR/CSP3/#match-element-to-source-list)

### ヘッダーとmetaで配信できる範囲

通常は `Content-Security-Policy` 応答ヘッダーで方針を配信します。静的HTMLでは `<head>` の早い位置に `<meta http-equiv="Content-Security-Policy">` を置いて適用する方法もあります。metaより前に処理された内容への適用は遡りません。埋め込み元を制限する `frame-ancestors` や、違反を観測しながら動作を止めずに試す `Content-Security-Policy-Report-Only` は、HTTP応答ヘッダーで指定します。[W3C CSP Level 3の配信方法](https://www.w3.org/TR/CSP3/#policy-delivery)

## 実践との対応

実践では、親ページと異なるオリジンとして扱われるsandbox付きiframe内で、教材用の固定文字列を使います。同じ文字列を `textContent` と `innerHTML` で扱い、CSP付きのケースも比べます。文字として表示されるか、ボタンができるか、イベント属性のコードが動くかを別々に観察します。[テキスト挿入、HTML挿入、CSPを比べる](/practice/browser/xss-csp-observation.html)
