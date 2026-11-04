# C#でHTTP/1.1メッセージを観察する

同じプロセス内のIPv4 `127.0.0.1:0`で自己接続し、固定GETとContent-Length付き200応答を1回交換します。外部接続・固定ポート・ワイルドカードbindは使いません。

```powershell
dotnet run --project HttpMessageObservation.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。Windows x64、SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで各3回確認し、警告0・エラー0・終了0・20 checksでした。

全ソケットをnonblockingにし、`Socket.Select`とSO_ERROR、一つのStopwatchによる絶対期限8秒を使います。ソケットはusingで閉じます。各送受信要求は最大7バイト、各readerの初回受信要求は6バイトです。asyncやTask.Runは使いません。

ヘッダー終端CRLFCRLFの受信跨りと本文への持越しを扱います。ヘッダー上限2048、本文上限64バイト。名前は大文字小文字を区別せず、重複CL・Transfer-Encoding・裸LF・非数字/過大CLは限定仕様として拒否します。固定の開始行・フィールド集合を検証する教材で、汎用HTTPパーサーではありません。

応答本文は`48 54 54 50 20 E3 81 82 0A`の9バイトです。本文完成後のrecv0はConnection: closeの確認として別に扱います。Dateは`UtcNow.ToString("r", InvariantCulture)`で生成し、29文字形式と自己生成値との一致を確認します。任意HTTP-dateの全文法/暦を検証するコードではありません。日時とI/O期限の単調時計は別です。

今回の受信ではヘッダー135バイトの後の本文4バイトを持ち越し、残り5バイトを回収しました。回数や持越し量は固定assertしません。loopbackのため外部物理NIC経路・パケット・性能は未観測です。故意のtimeout/reset/不完全メッセージ送信、TLS、汎用HTTP機能、IPv6・他OS/runtime・Unityは未検証です。ソースと出力はASCII、入力・ファイルI/Oはありません。

解説: https://sny0.com/study/practice/network/http-message-observation.html
