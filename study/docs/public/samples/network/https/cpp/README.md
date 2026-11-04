# C++でHTTPSの応答とTLS情報を観察する

WindowsのWinHTTPで、`--live`を指定した場合だけ固定URL `https://example.com/`へGETします。引数なしは使い方を表示して終了し、通信しません。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\https_observation.exe
.\build\Release\https_observation.exe --live
```

Windows SDKとCMake 3.20以降が必要です。Windows x64 25H2、MSVC 19.35、SDK 10.0.22000.0、C++20 Release、`/W4 /WX`で警告0、liveを3回実行し終了0でした。今回はいずれもHTTP 200、TLS 1.3、暗号スイート0x1302、本文577バイトでした。値・処理時間・読取り回数は固定期待値ではありません。

証明書検証やTLS版はプラットフォームの既定を保ち、検証失敗を無視する設定は使いません。redirect、認証の自動応答、Cookieを無効にし、既定の認証情報を送りません。最新の失効情報をすべて確認する実験ではありません。OS既定のproxyを利用し得ます。

同期APIの各phase timeoutは最大8秒、単調時計の全体予算は30秒です。API呼出しの前後で確認する予算で、厳密な実時間の終了保証ではありません。本文は64KiBまで読み、超過やAPI失敗は終了1、HTTP非2xxも記録後に終了1、未知の引数は2です。timeout、証明書失敗、本文超過等の故意注入は未検証です。

`WINHTTP_OPTION_SECURITY_INFO`が使えない場合は観測不可を表示します。`SERVER_CERT_CONTEXT`はRAIIで`CertFreeCertificateContext`します。本文のread 0はHTTP本文の完了で、TLS close_notifyやTCP EOFの観測ではありません。秘密鍵・wire・handshake packetは取得しません。他OS・他コンパイラ・Unityは未検証です。

解説: https://sny0.com/study/practice/network/https-observation.html
