---
title: Service Workerの登録・制御・応答元を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: service-worker-observation
  order: 1
  summary: 専用scopeにService Workerを登録し、readyとcontroller、固定GETのネットワーク応答とcache fallback、登録解除と固定entryの削除を別々に観察する。
  aliases: [Service Worker, install, activate, ready, controller, network-first, offline, Cache API, unregister]
  verification: Windows上のブラウザで登録・配信停止時の取得・解除を実行確認（2026-11-05）
---

# Service Workerの登録・制御・応答元を観察する

実験フォルダのService Workerを登録し、固定JSONのGETがどこから応答を得たかを比べます。登録・ready・現在のcontrollerは別の欄で確認します。ライフサイクルとキャッシュの図は辞典記事にあります。[Service Workerとオフライン応答](/browser/service-worker-offline.html)

<p><a href="/study/samples/browser/service-worker-observation/index.html" target="_blank" rel="noopener noreferrer">Service Workerの実験ページを新しいタブで開く</a></p>

## 入手して開く

6ファイルを同じフォルダに置き、HTTPSまたはsecure contextのlocalhost HTTPで配信します。ページはclassic main.jsをdeferで読み込みます。file://では配信方法を案内します。

- <a href="/study/samples/browser/service-worker-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/service-worker-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/service-worker-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/service-worker-observation/sw.js" download>sw.js</a>
- <a href="/study/samples/browser/service-worker-observation/payload.json" download>payload.json</a>
- <a href="/study/samples/browser/service-worker-observation/README.md" download>README.md</a>

Python 3がある場合は、保存フォルダで次を実行して`http://127.0.0.1:8765/index.html`を開きます。後始末の操作を終えたらCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

## 登録から制御まで

