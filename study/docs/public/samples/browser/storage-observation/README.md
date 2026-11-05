# ブラウザ保存領域を観察する

4ファイルを同じフォルダへ保存し、HTTPSまたはsecure contextのlocalhost HTTPで配信します。file://は操作対象外です。classic main.jsをdeferで読み、外部ライブラリは不要です。

公開実験: https://sny0.com/study/samples/browser/storage-observation/index.html

Python 3がある場合は保存フォルダで次を実行し、`http://127.0.0.1:8765/index.html`を開けます。使用後はCtrl+Cで停止します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

各APIでversion 1と日本語文字列の固定レコード一つを扱います。ページを開いただけでは保存・読出ししません。保存完了後に再読み込みし、各「読出し」を押して継続を確かめます。ポートを変えるとoriginも変わるため、比較は同じoriginで行います。

保存先のprefixは`sny0-study-storage-observation-v1`です。localStorageは専用key、IndexedDBは同名DB/records store/fixed-record key、Cache APIは同名cacheと同originの架空Request keyだけを操作します。同じサンプルの既存値は保存で上書きします。localStorage.clear、DB全削除、origin全削除、他のkey/DB/cacheの操作は行いません。

IndexedDBはrequest.successの結果を保持し、transaction.complete後だけ最終成功を表示します。依存requestはnative success callback内でqueueし、外部awaitを途中に入れません。error/abortは失敗、各操作後はDBをcloseします。versionchangeでは自分のtransactionを中断してcloseします。open blockedは取消できると表示せず、busyのままnative終端を待つため別タブ等の接続を閉じてください。

Cache APIはnew Responseでローカル構築してcloneをputし、matchのResponseのcloneをtextで一度consumeします。架空Requestへfetchは行わず、Service Workerも登録しません。read/deleteはhasで専用cacheを確認してからopenしますが、別タブとの間でatomicな操作を保証しません。

削除後も空のDB/store/cacheコンテナは残ります。IDBの初回読出しではschema作成が起きる場合がありますが、固定レコードの保存とは別です。全保存操作はbusy gateで一件ずつ、ログは最新60件、出力はtextContentです。容量制限、アクセス制限、API利用不可、対象なし、データ不一致を分けます。

将来の保持や物理ディスクのdurabilityを保証する実験ではありません。persist等のpermission要求、個人情報、任意入力、外部fetch、analyticsは使いません。検証条件・未確認範囲: https://sny0.com/study/practice/browser/storage-observation.html
