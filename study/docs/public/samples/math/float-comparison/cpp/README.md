# C++20でfloatの近似比較を観察する

binary32の`float`入力を先にbinary64の`double`へ広げ、次の条件を調べる教材です。

```text
abs(double(a) - double(b)) <= max(absTol, relTol * max(abs(double(a)), abs(double(b))))
```

先にtoleranceを検査します。`absTol`は有限かつ0以上、`relTol`は有限かつ0以上1未満です。不正なら例外、NaNを含めばfalse、`a == b`ならtrue（±0と同符号のInfを含む）、残る非有限値はfalseとします。この範囲と順序は教材のpolicyです。

Visual Studio 2022とCMake 3.20以降の例:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\float_comparison_observation.exe
```

Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8 /fp:strict`で実行確認しました。警告なし、終了0、31 checksです。実行時にFE_TONEARESTを設定し、元の浮動小数点環境をRAIIで復元します。CMakeに記したClang/GCC設定や他OSでは未実行です。

binary32/binary64相当の`numeric_limits`とサイズをcompile時に確認します。ソースと出力はASCII、入力・ファイルI/O・外部依存はありません。二進分数の境界例、NaN/Inf、不正tol、非推移性、2^24付近で既に失われた差を検証します。通常の`double`全域用関数、sort/key用の同値関係、用途共通のtoleranceではありません。

解説: https://sny0.com/study/practice/math/float-comparison-observation.html
