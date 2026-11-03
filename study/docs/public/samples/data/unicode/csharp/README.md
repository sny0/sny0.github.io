# C#でUnicodeの単位を観察する

`A`、`U+3042`（あ）、`U+1F600`（😀）、`U+0065 U+0301`（eと結合アクセント）のUTF-8 bytes、UTF-16 units、Unicode scalar、`StringInfo`のtext elementを比較します。さらにBOMなしUTF-16LE/BE bytesと、不正UTF-8・不正surrogateの拒否を確かめます。ソースと出力はASCIIです。

.NET 10 SDKで実行します。追加NuGetパッケージ、入力、アプリによるファイルI/Oは不要です。

```powershell
dotnet run --project UnicodeObservation.csproj -c Release
```

Windows x64、.NET SDK 10.0.403、runtime 10.0.14、Releaseで実行確認しました。警告0、エラー0、終了コード0、35 checksでした。他OS・他runtime・Unityでは未実行です。

`string.Length`はUTF-16 code unit数です。strict encoderでUTF-16を検証した後、`EnumerateRunes`でscalarを数えます。`EnumerateRunes`だけでは不正UTF-16を拒否しません。`StringInfo`のgrapheme分割はruntimeのUnicode規則に依存し、表示幅・glyph数は測りません。UnityでのAPI提供や同じ分割結果は別途確認してください。

`UTF8Encoding(false, true)`と`UnicodeEncoding(false/true, false, true)`を使い、不正列は例外とする設定です。表示するbytesにBOMは含めず、`GetBytes`はpreambleを自動付与しません。正規化は実行しません。

解説: https://sny0.com/study/practice/data/unicode-observation.html
