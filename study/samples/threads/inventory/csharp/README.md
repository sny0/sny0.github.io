# C#で在庫の同期を観察する

初期在庫17件に対して4 workerが各10回消費を試みます。`private readonly object`を同じ`lock`で取得し、残数確認・減算・消費数加算を一つのcritical sectionにします。Snapshotも同じlock内で値をコピーします。この`object`型のlockはMonitor経路です。

.NET 10 SDKで実行します。追加NuGetパッケージはありません。

```powershell
dotnet run --project InventorySynchronization.csproj -c Release
```

Windows x64、.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで実行確認しました。5回とも警告0・エラー0、終了0、13 parent checksと40 worker snapshotsの検査に成功しました。他OS・他runtime・Unityでは未実行です。

各回の最終結果は`remaining=0 consumed=17 total_success=17 total_fail=23 total_attempts=40`です。worker別の配分・実行順・公平性は保証しません。表示順は親が決めたslot順です。

各workerは事前確保した専用slotへ結果・例外を書き、親は全`Thread.Join`後に読みます。生成・Start失敗時も`finally`で起動成功分をJoinします。workerはforeground、10回の有限ループです。開始gate・sleep・busy wait・worker内I/O・Thread.Interruptは使いません。失敗経路への障害注入は未実施です。

Monitorのlockは同じthreadから再入できますが、この例では再入しません。C++の`std::mutex`の再取得へその性質を当てはめることはできません。ソースと出力はASCII、入力・ファイルI/O・ネットワーク処理はありません。終了時間の上限を測定する例ではありません。

解説: https://sny0.com/study/practice/threads/inventory-synchronization.html
