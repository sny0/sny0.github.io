---
title: localStorage・IndexedDB・Cache APIの保存と完了を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: storage-observation
  order: 1
  summary: 専用namespaceの固定レコード一つだけを保存・読出し・削除し、localStorageの同期返値、IndexedDBのtransaction完了、Cache APIのPromiseとResponse消費を比較する。
  aliases: [ブラウザ保存領域, localStorage, IndexedDB, Cache API, transaction, QuotaExceededError, SecurityError, bodyUsed]
  verification: Windows上のブラウザで保存・再読込・削除を実行確認（2026-11-05）
---

# localStorage・IndexedDB・Cache APIの保存と完了を観察する

同じ固定レコードを3種類の保存APIで扱い、保存した値と、操作完了と判断する時点を比べます。保存後はページを再読み込みし、値をもう一度読み出します。保存領域の寿命・origin・容量制限の仕組みと図は[ブラウザの保存領域と寿命](/browser/storage-lifetime.html)を参照してください。

<p><a href="/study/samples/browser/storage-observation/index.html" target="_blank" rel="noopener noreferrer">保存領域の実験ページを新しいタブで開く</a></p>

## 入手して開く

下の4ファイルを同じフォルダへ保存し、HTTPSまたはsecure contextのlocalhost HTTPで配信します。file://では保存操作を無効にして案内します。classic main.jsをdeferで読み、外部ライブラリは使いません。

- <a href="/study/samples/browser/storage-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/storage-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/storage-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/storage-observation/README.md" download>README.md</a>

Python 3がある場合は、保存フォルダで次を実行し、`http://127.0.0.1:8765/index.html`を開けます。使用後はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

再読み込み前後の比較は同じorigin・同じブラウザの保存環境で行います。例えばportを変えるとoriginも変わるため、同じ保存先を読んだ比較にはなりません。

## このサンプルだけの値を操作する

ページを開いただけでは保存・読出しを行いません。各ボタンを押したときだけ、次の固定レコードを扱います。任意入力や個人情報はありません。

```json
{"version":1,"message":"保存の仕組みを観察"}
```

|方式|専用の保存先|
|---|---|
|localStorage|key `sny0-study-storage-observation-v1:record`|
|IndexedDB|DB `sny0-study-storage-observation-v1` / store `records` / key `fixed-record`|
|Cache API|cache `sny0-study-storage-observation-v1` / 同じoriginのサンプル用架空Request key|

「保存」は同じサンプルの既存値を上書きする場合があります。「削除」は専用の固定key/entry一つだけを対象にします。localStorage.clear、DB全削除、origin全体の削除、他のkey・DB・cacheの変更は行いません。

最初に読出しを押して現状を確認し、保存→読出し→再読み込み→再度読出し→サンプルだけ削除→再度読出し、の順で比べられます。対象がない状態はnot foundとし、アクセスエラーや保存成功と区別します。

## APIの返値と操作完了を分ける

|方式|APIでまず得られるもの|最終結果を成功表示する時点|
|---|---|---|
|localStorage|setItem/removeItemの返値undefined、getItemの文字列またはnull|同期呼出しが例外なく終わり、必要なデータ検査を終えた後|
|IndexedDB|request.successのresult|transaction.completeを受け取った後|
|Cache API|put/match/delete等のPromiseの結果|必要なPromiseとResponseの読取りを終えた後|

localStorageではオブジェクトをJSON文字列へ変換して保存します。getItemがnullなら対象なしです。JSONとして不正、versionやmessageが固定レコードと一致しない等の場合はデータ不一致として扱い、勝手に修復や削除はしません。[WHATWG HTML：Web storage](https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface)

これらの完了通知を、物理ディスクの書込み完了時刻や、将来も絶対に保持される証明としては扱いません。再読み込み後の読出しも、その保存環境・時点で値を取得できたという観測です。

## IndexedDB：request.successの後を待つ

操作ごとに専用DBを開き、固定keyだけを扱うtransactionを作ります。保存はput、読出しはgetKey→get、削除はgetKey→deleteです。getKeyで存在を確認するため、値の形式不一致とkeyなしも分けられます。

