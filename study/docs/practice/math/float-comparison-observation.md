---
title: C++とC#でfloatの近似比較と限界を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: math
  collection: float-comparison-observation
  order: 1
  verification: Windowsで両言語を実行確認
  summary: binary32入力の差をdoubleで計算する近似比較を両言語で試し、絶対・相対許容差の境界、NaN・Inf、不正tol、非推移性、失われた座標差を観察する。
  aliases: [float, double, 近似比較, 絶対誤差, 相対誤差, tolerance, epsilon, NaN, Infinity, 非推移性]
---

# C++とC#でfloatの近似比較と限界を観察する

**binary32の`float`入力二つの差が、用途で決めた許容差の範囲に入るか判定する**小さな例です。C++20とC#で同じ入力・独立した期待結果を使います。比較方法を選ぶ考え方は[浮動小数点の比較](/math/floating-point-comparison.html)、値そのものの間隔は[floatの表現間隔を観察する](/practice/data/float-spacing-observation.html)を参照してください。

## このサンプルの判定規則

1. `absTol`は有限かつ0以上、`relTol`は有限かつ0以上1未満とし、不正なら入力値にかかわらず例外にします。`relTol < 1`はこの教材で選んだ制約です。
2. NaNを含めばfalseです。
3. `a == b`ならtrueです。`+0/-0`と同符号のInfも含みます。
4. 残る非有限値の組み合わせはfalseです。
5. 残る有限値を**それぞれ先にdoubleへ変換**し、次の式で判定します。

```text
da = double(a), db = double(b)
diff  = abs(da - db)
scale = max(abs(da), abs(db))
diff <= max(absTol, relTol * scale)
```

`double(a - b)`では、差を先にfloatで計算してしまいます。ここではbinary32の有限端点同士の差もbinary64で有限に収まるため、先に広げます。C++版は両型のサイズ・基数・精度・指数範囲などを`static_assert`で確認します。floatからdoubleへのpromotionは値を保ちますが、**その後のdouble演算にも丸めはあります**。任意のdouble入力全域へ広げた関数ではありません。[C++20草案 N4861：floating-point promotion](https://timsong-cpp.github.io/cppwp/n4861/conv.fpprom)、[numeric_limits](https://timsong-cpp.github.io/cppwp/n4861/numeric.limits.members)、[Microsoft：C#の浮動小数点型](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types)

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。ソースと出力はASCIIです。入力、アプリによるファイルI/O、外部ライブラリは使いません。

### C++20

- <a href="/study/samples/math/float-comparison/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/math/float-comparison/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/math/float-comparison/cpp/README.md" download>README.md</a>

Visual Studio 2022とCMake 3.20以降の例です。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\float_comparison_observation.exe
```

CMakeはMSVCで`/fp:strict`を設定します。コードでは`FE_TONEAREST`を設定して確認し、元の環境をRAIIで復元します。NaNや丸めモードを利用するため、この実測を`/fp:fast`等の設定にそのまま当てはめません。[Microsoft：/fp](https://learn.microsoft.com/en-us/cpp/build/reference/fp-specify-floating-point-behavior?view=msvc-170)

### C# / .NET 10

- <a href="/study/samples/math/float-comparison/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/math/float-comparison/csharp/FloatComparison.csproj" download>FloatComparison.csproj</a>
- <a href="/study/samples/math/float-comparison/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project FloatComparison.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。丸め例は`NoInlining`を付けた関数で実行時に加算し、このruntime・実行環境の結果を確かめます。UnityのAPI互換性や数値挙動を確認したコードではありません。

## 実測で見る境界と限界

以下は両言語で一致した結果の一部です。境界例は二進分数で正確に表せる入力・tolを選び、期待値を式の再実行から生成せず直接指定しています。

|例|入力・tol|結果|
|---|---|---|
|0付近の絶対許容差|`a=0`、`b=0.125 / 0.25 / 0.5`、`absTol=0.25`、`relTol=0`|内側true・境界true・外側false|
|相対許容差の境界|`a=896`、`b=1024`、`absTol=0`、`relTol=0.125`|差128・許容差128でtrue|
|相対許容差の外側|`a=880`、他は同上|差144でfalse|
|大きな座標|`1048576`と`1048608`、`absTol=0`、`relTol=1/32768`|true|
|有限の両端|`float`の最大値とその負値|double差は約`6.8056469327705772E+38`。`absTol=1, relTol=0.5`でfalse、`absTol=double最大値, relTol=0`ならtrue|
|特殊値|NaN、±Inf、±0|上記の判定規則に一致|

最大のabsTolを使う行は、差をfloatで先に計算していないかを検出するための検査で、実用の許容差の推奨ではありません。不正tolは負数・NaN・Inf・`relTol=1`の7例で拒否され、同値やNaNの早期returnより先に検証されました。

**近いという関係は推移しません。** `absTol=1, relTol=0`のとき、`0`と`0.75`、`0.75`と`1.5`は近いと判定されますが、`0`と`1.5`はfalseです。この判定をsortの比較器や辞書・集合のkey同値性としてそのまま使えません。

```text
nontransitive: AB=true BC=true AC=false
rounded_coordinate: base=16777216 after_plus_one=16777216 double_diff=0 near=true
```

後者は`16777216f`に実行時に`1f`を足した結果です。今回の環境ではnearest-evenの結果として同じfloatへ丸められ、**比較に渡す前に失った差はdoubleへ広げても復元できません**。近似比較が座標精度を改善するわけではありません。

epsilonという名前も区別します。今回の値は、C++の`numeric_limits<float>::epsilon()`と1のすぐ上の差が`2^-23`、C#の`Single.Epsilon`が最小の正のfloatである`2^-149`でした。後者はC++の`denorm_min()`に対応します。どちらも、そのまま全スケールの許容差にはできません。[N4861：epsilonの定義](https://timsong-cpp.github.io/cppwp/n4861/numeric.limits.members#25)、[Microsoft：Single.Epsilon](https://learn.microsoft.com/en-us/dotnet/api/system.single.epsilon?view=net-10.0)

## 確認環境と実装

2026-11-03、Windows x64（25H2、build 26200.9711）で実行しました。両言語とも終了コード0、**31 checks**です。内訳は通常19例、不正tol 7例、非推移性・失われた差など5項目です。

|版|条件|結果|
|---|---|---|
|C++|MSVC 19.35.32217.1、CMake 3.26.3、x64 Release、C++20、`/W4 /WX /permissive- /EHsc /utf-8 /fp:strict`|警告なし、環境復元成功|
|C#|.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errors|警告0・エラー0|

他OS・他コンパイラ・他runtime・Unity、変更された丸め/非正規化数モードでは未実行です。CMakeに記したClang/GCC設定も未検証です。許容差は単位・入力範囲・計算過程に合わせて決める必要があり、この関数を万能な一致判定としては扱いません。

### C++20

<<< @/public/samples/math/float-comparison/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/math/float-comparison/csharp/Program.cs{csharp}
