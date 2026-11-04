---
title: ブラウザの描画 — HTMLから画面のピクセルまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: HTMLのバイト列からDOM、CSSのスタイル計算、レイアウト、ペイント、ラスタライズ、合成へ進む流れを説明する。Chromeの実装例とWebの仕様を分け、変更後の再計算、寸法API、描画完了を判断できない観測の境界を整理する。
  aliases: [browser rendering, ブラウザ描画, DOM, CSSOM, cascade, カスケード, computed style, スタイル計算, layout, レイアウト, paint, ペイント, rasterization, ラスタライズ, compositing, 合成, renderer, Blink, compositor, requestAnimationFrame, forced layout, 強制レイアウト]
  verification: 一次資料照合（2026-11-04）
---

# ブラウザの描画 — HTMLから画面のピクセルまで

ブラウザは、HTMLの文字列をそのまま画像にするわけではありません。文書の構造を作り、CSSから見た目の条件を決め、文字や箱の配置を計算し、描画する内容をピクセルへ変換して画面に提出します。**文書の状態が変わることと、その結果が画面に表示されることには段階があります。**

[DNS](/network/dns-resolution.html)で接続先の候補を得て、[TCP](/network/tcp-sockets.html)や[TLS](/network/tls-https.html)を使い、[HTTP](/network/http-messages.html)で応答を得るところは通信側の話です。ここでは、その先のHTML・CSS・JavaScriptによる通常の文書描画を扱います。Webの仕様で定まる振る舞いと、Chrome／Chromiumの描画エンジンである**Blink**などの実装例を区別します。

## ページへの移動は、毎回すべての通信をやり直すとは限らない

