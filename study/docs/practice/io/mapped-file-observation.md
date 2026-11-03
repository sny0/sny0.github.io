---
title: C++とC#で読取り専用ファイルマッピングを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: mapped-file-observation
  order: 1
  summary: 同じ8byteを通常のreadと読取り専用ビューで照合する。Windowsの割当粒度、Win32のビュー内位置、.NETのアクセサー内位置とPointerOffset、解除前に参照利用を終える所有関係を観察する。
  aliases: [メモリマップドファイル, memory-mapped file, MapViewOfFile, CreateFileMapping, MemoryMappedFile, CreateViewAccessor, PointerOffset, readonly map]
  verification: Windowsで両言語を実行確認
---

# C++とC#で読取り専用ファイルマッピングを観察する

**同じファイルの同じ範囲を、通常のreadと読取り専用マッピングで読み比べます。** 内容と位置の関係を確かめる実践です。内部の仕組みと図は[メモリマップドファイル](/os/memory-mapped-files.html)を参照してください。

対象はWindows、C++20／MSVCとC#／.NET 10のコンソールアプリです。Unityや他OSでの実行は確認していません。故意の範囲外アクセス、ファイルの変更、キャッシュの消去、速度比較は行いません。

## 入手して実行する

各言語の3ファイルをそれぞれ同じフォルダへ保存します。外部パッケージやユーザー指定の入力ファイルは使いません。

### Windows / C++20 / MSVC

- <a href="/study/samples/io/mapped-file/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/io/mapped-file/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/io/mapped-file/cpp/README.md" download>README.md</a>

