# Worker poolと受付上限を観察する

5ファイルを同じフォルダに置き、HTTPまたはHTTPSで同じoriginから配信します。手元でもローカルHTTPサーバーから開きます。公開実験: https://sny0.com/study/samples/browser/worker-pool-observation/index.html

Python 3がある場合は、そのフォルダで次を実行し、`http://127.0.0.1:8765/index.html`を開けます。使用後はCtrl+Cで停止します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

固定2つのWorkerのreadyを待ってから「7件まとめて依頼」を押します。同じ同期処理内で2件をdispatch、4件をFIFO待機、7件目を拒否するため、受付6・拒否1になります。workerは16値0〜15のcount16・sum120を求め、3000ms timer後に返信します。CPU性能やcopy速度の実験ではありません。

- 待機取消し：queue先頭を未送信のまま除き、queuedCancelledにします。
- 結果を使わない：最初の未指定slotへ破棄印を付けます。処理は止めず、返信までrunningに含め、回収後discardedにします。
- pool停止：全workerをterminateし、未完了の実行・待機をabortedにします。自動retryはありません。
- 停止して初期化：停止後に集計・履歴・ログを消します。要求IDは再利用しません。

不変条件は `accepted = running + waiting + completed + queuedCancelled + discarded + aborted`。rejectedはaccepted外、結果破棄待ちはrunning内です。未完了は最大6件、終端履歴は最新20件、ログは最新60件に制限します。FIFOはdispatch順で、完了順の保証ではありません。

起動時ready待ちは各8秒、job timeoutはdispatch時から8秒のsoft timeoutです。queue受理時からは数えず、待機期限も今回はありません。背景タブ等ではtimerが遅延し得るため厳密な実時間の保証ではありません。worker error、messageerror、不正/重複返信、constructor失敗、timeoutではpool全停止します。世代とworker identityで古いcallbackを無視します。

classic main scriptをdeferで読み、外部classic worker.jsを使います。外部ライブラリ、fetch、storage、analytics、アニメーション、毎フレーム処理、busy loopはありません。mainカウンターは待機中も使えます。実測条件は解説を参照してください。

解説: https://sny0.com/study/practice/browser/worker-pool-observation.html
