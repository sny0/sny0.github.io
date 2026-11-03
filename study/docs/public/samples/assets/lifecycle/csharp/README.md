# C#のアセット寿命モデル

single-threadで完了eventを手動注入するconsoleモデルです。実ファイル、worker、展開処理、GPU、Unity等のエンジンは使いません。`MockSink`の整数tokenは登録のモデルで、実GPU完了を表しません。

```powershell
dotnet run --project AssetLifecycleModel.csproj -c Release
```

.NET 10 SDKを使い、追加NuGetパッケージはありません。Windows x64、SDK 10.0.403、runtime 10.0.14、Release、warnings as errorsで3回実行し、警告0・エラー0・終了0・23 checksでした。

状態はRequested→Reading→CpuReady→Registering→Ready→ReleasedとFailed/Cancelledです。8bytesの疑似assetを長さ・magicで検査し、Ready前の使用、重複解放、世代の古い完了を拒否/回収します。

待機要求1件、pending slot1件、staging8bytesという論理予算です。実managed heap、GCの回収時刻、object overheadやGPUメモリを測る値ではありません。Reading/Registeringの取消し後もslotを完了eventまで保持し、新世代を予算待ちにします。旧登録成功のmodel tokenも解放します。最終pending/staging/tokenは0、created=3/released=3/discarded=2です。

slot上限1なので、新Ready後に旧完了が来る並列順序は実演しません。モデルのscope終了/GCは実I/Oをcancel/drainするものではありません。実機shutdownやAPI handleの解放、thread条件は別途必要で、完成AssetManagerやUnity実装ではありません。他OS/runtime・実I/O/GPUは未検証です。ソースと出力はASCII、入力・ファイルI/O・ネットワーク処理はありません。

解説: https://sny0.com/study/practice/assets/asset-lifecycle-model.html
