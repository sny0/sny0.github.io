---
title: C++で2件のファイル読み取りをIOCPから回収する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: iocp-observation
  order: 1
  summary: 同じファイルに2件の読み取りを出し、同じ完了キーと異なるOVERLAPPEDポインターで結果を区別する。
  aliases: [IOCP, I/O完了ポート, completion key, GetQueuedCompletionStatus, OVERLAPPED]
  verification: Windows x64のMSVCでビルド・実行し、同じキーで2件の完了を回収して、それぞれ2バイトのMZを確認（2026-11-06）
---

# C++で2件のファイル読み取りをIOCPから回収する

プログラムは自分自身の `.exe` を読み取り専用で開き、先頭2バイトを読む要求を2件出します。どちらも同じファイルなので**完了キーは同じ**です。要求ごとに異なる `OVERLAPPED` を渡すため、完了ポートから戻るポインターで**どちらが終わったか**を判定できます。仕組みと図は[WindowsのI/O完了ポート](/os/io-completion-ports.html)にあります。

## 手元で動かす {#run-locally}

<a href="/study/samples/io/iocp-observation/iocp_observation.cpp" download>iocp_observation.cpp</a>を新しい作業フォルダーに保存します。Windows 10／11の **x64 Native Tools Command Prompt for VS** でそのフォルダーを開き、次を実行します。サンプルの実行時にファイルへの書き込みは行いません。[Microsoftのコマンドライン用C++ツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX iocp_observation.cpp
iocp_observation.exe
```

```text
submit 0: pending
submit 1: pending
complete 0: key=42, bytes=2, signature=MZ
complete 1: key=42, bytes=2, signature=MZ
```

上は実測した一例です。`submit` が `pending` か `immediate` か、どちらの `complete` が先かは環境や実行ごとに変わり得ます。成功時に確認するのは、**要求0と1の両方が一度ずつ完了し、キー `42`、2バイト、`MZ` が得られること**です。ここでは実行ファイル先頭のDOSヘッダーの識別子を読み、PE形式全体は解析しません。[MicrosoftのPE形式資料](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#ms-dos-stub)

## コードで見るポイント

1. `CreateFileW` の `FILE_FLAG_OVERLAPPED` でファイルを開き、`CreateIoCompletionPort` でファイルをポートに関連付けます。この時に指定した `42` が同じファイルの完了に付きます。
2. `ReadFile` が `TRUE` を返した要求と、`FALSE` と `ERROR_IO_PENDING` を返した要求を、どちらも回収対象にします。この例では完了通知を省略する設定を使っていません。開始時のそれ以外のエラーは新たな回収対象にせず、それより前に開始できた要求は最後まで回収します。
3. `GetQueuedCompletionStatus` が返した `OVERLAPPED*` を、発行時のポインターと照合します。戻り値が `FALSE` でもポインターがある場合は、その要求の失敗として回収します。この例でポートから続けて回収できなくなった場合は、まだ回収していない要求の専用イベントでI/O終了を待ってからプログラムを終えます。

この例は、一つのスレッドから発行と回収を行う構成です。物理ストレージへのアクセスや複数スレッドでの処理、キャンセルの成立を観察する例ではありません。イベントを主に使う例は[同期・非同期の読み取り比較](/practice/io/async-file-read-observation.html)、停止時の寿命管理は[Windowsの非同期I/Oをキャンセルする](/os/cancelling-overlapped-io.html)へ進んでください。

この実行ファイルが発行するファイル操作は、Procmonでも調べられます。[ファイル読み取りをトレースする実践](/practice/io/file-io-trace-observation.html)

## ソース

<<< @/public/samples/io/iocp-observation/iocp_observation.cpp{cpp}
