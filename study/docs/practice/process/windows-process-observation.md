---
title: WindowsでPID・TID・子プロセスとmain前の初期化を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: process-observation
  order: 1
  verification: Windows x64で実行確認
  summary: C++17で自分のPID/TID、同じプロセスのworker、CreateProcessWで作る子、namespace-scope初期化の目印を観察する。
  aliases: [PID, TID, CreateProcessW, PROCESS_INFORMATION, std::thread, atomic, join, wmain, CRT, 子プロセス, スレッド]
---

# WindowsでPID・TID・子プロセスとmain前の初期化を観察する

親、worker、子を小さく作って、**同じプロセスで動くスレッドと、別のプロセス**をIDから見比べます。加えて、namespace-scopeのオブジェクトが初期化された目印を、ユーザーの関数に入ってから表示します。

起動の流れは[プロセスはどう起動するか](/os/process-startup.html)、アドレス空間は[仮想メモリ](/os/virtual-memory.html)、実行ファイルができるまでの工程は[main.cppからCPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html)で確認できます。

## 何を見比べるか

| 観察する場所 | PID | TID | この例で確認すること |
| --- | --- | --- | --- |
| 親の`wmain` | 親プロセスのID | 親で実行中のスレッドのID | 比較の基準 |
| `std::thread`のworker | 親と同じ | 親の`wmain`とは異なる | 同じatomicオブジェクトへ加算する |
| `CreateProcessW`で作った子 | 親とは異なる | 子のinitial threadのID | 親が返されたハンドルとIDを照合する |
| `--child`単独実行 | その実行のプロセスID | その実行のスレッドID | 自己表示を確認し、子を再生成せず終了する |

