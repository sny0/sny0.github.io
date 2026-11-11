---
title: C++とC#でアセットの状態・世代・所有権を検証する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: game
  collection: asset-lifecycle-model
  order: 1
  verification: Windowsで両言語を実行確認
  summary: 実I/OやGPUを使わないsingle-threadモデルで、Ready前の使用拒否、失敗、取消後のslot保持、古い世代の完了回収、論理予算と解放を検証する。
  aliases: [asset, アセット, generation, 世代, 所有権, backpressure, cancel, MockSink, 状態遷移]
---

# C++とC#でアセットの状態・世代・所有権を検証する

**完了通知が届いても、現在の要求の結果とは限りません。** 要求世代と所有権を小さな状態遷移モデルで確かめます。設計全体と図は[ゲームのアセットロード設計](/game/asset-loading.html)を参照してください。

これは**単一asset・single-thread・手動event注入のモデル**です。実ファイル、worker、展開処理、GPU、Unityは実装していません。実I/Oは[同期read](/practice/io/file-read-observation.html)・[非同期read](/practice/io/async-file-read-observation.html)、実GPU/エンジンへの接続は各APIの契約に従う別作業です。

## 状態と論理予算

疑似assetは`41 53 30 31 10 20 30 40`の8bytesです。長さ8とmagicの`AS01`を確認します。`CpuReady`はこの検査に通った状態で、画像の展開や安全性の完全な検証ではありません。

```text
Requested -> Reading -> CpuReady -> Registering -> Ready -> Released
                     failure -> Failed
          cancellation request -> Cancelled
```

`Registering`では登録modelの完了を待ちます。`MockSink`の整数`ModelToken`を受け取るとモデル上のReadyになります。実際のGPU転送やエンジン登録の完了を観測したtokenではありません。

|予算|値と扱い|
|---|---|
|待機要求|1件。Requestedではbytesを予約しない|
|pending slot|readか登録modelの合計1件|
|staging|8bytes。read slot・CpuReady・登録slotで所有を移す|
|model token|Ready時の所有物。ReleaseでMockSinkへ返す|

この8bytesは**論理予算**です。C++の`optional`内のinline領域、C#のobject overhead、実RSS・GC回収時刻・GPUメモリは測定していません。

## 取消しで直ちに消えない所有物

Requestedの取消しはbytesを持たず、CpuReadyの取消しはCPU dataを即回収します。Reading/Registeringの取消しは**進行中slot/dataを保持**し、完了eventで回収します。新世代はRequestedになれますが、旧slotが予算を占めている間は`TryBeginRead`がfalseを返し、待機を続けます。

古いreadの完了通知が届いたら、slotを回収して結果を破棄します。古い登録の成功通知が届いたら、返されたMockSink tokenをすぐに解放します。世代が一致しないときは、現在の要求をReadyへ戻しません。Windowsの実I/Oでも取消要求と完了は別で、完了するまで領域を保持する必要があります。このモデルでは、そのOS動作を実行・検証していません。[Microsoft：CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex)

## 入手して実行する

各言語の3ファイルを、それぞれ同じフォルダへ保存します。入力・ファイルI/O・ネットワーク処理はなく、ソースと出力はASCIIです。

### C++20

- <a href="/study/samples/assets/lifecycle/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/assets/lifecycle/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/assets/lifecycle/cpp/README.md" download>README.md</a>

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\asset_lifecycle_model.exe
```

CMake 3.20以降とC++20対応コンパイラを使います。

### C# / .NET 10

- <a href="/study/samples/assets/lifecycle/csharp/Program.cs" download>Program.cs</a>
- <a href="/study/samples/assets/lifecycle/csharp/AssetLifecycleModel.csproj" download>AssetLifecycleModel.csproj</a>
- <a href="/study/samples/assets/lifecycle/csharp/README.md" download>README.md</a>

```powershell
dotnet run --project AssetLifecycleModel.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。このコードにはasync/awaitもなく、手動で完了eventを呼び出します。

## 実測と適用範囲

2026-11-04、Windows x64（25H2、build 26200.9711）で各3回実行し、全回無警告・終了0・23 checks成功でした。C++はMSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`、C#は.NET SDK 10.0.403・runtime 10.0.14、Release、warnings as errorsです。両言語のscenarioログが一致しました。

|検査群|確認したこと|
|---|---|
|正常系|各状態の所有物、Ready前の使用拒否、Ready後の使用と解放|
|失敗|短いpayload、不正magic、read失敗event、登録失敗eventを回収|
|取消・世代|進行中の所有維持、予算待ち、古いread破棄、古い登録token解放、旧世代の使用拒否|
|終了|重複Release拒否、所有slotのない完了拒否、最終カウンタ0|

```text
final: pending=0 staging_bytes=0 model_tokens=0 created=3 released=3 discarded=2
PASS: 23 checks
```

slot上限が1なので、旧完了を回収してから次世代が進みます。**新Ready後に旧完了が来る並列順序そのものは実演していません。** 実thread、I/OやGPUの競合、エンジンAPI、実メモリ予算・速度、他OS/コンパイラ/runtime・Unityは未検証です。

実機のshutdownでは、新規要求を止め、未完了をcancel/drainして結果を回収し、残るtokenを解放してからownerを破棄する設計が必要です。このモデルのdestructorやGCは実I/Oの取消・完了回収を代行しません。完成したAssetManagerとして組み込むコードではありません。

## 実装

### C++20

<<< @/public/samples/assets/lifecycle/cpp/main.cpp{cpp}

### C#

<<< @/public/samples/assets/lifecycle/csharp/Program.cs{csharp}
