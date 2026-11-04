---
title: C++とC#でHTTPのヘッダー・本文・終端を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: network
  collection: http-message-observation
  order: 1
  verification: Windowsで両言語を実行確認
  summary: 固定GETと200応答を自己loopback接続で交換し、CRLFCRLFの受信跨り、本文の持越し、Content-Lengthのバイト数、Date、本文完成と接続EOFの違いを確認する。
  aliases: [HTTP/1.1, Content-Length, CRLF, Date, IMF-fixdate, ヘッダー, 本文, TCP, Socket.Select, EOF]
---

# C++とC#でHTTPのヘッダー・本文・終端を観察する

**TCPから受け取ったバイト列を、HTTPのヘッダーと本文に分けて読みます。** 同じプロセスのIPv4 `127.0.0.1`へ、OS割当ポートで自己接続する例です。通信は固定の1往復で、外部接続や固定ポートは使いません。仕組みと図は[HTTPメッセージ](/network/http-messages.html)、ソケットと半閉鎖は[TCPの観察例](/practice/network/tcp-loopback-observation.html)を参照してください。

これは指定した会話を検証する教育用の限定パーサーです。開始行とフィールド集合を固定しており、汎用HTTPクライアントやサーバーとして使うコードではありません。

## 交換するメッセージ

|方向|内容|
|---|---|
|request|`GET /study-demo HTTP/1.1`、実ポートを含むHost、`Connection: close`。CL/TEなし|
|response|`HTTP/1.1 200 OK`、Content-Type、`Content-Length: 9`、`Connection: close`、実行時UTCのDate|
|response本文|`48 54 54 50 20 E3 81 82 0A`の9バイト|

本文をUTF-8として解釈すると、`HTTP あ`の末尾にLFが続きます。この例は文字数へ変換せず、独立した期待バイト列と照合します。Content-Lengthはヘッダーの長さや文字数ではなく、本文のオクテット数です。[RFC 9110 §8.6](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.6)

このrequestの本文が0なのは、CLもTEもない固定会話だからです。「GETという名前なら必ず本文0」という判定ではありません。responseはCL9に従って9バイトを読み終えた時点でメッセージが完成します。その後のrecv0は接続終了の確認で、本文長の判定とは分けます。[RFC 9112 §6.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-6.3)

Dateは時計のあるoriginが生成する200応答に付けます。C++は現在UTCを固定英語の曜/月名でIMF-fixdateへ整形し、C#は`UtcNow.ToString("r", InvariantCulture)`を使います。29文字の形と、その往復でserverが生成した値との一致を確認します。任意のHTTP-dateの全文法・暦を検証する機能ではありません。Dateの日時時計と、I/O期限に使う単調な時計は別です。[RFC 9110 §6.6.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-6.6.1)

## ヘッダーを読んでも本文を捨てない

`BufferedReader`はCRLFCRLFを探し、区切りが次の受信にまたがっても検索を続けます。同じ受信に本文が含まれていれば、ヘッダーを切り出した後の残りを保持し、本文読み取りに使います。ヘッダーを丸ごとUTF-8文字列へ変換してから探すのではなく、まずバイト列として区切ります。[RFC 9112 §2.2](https://www.rfc-editor.org/rfc/rfc9112.html#section-2.2)

この限定仕様では、ヘッダーは終端込み2048バイト以下、本文は64バイト以下です。フィールド名は大文字小文字を区別せず、CLは数字だけの有界な10進数として読みます。重複CL、Transfer-Encoding、裸LF、指定外のフィールド集合等は拒否します。これは本教材で受理範囲を絞る方針で、HTTP一般の合法・不正をすべて分類する実装ではありません。

各送受信要求は最大7バイトです。各readerの初回だけ6バイト要求にして、区切り跨りと本文持越しを観察しやすくしています。要求の分割はアプリ側の操作であり、TCPパケットがその単位で分割されたという観測ではありません。要求通りの数が返ると仮定せず累積します。

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。ソースと出力はASCIIで、入力・ファイルI/O・外部依存取得はありません。

### Windows / C++20

- <a href="/study/samples/network/http-message/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/network/http-message/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/network/http-message/cpp/README.md" download>README.md</a>

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\http_message_observation.exe
```

CMake 3.20以降とVisual Studio 2022のC++開発環境を使います。

### C# / .NET 10

- <a href="/study/samples/network/http-message/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/network/http-message/csharp/HttpMessageObservation.csproj" download>HttpMessageObservation.csproj</a>
- <a href="/study/samples/network/http-message/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project HttpMessageObservation.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。

全ソケットをnonblockingにし、C++は`select`、C#は`Socket.Select`でread/writeとエラー集合を待ちます。WouldBlock時も、全段階で共有する絶対期限8秒の残り時間を使い、待つたびに期限を更新しません。resetやtimeoutはEOFとして扱いません。Winsock/ソケットはRAII、C#のソケットはusingで閉じます。[Microsoft：select](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-select)、[Socket.Select](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.select?view=net-10.0)

## 今回の出力と検証範囲

両言語を各3回実行し、ヘッダーと本文に関して次の結果を得ました。ポートとDateは実行時の値です。

```text
client header_bytes=135 carried_body_bytes=4
client recv requested=7 actual=5
client status=200 content_length=9 body_bytes=9 message_complete=true
client body_hex=48 54 54 50 20 E3 81 82 0A
client response_eof=true
server request_eof=true
closed_sockets=3 live_sockets=0 readiness_waits=1
PASS: 20 checks
```

今回はヘッダーに続いて受け取った本文4バイトを保持し、残り5バイトを追加して本文を完成させました。serverが応答を送りSENDを半閉鎖し、clientは本文完成後のEOFを確認して自分のSENDを半閉鎖、最後にserverもEOFを確認します。持越し量や呼出し回数は固定assertしていません。

2026-11-04、Windows x64（25H2、build 26200.9711）で、全回終了0・20 checks成功でした。C++はMSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で無警告、C#はSDK 10.0.403・runtime 10.0.14、Release、warnings as errorsで警告0・エラー0です。

20項目には会話と本文・Date・EOF・close・期限の確認に加え、memory上での混在大小文字名の受理、重複CL・TE・裸LF・非数字CL・過大CLの拒否が含まれます。これらの不正例を実ネットワークで送信したわけではありません。途中EOF・timeout・reset等の故意注入、任意の受信分割、TLS、chunked・持続接続等の汎用HTTP機能、他OS/コンパイラ/runtime・IPv6・Unityは未検証です。

小さな単一会話の段階実行で、大量双方向通信のイベントループではありません。loopbackなので外部物理NIC経路を観察せず、パケットのtraceや性能測定も行っていません。

## 実装

### Windows / C++20

<<< @/public/samples/network/http-message/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/network/http-message/csharp/Program.cs{csharp}
