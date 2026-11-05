# C# / HttpClientで条件付きGETを観察する

.NET 10 SDKを使います。Program.csとHttpCacheObservation.csprojを同じフォルダへ保存します。外部NuGetパッケージはありません。先に親フォルダのserver.cjsを別ターミナルで起動します。

```powershell
$cachePort = 54321 # server.cjsが表示したport値へ置き換える
dotnet run --project HttpCacheObservation.csproj -c Release -- $cachePort
```

54321は説明用で、固定の待受portではありません。入力は1〜65535のport一つだけです。接続先は常に127.0.0.1で、proxyとredirectを無効にし、Cookieや認証情報を使いません。HTTP/1.1をRequestVersionExactで指定します。

4回のGETで200/304/304/200、本文10/0/0/10バイト、ETagを検査します。304では最初に保存した本文を自分で再利用します。3回目は`"other,tag", W/"study-v1"`、4回目は意図的不一致の`"study-old"`です。サーバーの内容自体は更新しません。

同じ30秒のCancellationTokenを4回のSendAsyncと本文ReadAsyncへ渡し、ConnectTimeoutは8秒です。各本文は4KiB上限にします。取消しやエラーは終端を回収して終了1、引数不正は2です。usingでrequest/response/stream/client/handler等をDisposeします。予算はOS内部の全停止や厳密な実時間の終了保証ではありません。

ブラウザの自動キャッシュを検証したコードではなく、HttpClientによる実HTTP要求と明示的なメモリ内キャッシュのモデルです。ソース・出力はASCIIです。検証条件・未確認範囲: https://sny0.com/study/practice/network/http-cache-observation.html
