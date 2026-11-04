# C#でHTTPSの応答とTLS情報を観察する

.NET 10のHttpClientで、`--live`を指定した場合だけ固定URL `https://example.com/`へGETします。引数なしは使い方を表示して終了し、通信しません。追加NuGetパッケージはありません。

```powershell
dotnet run --project HttpsObservation.csproj -c Release
dotnet run --project HttpsObservation.csproj -c Release -- --live
```

Windows x64 25H2、SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで警告0・エラー0、liveを3回実行し終了0でした。今回はいずれもHTTP 200、TLS 1.3、TLS_AES_256_GCM_SHA384、本文577バイトでした。値・処理時間・読取り回数・filter呼出し回数は固定期待値ではありません。

通常の証明書検証を保ち、独自の検証callbackやTLS版の指定は使いません。失効確認モードの既定値は`NoCheck`で、最新の失効情報をすべて確認した意味ではありません。redirect、Cookie、自動展開を無効にし、資格情報を設定しません。OS既定のproxyを利用し得ます。

`ResponseHeadersRead`後の本文にも同じ30秒のCancellationTokenを渡し、64KiBを超える本文は失敗にします。取消しは厳密な実時間の終了保証ではありません。HTTP非2xx・要求失敗・取消し等は終了1、未知の引数は2です。証明書失敗、timeout、本文超過等の故意注入は未検証です。

`PlaintextStreamFilter`はSslStreamの情報だけを読み、元streamを返します。streamをread/disposeしません。`RemoteCertificate`の返却値は呼出し側にDispose責任があるため、保持し、HTTP client/handlerの利用終了後に解放します。本文のread 0はHTTP本文の完了で、TLS close_notifyやTCP EOFを観測した値ではありません。秘密鍵・wire・handshake packetは取得しません。他OS/runtime・Unityは未検証です。

解説: https://sny0.com/study/practice/network/https-observation.html
