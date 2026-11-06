---
title: PEローダーがEXEとDLLを配置する仕組み — RVA・再配置・IAT
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: Windows x64のPEでファイルオフセット、RVA、実行時VAを対応付ける。セクションのゼロ埋め、ASLR時のベース再配置、通常インポートと遅延インポートをDUMPBINの結果から読み解く。
  aliases: [PE, PE32+, Windowsローダー, RVA, VA, ASLR, ベース再配置, DIR64, IAT, インポートアドレステーブル, 遅延ロード, delay load, DUMPBIN]
  verification: Visual Studio 2022のMSVC x64でビルドし、DUMPBINのHEADERS・IMPORTS・RELOCATIONSと実行終了コードを確認（2026-11-06）
---

# PEローダーがEXEとDLLを配置する仕組み — RVA・再配置・IAT

Windows x64のネイティブなEXEやDLLを読み込むとき、WindowsはPEヘッダーを読み、コードやデータの仮想アドレスを決めます。デバッガーで見えるアドレスからファイル中のバイトを探すには、どこを起点にした数値かを区別します。ここではディスク上の配置から、外部DLLの関数を呼べる状態になるまでを追います。[プロセスを起動してmainへ到達するまで](/os/process-startup.html) · [MicrosoftのPE/COFF仕様](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)

## セクションをファイルから仮想アドレスへ対応付ける

| 用語 | 起点と意味 | この例の `.data` 先頭 |
| --- | --- | --- |
| ファイルオフセット | ディスク上のPEファイルの先頭から数えたバイト数 | `0x18E00` |
| RVA | マッピングされたイメージの先頭から数えたバイト数 | `0x1B000` |
| VA | プロセスの仮想アドレス。実際のロードベースにRVAを足す | ベースが`0x150000000`なら`0x15001B000` |