PIDとTIDは、それぞれプロセスとスレッドを識別する数値です。終了後に再利用され得るため、数値の大小や再実行時の一致を調べません。Windowsのハンドルは、これらのIDとは役割が異なり、今回返された`hProcess`と`hThread`は使い終わったら閉じます。[Process Handles and Identifiers](https://learn.microsoft.com/en-us/windows/win32/procthread/process-handles-and-identifiers)、[Thread Handles and Identifiers](https://learn.microsoft.com/en-us/windows/win32/procthread/thread-handles-and-identifiers)、[PROCESS_INFORMATION](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/ns-processthreadsapi-process_information)

## ソースを入手して実行する

Windows 10以降、Windows SDKを含むVisual Studio 2022のC++開発環境、CMake 3.20以降を使います。次の3ファイルを同じフォルダへ保存します。外部ライブラリの取得、管理者権限、他アプリへの操作は使いません。

- <a href="/study/samples/process/windows/main.cpp" download>main.cpp</a>
- <a href="/study/samples/process/windows/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/process/windows/README.md" download>README.md</a>

Developer PowerShell for VS 2022で、保存したフォルダから実行します。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\process_observation.exe
$LASTEXITCODE
```

引数なしは親モードです。workerを一つ作ってjoinし、その後、自分と同じexeを`--child`付きで一回だけ起動します。`--child`は自己PID/TIDを表示して終了し、workerや子を作りません。

```powershell
.\build\Release\process_observation.exe --child
$LASTEXITCODE

# 不明な引数はusageを表示して2で終了する
.\build\Release\process_observation.exe --unexpected
$LASTEXITCODE
```

成功は終了コード0、Win32 APIや状態検査の失敗は1、引数の誤りは2です。API失敗ではAPI名と`GetLastError`の数値を表示します。`--child extra`も引数の誤りとして終了し、親モードへ進みません。

## workerの共有と同期

`observeWorker()`では親側とworkerが、同じ`std::atomic<unsigned>`へ各1000回加算します。`fetch_add`には`memory_order_relaxed`を使います。このカウンタの加算を不可分にするためのもので、別の通常データを公開する同期には使っていません。[C++公開作業草案：atomicの順序](https://eel.is/c++draft/atomics.order)

workerはPID・TID・共有オブジェクトのアドレスを通常の構造体へ記録します。親がその構造体を読むのは、`join()`が成功した後です。スレッドの完了とjoinの復帰が同期するため、この読み取りを安全にできます。worker自身から途中のログは出さず、結果は親側がまとめて表示します。[C++公開作業草案：threadのjoin](https://eel.is/c++draft/thread.thread.member)

この例の合否は、PIDが親と同じ、TIDが親側と異なる、参照したatomicオブジェクトが同じ、最終カウントが2000、という関係で決めます。workerの処理は有限回の加算で、入力や外部I/Oを待ちません。`JoinedThread`はjoin可能なスレッドを残さないための所有ラッパーです。`std::thread::join()`自体には、この例で指定するタイムアウトはありません。

## main前の目印が示す範囲

WindowsのUnicodeコマンドラインを扱うため、この例のユーザー関数は`main`のワイド文字版である**`wmain`**です。通常のコンソール向けMSVCビルドでは、CRT側の`wmainCRTStartup`が`wmain`を呼ぶ構成になります。独自の`/ENTRY`は指定していません。[Using wmain](https://learn.microsoft.com/en-us/cpp/c-language/using-wmain?view=msvc-170)、[/ENTRYの既定動作](https://learn.microsoft.com/en-us/cpp/build/reference/entry-entry-point-symbol?view=msvc-170)

`StartupRecorder`はnamespace-scopeの通常のオブジェクトです。そのコンストラクタでは、固定enumの`StartupEvent::namespaceConstructor`を記録するだけにしています。iostreamや複雑なWin32 APIは呼びません。表示は`wmain`に入ってから行います。`volatile`は、この目印の読み書きを観察できるようにするために使っており、workerとの同期手段ではありません。

MSVCの通常のCRT起動処理は、グローバル初期化を行ってからユーザーの関数を呼びます。今回、`wmain`で最初に目印を読んだ時点で、コンストラクタの記録が済んでいることを確認しました。C++の動的初期化には遅延が許される場合もあり、他の処理系まで同じ実行時点だとは断定しません。[CRT Initialization](https://learn.microsoft.com/en-us/cpp/c-runtime-library/crt-initialization?view=msvc-170)、[C++公開作業草案：動的初期化](https://eel.is/c++draft/basic.start.dynamic)

**この目印は、PE entry pointやloader、TLS、スタックの中身を最初から追跡する仕組みではありません。** [起動の解説にある図](/os/process-startup.html)の`main`は概念上のユーザー関数の例です。このログだけで、図の全段階を観測したことにはなりません。

## 子を起動して終了を待つ

`GetModuleFileNameW`で自分のexeの完全なパスを取り、`CreateProcessW`の`lpApplicationName`へ明示します。取得バッファが足りなければ拡大し、パスを切り詰めたまま起動しません。コマンドラインはexe名を引用符で囲み、`--child`を続けた書き換え可能なバッファです。[GetModuleFileNameW](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-getmodulefilenamew)、[CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)

`bInheritHandles`は`FALSE`です。親側は`PROCESS_INFORMATION`のPID・TIDを、返されたハンドルに対する`GetProcessId`・`GetThreadId`と照合します。子自身も自己PID/TIDを表示しますが、子のstdoutが親のリダイレクト先へ現れることや、親子の表示順は保証しません。必要なら`--child`単独実行でも自己表示を確認します。

終了待ちの対象はinitial threadのハンドルではなく、**プロセスのハンドル**です。`WaitForSingleObject`に5000msを指定し、`WAIT_OBJECT_0`を確認してから`GetExitCodeProcess`で終了コードを読みます。API失敗とタイムアウトは区別して失敗にします。[WaitForSingleObject](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject)、[GetExitCodeProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getexitcodeprocess)

## 子を取り残さないための後片付け

この節の補助コードは、観察対象を安全に片付けるためのものです。起動やIDの基本を読むときは、まず`observeWorker()`、`observeChild()`、`wmain`を追えます。

サンプル専用の名前なしjobを作り、`PROC_THREAD_ATTRIBUTE_JOB_LIST`で**作成時から子を所属させます**。この属性を使うため対象はWindows 10以降です。実行開始後に所属させる手順にはしていません。[UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)

jobにはプロセス数1と`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`を設定します。正常に終了を観測できず例外になった場合、`ChildExitGuard`がそのjobの終了を要求し、追加のwaitには2000msを指定します。さらに、RAIIで最後のjobハンドルを閉じる方針を保ちます。このjobには自分が作る子だけを入れ、他のアプリを終了させません。OSが終了処理を完了する実時間の上限まで保証するものではありません。[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)、[SetInformationJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-setinformationjobobject)

`UniqueHandle`はjob・process・initial threadのハンドルを閉じ、属性リストもRAIIで破棄します。ハンドルのclose失敗は記録して非0終了にします。通常のプロセスハンドルを閉じることと、jobの終了ポリシーが働くことは分けて読んでください。

## 実行確認と結果の読み方

2026年11月3日、Windows x64（25H2、build 26200.9711）、Visual Studio 2022のMSVC **19.35.32217.1**、Windows SDK **10.0.22000.0**、CMake **3.26.3**で確認しました。x64 Release・C++17・`/W4 /WX /utf-8`のビルドは無警告で、管理者ではないトークンで実行しています。

| 実行方法 | 終了コード | 確認した結果 |
| --- | ---: | --- |
| 引数なし | 0 | workerの関係とatomic合計、子のID照合・終了が成功 |
| `--child` | 0 | 自己PID/TIDと初期化の目印を表示し、再生成せず終了 |
| `--unexpected` | 2 | usageを表示して終了 |
| `--child extra` | 2 | 余分な引数を拒否して終了 |

通常モードの一回の観察では、親PIDは47492、親の`wmain`のTIDは47264、workerのTIDは8436でした。workerのPIDは親と同じ47492で、atomicの合計は2000です。子の自己表示はPID41124・TID48584で、親側の`PROCESS_INFORMATION`にも同じ値が出ました。**これらのPID/TIDやアドレスを再実行時の固定期待値にはしません。** 今回は子の表示もログへ現れましたが、同じ出力先への表示や行順を合否条件にはしていません。

正常系と引数検査を実行確認しました。タイムアウトやWin32 API失敗の注入、極端に長いexeパス、他のWindows版・32bit・ARM64は実行確認に含めていません。loader・TLS・スレッドの全スケジュールを記録するデバッガやトレーサーの代わりにはしません。

## main.cpp

<<< @/public/samples/process/windows/main.cpp{cpp}

## CMakeLists.txt

<<< @/public/samples/process/windows/CMakeLists.txt{cmake}
