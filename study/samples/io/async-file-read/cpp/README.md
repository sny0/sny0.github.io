# Windows/C++20で同期readとoverlapped readを比べる

自己所有の排他的一時directoryに`CREATE_NEW`で12bytesのfixtureを作り、別handleで同期readと`FILE_FLAG_OVERLAPPED`によるreadを行います。期待bytesは`41 42 00 0D 0A E3 81 82 10 20 FE FF`です。

Visual Studio 2022とCMake 3.20以降の例:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\async_file_read_observation.exe
```

要求ごとにゼロ初期化`OVERLAPPED`と新しいmanual-reset eventを使い、byte offsetを明示します。`ReadFile`の即時完了・pending・EOFを区別し、受理された要求は`GetOverlappedResult(TRUE)`で結果を回収します。この待ちはblockingです。未完了の可能性がある区間には、bufferに触れない非throwの短い整数計算だけを置きます。結果回収までbuffer・OVERLAPPED・event・file handleを保持します。

Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で各3回確認し、無警告・終了0・7 checksでした。今回の非同期12要求はすべてpendingで、EOFは結果回収側で通知されました。これは固定した期待比率ではありません。`eof_result`はGetOverlappedResultでEOFを受け取ったかを表し、submit側EOFでも正常に0bytesとして扱います。

5byte要求は短いreadを許して累積し、両方式で全bytes・EOF・長さ・結果一致を検査します。自己fixtureと空directoryだけを削除し、再帰削除はしません。ソースと出力はASCII、入力・ネットワーク・外部ライブラリは不要です。

速度・物理I/O・計算との実際の重なり・別thread実行は測定していません。キャンセル/故障注入、即時完了・submit側EOFの強制再現、他OS/コンパイラ・Unityは未検証です。

解説: https://sny0.com/study/practice/io/async-file-read-observation.html
