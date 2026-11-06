---
title: Windowsの非同期I/Oをキャンセルする — 要求・完了・解放
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: CancelIoExで指定した要求を中止する仕組みを追い、通常完了との競合、タイムアウト、IOCPで完了を回収してからバッファを解放する手順を解説する。
  aliases: [CancelIoEx, CancelIo, overlapped I/O cancellation, 非同期I/Oのキャンセル, ERROR_NOT_FOUND, ERROR_OPERATION_ABORTED, キャンセル競合, 完了回収]
  verification: Microsoft LearnのキャンセルとI/O完了ポートの資料に照合（2026-11-06）
---

# Windowsの非同期I/Oをキャンセルする — 要求・完了・解放

ゲームで次のシーンのアセットを先読みしている途中に、プレイヤーがタイトル画面へ戻ったとします。ローダーは読み取りのキャンセルを依頼できます。**依頼のあとも、読み取りが終わるまではOSがバッファを使う可能性があります。** ここではWindowsの`OVERLAPPED`を使うファイル読み取りを対象に、キャンセルの依頼と結果の回収を追います。[非同期I/Oの基礎](/os/asynchronous-file-io.html) · [ゲームのアセット読み込み](/game/asset-loading.html)

## CancelIoExは処理中の要求を探す

`CancelIoEx(file, &request.overlapped)`は、現在のプロセスがそのハンドルに出したI/Oから、指定した`OVERLAPPED`に対応する要求を探し、キャンセルを依頼します。`CancelIoEx(file, nullptr)`はそのハンドルに対する同じプロセスの未完了I/O全体を対象にします。どちらも、呼び出すスレッドとI/Oを発行したスレッドが異なっていても使えます。`CancelIo(file)`は、呼び出したスレッド自身がそのハンドルに出した未完了のI/Oを対象にします。[Microsoft: CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex) · [Microsoft: CancelIo](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelio)

