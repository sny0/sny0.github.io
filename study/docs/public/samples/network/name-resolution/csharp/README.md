# C#で名前解決APIの結果を観察する

defaultは`127.0.0.1`、`::1`、`localhost`をOS APIへ渡します。`--live`を指定した場合だけ、IANAの文書用ドメイン`example.com.`を追加します。外部名・名前解決サーバーを自由入力する機能はありません。

```powershell
dotnet run --project NameResolutionObservation.csproj -c Release
dotnet run --project NameResolutionObservation.csproj -c Release -- --live
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。Windows x64、SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsでdefault/live各3回、警告0・エラー0・終了0でした。他OS/runtime・Unityでは未実行です。

`Dns.GetHostAddressesAsync(host, AddressFamily.Unspecified, token)`を呼び、一度awaitして結果/例外を回収します。各要求のCancellationTokenSourceを8秒で取消要求する設定です。8秒は内部OS処理の全停止や厳密なwall-clock終了の保証ではありません。CTSはawaitの終端後にdisposeします。

`completed_at_check`はAPI返却後にTask.IsCompletedを調べた時点の状態で、返却の厳密な瞬間ではありません。数値IPは入力アドレスとfamilyの一致、localhostはloopbackを含むこと、公開名は有効なIPv4/IPv6が得られたことを検査します。公開名のIP・件数・順序は固定しません。解決失敗/取消等は報告して終了1、未知の引数は2です。取消・解決失敗・timeoutは今回は故意に再現していません。

ソースと出力はASCIIです。hosts/Firewall/サーバー設定変更、cache flush、接続・HTTP・TLS処理はありません。defaultは外部名を指定しない範囲で、packet traceなしにOS方針や名前解決経路、cache hitを断定しません。caller_objects=releasedは利用者側の要求寿命とCTSdisposeの完了を表し、内部処理全停止やGC回収を証明しません。

解説: https://sny0.com/study/practice/network/name-resolution-observation.html