Visual Studio 2022とCMake 3.20以降の例です。映像やウィンドウは表示しません。例外処理の小さな補助関数でMSVCのSEHを使うため、このCMake設定はWindows／MSVCを対象にしています。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\mapped_file_observation.exe
```

### Windows / C# / .NET 10

- <a href="/study/samples/io/mapped-file/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/io/mapped-file/csharp/MappedFileObservation.csproj" download>MappedFileObservation.csproj</a>
- <a href="/study/samples/io/mapped-file/csharp/README.md" download>README.md</a>

```powershell
dotnet build -c Release
dotnet run -c Release --no-build
```

## 固定ファイルと、読む位置

実行時に`GetSystemInfo`で割当粒度`G`とページサイズを取得します。教材用のファイルは`G + 32`byteで、先頭から`G + 5`の位置に次の8byteを置き、その他は0で埋めて書きます。

```text
41 42 00 0D 0A E3 81 82
```

既存のユーザーファイルへ書き込みません。両言語とも一時ディレクトリをWin32の`CreateDirectoryW`で排他的に作り、その中へ`CREATE_NEW`／`FileMode.CreateNew`でfixtureを新規作成します。処理後に、所有するファイルと空のディレクトリだけを非再帰で削除します。マッピング中は読取り専用で開き、別の処理から変更する例は含みません。

`00`はNUL、`0D 0A`はCR/LFのバイト値ですが、この実践では文字列へのデコードをしません。8byteは終端文字列ではなく、長さが決まったバイナリ範囲です。

## C++で見る値

通常版は`SetFilePointerEx`で`G + 5`へ移動し、`ReadFile`を必要な8byteが揃うまで繰り返します。マッピング版は次を計算します。

```text
目的のファイルオフセット = G + 5
マップ開始               = G
ビュー内の差分 delta     = 5
要求ビュー長             = 5 + 8 = 13
読む範囲                 = view[5] 〜 view[12]
```

`PAGE_READONLY`のマッピングオブジェクトから、`FILE_MAP_READ`のビューを作ります。ビューが生きている間に8byteを配列へコピーし、ビューのポインタを外へ返しません。RAIIによって、ビュー解除、マッピングハンドル、ファイルハンドルの順に後片付けします。[Microsoft: MapViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile)

アクセス時のI/O例外を、C++の一般的な例外と混同しないため、コピーだけを小さなSEH関数に置いています。対象範囲内の`EXCEPTION_IN_PAGE_ERROR`のみを識別し、他の例外は捕まえません。この分岐は実際の故障を起こして検証しておらず、範囲外アクセスを正常動作に変えるためのものでもありません。[Microsoft: Reading and Writing From a File View](https://learn.microsoft.com/en-us/windows/win32/memory/reading-and-writing-from-a-file-view)

## C#で見る値

通常版は`FileStream.Position = G + 5`として、8byteが揃うまで同期`Read`します。マッピング版は`CreateViewAccessor(G + 5, 8, MemoryMappedFileAccess.Read)`を作り、`ReadArray`の位置0から読みます。

**アクセサーの位置0は、要求した範囲の先頭です。** Win32例の`delta = 5`をここへ足しません。今回のWindows／.NET実装では、内部のネイティブビューと要求先頭の差を表す`PointerOffset`が5でした。ファイルオフセット`G + 5`とも、アクセサーの位置0とも別の値です。内部で整列する経路は[固定版.NET v10.0.0の実装](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.IO.MemoryMappedFiles/src/System/IO/MemoryMappedFiles/MemoryMappedView.Windows.cs)を参照してください。他OSでも同じ差になるという説明ではありません。

`ReadArray`は`byte[]`へコピーします。この例はコピーをなくす実験ではありません。`using`の終了でアクセサー、マッピング、元のストリームを破棄し、外へ渡すのはコピーした配列だけです。[Microsoft: ReadArray](https://learn.microsoft.com/en-us/dotnet/api/system.io.unmanagedmemoryaccessor.readarray?view=net-10.0)

## 確認できた出力

Windows x64の今回の実測では、ページサイズ4096、割当粒度65536でした。どちらもコード内の前提定数ではありません。

```text
page_size=4096 allocation_granularity=65536
file_length=65568 target_file_offset=65541 requested_bytes=8
```

C++は次の値を出しました。

```text
map_base_file_offset=65536 delta=5 requested_view_bytes=13
ordinary= 41 42 00 0D 0A E3 81 82
mapped= 41 42 00 0D 0A E3 81 82
pointer_escaped=false mapped_access_error_observed=false
cleanup=complete checks=5 PASS
```

C#は次の値を出しました。

```text
accessor_file_offset=65541 accessor_position=0 capacity=8 pointer_offset=5
ordinary= 41 42 00 0D 0A E3 81 82
mapped= 41 42 00 0D 0A E3 81 82
pointer_escaped=false mapped_access_error_observed=false
cleanup=complete checks=6 PASS
```

確認項目は、ファイル長、通常readの内容、ビューの位置や容量、マッピングの内容、両方式の一致です。C#では`PointerOffset`の観察も一項目にしています。最後の`cleanup=complete`は、ビューやハンドルの所有スコープを終え、一時ファイルと空ディレクトリの削除が失敗しなかったことを示します。常駐量が減ったことや、OS内のキャッシュまで消えたことは示しません。

## 実測条件と限界

2026-11-04に、C++はMSVC 19.35.32217.1／Windows SDK 10.0.22000.0／x64 Release／C++20／`/W4 /WX`、C#は.NET SDK 10.0.403／ランタイム10.0.14／Release／警告をエラー扱いにして、各3回実行しました。全回で終了コード0、上記のchecksが成功し、所有fixtureのディレクトリ残存は0でした。

ファイルは直前に作成し、通常のreadを先に行っています。**この実行で物理ストレージI/Oやページフォルトを測定してはいません。** `mapped_access_error_observed=false`も、このアクセスで例外が出なかったというログであり、ページフォルトが0回だったという意味ではありません。高速化、I/Oと計算の重なり、全ファイルの常駐を結論できません。

共有書込み、COW、切詰め、flush、停電やデバイス故障は対象外です。マッピングをゲームのロード工程へ組み込む場合は、[アセットロード設計](/game/asset-loading.html)でbyteの取得後に残る処理と所有権を分けます。

## 実装

### Windows / C++20

<<< @/public/samples/io/mapped-file/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/io/mapped-file/csharp/Program.cs{csharp}
