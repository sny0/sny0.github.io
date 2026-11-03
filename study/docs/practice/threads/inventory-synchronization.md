---
title: C++とC#で在庫の確認・更新を一つのロックで守る
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: runtime
  collection: thread-synchronization
  order: 1
  verification: Windowsで両言語を実行確認
  summary: 在庫17件に4 workerが各10回アクセスし、確認と更新・Snapshotを同じlockで守る。専用結果slotとjoin、生成失敗時の後片付けも観察する。
  aliases: [thread, mutex, lock_guard, jthread, lock, Monitor, Thread.Join, 競合, 排他制御, critical section, 不変条件]
---

# C++とC#で在庫の確認・更新を一つのロックで守る

**在庫があるか確認してから消費するまでを、一つのcritical sectionにします。** 初期在庫17件に対して4 workerが各10回試し、`remaining >= 0`と`remaining + consumed == initial`を保てるか確認します。同期の概念と図は[スレッド同期](/runtime/thread-synchronization.html)を参照してください。

## 何をどの方法で守るか

|対象|このサンプルの扱い|
|---|---|
|在庫の残数・消費数|同じmutex / lockで確認と両方の更新をまとめる|
|Snapshot|同じlock内で両方の値をコピーし、lockを解放してから検査する|
|workerごとの結果・例外|起動前に専用slotを用意し、各slotは担当workerだけが書く|
|親からの結果read・表示|全workerのjoin後に行う|

Snapshotはコピーした時点で整合する値です。`TryConsume`と次のSnapshotの間には他workerが動けるため、「そのworkerの消費直後の状態」とは限りません。

C++は`std::mutex`と`std::lock_guard`を使います。mutexのunlockと、同じmutexを取得する後続lockの同期を利用し、guardのスコープを抜けるとunlockします。[C++20草案 N4861：mutex](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.requirements)、[lock_guard](https://timsong-cpp.github.io/cppwp/n4861/thread.lock.guard)

C#は`private readonly object`に対する`lock`なのでMonitor経路です。`System.Threading.Lock`型を使う新しい経路とは区別します。Monitorは同じthreadから再入できますが、C++の`std::mutex`にはその性質を当てはめられません。この例はlock中に別のlock取得メソッドを呼ばず、再入を必要としません。[Microsoft：lock文](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)

## 確認と更新を分割すると何が起こるか

次は在庫1件で、確認と更新を別々のcritical sectionに分けた場合の**論理的競合の概念図**です。各read・更新を個別にロックしていても、確認結果が更新時まで有効とは限りません。この誤った版は実行していません。

|順|worker A|worker B|残数|
|---:|---|---|---:|
|1|残数1を確認しlock解放||1|
|2||残数1を確認しlock解放|1|
|3|再lockし、再確認せず減算||0|
|4||再lockし、再確認せず減算|-1|

サンプルの`TryConsume`では「確認→減算→消費数加算」を同じlock内に置くので、この分割を作りません。なおC++で共有値を同期せずread/writeするdata raceは未定義動作であり、上のような特定の結果になるという予測はできません。[N4861：data races](https://timsong-cpp.github.io/cppwp/n4861/intro.races)

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。ソースとconsole出力はASCIIです。入力・アプリによるファイルI/O・ネットワーク処理・外部ライブラリは使いません。

### C++20

- <a href="/study/samples/threads/inventory/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/threads/inventory/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/threads/inventory/cpp/README.md" download>README.md</a>

Visual Studio 2022とCMake 3.20以降の例です。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\inventory_synchronization.exe
```

通常経路では`std::jthread::join`を明示的に呼び、完了と同期してから親がslotを読みます。途中でスレッド生成が失敗した場合も、内側の`jthread`群が先に破棄され、既存workerをjoinしてから共有在庫と結果slotを破棄します。destructorはjoinableならstopを要求してjoinしますが、この例のworkerはstop待ちをせず、最大10回の処理を終えて戻ります。worker例外は各slotの`exception_ptr`に捕捉し、join後に親で再throwします。[N4861：jthread::join](https://timsong-cpp.github.io/cppwp/n4861/thread.jthread.mem)、[jthreadの構築・破棄](https://timsong-cpp.github.io/cppwp/n4861/thread.jthread.cons)

### C# / .NET 10

- <a href="/study/samples/threads/inventory/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/threads/inventory/csharp/InventorySynchronization.csproj" download>InventorySynchronization.csproj</a>
- <a href="/study/samples/threads/inventory/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project InventorySynchronization.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。`Thread`の生成・Startに失敗しても`finally`で起動成功分をJoinします。worker例外は専用slotに保持し、全Join後に親の例外として報告します。workerが書き込み中のslotを親が読まないため、結果集計と競合しません。[Microsoft：Thread.Join](https://learn.microsoft.com/en-us/dotnet/api/system.threading.thread.join?view=net-10.0)

どちらもworker内では表示せず、開始gate・sleep・busy wait・乱数も使いません。生成できなかったworkerを待つ仕組みはありません。workerの処理回数は有限ですが、スケジューラやmutex待ちを含む終了時間の上限・公平性は保証しません。

## 実測結果と確認範囲

2026-11-04、Windows x64（25H2、build 26200.9711）で両言語を各5回実行しました。すべて終了コード0、**13 parent checksと40 worker snapshotsの検査**に成功し、最終行の値は各回共通でした。

```text
final: remaining=0 consumed=17 total_success=17 total_fail=23 total_attempts=40 snapshots=40
PASS: 13 parent checks; 40 worker snapshots validated
```

13項目は単一threadでの空在庫・1件消費・再消費拒否・負の初期値拒否など6項目、4 worker各slotの合計4項目、最終状態・総試行数など3項目です。workerは各試行後のSnapshotでも不変条件を検査します。

worker別の成功配分は実際に変化しました。**表示は親がslot番号順に並べたもので、実行順ではありません。** 成功者や順序を固定した期待値にはしていません。

|版|実行条件|build結果|
|---|---|---|
|C++|MSVC 19.35.32217.1、CMake 3.26.3、x64 Release、C++20、`/W4 /WX /permissive- /EHsc /utf-8`|警告なし|
|C#|.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errors|警告0・エラー0|

この10回で全スケジュールを検証したわけではありません。生成失敗・worker例外・Join中断への障害注入、data race検出ツール、他OS・他コンパイラ・他runtime・Unityでの実行は未実施です。競合の修正は実測だけに頼らず、共有状態への全アクセスと寿命・同期の設計も確認します。

## 実装

### C++20

<<< @/public/samples/threads/inventory/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/threads/inventory/csharp/Program.cs{csharp}
