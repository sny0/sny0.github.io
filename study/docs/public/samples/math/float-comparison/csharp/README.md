# C#でfloatの近似比較を観察する

binary32の`float`入力を先にbinary64の`double`へ広げ、絶対許容差と相対許容差を組み合わせます。

```text
abs(double(a) - double(b)) <= max(absTol, relTol * max(abs(double(a)), abs(double(b))))
```

先にtoleranceを検査します。`absTol`は有限かつ0以上、`relTol`は有限かつ0以上1未満です。不正なら例外、NaNを含めばfalse、`a == b`ならtrue（±0と同符号のInfを含む）、残る非有限値はfalseとします。この範囲と順序は教材のpolicyです。

.NET 10 SDKで実行します。追加NuGetパッケージはありません。

```powershell
dotnet run --project FloatComparison.csproj -c Release
```

Windows x64、.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで実行確認しました。警告0・エラー0、終了0、31 checksです。他OS・他runtime・Unityでは未実行です。丸め例は`NoInlining`の関数内で実行時加算し、この環境の結果を検査します。

`Single.Epsilon`は最小の正の`float`（2^-149）で、1のすぐ上の差（2^-23）とは異なります。どちらも万能なtoleranceではありません。ソースと出力はASCII、入力・ファイルI/Oはありません。非推移性があり、sort/key用の同値関係や`double`全域用関数にはできません。UnityのAPIや数値挙動との共通保証もしていません。

解説: https://sny0.com/study/practice/math/float-comparison-observation.html
