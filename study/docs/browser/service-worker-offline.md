---
title: Service Workerとオフライン動作 — 登録、制御、応答の選択
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: Service Workerの登録、install、waiting、activate、ページの制御を説明する。fetchイベントでの応答、Cache APIを使うオフライン動作、更新と登録解除の範囲を整理する。
  aliases: [Service Worker, ServiceWorker, オフライン, offline, scope, register, install, waitUntil, waiting, activate, ready, controller, controllerchange, fetch event, respondWith, skipWaiting, clients.claim, unregister, precache, offline fallback]
  verification: 一次資料照合（2026-11-05）
---

# Service Workerとオフライン動作 — 登録、制御、応答の選択

**Service Worker**は、ブラウザが登録してイベントに応じて動かすワーカーです。担当するページの取得処理に関わり、要求に対して通常の取得結果、Cache APIから読んだ応答、自分で作った応答などを返せます。通信できない状況で画面やデータを提供できるかは、担当範囲、事前に保存した資源、要求ごとの応答方針で決まります。[Service Workersの制御モデル](https://w3c.github.io/ServiceWorker/#control-and-use)

CPU計算をページから分担するDedicated Workerは、ページが作成してメッセージをやり取りします。Service Workerでは登録と実行中の環境が別の寿命を持ち、処理するイベントがなくなるとブラウザが実行環境を終了できます。後でイベントが来れば再び起動され、グローバル変数は作り直されます。イベントをまたいで残すデータには、用途に応じてCache APIやIndexedDBを使います。[Service Workersの実行寿命](https://w3c.github.io/ServiceWorker/#service-worker-lifetime)、[Web Workerとメッセージ通信](/browser/web-workers-messages.html)、[ブラウザの保存領域](/browser/storage-lifetime.html)

## 登録するURLと、ページを担当するscope

ページから`navigator.serviceWorker.register(scriptURL, { scope })`を呼ぶと、ブラウザはワーカーのスクリプトと、制御対象を選ぶ**scope**を登録します。スクリプトURL、scope、登録を呼ぶページは同じoriginに属します。既定のscopeはスクリプトが置かれたディレクトリです。たとえば`/sample/offline/sw.js`なら`/sample/offline/`が既定です。サーバーが`Service-Worker-Allowed`ヘッダーで最大範囲を広げる方法もあります。[MDNのregister仕様とオプション](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#parameters)

登録は**secure context**で行います。公開サイトのHTTPSが代表例です。ローカル開発では、ブラウザが信頼できるローカルoriginとして扱う`http://localhost`やループバックアドレスを利用できます。登録用のスクリプトとscopeにはHTTP(S) URLを使うため、教材のファイルもローカルのHTTPサーバーなどから配信します。[Secure Contextsの信頼できるorigin](https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy)、[Service Workersの登録手順](https://w3c.github.io/ServiceWorker/#start-register-algorithm)

scopeは、主にどのページを担当するかを決めます。そのページがスクリプトや画像、API応答を求めると、取得先がページと別のパスにある要求も`fetch`イベントの対象になり得ます。どの要求を処理するかは、イベント内でmethod、URL、用途などを調べて選びます。[Service WorkersのHandle Fetch](https://w3c.github.io/ServiceWorker/#on-fetch-request-algorithm)

## install、waiting、activate、ページの制御

一つの登録には、新しいバージョンを準備する`installing`、切り替えを待つ`waiting`、担当中または有効化中の`active`という枠があります。新しいバージョンの準備中も、以前のactive workerが既存のページを担当できます。[Service Workersの登録モデル](https://w3c.github.io/ServiceWorker/#service-worker-registration-concept)

| 段階 | 起きること |
| --- | --- |
| `install` | 新しいワーカーが、先に必要な資源の保存などを行う |
| `waiting` | インストールを終え、新版をactiveにできる条件を待つ |
| `activate` | 新版がactiveの枠へ移る。イベント内で移行や不要な保存物の整理を行える |

`install`イベントでは、先に済ませる処理のPromiseを`event.waitUntil(...)`へ渡します。たとえば必須の画面資源を保存する処理を渡すと、ブラウザはその処理をインストールの一部として待ちます。Promiseが拒否されると、そのバージョンのインストールは失敗します。途中で作ったCacheが残る場合もあるため、バージョンごとに保存先を分けます。[MDNのwaitUntil](https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil)、[Service WorkersのInstall手順](https://w3c.github.io/ServiceWorker/#installation-algorithm)

更新時は、旧版が担当するページが残っている間、新版はwaitingに留まることがあります。初回は旧版がいないため、待機が短く、その状態を観察しにくいこともあります。`activate`でも`waitUntil(...)`を使えます。そこで待つ処理がsettleして有効化が進むまで、通常の`fetch`などの処理は待たされます。[Service WorkersのActivate手順](https://w3c.github.io/ServiceWorker/#activation-algorithm)、[MDNのwaitUntil](https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil)

### `ready`と`controller`が示す状態

| 観察するもの | 意味 |
| --- | --- |
| `register()`のPromiseがfulfilled | 登録オブジェクトが得られた |
| `navigator.serviceWorker.ready`がfulfilled | 現在のページに対応する登録にactive workerがある |
| `navigator.serviceWorker.controller`がワーカーを返す | 今のページはそのワーカーの制御下にある |

Service Workerの制御を受けずに開いたページで初回登録すると、通常は`ready`から登録を取得できても`controller`は`null`のままです。有効化後、scope内への通常の再読み込みや移動で新しく開いたページは、対応するactive workerの制御を受けます。ページを担当するワーカーが変わったことは`controllerchange`で観察できます。[Service Workersのready](https://w3c.github.io/ServiceWorker/#navigator-service-worker-ready)、[Service Workersのcontroller](https://w3c.github.io/ServiceWorker/#navigator-service-worker-controller)、[Chromeのライフサイクル解説](https://web.dev/articles/service-worker-lifecycle#activate)

<figure>
  <img src="/images/browser/service-worker-lifecycle.svg" alt="Service Workerの登録からinstall、waiting、activateへ進む流れ、readyとcontrollerで観察する状態、次の読み込みでの制御開始、登録解除とCache削除を示す図" width="760" height="1510" loading="lazy">
  <figcaption>ワーカーを登録して準備する段階と、今のページがワーカーの担当になる段階を別々に観察できます。<a href="/study/images/browser/service-worker-lifecycle.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## fetchイベントで応答を選ぶ

ブラウザの取得処理がService Workerに要求を渡すと、ワーカーは`fetch`イベントの`event.request`から`Request`を読みます。対応する要求には`event.respondWith(...)`で`Response`、または`Response`が得られるPromiseを渡します。ハンドラーが応答を引き受けずに終了した場合は、HTTPキャッシュを含む通常の取得処理へ進めます。[Service WorkersのrespondWith](https://w3c.github.io/ServiceWorker/#fetch-event-respondwith)、[WHATWG FetchのHTTP fetch](https://fetch.spec.whatwg.org/#http-fetch)

`respondWith`を呼ぶのは、**イベントが配送されている間**です。Cache APIの検索や`fetch()`の完了を待つなら、その処理を行う関数が返すPromiseをハンドラーの同期部分で渡します。配送が終わってから`respondWith`を呼ぶと`InvalidStateError`になります。引き受けたPromiseが拒否された場合は取得の失敗となるので、代替応答が必要ならPromiseの処理に組み込みます。[Service WorkersのrespondWith手順](https://w3c.github.io/ServiceWorker/#dom-fetchevent-respondwith)

### オフライン時に使う応答を用意する

| 方針 | 応答の選び方 |
| --- | --- |
| cache first | 名前付きCacheにある応答を優先し、見つからなければ取得を試す |
| network first | `fetch()`で通常の取得を試し、通信失敗など、アプリで決めた条件で保存済み応答に切り替える |
| 合成応答 | `new Response(...)`で、その要求に対応する応答をワーカー内で作る |

Service Workerが自分で呼ぶ`fetch()`は、ワーカーによる介入を外した取得経路を使います。これにより、ハンドラー内の取得が同じService Workerの`fetch`イベントを再帰的に起こすことを防ぎます。[WHATWG Fetchのfetchメソッド](https://fetch.spec.whatwg.org/#fetch-method)

ここでの**fallback**は、予定していた応答を得られない場合に返す代替応答です。たとえば、記事を開けないときはオフライン用HTMLを返し、データ取得が失敗したときは保存済みのデータを返せます。画像要求やAPI要求には、それぞれの呼び出し側が扱える形式を選びます。`fetch()`は`404`や`503`などのHTTP応答を受け取った場合もfulfilledになるため、通信失敗に加えてどのHTTP statusを切り替え条件にするかは、アプリで決めます。[WHATWG Fetchのfetchメソッド](https://fetch.spec.whatwg.org/#fetch-method)

<figure>
  <img src="/images/browser/service-worker-fetch.svg" alt="固定GETのfetchイベントでrespondWithを呼び、通常の取得に失敗した場合や疑似オフライン時に専用Cacheを調べ、保存済み応答か503を返す実践の図" width="760" height="1510" loading="lazy">
  <figcaption>ワーカーが応答を引き受ける場合は、イベント内で<code>respondWith()</code>を呼びます。取得やキャッシュ検索を待つ処理は、渡すPromiseの中で進めます。<a href="/study/images/browser/service-worker-fetch.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

Cache APIの中身は、アプリが名前を付けて管理します。HTTPキャッシュの鮮度・再検証や、通常の`fetch()`がどこから応答を得たかは別の層です。オフラインで画面全体を開くなら、入口のHTMLと、その画面が使うCSS・JavaScript・画像などについて、事前に保存する範囲と欠けたときの動作を決めます。初回の取得に失敗した場合や、保存領域が削除された場合にも、手元に応答があるかどうかで表示は変わります。[Service WorkersのCacheの寿命](https://w3c.github.io/ServiceWorker/#cache-lifetimes)、[HTTPキャッシュ](/network/http-caching.html)、[ブラウザの保存領域](/browser/storage-lifetime.html)

`navigator.onLine`はブラウザが判断する接続状態の目安です。ネットワークにつながっていても、目的のサーバーへ到達できるかはDNSや経路、サーバーの状態にもよります。接続状態は表示の手がかりに使い、要求ごとの成功・失敗は取得結果から判断します。[WHATWG HTMLの接続状態](https://html.spec.whatwg.org/multipage/system-state.html#browser-state)

## 更新時はページとワーカーとCacheの版をそろえる

ブラウザは更新チェックで、取得したワーカーのスクリプト資源を以前のバイト列と比較します。`updateViaCache`は、このチェックで本体やimport先をHTTPキャッシュから取得する方針に関わる設定です。アプリがCache APIへ保存した応答は、アプリ側で版と更新手順を管理します。[Service WorkersのUpdate手順](https://w3c.github.io/ServiceWorker/#update-algorithm)

スクリプトが更新されると、ブラウザは新版をインストールし、切り替えの条件が整うまで待機させます。たとえば旧版のページが遅れて追加のJavaScriptを要求するときに、旧版のファイルを先に消すと、そのページの操作が失敗します。新版の資源は`app-static-v2`のような版付きCacheに準備し、旧版の利用が終わったことを考慮して、担当アプリの旧Cacheだけを整理します。[ChromeのService Worker更新解説](https://web.dev/articles/service-worker-lifecycle#updating-the-service-worker)、[Service WorkersのCacheの寿命](https://w3c.github.io/ServiceWorker/#cache-lifetimes)

`skipWaiting()`は、新版がインストールを済ませた後、旧版を使うページが開いていても有効化を進めるための操作です。`clients.claim()`は、active workerが条件に合う既存ページのcontrollerになれるようにします。切り替え後も、開いたページでは読み込み済みのJavaScriptやCSSを使い続けます。すぐに切り替える場合は、旧ページと新版が一時的に組み合わさる間の互換性や、ページを再読み込みする時点を考えます。[ChromeのskipWaiting解説](https://web.dev/articles/service-worker-lifecycle#skip_the_waiting_phase)、[MDNのclients.claim](https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim)

## 登録解除と保存物の削除

`registration.unregister()`は、そのscopeの登録を解除する操作です。解除後も、すでに制御されているページは、閉じるか次のナビゲーションに進むまで旧ワーカーの制御を受け続ける場合があります。解除のPromise、現在の`controller`、次に開いたページの制御状態をそれぞれ観察できます。[Service Workersのunregister](https://w3c.github.io/ServiceWorker/#navigator-service-worker-unregister)

名前付きCacheの削除には別に`caches.delete(name)`などを使います。登録とCacheは寿命が異なるため、解除後も保存した応答をページから確認できます。名前付きCacheの一覧には、同じ保存領域を使う別アプリのものも含まれます。後片付けで指定するのは、当該アプリが所有するCache名です。[Service WorkersのCacheの寿命](https://w3c.github.io/ServiceWorker/#cache-lifetimes)

## オリジンの境界

Service Workerのscopeは、登録が担当するページのURLの範囲です。制御下のページが別オリジンへ要求した場合、Workerを経由しても、応答を読み取れる条件にはFetchの規則が適用されます。`no-cors`で受け取ったopaqueな応答の本文はWorkerからも読めません。[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

## 実践との対応

実践では教材専用ディレクトリをscopeにし、登録と再読み込みの前後でcontrollerを観察します。ワーカーは`payload.json`のGETで通常の取得を試し、失敗時にはinstallで専用Cacheに保存した応答を返します。`?mode=offline`は対象の要求だけ通常の取得を省略する、教材用の疑似オフライン分岐です。HTMLやCSS、JavaScriptは通常の配信から読み込みます。登録解除後は再読み込みでcontrollerを確認し、専用Cacheの対象応答を別の操作で削除します。[Service Workerの登録と応答を観察する](/practice/browser/service-worker-observation.html)
