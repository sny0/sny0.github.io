# Windows/C++20でHTTP/1.1メッセージを観察する

同じプロセス内のIPv4 `127.0.0.1:0`で自己接続し、固定GETとContent-Length付き200応答を1回交換します。外部接続・固定ポート・ワイルドカードbindは使いません。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\http_message_observation.exe
```

CMake 3.20以降とVisual Studio 2022のC++環境を使います。Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で各3回確認し、無警告・終了0・20 checksでした。

全ソケットをnonblockingにし、`select`とSO_ERROR、一つの単調な時計による絶対期限8秒を使います。Winsock 2.2とソケットはRAIIで終了処理します。各送受信要求は最大7バイト、各readerの初回受信要求は6バイトです。これらはアプリ側の区切りで、TCPパケット分割の観察ではありません。

ヘッダー終端CRLFCRLFの受信跨りと本文への持越しを扱います。ヘッダー上限2048、本文上限64バイト。名前は大文字小文字を区別せず、重複CL・Transfer-Encoding・裸LF・非数字/過大CLは限定仕様として拒否します。固定の開始行・フィールド集合を検証する教材で、汎用HTTPパーサーではありません。

応答本文は`48 54 54 50 20 E3 81 82 0A`の9バイトです。本文完成後のrecv0はConnection: closeの確認として別に扱います。Dateは実行時UTCの英語IMF-fixdateで、期限の単調時計とは別です。Date検査は自己生成値の29文字形式と一致の確認で、任意HTTP-dateの完全検証ではありません。

今回の受信ではヘッダー135バイトの後の本文4バイトを持ち越し、残り5バイトを回収しました。回数や持越し量は固定assertしません。loopbackのため外部物理NIC経路・パケット・性能は未観測です。故意のtimeout/reset/不完全メッセージ送信、TLS、汎用HTTP機能、IPv6・他OS/コンパイラ・Unityは未検証です。ソースと出力はASCII、入力・ファイルI/O・外部依存取得はありません。

解説: https://sny0.com/study/practice/network/http-message-observation.html
