---
title: C++とC#でTCPのフレーム復元と半閉鎖を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: network
  collection: tcp-loopback-observation
  order: 1
  verification: Windowsで両言語を実行確認
  summary: 自己プロセスのIPv4 loopbackへ接続し、最大3byteずつの送受信から2framesを復元する。共通deadline、半閉鎖後の逆向きACK、EOF、closeを確認する。
  aliases: [TCP, socket, loopback, Winsock, Socket.Select, framing, big-endian, half-close, 半閉鎖, EOF, WouldBlock, deadline]
---

# C++とC#でTCPのフレーム復元と半閉鎖を観察する

**TCPのバイト列からアプリ側のメッセージを復元し、送信を終えた後も受信できることを確かめます。** 一つのプロセス内で、待受けソケット・クライアント・accept済みのサーバー側ソケットを作る例です。内部の仕組みと図は[TCPとソケット](/network/tcp-sockets.html)を参照してください。

IPv4 `127.0.0.1`だけへbindし、portは0で要求してOSの割当結果を取得します。外部host・wildcard bind・固定portは使いません。loopbackは同じPCへ返る経路で、外部の物理NICを通る通信の観察ではありません。IPv4限定はこの例の観察範囲を固定する選択です。一般clientにIPv6非対応を勧める設計ではありません。[Microsoft：IPAddress.Loopback](https://learn.microsoft.com/en-us/dotnet/api/system.net.ipaddress.loopback?view=net-10.0)

## 送るバイト列と会話の順序

クライアントが送る14byteは次の通りです。各フレームは**2byteのbig-endian長＋本文**とし、本文の上限は8byteにします。

```text
00 06 | 41 42 00 E3 81 82
00 04 | 10 20 30 40
```

|phase|処理|
|---|---|
|接続|listen→自己clientのconnect→accept。割当portと自己clientのendpointを照合|
|送信|clientが14bytesを送り、SENDを半閉鎖|
|復元|serverがheaderとbodyを累積し、2framesとbinary NULを確認|
|片方向の終了|serverが正のrecv要求で0を受け、client→server方向のEOFを確認|
|反対向きの応答|serverがapplication ACK `4F 4B 00 01`を送り、SENDを半閉鎖|
|終了|clientがACK4bytesとEOFを確認し、3socketをclose|

各send/recv要求を最大3bytesに制限します。戻り値が要求より小さければ、残りを繰り返します。headerも2bytesがそろうまで読み、長さを検査してから固定8byte領域へbodyを受けます。TCP自体がframe境界を返すわけではありません。[RFC 9293：TCPのbyte stream](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2)、[Microsoft：send](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-send)

このapplication ACKは「このサンプルのserverが2framesとEOFを確認した」という応答で、TCPのACKとは別です。send成功だけで相手アプリの解析完了を判断しません。TCPのACK packet自体はtraceしていません。

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。入力・ファイルI/O・外部ライブラリ取得はなく、ソースと出力はASCIIです。

### Windows / C++20

- <a href="/study/samples/network/tcp-loopback/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/network/tcp-loopback/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/network/tcp-loopback/cpp/README.md" download>README.md</a>

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\tcp_loopback_observation.exe
```

CMake 3.20以降とVisual Studio 2022のC++環境を使い、Winsock 2.2を`WSAStartup`/`WSACleanup`、socketを`closesocket`のRAIIで管理します。

### C# / .NET 10

- <a href="/study/samples/network/tcp-loopback/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/network/tcp-loopback/csharp/TcpLoopbackObservation.csproj" download>TcpLoopbackObservation.csproj</a>
- <a href="/study/samples/network/tcp-loopback/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project TcpLoopbackObservation.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。`Socket`を`using`でdisposeし、終了後に3つのSafeHandleがclose済みか検査します。

## 無期限の待ちとEOFを区別する

listener・client・accept済みsocketをすべてnonblockingにします。C++は`select`、C#も実際のコードでは`Socket.Select`を使います。read/writeに加えてerror集合を確認し、connect完了時は`SO_ERROR`も調べます。`Poll`は辞典で扱う関連APIで、この例の待機には使っていません。[Microsoft：Winsock select](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-select)、[Socket.Select](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.select?view=net-10.0)

全段階で、単調な時計を基準とする**8秒の絶対期限**を共有します。WouldBlockなら残り時間だけreadinessを待って再試行し、再試行ごとに8秒へ戻しません。Sleepやbusy waitで待ちません。readinessは「今度の呼出しも要求全量を処理する」という保証ではないため、実際のsend/recv結果を再確認します。

正のrecv要求が0を返した場合をgraceful EOFとして扱い、frameやACKの途中なら不完全な会話として失敗させます。resetやtimeout等のエラーはEOFへ変換しません。SENDだけのshutdownは受信方向まで閉じないので、その後もapplication ACKを受け取れます。[Microsoft：recv](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-recv)、[shutdown](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-shutdown)、[Socket.Shutdown](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.shutdown?view=net-10.0)

## 今回の出力と確認範囲

出力の一部です。listen portはrunごとに変わります。

```text
server frame=1 length=6 hex=41 42 00 E3 81 82
server frame=2 length=4 hex=10 20 30 40
server recv requested=3 actual=0
server eof=true; reverse direction remains usable
client application_ack hex=4F 4B 00 01
client eof=true
closed_sockets=3 live_sockets=0 readiness_waits=1
PASS: 14 checks
```

今回のclientはsend5回・recv3回、serverはsend2回・recv7回で、送受信した累積量はclient→server 14bytes、server→client 4bytesでした。これは**API呼出しの観察値**で、回数の固定assertはしていません。要求を3bytes以下に分けても、TCP packetがその単位で分割されたとは言えません。

2026-11-04、Windows x64（25H2、build 26200.9711）で各3回、すべて終了0・14 checks成功でした。C++はMSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で無警告、C#はSDK 10.0.403・runtime 10.0.14、Release、warnings as errorsで警告0・エラー0です。

14項目は割当endpoint・自己接続、過大な長さのmemory上での拒否、2frameの長さと本文、NUL、両側EOF、ACK、累積bytes、close、共通deadline内の完了です。故意のdeadline超過・peer故障・reset、要求より短い正のsend/recv、物理packet trace・性能・外部NIC経路、IPv6・他OS/コンパイラ/runtime・Unityは未検証です。

一組の送信側と受信側で、短いやり取りを段階ごとに進める例です。大量の双方向通信を同時に扱うイベントループは使いません。送信バッファが詰まれば、この構成でも期限切れで異常終了します。

## 実装

### Windows / C++20

<<< @/public/samples/network/tcp-loopback/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/network/tcp-loopback/csharp/Program.cs{csharp}
