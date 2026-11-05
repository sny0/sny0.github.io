# Streams APIとbackpressureを観察する

4ファイルを同じフォルダへ置き、静的HTTPサーバーで配信するか公開実験を開きます。classic main.jsをdeferで読みます。外部ライブラリ、ネットワークfetch、storage、analyticsは使いません。

公開実験: https://sny0.com/study/samples/browser/stream-backpressure-observation/index.html

Python 3がある場合は保存フォルダで次を実行し、`http://127.0.0.1:8765/index.html`を開けます。使用後はCtrl+Cで停止します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

ReadableStreamはpullで8個の4byte Uint8Arrayを生成し、CountQueuingStrategyのHWM2を使います。WritableStreamはHWM1で、writeごとに600ms timer Promiseを待ちます。pipeTo(signal)で実際に接続し、そのPromiseがfulfilledになった時点を通常完了とします。

enqueue前後のdesiredSizeと、generated/started/completedを表示します。outstanding=generated-completedは教材側の累計差です。中断後の未消費分も含み、現在の内部queue長や保持メモリ量ではありません。生成済み・write未開始の差も、source/pipe/sink内部の各queue長へ分解した値ではありません。HWMはcount単位で、バイト数のhard capやCPU並列性を保証する設定ではありません。

中断はAbortControllerを使います。pipeToと進行中writeの待機へ同じsignalを渡し、abortでtimerをclearして待機Promiseとwriteをsignal.reasonでrejectします。通常消費完了には数えません。timerのresolve直後からthen継続までに中断された場合もsignalを確認してrejectします。中断要求後も既読chunkのwriteが始まる場合があり、その待機も同じsignalで片付けます。writeの途中の作用が自動rollbackされる意味ではありません。

source.cancel/sink.abortの呼出しと順序を固定保証せず、実際に呼ばれたcallbackをログへ残します。sourceが既にclosedとなった最後のwrite中の中断では、両callbackが0回でもwriteのrejectがpipeToへ伝わる経路があります。callback回数だけで中断の成否を判断しません。

中断を要求しただけでは再実行できません。pipeToのfulfilled/rejectedを回収してlock状態を表示し、その後に再実行可能にします。「中断して初期化」も終端を待って表示を消します。世代と実行オブジェクトを確認し、古いcallbackによる新しい表示の上書きを防ぎます。ログは最新60件、生成記録は最大8行です。

CPUベンチマーク、実ファイル保存、fetch本文の受信を実演するコードではありません。検証条件・未確認範囲は解説を参照してください。

解説: https://sny0.com/study/practice/browser/stream-backpressure-observation.html
