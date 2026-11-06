---
title: WindowsのI/O完了ポート（IOCP） — 要求の発行と完了の回収
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: 複数のWindows非同期I/Oの完了を一つのポートで受け取る。完了キーとOVERLAPPEDの対応、即時成功でも通知が届く条件、失敗した完了の判定、ワーカーの並行度を説明する。
  aliases: [I/O完了ポート, IOCP, I/O Completion Port, completion key, 完了キー, CreateIoCompletionPort, GetQueuedCompletionStatus, PostQueuedCompletionStatus, FILE_SKIP_COMPLETION_PORT_ON_SUCCESS]
  verification: MicrosoftのWin32 API仕様と解説に照合（2026-11-06）
---

# WindowsのI/O完了ポート（IOCP） — 要求の発行と完了の回収

Windowsの**I/O完了ポート**（IOCP）は、複数のハンドルで発行した非同期I/Oの結果を、一つのキューに集める仕組みです。例えば、二つのファイルから三つの読み取りを出すと、それぞれの完了を同じポートから回収できます。ワーカーはポートを待ち、取り出したパケットの値からファイルと要求を特定します。[非同期I/Oの基礎](/os/asynchronous-file-io.html) · [Microsoft: I/O Completion Ports](https://learn.microsoft.com/en-us/windows/win32/fileio/i-o-completion-ports)

## ハンドルをポートに関連付ける

通常ファイルなら、まず`CreateFileW`で`FILE_FLAG_OVERLAPPED`を指定して開きます。読み取りを発行する前に、`CreateIoCompletionPort`でそのハンドルの完了通知の送り先を設定します。ポートを共有するファイルを後から追加する場合は、同じポートハンドルを渡します。[Microsoft: CreateIoCompletionPort](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-createiocompletionport)

| `CreateIoCompletionPort`の呼び方 | 起きること |
| --- | --- |
| `CreateIoCompletionPort(INVALID_HANDLE_VALUE, nullptr, 0, concurrency)` | ポートだけを作成する。完了キーの引数は無視される。 |
| `CreateIoCompletionPort(file, nullptr, key, concurrency)` | ポートを作成し、`file`を関連付ける。 |
| `CreateIoCompletionPort(file, port, key, 0)` | `file`を既存ポートに関連付ける。成功時の戻り値は同じ`port`。並行度の引数は無視される。 |

失敗時の戻り値は`nullptr`です。一つのハンドルが関連付くポートは一つで、関連付けはそのハンドルを閉じるまで続きます。同じ仕組みを、overlapped I/Oに対応するTCPソケットや名前付きパイプにも使えます。[Microsoft: CreateIoCompletionPort](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-createiocompletionport)

## 完了キーでハンドルを、ポインターで要求を見分ける

**完了キー**（`CompletionKey`）は、関連付け時にアプリが渡す`ULONG_PTR`の値です。同じハンドルから生じたI/O完了パケットには同じキーが入ります。ハンドルごとの状態を区別したい場合は、アプリで別々のキーを割り当てます。**`OVERLAPPED*`**は、`ReadFile`などに渡した構造体のアドレスです。一つのハンドルに複数の要求を出しても、要求ごとに異なる`OVERLAPPED`を渡せば、どの要求が完了したかを識別できます。[Microsoft: CreateIoCompletionPort](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-createiocompletionport) · [Microsoft: GetQueuedCompletionStatus](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus)

<figure class="study-figure">
  <img src="/images/os/io-completion-ports.svg" alt="キー10のファイルAに要求A1とA2、キー20のファイルBに要求B1を発行する。三つの完了が同じポートに入り、例ではA2、B1、A1の順に並ぶ。A1とA2のキーは同じ10で、OVERLAPPEDのアドレスは異なる。ワーカーはポートから結果を取り出す。" width="760" height="512" loading="lazy">
  <figcaption>完了した要求が一つのキューに集まります。各パケットの完了キーはハンドルとの対応、<code>OVERLAPPED*</code>は一回の読み取りとの対応を表します。<a href="/study/images/os/io-completion-ports.svg" target="_blank" rel="noopener noreferrer">完了通知の図を拡大</a></figcaption>
</figure>

例えば要求を表すC++の構造体に`OVERLAPPED`、バッファ、オフセット、アプリ上の要求IDをまとめ、そのアドレスを対応表から引けるようにします。結果を待つワーカーが別にいる場合は、発行前に対応を登録し、発行側と回収側がともに参照を終えるまで要求を保持します。IOCPが返すポインターは、アプリが渡した領域を指します。構造体を途中で移動させると対応が崩れるため、例えば可変長配列に格納した要求を扱う場合は再確保に注意します。[Microsoft: OVERLAPPED](https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-overlapped) · [Microsoft: GetQueuedCompletionStatus](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus)

## 発行結果から、回収を待つ要求を決める

完了通知を抑制する設定を使わず、関連付け済みの通常ファイルで`ReadFile`を呼んだ場合です。`FALSE`で戻ったら直後の`GetLastError()`で理由を調べます。[Microsoft: ReadFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile) · [Microsoft: 完了通知モード](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setfilecompletionnotificationmodes)

| `ReadFile`の戻り方 | 発行側でわかること | この要求の回収 |
| --- | --- | --- |
| `TRUE` | 読み取りは呼出し中に成功した。 | **即時成功でも完了パケットを回収する。** |
| `FALSE`＋`ERROR_IO_PENDING` | 要求が受理され、未完了として返った。 | 完了パケットで最終結果を確認する。 |
| `FALSE`＋ほかのエラー | 呼出し中にエラーが確定した。 | 発行側で結果を扱う。この要求のパケットは待たない。 |

通常の設定では、`TRUE`と`ERROR_IO_PENDING`を同じ回収経路にまとめられます。`TRUE`の分もポート側で一度だけ処理し、ポートから受け取るまで`OVERLAPPED`を保持します。ファイル末尾を表す`ERROR_HANDLE_EOF`は、発行時に確定する場合と、発行後の結果として受け取る場合があります。[Microsoft: Testing for the End of a File](https://learn.microsoft.com/en-us/windows/win32/fileio/testing-for-the-end-of-a-file) · [Microsoft: 即時完了と通知モード](https://devblogs.microsoft.com/oldnewthing/20190719-00/?p=102722) · [Microsoft: 即時失敗と通知の関係](https://devblogs.microsoft.com/oldnewthing/20211117-00/?p=105933)

通知を変える仕組みは、適用範囲で区別します。

| 設定 | 省略される通知 |
| --- | --- |
| ハンドルに`FILE_SKIP_COMPLETION_PORT_ON_SUCCESS`を設定 | そのハンドルの要求が**即時成功**したときの完了パケット。pendingになった要求は完了時に回収する。 |
| 要求の`OVERLAPPED.hEvent`に、有効なイベントハンドルの最下位ビットを1にした値を指定 | その要求の完了パケット。通常のイベントハンドルを設定するだけなら、この抑制条件には該当しない。 |
| ハンドルに`FILE_SKIP_SET_EVENT_ON_HANDLE`を設定 | 条件を満たしたときにファイルオブジェクト自身のイベントをシグナル状態にする処理。完了ポートへのパケットや、要求に明示したイベントの通知はこのフラグの対象外。 |

通知を省略する設定を使う経路では、即時成功を発行側で処理するなど、受理した要求をどこで終端として扱うかを設定と合わせます。[Microsoft: SetFileCompletionNotificationModes](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setfilecompletionnotificationmodes) · [Microsoft: GetQueuedCompletionStatus](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus)

## GetQueuedCompletionStatusの戻り値を読む

ワーカーは`GetQueuedCompletionStatus`で一件を取り出します。I/O完了なら転送されたバイト数、完了キー、`OVERLAPPED*`が渡されます。`FALSE`のときは直後の`GetLastError()`を保存し、同時に`OVERLAPPED*`の出力を確認します。[Microsoft: GetQueuedCompletionStatus](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus)

| 戻り値 | `OVERLAPPED*`の出力 | 読み方 |
| --- | --- | --- |
| `TRUE` | 非`nullptr`（OSによるI/O完了の場合） | 成功したI/Oのパケットを回収した。実際の転送数を使う。 |
| `FALSE` | 非`nullptr` | 失敗したI/Oのパケットを回収した。その要求を終端として扱い、エラーコードを読む。 |
| `FALSE` | `nullptr` | パケットを回収できなかった。例えば待機時間切れの`WAIT_TIMEOUT`。待機中にポートが閉じられた場合は`ERROR_ABANDONED_WAIT_0`。この行ではキーやバイト数の出力を使わない。 |
| `TRUE` | `nullptr`（手動通知をこの形式で送った場合） | アプリが投稿した制御用パケットを回収した。キーに従って処理する。 |

例えば`FALSE`かつ非`nullptr`で`ERROR_OPERATION_ABORTED`なら、その要求のキャンセル完了を回収しました。一方、待機の時間切れは、その呼出しがパケットを取り出せず戻ったという結果です。発行済み要求は寿命を保ち、キャンセルを要求した場合も終端の通知まで追います。[非同期I/Oのキャンセルと終了処理](/os/cancelling-overlapped-io.html) · [Microsoft: CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex)

### アプリからワーカーを起こす

`PostQueuedCompletionStatus(port, 0, stopKey, nullptr)`のように、アプリから制御用パケットを投稿できます。投稿した値はそのまま受け取れるため、I/Oには使わない`stopKey`を予約し、アプリの規約で判別します。例えば終了時は新規I/Oを止め、発行済み要求の完了を回収し終えてから、終了を待つ各ワーカーへ停止用のパケットを渡します。[Microsoft: PostQueuedCompletionStatus](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-postqueuedcompletionstatus) · [Microsoft: 手動投稿の値の扱い](https://devblogs.microsoft.com/oldnewthing/?p=26693)

## キューの順序とワーカーの並行度

完了パケットは**キューに入る順にFIFO**で並びます。先に発行した読み取りが後から完了することもあり、複数のワーカーで扱うと、取り出しや後続処理の順序も変わり得ます。順序が必要なデータは要求IDやオフセットで並べ直します。Windowsの説明では、ポートで待つスレッドからは、最後に待機に入ったものを先に起こします（LIFO）。[Microsoft: I/O Completion Ports](https://learn.microsoft.com/en-us/windows/win32/fileio/i-o-completion-ports)

作成時の`NumberOfConcurrentThreads`は、ポートに関連付く**実行可能なワーカー数を制御する値**です。`0`ならシステムのプロセッサー数が使われます。例えば並行度が1でも、アプリは複数のワーカーを作って待機させ、複数の読み取りを発行できます。先に動いていたワーカーが別の待ちに入ったとき、ポートは別のワーカーへ処理を渡せます。元のワーカーが再開した直後などは、一時的に指定値を超えることもあります。発行するI/Oの数やバッファの総量を抑える上限は、アプリ側で別に設けます。[Microsoft: Threads and Concurrency](https://learn.microsoft.com/en-us/windows/win32/fileio/i-o-completion-ports#threads-and-concurrency) · [Windowsのスレッドスケジューリング](/os/thread-scheduling.html)

ゲームのローダーでは、I/Oの転送完了をきっかけに、展開やデコードの仕事を渡せます。転送、CPU処理、GPUへのアップロードを別の段階として計測すると、完了ポートの通知を受け取った時点から利用可能になるまでの遅れを追えます。[ゲームのアセット読み込み](/game/asset-loading.html)

## 実践

WindowsのC++サンプルでは、同じファイルに対する二つの読み取りを一つの完了ポートから回収します。両方に同じ完了キーが返り、異なる`OVERLAPPED*`で要求を識別できることを確認します。[C++でIOCPの完了通知を観察する](/practice/io/iocp-observation.html)
