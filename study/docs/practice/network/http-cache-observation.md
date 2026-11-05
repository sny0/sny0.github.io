---
title: C++とC#でETag・304・保存本文の再利用を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: network
  collection: http-cache-observation
  order: 1
  summary: loopbackのNodeサーバーへ4回の条件付きGETを送り、200の本文保存、ETagによる304、弱い比較とtag list、不一致時の200を明示的なクライアントモデルで観察する。
  aliases: [HTTPキャッシュ, ETag, If-None-Match, 304, no-cache, WinHTTP, HttpClient, 条件付きGET]
  verification: Windowsで両言語の実HTTP通信を実行確認（2026-11-05）
---

# C++とC#でETag・304・保存本文の再利用を観察する

同じPCのHTTPサーバーへ4回GETし、ETagで再検証します。304を受け取ったとき、受信本文は0バイトでも、クライアントが保存していた10バイトを使えることを比べます。仕組みと図は[HTTPキャッシュと再検証](/network/http-caching.html)を参照してください。

これは実際のHTTP条件付き要求と、自前のメモリ内キャッシュを組み合わせた教材です。ブラウザの自動キャッシュの挙動や、一般的なHTTPキャッシュの完全実装を検証する例ではありません。

## 入手してローカルで実行する

共通サーバー2ファイルと、使う言語の3ファイルを保存します。両言語を試す場合は計8ファイルです。

|フォルダ|配布ファイル|
|---|---|
|共通|<a href="/study/samples/network/http-cache-observation/server.cjs" download>server.cjs</a>、<a href="/study/samples/network/http-cache-observation/README.md" download>README.md</a>|
|cpp|<a href="/study/samples/network/http-cache-observation/cpp/main.cpp" download>main.cpp</a>、<a href="/study/samples/network/http-cache-observation/cpp/CMakeLists.txt" download>CMakeLists.txt</a>、<a href="/study/samples/network/http-cache-observation/cpp/README.md" download>README.md</a>|
|csharp|<a href="/study/samples/network/http-cache-observation/csharp/Program.cs" download>Program.cs</a>、<a href="/study/samples/network/http-cache-observation/csharp/HttpCacheObservation.csproj" download>HttpCacheObservation.csproj</a>、<a href="/study/samples/network/http-cache-observation/csharp/README.md" download>README.md</a>|

### サーバーを起動する

Node.jsを使い、共通フォルダで起動します。外部パッケージは不要です。

```powershell
node .\server.cjs
```

