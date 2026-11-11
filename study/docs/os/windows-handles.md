---
title: Windowsのハンドルとカーネルオブジェクト
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: プロセスごとのハンドルからカーネルオブジェクトを参照する仕組みと、アクセス権・複製・継承・クローズを整理する。
  aliases: [HANDLE, ハンドルテーブル, カーネルオブジェクト, アクセスマスク, DuplicateHandle, CloseHandle, ハンドル継承, 擬似ハンドル]
  verification: Microsoft LearnのWin32仕様に照合。C++例をWindows x64のMSVCでビルドし、待機専用ハンドルの権限と複製後の待機結果を確認。
---

# Windowsのハンドルとカーネルオブジェクト

Windowsでイベントやファイルを開くと、アプリは対象を操作するための `HANDLE` を受け取ります。通常のカーネルオブジェクト用ハンドルは、そのプロセスの文脈で解釈されます。ハンドルテーブルの項目から対象のオブジェクトと許可された操作が分かる、と考えると、同じイベントを指す二つのハンドルが別々の権限を持つ理由が見えてきます。ここでのテーブルは概念図で、ハンドルのビット配置に依存せず、取得した値をAPIに渡します。[Microsoftのカーネルオブジェクト](https://learn.microsoft.com/en-us/windows/win32/sysinfo/kernel-objects) · [システムコールと実行モード](/os/system-calls-and-privilege.html)

<figure class="study-figure">
  <img src="/images/os/windows-handles.svg" alt="プロセスAのハンドル0x54にはイベントを通知する権限と待つ権限がある。プロセスBのハンドル0x68には待つ権限があり、どちらも同じイベントを参照する。Aが0x54を閉じてもBの項目は残る。" width="760" height="338" loading="lazy" />
  <figcaption>二つのプロセスが同じイベントを参照する例。値は説明用です。<a href="/study/images/os/windows-handles.svg" target="_blank" rel="noopener noreferrer">ハンドルテーブルの図を拡大</a></figcaption>
</figure>

## 操作の許可はハンドルごとに決まる

既存のイベントを `OpenEventW` で開くときは、要求する権限をビットの組み合わせで指定します。システムはオブジェクトのセキュリティ記述子に照らして要求を検査します。イベントの状態を変更する `SetEvent` には `EVENT_MODIFY_STATE` が、イベントを待つ `WaitForSingleObject` には `SYNCHRONIZE` が必要です。通知する側と待つ側は、それぞれの操作に必要な権限で同じイベントを扱えます。必要なビットはオブジェクトの種類と関数によって決まります。[同期オブジェクトのセキュリティとアクセス権](https://learn.microsoft.com/en-us/windows/win32/sync/synchronization-object-security-and-access-rights) · [SetEvent](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-setevent) · [WaitForSingleObject](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject)

`CreateProcessW` が返す情報には、プロセスと初期スレッドのハンドル、およびPIDとTIDが含まれます。PIDはプロセスを識別するための番号です。PIDをもとにプロセスの操作に使うハンドルを取得するときは、`OpenProcess` で権限を指定します。ゲームの[世代付きハンドル](/algorithms/generational-handles.html)はアプリが自分のスロット表から対象を探すための仕組みです。ここで扱う `HANDLE` はWindowsが管理する参照をWin32 APIに渡すための値です。[Microsoftのプロセスハンドルと識別子](https://learn.microsoft.com/en-us/windows/win32/procthread/process-handles-and-identifiers) · [プロセス起動](/os/process-startup.html)

## コピー・複製・継承で増えるもの

| 操作 | 結果 |
| --- | --- |
| `HANDLE copy = original` | 同じ値を別の変数に保存します。参照先の項目は一つで、クローズの責任も一つです。 |
| `DuplicateHandle` | 同じオブジェクトへのハンドルを同じプロセスや別のプロセスに作ります。複製先の項目は独立して閉じられます。 |
| プロセス作成時の継承 | 子プロセス側に、親と同じ値・アクセス権で同じオブジェクトを指すハンドルが入ります。 |

`DuplicateHandle` で別プロセスに複製する場合、ソースと複製先のプロセスを `PROCESS_DUP_HANDLE` の権限で参照できる必要があります。返された値は複製先で使うので、呼び出したプロセスと複製先が異なる場合は、その値をIPCで通知します。元のハンドルの値だけを送る場合には、相手側に対応する項目を作る操作がありません。`DUPLICATE_SAME_ACCESS` を指定すると元と同じ権限を複製し、このフラグを使わない場合は `dwDesiredAccess` で必要な権限を指定します。[DuplicateHandle](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-duplicatehandle) · [CreateProcessWの継承条件](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)

子に標準出力用のパイプなどを渡す場合は、渡すハンドルに継承可能属性を付け、`CreateProcessW` の `bInheritHandles` を `TRUE` にします。そのままでは他の継承可能なハンドルも対象になります。対象を絞る場合は `STARTUPINFOEXW` に属性リストを設定し、`PROC_THREAD_ATTRIBUTE_HANDLE_LIST` に渡すハンドルを列挙します。`EXTENDED_STARTUPINFO_PRESENT` を指定し、この場合も各ハンドルは継承可能にして `bInheritHandles` を `TRUE` にします。[Microsoftのハンドル継承](https://learn.microsoft.com/en-us/windows/win32/sysinfo/handle-inheritance) · [UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute) · [パイプと子プロセスの入出力](/os/pipes-and-process-io.html)

## クローズとオブジェクトの寿命

`CloseHandle` は渡したハンドルを無効にします。たとえば `copy = original` のあとに `original` を閉じたら、`copy` に同じ数値が残っていても、その項目の利用は終わっています。独立した複製を閉じるまで、その複製を通した操作は続けられます。クローズはオブジェクトのハンドル数を減らし、システムは種類や残っている参照に応じてオブジェクトを保持します。プロセスやスレッドは終了後にもハンドルで参照でき、逆に、それらのハンドルを閉じる操作で実行中のプロセスやスレッドが終了することはありません。[CloseHandle](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-closehandle) · [Microsoftのオブジェクトのライフサイクル](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/life-cycle-of-an-object)

閉じ方は取得したAPIと組にして覚えます。たとえば `CreateEventW` の結果には `CloseHandle`、`FindFirstFileW` が返す検索用ハンドルには `FindClose` を使います。別スレッドが `WaitForSingleObject` で待っているハンドルを閉じると動作は未定義です。待ちが終わってから閉じるか、待つ側に独立した複製を渡して、それぞれの利用終了を管理します。[CloseHandleの適用範囲](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-closehandle) · [WaitForSingleObjectのハンドル寿命](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject)

## 擬似ハンドルは呼び出し時の対象を表す

`GetCurrentProcess()` は現在のプロセス、`GetCurrentThread()` は使用するスレッド自身を表す特別な値を返します。後者を別スレッドで使うと、そのスレッド自身を指します。これらの擬似ハンドルはそのまま使い、利用後のクローズは不要です。別スレッドでも取得元のスレッドを参照したい場合は、取得元で `DuplicateHandle` を呼び、実ハンドルを作ります。実ハンドルには通常のクローズの責任が付きます。[GetCurrentProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getcurrentprocess) · [GetCurrentThread](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getcurrentthread)

## 待機専用のハンドルを作って確かめる

下のコードを `handle_event.cpp` に保存し、Visual Studioのx64 Native Toolsコマンドプロンプトで `cl /nologo /W4 /EHsc handle_event.cpp` を実行します。`handle_event.exe` を起動すると、待機専用の `waitOnly` での通知が権限不足になり、元のハンドルで通知して閉じたあとも `waitOnly` で通知状態を観察できます。待機のタイムアウトに `0` を指定し、状態だけを確認します。[CreateEventW](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-createeventw) · [DuplicateHandle](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-duplicatehandle)

```cpp
#include <windows.h>
#include <cstdio>

int main() {
    HANDLE signal = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    if (!signal) return 1;

    HANDLE self = GetCurrentProcess();
    HANDLE waitOnly = nullptr;
    if (!DuplicateHandle(self, signal, self, &waitOnly, SYNCHRONIZE, FALSE, 0)) {
        CloseHandle(signal);
        return 2;
    }

    const bool limited = !SetEvent(waitOnly) && GetLastError() == ERROR_ACCESS_DENIED;
    const bool signaled = SetEvent(signal) != FALSE;
    const bool closed = CloseHandle(signal) != FALSE;
    const bool observed = WaitForSingleObject(waitOnly, 0) == WAIT_OBJECT_0;
    const bool done = CloseHandle(waitOnly) != FALSE;
    if (!(limited && signaled && closed && observed && done)) return 3;

    std::puts("SetEvent(waitOnly): ERROR_ACCESS_DENIED");
    std::puts("WaitForSingleObject after CloseHandle(signal): WAIT_OBJECT_0");
}
```
