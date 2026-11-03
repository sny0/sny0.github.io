# floatの表現間隔と丸めを観察する

標準C++20の機能を使います。CHAR_BIT==8、uint32_tの提供、4byteのIEC 60559 binary32相当のfloatをコードで確認します。
bit_castしたwordからのフィールド抽出は、今回のMSVC x64で確認したfloat/uint32配置を前提にします。
既知値のwordが合わない環境は、このdecoderの対象外として停止します。
OS API・管理者権限・入力・ファイルI/O・外部依存の取得は使いません。

3ファイルを同じフォルダへ保存し、CMake 3.20以降とVisual Studio 2022のC++開発環境を使います。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\float_spacing_observation.exe
$LASTEXITCODE
```

CMakeはMSVCに /fp:strict を指定します。FE_TONEARESTを設定・確認し、浮動小数点環境はRAIIで復元します。
0.1fのdecimal/hexfloat/bit fields、-0・subnormal・Inf・quiet NaN、nextafterによる上下の間隔、
volatile operandからの2^24+1/+2/+3を表示・検査します。epsilonを全スケール共通の許容誤差にはしません。
0.1f+0.2fと0.3fの不一致は期待条件にせず、InfやNaNを作るためのゼロ除算・overflowも実行しません。

Clang向け -ffp-model=strict、GCC向け -fno-fast-math -frounding-math -ffp-contract=off もCMakeに記していますが未実行です。
GCCの -frounding-math は実験的とされ、全最適化への保証ではありません。実行確認範囲は記事に記します。
正常終了は0、前提や検査、環境操作の失敗は1です。

2026-11-03: Windows x64（25H2、build 26200.9711）、MSVC 19.35.32217.1、Windows SDK 10.0.22000.0、
CMake 3.26.3、x64 Release・C++20・/W4 /WX /permissive- /EHsc /utf-8 /fp:strictで無警告のビルド・実行を確認しました。
FE_TONEAREST、既知word・分類・表現間隔・丸め・環境復元の34検査に成功し、終了0でした。
他OS・他処理系・big-endian・別のfloat/uint配置・fast-math設定は未実行です。

記事: https://sny0.com/study/practice/data/float-spacing-observation.html