サーバーは`127.0.0.1:0`にだけbindし、OSが割り当てた`port=`とURLを表示します。固定portや外部hostは指定しません。`.cjs`はCommonJSを明示するため、親package.jsonのmodule設定によらず配布実体を実行できます。[Node公式：Packages](https://nodejs.org/api/packages.html)

サーバーのターミナルを開いたまま、表示されたportを別ターミナルのクライアントへ渡します。終了するときはCtrl+C、またはサーバーへ`stop`と入力します。受付を閉じ、残存接続は後片付け期限後に切断します。[Node公式：HTTP server](https://nodejs.org/api/http.html#class-httpserver)

### Windows / C++20

Visual Studio 2022のC++環境とCMake 3.20以降で、cppフォルダから実行します。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
$cachePort = 54321 # サーバーが表示したportへ置き換える
.\build\Release\http_cache_observation.exe $cachePort
```

### C# / .NET 10

csharpフォルダから実行します。追加NuGetパッケージはありません。

```powershell
$cachePort = 54321 # サーバーが表示したportへ置き換える
dotnet run --project HttpCacheObservation.csproj -c Release -- $cachePort
```

54321は説明用の値です。接続先は両言語とも常に`127.0.0.1`で、引数には1〜65535のport一つだけを受け取ります。proxy・redirect・Cookie・自動認証を使わず、外部通信やシステム設定の変更は行いません。

## 同じ本文で4回のGETを比べる

`/resource`の本文はUTF-8の`Cache あ\n`、次の10バイトです。クライアントは独立した期待バイト列と照合します。

```text
43 61 63 68 65 20 E3 81 82 0A
```

サーバーはETag `"study-v1"`と`Cache-Control: no-cache`を返します。no-cacheは保存禁止ではなく、保存応答を後で使う前に再検証を要求する指定です。このコードは本文とETagを変数へ保存します。[RFC 9111 §5.2.2.4：no-cache](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.4)

|回|If-None-Match|応答|クライアントが使う本文|
|---|---|---|---|
|1|送らない|200、本文10バイト|受信本文とETagを保存|
|2|保存した`"study-v1"`|304、本文0バイト|保存していた本文10バイトを再利用|
|3|`"other,tag", W/"study-v1"`|304、本文0バイト|同じ保存本文を再利用|
|4|`"study-old"`|200、本文10バイト|受信本文を使う|

2・3回目のvalidatorは、1回目に受け取ったETagを変数から組み立てます。304に本文を足したり、HTTPライブラリが自動的に200へ変換した結果を期待したりする構成ではありません。受信本文0バイトと、利用する保存本文10バイトを別々に検査・出力します。

3回目はlist内に弱いtagを含みます。If-None-Matchは弱い比較を使うため、このケースでは`W/"study-v1"`と`"study-v1"`が一致します。また`"other,tag"`のcommaは引用符内のtagデータで、listの区切りではありません。[RFC 9110 §13.1.2：If-None-Match](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2)

4回目は意図的に不一致のvalidatorを送る例です。サーバーの本文やETagを更新した再現ではありません。このサーバーでは4回を通して同じ本文・ETagを返します。

## サーバーの限定仕様

GETとHEADだけを受け付けます。200ではContent-Lengthを正しい本文長10にし、HEADではその長さを示した上で本文を送りません。304では本文とContent-Lengthを省略し、ETag・Cache-Control・現在のDateを返します。HTTP一般で304のContent-Lengthが常に禁止されるという意味ではなく、この教材の応答方針です。[RFC 9110 §15.4.5：304](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4.5)、[§8.6：Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.6)

If-None-Matchは単独`*`、または最大16個のentity-tagを文字単位で解析し、弱い比較を行います。OWSと引用符内のcommaを扱い、値は1024文字、HTTPヘッダー全体は4096バイトに制限します。空のlist要素や末尾commaは拒否する限定subsetです。要求本文、If-Match/日時validator、Range、Vary、Age、freshness計算等まで扱う完全なサーバー・キャッシュではありません。

## API・所有権・処理上限

C++は同期WinHTTPで、HINTERNETをRAIIで閉じます。WinHTTPはユーザーのブラウザキャッシュと共有する仕組みではありません。ここでの保存・再利用はクライアント自身の変数で行います。[Microsoft：About WinHTTP](https://learn.microsoft.com/en-us/windows/win32/winhttp/about-winhttp)

各phaseのtimeoutは最大8秒、単調時計による全体予算は30秒です。API呼出しの前後に予算を確認しますが、進行中の同期APIをその瞬間に必ず中断する厳密な実時間の終了保証ではありません。[Microsoft：WinHttpSetTimeouts](https://learn.microsoft.com/en-us/windows/win32/api/winhttp/nf-winhttp-winhttpsettimeouts)

C#はHttpClientでHTTP/1.1を指定し、ResponseHeadersRead後の本文読取りにも、4回を通して同じ30秒のCancellationTokenを渡します。ConnectTimeoutは8秒です。usingで要求・応答・stream・client等を解放します。こちらもブラウザの自動キャッシュを試す処理ではありません。[Microsoft：SendAsync](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.sendasync?view=net-10.0)、[UseProxy](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.socketshttphandler.useproxy?view=net-10.0)

両クライアントは各本文4KiBを上限にし、実際の読取り数を累積します。API失敗・取消し・検査不一致は終了1、引数不正は2です。Dateや割当port、処理時間を固定値として照合しません。サーバー側もheaders timeout 5秒、request/socket timeout 8秒を設け、停止時は新規受付を閉じて残存接続を片付けます。

## 実行して確認した範囲

2026-11-05にWindows x64で、配布するサーバーと両言語のクライアントを実行しました。各言語3回、各回4GETの計24GETが終了0になり、次の検査をすべて通過しました。portとDateは実行時の値です。

```text
step=1 status=200 received_body_bytes=10 etag="study-v1" reuse_saved_body=false effective_body_bytes=10
step=2 status=304 received_body_bytes=0 etag="study-v1" reuse_saved_body=true effective_body_bytes=10
step=3 status=304 received_body_bytes=0 etag="study-v1" reuse_saved_body=true effective_body_bytes=10
step=4 status=200 received_body_bytes=10 etag="study-v1" reuse_saved_body=false effective_body_bytes=10
observations=4 result=passed
caller_scope=finished
```

|確認したこと|今回の結果|
|---|---|
|200と304、本文の使い分け|受信本文10・0・0・10バイトに対し、利用本文は各回10バイト。ETagとno-cacheも一致した|
|独立したHTTP確認|別の検証用TCPクライアントで17条件を実送信。strong／weak／quoted commaを含むlist／単独`*`／OWSの照合、大文字小文字の異なるタグの不一致、HEAD、限定parserの拒否、404・405を確認した|
|304の実際の応答byte列|ヘッダー終端後の本文は0バイトで、配布サーバーはContent-Lengthを送っていなかった。HEADの200はContent-Length 10・本文0バイトだった|
|HTTP構文エラー|NodeのclientError経路の400にもDateがあり、本文は0バイトだった|
|引数と接続失敗|両言語それぞれ5種類の引数不正が終了2。サーバー停止後の接続は両言語とも終了1だった|
|サーバーの後片付け|標準入力のstopで受付を閉じ、server_closedを出力して終了0になった|

C++はMSVC 19.35.32217.1、Windows SDK 10.0.22000.0、CMake 3.26.3のx64 Release／C++20で、`/W4 /WX /permissive- /EHsc /utf-8`を使用し警告0でした。C#は既存の.NET SDK 10.0.403によるnet10.0 Release、warnings as errorsで警告0・エラー0でした。Node.jsは20.19.1で、server.cjsの構文確認も通しています。追加パッケージやSDKのインストールは行っていません。

これは実際のループバックHTTPと、その応答byte列を確認した結果です。ブラウザの自動キャッシュ、CDN、fresh hit、Age・Vary・partitionの処理、内容更新、304の一般的なメタデータ統合、日時validator、TLS、外部NIC上のパケット、他OS・コンパイラは未検証です。本文上限超過やtimeoutの故意注入、OSの全ハンドル数や使用メモリ量も測っていません。通常のstopは実測し、未完了接続を残したままの強制終了はコードレビューの範囲です。

## ソース全体

### 共通Nodeサーバー

<<< @/public/samples/network/http-cache-observation/server.cjs{js}

### C++ / WinHTTP

<<< @/public/samples/network/http-cache-observation/cpp/main.cpp{cpp}

### C# / HttpClient

<<< @/public/samples/network/http-cache-observation/csharp/Program.cs{csharp}
