---
title: 非同期I/O — 要求・完了・バッファの寿命
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: 非同期ファイル読み取りを要求・完了通知・結果回収に分ける。WindowsのOVERLAPPED、pendingと即時完了、キャンセル後の寿命、C#のReadAsyncとawait、ゲームでの完了後処理を区別する。
  aliases: [asynchronous I/O, 非同期I/O, overlapped I/O, OVERLAPPED, ERROR_IO_PENDING, GetOverlappedResult, CancelIoEx, IRP, IOCP, ReadAsync, await, ValueTask, continuation, 継続, backpressure, バックプレッシャー]
  verification: 一次資料照合（2026-11-04）
---

# 非同期I/O — 要求・完了・バッファの寿命

非同期I/Oでは、**読み取りを要求することと、結果を使える状態になったことを分けます。** 要求後に別の仕事へ進める場合がありますが、その間もバッファや要求情報はI/Oのために使われ得ます。呼出しから戻っただけで再利用・破棄してはいけません。

ここではWindowsの通常ファイルを対象に、C++のOVERLAPPED I/OとC#の`FileStream.ReadAsync`を説明します。他OSやすべてのランタイムが同じ内部方式とはしません。ファイル位置、実際に読めた数、キャッシュ、byteとデコードの区別は[ファイルを読む仕組み](/os/file-read-journey.html)を参照してください。

[TCPソケット](/network/tcp-sockets.html)で非blockingソケットを`select`／`Poll`で待つ方法は、操作できる状態を調べる**readiness**の方式です。発行済み要求の完了を受け取る方式と区別します。読取り可能という通知だけでデータの到着やアプリのメッセージ完成を決めず、実際の受信結果でデータ・EOF・エラーを判断します。[Microsoft: select](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-select)、[Socket.Poll](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.poll?view=net-10.0)

[メモリマップドファイル](/os/memory-mapped-files.html)は、ファイルの範囲を仮想アドレス空間へ対応付ける別のアクセス方式です。マッピングしただけで全データの読取りが完了したり、非同期readを発行したりしたことにはなりません。ビューへのアクセス自体でページの準備やI/Oを待つ場合があるため、このページの「要求を発行して後から完了を回収する」手順と区別します。[Microsoft: File Mapping](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping)

## 同期・非同期と、並列実行は別の軸

