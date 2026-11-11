---
title: ライブラリ・API・SDK — 用意された機能を使う
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: compilers
  summary: ゲームからウィンドウや画像の機能を呼ぶ場面で、ライブラリ、API、SDK、ヘッダー、パッケージ、依存関係の意味を説明する。
  aliases: [ライブラリ, library, API, SDK, ヘッダー, header, パッケージ, package, 依存関係, dependency, 静的ライブラリ, DLL, 動的ライブラリ]
  verification: MicrosoftのWindows SDK・Win32 API・C++ライブラリ・NuGetの資料に照合（2026-11-07）
---

# ライブラリ・API・SDK — 用意された機能を使う

ゲームを作るときは、ウィンドウを開いたり画像ファイルを読んだりする処理に、既存の機能を使えます。機能を呼び出すための約束がAPI、その処理を実装した部品がライブラリ、開発に使う一式がSDKです。[MicrosoftのWindows SDK](https://learn.microsoft.com/en-us/windows/apps/windows-sdk/)

## まず三つの役割を区別する

| 用語 | 意味 | 例 |
| --- | --- | --- |
| **ライブラリ** | 他のプログラムから使えるようにまとめたコードや機能。 | 数学の計算、画像の読み込み、音声の再生を担当する部品。 |
| **API**（Application Programming Interface） | 機能を利用する側との接点。呼び出し方や、渡す値・返る値などの規則を含む。 | ウィンドウを作る関数の名前、引数、結果、失敗時の規則。 |
| **SDK**（Software Development Kit） | 特定の環境や製品向けに開発するための一式。 | ヘッダー、ライブラリ、開発ツールなどをまとめたWindows SDK。 |

APIの説明を読むと、「この関数へどんな値を渡すか」「成功と失敗を何で判断するか」「返った資源をいつ解放するか」を調べられます。例えばWindowsの`CreateWindowExW`は、ウィンドウ名や寸法などを受け取り、成功時はウィンドウを操作するためのハンドルを、失敗時は`NULL`を返します。[CreateWindowExWの引数と戻り値](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-createwindowexw)

## 画像を読み込む依頼で考える

次の図では、説明用の架空のAPI `load_image` を使います。ゲームは画像のパスを渡し、ライブラリがファイルの内容を読んで画像として解釈し、結果を返すものとします。利用側はAPIの規則に従い、受け取った画像を使ったり、失敗を処理したりします。

<figure class="study-figure">
  <img src="/images/compilers/libraries-apis-and-sdks.svg" alt="ゲームがAPIの規則に従って画像のパスを渡し、ライブラリの実装が画像を読む。画像または失敗の情報が呼び出し元へ返る。SDKには開発に使うヘッダー、ライブラリ、ツールなどが含まれる。" width="760" height="430" loading="lazy">
  <figcaption>上は呼び出しと結果、下は開発に使う一式の例です。SDKの内容は製品によって異なります。<a href="/study/images/compilers/libraries-apis-and-sdks.svg" target="_blank" rel="noopener noreferrer">APIとSDKの図を拡大</a></figcaption>
</figure>

APIという言葉は、同じプロセス内の関数呼び出し以外にも使われます。例えばサーバーがHTTPで受け付けるAPIでは、URLや要求の形式、応答の意味が接点になります。利用側は、その接点を通じて相手の機能を使います。[MicrosoftのWeb APIの設計](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design) · [HTTP通信](/network/http-messages.html)

## C++のヘッダーと実装

C++では、別のファイルにある関数を使うために、その関数の名前、引数、返す型などの**宣言**を読めるようにします。宣言をまとめるファイルが**ヘッダー**で、`#include`で取り込む形がよく使われます。関数の中身である**定義**は、別のソースファイルやライブラリに置くことができます。[Microsoftのヘッダーファイル](https://learn.microsoft.com/en-us/cpp/cpp/header-files-cpp?view=msvc-170)

```cpp
// 説明用の宣言。関数の中身は別に用意する。
int add_score(int current, int bonus);
```

コンパイラーがこの宣言を読むと、呼び出しの名前や型を確かめられます。後でリンクする際には、使う関数の実装もそろえる必要があります。ヘッダー内に定義を置く形のライブラリもあるため、配布される部品を確認してビルドへ加えます。[Microsoftのヘッダーと定義](https://learn.microsoft.com/en-us/cpp/cpp/header-files-cpp?view=msvc-170) · [ソースコードから実行まで](/compilers/source-code-and-execution.html)

## 静的ライブラリと動的ライブラリ

**静的ライブラリ**は、リンク時に使うコードをまとめたものです。必要なオブジェクトコードを取り出し、実行ファイルなどへ組み込む構成で使います。WindowsのC++では`.lib`という拡張子が一例です。[Microsoftの静的ライブラリ](https://learn.microsoft.com/en-us/cpp/build/walkthrough-creating-and-using-a-static-library-cpp?view=msvc-170)

**動的ライブラリ・共有ライブラリ**は、実行時にプロセスへ読み込んで使う形のライブラリです。WindowsのネイティブDLLを使う構成では、ビルド時に参照する**インポートライブラリ**も`.lib`になる場合があります。同じ拡張子のファイルでも、含まれる情報と使い方を確認します。[MicrosoftのDLLとリンク](https://learn.microsoft.com/en-us/cpp/build/linking-an-executable-to-a-dll?view=msvc-170) · [オブジェクトファイル・DLLの詳細](/runtime/cpp-internals/object-files-and-libraries.html)

## パッケージと依存関係

**パッケージ**は、コードや関連するファイルを配布するためにまとめた単位です。例えば.NETのNuGetパッケージには、ライブラリのDLL、バージョンなどを記録した情報、関連ファイルを含められます。**パッケージマネージャー**は、取得やプロジェクトへの追加などを支援する道具です。[MicrosoftのNuGetの役割](https://learn.microsoft.com/en-us/nuget/what-is-nuget)

アプリAがライブラリBを必要とするとき、AはBに**依存する**といいます。Bが別のライブラリCを必要とすれば、Aを動かすためにCも必要になる場合があります。パッケージにはこうした依存先を記録でき、復元時に必要なバージョンをそろえます。[Microsoftのパッケージの依存関係](https://learn.microsoft.com/en-us/nuget/concepts/dependency-resolution)

## 機能を追加するときに確認するもの

1. 使いたい機能のAPIを読み、入力、結果、失敗、資源の解放の規則を確認する。
2. 対象OS・CPU・言語に合うSDKやパッケージを用意する。
3. ヘッダー、ライブラリ、必要な実行時ファイルを、指定された方法でプロジェクトへ追加する。
4. ビルドと実行を確かめ、APIの結果を使って処理を続ける。

具体的な設定は、利用するライブラリの配布方法とビルドツールによって変わります。API名、配布物の版、対象環境を合わせて調べると、どの部品を用意するか追えます。[Windows SDKの構成](https://learn.microsoft.com/en-us/windows/apps/windows-sdk/) · [ビルドツール](/tools/build/build-tools-cmake.html) · [開発ツールの基本](/tools/development-tools-basics.html)
