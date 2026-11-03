# C++20でUnicodeの単位を観察する

`A`、`U+3042`（あ）、`U+1F600`（😀）、`U+0065 U+0301`（eと結合アクセント）の既知literalをUTF-8・UTF-16・UTF-32で用意し、独立した期待配列と照合します。入力・ファイルI/O・外部ライブラリは不要です。ソースと出力はASCIIです。

Visual Studio 2022とCMake 3.20以降の例:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\unicode_observation.exe
```

Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Releaseで実行確認しました。MSVCでは`/W4 /WX /permissive- /EHsc /utf-8`を有効にし、警告なし、終了コード0、16 checksでした。他の処理系では未実行です。

`CHAR_BIT == 8`を前提とします。`.size()`はviewの要素数で、終端nullを含みません。UTF-8はbyte数、UTF-16は16-bit code unit数です。scalar数は既知の正しいUTF-32 literalから得ます。任意のUTF-8のdecode、入力検証、正規化、grapheme分割は実装していません。UTF-16 code unitの数値表示は、メモリの生byte列やLE/BE保存形式の表示とは異なります。

解説: https://sny0.com/study/practice/data/unicode-observation.html
