---
title: main.cpp から CPU命令までの旅
study:
  source: C++ Wiki
  status: published
  summary: 前処理、コンパイル、アセンブル、リンク、プロセス起動、ランタイム初期化、関数の実行を分け、言語規則と実装の境界を調べる。
  section: reference
  format: article
  domain: compilers
  verification: 一次資料照合（2026-11-03）
---

# main.cpp から CPU命令までの旅

## 一言で言うと

C++のソースを実行ファイルにし、アプリケーションの処理を動かすまでを、**このページでは7つの工程**に分けます。途中の成果物と処理を区別すると、コンパイルエラー、リンクエラー、起動失敗、実行時の不具合を切り分けやすくなります。

これは一般的なネイティブ実行ファイルを事前に作る構成の説明です。C++規格の「翻訳のフェーズ」を、そのまま7段階に数え直したものではありません。中間ファイルを作るか、複数の工程を一つのツール内で行うかは処理系やオプションで変わります。[GCCの出力段階と停止オプション](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)では、前処理・コンパイル・アセンブル・リンクを区別しています。

## 全体地図

```text
main.cpp（ソース）
   │ ① 前処理：ヘッダー取り込み・マクロ展開・条件付き選択
   ▼
前処理を経た翻訳単位
   │ ② コンパイル：構文・意味の解析、最適化、コード生成
   ▼
アセンブリ表現（例：main.s。ファイルに出さない場合もある）
   │ ③ アセンブル：命令の符号化、シンボル・再配置情報の生成
   ▼
オブジェクトファイル（例：main.o / main.obj）
   │ ④ リンク：必要な定義の解決・配置、実行ファイルの生成
   ▼
実行ファイル（例：game.exe）
   │ ⑤ 起動：プロセス・初期スレッドの生成、イメージ等の準備
   ▼
起動処理が進むプロセス
   │ ⑥ ランタイムの起動処理 → 通常の構成ではmainへ
   ▼
mainの実行
   │ ⑦ 関数呼び出しと、生成されたCPU命令による処理
   ▼
アプリケーションの処理が進む
```

⑤⑥でもローダーやランタイムの命令は既にCPUで実行されています。⑦は「CPUが初めて動く時点」ではなく、アプリケーション側の関数実行へ注目する工程です。以下ではGCC系のコマンドを例にし、Windowsの通常のコンソールアプリの起動も対応させます。

```cpp
// main.cpp — C++17/20で工程を読むための説明例
#include <cstdio>
#define MAX_HP 100

int Damage(int hp, int amount) { return hp - amount; }

int main() {
    int hp = MAX_HP;
    hp = Damage(hp, 30);
    std::printf("hp=%d\n", hp);
    return 0;
}
```

## ① プリプロセッサ — テキストの変形

