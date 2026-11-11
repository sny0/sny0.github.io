---
title: ブラウザの保存領域 — localStorage・IndexedDB・Cache APIとデータの寿命
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: localStorage、IndexedDB、Cache APIのデータ形式と完了の意味を整理する。origin・partition、トランザクションの寿命、容量制限、永続化の許可と削除条件を分けて説明する。
  aliases: [ブラウザストレージ, Web Storage, localStorage, sessionStorage, IndexedDB, object store, IDBTransaction, Cache API, CacheStorage, storage event, quota, StorageManager, persist, eviction, storage partitioning]
  verification: 一次資料照合（2026-11-05）
---

# ブラウザの保存領域 — localStorage・IndexedDB・Cache APIとデータの寿命

ページを再読み込みすると、JavaScriptの変数は通常作り直されます。ブラウザの保存APIを使うと、設定やレコード、取得済みの応答などを、ページの実行が終わったあとも残せます。

読むときは、**保存する値の形式、操作の完了、データが残る条件**を分けます。「保存成功」と「ブラウザを閉じても必ず永久に残る」は同じ意味ではありません。

## 三つのAPIは、保存するものと操作単位が違う

| API | 主に扱うもの | 操作と用途の例 |
| --- | --- | --- |
| `localStorage` | キーと値の文字列 | 同期API。表示設定などの小さな値 |
| `IndexedDB` | キー付きの構造化データ | 非同期API。複数レコードの検索・更新、トランザクション |
| `Cache API` | `Request`と`Response`の組 | Promiseを使う非同期API。アプリが管理する応答の保存と再利用 |

この表は選択の目安です。IndexedDBに設定を保存してもよく、Cache APIに自作Responseを保存することもできます。非同期APIでも、値の準備・変換やコールバックの計算が自動的に別スレッドへ移るわけではありません。[イベントループとasync/await](/browser/event-loop-promises.html)も参照してください。

## originとpartition — 同じサイトに見えても保存先が違う

