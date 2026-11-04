# Web Workerのコピーとtransferを観察する

`index.html`、`styles.css`、`main.js`、`worker.js`、このREADMEを同じフォルダに置き、HTTPまたはHTTPSで同じoriginから配信します。`file://`では起動しません。外部ライブラリは使わず、classic main scriptをdeferで読み、外部classic worker.jsを起動します。

公開ページ: https://sny0.com/study/samples/browser/worker-message-observation/index.html

「Workerを起動」でreadyを待ってから、一件ずつ試します。

- A copy：0〜15の16バイトを複製。workerは変更前16バイト・先頭0・合計120を調べ、先頭255へ変更して返信します。送信元は16バイト・先頭0のままです。
- B transfer：同じbufferをpayloadと転送リストへ入れます。送信直後の元bufferはbyteLength 0。返信もtransferし、workerの返却後byteLength 0を別メッセージで確認してから完了します。
- C delay：worker timerに3000msを指定して返信します。待機中にmainカウンターを操作し、停止・再起動も試せます。重いCPU処理や性能比較ではありません。
- D function：関数を送ろうとして、mainのpostMessageの同期DataCloneErrorをcatchします。workerのerrorイベントとは別です。

起動と各要求は8秒のsoft timeoutです。厳密な実時間の保証ではなく、背景タブ等ではtimerも遅延し得ます。停止、timeout、worker error、protocol errorでは利用者側timerと未完了要求を片付け、workerをterminateします。世代とworker identityの確認で古いcallbackによる表示を防ぎます。停止ボタンのクリック処理はmainで実行中のJavaScriptへ割り込む命令ではありません。

ログは最新40件。表示ログを消してもworkerは停止しません。worker.jsの起動時取得以外にfetchや外部通信を行うコードはなく、storageやanalyticsもありません。無限ループ・busy loop・アニメーション・毎フレーム処理は実行しません。コピー回数の全内部や速度、CPU/GPU性能を測る例ではありません。

実験の解説: https://sny0.com/study/practice/browser/worker-message-observation.html
