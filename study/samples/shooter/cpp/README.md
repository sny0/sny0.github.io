# C++17 縦スクロールシューティング

`shooter_model.hpp` は外部ライブラリ・OS・時計・描画に依存しないModelです。`main.cpp` がraylib 5.5の入力・窓・描画を接続します。操作は矢印/WASD、Space長押しで発射、Rでリセット、Escで終了。画像や音声の外部アセットは不要です。

## ビルド

C++17コンパイラ、CMake 3.20以上、raylibの取込みにGitが必要です。raylib 5.5のインストール済みpackageを先に探し、見つからなければ公式の`5.5` tagをFetchContentで取得します。raylibをソースから作るために必要なOS側の開発ライブラリも用意してください。

```sh
cmake -S . -B build
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
```

実行物はsingle-configなら`build/shooter`（Windowsでは`.exe`）、Visual Studio等なら`build/Release/shooter.exe`です。MinGWでは最初のコマンドに`-G "MinGW Makefiles"`を加えます。既存raylibを使う場合は`-Draylib_DIR=...`、自動取得を禁止する場合は`-DSHOOTER_FETCH_RAYLIB=OFF`を指定します。

Windowsで確認したVS2022 x64構成では、最初のコマンドを`cmake -S . -B build -G "Visual Studio 17 2022" -A x64`とします。

Windowsの古いMinGW Makeでは日本語を含むパスの既存ソースにも`No rule to make target`となることがあります。その場合は`C:/work/shooter`等の英数字の作業フォルダへ全ファイルを置いて試してください。

`shooter --smoke`は非表示の窓で初期化と5フレームの描画を確認して終了する任意モードです。実際のキー操作やゲーム全体の目視検証ではありません。通常起動には`--smoke`を付けません。

Modelのみならraylibも通信も不要です。

```sh
cmake -S . -B build-model -DSHOOTER_BUILD_GAME=OFF
cmake --build build-model --config Release
ctest --test-dir build-model -C Release --output-on-failure
```

CMakeを使わないModel検査もできます。

```sh
g++ -std=c++17 -Wall -Wextra -pedantic model_checks.cpp -o model_checks
./model_checks
```

## 時間・衝突・上限の約束

- `World::Tick(FrameInput)` は固定1/60秒です。発射9tick、敵出現39tick、無敵48tickでそれぞれ0.15/0.65/0.8秒を表し、初射はtick 1、初敵はtick 39。作成した弾・敵も同tickに移動します。
- adapterは毎描画フレームの経過を最大0.1秒に制限し、最大5tick更新します。追いつけない場合は**未処理の整数tickを捨て、小数部分だけを保持**します。過負荷でも更新を無限に繰り返さないための方針で、シミュレーションは実時間より遅れます。バックログを保持する方式とは別です。描画は最新状態を使い、補間しません。
- 弾→敵の衝突を先に解決し、1発で複数の敵へ加点しません。その後、敵→自機の接触を処理します。無敵中も接触した敵は消えます。HP 0で以降の世界更新を停止し、Rでリセットできます。
- 配列上限は弾64/敵32です。追加をskipしても発射/出現の間隔を消費し、敵のx周期も予定出現ごとに進みます。全衝突処理中はaliveだけ変更し、最後にまとめて除去します。
- `World` は教材用のvalue stateです。通常adapterは`Tick`/`Reset`以外から状態を書き換えず、描画は`const World&`を読みます。検査では有効な衝突fixtureを直接作ります。ECSや継承階層を導入する必要はありません。

検査はModelの条件を調べるもので、raylibの実機表示・入力や、異なる処理系間のbit単位の決定性を保証するものではありません。

## この版の検証範囲（2026-10-30）

Windows / GCC 9.2.0のC++17で警告をエラー扱いにしたModelビルドと84条件の実行、CMake 3.26.3経由のModel targetとCTestを確認しました。`main.cpp`もraylib 5.5のheaderに対して単独コンパイルしています。

VS2022 / MSVC 19.35 / Windows SDK 10.0.22000.0のx64構成では、raylib 5.5を含むフルビルドとCTestが成功しました。`--smoke`で非表示640×720ウィンドウの初期化、OpenGL 3.3で5フレームの描画、終了まで確認しています。実キー操作・目視プレイは未確認です。

この環境の古いMinGW.org 9.2では、raylib依存本体が`minwindef.h`不足やWindows宣言の衝突でビルドできませんでした。依存ソースは改造していません。この失敗は上記のVS2022での確認とは区別してください。

## 公式資料（5.5固定）

- [raylib 5.5 release](https://github.com/raysan5/raylib/releases/tag/5.5)
- [raylib 5.5 API header](https://github.com/raysan5/raylib/blob/5.5/src/raylib.h)
- [raylib 5.5 basic window example](https://github.com/raysan5/raylib/blob/5.5/examples/core/core_basic_window.c)
- [raylib 5.5 CMake example](https://github.com/raysan5/raylib/blob/5.5/projects/CMake/CMakeLists.txt)

最新のWeb cheatsheetは5.5以外の版を示す場合があるため、このサンプルのAPI確認にはtag固定のheaderを使います。
