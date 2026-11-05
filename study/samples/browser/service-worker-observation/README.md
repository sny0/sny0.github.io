# Service Workerの制御と応答元を観察する

6ファイルを同じフォルダへ置き、HTTPSまたはsecure contextのlocalhost HTTPで配信します。公開実験は https://sny0.com/study/samples/browser/service-worker-observation/index.html です。

Python 3を使う場合は配信するフォルダで次を実行し、`http://127.0.0.1:8765/index.html`を開きます。使用後はCtrl+Cでサーバーを停止します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

1. 通常の固定GETを行い、応答元ヘッダーを確認します。
2. 「実験用Workerを登録」を押します。readyの解決履歴と現在のcontrollerを別々に確認します。
3. activeを確認して通常の再読み込みを行い、通常の固定GETと疑似オフラインの固定GETを比べます。
4. 登録を解除し、他の実験タブを閉じて現在のページを再読み込みします。専用登録とcontrollerがない状態で固定entryを削除します。

Workerのscopeは同じフォルダです。登録・解除はexact scopeとscript URLの照合を通った状態で行います。同じscopeの別scriptや、所有未確認のcontrollerがあるときは操作を止めます。解除直後のページでは旧controllerが残る場合があります。その間は再登録とentry削除を無効にします。

installのwaitUntilで固定JSONをローカルResponseにし、`sny0-study-service-worker-observation-v1`の正規payload URLへputします。ブラウザの通常のactivateを待ちます。介入対象は`payload.json`または完全一致する`payload.json?mode=offline`のGETです。ページ遷移のnavigateモードは通常の配信へ任せます。後者のqueryはこの一件でネットワーク分岐を省く指定です。

通常は`no-store`と`redirect:error`でfetchし、本文読取りまで3秒の中断signalと2048バイト上限を使います。失敗時は指定cacheの正規キー一つを読み、missや読取り失敗を503で返します。ネットワーク分岐を通した結果と、疑似オフラインの結果は応答ヘッダーで区別します。3秒は厳密な実時間の終了保証ではありません。

後始末は正規URL一つのentry削除です。同じcache名の別キーとcacheコンテナは残します。scope確認から操作までを他タブとatomicにする設計ではないため、同時に別タブで登録・削除を進める用途は対象外です。外部ライブラリやpermission要求は不要です。

解説と検証条件は https://sny0.com/study/practice/browser/service-worker-observation.html にあります。