セクション表には、ファイル上の先頭`PointerToRawData`とサイズ`SizeOfRawData`、イメージ上の先頭RVA`VirtualAddress`とサイズ`VirtualSize`があります。セクション内のファイルに裏付けられたバイトなら、`RVA - VirtualAddress`でセクション内の位置を求め、`PointerToRawData`に足せます。この例で`RVA 0x1B008`を探すと、`.data`内の位置は`0x8`、ファイルオフセットは`0x18E08`です。[MicrosoftのPE/COFF仕様 — セクション表とセクションデータ](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#section-table-section-headers)

<figure class="study-figure">
  <img src="/images/os/pe-loading-and-imports.svg" alt="ファイルオフセット0x18E00の.dataがRVA 0x1B000に対応する。ファイルのC00バイトに続く仮想領域の残りはゼロ埋めされる。ロードベースの差分で絶対ポインターを補正し、IATには外部関数の実行時VAを入れる。" width="760" height="480" loading="lazy" />
  <figcaption>セクションの対応付け、イメージ内の絶対アドレスの補正、外部関数のアドレス解決は、それぞれ別の情報を使います。<a href="/study/images/os/pe-loading-and-imports.svg" target="_blank" rel="noopener noreferrer">PEロードの図を拡大</a></figcaption>
</figure>

この例の`.data`はファイル上で`0xC00`バイト、ヘッダーにある`VirtualSize`は`0x2C78`バイトです。ファイルに含まれる範囲より後ろの仮想領域はゼロで初期化されます。`RVA 0x1C000`はセクション内の`0x1000`なので、このゼロ埋め領域にあります。ファイルとメモリでは整列の単位が異なり、ファイル側のサイズがパディングにより大きくなることもあります。読み書きや実行の許可はセクションの属性に従います。マッピングされたページと、その時点でRAMにあるページの違いは仮想メモリの記事で扱います。[MicrosoftのPE/COFF仕様 — セクションデータ](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#section-data) · [仮想メモリ](/os/virtual-memory.html)

## ASLRでロードベースが変わると絶対アドレスを補正する

PEヘッダーの`ImageBase`は、リンカーが想定した基準アドレスです。ASLR（アドレス空間配置のランダム化）に対応するイメージは、実行時に別の基準アドレスへ配置できます。実際に別の位置へ置く場合、ローダーはベース再配置表の各項目を読み、実際のベースと`ImageBase`の差を対象フィールドへ反映します。Windows x64の`DIR64`は64ビットのフィールドにこの差を加えます。[MicrosoftのDYNAMICBASE](https://learn.microsoft.com/en-us/cpp/build/reference/dynamicbase-use-address-space-layout-randomization?view=msvc-170) · [MicrosoftのPE/COFF仕様 — ベース再配置](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#the-reloc-section-image-only)

たとえば、後で作るEXEには、`RVA 0x1B008`に`0x14001B000`を格納したポインターがあります。実際のベースを仮に`0x150000000`とすると、想定ベース`0x140000000`との差は`0x10000000`です。ポインターの置き場所は実行時VA`0x15001B008`、補正したポインターの値は`0x15001B000`です。値も置き場所も動きますが、イメージ内の相対位置は保たれます。同じイメージ内で完結する相対呼び出しは、呼び出し元と宛先が同じ量だけ移動するので変位をそのまま使えます。[COFFのREL32を実物で確認する](/compilers/coff-relocations.html)

## インポートを解決してIATを埋める

通常のインポートでは、イメージのインポートディレクトリが、依存するDLLと、必要なエクスポートの名前または序数を示します。DLLは読み込み済みのものが使われる場合もあり、名前の解決にはWindowsのDLL検索規則が関わります。エクスポートが別モジュールへ転送されている場合は、その転送先も解決されます。解決された実行時VAはIAT（Import Address Table）のスロットに入り、呼び出し側はそのスロットを経由できます。PE32+のIATスロットは8バイトです。[MicrosoftのPE/COFF仕様 — インポートとエクスポート](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#the-idata-section) · [MicrosoftのDLL検索順](https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-library-search-order)

| 方式 | 解決するタイミングと担当 |
| --- | --- |
| 通常インポート | モジュールをロードするときにWindowsのローダーが解決する。EXEの通常の起動時依存もここに含まれる |
| MSVCの遅延インポート | 該当関数の初回呼び出しでリンカーが用意した中継コードからヘルパーへ進む。ヘルパーがDLLと関数を解決し、遅延IATを更新する |
| 明示ロード | アプリが必要な時点で`LoadLibraryExW`などを呼び、`GetProcAddress`で関数アドレスを取得する |

遅延インポートは`/DELAYLOAD`とインポートライブラリを使い、PEに通常のインポートとは別のディレクトリを持ちます。ヘルパーが対象のDLLを解決する時点で、そのDLLが他の依存からすでにロードされている場合もあります。`dumpbin /imports`はPEが宣言する依存を読む操作です。明示ロードで呼び出すDLLも含め、実行中にどのモジュールがロード済みかを調べるときはデバッガーなどで確認します。[Microsoftの遅延ロード](https://learn.microsoft.com/en-us/cpp/build/reference/linker-support-for-delay-loaded-dlls?view=msvc-170) · [Microsoftの明示ロード](https://learn.microsoft.com/en-us/windows/win32/dlls/run-time-dynamic-linking)

## MSVCで作ったPEをDUMPBINで読む

次のコードを`loader-demo.cpp`として保存します。`live_pointer`の初期値にはイメージ内のアドレスが入り、`zero_data`はゼロ初期化されます。コマンドラインに引数を追加すると、遅延ロードを指定した関数の呼び出しを通ります。

```cpp
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winver.h>

int live_data = 7;
int* volatile live_pointer = &live_data;
volatile int zero_data[1024];

int main(int argc, char**) {
    if (argc > 1) {
        DWORD unused = 0;
        GetFileVersionInfoSizeW(L"loader-demo.exe", &unused);
    }
    return GetCurrentProcessId() != 0
        && *live_pointer == 7 && zero_data[1023] == 0 ? 0 : 1;
}
```

Visual Studioの「x64 Native Tools Command Prompt」で、ソースを保存したフォルダーから実行します。[DUMPBINのHEADERS](https://learn.microsoft.com/en-us/cpp/build/reference/headers?view=msvc-170) · [DUMPBINのIMPORTS](https://learn.microsoft.com/en-us/cpp/build/reference/imports-dumpbin?view=msvc-170)

```bat
cl /nologo /Od /GL- /Fe:loader-demo.exe loader-demo.cpp version.lib delayimp.lib /link /DYNAMICBASE /INCREMENTAL:NO /DELAYLOAD:version.dll
dumpbin /headers /imports loader-demo.exe
dumpbin /relocations loader-demo.exe
loader-demo.exe
echo %ERRORLEVEL%
loader-demo.exe inspect
echo %ERRORLEVEL%
```

MSVC 19.35で作ったPEでは、通常インポートに`KERNEL32.dll`の`GetCurrentProcessId`、遅延インポートに`VERSION.dll`の`GetFileVersionInfoSizeW`が出ました。`/relocations`のベース再配置一覧には、ページRVA `0x1B000`のブロック内にオフセット`0x8`の`DIR64`がありました。この項目が先ほどの`live_pointer`に対応します。どちらの起動も終了コード`0`でした。`GetFileVersionInfoSizeW`の戻り値はこの例では使っていないので、バージョン情報の取得結果とは分けて読みます。セクションの位置や各テーブルの出力値は、MSVCやWindows SDKの版、リンク設定により変わります。
