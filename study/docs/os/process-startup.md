---
title: 実行ファイルを起動してmainへ到達するまで — プロセス・スレッド・ローダー
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: WindowsのEXE起動を、プロセスと初期スレッドの作成、イメージとDLLの準備、ローダー、PEエントリポイント、CRT、mainに分けて追う。共有アドレス空間、TLS、静的初期化、スケジューラと終了処理も区別する。
  aliases: [process, プロセス, thread, スレッド, loader, ローダー, process startup, プロセス起動, PE, entry point, エントリポイント, mainCRTStartup, CRT, CreateProcess, TLS, コンテキストスイッチ]
  verification: Microsoft Learn・C++標準ドラフトの一次資料照合（2026-11-03）
---

# 実行ファイルを起動してmainへ到達するまで — プロセス・スレッド・ローダー

EXEを起動すると、OSがプロセスと実行の準備を整え、ローダーや実行時ライブラリの処理を経て、アプリの`main`が呼ばれます。**ファイルにある開始点、スレッドが実行を始めるための処理、ソースコードの`main`は区別します。**

具体例は**Windows x64・Visual Studio 2022のMSVC・通常のCRT付きコンソールEXE**です。CRTはC/C++の実行を支えるランタイムです。独自の`/ENTRY`、ドライバー、.NETの実行ファイルなどを同じ起動経路とは扱いません。以下は役割の説明であり、Windows内部の非公開関数や全初期化処理の厳密な順序を保証するものではありません。

ソースからEXEができるまでは[ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html)、アドレスの変換やRAMへの配置は[仮想メモリ](/os/virtual-memory.html)を参照してください。

## プログラム・プロセス・スレッド

| 用語 | 何を指すか | 例 |
| --- | --- | --- |
| プログラム | 実行する命令やデータ、実行ファイルとしての内容 | ディスク上の`game.exe` |
| プロセス | 実行中のプログラムに必要なアドレス空間や資源を管理する単位 | `game.exe`を起動した一つの実体 |
| スレッド | プロセス内で命令を実行し、OSがCPU時間を割り当てる単位 | 初期スレッド、後から作るワーカー |

