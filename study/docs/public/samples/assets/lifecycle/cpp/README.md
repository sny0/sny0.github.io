# C++20のアセット寿命モデル

single-threadで完了eventを手動注入するconsoleモデルです。実ファイル、worker、展開処理、GPU、ゲームエンジンは使いません。`MockSink`が返す整数tokenは登録のモデルで、実GPU完了を表しません。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\asset_lifecycle_model.exe
```

CMake 3.20以降とC++20対応コンパイラを使います。Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、Release、`/W4 /WX /permissive- /EHsc /utf-8`で3回実行し、無警告・終了0・23 checksでした。

状態はRequested→Reading→CpuReady→Registering→Ready→ReleasedとFailed/Cancelledです。8bytesの疑似assetを長さ・magicで検査し、Ready前の使用、重複解放、世代の古い完了を拒否/回収します。

待機要求1件、pending slot1件、staging8bytesという論理予算です。実RSS、`optional`のinline領域、allocatorやGPUメモリを測る値ではありません。Reading/Registeringの取消し後もslotを完了eventまで保持し、新世代を予算待ちにします。旧登録成功のmodel tokenも解放します。最終pending/staging/tokenは0、created=3/released=3/discarded=2です。

slot上限1なので、新Ready後に旧完了が来る並列順序は実演しません。モデルのdestructorは実I/Oをcancel/drainしません。実機のshutdownは要求受付停止・未完了回収・token解放・owner破棄を別途設計する必要があります。完成AssetManagerや実機API接続例ではありません。他OS/コンパイラ・Unityは未検証です。ソースと出力はASCII、入力・ファイルI/O・ネットワーク・外部ライブラリは不要です。

解説: https://sny0.com/study/practice/assets/asset-lifecycle-model.html
