---
title: システムコールでユーザーモードからカーネルモードへ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: Windows x64でWin32 APIからカーネルへ処理が移る経路を追い、CPUの権限移行、引数の検査、待機によるスレッドの切り替えを区別する。
  aliases: [システムコール, syscall, system call, ユーザーモード, カーネルモード, user mode, kernel mode, 特権レベル, ntdll, NtCreateFile, PreviousMode, SYSRET, トラップ, 割り込み, ページフォルト]
  verification: Microsoft LearnとIntel SDMに照合し、Windows x64のntdll.dll 10.0.26100.9949でNtCreateFileをLLVM 14.0.6により逆アセンブル（2026-11-06）
---

# システムコールでユーザーモードからカーネルモードへ

ゲームが `CreateFileW` でアセットを開くとき、OSがファイル名を解決し、アクセス権を確認してハンドルを作ります。アプリのコードからOSのサービスを依頼する入口が**システムコール**です。CPUはカーネル用に設定された入口へ移り、呼び出したスレッドの文脈でOSのコードを実行し始めます。処理に待ちが生じると、途中で別のスレッドにCPUを渡すことがあります。[Microsoftのネイティブシステムサービスの説明](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/libraries-and-headers) · [Windowsのコンテキストスイッチ](https://learn.microsoft.com/en-us/windows/win32/procthread/context-switches)

## CPUの権限と、OSが認めるアクセス権

通常のWindows x64アプリは**ユーザーモード**で動きます。x64では一般に現在の特権レベルが3です。Windowsカーネルなどのコードは特権レベル0の**カーネルモード**で動きます。CPUは特権命令を使える条件と、メモリのページにアクセスできる条件を検査します。カーネルに処理を渡したあとも、ファイルを開けるか、ハンドルを指定した操作に使えるかは、OSが要求元の権限をもとに判断します。[Microsoftのユーザーモードとカーネルモード](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode) · [Windowsのオブジェクトハンドル](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/object-handles)

アプリが持つポインターは、通常、そのプロセス内の仮想アドレスです。ファイルハンドルは、OSに渡す参照用の値です。カーネルは受け取った値を、要求元のアドレス空間やハンドル表、許可されたアクセス権に沿って解釈します。[仮想メモリ](/os/virtual-memory.html) · [Windowsのハンドル](/os/windows-handles.html)

## Win32 APIからx64のカーネル入口へ

代表的な経路では、`CreateFileW` を実装するユーザーモードのライブラリが、`ntdll.dll` の `NtCreateFile` を使います。Win32側は引数の準備と結果の変換を担います。`NtCreateFile` は `NTSTATUS` を返し、成功時に出力先へハンドルを設定します。`CreateFileW` は失敗時に `INVALID_HANDLE_VALUE` を返します。Win32の呼び出し回数とカーネルへの移行回数は分けて数えます。APIの実装によっては複数のサービスを呼びます。`QueryPerformanceCounter` は、使う時刻源によってユーザーモード内で値を取得できます。[ネイティブサービスの入口](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/libraries-and-headers) · [NtCreateFileの出力と戻り値](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ntcreatefile) · [CreateFileWの戻り値](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew#return-value) · [QPCとカーネル移行](https://learn.microsoft.com/en-us/windows/win32/sysinfo/acquiring-high-resolution-time-stamps#general-faq-about-qpc-and-tsc)

Windows x64の `ntdll.dll`（ファイルバージョン `10.0.26100.9949`）から `NtCreateFile` の入口を逆アセンブルした例です。次の表示では途中の分岐を省いています。

```text
mov r10, rcx   ; SYSCALL が上書きする RCX の値を退避
mov eax, 55h   ; この DLL で観測したサービス番号
...            ; 入口の経路を選ぶ命令
syscall        ; CPU がカーネルの入口へ移る
ret            ; 復帰後にユーザーモードの呼び出し元へ戻る
```

従来のx64の `SYSCALL` 経路では、CPUが次の命令のアドレスを `RCX` に、フラグを `R11` に保存し、OSが `IA32_LSTAR` に設定したアドレスへ特権レベル0で移ります。ユーザー側のスタックポインター `RSP` を記録してカーネル側のスタックへ切り替えることや、サービスを選び実行することはOS側の処理です。観測したサービス番号はそのDLLの実装に属し、Windowsのビルドが変わると変わり得ます。アプリからは公開されたWin32 APIの引数と戻り値を使います。[Intel SDM Volume 2のSYSCALL命令](https://cdrdv2-public.intel.com/774492/325383-sdm-vol-2abcd.pdf) · [MicrosoftのWindowsネイティブ入口の説明](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/libraries-and-headers)

## カーネルが受け取った引数を検査する

- **ハンドル**。参照先の種類と、要求された操作に使えるアクセス権を確かめます。たとえば `ObReferenceObjectByHandle` は、指定された種類やアクセス権の検査を行い、使える場合にカーネル側のオブジェクト参照を取得します。[MicrosoftのObReferenceObjectByHandle](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobjectbyhandle)
- **ポインターと長さ**。ユーザー側から来たバッファについては、アドレスや範囲を検査し、実際に読み書きするときの例外やバッファの寿命も扱います。他のスレッドが検査後に領域の保護を変えることもあります。I/Oの方式に応じ、OSやドライバーはコピー用バッファや、対象ページをロックして参照する方法などを使い分けます。[呼び出し元のモードを保持するPreviousMode](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/previousmode) · [MicrosoftのProbeForRead](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-probeforread) · [WindowsのI/Oバッファ](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/buffer-handling)

## 待機したスレッドはカーネル側から再開する

<figure class="study-figure">
  <img src="/images/os/system-calls-and-privilege.svg" alt="すぐ終わる要求では、スレッドAの実行がユーザー、カーネル、ユーザーの順に続く。待機する要求では、Aがカーネルで待ち始め、CPUでBが実行される。完了後にAが選ばれると、Aはカーネル内の続きから再開してユーザーへ戻る。" width="760" height="431" loading="lazy">
  <figcaption>CPUのモードが変わる箇所と、CPUで走るスレッドが変わる箇所を分けています。<a href="/study/images/os/system-calls-and-privilege.svg" target="_blank" rel="noopener noreferrer">システムコールと待機の図を拡大</a></figcaption>
</figure>

短い処理では、呼び出したスレッドがカーネル側の処理を終えてからユーザーモードへ戻れます。同期I/Oなどで結果を待つときは、そのスレッドの文脈が保存され、CPUは別の実行可能なスレッドを走らせられます。要求が完了すると元のスレッドが再び実行可能になり、スケジューラーに選ばれた時点でカーネル側の続きから処理を進めて、ユーザーモードへ戻ります。非同期I/Oでは、要求を出した呼び出しが先に戻り、完了を別に受け取る経路もあります。[スレッドのスケジューリング](/os/thread-scheduling.html) · [ファイル読み取りの経路](/os/file-read-journey.html) · [非同期ファイルI/O](/os/asynchronous-file-io.html)

## OSに処理が移るきっかけを区別する

| きっかけ | 発生する理由 | OSが受け取るもの |
| --- | --- | --- |
| システムコール | スレッドが `SYSCALL` などの命令でサービスを要求する | サービスの指定と引数。処理後は呼び出し側の続きへ戻る |
| 外部割り込み | デバイスやタイマーなどからCPUに通知が届く | どの割り込みが届いたか。実行中の命令の結果とは別のタイミングで発生する |
| ページフォルト `#PF` | 命令のメモリアクセスで、ページ表から有効な変換と必要な権限を得られない | 問題のアドレスとアクセスの情報。ページの準備などで解決できれば、元の命令を再試行できる |
| トラップ型の例外 | 例として、デバッガーが置いた `INT3` をCPUが実行する | 例外の種類と保存した実行状態。`INT3` の保存先は命令の直後 |

Windowsの資料では、カーネルへの移行の説明で「トラップ」という言葉が広く使われることがあります。Intel SDMの**トラップ型の例外**は、保存する命令位置で区別する用語です。OSが `#PF` を解決できたときは問題が起きた命令を再試行でき、`INT3` ではデバッガーが保存された次の命令位置をもとに処理します。[MicrosoftのPreviousMode](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/previousmode) · [Intel SDM Volume 3Aの割り込みと例外](https://cdrdv2-public.intel.com/825758/253668-sdm-vol-3a.pdf) · [Windowsのブレークポイント](/tools/windows/debugger-breakpoints-and-watchpoints.html)
