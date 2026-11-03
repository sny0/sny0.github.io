# C#でファイルのbytes・位置・EOFを観察する

自己所有の一時フォルダに12bytesのfixtureを排他的に作り、同期`FileStream.Read(Span<byte>)`で観察します。fixtureは`41 42 00 0D 0A E3 81 82 10 20 FE FF`です。文字列decodeや改行変換は行いません。

.NET 10 SDKで実行します。追加NuGetパッケージはありません。

```powershell
dotnet run --project FileReadObservation.csproj -c Release
```

Windows x64、.NET SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで実行確認しました。3回とも警告0・エラー0、終了0、8 checksでした。

アプリ側のread bufferは5bytes、FileStreamのbufferSize設定は4096bytesです。実読取数と論理位置を表示し、EOFの0、offset5へseekした後の3bytes、missing fileの失敗を検査します。今回のread列は5→5→2→0ですが、短いreadでも累積bytesを検査し、回数を固定しません。

`Directory.CreateTempSubdirectory`と`FileMode.CreateNew`を使い、streamは`using`で閉じます。削除するのは自分が作成に成功したfixtureと空の一時フォルダだけで、再帰削除はしません。入力・ネットワーク処理はなく、ソースと出力はASCIIです。

FileStreamの内部bufferとOSキャッシュは別です。read呼出数からsystem call数や物理I/O回数は分かりません。性能・永続性・他OS・他runtime・Unityは未検証です。

解説: https://sny0.com/study/practice/io/file-read-observation.html
