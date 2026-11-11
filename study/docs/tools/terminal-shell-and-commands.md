---
title: ターミナル・シェル・コマンドの基本
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: tools
  summary: 文字でコマンドを操作する画面から、ターミナルとシェル、引数、カレントディレクトリ、PATH、標準入出力、パイプをPowerShellの小さな例で説明する。
  aliases: [ターミナル, terminal, シェル, shell, CLI, コマンド, PowerShell, Bash, sh, cmd, 引数, カレントディレクトリ, PATH, 標準入力, 標準出力, パイプ]
  verification: Microsoftの公式資料に照合。掲載した表示用コマンド5種をPowerShellで実行確認（2026-11-07）
---

# ターミナル・シェル・コマンドの基本

開発手順には、`dotnet build`や`cmake --build build`のように文字でツールを呼び出す操作が出てきます。この操作方法をCLI（コマンドラインインターフェース）と呼びます。入力した文字列をどのプログラムがどう受け取るかを追うと、コマンドの読み方が分かります。[Windows Terminalの概要](https://learn.microsoft.com/en-us/windows/terminal/)

## 画面と、入力を解釈するプログラム

| 名前 | 役割 | 例 |
| --- | --- | --- |
| **ターミナル** | 文字の入力や出力を表示し、コマンドラインのアプリを使う画面を提供する。 | Windows Terminal、IDE内のターミナル。 |
| **シェル** | 入力したコマンドを解釈し、内部の機能や外部プログラムを呼び出す。 | PowerShell、Bash、`cmd.exe`。 |
| **コマンド** | シェルへ依頼する処理。 | ファイルを一覧表示する、ビルドツールを起動する。 |

同じターミナルでも、開いたタブで動くシェルを変えられます。PowerShell、Bash、cmdでは、変数や引数、パイプなどの規則が異なります。手順に書かれた対象のシェルを確認して入力します。`sh`はPOSIXのシェル言語に沿った実行環境の入口として使われる名前で、Bashは独自の追加機能も持つシェルです。[Windows Terminalとシェルの関係](https://learn.microsoft.com/en-us/windows/terminal/faq#what-is-the-difference-between-a-shell-and-a-terminal) · [Bashの公式マニュアル](https://www.gnu.org/software/bash/manual/html_node/What-is-Bash_003f.html)

<figure class="study-figure">
  <img src="/images/tools/terminal-shell-and-commands.svg" alt="ターミナルで文字を入力し、PowerShellがコマンドを解釈する。Get-ChildItemはシェルのコマンドレットとして動き、dotnet buildは外部のdotnetプログラムを起動する。出力はターミナルに表示される。" width="760" height="442" loading="lazy">
  <figcaption>シェル内の機能を使う場合と、別のプログラムを起動する場合があります。<a href="/study/images/tools/terminal-shell-and-commands.svg" target="_blank" rel="noopener noreferrer">シェルとコマンドの図を拡大</a></figcaption>
</figure>

## コマンド名と引数を読む

PowerShellでは、`Get-ChildItem -File`を「`Get-ChildItem`に`-File`という指定を渡す」と読めます。`Get-ChildItem`はPowerShellの**コマンドレット**で、`-File`はファイルを対象にするパラメーターです。`dotnet build`なら、`dotnet`という外部プログラムへ`build`を引数として渡します。[Get-ChildItem](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem) · [dotnet build](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build)

シェルはコマンド名やパス、引用符などを解釈してから処理を呼び出します。例えばPowerShellで空白を含むパスを値として渡すときは、`'D:\My Game\assets'`のように引用符でまとめます。以下では、PowerShellに標準で入っているコマンドレットを使います。[PowerShellの引数の解釈](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing)

## まず現在地とファイルを表示する

次の例をPowerShellで一行ずつ実行します。ファイル名や件数は、開いたフォルダーによって変わります。

```powershell
Get-Location
Get-ChildItem -Name
Get-ChildItem -File | Select-Object -First 3 Name, Length
Get-Command Get-ChildItem
Write-Output 'hello'
```

**カレントディレクトリ**は、いま作業の基準にしている場所です。`Get-Location`で現在地を、`Get-ChildItem`でその中身を確認できます。ファイルシステム上の場所では、`.`は現在のフォルダー、`..`は親フォルダーを示します。`Set-Location`で作業場所を移せます。相対パスは基準の場所と組み合わせて読みます。[Get-Location](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-location) · [Set-Location](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location) · [ファイルとパス](/os/files-and-paths.html)

## コマンドがどこから見つかるか

`Get-Command Get-ChildItem`は、指定した名前に対応するコマンドの情報を表示します。外部プログラムの名前をパスなしで入力したとき、シェルは**PATH環境変数**に登録されたフォルダーなどから探します。開発ツールのインストール状況やシェルを開いた方法によって、見つかるプログラムが変わることがあります。[Get-Command](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-command) · [PowerShellのコマンドの検索順](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence)

PowerShellで現在のフォルダーにある自作の実行ファイルを起動するときは、次のように先頭に`.\`を付けます。パスを含めて指定することで、どのファイルを起動するかを表せます。以下は`Game.exe`をその場所にビルド済みの場合の例です。[PowerShellで現在のフォルダーのプログラムを実行する](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence)

```powershell
.\Game.exe
```

## 出力を次の処理へ渡す

`Get-ChildItem -File | Select-Object -First 3 Name, Length`の`|`は**パイプ**です。左側が出力したものを右側へ渡します。この例ではファイルを表すオブジェクトを渡し、先頭3件の名前とサイズを取り出します。PowerShellのコマンドレット間では、名前やサイズなどの情報を持つオブジェクトを受け渡せます。[PowerShellのパイプ](https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/04-pipelines)

外部プログラムには、入力を受ける**標準入力**、通常の結果を出す**標準出力**、エラーなどを出す**標準エラー出力**という受け渡し口があります。シェルから起動したプログラムの出力を画面に表示したり、別のプログラムへつないだりできます。外部プログラム間のパイプと、PowerShellのコマンドレット間のオブジェクトの受け渡しでは、扱う形式を確認します。[PowerShellの出力ストリーム](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_output_streams) · [パイプと子プロセスの標準入出力](/os/pipes-and-process-io.html)

開発環境全体の役割は[開発ツールの基本](/tools/development-tools-basics.html)、ソースからプログラムを作る処理は[ソースコードから実行まで](/compilers/source-code-and-execution.html)へ進みます。
