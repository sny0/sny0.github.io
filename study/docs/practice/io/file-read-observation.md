---
title: C++とC#でファイルのbytes・位置・EOFを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: file-read-observation
  order: 1
  verification: Windowsで両言語を実行確認
  summary: 12bytesの一時fixtureを5byte bufferで読み、要求と実読取数・offset・EOF・seek後の再読・missing fileの失敗を比較する。
  aliases: [FileStream, ReadFile, CreateFileW, SetFilePointerEx, GetFileSizeEx, EOF, seek, offset, ファイルI/O, バッファ, OSキャッシュ]
---

# C++とC#でファイルのbytes・位置・EOFを観察する

readで要求した量と実際に読み取れた量を分けて表示します。自分で作った12バイトの通常ファイルを5バイトのバッファで読みます。EOFを確認し、オフセット5へseekして3バイトを読み直します。内部経路の概念と図は[ファイルを読むと内部で何が起きるか](/os/file-read-journey.html)を参照してください。

fixtureは`41 42 00 0D 0A E3 81 82 10 20 FE FF`です。`AB`、NUL、CRLF、あのUTF-8 bytes、追加のraw bytesを含みます。全体をUTF-8文字列としてdecodeせず、NULや改行もbytesのまま比較します。[Unicodeの単位を観察する](/practice/data/unicode-observation.html)との違いにも注目してください。

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。入力・ネットワーク処理・外部ライブラリは使いません。ソースとconsole出力はASCIIです。

### Windows / C++20

- <a href="/study/samples/io/file-read/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/io/file-read/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/io/file-read/cpp/README.md" download>README.md</a>

Visual Studio 2022とCMake 3.20以降の例です。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\file_read_observation.exe
```

`CreateFileW`で同期read用handleを開き、`ReadFile`の戻り値と実読取数を分けて検査します。`SetFilePointerEx`で位置を取得・変更し、`GetFileSizeEx`で長さを調べます。handleはRAIIで閉じます。[Microsoft：ReadFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)、[SetFilePointerEx](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfilepointerex)、[GetFileSizeEx](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfilesizeex)

### C# / .NET 10

- <a href="/study/samples/io/file-read/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/io/file-read/csharp/FileReadObservation.csproj" download>FileReadObservation.csproj</a>
- <a href="/study/samples/io/file-read/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project FileReadObservation.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。同期`FileStream.Read(Span<byte>)`の戻り値を実読取数として扱い、`Position`・`Length`・`Seek`を観察します。streamは`using`で閉じます。readは要求より少ないbytesを返す場合があるため、必要分がそろうまで累積します。[Microsoft：FileStream.Read](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.read?view=net-10.0)、[Position](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.position?view=net-10.0)

## 今回のログを読む

両言語を各3回実行し、readとseekの観察行は次の結果でした。これは一実行環境での結果で、read回数・chunkの分け方を固定した保証ではありません。

```text
read requested=5 actual=5 position=0->5 hex=41 42 00 0D 0A
read requested=5 actual=5 position=5->10 hex=E3 81 82 10 20
read requested=5 actual=2 position=10->12 hex=FE FF
read requested=5 actual=0 position=12->12 hex=(empty)
seek offset=5
seek_read requested=3 actual=3 position=5->8 hex=E3 81 82
after_seek file_length=12 position=8 reread_bytes=3
```

`actual`分だけbufferを使います。EOFでは今回の同期通常ファイルreadは0bytesで完了し、位置は12のままです。これは失敗とは区別します。C++ではAPI失敗時に`GetLastError`、C#では例外を扱います。[Microsoft：EOFの検査](https://learn.microsoft.com/en-us/windows/win32/fileio/testing-for-the-end-of-a-file)

seekの5は**byte offset**です。再読後の位置は8ですが、ファイル長は12のままです。3bytesの`E3 81 82`をそろえる再読でも、一度に要求分が来なければ残りを読みます。missing fileのopenは、C++で`ERROR_FILE_NOT_FOUND`（2）、C#で`FileNotFoundException`となりました。

## buffer・OSキャッシュ・保存装置を分ける

|層|このサンプルで分かること|
|---|---|
|アプリ側buffer|5byteの領域へ渡された実bytesと件数|
|C#のFileStream内部buffer|bufferSizeを4096に設定。内部の補充回数は測っていない|
|OSのfile cache|通常のキャッシュを許すopen。hit/miss・OS内部の転送量は測っていない|
|SSD/HDD等|物理I/Oの発生・回数・速度は分からない|

FileStreamの内部bufferとOSキャッシュは別です。`Position`はstreamの論理位置であり、内部bufferを使う場合のOS側位置と同じとは限りません。アプリのread呼出数をsystem call数や物理I/O回数へ置き換えることもできません。[Microsoft：FileStreamのBufferSize](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestreamoptions.buffersize?view=net-10.0)、[.NET公式実装：buffered streamのPosition](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/IO/Strategies/BufferedFileStreamStrategy.cs)

Windowsは通常、file dataにsystem file cacheを使います。この例はfixtureを書いた直後に読み、OSキャッシュを無効化する設定や物理I/Oのtraceを行っていません。電源断後の永続性やcold-cache性能も確認しません。[Microsoft：File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching)

## 一時ファイルと確認範囲

C++はwide pathで一時directoryを排他的に作り、fixtureを`CREATE_NEW`で作ります。C#は`Directory.CreateTempSubdirectory`と`FileMode.CreateNew`を使います。削除は自分が作成に成功したfixtureと空のdirectoryだけで、再帰削除や既存fileの上書きはしません。[Microsoft：CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)、[CreateTempSubdirectory](https://learn.microsoft.com/en-us/dotnet/api/system.io.directory.createtempsubdirectory?view=net-10.0)、[FileMode.CreateNew](https://learn.microsoft.com/en-us/dotnet/api/system.io.filemode?view=net-10.0)

2026-11-04、Windows x64（25H2、build 26200.9711）で確認しました。両言語各3回、すべて終了0・**8 checks成功・cleanup完了**でした。8項目は長さ・初期位置・全bytes・EOF・seek位置・再読bytesと位置・長さ不変・missing fileの失敗です。fixtureの作成用配列とは別に、期待bytesをhex配列で指定しています。

|版|条件|build結果|
|---|---|---|
|C++|MSVC 19.35.32217.1、CMake 3.26.3、x64 Release、C++20、`/W4 /WX /permissive- /EHsc /utf-8`|警告なし|
|C#|.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errors|警告0・エラー0|

他OS・他コンパイラ・他runtime・Unity、pipe/socket等、非同期I/O、性能・物理I/O・永続性は未検証です。短いreadを許す実装ですが、今回の小さな通常ファイルであらゆる短いreadやI/O失敗を再現したわけではありません。

## 実装

### Windows / C++20

<<< @/public/samples/io/file-read/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/io/file-read/csharp/Program.cs{csharp}