初回は「通常の固定GET」を押し、固定JSONと応答元ヘッダーを確認します。「実験用Workerを登録」を押すと、現在のフォルダをscopeにして`sw.js`を登録します。ページを開いた時点では、既存の登録状態を読み取ります。登録前にexact scopeを調べ、同じscopeにある既存登録の上書きを避けます。所有未確認の登録・controllerがある場合は、実験の変更と固定GETを止めます。[W3C Service Workers：register](https://www.w3.org/TR/service-workers/#navigator-service-worker-register)

installの`waitUntil`に、固定JSONをCache APIへputするPromiseを渡します。保存用Responseはその場で構築し、ネットワーク側の`payload.json`とは別に用意します。cache名は`sny0-study-service-worker-observation-v1`、keyはscope相対の正規`payload.json` URLです。install後のactivateはブラウザの通常のライフサイクルに従います。[W3C Service Workers：waitUntil](https://www.w3.org/TR/service-workers/#wait-until-method)

|欄|読み方|
|---|---|
|exact scopeの現在の登録|getRegistrationで確認した実験フォルダの登録|
|登録のライフサイクル|installing・waiting・activeにいるWorkerのstate|
|readyの解決履歴|このページのready Promiseが解決したときの登録|
|現在のcontroller|今のページを制御するWorker。未制御ならnull|

最初の登録では、readyがfulfilledでも、そのページのcontrollerはnullのままの場合があります。activeを確認して通常の再読み込みを行うと、新しいページで制御を観察できます。ready欄はページごとの解決履歴です。登録解除後の現状は、登録欄とcontroller欄で確認します。[W3C Service Workers：ready](https://www.w3.org/TR/service-workers/#navigator-service-worker-ready)、[controller](https://www.w3.org/TR/service-workers/#navigator-service-worker-controller)

## 固定GETと応答元

Workerが応答を組み立てる対象は、正規`payload.json` URLと、完全一致する`payload.json?mode=offline`のGETです。ページ遷移のnavigateモードは通常の配信に任せます。このため、画面やCSS・JSの配信と、固定JSONの取得を分けて観察できます。[W3C Service Workers：respondWith](https://www.w3.org/TR/service-workers/#fetch-event-respondwith)

通常の固定GETはnetwork-firstです。`cache: "no-store"`、`redirect: "error"`でfetchし、ヘッダーと本文読取りへ同じ3秒の中断signalを使います。アプリ側で組み立てる本文を2048バイトまでに制限し、固定JSONの内容を検査します。ネットワーク側の失敗、非2xx、本文の検査失敗があれば、指定cache内の正規キー一つを読みます。cache missで空のcacheを作る操作は行いません。ページ側の固定GETにも8秒の中断timerを設けます。

疑似オフラインはquery付きの固定GETで、Worker内のネットワーク分岐を省きます。回線を切る実験と分けて実行できます。実際の配信サーバー停止を試す場合は、制御済みのページを開いたまま通常の固定GETを押し、後でサーバーを起動して後始末します。

|応答元ヘッダー `X-Sny0-Study-Source`|観察した分岐|
|---|---|
|`network`|Workerのfetchから固定JSONを取得|
|`cache-fallback`|ネットワーク側の試行に失敗し、保存したJSONを取得|
|`cache-simulated`|疑似オフラインの分岐で保存したJSONを取得|
|`cache-miss` / `cache-error`|専用entryの未存在または読取り失敗。HTTP 503|
|観測ヘッダーなし|Workerが付ける応答元の印を観測できなかった|

`X-Sny0-Study-Reason`には分岐の理由を記録します。`network-error`にはfetchや本文検査の失敗が含まれ、`network-timeout`は中断timerが作動した経路です。timerの実行時刻はブラウザのスケジュールに従います。Workerは検査した本文から、200と観測ヘッダーを持つ応答を組み立てます。画面のstatusはページが受け取った応答の値です。Cacheに書き込むのはinstall時です。

## 解除と後始末

1. activeを確認し、「実験の登録を解除」を押します。exact scopeと各Workerのscript URLがこの実験と一致する登録だけを対象にします。
2. 解除の返値と現在のcontrollerを確認します。既に読み込まれたページでは、旧controllerが残る場合があります。その間は再登録と固定entry削除を無効にします。
3. 他の実験タブを閉じて、このページを通常の方法で再読み込みします。専用登録とcontrollerがない表示を確認します。
4. 「保存した固定entryを削除」を押します。削除の単位は、専用cacheにある正規payload URLのentry一件です。

登録解除とCache APIの削除は別の操作です。固定entryの削除前にも、現ページの登録とcontrollerを再確認します。他タブの旧controllerは各タブで確認してください。この確認から削除までを、タブをまたぐ一つのatomic操作として扱う構成ではありません。[W3C Service Workers：unregister](https://www.w3.org/TR/service-workers/#navigator-service-worker-unregister)

同じscript URLでも、配信されたコードが変わると更新のライフサイクルが始まることがあります。更新用Workerがwaitingになったときは、旧Workerを使うページを閉じた後のactivateを観察できます。保存形式とcache名を更新する設計は辞典記事を参照してください。[Service Workerとオフライン応答](/browser/service-worker-offline.html)

## 実行して確認した範囲

2026-11-05に、Windows上のブラウザでローカルHTTP配信したページを操作しました。通常のページ読み込みと実際のService Worker・Cache APIを使い、1280×720と390×844の画面で確認しています。main.jsとsw.jsの構文、固定JSONの読み取りも確認しました。

|操作|今回の結果|
|---|---|
|登録前の固定GET|HTTP 200と固定JSON。応答元ヘッダーの欄は「観測ヘッダーなし」|
|初回登録|readyがfulfilledになり、activeがactivatedになった。開いていたページのcontrollerはnullだった|
|通常の再読み込み|現在のcontrollerが実験のsw.jsになった|
|制御中の通常GET|HTTP 200・`network`・`network-ok`|
|疑似オフラインの固定GET|HTTP 200・`cache-simulated`・`simulated-offline`|
|配信サーバー停止中の通常GET|ページを開いたまま通常GETを押すと、HTTP 200・`cache-fallback`・`network-error`で固定JSONを受け取った|
|配信再開後の固定GET|スマホ幅でEnterキーから操作し、再び`network`の応答を得た|
|登録解除と再読み込み|解除の返値はtrue。旧controllerが担当している間は疑似オフラインGETが成功し、通常の再読み込み後にcontrollerがnullになった|
|固定entryの削除|最初の返値はtrue、二回目はfalse。実験に使った登録と固定entryの片付けを確認した|

両方の画面幅で横方向のはみ出しがなく、ページ側で取得した警告・エラーログは0件でした。配信停止はローカルのHTTPサーバーを止め、既に開いているページから固定データを取得する試験です。インストール時の準備からページの制御、要求ごとの代替応答、解除までを実測しました。複数タブを使う版の切り替え、cache miss、timerの発火、容量圧迫による消去、ページ全体のオフライン起動は解説とコードレビューで扱う範囲です。

## ソース全体

### HTML

<<< @/public/samples/browser/service-worker-observation/index.html{html}

### CSS

<<< @/public/samples/browser/service-worker-observation/styles.css{css}

### main.js

<<< @/public/samples/browser/service-worker-observation/main.js{js}

### sw.js

<<< @/public/samples/browser/service-worker-observation/sw.js{js}

### payload.json

<<< @/public/samples/browser/service-worker-observation/payload.json{json}
