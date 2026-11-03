# Windowsでプロセスとスレッドを観察する

Windows 10以降、C++17、Windows SDK、CMake 3.20以降が対象です。
Visual Studio 2022のC++開発環境を使います。外部依存の取得、管理者権限、他アプリへの操作はありません。

3ファイルを同じフォルダへ保存し、Developer PowerShell for VS 2022で実行します。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\process_observation.exe
$LASTEXITCODE
.\build\Release\process_observation.exe --child
$LASTEXITCODE
```

引数なしは親モードです。workerを作ってjoinし、同じexeを --child 付きで1回だけ起動します。
--child は自己PID/TIDを表示して終了し、workerや子プロセスを作りません。
その他の引数はusageを表示して2で終了します。API失敗・状態検査失敗は1、成功は0です。

PIDはプロセス、TIDはスレッドのIDです。workerは親とPIDが同じで、main側とTIDが異なることを検査します。
共有atomicへmain側とworkerが各1000回加算し、join後に合計2000と結果を調べます。
workerの記録はjoin後に親側が表示します。表示順は実際のスケジューリング順ではありません。
PID/TID・アドレスの数値は固定期待値にしません。

namespace-scopeの通常のオブジェクトのコンストラクタは、固定enumのイベントを記録するだけです。
表示はwmainに入ってから行います。この目印ではPE entry point、loader、CRTの全内部を追跡できません。

CreateProcessWへ完全なexeパスを明示し、引用符付きのコマンドラインは書き換え可能なバッファで渡します。
bInheritHandlesはFALSEです。子のstdoutが親のリダイレクトログへ現れることや、親子の出力順は保証しません。
親側はPROCESS_INFORMATIONをGetProcessId/GetThreadIdと照合し、子の自己表示は --child 単独でも確認できます。

子はPROC_THREAD_ATTRIBUTE_JOB_LISTで、作成時からサンプル専用のunnamed jobへ所属させます。
jobはプロセス数1とKILL_ON_JOB_CLOSEを設定します。正常系はプロセス終了を最大5000ms待ちます。
終了を観測できず例外になった場合、guardが自分のjobを停止し、最大2000msの追加waitを行います。
最後のjob handleを閉じる方針もRAIIで保ち、子の取り残しを避けます。OSによる終了完了の実時間上限を保証するものではありません。
すべての所有HANDLEはRAIIで閉じます。属性リストも破棄します。

2026-11-03: Windows x64（25H2、build 26200.9711）、MSVC 19.35.32217.1、
Windows SDK 10.0.22000.0、CMake 3.26.3、x64 Release・C++17・/W4 /WX /utf-8で
無警告のビルドと実行を確認しました。管理者でないトークンで、親モードと --child は終了0、
--unexpected と --child extra は終了2でした。タイムアウト・API失敗の注入、極端な長いパス、
他のWindows版・32bit・ARM64は実行確認に含めていません。

記事: https://sny0.com/study/practice/process/windows-process-observation.html
