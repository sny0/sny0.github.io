---
{
  "title": "OS",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": false,
    "section": "reference",
    "format": "index",
    "domain": "os"
  }
}
---

# OS

プロセス、メモリ、スレッド、入出力の仕組みを調べる。

## 辞典の本文

- [OSの役割 — アプリとハードウェアをつなぐ](/os/operating-system-basics.html)
- [PEローダーがEXEとDLLを配置する仕組み — RVA・再配置・IAT](/os/pe-loading-and-imports.html)
- [WindowsのI/O完了ポート（IOCP） — 要求の発行と完了の回収](/os/io-completion-ports.html)
- [Windowsのスレッドスケジューリング — 実行・待機・実行可能](/os/thread-scheduling.html)
- [Windowsのパイプと子プロセスの標準入出力](/os/pipes-and-process-io.html)
- [Windowsのハンドルとカーネルオブジェクト](/os/windows-handles.html)
- [Windowsのファイルキャッシュと先読み](/os/windows-file-cache.html)
- [Windowsのファイル書き込みと永続化](/os/file-write-and-durability.html)
- [Windowsの非同期I/Oをキャンセルする — 要求・完了・解放](/os/cancelling-overlapped-io.html)
- [システムコールでユーザーモードからカーネルモードへ](/os/system-calls-and-privilege.html)
- [ファイルとパス — 名前からデータを開くまで](/os/files-and-paths.html)
- [ファイルを読むと内部で何が起きるか](/os/file-read-journey.html)
- [メモリマップドファイル — ファイルの範囲をアドレスへ対応させる](/os/memory-mapped-files.html)
- [仮想メモリ — アドレス変換・ページ・予約とコミット](/os/virtual-memory.html)
- [実行ファイルを起動してmainへ到達するまで — プロセス・スレッド・ローダー](/os/process-startup.html)
- [非同期I/O — 要求・完了・バッファの寿命](/os/asynchronous-file-io.html)

## この分野の学習ガイド

- [第8章 OSの仕組み](/guide/low-level/operating-system.html) — 学習計画・概要

## 作って試す

- [C++で2件のファイル読み取りをIOCPから回収する](/practice/io/iocp-observation.html)
- [C++とC#でファイルのbytes・位置・EOFを観察する](/practice/io/file-read-observation.html)
- [C++とC#で読取り専用ファイルマッピングを観察する](/practice/io/mapped-file-observation.html)
- [C++とC#で非同期readの開始・完了・寿命を観察する](/practice/io/async-file-read-observation.html)
- [Windowsで2回のファイル読み取りをトレースする](/practice/io/file-io-trace-observation.html)
- [WindowsでPID・TID・子プロセスとmain前の初期化を観察する](/practice/process/windows-process-observation.html)
- [Windowsで予約・コミット・初回書き込みを観察する](/practice/memory/windows-memory-observation.html)
- [親子プロセスでパイプの終端を調べる](/practice/process/windows-pipe-observation.html)

## 扱う範囲・増補する項目

- カーネル
- プロセス・スレッド
- 仮想メモリ
- システムコール
- ファイル・非同期I/O
- IPC
- 権限