`CancelIoEx`の成功は、対象のI/Oにキャンセルを**要求できた**ことを示します。キャンセルが実際に成立するかは、ドライバーの対応とI/Oの進み具合に依存します。`FALSE`で戻った場合は、直後の`GetLastError()`でキャンセル呼び出し自体のエラーを読みます。`ERROR_NOT_FOUND`は、依頼時にキャンセル対象を見つけられなかったという結果です。[Microsoft: Canceling Pending I/O Operations](https://learn.microsoft.com/en-us/windows/win32/fileio/canceling-pending-i-o-operations)

<figure class="study-figure">
  <img src="/images/os/cancelling-overlapped-io.svg" alt="読み取りを発行した後、キャンセルを要求できる。最終結果は通常完了、ERROR_OPERATION_ABORTED、別のI/Oエラーのいずれか。OVERLAPPEDとバッファは、発行からI/O完了通知の回収とアプリでの処理が終わるまで確保しておく。" width="760" height="565" loading="lazy">
  <figcaption>キャンセル要求後に起こり得る三つの完了結果。<a href="/study/images/os/cancelling-overlapped-io.svg" target="_blank" rel="noopener noreferrer">キャンセルと完了の図を拡大</a></figcaption>
</figure>

## 最終結果は読み取り側の完了から知る

完了通知を省略しないI/O完了ポート（IOCP）では、発行時に成功したか`ERROR_IO_PENDING`になった読み取りは、完了パケットで結果を回収します。`GetQueuedCompletionStatus`が`FALSE`を返しても、返された`OVERLAPPED*`が`nullptr`以外なら、対応するI/Oの失敗を受け取っています。このときの`GetLastError()`が、以下の表の読み取りのエラーです。[I/O完了ポートの仕組み](/os/io-completion-ports.html) · [Microsoft: GetQueuedCompletionStatus](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus) · [Microsoft: CancelIoExの完了状態](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex#remarks)

| 回収したI/Oの結果 | ローダーの扱い |
| --- | --- |
| 正常完了 | まだ必要な読み取りなら転送数を確認して使う。シーン遷移などで不要なら結果を捨てる。 |
| `ERROR_OPERATION_ABORTED` | I/Oがキャンセルされて終わった。読み取り結果は使わず、要求を片付ける。 |
| 別のエラー | 読み取りの失敗として扱い、エラーコードに応じて記録や復旧を行う。 |

例えば、読み取りAの完了パケットがキューに入り、ワーカーはまだ取り出していないとします。この時点で別のスレッドがAを`CancelIoEx`で指定すると、既にI/O自体が終わっているため、`ERROR_NOT_FOUND`が返ることがあります。ワーカーはその後もAの完了を取り出します。キャンセルを要求できた場合でも、通常の読み取りが先に完了することがあります。[Microsoft: CancelIoExの戻り値と完了状態](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex)

イベント方式では、要求に対応するイベントと`GetOverlappedResult`で最終結果を受け取ります。IOCP方式では、完了パケットに入っているアドレスをワーカーが要求の特定に使うため、アプリ側の要求管理はパケットを回収するまで続きます。[Microsoft: GetOverlappedResult](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getoverlappedresult) · [Microsoft: GetQueuedCompletionStatusのlpOverlapped](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus#parameters)

## タイムアウトの後も要求を持つ

`GetQueuedCompletionStatus`で指定した待ち時間を超えると、`FALSE`、`OVERLAPPED* == nullptr`、`WAIT_TIMEOUT`を受け取ります。これはその呼び出しが完了パケットを受け取れなかったという結果です。どのI/Oに対してキャンセルを依頼するかは、要求ごとの期限を追っているアプリが決めます。例えば、シーンの切り替えを先に進める場合は、I/Oの要求管理側がバッファと`OVERLAPPED`の所有を引き継ぎ、後で完了を回収します。[Microsoft: GetQueuedCompletionStatusの待機時間](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus#parameters) · [Microsoft: ReadFileのバッファの有効期間](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile#parameters)

`OVERLAPPED`とバッファを要求オブジェクトにまとめ、保留中の要求をアプリで登録しておくと、所有権を追いやすくなります。ワーカーが完了を処理する一方で別スレッドがキャンセルを呼ぶ設計では、キャンセル側も呼び出しが戻るまで要求を有効に保ちます。アドレスを別の要求に使い回すと、古い完了を別の要求のものとして扱ったり、遅れて実行したキャンセルが新しい要求を指したりします。[Microsoft: キャンセル時の競合と構造体の再利用](https://learn.microsoft.com/en-us/windows/win32/fileio/canceling-pending-i-o-operations#cancellation-considerations)

## 終了時は発行を止め、完了を回収してからワーカーを止める

以下は、開始時点で成功した`ReadFile`も含めて、受理されたI/Oの完了パケットを回収するIOCP構成の例です。即時成功時の通知を省略する設定や、要求ごとに通知を抑止する設定を使う場合は、各要求をどの経路で完了処理するかに合わせて管理します。[Microsoft: SetFileCompletionNotificationModes](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setfilecompletionnotificationmodes) · [Microsoft: GetQueuedCompletionStatusの通知抑止](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getqueuedcompletionstatus#parameters)

1. **新規発行を止める。** 終了状態へ切り替え、既に発行処理に入ったスレッドが結果を登録し終えるのを待ちます。発行側が止まる前に全体キャンセルを依頼すると、その後に新しい要求が加わることがあります。[Microsoft: キャンセル時の競合](https://learn.microsoft.com/en-us/windows/win32/fileio/canceling-pending-i-o-operations#cancellation-considerations)
2. **未回収の要求にキャンセルを依頼する。** ハンドルと要求の情報を保持したまま`CancelIoEx`を呼びます。キャンセル呼び出しの戻り値で未回収件数を減らす処理は行わず、完了処理の側で要求を管理します。
3. **ワーカーを動かしたまま、残りの完了を回収する。** 通常完了・中止・エラーをそれぞれ片付け、完了処理とキャンセル処理の双方が要求を使い終えたらバッファや構造体を解放します。終了を待つ側が、完了処理にも必要なロックを保持したまま待つと、ワーカーが進めなくなります。
4. **ワーカーを終了してハンドルを閉じる。** 例えば`PostQueuedCompletionStatus`でI/Oとは区別できる終了用パケットをワーカーの数だけ送り、全ワーカーの終了を待ってからファイルと完了ポートを閉じます。[Microsoft: PostQueuedCompletionStatus](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-postqueuedcompletionstatus)

## 完了パケットを観察する実践

C++の実践では、自分の実行ファイルに読み取りを発行し、どの`OVERLAPPED`が完了として返ったかを表示します。そこで使う完了回収が、キャンセルを組み込む場合にも要求の寿命を決める基準になります。[C++でIOCPの完了を観察する](/practice/io/iocp-observation.html)
