# Windowsの仮想メモリを観察する

C++17、Windows SDK、CMake 3.20以降を使用します。外部ライブラリの取得はありません。
通常のユーザー権限で実行し、16 MiBを予約・コミットして、各ページの先頭1 byteへ書きます。
管理者権限、large pages、他プロセスへのアクセスは使いません。

Visual Studio 2022のC++開発環境を用意し、3ファイルを同じフォルダへ保存します。
Developer PowerShell for VS 2022で、そのフォルダに移動して実行します。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\memory_observation.exe
$LASTEXITCODE
```

正常終了は0です。Win32 APIの失敗はAPI名とGetLastErrorの数値を表示し、1で終了します。
全領域の状態が想定と異なった場合も1です。終了途中の失敗に備え、RAIIで領域を解放します。

観察順はbaseline → MEM_RESERVE → MEM_COMMIT → 全ページへの初回write → MEM_DECOMMIT → MEM_RELEASEです。
各段階でVirtualQueryを必要な範囲だけ繰り返し、16 MiB全域の状態を検査します。
MEM_COMMIT時はPAGE_READWRITEも検査します。未コミット・decommit後・release後のデータへはアクセスしません。
release後は数値として保存したアドレスをVirtualQueryへ渡すだけで、読み書きしません。

PrivateUsageはプロセスのプライベートなコミット量、WorkingSetSizeは現在のプロセスのworking setです。
いずれもサンプル領域専用の値ではありません。差分の増減・完全な復帰・常駐の維持は検査していません。
VirtualQueryのMEM_COMMITだけから、物理ページの常駐や初回アクセス済みかどうかは分かりません。
RegionSizeも要求した割当全体のサイズとは限らず、解放後はより大きな空き領域を指す場合があります。

2026-11-02: Windows x64（25H2、build 26200.9711）、MSVC 19.35.32217.1、
Windows SDK 10.0.22000.0、CMake 3.26.3、x64 Release・C++17・/W4でビルド・実行を確認。
管理者でないトークンで実行し、終了コード0、全域の状態検査は成功しました。
API失敗の注入、メモリ不足、他のWindows版・32bit・ARM64は実行確認に含めていません。

記事と実行確認範囲: https://sny0.com/study/practice/memory/windows-memory-observation.html
