---
title: クロスオリジン分離と共有メモリ — COOP・COEPからSharedArrayBufferまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: ウィンドウのグループとリソースの読み込みを制御するCOOP・COEP・CORPを区別し、Workerとメモリを共有する条件とAtomicsを説明する。
  aliases: [クロスオリジン分離, cross-origin isolation, crossOriginIsolated, COOP, COEP, CORP, require-corp, credentialless, Permissions Policy, SharedArrayBuffer, 共有メモリ, Atomics]
  verification: WHATWG HTML・Fetch、W3C Secure Contexts・Permissions Policy、ECMAScriptと照合（2026-11-05）
---

# クロスオリジン分離と共有メモリ — COOP・COEPからSharedArrayBufferまで

**クロスオリジン分離**（cross-origin isolation）は、あるページがウィンドウを開く関係と、ページに取り込めるリソースの条件をブラウザが制限する仕組みです。Workerと共有するカウンターは、処理時間の短い差を測って他の情報を推測するサイドチャネル攻撃にも使えます。ブラウザは共有メモリを使う環境に追加の分離を求めます。現在のページやWorkerで分離が有効かは `crossOriginIsolated` で観測できます。[W3C High Resolution Timeの安全性](https://w3c.github.io/hr-time/#clock-resolution)、[WHATWG HTMLのcrossOriginIsolated](https://html.spec.whatwg.org/multipage/webappapis.html#dom-crossoriginisolated)

## ウィンドウとリソースで効く場所が違う

| 応答ヘッダー | どの応答で指定するか | ブラウザが判断すること |
| --- | --- | --- |
| `Cross-Origin-Opener-Policy`（COOP） | トップレベル文書 | 画面遷移やポップアップをどの閲覧コンテキストグループに置くか |
| `Cross-Origin-Embedder-Policy`（COEP） | 文書やWorkerの入口 | 別オリジンのリソースや子文書を取り込めるか |
| `Cross-Origin-Resource-Policy`（CORP） | 画像など、取り込まれる側のリソース | どのオリジンからの `no-cors` の取得で応答を利用できるか |

COOPの `same-origin` を指定したトップレベル文書は、オリジンや相手の方針が合わない場合に、開いた側と別の**閲覧コンテキストグループ**へ移ります。例えば別オリジンの認証ポップアップがグループを離れると、`window.opener` を通じた連絡が途切れることがあります。ヘッダーを導入する際は、ログインなど既存のポップアップ連携も確認します。[WHATWG HTMLのCOOPとグループの切り替え](https://html.spec.whatwg.org/multipage/browsers.html#cross-origin-opener-policies)

COEPの `require-corp` では、別オリジンのリソースを取り込む場合、CORSの検査を通る経路か、配信元がCORPで許可する `no-cors` の経路が必要です。 `credentialless` を使うと、別オリジンへの `no-cors` リクエストからCookieなどの資格情報を外し、CORPヘッダーのない応答も利用できる場合があります。配信元がCORPで拒否していれば、その制限も適用されます。子文書やWorkerの入口ではさらに、それぞれの埋め込み方針も検査されます。[WHATWG HTMLのCOEP](https://html.spec.whatwg.org/multipage/browsers.html#coep)、[WHATWG FetchのCORP検査](https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header)

<figure class="study-figure">
  <img src="/images/browser/cross-origin-isolation-boundaries.svg" alt="COOPは開いた側と開かれた側をどの閲覧コンテキストグループに置くかを制御する。COEPは文書やWorkerに入るリソースを検査し、require-corpでは別オリジンの取得にCORSまたはCORPの許可を求める。ブラウザでcrossOriginIsolatedを観測する。" width="760" height="1060" loading="lazy">
  <figcaption>ウィンドウ同士の関係と、ページが読み込めるリソースを別の境界として見ます。<a href="/study/images/browser/cross-origin-isolation-boundaries.svg" target="_blank" rel="noopener noreferrer">分離の境界を拡大</a></figcaption>
</figure>

## CORPとCORSは要求モードを見て使い分ける

例えば別オリジンの画像に `<img src="...">` でアクセスすると、通常は `no-cors` の要求です。COEPが `require-corp` のページでは、その画像の応答に `Cross-Origin-Resource-Policy: cross-origin` があれば、CORPの検査を通ります。 `same-origin` は同一オリジンに、 `same-site` は同じサイトの範囲に制限します。 `same-site` では通信の安全性も比較し、HTTPSで届いた応答を非HTTPSの要求元に許可しません。[WHATWG FetchのCORPヘッダー](https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header)

`<img crossorigin="anonymous" src="...">` を使うと要求は `cors` になり、画像の応答にはCORSの許可が必要です。 `Access-Control-Allow-Origin` が示すのは、CORSの検査で応答を利用できる要求元です。CORPで画像の `no-cors` 読み込みを許可した場合、画像を表示できても、キャンバスに描いたピクセルをJavaScriptで読み出すにはCORSを通す必要があります。[WHATWG HTMLのcrossorigin属性](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes)、[キャンバスのセキュリティ](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements)、[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

## 共有できる環境を応答ヘッダーと実行結果で確認する

トップレベル文書を分離する構成の一例です。ヘッダーはHTTP応答に設定します。

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

ブラウザがこの方針を扱える**セキュアコンテキスト**で開きます。公開ページなら通常はHTTPSを使い、ループバックの `http://127.0.0.1` も信頼できる開発用オリジンとして扱われます。 `cross-origin-isolated` のPermissions Policyが機能を許可していることも条件です。既定の許可範囲は `self` で、親から機能を制限されたiframeなどでは条件が変わります。ヘッダーを設定した後、ページとWorkerで `self.crossOriginIsolated` と `typeof SharedArrayBuffer` を個別に確認します。[W3C Secure Contexts](https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy)、[WHATWG HTMLの制御対象機能](https://html.spec.whatwg.org/multipage/infrastructure.html#cross-origin-isolated-feature)、[W3C Permissions Policy](https://w3c.github.io/webappsec-permissions-policy/#permissions-policy-http-header-field)

HTTPで配信するDedicated Workerの入口は、起点のスクリプト応答からCOEPが決まります。分離対応のCOEPを指定したページがWorkerを作るなら、この入口にも分離に対応するCOEPを設定します。今回の構成ではWorkerのスクリプト応答にも `Cross-Origin-Embedder-Policy: require-corp` を付けます。トップレベルのウィンドウに作用するCOOPと、Workerの入口に必要なCOEPを分けて確認できます。[WHATWG HTMLのWorker起動手順](https://html.spec.whatwg.org/multipage/workers.html#run-a-worker)、[埋め込み方針の検査](https://html.spec.whatwg.org/multipage/browsers.html#embedder-policy-checks)

## ArrayBufferのコピーとSharedArrayBufferの共有

通常の `ArrayBuffer` を `postMessage()` で送ると、転送リストを指定しない場合は**構造化クローン**でバイト列がコピーされます。送った側と受け取ったWorkerは、別々のメモリを使います。転送リストに入れた場合は所有権を渡すため、送った側のバッファは切り離されます。[WHATWG HTMLの構造化シリアライズ](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)、[Web Workerとメッセージ通信](/browser/web-workers-messages.html)

`SharedArrayBuffer` をメッセージに入れる場合も構造化クローンが使われます。受け取った側に新しいJavaScriptオブジェクトが作られ、元と同じ**共有データブロック**を参照します。バイト列の所有権は移動せず、両側で `Int32Array` などのビューを作ってアクセスできます。共有できるのは同じエージェントクラスタの範囲です。分離の条件を満たさない環境からのシリアライズは `DataCloneError` になります。[WHATWG HTMLのシリアライズとデシリアライズ](https://html.spec.whatwg.org/multipage/structured-data.html#structureddeserialize)、[ECMAScriptのSharedArrayBuffer](https://tc39.es/ecma262/multipage/structured-data.html#sec-sharedarraybuffer-objects)

<figure class="study-figure">
  <img src="/images/browser/shared-array-buffer-observation.svg" alt="初期値0のバッファをページからWorkerへ送り、Workerが1を加える。ArrayBufferのコピーではページ側が0、Worker側が1となる。SharedArrayBufferでは二つのビューが同じ共有データブロックを参照し、Atomicsによる更新後にページ側でも1を読める。" width="760" height="1040" loading="lazy">
  <figcaption>Worker側の結果に加え、送信後にページ側の元のビューを読むと、コピーと共有の差が分かります。<a href="/study/images/browser/shared-array-buffer-observation.svg" target="_blank" rel="noopener noreferrer">コピーと共有の比較を拡大</a></figcaption>
</figure>

## Atomicsで更新と読み出しを同期する

`view[0] += 1` は、現在値の読み取り、加算、書き戻しに分かれます。2つのWorkerがともに0を読んでから1を書けば、2回加えたつもりでも結果は1です。 `Atomics.add(view, 0, 1)` は、対応する整数型ビューの要素に対する読み取りと更新を不可分に行い、**更新前の値**を返します。実験では、Workerから更新完了を受け取って、ページ側で `Atomics.load(view, 0)` を使ってその要素を読み出します。[ECMAScriptのAtomics.add](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.add)、[Atomics.load](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.load)

複数の要素をまとめて整合させる場合は、どちらが書き込むか、いつ読み出してよいかも決めます。例えばメッセージで完了を通知し、状態を示すフラグをAtomicsで管理する構成があります。共有バッファを渡した時点と、Workerの書き込みが終わった時点を分けて扱います。[ECMAScriptの共有メモリの指針](https://tc39.es/ecma262/multipage/memory-model.html#sec-shared-memory-guidelines)、[スレッドと同期](/runtime/thread-synchronization.html)

## 実践との対応

公開サンプルでは、現在の分離状態を確認し、通常の `ArrayBuffer` をWorkerへコピーした後の値を比較できます。ローカル版では、同じページをヘッダーなし、COOPのみ、COEPのみ、両方ありで配信します。別ポートの画像を読み込んだ結果と、Workerへ共有バッファを渡せる条件を分けて観察します。[クロスオリジン分離と共有メモリを観察する](/practice/browser/cross-origin-isolation-observation.html)

同じ実行環境でJavaScriptとWasmがバイト列を読み書きする例は、[WebAssemblyと線形メモリ](/browser/webassembly-linear-memory.html)で扱います。
