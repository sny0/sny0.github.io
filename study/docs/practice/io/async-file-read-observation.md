---
title: C++とC#で非同期readの開始・完了・寿命を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: async-file-read-observation
  order: 1
  verification: Windowsで両言語を実行確認
  summary: 同じ12bytesを同期readと非同期readで読み比べ、即時完了・pending・EOF・ValueTaskの状態と、結果回収まで保つbufferの寿命を観察する。
  aliases: [非同期I/O, overlapped, OVERLAPPED, ReadFile, GetOverlappedResult, ReadAsync, ValueTask, await, EOF, キャンセル]
---

# C++とC#で非同期readの開始・完了・寿命を観察する

要求を開始する時点と、結果を使える時点を分けて観察します。自分で用意した12バイトのテストファイルを、同期読み取りと非同期読み取りで別々のhandle / streamから開きます。読み取った全バイトとEOFが一致するか確認します。内部経路と図は[非同期ファイルI/O](/os/asynchronous-file-io.html)、読み取り量と位置の基礎は[同期readの観察](/practice/io/file-read-observation.html)を参照してください。

fixtureは`41 42 00 0D 0A E3 81 82 10 20 FE FF`、read要求は5bytesです。文字列decodeはせず、短いreadも累積します。一度に出す要求は1件で、複数要求を並列に処理する例ではありません。

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。ソースと出力はASCIIです。入力・ネットワーク処理・外部ライブラリは使いません。

### Windows / C++20

- <a href="/study/samples/io/async-file-read/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/io/async-file-read/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/io/async-file-read/cpp/README.md" download>README.md</a>

