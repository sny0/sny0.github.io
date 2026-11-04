# C#でTCP loopbackと半閉鎖を観察する

一つのプロセスでIPv4 `127.0.0.1:0`へlistenし、OSが割り当てたportへ自己clientを接続します。外部host・wildcard bind・固定portは使いません。

```powershell
dotnet run --project TcpLoopbackObservation.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。Windows x64、SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで3回確認し、警告0・エラー0・終了0・14 checksでした。`Socket`は`using`でdisposeし、3つのSafeHandleがclose済みか検査します。

全socketをnonblockingにし、WouldBlockでは**Socket.Select**のread/write＋error集合と`SO_ERROR`を使います。Pollはこのコードでは使いません。全phaseで一つのmonotonic絶対deadline8秒を共有し、async・Task.Run・Sleep・busy waitは使いません。resetやtimeoutはEOFへ変換せず失敗とします。

clientは2byte big-endian length付きの2frames（計14bytes）を送り、SENDを半閉鎖します。serverは本文を復元し、正のReceive要求で0を確認した後、application ACK `4F 4B 00 01`を返してSENDを半閉鎖します。clientはACK4bytesとEOFを確認します。各send/recv要求は最大3bytes、戻り値を累積します。長さ上限8、binary NUL、両方向のbytesも検査します。

これは小さな単一会話を段階実行する例で、大量双方向同時通信のevent loopではありません。API回数や要求の分割からTCP packet数は分かりません。loopbackなので外部の物理NIC経路を観測せず、packet trace・負荷/性能測定・故意のtimeout/peer故障注入は未実施です。IPv4限定は観察範囲の固定で、一般clientへIPv6非対応を推奨するものではありません。他OS/runtime・Unityは未検証です。ソースと出力はASCII、入力・ファイルI/Oはありません。

解説: https://sny0.com/study/practice/network/tcp-loopback-observation.html
