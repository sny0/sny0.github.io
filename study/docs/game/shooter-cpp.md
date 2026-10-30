---
title: "シューティング実装例 — C++17とraylib"
study:
  source: "新規執筆"
  kind: "実装例"
  status: "モデル検証済み"
  domain: game
  summary: "raylib 5.5で動かす小さな縦シューティング。純C++ Model、入力・描画、CMake、モデル検査を完全なファイルで読む。"
  aliases: [シューティング, STG, C++, raylib, 固定更新, ゲームループ, サンプル]
---

# シューティング実装例 — C++17とraylib

[設計の考え方と共通仕様](/game/shooter-design.html)をC++へ落とした例です。C++17を使い、キーボードと円の描画だけをraylib 5.5に任せます。ゲームの状態とルールはraylibに依存しません。[Unity版](/game/shooter-unity.html)と責務を比べながら読めます。

## ファイルの役割

| ファイル | 役割 |
| --- | --- |
| `shooter_model.hpp` | 自機・弾・敵・HP・スコア、1tickのルール |
| `main.cpp` | 入力、実時間から固定tickへの変換、ウィンドウ、描画 |
| `CMakeLists.txt` | Modelの検査とraylib版のビルド設定 |
| `model_checks.cpp` | 画面を開かずにゲームの不変条件を確認 |

Modelを画面なしで実行できるため、発射間隔・衝突・再開を調べるたびに、ウィンドウを操作して敵を狙う必要がありません。ただし、Modelの検査だけで描画・キー入力・OS上の動作まで検証できるわけではありません。

## ソースを入手する

同じディレクトリへ、次の4ファイルを保存します。READMEにはビルド方法と確認範囲も記載しています。

- <a href="/study/samples/shooter/cpp/shooter_model.hpp" download>shooter_model.hpp</a>
- <a href="/study/samples/shooter/cpp/main.cpp" download>main.cpp</a>
- <a href="/study/samples/shooter/cpp/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/shooter/cpp/model_checks.cpp" download>model_checks.cpp</a>
- <a href="/study/samples/shooter/cpp/README.md" download>README.md</a>

## 起動する

ファイルを保存したディレクトリで実行します。CMake 3.20以上、C/C++コンパイラ、対応するビルドツール、依存取得用のGitが必要です。raylib 5.5を既にCMakeから見つけられる環境ではそのライブラリを使い、ない場合はCMake設定時に5.5のソースを取得してビルドします。初回の依存取得にはネットワーク接続が必要です。Linux等では、そのOS向けのウィンドウ・OpenGL関連の開発用依存も必要になります。

WindowsのMinGW Makefilesで確認する場合は、英数字だけの作業フォルダを使ってください。今回のMinGW環境では、日本語を含む絶対パスで入力ファイルを見つけられずにビルドが止まる問題がありました。他のコンパイラやGeneratorも一律に同じ制約という意味ではありません。

```sh
cmake -S . -B build
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
```

実行ファイル名や、画面なしで検査する設定は下のCMakeとREADMEで確認できます。Visual Studioのような複数構成のGeneratorでは、実行ファイルが`build/Release/`等に置かれます。単一構成のGeneratorでは通常`build/`です。

WindowsでVisual Studio 2022を使う場合は、最初の設定を次のように指定できます。今回の描画ライブラリ込みの確認も、この構成を使いました。

```sh
cmake -S . -B build-vs -G "Visual Studio 17 2022" -A x64
cmake --build build-vs --config Release
ctest --test-dir build-vs -C Release --output-on-failure
./build-vs/Release/shooter.exe
```

```sh
# 単一構成の例。Windowsなら build/shooter.exe
./build/shooter
```

画面を開かずModelだけを検査する場合は、raylibの取得を省略できます。

```sh
cmake -S . -B build-model -DSHOOTER_BUILD_GAME=OFF
cmake --build build-model --config Release
ctest --test-dir build-model -C Release --output-on-failure
```

操作は矢印/WASD、Space、Rです。敵の出現位置は循環するので、自機を動かして敵の下へ入り、弾が当たる位置を探します。

## Modelの全コード

`World`が状態を持ち、`Tick`で1/60秒分だけ進めます。移動を正規化する理由、衝突の順番、消去を最後にまとめる理由は[設計ページ](/game/shooter-design.html)で説明しています。

<<< @/public/samples/shooter/cpp/shooter_model.hpp{cpp}

## 入力・ゲームループ・描画の全コード

キーを読む場所で`FrameInput`を作り、状態を進める場所へ渡します。描画は状態を読み取ります。Game Over中もこの外側のループを回すため、再開の入力を受け付けられます。

<<< @/public/samples/shooter/cpp/main.cpp{cpp}

## CMakeの全コード

<<< @/public/samples/shooter/cpp/CMakeLists.txt{cmake}

## Modelの検査コード

画面なしで、仕様上起きてほしくない変化を確認します。例えば「弾1個に敵が重なっていても加点は1回」「Game Over後は状態が進まない」「Rで初期状態へ戻る」を検査します。

<<< @/public/samples/shooter/cpp/model_checks.cpp{cpp}

## 確認範囲

2026-10-30時点で、次を確認しました。

| 確認対象 | 結果 |
| --- | --- |
| 純Model | GCC 9.2、C++17、警告をエラー扱いにしたコンパイルと84項目の実行検査が成功 |
| CMake / CTest | Modelの検査が1/1成功 |
| raylibを含むビルド | Visual Studio 2022 / MSVC 19.35、x64、Windows SDK 10.0.22000、raylib 5.5で成功 |
| 描画の初期化と終了 | `--smoke`で非表示ウィンドウを開き、OpenGL 3.3で5フレーム描画して正常終了 |
| 実キー入力・目視でのプレイ | 未確認 |

`shooter --smoke`は描画APIの初期化・描画・終了を短く確認するための任意モードです。通常起動では指定せず、ウィンドウを開いて操作します。Modelの検査と起動検査を通過したことを、全OS・全ドライバでのプレイ確認と同一には扱いません。

今回の古いMinGW.org環境では、Modelと描画側の単独コンパイルは通りましたが、raylib本体のビルドはWindowsヘッダーの互換性で失敗しました。依存ライブラリのソースを改造して回避せず、上のMSVC構成で確認しています。

## 参考資料

- [raylib 5.5の公開ヘッダー：入力・時間・描画API](https://github.com/raysan5/raylib/blob/5.5/src/raylib.h)
- [raylib公式：CMakeで利用する](https://github.com/raysan5/raylib/wiki/Working-with-CMake)
- [固定更新とループの考え方](/game/patterns/game-loop-and-update.html)
