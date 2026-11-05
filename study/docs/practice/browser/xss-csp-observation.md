---
title: textContent・innerHTML・CSPの違いを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: xss-csp-observation
  order: 1
  summary: 同じ固定のボタン文字列をテキストまたはHTMLとして挿入し、ボタンの生成、イベント属性の実行、CSPによる拒否を別々に確かめる。
  aliases: [XSS, CSP, textContent, innerHTML, onclick, script-src-attr, sandbox, securitypolicyviolation]
  verification: Windows上のブラウザでDOM生成・クリック処理・CSP違反の通知を実行確認（2026-11-05）
---

# textContent・innerHTML・CSPの違いを観察する

同じ固定文字列を3つの方法で扱い、文字として表示されたか、DOMにボタンが作られたか、クリック処理が実行されたかを比べます。文字列にはボタンのマークアップと、その場の表示を変える `onclick` 属性が入っています。仕組みと対策の図は辞典記事にあります。[XSSとCSP](/browser/xss-and-csp.html)

<p><a href="/study/samples/browser/xss-csp-observation/index.html" target="_blank" rel="noopener noreferrer">XSSとCSPの実験ページを新しいタブで開く</a></p>

## 同じ入力で3つの経路を比べる

| 経路 | DOMにできるもの | クリック処理 |
| --- | --- | --- |
| `textContent` | 入力をそのまま含むテキスト。ボタン要素はできない | 実行対象のボタンがない |
| `innerHTML` | ボタン要素ができる | 実験用の固定ハンドラーが動き、マーカーが変わる |
| `innerHTML` と `script-src-attr 'none'` | 同じボタン要素ができる | ハンドラーの実行が拒否され、マーカーは変わらない |

3つのボタンを順に押します。実験はiframe内でボタンの有無を調べ、要素が作られたケースでは、そのボタンに `.click()` を呼びます。マーカーは固定ハンドラーが実行されたときだけ変わります。最後のケースでは、CSP違反の通知に含まれる `effectiveDirective` も確認します。[HTML Standardのイベントハンドラー属性](https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-content-attributes)、[CSPの違反イベント](https://www.w3.org/TR/CSP3/#report-violation)

最後のケースでボタン自体はできることに注目します。CSPは `onclick` に書かれたコードの実行を制限します。文字列をテキストに変換する処理や、HTMLから属性を除去する処理は行いません。[CSPのscript-src-attr](https://www.w3.org/TR/CSP3/#directive-script-src-attr)

## 実験ページを分ける理由

親ページは操作と結果を表示し、HTMLとして解釈する処理は `sandbox="allow-scripts"` のiframe内で実行します。子文書にはopaque originが割り当てられます。親は `postMessage()` で通知された結果について、送信元ウィンドウとオリジン、メッセージの形式を確認します。実験に使うHTMLは教材に書いた固定値で、入力フォームやURLから渡した文字列をHTMLとして挿入する経路はありません。[HTML StandardのSandboxing](https://html.spec.whatwg.org/multipage/browsers.html#sandboxing)、[Window間のメッセージ通信](https://html.spec.whatwg.org/multipage/web-messaging.html#crossDocumentMessages)

子文書はどちらも `meta` でCSPを宣言します。一方では `'unsafe-hashes'` とハンドラー本文のSHA-256ハッシュで教材の処理を許可し、もう一方ではイベント属性を `script-src-attr 'none'` で拒否します。2つのHTMLのケースで使う `frame.js` とボタンの文字列は同じです。[CSPのmetaによる配信](https://www.w3.org/TR/CSP3/#meta-element)、[CSPのunsafe-hashes](https://www.w3.org/TR/CSP3/#unsafe-hashes-usage)

## 手元で動かす

次の7ファイルを同じフォルダに置きます。

- <a href="/study/samples/browser/xss-csp-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/xss-csp-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/xss-csp-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/xss-csp-observation/frame-allow.html" download>frame-allow.html</a>
- <a href="/study/samples/browser/xss-csp-observation/frame-block.html" download>frame-block.html</a>
- <a href="/study/samples/browser/xss-csp-observation/frame.js" download>frame.js</a>
- <a href="/study/samples/browser/xss-csp-observation/README.md" download>README.md</a>

Python 3が使える場合は、保存先で次を実行し、`http://127.0.0.1:4183/index.html` を開きます。実験を終えたらCtrl+Cで停止します。

```powershell
python -m http.server 4183 --bind 127.0.0.1
```

開発者ツールのConsoleを開いた状態でCSPのケースを実行すると、イベント属性の処理を拒否した診断が表示される場合があります。画面ではマーカーと違反イベントを別々に表示します。違反イベントを観測できなかったときは、マーカーが変わらなかった理由をCSPと断定できません。

## コード

### 親ページの隔離と結果表示

<<< @/public/samples/browser/xss-csp-observation/main.js{js}

### 同じ入力を挿入する処理

<<< @/public/samples/browser/xss-csp-observation/frame.js{js}

### 実験用ハンドラーを許可する子文書

<<< @/public/samples/browser/xss-csp-observation/frame-allow.html{html}

### イベント属性を拒否する子文書

<<< @/public/samples/browser/xss-csp-observation/frame-block.html{html}
