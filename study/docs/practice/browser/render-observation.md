---
title: HTML・CSS・JavaScriptでブラウザの変更と計測を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: render-observation
  order: 1
  summary: 実際のブラウザでテキスト・幅・背景色・transform・opacityを個別に変更し、DOM・スタイル・レイアウト寸法・表示位置の値を別操作で比較する。
  aliases: [DOM, CSSOM, getComputedStyle, offsetWidth, getBoundingClientRect, requestAnimationFrame, DevTools, layout, paint]
  verification: ブラウザ実行確認（2026-11-04、ローカルHTTP）
---

# HTML・CSS・JavaScriptでブラウザの変更と計測を観察する

ブラウザで動く小さな実験ページを使い、箱の見た目を変えてから、APIで読める値を比較します。エンジンを自作する例ではなく、普段使うブラウザそのものが実験対象です。処理の全体像は[ブラウザがページを描くまで](/browser/rendering-journey.html)を参照してください。

<p><a href="/study/samples/browser/render-observation/index.html" target="_blank" rel="noopener noreferrer">実験ページを新しいタブで開く</a></p>

外部ライブラリ、fetch、storage、analyticsは使いません。下の4ファイルを同じフォルダへ保存して`index.html`を開く方法でも試せます。classic JavaScriptを`defer`で読み込む構成で、ビルドやローカルサーバーは不要です。

- <a href="/study/samples/browser/render-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/render-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/render-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/render-observation/README.md" download>README.md</a>

## 一つ変えて、別の操作で測る

最初に「値を計測する」を押し、一つだけ切り替えてから再計測します。比較をやり直すときは「すべて初期化」を押します。初期化では変更・表・前回値・ログを戻し、未実行のrAF予約も取り消します。

|操作|初期値 → 変更値|見比べる値|
|---|---|---|
|テキスト|`Hello` → `Browser`|`textContent`。この固定寸法の例では箱の幅は変えない|
|幅|100px → 160px|computed width、offsetWidth、rect.width|
|背景色|`#b8dcff` → `#ffcf8b`|computed background-color|
|位置|none → translateX(40px)|computed transform、rect.left。offsetWidthは移動量を表さない|
|透明度|1 → 0.5|computed opacity。表示の薄さと寸法の値を区別する|

箱は`box-sizing: border-box`、高さ60px、padding 8px、border 2pxです。幅100pxはpadding・borderを含む指定です。幅の変更後も高さは60pxの設定です。値はCSS pxで、画面の物理ピクセル数とは区別します。

テキストの変更は`textContent`への代入、それ以外は`classList.toggle`によるDOMのclass属性変更です。既存のCSSルールがそのclassに適用されます。テキストを変えても、この箱の`childElementCount`は0、テキストノードを含む`childNodes.length`は1の構成です。「文字を変えた」「要素を追加した」「CSSファイルを書き換えた」は別の操作です。

## 表の値が表しているもの

|API・項目|この実験での読み方|
|---|---|
|`getComputedStyle`|ルール適用後のresolved valueを読む。宣言したCSS文字列と同じ表記になるとは限らない|
|`offsetWidth / offsetHeight`|transformを考慮しないborder boxの寸法を整数で読む|
|`getBoundingClientRect`|transformを反映する、viewport基準の矩形を読む|
|`rect.left − stage.left`|実験枠に対する箱の横位置を、二つの矩形の差で読む|

