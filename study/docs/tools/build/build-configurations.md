---
title: ビルド構成 — Debug/Development/Release/Shipping・シンボルファイル・PDB・デバッガ
study:
  source: C++ Wiki
  status: published
  summary: 最適化・チェック・デバッグ情報・ログの違いから、Debug・Development・Release・Shippingを整理する。
  section: reference
  format: article
  domain: tools
---

# ビルド構成 — Debug/Development/Release/Shipping・シンボルファイル・PDB・デバッガ

## 一言で言うと

同じソースから「**何を優先するか**」別に複数の成果物を作り分けるのが**ビルド構成 (configuration)**。最適化・チェック・デバッグ情報・ログの4軸の組み合わせです(最適化の中身は → [コンパイラ最適化・未定義動作の影響・Debug/Release・ゼロコスト抽象化](/runtime/cpp-internals/optimization-and-ub.html))。

## 最適化と診断機能を組み合わせた構成例

| 構成 | 最適化 | assert/チェック | デバッグ情報 | 用途 |
|---|---|---|---|---|
| **Debug** | なし（例 `-O0`、`/Od`） | 開発用チェックを有効化 | あり | ロジックのステップ実行 |
| **Development** | あり | 開発用チェック、計測などを選んで残す | あり | 日常の開発・デバッグ |
| **Release/Profile** | あり | 必要な計測を残すことがある | 必要に応じて生成・保管 | 本番相当の性能計測 |
| **Shipping** | 出荷向けの設定。LTO の有無は個別に決まる | 出荷に不要な診断機能を除く | 調査用に生成・保管できる | 出荷物 |

CMakeには `Debug`、`Release`、`RelWithDebInfo`、`MinSizeRel` という標準構成があり、Visual Studio などの複数構成ジェネレーターが初期状態で持つ構成の一覧はジェネレーターごとに異なります。最適化したコードの調査には `RelWithDebInfo` も選べます。Unreal Engine 5.8 には `Debug`、`DebugGame`、`Development`、`Shipping`、`Test` があり、使える組み合わせはターゲットで変わります。`Shipping` でも設定やビルド方法によってデバッグシンボルを生成できます。[CMake の標準構成](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html#default-and-custom-configurations) · [Unreal Engine 5.8 のビルド構成](https://dev.epicgames.com/documentation/unreal-engine/build-configurations-reference-for-unreal-engine)

標準の `assert` が有効かは `<cassert>` を取り込む時点の `NDEBUG` で決まります。最適化、構成名、自作の `#if GAME_SHIPPING` とは別の指定です。**構成間で挙動が変わりすぎると「Shippingでだけ出るバグ」が増える**ので、ゲームロジックの分岐は最小限にします。[Microsoft の assert と NDEBUG](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/assert-macro-assert-wassert)

## シンボルファイル(PDB)

コンパイラは「機械語のアドレス ⇔ ソースの行・変数名」の対応表=**デバッグ情報**を作れます。Windows/MSVCでは**PDBファイル**(別ファイル)、GCC/Clangでは実行ファイル内蔵(-g)や分離(split-dwarf)。

- **最適化とデバッグ情報は独立**: `-O2 -g` は普通(Development構成の実体)。最適化で変数が消える・行が飛ぶのは情報の限界であってPDBの故障ではない
- **配布ビルドの調査**では、そのビルドのEXE・DLLと対応するPDBを保管します。ダンプの例外コードやモジュール内の位置を確認し、対応するシンボルで関数名やソースの行を調べられます。公開用と社内用のシンボルは、必要な情報と公開範囲に応じて管理します。[クラッシュダンプとPDB](/tools/windows/crash-dumps-and-symbols.html)

## デバッガ

- Visual Studioデバッガ(Windows/コンソールの主力)、LLDB(Mac/Clang系)、GDB(Linux/GCC系)
- ブレークポイント、ステップ実行、ウォッチに加え、ゲーム開発では次の機能が役立ちます。
  - **条件付きブレーク**(`enemyId == 42` のときだけ止まる)/ データブレークポイント(**このアドレスに書き込んだら止まる**——メモリ破壊犯の特定に絶大 → [メモリバグ](/runtime/memory/memory-bugs.html))
  - クラッシュダンプによる調査では、例外発生時に保存されたスレッドやメモリの情報を開きます。保存される範囲はダンプの種類によって異なります。
  - アタッチ: 起動済みのゲームプロセスに後から接続
- 「printfデバッグは恥」ではない——並行・タイミング系はログの方が有効なことも多い。**両刀**が正解

## C#/Unityとの対応

| Unity/C# | C++ |
|---|---|
| エディタ再生(Mono/JIT) | Debug/Development相当 |
| Development Build | Unity の Player に開発用機能を含める設定 |
| Script Debugging | Development Build と併用して、Player のスクリプトへのデバッガー接続を許可 |
| IL2CPP の C++ Compiler Configuration | 生成 C++ のコンパイラー構成。Unity 6.3 LTS では Debug、Release、Master |
| .pdb/.mdb(スクリプトデバッグ情報) | PDB(概念同一) |
| Cloud Diagnostics / Crashlytics | クラッシュダンプ+シンボルサーバー |

Unity 6.3 LTS の Development Build と Script Debugging は Player のオプションです。IL2CPP の Debug、Release、Master は生成 C++ の最適化を設定する別項目です。[Unity 6.3 — BuildOptions.AllowDebugging](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/BuildOptions.AllowDebugging.html) · [Unity 6.3 — Il2CppCompilerConfiguration](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Il2CppCompilerConfiguration.html)

## Unity開発者が誤解しやすい点

1. 「デバッグはエディタでやるもの」— C++では**Shipping相当でだけ出るバグ**(最適化・タイミング・アセット差)を追う技術(ダンプ解析)が必須スキル
2. 「PDBはビルドの副産物」— Shippingでは**成果物の一部**(保管しないとサポート不能)
3. 標準の `assert` を出荷構成で無効にする場合は `NDEBUG` の設定を確認します。出荷物でも必要な入力検査や失敗処理は、`assert` の外に実装します(→ [契約のassert](/languages/cpp/exceptions.html))。

## 実務指針

- 毎日Developmentで開発し、**週次以上でShippingビルドを起動・テスト**(構成差バグの早期発見)
- ビルドIDをゲーム内に表示(スクショから即座にどのビルドか特定)+ PDBと紐付け
- assertには**メッセージと値**を(`assert(index < size && "enemy index out of range")`)

## 理解度チェック

1. 4構成の違いを「最適化・チェック・デバッグ情報」の3軸で言えますか。
2. ShippingビルドでPDBを生成・保管すべき理由は?
3. データブレークポイントはどんなバグに効きますか。

## 演習

[cmake_demo](/tools/build/samples/cmake-demo.html) を Debug と Release でそれぞれビルドし、実行ファイルのサイズと、`cmake --build build --verbose` で表示するコンパイラーのフラグを比較してください。このサンプルでは `assert` を呼ばないので、`NDEBUG` が設定されているかはフラグから読みます。Ninja などでは `-DCMAKE_BUILD_TYPE=Debug` と `Release` を別々のビルドフォルダーに指定します。Visual Studio などの場合は、同じビルドフォルダーに対して `--config Debug` と `--config Release` を指定します。

---

関連項目：[ビルドツール: CMake](/tools/build/build-tools-cmake.html) / [学習ガイド](/tools/build/) / [ビルド時間](/tools/build/build-speed.html)
