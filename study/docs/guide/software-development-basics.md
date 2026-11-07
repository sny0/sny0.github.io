---
title: プログラムを書く・動かす基礎から読む
study:
  source: 新規執筆
  section: learning
  format: path
  status: published
  domain: tools
  collection: foundations
  order: 3
  summary: OSとファイル、変数と関数、コンパイルとライブラリ、IDEとシェルの役割を確認し、小さなプログラムから内部の詳解へ進む読み順。
---

# プログラムを書く・動かす基礎から読む

「変数は書けるけれど、実行すると何が動くのか分からない」「IDEやSDKなど、開発で使う言葉を確認したい」ときの入口です。分かっている項目は飛ばして、必要な本文を選べます。

## 実行する場所を知る

1. [OSの役割](/os/operating-system-basics.html)で、アプリがCPU、メモリ、機器を使うときのOSの仕事を調べます。
2. [ファイルとパス](/os/files-and-paths.html)で、保存したバイト列と、ファイルの場所の指定を確認します。

部品の名前から確認したいときは、[ハードウェアの基礎](/guide/hardware-basics.html)へ進みます。

## 小さなコードを読む

1. [変数・型・式](/languages/variables-types-and-expressions.html)で、値を持ち、計算し、代入する流れを追います。
2. [条件分岐・繰り返し・関数](/languages/control-flow-and-functions.html)で、処理の順番と、入力・結果を受け渡す方法を確認します。

どちらにも短いC++・C#のコンソールプログラムと出力例があります。すでに言語を使っている場合も、値の変化を手で追うと、代入や関数の引数を確認できます。

### コード例を手元で動かす

C++は、Visual StudioのC++開発ツールを用意し、**x64 Native Tools Command Prompt**を開きます。記事の完全なコードを`main.cpp`に保存し、そのフォルダーで次を実行します。[MicrosoftのC++コマンドライン環境](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line)

```bat
cl /nologo /std:c++17 /EHsc /W4 main.cpp /Fe:basics.exe
basics.exe
```

C#は.NET SDKを用意し、PowerShellで次のコマンドを実行してコンソールプロジェクトを作ります。[Microsoftのコンソールアプリ作成](https://learn.microsoft.com/en-us/dotnet/core/tutorials/with-visual-studio-code)

```powershell
dotnet new console -n Basics
```

生成された`Basics/Program.cs`の内容を、記事の完全なコードに置き換えて保存します。その後、次のコマンドで実行します。

```powershell
dotnet run --project Basics
```

## ソースコードが動くまでを追う

1. [ソースコードから実行まで](/compilers/source-code-and-execution.html)で、コンパイル、リンク、実行の段階を見ます。
2. [ライブラリ・API・SDK](/compilers/libraries-apis-and-sdks.html)で、自分のコードから既存の機能を使う方法を調べます。

## 道具を使い分ける

1. [開発ツールの基本](/tools/development-tools-basics.html)で、エディター、IDE、デバッガ、プロファイラーの機能を比べます。
2. [ターミナル・シェル・コマンド](/tools/terminal-shell-and-commands.html)で、文字で道具を呼ぶ手順を読みます。

## 内部の詳解へ進む

プログラムの起動は[プロセスの起動](/os/process-startup.html)、生成されるファイルは[OBJ・EXE・PDBの観察](/practice/compilers/build-artifact-observation.html)で調べられます。実行中の値を見たいときは[ブレークポイント](/tools/windows/debugger-breakpoints-and-watchpoints.html)、C++の型や寿命を調べたいときは[C++の言語機能のガイド](/languages/cpp/)へ進みます。
