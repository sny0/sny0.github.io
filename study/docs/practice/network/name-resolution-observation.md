---
title: C++とC#でOSの名前解決結果と取消しの境界を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: network
  collection: name-resolution-observation
  order: 1
  verification: Windowsで両言語を実行確認
  summary: 数値IPv4/IPv6、localhost、任意のexample.com.をOS APIへ渡し、返されたアドレス・API状態・取消要求期限と完了回収を観察する。DNS通信経路や接続成功は測らない。
  aliases: [DNS, 名前解決, resolver, GetAddrInfoExW, GetAddrInfoExCancel, Dns.GetHostAddressesAsync, localhost, NS_ALL, IPv4, IPv6, cancel, drain]
---

# C++とC#でOSの名前解決結果と取消しの境界を観察する

名前や数値IPをAPIへ渡し、返されたアドレスと処理がどう終わったかを調べます。DNSパケットを直接送受信する例ではありません。名前解決の経路と図は[DNSと名前解決](/network/dns-resolution.html)、その後の処理は[TCP](/network/tcp-sockets.html)と[HTTP](/network/http-messages.html)で確認できます。

名前解決に成功しても、接続・HTTP応答・TLS認証が成功したわけではありません。このコードはそれらを実行しません。

## 入力と検査する条件

|入力|モード|成功時の検査|
|---|---|---|
|`127.0.0.1`|default / live|入力IPv4と同じアドレス・familyが返る|
|`::1`|default / live|入力IPv6と同じアドレス・familyが返る|
|`localhost`|default / live|有効なアドレスがあり、loopbackを含む|
|`example.com.`|`--live`のみ|少なくとも有効なIPv4/IPv6が得られる|