同じEXEを二回起動すると、通常は別のプロセスになります。それぞれにPID（プロセス識別子）があり、変数の値やヒープの内容を別々に持ちます。各プロセスは少なくとも一つのスレッドから始まり、スレッドにはTID（スレッド識別子）があります。[Microsoft: About Processes and Threads](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

### スレッドが共有するものと、個別に持つもの

同じプロセス内のスレッドは仮想アドレス空間を共有し、コード・グローバル変数・ヒープなどを共有します。一方、ユーザースタック、TLS、実行コンテキストはスレッドごとに持ちます。TLS（Thread Local Storage）はスレッドごとの値を置く仕組みで、C++にも`thread_local`で値を分ける仕組みがあります。実行コンテキストには、次に実行する位置やスタック位置などのレジスタ状態が含まれます。[Microsoft: About Processes and Threads](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

「スレッドごとのスタックやTLS」は、別スレッドから読み書きできない保護領域という意味ではありません。これらも同じ仮想アドレス空間内にあり、例えば有効な寿命のスタック変数へのポインタを他スレッドに渡せます。寿命と同期が必要であることは変わりません。別プロセスの同じ数値のアドレスは同じデータを指すとは限らず、連携にはIPC（プロセス間通信）や共有メモリなどを使います。[Microsoft: Virtual Address Space](https://learn.microsoft.com/en-us/windows/win32/memory/virtual-address-space)

<figure class="study-figure">
  <img src="/images/process/process-and-threads.svg" alt="一つのプロセスの仮想アドレス空間と資源を初期スレッドとワーカーが共有し、それぞれにレジスタ状態、スタック、TLSを持つ模式図。スタックとTLSも同じアドレス空間にあり、別プロセスには別の空間がある。" width="760" height="1310" />
  <figcaption><strong>プロセスは資源をまとめ、スレッドはその中で実行する。</strong> 箱は役割の区別で、RAM上の配置やスレッド間のメモリ保護を表しません。<a href="/study/images/process/process-and-threads.svg" target="_blank" rel="noopener noreferrer">プロセスとスレッドの図を拡大</a></figcaption>
</figure>

## EXEの起動からmainまで

<figure class="study-figure">
  <img src="/images/process/startup-flow.svg" alt="Windowsの通常のMSVCコンソールEXEで、起動要求からプロセスと初期スレッドの作成、イメージとDLLの準備、ローダー初期化、PEエントリポイント、CRT、main、正常終了へ進む概念図。CreateProcessの復帰位置を固定せず、mainへの到達も保証しない。" width="760" height="1860" />
  <figcaption><strong>mainに到達する前にもコードが実行される。</strong> 番号は説明上の段階です。DLL自身のCRT初期化なども関わるため、全モジュールの処理がこの順序で一回ずつ実行される図ではありません。<a href="/study/images/process/startup-flow.svg" target="_blank" rel="noopener noreferrer">起動の流れの図を拡大</a></figcaption>
</figure>

### 1. 起動元がプロセス作成を要求する

別のプログラムから起動する基本APIに`CreateProcessW`があります。実行ファイル、コマンドライン、環境変数、作業ディレクトリなどを指定し、新しいプロセスと初期スレッドを作ります。作成側には、PID・TIDと、それらを操作・待機するためのハンドルが返ります。ハンドルはOSオブジェクトを参照する値で、識別子そのものとは別です。

**`CreateProcessW`の成功は、子プロセスの初期化完了や`main`到達を意味しません。** 初期化中に必要なDLLが見つからず終了することもあります。親側のAPI復帰と、子側で処理が進むタイミングを一本の直列処理として考えず、準備完了が必要なら明示的な通知を設計します。[Microsoft: CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)

### 2. 実行イメージと依存DLLを準備する

Windowsの通常のEXEやDLLはPE形式です。**イメージ**は、実行用に配置されるモジュールの内容を指します。ローダーはヘッダーやセクションの情報を使い、コードやデータをプロセスの仮想アドレス空間へマッピングします。EXE全体を先にRAMへコピーし終わらなければ実行できない、という意味ではありません。

**インポート**は外部DLLから使う関数などの参照です。通常の起動時依存を準備する際には、対象DLLやシンボルを解決し、IAT（Import Address Table）などを通じて呼び出せるようにします。**再配置**は、イメージを想定の基準アドレスと異なる場所へ配置したとき、再配置情報に従って必要なアドレス依存箇所を調整することです。すべての命令を毎回書き換える処理ではありません。[Microsoft: PE Format — Imports / Base Relocations](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)

起動後に`LoadLibrary`で追加するDLLや、遅延ロードするDLLもあります。「プログラムがいつか使うDLLはすべて`main`前にロード済み」とは限りません。静的ライブラリをリンクすることとDLLをロードすることの違いは、[オブジェクトファイルとライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)へつながります。[Microsoft: Linker support for delay-loaded DLLs](https://learn.microsoft.com/en-us/cpp/build/reference/linker-support-for-delay-loaded-dlls?view=msvc-170)

ファイル内のオフセットから実行時のアドレスを引く方法と、IATが埋まる流れは[WindowsのPEローダー](/os/pe-loading-and-imports.html)で扱います。

### 3. ローダー側の初期化を進める

実行開始の準備には、DLLの初期化通知やTLS関連の処理も関わります。PEのTLS情報にはスレッド用データの初期値やコールバックが含まれ、EXEのPEエントリポイントに入る前に実行される処理があります。ただし、OSがTLSの保存場所を準備することと、C++のあらゆる`thread_local`変数のコンストラクタが実行済みになることは別です。[Microsoft: PE Format — The .tls Section](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#the-tls-section)

DLLのユーザー初期化関数`DllMain`は、EXEの`main`ではありません。通常のMSVC製DLLではDLL用CRTのスタートアップも関わります。このため、「全DLLの初期化が終わるまでCRTは一切動かない」とも考えません。[Microsoft: DLLs and Visual C++ run-time library behavior](https://learn.microsoft.com/en-us/cpp/build/run-time-library-behavior?view=msvc-170)

`DllMain`はローダーロックというDLL管理用の同期の下で呼ばれ、実行できる処理に制約があります。大きな初期化や別スレッドの完了待ちを安易に置かず、必要な処理をアプリから明示的に呼ぶ初期化関数へ分けます。[Microsoft: DllMain — Remarks](https://learn.microsoft.com/en-us/windows/win32/dlls/dllmain#remarks)

### 4. PEエントリポイントからCRT、mainへ進む

PEヘッダーの`AddressOfEntryPoint`は、イメージ先頭からの相対位置（RVA）で表す開始点です。[Microsoft: PE Format — Optional Header](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#optional-header-standard-fields-image-only)

ここで対象にしている通常のコンソールEXEでは、リンカーが`mainCRTStartup`、または`wmain`用の`wmainCRTStartup`を選びます。**`main`を直接PE開始点として登録するのが通常の構成、というわけではありません。** `/ENTRY`で独自開始点を指定すると、CRTや静的オブジェクトの初期化を自分で考える必要が生じます。[Microsoft: /ENTRY](https://learn.microsoft.com/en-us/cpp/build/reference/entry-entry-point-symbol?view=msvc-170)

CRTのスタートアップは、実行時ライブラリの状態や引数などを準備し、対象のグローバル初期化処理を呼んでから、ユーザーの`main`を呼びます。CRTをDLLとして利用する`/MD`と静的に組み込む`/MT`では構成が変わりますが、`/MT`が「WindowsのDLLを一切使わない」という意味にはなりません。[Microsoft: CRT initialization](https://learn.microsoft.com/en-us/cpp/c-runtime-library/crt-initialization?view=msvc-170)、[Microsoft: /MD・/MT](https://learn.microsoft.com/en-us/cpp/build/reference/md-mt-ld-use-run-time-library?view=msvc-170)

| 「開始点」の種類 | 意味 |
| --- | --- |
| OS側の起動処理・スタブ | ユーザーコードの開始へつなぐシステム側の処理。PE開始点より前の初期化もある |
| EXEのPEエントリポイント | EXEに記録された開始位置。今回の通常例ではCRTのスタートアップ |
| C++の`main` | C++プログラムの主処理を記述する関数。通常はCRT側から呼ばれる |

したがって、PEエントリポイントを「そのスレッドが最初に実行するCPU命令」と読むことはできません。WinDbgにも、イメージのロード後、DLL初期化前に停止する初期ブレークポイントと、`main`に置くブレークポイントの区別があります。実際に見えるシステム関数名や中間フレームはWindows・CRT・最適化などで変わります。[Microsoft: Initial Breakpoint](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/initial-breakpoint)

## C++の初期化は、全部main前なのか

**静的初期化**は、静的記憶域期間やスレッド記憶域期間の変数に行う定数初期化・ゼロ初期化です。それ以外の初期化を**動的初期化**と呼びます。静的初期化は動的初期化より先です。「静的変数だから、そのコンストラクタも静的初期化」という分類にはなりません。[C++ draft: basic.start.static](https://eel.is/c++draft/basic.start.static)

次は分類を示すコードの断片です。`ReadConfig`の定義は省略しています。

```cpp
int ReadConfig();

int zero;                    // 静的記憶域期間：ゼロ初期化
constexpr int maxPlayers = 4; // 定数初期化
int config = ReadConfig();   // 非ローカル変数の動的初期化の例

int& CachedConfig() {
    static int cached = ReadConfig(); // この宣言を初めて通るとき
    return cached;
}
```

通常のMSVC構成では、対象の非ローカル変数の動的初期化をCRTが`main`前に呼ぶ様子を観察できます。ただしC++全体の保証として「すべてのグローバル変数の動的初期化が必ず`main`前に完了する」と覚えません。規格には遅延する場合の規則があり、翻訳単位（おおむね一つの`.cpp`を処理した単位）をまたぐ初期化にも順序の条件があります。別ファイルのグローバルオブジェクトが先に準備済みだと決めつける設計は避けます。[C++ draft: basic.start.dynamic](https://eel.is/c++draft/basic.start.dynamic)

関数内`static`の動的初期化は、その宣言を制御が初めて通るときに行います。C++11以降は同時に入った他スレッドが初期化完了を待つ規則がありますが、**初期化後の読み書きまで自動で同期する機能ではありません。** 初期化が例外で失敗すると、次に通ったとき再試行します。初期化中に同じ宣言へ再帰的に入り直すのは未定義動作です。[C++ draft: stmt.dcl](https://eel.is/c++draft/stmt.dcl)

## mainに到達しないとき、何を疑うか

| 段階 | 原因の例 | 切り分けの手掛かり |
| --- | --- | --- |
| プロセス作成 | ファイルや起動条件の問題 | `CreateProcessW`の戻り値と、失敗直後の`GetLastError` |
| イメージ・DLLの準備 | 必要なDLLやエクスポート関数がない、形式やアーキテクチャが不適合 | ローダーの診断、依存関係、子の終了状態 |
| DLL・TLSの初期化 | 初期化コードの例外、`DllMain`の失敗や待ち合わせ | `main`より前で停止し、例外と呼出し履歴を確認 |
| 非ローカル変数の初期化 | コンストラクタなどから例外が外へ出る | 該当の初期化関数と`std::terminate`までの履歴 |

起動時の`DllMain`が`DLL_PROCESS_ATTACH`に対して失敗を返すと、プロセスは終了します。また、非ローカル変数の初期化から例外が外へ出ると、C++では`std::terminate`が呼ばれます。`main`の中に置いた`try`だけで、その前の失敗を捕まえられるわけではありません。[Microsoft: DllMain — Return value](https://learn.microsoft.com/en-us/windows/win32/dlls/dllmain#return-value)、[C++ draft: basic.start.dynamic](https://eel.is/c++draft/basic.start.dynamic)

## OSはどのスレッドを実行するか

**スケジューラ**は、実行可能なスレッドへCPU時間を割り当てます。待機中のスレッドは、待つ条件が満たされて実行可能になるまで、その実行にCPU時間をもらいません。**コンテキストスイッチ**では、実行していたスレッドの状態を保存し、次のスレッドの状態を復元して処理を再開します。時間枠の終了、高い優先度のスレッドが実行可能になったこと、待機に入ることなどが契機になります。[Microsoft: Context Switches](https://learn.microsoft.com/en-us/windows/win32/procthread/context-switches)

実行可能になってからCPUへ戻るまでの時間は[Windowsのスレッドスケジューリング](/os/thread-scheduling.html)で扱います。CPUの権限が切り替わる過程は[システムコール](/os/system-calls-and-privilege.html)で追えます。

同じプロセス内のスレッド間でも切替は起きます。「プロセスを切り替えるときだけ状態を保存する」という仕組みではありません。

一つの論理プロセッサ上で切り替えて進める場合も、複数の論理プロセッサ上で同時に進む場合もあります。複数の処理が進行中である**並行実行（concurrency）**と、同時刻に複数を実行する**並列実行（parallelism）**は区別します。スレッド数を増やしても、常に同時実行されたり速くなったりする保証はありません。[Microsoft: Multitasking](https://learn.microsoft.com/en-us/windows/win32/procthread/multitasking)

ゲームでは、メインスレッド、描画用スレッド、ワーカースレッドなどに仕事を分けます。これはエンジン側が決める役割で、すべてのゲームに同じ構成があるわけではありません。描画スレッドもCPU上のスレッドであり、GPUそのものとは別です。共有するゲーム状態には、データ競合や寿命の問題が生じるため、[並行処理のバグ](/runtime/memory/concurrency-bugs.html)も確認します。

**タスク／ジョブは仕事の単位で、OSスレッドと一対一とは限りません。** 例えば.NETのTPLは、タスクをスレッドプールなどの実行基盤へ振り分けます。「弾を一つ更新する仕事ごとにOSスレッドを一つ作る」必要はなく、複数の仕事を既存のワーカーに処理させる構成を取れます。[Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

## mainから戻った後と、強制終了

`main`からの通常の`return`は、`main`の自動変数を破棄してから、戻り値を渡して`std::exit`を呼ぶ効果を持ちます。末尾まで進んだ場合は`return 0`相当です。一方、途中で直接`std::exit`を呼んでも、そこまでの呼出しスタックにある自動変数を順に巻き戻すわけではありません。[C++ draft: basic.start.main](https://eel.is/c++draft/basic.start.main)

正常な終了処理には、構築済みの静的記憶域期間のオブジェクトの破棄や、登録した終了処理などが関わります。使用中の資源が先に破棄されないよう、ゲームではワーカーに停止を伝え、完了を待ってから、共有サービスやアセット管理などを終了させます。[C++ draft: basic.start.term](https://eel.is/c++draft/basic.start.term)

最終的なWindowsのプロセス終了では、残ったスレッドも終了対象になります。`TerminateProcess`による強制終了は通常のC++後片付けと同じ経路ではなく、DLLにも通常の終了通知が届きません。OSがメモリやハンドルを回収することと、セーブデータの書込みやアプリ内の終了手順が完了することは別です。[Microsoft: Terminating a Process](https://learn.microsoft.com/en-us/windows/win32/procthread/terminating-a-process)

## C#・Unityにもそのまま当てはまるか

C#アプリの`Main`は、実行基盤から呼ばれるC#側の開始点です。[トップレベルステートメント](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/top-level-statements)ではコンパイラが相当する開始処理を生成します。OSや実行ファイル形式の開始点、ランタイムの起動、C#の`Main`を同じものとして扱わず、.NETの配布・実行方式に応じて確認します。[Microsoft: Main() and command-line arguments](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/main-command-line)

Unityでは、エンジン側の起動やPlayerループがあり、スクリプトの`Awake`・`Start`・`Update`などは所定の機会に呼ばれるイベント関数です。これらはEXEのPEエントリポイントではありません。C#コードを実行する仕組みも、プラットフォームやスクリプティングバックエンドで変わります。[Unity: Event function execution order](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/managing-update-order/execution-order)、[IL2CPPの解説](/languages/csharp/il2cpp.html)

## 実物で観察する

[Windowsでプロセス起動とスレッドを観察する](/practice/process/windows-process-observation.html)では、PIDとTID、共有する変数とスレッドごとの状態、初期化と`main`の前後を調べます。アプリのログだけではOS内部の全処理順は証明できません。PEの情報、デバッガーの停止位置、呼出し履歴を組み合わせ、観察できた範囲と仕様が保証する範囲を分けて読みます。
