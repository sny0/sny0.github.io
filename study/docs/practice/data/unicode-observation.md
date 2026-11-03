---
title: C++とC#でUnicodeのバイト列と文字列の長さを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: data
  collection: unicode-observation
  order: 1
  verification: Windowsで両言語を実行確認
  summary: A・あ・😀・結合アクセントのUTF-8バイト列、UTF-16コード単位、スカラー値、書記素クラスタを比較し、C#では不正列の拒否とUTF-16LE/BEのバイト列も観察する。
  aliases: [Unicode, UTF-8, UTF-16, UTF-32, char8_t, char16_t, Rune, StringInfo, surrogate, grapheme, 文字数]
---

# C++とC#でUnicodeのバイト列と文字列の長さを観察する

「文字数」を一つの数で扱うと、絵文字や結合文字で困ります。同じ4例について、**UTF-8のバイト数、UTF-16のコード単位数、Unicodeスカラー値の個数、書記素クラスタ数**を並べます。概念は[Unicodeと文字コード](/data/unicode-and-encoding.html)、バイト順は[整数の保存形式を観察する](/practice/data/integer-byte-observation.html)へつながります。

UTF-8は8bit、UTF-16は16bitのコード単位（code unit）を使います。スカラー値（scalar value）はサロゲート範囲を除くUnicodeコードポイントです。一つのスカラー値がUTF-16ではサロゲートペアの二単位になる場合があります。書記素クラスタ（grapheme cluster）は、利用者が一文字として扱うまとまりを近似します。[Unicode公式：用語集](https://www.unicode.org/glossary/)、[UTFのFAQ](https://www.unicode.org/faq/utf_bom.html)

## 同じ内容でも数える単位が違う

次は今回の実行結果です。C++とC#でbyte・unit・scalar列が一致し、grapheme列はC#の`StringInfo`で確認しました。

|内容|UTF-8バイト列（16進）|UTF-16単位列（16進）|バイト数|単位数|スカラー数|書記素数|
|---|---|---|---:|---:|---:|---:|
|`A`（U+0041）|`41`|`0041`|1|1|1|1|
|あ（U+3042）|`E3 81 82`|`3042`|3|1|1|1|
|😀（U+1F600）|`F0 9F 98 80`|`D83D DE00`|4|2|1|1|
|`e` + U+0301（結合アクセント）|`65 CC 81`|`0065 0301`|3|2|2|1|

C++の`.size()`は格納する要素の数です。このサンプルの`std::u8string_view`ならUTF-8コード単位数、`std::u16string_view`ならUTF-16コード単位数で、リテラル末尾のNULは含めません。`CHAR_BIT == 8`を検査するため、ここでUTF-8単位数をバイト数とも呼べます。`std::string`の`.size()`も`char`要素を数えるだけで、UTF-8のスカラー数や書記素クラスタ数を解析しません。[C++20草案：string_viewのsize](https://timsong-cpp.github.io/cppwp/n4861/string.view.capacity)、[文字列リテラルの型と符号化](https://timsong-cpp.github.io/cppwp/n4861/lex.string)

C#の`string.Length`は`char`の数、つまりUTF-16 code unit数です。`😀`は2、`e` + U+0301も2です。scalar数には`EnumerateRunes`、text element数には`StringInfo.LengthInTextElements`を使います。graphemeは表示上のまとまりを扱う単位ですが、glyph数や画面上の幅と同じではありません。分割規則はruntimeのUnicode対応に依存します。[Microsoft：.NETの文字encoding](https://learn.microsoft.com/en-us/dotnet/standard/base-types/character-encoding-introduction)、[StringInfoのUAX #29対応](https://learn.microsoft.com/en-us/dotnet/core/compatibility/globalization/5.0/uax29-compliant-grapheme-enumeration)

## 入手して実行する

各言語のファイルを、それぞれ同じフォルダへ保存します。ソースはUnicode escapeを使い、出力もASCIIにして、端末のフォントや絵文字表示に依存せず比較できるようにしています。入力、ネットワーク通信、アプリによるファイルI/Oはありません。

### C++20

- <a href="/study/samples/data/unicode/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/data/unicode/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/data/unicode/cpp/README.md" download>README.md</a>

CMake 3.20以降とC++20対応コンパイラを使います。Visual Studio 2022の例です。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\unicode_observation.exe
```

C++版は既知の`u8`・`u`・`U` literalを別々に用意し、それぞれ独立した期待配列と照合します。scalar数は正しいUTF-32 literalから得ています。任意のUTF-8をdecodeする実装や、grapheme分割の実装ではありません。

### C# / .NET 10

- <a href="/study/samples/data/unicode/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/data/unicode/csharp/UnicodeObservation.csproj" download>UnicodeObservation.csproj</a>
- <a href="/study/samples/data/unicode/csharp/README.md" download>README.md</a>

.NET 10 SDKを使います。追加のNuGetパッケージはありません。

```powershell
dotnet run --project UnicodeObservation.csproj -c Release
```

このサンプルは.NET console向けです。Unityのruntime・API互換性・Unicode対応は別途確認が必要で、同じコードをそのまま利用できるという確認はしていません。

## コード単位と保存するバイト列を分ける

C#版では`UnicodeEncoding(false, false, true)`でUTF-16LE、`UnicodeEncoding(true, false, true)`でUTF-16BEの配列も作ります。たとえば`😀`の結果は次の通りです。

```text
UTF-16 units: D83D DE00
UTF-16LE bytes: 3D D8 00 DE
UTF-16BE bytes: D8 3D DE 00
```

unitの順序はどちらもhigh surrogate→low surrogateです。LE/BEで変えるのは各16-bit unitのbyte順で、文字列全体のbytesを逆転する操作ではありません。この配列は明示した保存形式であり、C#オブジェクトのメモリを直接読んだ結果ではありません。

今回はBOMなしです。`GetBytes`はBOMを自動付与せず、必要なら`GetPreamble`で得た列を別途扱います。[Microsoft：UnicodeEncoding.GetPreamble](https://learn.microsoft.com/en-us/dotnet/api/system.text.unicodeencoding.getpreamble?view=net-10.0)

## 不正な列をどう扱うか

C#版は`UTF8Encoding(false, true)`を使い、置換で処理を続ける設定ではなく、**不正列を例外で拒否する設定**を選びます。過長UTF-8 `C0 AF`、途中で切れた`F0 9F 98`、surrogateを表す`ED A0 80`、上限を超える`F4 90 80 80`で`DecoderFallbackException`を確認します。単独high/low surrogateと、high surrogateの次が`A`のUTF-16は、UTF-8へencodeするとき`EncoderFallbackException`で拒否されました。[Microsoft：UTF8Encodingのエラー検出](https://learn.microsoft.com/en-us/dotnet/api/system.text.utf8encoding?view=net-10.0)

正常例もstrict encoderを通してから`EnumerateRunes`へ渡します。`EnumerateRunes`だけでは不正UTF-16の検証にならず、置換scalarを返すためです。C++版の既知literal照合と、C#版の実行時encoding検証では観察する範囲が異なります。[Microsoft：String.EnumerateRunes](https://learn.microsoft.com/en-us/dotnet/api/system.string.enumeraterunes?view=net-10.0)

## 確認環境と範囲

2026-11-03、Windows x64（25H2、build 26200.9711）で実行しました。

|版|条件|結果|
|---|---|---|
|C++|MSVC 19.35.32217.1、CMake 3.26.3、x64 Release、C++20、`/W4 /WX /permissive- /EHsc /utf-8`|警告なし、終了0、16 checks|
|C#|.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errors|警告0・エラー0、終了0、35 checks|

期待列はliteralやencoder出力から生成せず、独立したhex配列で指定しています。C#の35 checksは4例×7項目と、不正列7例の拒否です。他OS・他コンパイラ・他.NET runtime・Unityでの実行、一般的なUnicode converterの実装、正規化、フォント描画は確認範囲に含みません。`e` + U+0301を単一scalarの`é`（U+00E9）へ変換する処理も行いません。

## 実装

### C++20

<<< @/public/samples/data/unicode/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/data/unicode/csharp/Program.cs{csharp}
