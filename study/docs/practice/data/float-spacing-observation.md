---
title: C++20でfloatの表現間隔と丸めを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: data
  collection: float-observation
  order: 1
  verification: Windows x64で実行確認
  summary: binary32相当のfloatをbit_castとnextafterで観察し、値の大きさによる表現間隔、境界の上下差、2^24付近のnearest-evenを調べるC++20サンプル。
  aliases: [float, binary32, nextafter, epsilon, FE_TONEAREST, bit_cast, 浮動小数点, 丸め, ULP, NaN]
---

# C++20でfloatの表現間隔と丸めを観察する

`0.1f`の表示、`float`の隣の値、`2^24`付近の加算を小さなプログラムで調べます。考え方は[浮動小数点と表現間隔](/data/floating-point-spacing.html)、整数とbyte順の違いは[整数・byteの観察サンプル](/practice/data/integer-byte-observation.html)へつながります。

標準C++20のヘッダーと関数に加えて、浮動小数点環境に対応するコンパイラ設定も必要です。このサンプルでは`CHAR_BIT==8`、`uint32_t`の提供、`sizeof(float)==4`、`is_iec559`、基数2・精度24bit・指数範囲などをコンパイル時に確認します。

## 入手して実行する

次の3ファイルを同じフォルダへ保存し、CMake 3.20以降とVisual Studio 2022のC++開発環境を使います。OS API・管理者権限・入力・ファイルI/O・外部依存の取得は使いません。

- <a href="/study/samples/data/float-spacing/main.cpp" download>main.cpp</a>
- <a href="/study/samples/data/float-spacing/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/data/float-spacing/README.md" download>README.md</a>

Developer PowerShellで実行します。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\float_spacing_observation.exe
$LASTEXITCODE
```

CMakeはMSVCに**`/fp:strict`**を指定します。この指定では`fenv_access`も有効になり、実行時の丸め環境を扱えます。プログラムは`FE_TONEAREST`を設定・確認し、終了時にはRAIIで保存した浮動小数点環境を復元します。[MSVCの/fp設定](https://learn.microsoft.com/en-us/cpp/build/reference/fp-specify-floating-point-behavior?view=msvc-170)、[fenv_access](https://learn.microsoft.com/en-us/cpp/preprocessor/fenv-access?view=msvc-170)

成功は終了0、前提・検査・環境操作の失敗は1です。Clang向け`-ffp-model=strict`、GCC向け`-fno-fast-math -frounding-math -ffp-contract=off`もCMakeに記していますが、今回は未実行です。GCCは`-frounding-math`を実験的としており、全最適化への保証ではありません。[Clangの浮動小数点設定](https://clang.llvm.org/docs/UsersManual.html#controlling-floating-point-behavior)、[GCCの最適化設定](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html#index-frounding-math)

## 0.1fの表示とbit fields

今回のMSVC x64で、`0.1f`は次のように表示されました。

```text
0.1f decimal=0.100000001 hexfloat=0x1.99999a0000000p-4
raw=0x3DCCCCCD sign=0 E=123 fraction=0x4CCCCD class=normal
```

decimalは`max_digits10`（今回は9桁）で表示しています。これは異なるfloat値を区別するための桁数で、保存値の正確な十進展開をすべて書いたものではありません。`hexfloat`は`printf`の`%a`で表示しています。[公開作業草案：numeric_limits](https://eel.is/c++draft/numeric.limits.members)

`raw`は`std::bit_cast<std::uint32_t>`の結果です。`sign`は符号、`E`は保存された8bitの指数、`fraction`は保存された23bitの部分を示します。**このフィールド抽出は、今回確認したMSVC x64のbinary32/uint32配置を前提とした観察です。** 標準C++がすべてのfloatと整数の相対配置を保証するという意味ではありません。既知値のwordが合わなければ、このdecoderの対象外として停止します。[MSVCのIEEE表現](https://learn.microsoft.com/en-us/cpp/build/ieee-floating-point-representation?view=msvc-170)、[公開作業草案：bit_cast](https://eel.is/c++draft/bit.cast)

1.0、1.5、2.0、-0、最小正subnormal、Infも表示します。-0は0と等しく比較されても符号を持ち、NaNは`std::isnan`で調べます。Infとquiet NaNは`numeric_limits`から得ており、ゼロ除算やoverflowで作りません。NaNの符号・payloadは表示するだけで固定期待値にしません。

## 隣の値までの間隔

`std::nextafter(x, +Inf)`で上側、`std::nextafter(x, -Inf)`で下側の隣を求めます。両引数はfloatです。[nextafterの仕様](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/nextafter-functions?view=msvc-170)

今回の間隔は次のとおりでした。差はdoubleへ広げてから計算しています。

| x | 下の隣からxまで | xから上の隣まで |
| ---: | ---: | ---: |
| 1 | `2^-24` | `2^-23` |
| 2 | `2^-23` | `2^-22` |
| 65536 | 0.00390625 | 0.0078125 |
| 100000 | 0.0078125 | 0.0078125 |
| 16777216（`2^24`） | 1 | 2 |

1、2、65536、`2^24`のような境界では、下と上の間隔が異なります。100000では両側とも1/128でした。`epsilon`は1の直上との差で、今回の値は約`1.1920929e-7`です。**ほかの大きさの値まで共通に使える許容誤差ではありません。** この実験は、既知のbinary32上で正確に表せる2の冪を期待値にして差を検査しています。[公開作業草案：epsilonの定義](https://eel.is/c++draft/numeric.limits.members)

## 2^24に1を足す

定数式だけで結果を出さないよう、`volatile`のoperandから実行時に加算します。今回の`FE_TONEAREST`での結果です。

```text
runtime nearest-even: 2^24+1=16777216; +2=16777218; +3=16777220
```

この位置の上側の間隔は2です。+1はちょうど中間で下側へ、+3も中間ですが上側へ丸められました。nearest-evenの「even」は保持する仮数の最下位bitが0という意味です。候補の整数値が偶数かどうかで判定する話ではありません。[MSVCの丸めモード](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/fegetround-fesetround2?view=msvc-170)

`0.1f+0.2f`と`0.3f`が必ず不一致になることは、このサンプルの期待条件にしていません。

## 実行確認

2026年11月3日、Windows x64（25H2、build 26200.9711）、MSVC **19.35.32217.1**、Windows SDK **10.0.22000.0**、CMake **3.26.3**で、x64 Release・C++20・`/W4 /WX /permissive- /EHsc /utf-8 /fp:strict`のビルドと実行を確認しました。無警告、終了0で、最後は次の表示でした。

```text
environment restored; PASS: 34 checks
```

既知値のword、特殊値の分類、5点の上下差、実行時の丸め、元の丸めモードへの復帰を検査しています。他OS・他処理系・big-endian、別のfloat/uint相対配置、fast-math設定、環境API失敗の注入は実行確認していません。

## main.cpp

<<< @/public/samples/data/float-spacing/main.cpp{cpp}

## CMakeLists.txt

<<< @/public/samples/data/float-spacing/CMakeLists.txt{cmake}