同期読み取りは、操作の完了や失敗を待ってから呼出し元へ戻ります。非同期読み取りは、未完了の要求を保持し、後から完了を受け取る仕組みを持ちます。そこで空いた時間を、別の計算や別の要求の処理へ使える場合があります。[Microsoft: Synchronous and Asynchronous I/O](https://learn.microsoft.com/en-us/windows/win32/fileio/synchronous-and-asynchronous-i-o)

非同期という名前だけでは、複数CPUでの並列実行、常に即座の復帰、読み込み時間の短縮を保証しません。キャッシュなどで即時に完了する場合もあれば、非同期用のハンドルでも開始呼出しが待つ場合があります。小さい処理では、要求や完了を管理する負担が利益を上回ることもあります。[Microsoft: ReadFile — asynchronous handles](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)

<figure class="study-figure">
  <img src="/images/io/sync-async-timeline.svg" alt="同期では読取り呼出しの完了を待つのに対し、非同期では要求後にバッファへ触れない別処理を行い、後で結果を回収できる例。即時完了とpendingのどちらもあり、並列化や速度向上を保証する図ではない。" width="760" height="1510" />
  <figcaption><strong>要求を出す時点、I/Oが完了する時点、結果を扱う時点を分ける。</strong> 図の長さや別処理との重なり方は説明用です。I/Oが即時に完了する場合もあります。<a href="/study/images/io/sync-async-timeline.svg" target="_blank" rel="noopener noreferrer">同期と非同期の時間軸を拡大</a></figcaption>
</figure>

## Windowsでは要求ごとの情報を渡す

Windowsでは`CreateFileW`で`FILE_FLAG_OVERLAPPED`を指定して開き、`ReadFile`へ**OVERLAPPED**構造体を渡す経路があります。要求の開始位置は`Offset`と`OffsetHigh`で指定する、先頭からの64bitのbyteオフセットです。同期版の現在位置が自動で進む仕組みを、そのまま使うものではありません。[Microsoft: OVERLAPPED](https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-overlapped)

| 要求ごとに管理するもの | 役割 |
| --- | --- |
| 開いたファイルのハンドル | どの読み取り元に対する要求か |
| オフセット・要求数 | どこから最大何byte読むか |
| `OVERLAPPED` | その要求を識別し、状態や完了通知を関連付ける情報 |
| イベントなどの通知先 | 完了したことを受け取る手段 |
| 受取バッファ | 完了後に今回のbyteを受け取る領域 |

同時に処理中の要求には、それぞれ有効な要求情報と、重複して使わない受取領域を用意します。まだ処理中の`OVERLAPPED`を書き換えて次の要求へ使ったり、バッファを別用途へ渡したりしません。オフセットもアプリ側で管理する値であり、OSが要求後に次の位置へ書き換えるフィールドではありません。

### IRPと、アプリの要求情報は同じものではない

Windowsのカーネル側には、ドライバーへI/Oを渡す**IRP**（I/O Request Packet）があります。複数のドライバーを通り、途中の層で完了する場合もあります。アプリが渡す`OVERLAPPED`そのものがIRP、という関係ではありません。[Microsoft: I/O Request Packets](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/i-o-request-packets)

読み取りにはIRPを使う経路のほか、fast I/Oの経路もあります。キャッシュの利用や下位デバイスへの要求も関わるため、**アプリのAPI一回、IRP一個、物理ストレージアクセス一回を一対一に数えることはできません。** 非同期指定も、OSのファイルキャッシュを無効にする指示ではありません。[Microsoft: IRP-based or Fast I/O operations](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/operations-that-can-be-irp-based-or-fast-i-o)

## ReadFileの開始結果を三つに分ける

非同期用に開いたハンドルでの`ReadFile`は、戻り値だけを「成功／失敗」の二択として読むと誤ります。`FALSE`の場合は直後の`GetLastError`を確認します。

| 開始呼出しの結果 | 意味 | 次の扱い |
| --- | --- | --- |
| `TRUE` | 読み取りが即時に成功完了した | 実際数と結果を確認して処理する |
| `FALSE`＋`ERROR_IO_PENDING` | 要求が未完了として受理された | 寿命を保って完了を回収する |
| `FALSE`＋その他のエラー | 開始時に失敗したなど | EOFを区別し、エラーを処理する |

`ERROR_IO_PENDING`は、読取り失敗を示すコードではありません。また`TRUE`だったことだけから、キャッシュヒットや物理I/Oの有無を特定することもできません。[Microsoft: ReadFile — Return value](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)

### イベントとGetOverlappedResult

単純なイベント方式では、`OVERLAPPED.hEvent`へ要求に対応するイベントを設定します。Microsoftの説明では手動リセットイベントを使う方針で、自動リセットイベントと待機の組合せには注意が必要です。イベントの通知は**完了を知らせるもので、成功の保証ではありません。** 成功・失敗と実際に転送された数は、結果を受け取って確認します。[Microsoft: OVERLAPPED — hEvent](https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-overlapped)

`GetOverlappedResult`は、対応するハンドルと`OVERLAPPED`を使って結果を取得します。**最後の引数が`TRUE`で、まだpendingなら、この呼出し側は完了までブロックします。** 非同期で開始した後でも、結果が必要になった地点で同期的に待つことはあります。`FALSE`で未完了を調べた場合の`ERROR_IO_INCOMPLETE`とも区別します。[Microsoft: GetOverlappedResult](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getoverlappedresult)

大量の要求を扱う別の手段には、**IOCP**（I/O Completion Port）があります。複数ハンドルの完了通知をキューで受け取る仕組みです。イベント方式とIOCPでは結果の回収手続きが異なるため、通知と要求の対応を保つ設計が必要です。今回のC++実践ではイベント方式を使います。[Microsoft: I/O Completion Ports](https://learn.microsoft.com/en-us/windows/win32/fileio/i-o-completion-ports)

## 完了を回収するまで寿命を保つ

要求を出した関数のスコープが終わっても、I/Oがそのバッファを使い終えているとは限りません。**処理中の要求に属するバッファ、OVERLAPPED、イベント、ハンドルを、必要な結果回収まで有効に保つ**所有関係を作ります。

特に、要求を出した直後にローカル配列の寿命を終える、同じ領域へ次の読み取りを重ねる、未完了の受取バッファを表示・解析する、といった扱いは避けます。成功が確認できたら、実際数の範囲だけを処理します。短い読み取りでも、バッファ全体が今回の結果になるわけではありません。[Microsoft: ReadFile — buffer lifetime](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)

<figure class="study-figure">
  <img src="/images/io/async-request-lifetime.svg" alt="要求の作成から発行、pending中、結果回収、再利用や破棄まで、バッファとOVERLAPPEDなどを有効に保つ図。キャンセル要求だけでは寿命が終わらず、成功・キャンセル・別エラーの終端結果を確認する必要がある。" width="760" height="1510" />
  <figcaption><strong>要求の終了を確かめることが、再利用・解放の境界になる。</strong> キャンセルを要求した時点と、要求の終端結果を回収した時点を区別します。<a href="/study/images/io/async-request-lifetime.svg" target="_blank" rel="noopener noreferrer">非同期要求と寿命の図を拡大</a></figcaption>
</figure>

### CancelIoExは完了待ちではない

`CancelIoEx`は、対象の進行中のI/Oにキャンセルを要求します。成功して戻っても、キャンセル対象のI/Oがすべて完了するまで待ったことにはなりません。**キャンセル要求後も、OVERLAPPEDやバッファをすぐ解放・再利用しません。** 対応する完了を確認して終端結果を回収します。[Microsoft: CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex)

キャンセルと通常完了は競走します。最終結果は、通常の成功、`ERROR_OPERATION_ABORTED`によるキャンセル、別のエラーのいずれにもなり得ます。`ERROR_NOT_FOUND`も、「今後その要求の結果を確認しなくてよい」という印ではありません。キャンセル対象が既に見つからない場合にも、所有している要求の最終状態を別に把握する必要があります。

## EOFと短い読み取りも、完了結果として扱う

同期`ReadFile`の「成功して実際数0」というEOF判定を、OVERLAPPED版へそのまま移しません。非同期版では、開始時や結果の回収時に`ERROR_HANDLE_EOF`としてEOFを受け取る場合があります。通常のエラーと区別して読み取りを終えます。[Microsoft: Testing for the End of a File](https://learn.microsoft.com/en-us/windows/win32/fileio/testing-for-the-end-of-a-file)

末尾までの残りが要求数より少なければ、その分だけ成功して返ることもあります。読み取れた部分を処理し、必要な長さに足りるかはアプリの形式に従って検査します。byteの内容、要求数と実際数の扱いは[同期ファイル読取りの記事](/os/file-read-journey.html)と共通ですが、完了を受け取る契約を混同しません。

TCPの正の長さを要求した通常の`recv`では、相手が送信を正常終了し、届いているデータを読み終えると0を受け取ります。接続リセットなどのエラーや、自分の送信方向を閉じる操作とは別です。ファイルの`ERROR_HANDLE_EOF`判定を流用せず、[ループバック実践](/practice/network/tcp-loopback-observation.html)で受信の終端と応答を確かめます。[Microsoft: recv](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-recv)

## C#のReadAsyncと、一度だけのawait

今回のWindows向けC#例は、`FileOptions.Asynchronous`で開いた`FileStream`を使います。`ReadAsync(Memory<byte>, ...)`は`ValueTask<int>`を返し、結果の整数が実際に読めた数です。正の数を要求したときの0はEOFで、要求より少ない正の数が返る場合もあります。[Microsoft: FileOptions](https://learn.microsoft.com/en-us/dotnet/api/system.io.fileoptions?view=net-10.0)、[FileStream.ReadAsync](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.readasync?view=net-10.0)

次は`async`メソッド内の要点です。`stream`は上記の`FileStream`、`buffer`は`byte[]`とします。

```csharp
var operation = stream.ReadAsync(buffer.AsMemory());
// ここで、このバッファに触れない短い別の処理を行うことはできる。
int actual = await operation;
// 成功後、bufferの先頭actual bytesだけを使う。
```

`await`に到達した時点で未完了なら、その`async`メソッドは中断し、呼出し元へ制御を戻せます。`await`がスレッドを待機で塞ぐのではありません。既に完了していれば、中断せず結果を受け取ります。**`await`ごとに別のスレッドを新設する、という仕組みではありません。**[Microsoft: await operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/await)

この`ValueTask<int>`は**一度だけawaitして消費**します。繰り返しawaitしたり、未完了の`Result`を読んだりする使い方へ変更しません。呼出し時や結果受取り時の失敗、キャンセルの例外も処理します。[Microsoft: ValueTaskの利用規則](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1?view=net-10.0)

`Memory<byte>`を渡しても、元の配列の内容がコピーされて独立した読み取り先になるわけではありません。要求の終端まで元の領域の寿命と利用規則を保ちます。トークンを通じてキャンセルを要求しただけで、配列を別の処理へ返してよいわけでもありません。[Microsoft: Memoryの利用ガイド](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/memory-t-usage-guidelines)

### コンパイラとランタイムがつなぐもの

コンパイラは`async`メソッドを、中断位置と再開に必要な状態を保持する**状態機械**へ変換します。未完了の`await`では継続を登録し、完了後に残りを進めます。スレッドを丸ごと保存して専有し続ける仕組みではありません。[Microsoft .NET Blog: async/awaitの内部](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/)

Windows版.NET **v10.0.0の実装例**では、OSへの読み取りが必要になると、`ReadAtOffsetAsync`から`QueueAsyncReadFile`へ進みます。ハンドルをスレッドプールのI/O通知へ結び付け、完了結果を保持するオブジェクトが`NativeOverlapped`とバッファを準備して`ReadFile`を呼びます。完了コールバックと発行側が連携し、読めた数や失敗を`ValueTask`へ伝えます。C++例でアプリがイベントを扱う部分を、そのままC#で手書きするわけではありません。[.NET: 読み取りの発行](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/IO/RandomAccess.Windows.cs)、[完了通知とValueTaskの接続](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/Microsoft/Win32/SafeHandles/SafeFileHandle.OverlappedValueTaskSource.Windows.cs)

一方、`FileStream`内部のバッファだけで要求を満たし、OSへ新たに要求せず完了する経路もあります。**即時完了だけで経路は特定できません。** これは公開実装を読んだ説明であり、実践コードの全要求を追跡した記録ではありません。[.NET: 緩衝読み取りの実装](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/IO/Strategies/BufferedFileStreamStrategy.cs)

### Result、Wait、Task.Runとの違い

`Task`の`Result`や`Wait()`で未完了の結果を同期的に待つと、呼出し側のスレッドを塞ぎます。`await`と同じ待ち方ではありません。また`Task.Run`へ同期`Read`を渡す方法は、スレッドプール側で同期読み取りを行わせるもので、その仕事はI/O待ちでワーカーを占有し得ます。OSの非同期I/Oを使う要求と同じ経路とはみなしません。[Microsoft: Asynchronous programming scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)

## I/O完了と、ゲームで利用できる時点

**I/O完了、継続処理の実行、アセットの利用可能化は別の段階**です。継続処理（continuation）は、完了後に進める残りの処理です。通知を受けても、いつ・どのスレッドでその処理を実行するかは、ランタイムや実行文脈にも依存します。

アセットのbyteが届いた後にも、展開、デコード、データ構造の構築、GPUへの転送などが残ります。メインスレッドで行う必要のあるエンジンAPIや登録処理は、その条件を守って接続します。今回の確認はコンソール／.NETの例であり、UnityやUIの実行文脈での再開動作を検証したものではありません。

GPUが使う資源の解放も、CPU側の読取り完了や参照数だけでは決められません。例えばD3D12では、使用を含むGPU処理の完了をフェンスで追跡し、再利用・解放できる時点を管理します。具体的な同期方法はAPIの契約に従います。[Microsoft: Fence-Based Resource Management](https://learn.microsoft.com/en-us/windows/win32/direct3d12/fence-based-resource-management)

Readyの条件、登録する段階、要求の世代、所有権と解放をまとめた設計は[実行時のアセットロード](/game/asset-loading.html)を参照してください。[状態と寿命の観察例](/practice/assets/asset-lifecycle-model.html)は、単一スレッドの決定的なモデルです。実際のI/Oやワーカー、GPU、Unityでの完了・スレッド動作を検証するサンプルではありません。

要求を増やし続けると、未完了バッファや要求情報も増えます。**バックプレッシャー**は、新規発行を待たせるなどして処理中の量を制限する考え方です。同時要求数や保持するbyte数に予算を設け、完了後の処理が追い付く量に抑えます。Windowsの`ReadFile`にも、未処理の非同期要求が多すぎる場合のメモリ関連の失敗が記載されています。[Microsoft: ReadFile — outstanding requests](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)

## 実践記事で確かめる範囲

[同期版と非同期版のファイル読み取りを比較する](/practice/io/async-file-read-observation.html)では、同じ12byteの固定データを、同期・非同期それぞれのハンドルやストリームで読みます。即時完了でもpendingでも受け入れ、5byteの要求、短い別計算、結果回収、内容の一致を確かめます。キャンセルの競走は実演せず、上記はAPI契約として説明しています。

小さなファイルやwarm cacheでは、I/Oが別計算より先に終わることもあります。`ValueTask`の状態ログも検査時点の状態であり、呼出しから戻った厳密な瞬間を証明しません。この確認だけで、物理I/Oの発生、必ず処理が重なったこと、速度向上を証明したとはしません。
