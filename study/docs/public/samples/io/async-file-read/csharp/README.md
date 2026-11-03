# C#で同期readとReadAsyncを比べる

自己所有の一時directoryに`FileMode.CreateNew`で12bytesのfixtureを作り、別streamで同期`Read`と`FileOptions.Asynchronous`による`ReadAsync(Memory<byte>)`を行います。期待bytesは`41 42 00 0D 0A E3 81 82 10 20 FE FF`です。

.NET 10 SDKで実行します。追加NuGetパッケージはありません。

```powershell
dotnet run --project AsyncFileReadObservation.csproj -c Release
```

`ReadAsync`のValueTaskを一度だけawaitします。返却後に`IsCompleted`を調べた状態が`completed_at_check`であり、返却の厳密な瞬間の状態ではありません。同期baselineはこの観察を行わず`n/a`です。未完了の可能性がある間は短い純粋な整数計算だけを行い、await後に初めてbufferとPositionを使います。stream/arrayは完了まで保持します。

Windows x64、.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで各3回確認し、警告0・エラー0・終了0・7 checksでした。今回の非同期12要求はすべて確認時点で完了済みでした。未完了でも処理できる構造で、状態の比率を固定したassertはしません。

アプリbufferは5bytes、FileStreamのbufferSize設定は4096bytesです。短いreadを許して累積し、全bytes・EOF・長さ・両方式の結果一致を検査します。自己fixtureと空directoryだけを削除し、再帰削除はしません。ソースと出力はASCII、入力・ネットワーク処理はありません。

Task.RunやSleepで未完了を強制せず、キャンセル/故障注入も行いません。速度・物理I/O・計算との重なり・別thread実行、他OS/runtime・Unityは未検証です。C++版のevent待ちをFileStreamの内部実装そのものとして扱う例ではありません。

解説: https://sny0.com/study/practice/io/async-file-read-observation.html
