# Windows/C++20でファイルのbytes・位置・EOFを観察する

自己所有の一時フォルダに12bytesのfixtureを排他的に作り、Win32の`CreateFileW`・`ReadFile`・`SetFilePointerEx`・`GetFileSizeEx`で観察します。fixtureは`41 42 00 0D 0A E3 81 82 10 20 FE FF`です。文字列decodeや改行変換は行いません。

Visual Studio 2022とCMake 3.20以降の例:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\file_read_observation.exe
```

Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で実行確認しました。3回とも無警告、終了0、8 checksでした。

5byte要求の実読取数と位置を表示し、EOFの0、offset5へseekした後の3bytes、missing fileの失敗を検査します。今回のread列は5→5→2→0ですが、回数を固定したassertはせず、短いreadでも累積bytesを検査します。

wide pathを使い、fixtureは`CREATE_NEW`で作成します。handleはRAIIで閉じ、削除するのは自分が作成に成功したfixtureと空の一時フォルダだけです。再帰削除や既存fileの上書きはしません。入力・ネットワーク処理はなく、ソースと出力はASCIIです。

アプリのバッファとfile位置の観察です。OSキャッシュのhit/miss、保存装置への物理I/O、性能や永続性は測定しません。他OS・他コンパイラ・Unityは未検証です。

解説: https://sny0.com/study/practice/io/file-read-observation.html
