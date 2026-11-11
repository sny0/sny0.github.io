---
title: Windowsで予約・コミット・初回書き込みを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: memory-observation
  order: 1
  verification: Windows x64で実行確認
  summary: VirtualAllocで16MiBを予約・コミットし、ページごとの初回書き込み、decommit、releaseをVirtualQueryとプロセス統計で観察するC++17サンプル。
  aliases: [VirtualAlloc, VirtualQuery, VirtualFree, MEM_RESERVE, MEM_COMMIT, MEM_DECOMMIT, MEM_RELEASE, PrivateUsage, WorkingSetSize, 初回アクセス]
---

# Windowsで予約・コミット・初回書き込みを観察する

16MiBの領域を使い、**アドレスの予約、コミット、各ページへの初回書き込み、コミットの解除、アドレスの解放**を順に実行します。OSのAPIを直接呼ぶC++17の小さなコンソールプログラムです。概念は[仮想メモリ](/os/virtual-memory.html)、アロケータからOSまでのつながりは[確保すると内部で何が起きるか](/runtime/memory/allocation-journey.html)へつなげて読めます。

自分のプロセスだけを対象にし、管理者権限やlarge pagesは使いません。書き込みはコミット後の領域に限定します。

## 何を順に観察するか

| 段階 | 操作 | 16MiB全域で調べる状態 |
| --- | --- | --- |
| 0 | サンプル領域を作る前の統計を記録 | 問い合わせる領域はまだない |
| 1 | `VirtualAlloc`の`MEM_RESERVE` | `MEM_RESERVE` |
| 2 | 同じ領域を`MEM_COMMIT` | `MEM_COMMIT`、`PAGE_READWRITE` |
| 3 | 各ページの先頭1byteへ初めて書く | 引き続き`MEM_COMMIT`、`PAGE_READWRITE` |
| 4 | `VirtualFree`の`MEM_DECOMMIT` | `MEM_RESERVE` |
| 5 | 予約の先頭とサイズ0で`MEM_RELEASE` | `MEM_FREE` |

予約ではアドレス範囲を取り置きます。コミットでは、その範囲のページに対するコミットの負担が発生します。実際にアクセスするのは別の段階です。この例では予約とコミットを別の呼び出しにしています。[VirtualAllocの仕様](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualalloc)

`MEM_DECOMMIT`後もアドレスの予約は残ります。`MEM_RELEASE`は、その予約全体を手放します。どちらの操作後も、対象データを読んだり書いたりしません。解放後に保存した数値アドレスを`VirtualQuery`へ渡すのは、状態を問い合わせるためです。そのアドレスは別の割当に再利用され得ます。[VirtualFreeの仕様](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualfree)

## ソースを入手して実行する

次の3ファイルを同じフォルダへ保存します。外部ライブラリのダウンロードはありません。Windows SDKを含むC++開発環境と、CMake 3.20以降を使います。

- <a href="/study/samples/memory/windows/main.cpp" download>main.cpp</a>
- <a href="/study/samples/memory/windows/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/memory/windows/README.md" download>README.md</a>

