# C++20で在庫の同期を観察する

初期在庫17件に対して4 workerが各10回消費を試みます。同じ`std::mutex`を`std::lock_guard`で取得し、残数確認・減算・消費数加算を一つのcritical sectionにします。Snapshotも同じmutexで値をコピーします。

Visual Studio 2022とCMake 3.20以降の例:

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\inventory_synchronization.exe
```

Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で実行確認しました。5回とも無警告、終了0、13 parent checksと40 worker snapshotsの検査に成功しました。他OS・他コンパイラでは未実行です。

各回の最終結果は`remaining=0 consumed=17 total_success=17 total_fail=23 total_attempts=40`です。worker別の配分・実行順・公平性は保証しません。表示順は親が決めたslot順です。

結果slotは起動前に確保し、各workerが自分のslotだけを書き、親は全`join`後に読みます。worker例外は`exception_ptr`に捕捉します。内側の`jthread`群が共有在庫とslotより先に破棄されるため、途中のスレッド生成失敗でも既存workerをjoinしてから共有状態を破棄します。失敗経路への障害注入は未実施です。

workerは10回の有限ループで、開始gate・sleep・busy wait・I/Oは使いません。ソースと出力はASCIIです。入力・ファイルI/O・ネットワーク・外部ライブラリは不要です。終了時間の上限を測定する例ではありません。

解説: https://sny0.com/study/practice/threads/inventory-synchronization.html