依存するget/deleteは、native request.success callbackの中でqueueします。transactionを作った後やrequestの処理中に、外部fetchやtimerをawaitしてから次を追加する構成にはしません。transactionがactiveな時点にrequestを追加する必要があるためです。[W3C IndexedDB：Transaction lifecycle](https://www.w3.org/TR/IndexedDB/#transaction-lifecycle)

request.successでは結果を一時的に保持し、ログにも「tx未完了」と表示します。transaction.error/abortは成功として扱わず、transaction.complete後だけ最終結果を表示します。DB接続は各操作の終了時にcloseします。

versionchangeが来た場合は自分のtransactionを中断して接続を閉じます。openのblockedは操作完了や取消成功とは表示せず、busyのままnativeの終端を待ちます。別タブ等の接続を閉じる必要がある場合があります。このページから未完了openを取り消すAPIを実装したものではありません。[W3C IndexedDB：Opening a database](https://www.w3.org/TR/IndexedDB/#opening-a-database-connection)

初回の読出し・削除でも、専用DB/storeのschema作成が起きる場合があります。これは固定レコードを保存したこととは別です。固定レコードを削除しても空のDB/storeは残ります。

## Cache API：ローカルResponseとbodyの消費

Cache APIでは同じoriginの架空Requestをkeyにし、new Responseでローカルに作ったJSONを保存します。そのURLへfetchは送りません。WindowからCache APIを直接使い、Service Workerを登録する処理もありません。[W3C Service Workers：Cache objects](https://www.w3.org/TR/service-workers/#cache-objects)

保存ではResponseのcloneをputへ渡します。読出しではmatchの返却Responseをcloneし、そのcloneのtextを一度consumeしてJSONを検査します。ログでは元のResponseとcloneのbodyUsedを別々に表示します。既に消費したbodyを、同じオブジェクトから何度でも読み直せる仕組みではありません。[WHATWG Fetch：Body mixin](https://fetch.spec.whatwg.org/#body-mixin)

Cacheの読出し・削除では、専用cacheがあるかhasで確認してからopenします。未存在のときにopenして空cacheを作る操作を避けるためです。ただしhas→openを一つのatomic操作にする保証はなく、別タブ等が同時に変更する場合の競合は残ります。[W3C Service Workers：CacheStorage](https://www.w3.org/TR/service-workers/#cache-storage)

削除はその固定Request keyのentryだけを対象にし、空のcacheコンテナは残します。この例は手動のRequest/Response保存で、ブラウザのHTTPキャッシュの自動再検証とは区別します。

## 失敗・busy・表示の範囲

すべての保存操作に共通のbusy gateを置き、一件ずつ処理します。処理中は別の保存操作とページ内の再読み込みボタンを無効にします。ブラウザ自身の再読み込みで未完了処理を中断した場合まで、保存成功を保証するものではありません。

QuotaExceededError、SecurityError、API未対応/利用不可、AbortError、DB version不一致、データ不一致を分類します。not foundはこれらのエラーと別です。容量を埋める、permissionを変更する等の操作で失敗を強制するコードは含みません。

結果はtextContentで表示し、保存文字列をHTMLとして挿入しません。ログは最新60件です。「表示ログを消す」は保存データに触れません。外部fetch、analytics、永続化permissionの要求は行いません。

## 実行して確認した範囲

2026-11-05にWindows上のブラウザで、ローカルHTTP配信したページを操作しました。実際のlocalStorage・IndexedDB・Cache APIを使い、画面幅1280×720と390×844で確認しています。Nodeの代替APIを使った保存の模擬試験ではありません。JavaScriptの構文確認も通しています。

|操作・観測|今回の結果|
|---|---|
|最初の読出し|3方式とも対象なし。localStorageはnull、IndexedDBはgetKeyのundefined、Cacheはhasのfalseを区別して表示した|
|初回IndexedDB読出し|upgradeneededで専用DB/storeを作り、固定レコードは未保存のまま対象なしになった|
|保存|3方式とも固定のversion 1・日本語文字列を保存。localStorageのsetItem返値はundefinedだった|
|IndexedDBの完了順|putのrequest.successを「tx未完了」と記録し、その後のtransaction.complete、接続closeを経て最終成功を表示した|
|Cacheの本文|put用cloneはbodyUsed=true、元Responseはfalse。読出しのclone.textでも読出cloneだけがtrueになった|
|ページ再読み込み|表示結果とログが未操作へ戻った。その後3方式とも保存済みレコードを読み出せた|
|専用データの削除|3方式とも削除後の読出しが対象なし。Cacheのdeleteは対象があるとtrue、再度の削除ではfalseになった|
|削除後の再保存|3方式とも再保存でき、localStorageの保存はEnterキーでも操作できた|
|表示ログの初期化|ログだけが0件になり、その後も3方式の保存データを読み出せた|
|ログ上限と画面幅|74件まで記録した時点で表示は番号15〜74の最新60件。PC幅・スマホ幅とも文書全体の横方向のはみ出しはなかった|

ブラウザが記録した警告・エラーはなく、確認に使った専用レコードは最後に削除し、対象なしを確認しました。設計どおり空のDB/store/cacheコンテナは残します。操作対象を専用名に限定することはソースでも確認しています。origin内の全データや他の保存名を列挙・削除する試験は行っていません。

この確認は再読み込み前後の保持と通常の操作の範囲です。他ブラウザ、プライベートモード、複数タブの競合、blocked／versionchangeの故意注入、容量超過・アクセス拒否、不正な保存データ、file://での案内、ブラウザ強制終了、電源断、容量圧迫時の削除は未実測です。これらのエラー処理・接続解放・操作範囲はコードレビューで確認し、将来の保持や物理ディスクの状態の保証にはしません。

## ソース全体

### HTML

<<< @/public/samples/browser/storage-observation/index.html{html}

### CSS

<<< @/public/samples/browser/storage-observation/styles.css{css}

### JavaScript

<<< @/public/samples/browser/storage-observation/main.js{js}