Visual Studio 2022とCMake 3.20以降の例です。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\async_file_read_observation.exe
```

### C# / .NET 10

- <a href="/study/samples/io/async-file-read/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/io/async-file-read/csharp/AsyncFileReadObservation.csproj" download>AsyncFileReadObservation.csproj</a>
- <a href="/study/samples/io/async-file-read/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project AsyncFileReadObservation.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。両版とも自分の一時directoryと新規fixtureを排他的に作り、handle / streamを閉じてから自己fixture・空directoryだけを削除します。再帰削除や既存fileの上書きはしません。

## C++の要求と完了回収

非同期用handleには`FILE_FLAG_OVERLAPPED`を指定します。要求ごとにゼロ初期化した`OVERLAPPED`、専用のmanual-reset event、明示したbyte offsetを使います。ログの`submit`は次を表します。

|submit|ReadFileの結果|扱い|
|---|---|---|
|`immediate`|TRUE|即時完了。GetOverlappedResultで実読取数を取得|
|`pending`|FALSE + ERROR_IO_PENDING|失敗ではなく進行中。結果回収まで領域を保持|
|`eof`|FALSE + ERROR_HANDLE_EOF|submit時点の正常EOFとして0bytesへ正規化|

それ以外の失敗はエラーとして終了します。受理した要求は`GetOverlappedResult(..., TRUE)`で結果を回収します。**この呼出しは必要なら呼出threadをblockして待ちます。** 結果回収側の`ERROR_HANDLE_EOF`も正常EOFとして0bytesへ正規化します。`eof_result`は「GetOverlappedResultでEOFを受け取ったか」だけを表し、`submit=eof`ならfalseでも正常EOFです。[Microsoft：ReadFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)、[GetOverlappedResult](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getoverlappedresult)

submitから回収までに行う別作業は、bufferに触れない非throwの短い整数計算だけです。その間にログ・検査・例外生成・領域再利用を挟みません。buffer・OVERLAPPED・event・file handleは回収まで存続し、eventは外部へ渡したり手動signalしたりしません。結果回収後にchecksumを`offset + 2080`と照合し、初めてbytesを使います。[Microsoft：OVERLAPPEDとmanual-reset event](https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-overlapped)

## C#のValueTaskとawait

非同期用streamは`FileOptions.Asynchronous`で開き、`ReadAsync(Memory<byte>)`が返す`ValueTask<int>`を**一度だけawait**します。`IsCompleted`を観察した後、短い整数計算を行い、await後にbytesと`Position`を使います。arrayとstreamは完了まで保持し、未完了要求と同じbufferの再利用や同じstreamの別操作を重ねません。[Microsoft：FileStream.ReadAsync](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.readasync?view=net-10.0)、[ValueTaskの利用制約](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1?view=net-10.0)

`completed_at_check`は**ReadAsync返却後にIsCompletedを調べた時点**の状態です。返却から確認までの間に完了する場合もあるため、「返却した厳密な瞬間に完了していた」とは言えません。同期baselineは同期`Read`を呼び、ValueTaskの状態を観察しないので`n/a`を表示します。共通メソッド名は`ReadAllAsync`ですが、`useAsync:false`の分岐はawaitせず同期readを終えます。`async`キーワードだけで内部の同期APIが非同期化されるわけではありません。

これは`ConfigureAwait(false)`を使うconsole例です。await後に元のthreadやUnityのmain threadへ戻る保証としては扱いません。[Microsoft：ValueTask.ConfigureAwait](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1.configureawait?view=net-10.0)

C#版のoffsetはstreamの論理位置と照合します。C++非同期版のoffsetは`OVERLAPPED`へ明示したbyte位置です。C++のevent待ちをC# FileStreamの内部実装そのものとみなすことはできません。Windows.NETのbackendやIOCPとの関係は[非同期I/O本文](/os/asynchronous-file-io.html)で扱います。

## 今回の観察結果

同期・非同期とも、今回の各runでは実読取数が`5 → 5 → 2 → 0`となり、12bytesが一致しました。要求回数や完了状態の比率は固定assertしていません。

|観察項目|C++|C#|
|---|---|---|
|非同期3runの計12要求|すべて`submit=pending`|すべて`completed_at_check=true`|
|EOF|今回は結果回収側でERROR_HANDLE_EOF|awaitの結果が0bytes|
|別作業の検査|各要求でchecksum = offset + 2080|同左|
|全bytes|同期12・非同期12で一致|同左|

C++のログから、非同期読み取りの先頭とEOF、および最終結果を抜粋します。

```text
async offset=0 requested=5 actual=5 submit=pending eof_result=false checksum=2080 hex=41 42 00 0D 0A
async offset=12 requested=5 actual=0 submit=pending eof_result=true checksum=2092 hex=(empty)
sync_bytes=12 async_bytes=12 match=true
cleanup=complete PASS: 7 checks
```

C#の同じ箇所の抜粋です。途中の読み取り行は省略しています。

```text
async offset=0 requested=5 actual=5 completed_at_check=true checksum=2080 hex=41 42 00 0D 0A
async offset=12 requested=5 actual=0 completed_at_check=true checksum=2092 hex=(empty)
sync_bytes=12 async_bytes=12 match=true
cleanup=complete PASS: 7 checks
```

これらは異なるAPI層での観察で、速度の優劣や物理I/Oの違いは示しません。`IsCompleted`がtrueでも正しく扱い、falseを強制するための`Task.Run`や`Sleep`は使いません。短い計算とI/Oが実際に重なった時間や、別threadで処理されたかも測っていません。非同期handleでも呼出しが常にすぐ戻るとは限りません。[Microsoft：同期・非同期I/Oの注意点](https://learn.microsoft.com/en-us/windows/win32/fileio/synchronous-and-asynchronous-i-o)

## キャンセルしても寿命の契約は残る

このサンプルはキャンセルを実行しません。拡張する場合、キャンセル要求だけでbuffer等を解放・再利用せず、成功・取消・失敗の完了結果を回収します。Win32の`CancelIoEx`は取消完了を待たず、競合により通常完了する場合もあります。C#でtokenを渡した場合も、awaitで結果または取消例外を受け取るまで要求の寿命を守ります。[Microsoft：CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex)、[ReadAsyncのCancellationToken](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.readasync?view=net-10.0)

## 実行確認の範囲

2026-11-04、Windows x64（25H2、build 26200.9711）で各3回、すべて終了0・**7 checks成功・cleanup完了**でした。7項目は両方式それぞれの長さ・全bytes・EOF/終端位置の3項目ずつと、両結果の一致です。checksumやread範囲も各要求で検査します。

|版|条件|build結果|
|---|---|---|
|C++|MSVC 19.35.32217.1、CMake 3.26.3、x64 Release、C++20、`/W4 /WX /permissive- /EHsc /utf-8`|警告なし|
|C#|.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errors|警告0・エラー0|

OSキャッシュを許す小さな通常ファイルです。FileStreamのbufferSize設定は4096bytesで、内部bufferやOSキャッシュのhit/miss、system call数、物理I/O、性能・永続性は観測していません。他OS・他コンパイラ・他runtime・Unity、キャンセル/故障注入、C++の即時完了・submit側EOFとC#未完了状態の強制再現は未実施です。

## 実装

### Windows / C++20

<<< @/public/samples/io/async-file-read/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/io/async-file-read/csharp/Program.cs{csharp}