Visual Studio 2022の **Developer PowerShell** を開き、保存したフォルダで実行します。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\memory_observation.exe
$LASTEXITCODE
```

最後に`PASS`と出て終了コードが0なら、領域の状態検査まで通っています。Win32 APIが失敗するとAPI名と`GetLastError`の数値を表示し、1で終了します。状態が想定と違った場合も1です。`ReservedRegion`はコピーを禁止して所有者を一つにし、途中で例外が起きてもデストラクタで解放を試みます。通常の終了経路では、明示した`release()`の成功も検査します。

## 数字を読む3つの窓

| 出力 | 見ているもの | 読み方 |
| --- | --- | --- |
| `VirtualQuery`の`State` | 問い合わせたアドレスを含む、同じ属性を持つページ範囲 | 予約・コミット・空きを区別する |
| `PrivateUsage` | プロセス全体の、プライベートなコミット量 | サンプル領域以外のヒープなども含む。ページファイルに実際に書かれた量とは区別する |
| `WorkingSetSize` | プロセスの現在のworking setのサイズ | 現在物理メモリに常駐するページの集合を見る。共有ページも含み、この16MiB専用の値ではない |

`PrivateUsage`と`WorkingSetSize`は[`GetProcessMemoryInfo`](https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-getprocessmemoryinfo)から得ます。各フィールドの定義は[`PROCESS_MEMORY_COUNTERS_EX`](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters_ex)、常駐とページフォルトの関係は[Working Set](https://learn.microsoft.com/en-us/windows/win32/memory/working-set)を参照してください。

**`VirtualQuery`の`MEM_COMMIT`だけでは、そのページが今RAMに常駐しているか、初回アクセスを済ませたかは分かりません。** 段階2と3の`State`が同じなのを、プロセス統計と見比べます。初回アクセスによるworking setの増加を観察できますが、OSのトリミングや他の処理も統計に影響するため、増加量がちょうど16MiBになることや、その常駐が維持されることは保証しません。[VirtualQuery](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualquery)、[Working Set](https://learn.microsoft.com/en-us/windows/win32/memory/working-set)

プログラムは統計の増減を合否に使いません。**全領域のページ状態と、コミット中の保護属性**を検査し、統計は観察値として表示します。

## 全領域をどう調べているか

`VirtualQuery`は「要求した割当の全体」を常に返すAPIではありません。`RegionSize`は、問い合わせ位置から属性がそろっている範囲を表します。`inspectRange()`は返された範囲の末尾へ進み、16MiBを覆うまで繰り返します。この実行で領域が一つにまとまっていても、先頭1ページだけの確認では終わらせません。[VirtualQueryの説明](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualquery)

`MEM_RESERVE`の`Protect`は未定義なので検査・数値表示をしません。`MEM_FREE`では`AllocationBase`、`AllocationProtect`、`Protect`、`Type`が未定義です。解放後の大きな`RegionSize`も、周囲を含む空き領域として読みます。[MEMORY_BASIC_INFORMATION](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-memory_basic_information)

ページの大きさと割当開始アドレスの粒度は、`GetSystemInfo`で取得します。今回の環境ではページサイズが4096byte、割当粒度が65536byteでした。コードに4096を埋め込まず、実際のページサイズごとに1byteを書きます。16MiB・4096byteの組合せでは4096ページへの書き込みです。`volatile`を付け、Release最適化でも書き込みが除去されないようにしています。[GetSystemInfo](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-getsysteminfo)、[SYSTEM_INFO](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/ns-sysinfoapi-system_info)

## 手元で実行した結果

2026年11月2日、Windows x64（25H2、build 26200.9711）、Visual Studio 2022のMSVC **19.35.32217.1**、Windows SDK **10.0.22000.0**、CMake **3.26.3**で、x64 Release・C++17・`/W4`のビルドと実行を確認しました。実行トークンが管理者ではないことも確認しています。コンパイラ警告は出ず、終了コードは0でした。

次はその1回の観察値です。単位はbyteです。**再実行時の固定期待値にはしません。**

| 段階 | `State` | `PrivateUsage` | `WorkingSetSize` |
| --- | --- | ---: | ---: |
| baseline | 対象領域なし | 741,376 | 4,689,920 |
| reserve | `MEM_RESERVE` | 741,376 | 4,694,016 |
| commit、未アクセス | `MEM_COMMIT` | 17,551,360 | 4,698,112 |
| 各ページへ初回write | `MEM_COMMIT` | 17,551,360 | 21,475,328 |
| decommit | `MEM_RESERVE` | 741,376 | 4,702,208 |
| release | `MEM_FREE` | 741,376 | 4,702,208 |

この回では、commit時にプライベートなコミット量が増え、初回writeの前後でworking setが大きく変わりました。commit時の`PrivateUsage`差分は16MiBに32KiBを加えた値で、その余分な32KiBの内訳はこの統計だけでは特定できません。release後のworking setもbaselineと完全には一致していません。領域の状態とプロセス全体の統計を分けて読むための例です。

正常系で、reserve・commit・初回write・decommit・release後の16MiB全域と、コミット中の`PAGE_READWRITE`を検査しました。API失敗の注入、メモリ不足、他のWindows版・32bit・ARM64、ページアウトの強制観察は実行確認に含めていません。

## main.cpp

<<< @/public/samples/memory/windows/main.cpp{cpp}

## CMakeLists.txt

<<< @/public/samples/memory/windows/CMakeLists.txt{cmake}

## 関連する本文

- [仮想メモリ](/os/virtual-memory.html)
- [確保すると内部で何が起きるか](/runtime/memory/allocation-journey.html)
- [アロケータ・プール・アリーナ](/runtime/memory/allocators-and-pools.html)
- [記憶域期間・スコープ・寿命](/runtime/memory/storage-duration-and-lifetime.html)