公開名のIP、件数、順序、時刻、処理時間は固定assertしません。localhostのloopback含有はこの教材の検査条件で、任意のローカル設定を強制したり変更したりするコードではありません。`example.com`はIANAが文書用に維持するドメインで、毎回同じアドレスや稼働状態を期待する運用先ではありません。[IANA：Example Domains](https://www.iana.org/help/example-domains)

defaultは外部名を指定しない範囲です。C++は`NS_ALL`でOSの名前解決方針を通すため、パケットを測らず「ネットワークへ絶対に出ない」「hostsだけを使った」とは断定しません。C#の数値IP入力は、DNSサーバーへ問い合わせずそのアドレスを返すとAPI文書で説明されています。[Microsoft：GetAddrInfoExW](https://learn.microsoft.com/en-us/windows/win32/api/ws2tcpip/nf-ws2tcpip-getaddrinfoexw)、[Dns.GetHostAddressesAsync](https://learn.microsoft.com/en-us/dotnet/api/system.net.dns.gethostaddressesasync?view=net-10.0)

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。ソースと出力はASCIIです。任意のhost入力、独自DNSサーバー、hosts/Firewall等の変更やcache flushは行いません。

### Windows / C++20

- <a href="/study/samples/network/name-resolution/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/network/name-resolution/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/network/name-resolution/cpp/README.md" download>README.md</a>

CMake 3.20以降とVisual Studio 2022のC++環境を使います。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\name_resolution_observation.exe
.\build\Release\name_resolution_observation.exe --live
```

### C# / .NET 10

- <a href="/study/samples/network/name-resolution/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/network/name-resolution/csharp/NameResolutionObservation.csproj" download>NameResolutionObservation.csproj</a>
- <a href="/study/samples/network/name-resolution/csharp/README.md" download>README.md</a>

.NET 10 SDKを使い、追加NuGetパッケージはありません。

```powershell
dotnet run --project NameResolutionObservation.csproj -c Release
dotnet run --project NameResolutionObservation.csproj -c Release -- --live
```

## 8秒は取消要求の期限で、回収は別

C++は`GetAddrInfoExW`へ、要求専用のゼロ初期化OVERLAPPEDとmanual-reset eventを渡します。`pTimeout`はnullptrとし、pendingならイベント待機に8秒の期限を設けます。期限到達時は取消しを要求し、その後も終端完了を待って`GetAddrInfoExOverlappedResult`を回収します。名前文字列・hints・result・OVERLAPPED・event・取消handleは、この回収まで保持します。

C++の`SOCK_STREAM`/`IPPROTO_TCP`は、返す接続候補に関する条件です。DNSの照会をTCPで送る指定でも、その証拠でもありません。C#の`AddressFamily.Unspecified`もIPv4/IPv6の選択に関するもので、DNSの通信方式の指定ではありません。両APIのヒント・namespace指定は同一ではなく、結果の件数や順序を両言語間で一致assertしません。

`GetAddrInfoExCancel`成功は利用者向け完了通知を起こし、要求結果は`WSA_E_CANCELLED`になります。既に完了/timeoutした競走では`WSA_INVALID_HANDLE`が返る場合もあるため、その場合も完了を回収します。内部の同期provider処理は継続し得るので、取消しは内部処理全停止を意味しません。[Microsoft：GetAddrInfoExCancel](https://learn.microsoft.com/en-us/windows/win32/api/ws2tcpip/nf-ws2tcpip-getaddrinfoexcancel)、[GetAddrInfoExOverlappedResult](https://learn.microsoft.com/en-us/windows/win32/api/ws2tcpip/nf-ws2tcpip-getaddrinfoexoverlappedresult)

回収後に`FreeAddrInfoExW`とeventのCloseHandleを行い、全要求を片付けてからWSACleanupします。専用eventの終端確認自体に根本的な異常が起きた場合は、pendingのstack領域を巻き戻さず異常停止する防御経路を置いています。この経路は今回実行していません。

C#は`Dns.GetHostAddressesAsync(host, AddressFamily.Unspecified, token)`を呼び、各要求のCancellationTokenSourceを8秒で取消要求する設定にします。結果、SocketException、OperationCanceledExceptionを一度のawaitで回収してからCTSをdisposeします。Taskの完了と内部OS処理の停止を同じものとしては扱いません。

したがって、8秒は各要求の取消要求期限であり、回収待ちを含む厳密な実時間終了や、プログラム全体が8秒で終わる保証ではありません。[Microsoft：取消token付き名前解決](https://learn.microsoft.com/en-us/dotnet/api/system.net.dns.gethostaddressesasync?view=net-10.0)

## ログで分かること

`api_status`はAPIの終端状態、`valid`は上表の教材条件に合ったかです。失敗/取消を空の成功結果に変換せず、そのまま報告します。`elapsed_ms`はAPI呼出しとその前後を含む経過時間で、C++では要求ownerの生成等も含みます。DNS通信だけの時間やcache hit判定ではありません。C++のimmediate/pendingと、C#が返却後に調べる`completed_at_check`も、それぞれのAPI層の観察です。

今回の出力から、数値IPの結果を抜粋します。

```text
  address family=IPv4 value=127.0.0.1 scope=0 loopback=true
result=numeric_ipv4 addresses=1 valid=true has_loopback=true numeric_match=true
  address family=IPv6 value=::1 scope=0 loopback=true
result=numeric_ipv6 addresses=1 valid=true has_loopback=true numeric_match=true
```

今回は両言語でlocalhostから`::1`と`127.0.0.1`、公開名から有効なIPv4を2件得ました。これは一環境の観察で、公開名の結果を期待値にはしていません。返された順序、API呼出し回数、所要時間から、A/AAAAのwire照会数やroot/TLD/権威への経路を推定しません。

```text
summary api_calls=3 succeeded=3 failed_or_cancelled=0 caller_objects=released
PASS: address validation; no wire/cache/connect claim
```

liveでは`api_calls=4`です。この件数はプログラムが呼んだAPIの回数で、DNSパケット数ではありません。`caller_objects=released`も、利用者側要求の寿命と後片付けを終えたことを表し、OS provider全停止や物理資源0、GC回収を証明する値ではありません。

## 実行確認の範囲

2026-11-04、Windows x64（25H2、build 26200.9711）で、両言語のdefault/liveを各3回、計12プロセス実行しました。すべてアドレス条件を満たして終了0でした。C++はMSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で無警告、C#はSDK 10.0.403・runtime 10.0.14、Release、warnings as errorsで警告0・エラー0です。

解決失敗・timeout・進行中の取消し・完了競走・wait異常は今回発生せず、故意注入も行っていません。wire通信、cache hit/miss、DNSの応答コードや委任経路、接続/HTTP/TLS、他OS/コンパイラ/runtime・Unityも未検証です。

## 実装

### Windows / C++20

<<< @/public/samples/network/name-resolution/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/network/name-resolution/csharp/Program.cs{csharp}