**origin**は、HTTP(S)では基本的にscheme・host・portの組です。`https://example.com`と`http://example.com`、同じhostの別portは異なります。一方、`/study/`と`/game/`というpathの違いだけでは保存領域を分けません。同じ保存領域を使うアプリ同士は、キー・DB名・Cache名を区別する必要があります。これらの名前やキーのprefixは、同じoriginで動く別のscriptからのアクセスを隔離する境界ではありません。[WHATWG Storage: Storage keys](https://storage.spec.whatwg.org/#storage-keys)

さらにブラウザには、第三者iframeなどの保存領域を、埋め込み先のtop-level siteも使って分割する**partitioning**があります。たとえばFirefoxのState Partitioningは、リソースのoriginとtop-level siteを組み合わせます。同じoriginでも、別サイトに埋め込まれた場合に同じデータを読めるとは限りません。具体的な分割やアクセス制限はブラウザの方針に依存します。[Mozilla: State Partitioning](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/State_Partitioning#state_partitioning)

保存先はブラウザのプロファイルや通常・プライベートの利用環境でも分かれます。別端末への同期やサーバーへの送信が、この三つのAPIだけで自動的に行われるわけでもありません。

<figure>
  <img src="/images/browser/storage-map.svg" alt="ブラウザの保存領域をlocalStorageの文字列、IndexedDBのレコードとトランザクション、Cache APIのRequestとResponseに分け、originやpartition、容量と削除方針が関係することを示す図" width="760" height="1510" loading="lazy">
  <figcaption>保存形式と操作単位を選んだ後も、容量・保存許可・削除条件は別に扱います。三つのAPIをまとめて更新する共通トランザクションはありません。<a href="/study/images/browser/storage-map.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## localStorage — 同期的な文字列の読み書き

`localStorage.setItem(key, value)`は値を文字列として保存し、`getItem(key)`は文字列、存在しないキーなら`null`を返します。キーと値はUTF-16の文字列として扱います。これはAPI上の文字列表現であり、ディスク上の物理配置が常に「一文字2byte」になるという説明ではありません。[MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#description)

オブジェクトを保存するなら、たとえば`JSON.stringify(record)`でJSON文字列へ変換し、読み出して`JSON.parse(text)`します。JSONは任意のJavaScriptオブジェクトを、その型・参照関係までそのまま保存する形式ではありません。読み出した内容の形式やバージョンも、アプリ側で確かめます。

Web Storageは**同期API**です。呼び出し中は、そのJavaScript実行を先へ進められません。大量の文字列化と保存を頻繁に行うと、画面操作や描画の機会に影響します。`await localStorage.setItem(...)`と書いても、同期処理を非同期I/Oへ変えることにはなりません。[MDN: Web Storageの同期動作](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API#concepts_and_usage)

保存APIは失敗もします。保存領域へのアクセスがポリシーなどで許されない場合の`SecurityError`や、書き込みできない場合の`QuotaExceededError`などを処理します。`localStorage`プロパティの取得自体が例外になる場合もあるため、保存呼び出しだけを囲めば十分とは限りません。[WHATWG HTML: localStorage](https://html.spec.whatwg.org/multipage/webstorage.html#dom-localstorage)

### 同期呼び出しでも、読み出し・計算・書き戻しは一括でない

二つのタブが同じカウンタを読み、どちらも`10`を得てから`11`を書けば、一回分の更新が失われ得ます。個々の`getItem`と`setItem`が同期でも、その間を含むread–modify–write全体のロックにはなりません。HTML仕様も、共有状態にはロック機構がないと考えるよう説明しています。[WHATWG HTML: Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html#webstorage)

**storageイベント**は、共有する保存領域を別のdocumentが変更したことを知らせます。変更を行ったwindow自身には発火しません。通知を受けて表示を更新できますが、複数操作を原子的にする仕組みではありません。[MDN: storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)

`sessionStorage`も同期の文字列保存ですが、originに加えてタブなどのtop-level browsing contextに結び付くページセッションが基本単位です。同じタブの再読み込みでは保持されます。localStorageと同じ長期保存先として扱いません。Cookieが条件に合うHTTP要求へ送られる仕組みは、[Cookieとセッション](/browser/cookies-and-sessions.html)で扱います。[MDN: sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)

## IndexedDB — レコードとトランザクション

IndexedDBは、**object store**というレコードの集まりに、キーと値を保存します。**index**は、レコード内の指定した値から検索するための索引です。SQLの文字列を渡すAPIではありません。値は保存用のstructured cloneで直列化され、配列・オブジェクト・バイナリなどを扱えますが、関数やDOMノードなどは保存できません。元のJSオブジェクトと同一の参照を永続化するわけでもありません。[IndexedDB: Object storesとvalues](https://w3c.github.io/IndexedDB/#object-store-concept)

**トランザクション**は、一つのDB内の、指定したobject store群に対する操作をまとめます。`readonly`は読み取り、`readwrite`は更新を許すモードです。同じトランザクションの変更は、全体をcommitするか、abortで取り消します。複数レコードの整合した更新には、関連する処理を一つの適切なトランザクションへ入れます。[IndexedDB: Transactions](https://w3c.github.io/IndexedDB/#transaction-concept)

### requestのsuccessとtransactionのcompleteは違う

`store.put(...)`などが返す`IDBRequest`の`success`は、その要求の成功です。その後、同じトランザクションの別要求が失敗し、全体がabortすることもあります。**更新全体の成功はtransactionのcompleteで確認します。** 要求成功時に「保存完了」と表示すると、取り消された更新を完了扱いしかねません。[IndexedDB: Transaction lifecycle](https://w3c.github.io/IndexedDB/#transaction-lifecycle)

`IDBRequest`は、そのままではPromiseではありません。単に`await store.put(...)`と書いても、要求やトランザクションの完了を待つコードにはなりません。Promiseで包む場合も、要求の結果を待つ処理と、transactionの`complete`・`abort`を回収する処理を区別します。

### transactionは、外部の非同期処理を待つ箱ではない

transactionは、作成時や関連する要求イベントの処理中などの**active**期間に新しい要求を受け付けます。制御が戻るとinactiveになり、保留中の要求がなくなると自動commitへ進み得ます。作成後に無関係な`fetch`やtimerを`await`し、戻ってから要求を追加しようとしても、すでに使えない場合があります。「すべてのawaitで必ず無効になる」という規則ではなく、transactionのactive期間と自動commitが関係します。[IndexedDB: Transaction lifecycle](https://w3c.github.io/IndexedDB/#transaction-lifecycle)

外部データの取得などは先に済ませ、必要なDB要求を有効な期間に登録します。transactionを長時間開いたまま通信や利用者の入力を待たせる設計は避けます。

DBの構造変更は、バージョンを上げて開く際の`upgradeneeded`で行います。古い接続が別タブに残っていると、更新を求める側に`blocked`が起こり得ます。既存接続は`versionchange`を扱い、必要な処理をしたうえで`db.close()`し、再読み込みなどへつなぎます。DBの削除も、残った接続に妨げられる場合があります。[IndexedDB: Upgrade transactions](https://w3c.github.io/IndexedDB/#upgrade-transaction)

<figure>
  <img src="/images/browser/storage-transaction-lifetime.svg" alt="IndexedDBの個別request成功とtransaction完了を分け、active期間に要求を登録すること、保存成功後にも容量や利用者による削除が関係することを示す図" width="760" height="1510" loading="lazy">
  <figcaption>requestの成功通知は途中経過です。transactionの完了を確認しても、他の保存APIまで同時にcommitされたり、データが永久に残ったりする保証にはなりません。<a href="/study/images/browser/storage-transaction-lifetime.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## Cache API — HTTPキャッシュとは別の応答保存

`caches.open(name)`で名前付きCacheを開き、`cache.put(request, response)`でRequestとResponseの組を保存します。照合にはURLや、Responseの`Vary`などが関係します。通常のページのWindowからも利用でき、**Service Workerの登録は必須ではありません。** Cache APIはsecure context向けで、たとえばHTTPSや、信頼できるローカル開発用のHTTP loopback環境で利用します。[Service Workers: Cache API](https://w3c.github.io/ServiceWorker/#cache-interface)、[Secure Contexts: Potentially trustworthy origins](https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy)

[HTTPキャッシュ](/network/http-caching.html)は、HTTPの鮮度や再検証の規則に従う保存です。一方、Cache APIは`Cache-Control`などのHTTPキャッシュ指示に従って自動的に保存可否や期限を管理する仕組みではありません。`max-age`の経過だけで自動更新・削除されるとは考えず、バージョンや更新・削除をアプリが管理します。ただし、ブラウザの保存領域の削除方針から独立して永久に残るわけではありません。[MDN: Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)、[Service Workers: Cache lifetimes](https://w3c.github.io/ServiceWorker/#cache-lifetimes)

`cache.add(url)`は取得と保存をまとめ、取得した成功応答などを保存します。`put`は、すでに持つResponseを渡す操作です。`new Response(...)`で作った固定データの保存なら、`put`だけで外部取得は起きません。`put`にも、GETのHTTP(S)要求であることなどの制約があります。[MDN: Cache.add](https://developer.mozilla.org/en-US/docs/Web/API/Cache/add)、[Service Workers: Cache.put](https://w3c.github.io/ServiceWorker/#cache-put)

Responseの本文は消費するStreamです。保存と画面用の読み出しの両方に使うなら、本文を消費する前に`response.clone()`で分け、片方を`put`へ渡します。消費後にcloneして読み直せるわけではありません。`cache.match()`から得たResponseにも同様の本文の寿命があります。[Fetch: Response.clone](https://fetch.spec.whatwg.org/#dom-response-clone)

## 容量・永続化の許可・削除は別の条件

**quota**はブラウザが認める保存量の制限です。固定の容量を全ブラウザ共通の契約とは考えません。`navigator.storage.estimate()`の`usage`と`quota`は概算で、物理ディスクの空き容量そのものではありません。書き込み用の容量予約にもならず、推定上の余裕があっても、その後の保存が失敗する場合があります。[WHATWG Storage: Usage and quota](https://storage.spec.whatwg.org/#usage-and-quota)

通常の**best-effort**保存は、保存圧迫などでブラウザがデータを削除するevictionの対象になり得ます。`navigator.storage.persist()`はpersistent storageの許可を求め、許可されたかをbooleanで返します。許可された保存領域を自動的な圧迫削除から保護するための仕組みで、バックアップや別端末への複製ではありません。利用者によるサイトデータ削除などを防ぐものでもありません。[WHATWG Storage: Persistence permission](https://storage.spec.whatwg.org/#persistence)

プライベートブラウジングでは容量や寿命が異なり、その利用環境の終了時にデータが削除されるのが一般的です。削除条件・許可・ブラウザの対応を含め、アプリは保存領域が空の状態からも扱えるようにします。[MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

### APIの成功は、永久保存や厳密なfsyncの証明ではない

APIが成功した段階と、電源断にも耐える形で記憶媒体へ反映された段階を同一視しません。IndexedDBにも`strict`・`relaxed`・`default`のdurability hintがあり、commit時に耐久性と性能をどう扱うかが異なります。すべてのtransactionの`complete`を「厳密なfsync済み」と説明するのは不正確です。耐久性が高い設定でも、後日の利用者の削除とは別です。[IndexedDB: Transaction durability](https://w3c.github.io/IndexedDB/#transaction-concept)

また、localStorageへの設定保存、IndexedDBへのレコード保存、Cache APIへの応答保存は、共通の一括トランザクションではありません。順に呼び出して二つ目が失敗しても、一つ目が自動的に戻ることはありません。三方式へ分けるなら、途中失敗した状態や、データのバージョンが異なる状態も扱います。

## 実践との対応

[保存・読出し・再読み込み後の確認](/practice/browser/storage-observation.html)では、教材専用のキー・DB・Cacheに固定の小さなデータを保存し、それぞれの方法で読み出します。削除も教材が所有するデータに限定します。Cache APIには自作Responseを保存するため、外部fetchは必要ありません。

再読み込み後に同じ値を読めたことは、その環境・その時点での保持を確認した結果です。ブラウザの強制終了・電源断・容量圧迫への耐久性や、全ブラウザで同じ削除方針になることまで、この観察で確認したとは扱いません。

ページからの要求に保存済みResponseを返す方法は、[Service Workerとオフライン動作](/browser/service-worker-offline.html)で扱います。
