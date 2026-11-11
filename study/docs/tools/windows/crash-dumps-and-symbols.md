---
title: クラッシュダンプとPDBで停止位置をたどる
study:
  source: 新規執筆
  status: published
  summary: Windowsのユーザーモードダンプから例外、レジスター、モジュールを読み、同じビルドのPDBで関数とソース行を調べる。
  section: reference
  format: article
  domain: tools
  aliases: [クラッシュダンプ, ミニダンプ, minidump, PDB, シンボル, WinDbg, ASLR, RVA, 例外コンテキスト]
  verification: Microsoftのユーザーモードダンプ形式、PDB照合とWinDbgのコマンド資料に照合（2026-11-06）
---

# クラッシュダンプとPDBで停止位置をたどる

Windowsのゲームがクラッシュし、現場で再現できないときでも、クラッシュダンプに残った状態を調べられます。例外を記録したダンプには、例外コード、発生したスレッド、レジスターの値などが含まれます。ロード済みのEXEやDLLの位置を合わせると、停止した命令がどのモジュールのどこにあったかが分かります。[Microsoftの例外情報ストリーム](https://learn.microsoft.com/en-us/windows/win32/api/minidumpapiset/ns-minidumpapiset-minidump_exception_stream) · [ユーザーモードダンプの解析](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/analyzing-a-user-mode-dump-file)

## モジュールの先頭から何バイトかを求める

実行中の命令アドレスはプロセスの仮想アドレス（VA）です。その値からロード済みモジュールのベースアドレスを引くと、モジュールの先頭からの位置を示すRVAになります。ASLRによって別の実行でベースが変わっても、同じバイナリの同じ命令は同じRVAで表せます。`game+0x1234` の `0x1234` はモジュールの先頭からの距離で、`game!UpdateActor+0x34` の `0x34` は関数の先頭からの距離です。[MicrosoftのPE形式とRVA](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format) · [PEのロードとインポート](/os/pe-loading-and-imports.html)

<figure class="study-figure">
  <img src="/images/tools/crash-dumps-and-symbols.svg" alt="例外コンテキストのRIPが00007ff7 40001234、game.exeのロードベースが00007ff7 40000000なら、差はRVA 0x1234。ビルドの識別情報が一致するPDBを使うと、停止位置をUpdateActorの先頭から0x34、Actor.cppの87行目に対応づけられる。" width="760" height="320" loading="lazy">
  <figcaption>命令のVAとモジュールのロードベースはダンプから読みます。関数名やソース行は、対応するデバッグ情報を使って調べます。<a href="/study/images/tools/crash-dumps-and-symbols.svg" target="_blank" rel="noopener noreferrer">アドレスの対応図を拡大</a></figcaption>
</figure>

## 実行ファイルとPDBの組を照合する

WindowsのネイティブPDBには、関数名、ソース行、ローカル変数を調べるためのデバッグ情報を記録できます。MSVCのPDBを照合する場合、EXEやDLLにも記録された署名とAgeを使います。現行のMSVCで一般的なCodeView形式では、署名はGUIDです。Ageは一致を確かめるための値で、経過時間として扱いません。ファイル名や製品バージョンが同じでもビルドは異なり得るため、出荷したバイナリと対応するPDBをビルドごとに保管します。[Microsoft DIAのPDB照合](https://learn.microsoft.com/en-us/visualstudio/debugger/debug-interface-access/idiadatasource-loadandvalidatedatafrompdb) · [ビルド構成とシンボル](/tools/build/build-configurations.html)

PDBが手元にない場合にも、ダンプに収録された例外コードやレジスター、モジュール名とRVAは調べられます。ダンプから読めるメモリは収録された範囲に限られ、最適化で消えたローカル変数はPDBが一致していても値を表示できない場合があります。最適化で複数の処理が同じ命令に対応したときは、表示されたソース行に加えて命令とレジスターを読みます。[Microsoftのミニダンプに収録する情報](https://learn.microsoft.com/en-us/windows/win32/api/minidumpapiset/ne-minidumpapiset-minidump_type) · [最適化済みコードのデバッグ](https://learn.microsoft.com/en-us/visualstudio/debugger/how-to-debug-optimized-code)

## WinDbgで例外から調べる

WinDbgで例外情報を含むユーザーモードのクラッシュミニダンプを開きます。次の例では、対象が `game.exe` で、そのビルドのPDBを `C:\build\symbols` に保管しています。新しい解析セッションで `.symfix` を使い、Microsoftの公開シンボルサーバーを設定してから、自分のPDBの場所を追加します。`lmv m game` で `game` のロード範囲とシンボルの状態を確認します。[WinDbgのシンボルパス](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/symbol-path) · [WinDbgの `.symfix`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-symfix--set-symbol-store-path-) · [WinDbgの `.reload`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-reload--reload-module-) · [WinDbgの `lm`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/lm--list-loaded-modules-)

```text
.symfix
.sympath+ C:\build\symbols
.reload /f game.exe
lmv m game
!analyze -v
.exr -1
.ecxr
k
u @rip L1
```

`!analyze -v` で概要を見たあと、`.exr -1` で例外の種類と引数を読みます。`.ecxr` は例外時のレジスターコンテキストを選ぶので、その直後の `k` と `u @rip L1` で例外を起こしたスレッドのスタックと、`RIP` が指す命令を調べられます。[WinDbgの `!analyze`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-analyze) · [WinDbgの `.exr`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-exr--display-exception-record-) · [WinDbgの `.ecxr`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-ecxr--display-exception-context-record-) · [WinDbgの `k`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/k--kb--kc--kd--kp--kp--kv--display-stack-backtrace-) · [WinDbgの `u`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/u--unassemble-)

下は値の読み方を示すために作った表示例です。PDBで名前が解決され、ソース行も取得できた場合を想定しています。

```text
ExceptionCode:    c0000005
ExceptionAddress: 00007ff7`40001234
Parameter[0]:    00000000`00000001
Parameter[1]:    00000000`00000010

rcx=00000000`00000000
rip=00007ff7`40001234
game!UpdateActor+0x34 [Actor.cpp @ 87]:
00007ff7`40001234 894110  mov dword ptr [rcx+10h],eax
```

`0xC0000005` はアクセス違反です。この例では最初の例外引数が1なので書き込みで、次の引数が書き込み先の `0x10` です。`RCX` は0で、命令が書き込もうとした先は `RCX + 0x10` です。ここから、その関数がどこで対象を受け取ったかを呼び出し元へたどります。再現できる場合は、生きているプロセスにブレークポイントを置き、問題の値が作られたところを追えます。[Microsoftのアクセス違反の読み方](https://learn.microsoft.com/en-us/shows/inside/c0000005) · [ブレークポイントとデータブレークポイント](/tools/windows/debugger-breakpoints-and-watchpoints.html) · [静的解析とサニタイザー](/tools/build/debugging-and-analysis.html)
