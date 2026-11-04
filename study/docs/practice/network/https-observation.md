---
title: C++とC#でHTTPSの応答とTLS情報を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: network
  collection: https-observation
  order: 1
  verification: Windowsで両言語のHTTPS GETを実行確認
  summary: WinHTTPとHttpClientの通常の証明書検証を保ち、固定URLへのGETでHTTP状態・本文長・TLS版・暗号スイート・公開証明書のフィンガープリントを観察する。
  aliases: [HTTPS, TLS, WinHTTP, HttpClient, SslStream, PlaintextStreamFilter, 証明書]
---

# C++とC#でHTTPSの応答とTLS情報を観察する

固定URL `https://example.com/`へGETし、HTTP応答と、APIが公開する接続のTLS情報を分けて調べます。C++はWindowsのWinHTTP、C#は.NET 10のHttpClientを使います。TLS内部の仕組みと図は[TLSとHTTPS](/network/tls-https.html)、暗号化前のメッセージ構造は[HTTP](/network/http-messages.html)を参照してください。

`--live`を指定した場合だけ通信します。引数なしは対象と使い方を表示して終了し、GETを実行しません。外部サービスが必要なので、未通信の表示をHTTPSの検証成功として数えません。IANAの`example.com`は文書用のドメインですが、Webサービスはベストエフォートです。常時稼働や内容の固定を前提にしません。[IANA：Example Domains](https://www.iana.org/help/example-domains)

## 何を観察するか

|出力|分かること|分からないこと|
|---|---|---|
|`response_headers`と`http_status`|HTTP応答ヘッダーが得られたことと状態コード|アプリケーション上の処理の正しさ|
|`protocol`・`cipher_suite`|APIが公開する接続のTLS版と暗号スイート|handshake各パケットや暗号処理の全内部|
|`peer_certificate_sha256`|相手の公開証明書のSHA-256フィンガープリント|秘密鍵、将来も同じ証明書である保証|
|`response_complete`・`body_bytes`|上限内でHTTP本文を最後まで読めたこと|TLS close_notifyやTCP EOFのwire上の確認|

通常のホスト名・証明書チェーン検証を保ち、検証失敗を無視するsecurity flagや、常に許可するcallbackは使いません。フィンガープリントは観察用で、コード中の固定値との照合や独自の認証判断には使いません。TLS版もOSの既定に任せます。

失効確認は別の条件です。C#の`CertificateRevocationCheckMode`は既定の`NoCheck`を表示し、C++も失効確認を明示的に有効化する設定を追加していません。「最新のすべての失効情報を照会した」という実験ではありません。[Microsoft：CertificateRevocationCheckMode](https://learn.microsoft.com/en-us/dotnet/api/system.net.security.sslclientauthenticationoptions.certificaterevocationcheckmode?view=net-10.0)、[WinHTTPのオプション](https://learn.microsoft.com/en-us/windows/win32/winhttp/option-flags)

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。ソースと出力はASCIIです。ユーザー名・パスワード等は入力せず、任意の接続先を指定する機能もありません。redirectは追跡せず、認証情報やCookieの自動送信を無効にしています。OS既定のproxyを利用し得ますが、設定は変更しません。

### Windows / C++20

- <a href="/study/samples/network/https/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/network/https/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/network/https/cpp/README.md" download>README.md</a>

Visual Studio 2022のC++環境、Windows SDK、CMake 3.20以降を使います。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\https_observation.exe
.\build\Release\https_observation.exe --live
```

### C# / .NET 10

- <a href="/study/samples/network/https/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/network/https/csharp/HttpsObservation.csproj" download>HttpsObservation.csproj</a>
- <a href="/study/samples/network/https/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project HttpsObservation.csproj -c Release
dotnet run --project HttpsObservation.csproj -c Release -- --live
```

## 今回の実行結果

2026年11月4日、Windows x64 25H2、build 26200.9711で確認しました。

|対象|条件|結果|
|---|---|---|
|C++|MSVC 19.35.32217.1、SDK 10.0.22000.0、CMake 3.26.3、C++20 x64 Release、`/W4 /WX /permissive- /EHsc /utf-8`|警告0、live 3回とも終了0|
|C#|SDK 10.0.403、runtime 10.0.14、net10.0 Release、warnings as errors、外部パッケージなし|警告0・エラー0、live 3回とも終了0|

両言語とも引数なしを1回実行し未通信表示と終了0、未知の引数を1回実行し終了2を確認しました。これらはliveの3回に含めません。以下は今回の出力の抜粋です。

```text
# C++
api_status=response_headers http_version=1.1 http_status=200
tls_info=available protocol=TLS1.3 protocol_code=0x2000 cipher_suite=0x1302 cipher_bits=256
api_status=response_complete body_bytes=577 body_limit=65536 read_calls=2 elapsed_ms=93
http_success=true
caller_scope=finished

# C#
revocation_policy=NoCheck
api_status=response_headers http_version=1.1 http_status=200
tls_observation_callbacks=1
tls_info=available protocol=Tls13 cipher_suite=TLS_AES_256_GCM_SHA384 negotiated_http=1.1
api_status=response_complete body_bytes=577 body_limit=65536 read_calls=2 elapsed_ms=127
http_success=true
caller_scope=finished
```

HTTP 200、TLS 1.3、暗号スイート、本文577バイト、読取り2回などは今回の観測値です。IP、公開証明書、本文、読取り回数、filterの呼出し回数、時間を固定assertしません。APIを1回呼んだことから、内部の接続試行・TLS handshake・wire上の要求も必ず1回だったとは推定しません。WinHTTPとHttpClientではproxyやキャッシュ等の内部方針も一致するとは限りません。

## 完了・上限・所有権を読む

C++は同期WinHTTPです。`WinHttpSendRequest`、`WinHttpReceiveResponse`、`WinHttpReadData`の帰還を確認して次へ進みます。各phaseのtimeoutは最大8秒、単調時計で管理する全体予算は30秒です。残り予算をAPI呼出しの前後で確認しますが、進行中の同期呼出しをその瞬間に中断する仕組みではなく、厳密な実時間の終了保証ではありません。[Microsoft：WinHttpSetTimeouts](https://learn.microsoft.com/en-us/windows/win32/api/winhttp/nf-winhttp-winhttpsettimeouts)

`WINHTTP_OPTION_SECURITY_INFO`はSChannelの接続情報を取得します。新しいWindowsへの依存があり、取得できない場合はエラー番号と観測不可を表示してHTTP本文の処理を続けます。検証を回避して継続する意味ではありません。相手証明書の複製contextはRAIIで`CertFreeCertificateContext`し、要求・接続・sessionも逆順に閉じます。[Microsoft：WINHTTP_SECURITY_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winhttp/ns-winhttp-winhttp_security_info)、[SERVER_CERT_CONTEXT](https://learn.microsoft.com/en-us/windows/win32/winhttp/option-flags#winhttp_option_server_cert_context)

C#は`ResponseHeadersRead`でヘッダーを受け取り、その後の`ReadAsStreamAsync`と`ReadAsync`にも同じ30秒のCancellationTokenを渡します。ヘッダー受信完了は本文受信完了ではありません。取消要求もOS内部の全処理停止や厳密な終了時刻の保証ではなく、awaitの結果または例外を回収してから所有物をDisposeします。[Microsoft：SendAsync](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.sendasync?view=net-10.0)

`PlaintextStreamFilter`では、得られたstreamが`SslStream`の場合に認証済みの接続情報を読み、元のstreamを返します。stream自体をread・交換・Disposeしません。一方、`RemoteCertificate`を取得した側には返却証明書のDispose責任があります。重複参照を除いて保持し、HTTP client/handlerの利用終了後に解放します。保持先の終了状態も同じlockで確認し、終了後に遅れてきたcallbackが証明書を追加しないようにします。`caller_scope=finished`はこの利用者側スコープの終了で、OS資源やGC対象がすべてゼロになったという計測ではありません。[Microsoft：PlaintextStreamFilter](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.socketshttphandler.plaintextstreamfilter?view=net-10.0)、[RemoteCertificateの所有権](https://learn.microsoft.com/en-us/dotnet/api/system.net.security.sslstream.remotecertificate?view=net-10.0#remarks)

両方とも実際の読取り数を累積し、64KiBを超える本文を拒否します。上限ちょうどの場合も追加の1バイトを読める要求で超過を検出します。readの0はAPIが表すHTTP本文の完了です。TLS close_notify、TCP FIN、物理パケットの受信を直接観測した値ではありません。API失敗・取消し・上限超過を成功へ置き換えず終了1にし、HTTP非2xxも状態を記録した上で終了1にします。

今回は通常経路の実行確認です。期限切れ、証明書の期限・名前・チェーン不正、本文上限超過、非2xx、proxy認証、通信断の故意注入はしていません。他OS・他コンパイラ/runtime・Unityも未実行です。TLS内部はAPIへ委ねており、wireの暗号化データやhandshake全体、秘密鍵を取得するサンプルではありません。

## ソース全体

### C++ / WinHTTP

<<< @/public/samples/network/https/cpp/main.cpp{cpp}

### C# / HttpClient

<<< @/public/samples/network/https/csharp/Program.cs{csharp}