前処理は、**前処理トークン、マクロ、前処理指令の規則に従って**ソースを変換します。単なる文字列の検索置換ではありません。文字列リテラルやコメントを識別し、関数形式マクロ、トークン結合、条件式などにも固有の規則があります。一方、通常のC++の名前探索・型検査をここで行うわけではありません。[GCCの前処理言語](https://gcc.gnu.org/onlinedocs/cpp/The-preprocessing-language.html)と[C++作業草案の翻訳フェーズ](https://eel.is/c++draft/lex.phases)が根拠です。

- `#include <cstdio>`：指定したヘッダーを取り込み、関連する前処理を進めます。条件付き選択やインクルードガードも適用されます。
- `#define MAX_HP 100`：後続の対象トークンを、マクロ展開の規則で置き換えます。通常の変数の型・ブロックスコープとは異なるため、定数の用途では[constexpr](/languages/cpp/auto-and-constexpr.html)等と使い分けます。
- `#ifdef`：条件により、後続の翻訳へ渡す部分を選びます。

ここで扱うヘッダー方式では、元のソースと取り込んだ内容を合わせたものが翻訳単位になります。C++20のモジュール等の詳細は別に確認します。GCCでは`g++ -E main.cpp`で前処理後の出力を観察できます。[翻訳単位・ヘッダー・ODR](/runtime/cpp-internals/translation-units-and-headers.html)へ進んでください。

## ② コンパイラ — 意味の解析と機械語化

コンパイラは構文と意味を解析し、型検査、オーバーロード解決、テンプレートの処理、最適化、対象CPU向けのコード生成などを行います。解析の段階や中間表現の構成は処理系により異なります。

通常の分割コンパイルでは、各翻訳単位で見える宣言・定義を基に処理します。外部関数の定義が見えなくても、適切な宣言があれば呼出しを生成できます。宣言もなければ、単に後でリンカへ任せればよいわけではありません。

ただし、**最適化の範囲が常に一つの翻訳単位だけとは限りません。** LTO（リンク時最適化）は、リンクに参加する複数の翻訳単位の中間表現などを使い、ファイルをまたぐ解析やインライン展開を行えます。[GCCの-flto](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html#index-flto)で、この処理を確認できます。

例の`Damage(hp, 30)`は、インライン展開や定数畳み込みによって、実行時の減算を残さず`70`として扱える場合があります。ただし、`-O2`なら必ず同じ命令列になるという保証ではありません。[最適化の本文](/runtime/cpp-internals/optimization-and-ub.html)も参照してください。

```text
# x86-64 System V ABI・Intel風表記で考える命令列の一例
# 実際のコンパイラ出力を今回採取したものではない
mov esi, 70                 # printfへ渡すintの値
lea rdi, [rip + format]     # 書式文字列へのポインタ
xor eax, eax               # この可変引数呼出しで使うベクトル引数は0
call printf
```

これは説明用の抜粋です。完全なアセンブリプログラムではなく、ラベル定義やスタックの整列等を省略しています。Windows x64の引数レジスタとは異なります。

## ③ アセンブラ — 機械語へ

アセンブラは、命令の表記を対象CPUの符号化へ変換し、オブジェクトファイルを作ります。例えばx86のIntel構文で`mov esi, 70`を表す符号化の一例は`BE 46 00 00 00`です。

ただし、**アセンブリの各行と機械命令・バイト列全体が、常に一対一で対応するわけではありません。** ラベル、データ定義、整列の指令などもあります。まだ確定しないシンボルへの参照について、リンカが後で調整する再配置情報も記録します。[GNU asの説明](https://sourceware.org/binutils/docs/as.html)では、セクション、シンボル、再配置を区別しています。コンパイラに内蔵されたアセンブラを使う構成もあります。

## ④ オブジェクトファイル → リンカ

通常のネイティブなオブジェクトファイルには、コードやデータのセクション、シンボル、再配置などの情報があります。LTO用の中間表現を含む形式もあるため、どのオブジェクトファイルも最終的な機械語だけを収めているとは限りません。

```text
main.o / main.obj の情報（概念図）
  定義するもの：main、Damage(int, int)
  必要とするもの：printfなど
  このほかに：コード・データの配置、後で調整する参照等
```

関数名が実際にどのシンボル名になるかは、名前修飾や対象ABIにも依存します。[シンボル・リンケージ・ABI](/runtime/cpp-internals/symbols-and-linkage.html)で扱います。リンカは入力されたオブジェクトやライブラリから必要な定義を解決し、配置や参照を調整して成果物を作ります。

- 必要な定義を解決できなければ、[未解決外部シンボル](/tools/build/link-errors.html)などのリンクエラーになります。
- 競合する定義があれば、多重定義のエラーになる場合があります。ただしinline関数やテンプレート等には複数の定義を認める条件があり、[ODR](/runtime/cpp-internals/translation-units-and-headers.html)違反がすべてリンク時に検出されるとも限りません。
- コンパイルが通ること、リンクが通ること、起動して正しく動くことは別々に確認します。

## ⑤ 実行ファイルとOSローダー

WindowsのPE、Linux等のELFは、コード・データに加え、配置や依存関係などの情報を収める形式です。**ディスク上の実行ファイルと、実行中のプロセスは別のもの**です。

Windowsで通常のプログラムを起動すると、OSとローダーがプロセスや初期スレッドを用意し、実行ファイルのイメージ、必要なDLL、スレッドのスタックなどを準備して、起動処理を進めます。プロセスは仮想アドレス空間だけでなく、ハンドルなどの資源や実行に必要な状態を持ちます。各処理の詳細な順序や遅延ロード等は、OSと実行形式に依存します。

メモリへマップすることは、ファイルの全ページを直ちにRAMへ読み終えることとは限りません。[仮想メモリ](/os/virtual-memory.html)と[実行ファイル・ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)を区別して読みます。起動の詳解は[プロセスが起動してmainへ到達するまで](/os/process-startup.html)にあります。

## ⑥ ランタイム初期化 → main()

Windowsの通常のMSVCコンソールアプリでは、CRTが提供する起動コードがランタイムを初期化し、対象となるグローバル初期化処理を呼び、利用者の`main`へ進みます。OSが直接`main`というC++関数名を探して呼ぶ、という説明にはしません。[MicrosoftのCRT初期化](https://learn.microsoft.com/en-us/cpp/c-runtime-library/crt-initialization?view=msvc-170)が、この構成を説明しています。

**「staticな変数のコンストラクタは全部main前」「初期化順は全部未規定」とは言えません。** 静的初期化と動的初期化、関数内static、inline変数等で規則が異なります。非ブロック変数の動的初期化には遅延を認める規則もあり、関数内staticの動的初期化は通常、初めて宣言を通るときに行います。[非ブロック変数の動的初期化](https://eel.is/c++draft/basic.start.dynamic)と[関数内staticの規則](https://eel.is/c++draft/stmt.dcl)を参照してください。

他のグローバル変数の動的初期化が終わっていると当てにする設計では、必要な順序が保証されるか確認します。背景は[記憶域期間と寿命](/runtime/memory/storage-duration-and-lifetime.html)にまとめています。

## ⑦ 関数呼び出しとCPU命令

`Damage(hp, 30)`の呼出しが実際に残る場合、引数や戻り値をどこに置くかは呼出規約が決めます。例えば通常のWindows x64規約なら、先頭の2個のint引数は`ECX`・`EDX`、intの戻り値は`EAX`を使います。floatやdoubleは別の規則です。[Microsoftのx64呼出規約](https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-170)を参照してください。

通常のx64のcall/retによる呼出しでは、戻り先をスタックへ記録し、関数の処理後にそこへ戻ります。インライン展開、末尾呼出しへの変形、例外等によって、ソース上の関数ごとにこの形が残るとは限りません。[関数呼び出し・コールスタック](/runtime/cpp-internals/function-calls-and-cpu.html)で、規約と観察方法を扱います。

CPUでは命令の取得、デコード、実行などが進みます。処理時間は命令の依存関係、分岐予測、メモリアクセス等に影響され、クロック周波数から実行命令数や関数の時間を一律には求められません。[キャッシュと分岐予測](/runtime/cpp-internals/cache-branch-simd.html)にもつながります。

## この地図の使い方(エラーの切り分け)

| 症状 | 主に調べる工程 | 行き先 |
| --- | --- | --- |
| `'Enemy' was not declared` | ②宣言・名前探索等 | [ヘッダーと前方宣言](/runtime/cpp-internals/translation-units-and-headers.html) |
| `undefined reference to ...` | ④必要な定義とリンク入力 | [リンクエラー](/tools/build/link-errors.html) |
| `multiple definition of ...` | ④競合する定義と規則 | [ODR](/runtime/cpp-internals/translation-units-and-headers.html) |
| 必要なDLLがなく起動できない | ⑤依存関係と探索条件 | [DLL](/runtime/cpp-internals/object-files-and-libraries.html) |
| mainへ入る前にクラッシュ | ⑤⑥ローダー・起動処理・初期化等 | [プロセス起動](/os/process-startup.html) |

症状だけで原因を一つに決めず、エラーメッセージ、停止位置、コールスタック等から工程を絞ります。

## Unity/C# との対応

C#を通常の.NET環境で実行する構成では、CILとメタデータを含むアセンブリを作り、JIT等がCPU向けコードへ変換します。一方、Native AOTは発行時にネイティブコードを作ります。[.NETの管理実行](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process)と[Native AOT](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)は、異なる実行方式として読みます。

このページのC++の例は事前コンパイルですが、「C++という言語にはJITが存在しない」という一般則ではありません。[Clang-Repl](https://clang.llvm.org/docs/ClangRepl.html)は、C++をLLVM IRへ変換してJITで実行する具体例です。

.NETのアセンブリも拡張子が.dllになることがありますが、**ネイティブDLLのインポート解決と、管理アセンブリの型・メタデータのロードを同じ処理としては扱いません**。[Assemblies in .NET](https://learn.microsoft.com/en-us/dotnet/standard/assembly/)で役割を確認できます。UnityのIL2CPPはILからC++を生成し、ネイティブのツールチェーンにつなげる構成です。[IL2CPPの本文](/languages/csharp/il2cpp.html)を参照してください。

## 理解度チェック

1. 前処理は何を単位に、どの規則を使って変換しますか。型検査とは何が違いますか。
2. コンパイル・リンク・起動の成功は、それぞれ何を確認したことになりますか。
3. CRTの起動コード、main、関数内staticの動的初期化は、同じ時点の処理ですか。

## 演習

対象のコンパイラを用意して、前処理出力、アセンブリ、シンボルを別々に観察します。GCC系なら`g++ -E main.cpp`、`g++ -O2 -S -masm=intel main.cpp`、`g++ -c main.cpp`と`nm main.o`等が入口です。出力される形式・命令・シンボルは、ターゲットとオプションに応じて確認してください。

既存の<a href="/study/samples/cpp/journey_main.cpp">journey_main.cpp</a>も題材にできます。プロセスとスレッドを観察する場合は、[Windowsのプロセス観察サンプル](/practice/process/windows-process-observation.html)へ進んでください。

本文の対象はC++17/20の一般的なネイティブアプリ、GCC系の分割コンパイル、および通常のMSVC/Windows起動構成です。2026-11-03に上記一次資料と照合しました。説明用コード・命令列・演習コマンドを今回すべて実行した記録ではありません。コンパイラ出力の実測や、全環境で同じ起動順を保証する記事でもありません。

---

関連項目：[学習ガイド](/runtime/cpp-internals/) / [翻訳単位・ヘッダー・ODR](/runtime/cpp-internals/translation-units-and-headers.html)
