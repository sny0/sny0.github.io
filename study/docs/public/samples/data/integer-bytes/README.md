# 整数の値・object bytes・明示したbyte順を観察する

標準C++20のみを使います。CHAR_BIT == 8、固定幅のstd::uint32_t/std::int32_tが提供される環境を前提にし、コードで検査します。
配列を保存形式・通信形式のモデルに使い、ファイルI/Oやネットワーク、入力処理は行いません。外部ライブラリの取得もありません。

3ファイルを同じフォルダへ保存し、CMake 3.20以降とVisual Studio 2022のC++開発環境を使って、Developer PowerShellで実行します。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\integer_byte_observation.exe
$LASTEXITCODE
```

0x12345678のdecimal/hex/bitsと、memcpyでunsigned charへコピーしたnative object bytesを表示します。
明示したLE/BEのencode/decodeはnative順に依存させません。シフト前にuintmax_tへ広げ、符号付きoverflowや幅外のシフトは実行しません。
signed -1からuint32_tへの値変換と、signedオブジェクトのbytesの観察は別の操作です。

独立した期待配列で0、1、0x12345678、0x80000000、0xFFFFFFFFを調べ、roundtrip、逆順での解釈、flag操作も検査します。
nativeがlittle/big以外なら観察値を表示するだけにします。成功は終了0、検査失敗は1です。

2026-11-03: Windows x64（25H2、build 26200.9711）、MSVC 19.35.32217.1、Windows SDK 10.0.22000.0、
CMake 3.26.3、x64 Release・C++20・/W4 /WX /permissive- /EHsc /utf-8で無警告のビルドと実行を確認しました。
この環境はnative little-endianで、38検査に成功し終了0でした。他のOS・処理系、big/mixed-endian環境では実行確認していません。

記事: https://sny0.com/study/practice/data/integer-byte-observation.html
