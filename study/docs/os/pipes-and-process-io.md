---
title: Windowsのパイプと子プロセスの標準入出力
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: 子プロセスの標準出力が親へ届くまでを、パイプのバッファ、ハンドルの継承、読み書きの待ち、終端に分けて追う。
  aliases: [匿名パイプ, anonymous pipe, IPC, stdin, stdout, stderr, CreatePipe, PeekNamedPipe, ERROR_BROKEN_PIPE]
---

# Windowsのパイプと子プロセスの標準入出力

ゲームのエディターからアセット変換ツールを起動すると、親プロセスはツールの標準出力を受け取り、ログ欄に表示できます。Windowsで匿名パイプを作ると、一方向にバイト列を送るバッファと、その両端を操作するハンドルが用意されます。親が読み取り側を持ち、子の標準出力に書き込み側を渡すと、子が書いたデータを親が読めます。[Microsoftの匿名パイプ](https://learn.microsoft.com/en-us/windows/win32/ipc/anonymous-pipe-operations)

## 親と子がどの端を持つか

<figure class="study-figure">
  <img src="/images/os/pipes-and-process-io.svg" alt="子は書き込み端に標準出力を書き、バッファにたまったバイトを親が読み取り端から読む。親にも書き込み端のハンドルが残っている間は、子が終了してバッファが空になっても書き込み側は開いている。最後の書き込み端を閉じて空になると、読み取りは終端に達する。" width="760" height="320" loading="lazy">
  <figcaption>バイトの流れと、各プロセスが持つハンドルを分けて追います。<a href="/study/images/os/pipes-and-process-io.svg" target="_blank" rel="noopener noreferrer">パイプの図を拡大</a></figcaption>
</figure>

1. 親が `CreatePipe` で読み取り端と書き込み端を作ります。
2. 親が `CreateProcessW` に標準ハンドルを設定して子を起動します。`STARTF_USESTDHANDLES` を使う場合は、標準入力・標準出力・標準エラーのハンドルをそろえます。子に渡す継承可能なハンドルを絞るには、`STARTUPINFOEX` の `PROC_THREAD_ATTRIBUTE_HANDLE_LIST` を使えます。
3. 親は使わない書き込み端を閉じ、読み取り端から出力を受け取ります。子は別のプロセスなので、親が自分の書き込みハンドルを閉じても、子に渡したハンドルは使えます。[標準入出力をリダイレクトして起動する例](https://learn.microsoft.com/en-us/windows/win32/procthread/creating-a-child-process-with-redirected-input-and-output) · [継承するハンドルの指定](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute) · [Windowsのハンドル](/os/windows-handles.html)

子へ標準入力を送る場合は、反対向きのパイプをもう1本作ります。親が書き、子が読みます。標準出力と標準エラーを別々に扱うなら、出力用もそれぞれに用意します。複数の出力を同じパイプに書く場合は、受け取ったバイトだけから元の出力先を区別することはできません。[Microsoftのプロセス間通信の概要](https://learn.microsoft.com/en-us/windows/win32/ipc/interprocess-communications)

## バッファが空のときと、書き手がいなくなったとき

| パイプの状態 | 読み書きの動き |
| --- | --- |
| 読めるデータがある | 親が `ReadFile` で受け取る。1回の読み取りをログ1行と見なさず、必要なら区切りまで集める |
| バッファが空で、書き込み端が残っている | 同期読み取りは、データが届くか終端が分かるまで待つことがある |
| バッファが満杯で、書きたいデータが残っている | 同期書き込みは、読み手がバッファを空けるまで待つことがある |
| バッファが空で、最後の書き込み端も閉じている | Win32の匿名パイプでは `ReadFile` が失敗し、`GetLastError()` が `ERROR_BROKEN_PIPE` を返す。受信側では終端として扱える |

子の終了は、子が所有していたハンドルを閉じます。親に書き込み端のハンドルが残っていると、親の読み取りからはまだ書き手がいる状態に見えます。終了を待ったあとで出力を読む設計にも注意が必要です。子の出力がバッファを満たすと、子は書き込みで止まり、終了を待つ親も止まります。出力量が増えるツールでは、子が動いている間に出力を読み進めます。[匿名パイプでの読み書きと待機](https://learn.microsoft.com/en-us/windows/win32/ipc/anonymous-pipe-operations) · [ReadFileのパイプ終端](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile#pipes)

標準出力を使うツールでは、C/C++ランタイムなどが出力を自分のバッファにためることもあります。進捗を逐次表示する場合は、子がいつ出力をフラッシュするかと、親がいつパイプから読むかを分けて考えます。[MSVCの `fflush`](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/fflush?view=msvc-170)

実践では、親に書き込み端を意図的に残し、子が終了してもパイプの終端にならないことを確認します。出力を読み切ってから残った書き込み端を閉じると、次の読み取りで終端を観察できます。[親子プロセスでパイプの終端を調べる](/practice/process/windows-pipe-observation.html)
