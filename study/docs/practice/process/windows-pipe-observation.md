---
title: 親子プロセスでパイプの終端を調べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: windows-pipe-observation
  order: 1
  summary: 子プロセスの標準出力を親で受け取り、最後の書き込み端を閉じた後にパイプの終端を確認する。
  aliases: [CreatePipe, CreateProcessW, STARTUPINFOEX, PeekNamedPipe, ERROR_BROKEN_PIPE, 親子プロセス, 標準出力]
  verification: Windows x64のMSVCでビルド・実行し、子の出力と最後の書き込み端を閉じた後のERROR_BROKEN_PIPEを確認（2026-11-06）
---

# 親子プロセスでパイプの終端を調べる

1つの実行ファイルを使います。親として起動したプログラムは、自分自身を `--child` 付きで起動します。子は短いメッセージを標準出力に書き、親はパイプから受け取ります。親は、自分の書き込み端を残した場合と閉じた後を比べます。[Windowsのパイプと標準入出力](/os/pipes-and-process-io.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/process/windows-pipe-observation/pipe_observation.cpp" download>pipe_observation.cpp</a>を新しい作業フォルダーに保存します。Visual Studioの **x64 Native Tools Command Prompt** でそのフォルダーを開き、次を実行します。[Microsoftのコマンドライン用C++ツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170)

```bat
cl /nologo /std:c++20 /EHsc /W4 pipe_observation.cpp
pipe_observation.exe
```

```text
parent received: child: hello through the pipe
child exited, buffer empty, parent writer still open
parent writer closed: ERROR_BROKEN_PIPE
```

1行目は親が子の出力を受信した結果です。2行目では、子が終了して、受信済みのデータを読み切ったことを `PeekNamedPipe` で確認しています。親の書き込み端がまだ開いているので、終端を確かめるためのブロッキング読み取りはこの時点では行いません。3行目は親の書き込み端を閉じた後の `ReadFile` が返した終端です。[MicrosoftのPeekNamedPipe](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-peeknamedpipe) · [MicrosoftのReadFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile#pipes)

子の出力は短い固定メッセージなので、このサンプルでは先に子の終了を待ちます。出力がバッファを満たす可能性があるプログラムでは、子が実行中に出力を読み進めます。例では標準エラーも同じパイプに向け、標準入力を `NUL` につないでいます。

## ソース

<<< @/public/samples/process/windows-pipe-observation/pipe_observation.cpp{cpp}
