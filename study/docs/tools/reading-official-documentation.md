---
title: 公式ドキュメントの読み方 — バージョンとAPIの動作を確かめる
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: tools
  summary: 使用中の版から公式資料を選び、引数・戻り値・動作条件を読み、C#のInt32.TryParseで期待値と実行結果を照合する。
  aliases: [公式ドキュメント, 公式資料, APIリファレンス, バージョン, ターゲットフレームワーク, オーバーロード, Int32.TryParse, int.TryParse, out, Microsoft Learn]
  verification: Microsoft Learnの.NET 10 APIリファレンスに照合し、Windowsの.NET SDK 10.0.403で掲載コードを実行確認（2026-11-12）
---

# 公式ドキュメントの読み方 — バージョンとAPIの動作を確かめる

設定ファイルから読み込んだ文字列 `"42"` を整数にしたいとします。入力が `"42px"` や整数で表せない大きさなら、何が返るでしょうか。C#の `int.TryParse` を例に、使う版を調べ、公式資料から予想を立てて、小さなコードで確かめます。

```mermaid
flowchart LR
    V["使う版を調べる"] --> R["版と引数が合う説明を読む"]
    R --> E["入力と期待結果を書く"]
    E --> T["短いコードで実行する"]
    T --> C["仕様と実行結果を照合する"]
```

## 対象のバージョンを確認する

開発手順を知りたいときは公式マニュアル、メソッドの引数や戻り値を知りたいときはAPIリファレンスを開きます。版による追加や変更を追うときは、リリースノートも参照します。検索結果を開いたら、まず製品名と版を手元の環境と照らし合わせます。

WindowsのPowerShellで、`dotnet` が選択するSDKの版と、インストール済みのSDKを確認します。この実践では.NET 10 SDKを使います。[dotnetコマンドのオプション](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet) · [.NET 10 SDKの入手先](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)

```powershell
dotnet --version
dotnet --list-sdks
```

別の作業と分けるため、空のフォルダーで次を実行します。

```powershell
dotnet new console -n ParsePractice -f net10.0
```

`ParsePractice/ParsePractice.csproj` を開くと、次の行があります。`net10.0` はプロジェクトが対象にするフレームワークです。SDKの `10.0.403` のような番号はビルド用ツールの版で、APIを調べるときはプロジェクトの対象である **.NET 10** の資料を選びます。Unityのパッケージを調べる場合は、エディターの版に加えて使っているパッケージの版も確認します。[ターゲットフレームワーク](https://learn.microsoft.com/en-us/dotnet/standard/frameworks) · [dotnet new](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new)

```xml
<TargetFramework>net10.0</TargetFramework>
```

## 呼び出しと同じ引数の説明を読む

C#の `int` は `System.Int32` の別名です。Microsoft Learnで `Int32.TryParse` を開くと、同じ名前でも引数の型や数が異なる定義が並びます。これらを**オーバーロード**と呼びます。今回は文字列と `out int` を渡すため、見出しが **TryParse(String, Int32)** の項目を読みます。C#の宣言で `out` も確かめます。[C#の整数型](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/integral-numeric-types) · [.NET 10のInt32.TryParse](https://learn.microsoft.com/en-us/dotnet/api/system.int32.tryparse?view=net-10.0)

```csharp
public static bool TryParse(string? s, out int result);
```

| 公式資料で読む場所 | このオーバーロードで確認すること |
| --- | --- |
| Parameters（パラメーター） | `s` は変換する文字列。変換した整数が `out int result` に入る。失敗時の `result` は0。 |
| Returns（戻り値） | `bool` を返す。変換に成功すれば `true`、失敗すれば `false`。 |
| ParametersとRemarks（注釈） | 整数として読める形式で、`Int32` の範囲内なら変換できる。既定の書式は `NumberStyles.Integer` で、現在のカルチャの書式情報を使う。 |

文字列 `"0"` は成功して整数0になります。値が0でも成功と失敗の両方があり得るため、整数を使う前に `bool` で成否を確認します。[.NET 10のInt32.TryParse](https://learn.microsoft.com/en-us/dotnet/api/system.int32.tryparse?view=net-10.0)

## 期待結果を書いてから実行する

まず `"42"` と `"0"` は成功、文字が混じる `"42px"` は失敗と予想します。さらに `Int32` の最大値 `2147483647` と、そこから1大きい値を比べると、どこまで受け付けるかを調べられます。

`ParsePractice/Program.cs` の内容を次に置き換えます。

```csharp
using System;

string[] samples = { "42", "0", "42px", "2147483647", "2147483648" };
foreach (string sample in samples)
{
    bool success = int.TryParse(sample, out int value);
    Console.WriteLine($"input={sample}, success={success}, value={value}");
}
```

プロジェクトを作ったときのフォルダーで実行します。[dotnet run](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-run)

```powershell
dotnet run --project ParsePractice
```

```text
input=42, success=True, value=42
input=0, success=True, value=0
input=42px, success=False, value=0
input=2147483647, success=True, value=2147483647
input=2147483648, success=False, value=0
```

`"0"` と `"42px"` では、`value` が同じでも `success` が異なります。最大値をまたぐ2行では、範囲の条件を確かめられます。予想と出力が違った場合は、呼び出しているオーバーロード、プロジェクトの対象フレームワーク、資料の書式条件を見直します。

## 理解度チェック

1. `dotnet --version` に `10.0.403`、プロジェクトに `net10.0` と表示されています。APIリファレンスで選ぶ版はどれですか。
2. `int.TryParse(text, out int number)` の成功・失敗はどこで受け取り、変換された整数はどこで受け取りますか。
3. `"2147483648"` での失敗が整数の範囲によることを確かめるため、どの入力を比較に使いましたか。

::: details 解答
1. プロジェクトの対象フレームワークに合わせて.NET 10を選びます。
2. 戻り値の `bool` で成否を受け取り、`out` で渡した `number` から変換結果を読みます。
3. `Int32` の最大値である `"2147483647"` です。隣り合う二つの数を同じオーバーロードで試すと、最大値を含む範囲を確認できます。
:::

## 関連項目

- [ライブラリ・API・SDK](/compilers/libraries-apis-and-sdks.html)
- [変数・型・式](/languages/variables-types-and-expressions.html)
- [条件分岐・繰り返し・関数](/languages/control-flow-and-functions.html)
- [AIが書いたコードとの付き合い方](/tools/reviewing-ai-generated-code.html)
- [ロードマップの公式ドキュメントの読み方](/learn/roadmap.html?node=dev-docs#dev-tools)

## 参考資料

- [Microsoft Learnの.NET 10 APIリファレンス Int32.TryParse](https://learn.microsoft.com/en-us/dotnet/api/system.int32.tryparse?view=net-10.0)
- [.NETのターゲットフレームワーク](https://learn.microsoft.com/en-us/dotnet/standard/frameworks) · [dotnet CLI](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet)