`offsetWidth`と`getBoundingClientRect`の扱いの違いは、同じ幅のまま横へ40px移動させると比較しやすくなります。移動後の`rect.width`は、この平行移動だけでは変わりません。回転や拡大縮小まで同じ結果になるという意味ではありません。[W3C CSSOM View：offsetWidth](https://www.w3.org/TR/cssom-view-1/#dom-htmlelement-offsetwidth)、[getBoundingClientRect](https://www.w3.org/TR/cssom-view-1/#dom-element-getboundingclientrect)

`rect.left / top`はスクロールでも変わります。前回との差を見るときは、画面サイズ・スクロール位置・ズーム等の条件をそろえてください。色は`rgb(...)`、transformは`matrix(...)`等で返る場合があります。文字列の表記を一つに固定した比較にはしていません。

`getComputedStyle`の返却オブジェクトはliveです。このコードはそのオブジェクトを前回値として保存せず、各プロパティを文字列としてその場で取り出して記録します。寸法・矩形も読み切ってから、表とログのDOMを更新します。[W3C CSSOM：getComputedStyle](https://www.w3.org/TR/cssom-1/#dom-window-getcomputedstyle)

変更ボタンから計測APIは呼びません。変更と読取りを分けることで、毎回の変更直後に同期的な計測を挟まない構成にしています。それでも計測ボタンで現在値を読むと、ブラウザが必要なstyle・layoutの更新を行う場合があります。表・ボタン・ログの更新も、このページ自身の描画処理に含まれます。

## rAFは画面表示の完了通知ではない

「rAFを1回予約する」は`requestAnimationFrame`を一度呼び、callbackに入ったことをログへ残します。予約待ちの間はボタンを無効にし、callback後に再び使えるようにします。毎フレームのループはありません。

ログ先頭の時刻は記録時の`performance.now()`、rAF行の`引数timestamp`はcallbackへ渡された値です。これらをpaint所要時間やディスプレイ表示完了時刻として読みません。非表示のタブではcallbackが遅延・抑制され得ます。rAFで計測したふりをする代替タイマーも使っていません。[WHATWG HTML：Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)

## 処理段階をDevToolsで別に調べる

APIの値だけからlayout・paintの回数、compositorだけでの処理、GPU使用を判定することはできません。次はChrome DevToolsを使う場合の観察手順です。ブラウザや版によって名称・表示内容は変わります。

1. 初期化してからDevToolsのPerformanceパネルで記録を開始する。
2. 一つの変更ボタンだけを押して、記録を停止する。計測ボタンを含めた場合は、その読取り処理も記録に入る。
3. 対象のイベント付近を拡大し、style・layout・paint等の記録を確認する。
4. 初期化して別のプロパティで繰り返す。ボタンとログの更新も含まれるため、箱だけの処理と決めつけない。

Performanceパネルの記録・停止・結果の読み方は、[Chrome公式の実行時性能の調べ方](https://developer.chrome.com/docs/devtools/performance)を参照してください。

Renderingパネルの`Paint flashing`を有効にすると、再paintされた領域を強調表示できます。これはpaint領域の観察で、GPU使用やすべての内部段階の証明ではありません。幅・色・transform・opacityのそれぞれについて、今回の環境で何が記録されたかを確認します。[Chrome公式：Paint flashing](https://developer.chrome.com/docs/devtools/rendering/performance#highlight-repainted-areas-with-paint-flashing)

ここに記載したDevToolsの操作は観察手順です。この文章をもってPerformance traceやPaint flashingの実測結果とするものではありません。ローカルの実験はDOM・スタイル・寸法・callbackの範囲で、DNS・TLS・HTML転送や外部CSS・画像・フォント取得の経路は測りません。

## 実行して確認した範囲

Windows上のブラウザで、ローカルHTTP配信した実験ページを確認しました（2026-11-04）。画面幅1280pxと390pxで表示し、変更、計測、rAFの一回実行、初期化、ログ20件の上限、キーボードでのテキスト切替を試しています。

|確認した操作|今回のAPI取得値|
|---|---|
|初回計測|幅100、高さ60。computed widthは100px、offsetWidthとrect.widthは100|
|幅を変更して再計測|computed widthは160px、offsetWidthとrect.widthは160。前回との差は+60|
|横へ40px移動|offsetWidthとrect.widthは160のまま。rect.left − stage.leftは25から65へ変化|
|色・透明度・文字を変更|背景色はrgb(255, 207, 139)、opacityは0.5、textContentはBrowser。子要素0、子ノード1|
|rAFを一回予約|callbackのログ一件と、予約ボタンの再有効化。表示完了時刻は未計測|
|初期化|全切替がOFFになり、文字・表・前回値・ログを初期状態へ戻した|

変更直後、再計測前の表は以前の値を保ち、再計測を促す表示になりました。幅と位置の値はこのサンプルの条件での結果です。viewport基準の座標は操作時のスクロールでも変わるため、横移動の比較には実験枠との差を使っています。

ローカルファイルを直接開く経路、他ブラウザ、非表示タブで待機中のrAFを取り消す経路は未実測です。取消しとボタン無効化はコード上も確認しています。DevTools trace、描画段階の実行回数、GPU利用、画面表示完了は、この確認結果には含めません。

## ソース全体

### HTML

<<< @/public/samples/browser/render-observation/index.html{html}

### CSS

<<< @/public/samples/browser/render-observation/styles.css{css}

### JavaScript

<<< @/public/samples/browser/render-observation/main.js{js}
