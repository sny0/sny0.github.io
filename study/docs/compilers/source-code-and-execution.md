---
title: ソースコードから実行まで — コンパイラ・リンカー・ランタイム
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: compilers
  summary: 書いたプログラムが動くまでを、ソースコード、コンパイル、リンク、起動、ランタイムに分けて説明する。C++とC#の例から、JITとAOT、エラーが起きる段階も調べる。
  aliases: [ソースコード, コンパイラ, コンパイル, リンカー, リンク, オブジェクトファイル, 実行ファイル, ランタイム, ビルド, JIT, AOT, IL, 機械語]
  verification: ClangとMicrosoftのC++・.NETの公式資料に照合（2026-11-07）
---

# ソースコードから実行まで — コンパイラ・リンカー・ランタイム

ゲームのソースを書き換えたあとは、ソースを翻訳し、必要な部品をそろえて、プログラムを起動します。ソースを書く段階、ビルドする段階、実行する段階を分けて考えると、どの段階の結果を見ているかが分かります。[ビルドの基本](/tools/build/what-is-build.html)

## 書くための表現と、CPUが実行する命令

人がC++やC#などで書くプログラムを**ソースコード**と呼びます。一般的にはテキストファイルに保存し、エディターで編集します。CPUが実行する**機械語**は、対象のCPUの命令を符号化したものです。例えばx86-64向けの機械語とAArch64向けの機械語は、命令の形式が異なります。[CPUの命令実行](/hardware/cpu/instruction-execution.html)

**コンパイラー**は、言語の規則を調べ、ソースコードを別の表現へ翻訳するプログラムです。出力は機械語を含むオブジェクトファイルの場合も、後の処理で使う中間表現の場合もあります。ソースを読み、型などを確かめる内部の処理は、詳しい記事で扱います。[Clangの処理段階](https://clang.llvm.org/docs/CommandGuide/clang.html#description) · [トークン・AST・型検査](/compilers/tokens-ast-and-type-checking.html)

## C++の小さなプログラムを作る場合

一般的なネイティブのC++アプリでは、次のように考えられます。ここで**ネイティブコード**は、そのCPUが実行する機械語を指します。[Clangのツールチェーン](https://clang.llvm.org/docs/Toolchain.html)

| 段階 | 作るもの・すること |
| --- | --- |
| ソースを編集する | `main.cpp`などに処理を書く。使いたい関数の宣言をヘッダーから取り込むこともある。 |
| コンパイルする | ソースを調べ、機械語や他の部品への参照を持つ**オブジェクトファイル**を作る。MSVCでは`.obj`が一例。 |
| リンクする | **リンカー**が複数のオブジェクトファイルやライブラリを組み合わせ、参照先を結び付けて実行ファイルなどを作る。 |
| 起動する | OSなどが実行に必要な準備を行い、CPUが命令を実行する。 |

コンパイラーのコマンド一回でコンパイルとリンクを続けて行う構成もあります。操作するコマンドの数と、内部の仕事の数は一致するとは限りません。[Clangのコンパイラードライバー](https://clang.llvm.org/docs/CommandGuide/clang.html#description) · [実行ファイルを起動する流れ](/os/process-startup.html)

<figure class="study-figure">
  <img src="/images/compilers/source-code-and-execution.svg" alt="C++ではソースをコンパイルしてオブジェクトファイルを作り、リンクしてネイティブの実行ファイルにする。C#のJIT利用例ではソースからILを作り、実行時にJITが機械語へ変換する。" width="760" height="430" loading="lazy">
  <figcaption>代表的な二つの経路です。前処理や最適化などの細かな段階は省いています。<a href="/study/images/compilers/source-code-and-execution.svg" target="_blank" rel="noopener noreferrer">翻訳と実行の図を拡大</a></figcaption>
</figure>

## 実行中の処理を支えるランタイム

**ランタイム**は、プログラムの実行を支えるソフトウェアを指す言葉です。C++のMSVCでは、Cランタイムライブラリ（CRT）が起動や終了、メモリ確保、ファイル入出力などを支えます。ライブラリを実行ファイルに取り込む構成も、DLLとして利用する構成もあります。[MicrosoftのCRTとライブラリ構成](https://learn.microsoft.com/en-us/cpp/c-runtime-library/crt-library-features?view=msvc-170)

C#を.NETで使う場合には、.NETランタイムがコードの実行やメモリ管理などを担当します。**ランタイム**というソフトウェアの名前と、「実行時にエラーが起きた」という**時点**の意味を、文脈から読み分けます。[Microsoftの.NETの構成](https://learn.microsoft.com/en-us/dotnet/core/introduction)

## C#のIL、JIT、AOT

C#の一般的な.NETのビルドでは、コンパイラーが**IL（中間言語）**と型などの情報を生成します。**JIT（Just-In-Time）コンパイル**を使う構成では、実行時に必要なILを対象CPUの機械語へ変換します。ソースからILへ変換する段階もコンパイルです。[Microsoftのマネージド実行の流れ](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process)

**AOT（Ahead-Of-Time）コンパイル**は、実行前に機械語などへの変換を済ませる方式です。.NETのNative AOTでは公開時にILをネイティブコードへ変換し、実行時のJITを使わずに動くアプリを作ります。UnityのIL2CPPも、ILをC++へ変換してネイティブビルドにつなぐ別の経路です。[MicrosoftのNative AOT](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/) · [UnityとIL2CPP](/languages/csharp/il2cpp.html)

**インタープリター**は、プログラムや中間表現を読みながら、その意味に従って処理を進める実行方式です。同じ言語でも実装や設定によってコンパイル、JIT、インタープリターを組み合わせられます。例えば.NETのMonoでは、インタープリターとAOTを組み合わせる構成もあります。言語名に加え、対象の実行環境を確認します。[Microsoftの.NET MAUIとMonoインタープリター](https://learn.microsoft.com/en-us/dotnet/maui/macios/interpreter?view=net-maui-10.0)

## エラーが出た段階を読む

| 段階 | 例 | 最初に見るもの |
| --- | --- | --- |
| コンパイル | 存在しない変数名を使った。型に合わない操作を書いた。 | 診断に示されたソースの位置と、名前・型の説明。 |
| リンク | C++で宣言した関数の実装を、リンクする入力に含めていない。 | 関数の定義と、リンク対象のオブジェクト・ライブラリ。 |
| 実行 | ファイルを開く処理が失敗した。処理中に例外が送出された。 | APIの結果、例外の情報、実行時の状態。 |

ビルドが成功しても、計算した結果が意図と合うかは実行して確かめます。ビルドで止まる問題と、実行中の失敗を追う道具は、同じIDEの中でも役割が分かれます。[リンクエラー](/tools/build/link-errors.html) · [開発ツールの基本](/tools/development-tools-basics.html)

## 関連記事

- [main.cppからCPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html)
- [オブジェクトファイルとライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)
- [ライブラリ・API・SDK](/compilers/libraries-apis-and-sdks.html)
- [ターミナルとシェル](/tools/terminal-shell-and-commands.html)