URLへの移動を**ナビゲーション**と呼びます。新しい文書を取得する場合でも、HTTPキャッシュに再利用できる応答があれば、それを使えることがあります。登録済みのService Workerがページを制御している場合は、要求を受けて、保存済みの応答などを返す経路もあります。HTTPキャッシュと、Service Workerが使うCache APIの保存領域は別の仕組みです。[MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)、[MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

戻る・進む操作では、条件が合えば**bfcache**から文書やJavaScriptの状態を復元することもあります。これはHTTP応答の再利用とは異なります。したがって、「ページが見えたから、今DNS・TLS接続・HTML解析をすべて実行した」とは判断できません。以下は、HTMLから新しい文書を構築する経路を中心とした説明です。[web.dev: Back/forward cache](https://web.dev/articles/bfcache)

## バイト列からHTMLのトークン、DOMへ

HTMLの応答本文は、まずバイト列として届きます。必要な圧縮の展開などを経て、文字エンコーディングの判定規則に従って文字へデコードします。常にUTF-8と決め打ちする処理ではありません。バイトと文字の区別は[Unicodeと文字コード](/data/unicode-and-encoding.html)につながります。

**トークン化**は、入力を開始タグ、終了タグ、属性、文字などの単位として読み取る処理です。続く**ツリー構築**が、それらからDocumentとノードの木を作ります。これが**DOM**（Document Object Model）です。要素だけでなく、テキストやコメントなどもノードに含まれます。HTMLの解析は、文書の末尾をすべて受信してから一括で行うことに限定されません。[WHATWG HTML: Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html#overview-of-the-parsing-model)、[WHATWG DOM: Nodes](https://dom.spec.whatwg.org/#nodes)

例えば、ソースに明示しなかった要素が解析規則に従って補われたり、不適切なタグの入れ子が規則に従って処理されたりします。その後にJavaScriptが要素を追加することもあります。**受信したHTMLソースと、現在のDOMは同じものではありません。** 開発者ツールのElements表示は、通常、現在のDOMを調べるためのものです。

解析中に実行するJavaScriptは、DOMの構築にも影響します。HTML内に通常の方法で置いた、`async`も`defer`もないclassic scriptでは、取得や実行のためにHTMLの解析が止まる場合があります。外部classic scriptの`defer`は解析と並行して取得し、解析後に文書内の順で実行する指定です。`async`は取得できたものから実行するため、文書内の実行順を保証しません。「非同期指定だから、JavaScriptを必ず別スレッドで実行する」という意味ではありません。[MDN: script要素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script#attributes)

## CSSOM、カスケード、スタイル計算

CSSも、スタイルシートのルールや宣言として解析されます。**CSSOM**（CSS Object Model）は、スタイルシートやルールなどを扱うオブジェクトモデルとAPIです。CSSファイルの文字列、CSSOMのルール、各要素に適用する計算結果は区別します。[W3C CSSOM](https://www.w3.org/TR/cssom-1/)

**カスケード**は、同じプロパティに複数の宣言が候補となったとき、どれを採用するか決める仕組みです。ブラウザの既定スタイル、作者のCSSなどの由来、重要度、カスケードレイヤー、セレクターの詳細度、記述順などが関係します。「ファイルの最後の指定が常に勝つ」だけの規則ではありません。**継承**は、親から値を引き継ぐ仕組みで、すべてのプロパティが通常の状態で自動継承されるわけではありません。[W3C CSS Cascading and Inheritance: Cascade / Inheritance](https://www.w3.org/TR/css-cascade-5/#cascade)

**スタイル計算**では、ルールの適用や継承などから、要素に対応するプロパティの値を求めます。ただし、スタイルが決まったことと、すべての最終寸法が決まったことは同じではありません。例えばパーセントの幅や文字の折り返しは、利用できる領域やフォントなどとも関係します。CSSでは、指定値、計算値、レイアウトなどで使う使用値という段階も区別されます。

DOMと画面用の構造も一対一ではありません。`display: none`の要素はDOMに残っていても、その要素と子孫の表示用の箱を生成しません。一つの要素が複数の箱や行の断片に関わる場合や、疑似要素から表示が生まれる場合もあります。部品内に作る別のDOMの木であるShadow DOMと、外側の内容を差し込むslotによる組み合わせもあります。こうした配置用の**ボックスツリー**や描画エンジンの内部構造を、単にDOMの別名として扱わないようにします。[W3C CSS Display: Box Generation](https://www.w3.org/TR/css-display-3/#intro)

## 配置、描画内容の記録、ピクセル生成、合成

次の区分は、処理を理解するための概念図です。ChromeのRenderingNGには、前処理やデータの受け渡しなど、さらに細かい段階があります。段階名や内部データ構造、CPUとGPUの分担はエンジンや環境に依存します。

| 段階 | 決めること・作るもの |
| --- | --- |
| Style | 要素などに適用するスタイル |
| Layout（レイアウト） | 箱の寸法・配置、文字の折り返しなどの幾何情報 |
| Paint（ペイント） | 背景、文字、枠線などを、どの順でどう描くかという記録 |
| Raster（ラスタライズ） | 描画の記録や画像などから、タイル等のピクセルデータを生成 |
| Composite（合成） | 描画済みの内容を、位置・変形・透明度などを考慮して組み合わせる |
| 表示への提出 | ページやブラウザUIなどを含む結果を、表示側へ渡す |

ここでのPaintは、直ちに画面の全ピクセルを書き換えることだけを指す言葉ではありません。描く命令に相当する**ディスプレイリスト**などを作り、後のラスタライズに渡す段階として区別します。表示は、画像・動画・フォントの処理やOSの表示機構とも関わります。[Chrome: RenderingNG architecture](https://developer.chrome.com/docs/chromium/renderingng-architecture#rendering_pipeline_structure)

<figure>
  <img src="/images/browser/rendering-pipeline.svg" alt="取得やキャッシュの分岐から、HTMLのDOM構築とCSSのスタイル計算、レイアウト、ペイント、ラスタライズ、合成、表示への提出までを示す概念図" width="760" height="1510" loading="lazy">
  <figcaption>HTMLやCSSは、構造・配置・描画内容・ピクセルという異なる表現を経ます。途中から既存の結果を再利用する場合があり、すべてを毎回一から処理する図ではありません。<a href="/study/images/browser/rendering-pipeline.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

**レイヤー**は、内容を独立して扱い、合成するための単位として登場します。DOM要素、CSSの重なり順のまとまり、合成レイヤー、GPU上のテクスチャは同じものではありません。「要素一つにつきレイヤー一枚」「CSSを書けば必ず専用GPUテクスチャを作る」とは限りません。必要な領域やキャッシュを再利用し、変更に関係しない仕事を省けることが、描画処理の重要な性質です。

## Chromeのプロセスとスレッドは、描画段階と同じ区分ではない

Chromeの実装例では、browserプロセスがブラウザUIやナビゲーションの管理などを担い、rendererプロセスが文書やスクリプトを処理します。ネットワークサービスは通信を扱い、GPU側の処理やVizは合成・表示に関わります。ネットワークサービスを独立したutilityプロセスで動かす構成などがありますが、設定やプラットフォームで配置は変わります。[Chrome: Inside look at modern web browser, part 1](https://developer.chrome.com/blog/inside-browser-part1/)、[Chromium: Network Service](https://chromium.googlesource.com/chromium/src/+/HEAD/services/network/README.md)

renderer内でも、メインスレッドはJavaScriptやスタイル・レイアウトなどの多くを扱い、compositorスレッドやラスタライズの仕事をするスレッドなどが協調します。条件が合うスクロールやアニメーションでは、毎回メインスレッドのレイアウトからやり直さずに進められる経路があります。これは、JavaScriptの任意の処理を自由に別スレッドへ移せるという意味ではありません。[Chrome: Inside look at modern web browser, part 3](https://developer.chrome.com/blog/inside-browser-part3/)

一つのタブが必ず一つのプロセスという保証もありません。サイト分離やiframeなどによって分担が変わり得ます。この構成をすべてのブラウザ共通の固定仕様とせず、[プロセスとスレッド](/os/process-startup.html)の、実行資源と仕事の分担の例として読みます。

## DOMやCSSを変えた後は、必要な範囲を更新する

JavaScriptで`textContent`、class、styleなどを変えると、エンジンは関連する計算結果が古くなったことを管理し、必要な更新を予定します。この古くなった状態を**dirty**、再利用できる結果を無効とすることを**invalidation**と呼ぶ場合があります。代入一回ごとに必ずページ全体を再描画するわけではなく、複数の変更をまとめて処理できる場合があります。

| 変更の例 | 一般に考慮する影響 |
| --- | --- |
| `width`や文字内容 | 寸法、折り返し、周辺要素の配置が変わり、レイアウト以降に影響し得る |
| `background-color` | 通常、箱の寸法を変えず、背景を描く内容に影響する |
| `transform`や`opacity` | 通常フローの配置を変えず、合成時の変形・透明度として扱える場合がある |

この表は、実行される段階を保証する分類ではありません。値が実質的に変わらない場合、レイヤーの構成、エフェクト、キャッシュの状態などで必要な仕事は変わります。`transform`でもラスタライズが必要な場合があり、`opacity`を書けば必ず「GPUだけで処理」「Paintなし」とは言えません。JavaScriptによるstyle変更そのものと、compositorで進められるアニメーションも区別します。[Chrome: RenderingNGの処理例](https://developer.chrome.com/docs/chromium/renderingng-architecture#example_rendering_pipeline_flows)

<figure>
  <img src="/images/browser/rendering-updates.svg" alt="幅、背景色、変形、透明度の変更が影響し得る描画処理と、寸法の読み取りやrequestAnimationFrameからは表示完了を保証できないことを示す図" width="760" height="1510" loading="lazy">
  <figcaption>プロパティによって影響しやすい段階は異なりますが、実際の省略や再実行は条件次第です。<code>requestAnimationFrame</code>の実行と、画面への表示完了も別の出来事です。<a href="/study/images/browser/rendering-updates.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## 寸法APIは、何を読んでいるのか

`getComputedStyle(element)`は、適用結果を調べるAPIですが、規格上は**resolved value**を返します。プロパティによっては、純粋な計算値ではなく、レイアウトで決まる使用値が返ります。CSSファイルに書いた元の文字列をそのまま返すものでも、ピクセルへの描画完了を通知するものでもありません。[W3C CSSOM: Resolved Values](https://www.w3.org/TR/cssom-1/#resolved-values)

通常の一つの箱を持つ要素では、`offsetWidth`は、paddingやborderを含むレイアウト上の幅を整数のCSS px単位で読むために使えます。CSSのtransformは反映しません。`getBoundingClientRect()`は、transformを反映したborder boxなどを囲む、軸に平行な矩形をビューポート基準で返します。例えば`translateX`では位置が、`scale`では矩形の寸法も変わり得ます。これは影や実際に見えている文字のピクセルをすべて検出した境界ではありません。CSS pxと画面の物理ピクセルも、常に一対一ではありません。[W3C CSSOM View: Element / HTMLElement](https://www.w3.org/TR/cssom-view-1/#extensions-to-the-element-interface)

さらに、スタイルを変えた直後に寸法を要求すると、正しい値を返すため、未実施だったスタイル計算やレイアウトがその場で必要になる場合があります。これを**強制同期レイアウト**などと呼びます。読み取りが常に全体の再計算を起こすわけではありませんが、書き込みと寸法読み取りを何度も交互に行うと、更新をまとめる余地を減らし得ます。**観測用コードも、処理の実行タイミングに影響します。**[Chrome: Forced reflow](https://developer.chrome.com/docs/performance/insights/forced-reflow)

## 読み込みイベントと、表示完了は別

`DOMContentLoaded`は、HTMLの解析と、`defer`付き外部classic scriptなど所定の処理が済んだ節目です。すべての画像やasync scriptの完了を待つイベントではありません。`load`は、遅延読み込み対象を除く依存リソースなどの読み込みに関する節目です。どちらも、その瞬間の全ピクセルがディスプレイに表示されたという保証ではありません。その後もDOM変更やフォント・画像の状態などで表示は変わります。[MDN: DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)、[MDN: load](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event)

**requestAnimationFrame**（rAF）は、次の再描画前にコールバックを呼ぶよう要求するAPIです。表示済み通知ではありません。コールバック中の値や時刻を記録しても、GPU処理や物理ディスプレイへの提示の完了時刻を測ったことにはなりません。固定60回／秒や、非表示ページで継続して呼ばれることも保証されません。[MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

## JavaScriptで観察できる範囲

[描画変更と寸法APIの実践](/practice/browser/render-observation.html)では、外部依存のないHTML・CSS・classic JavaScriptで、幅、背景色、transform、opacity、DOMの文字内容を変更し、スタイル値や寸法を明示的に採取します。これはC++やC#で描画エンジンを自作する例ではなく、ブラウザが公開するAPIを使う観察です。

得られた値は「この時点でAPIが返した文書の状態」です。そこから実際のLayout／Paintの回数、レイヤー数、GPUだけで実行されたことまでは判断しません。それらには開発者ツールのPerformance記録など、別の観測手段が必要です。イベントループ、ページの可視性による実行制御、描画トレースの読み方は、その観測条件を掘り下げる別のテーマです。
