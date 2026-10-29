---
title: "ビルド構成 — Debug/Development/Release/Shipping・シンボルファイル・PDB・デバッガ"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "同じソースから「何を優先するか」別に複数の成果物を作り分けるのがビルド構成 (configuration)。最適化・チェック・デバッグ情報・ログの4軸の組み合わせです(最適化の中身は → 第6部)。"
---

# ビルド構成 — Debug/Development/Release/Shipping・シンボルファイル・PDB・デバッガ

## 一言で言うと

同じソースから「**何を優先するか**」別に複数の成果物を作り分けるのが**ビルド構成 (configuration)**。最適化・チェック・デバッグ情報・ログの4軸の組み合わせです(最適化の中身は → [第6部](/runtime/cpp-internals/optimization-and-ub.html))。

## ゲーム開発の典型4構成

| 構成 | 最適化 | assert/チェック | デバッグ情報 | 用途 |
|---|---|---|---|---|
| **Debug** | なし(-O0//Od) | 全部有効 | フル | ロジックのステップ実行。ゲームによっては遊べない速度 |
| **Development** | あり(-O2) | 有効(assert・チートメニュー・プロファイラ計測) | あり | **日常の開発・デバッグの主力**。UEのDevelopmentがこれ |
| **Release/Profile** | あり | 計測のみ残す | あり(外部保存) | 性能計測(チェックのコストを排除した本番相当) |
| **Shipping** | 最大+LTO | 無効(クラッシュレポートのみ) | **PDBは生成して手元に保管**(同梱しない) | 出荷物 |

- 2構成(Debug/Release)しかない標準的なCMake設定に対し、ゲームは「最適化ありでデバッグもしたい」需要が強く、中間構成を足すのが通例
- 構成ごとの分岐はマクロで: `NDEBUG`(標準: assert無効化)、自前の `#if GAME_SHIPPING` など。**構成間で挙動が変わりすぎると「Shippingでだけ出るバグ」が増える**ので、ゲームロジックの分岐は最小限に

## シンボルファイル(PDB)

コンパイラは「機械語のアドレス ⇔ ソースの行・変数名」の対応表=**デバッグ情報**を作れます。Windows/MSVCでは**PDBファイル**(別ファイル)、GCC/Clangでは実行ファイル内蔵(-g)や分離(split-dwarf)。

- **最適化とデバッグ情報は独立**: `-O2 -g` は普通(Development構成の実体)。最適化で変数が消える・行が飛ぶのは情報の限界であってPDBの故障ではない
- **Shippingの鉄則**: PDBは必ず生成して**ビルドごとに保管**(シンボルサーバー)。ユーザーのクラッシュダンプ(スタックのアドレス列)は、**そのビルドのPDBがないと解読不能**。「シンボル無しのクラッシュレポート=ただの16進数」
- PDBを同梱・配布しない(リバースエンジニアリングが容易になる)

## デバッガ

- Visual Studioデバッガ(Windows/コンソールの主力)、LLDB(Mac/Clang系)、GDB(Linux/GCC系)
- ブレークポイント・ステップ実行・ウォッチの基本に加え、ゲーム開発で価値が高い機能:
  - **条件付きブレーク**(`enemyId == 42` のときだけ止まる)/ データブレークポイント(**このアドレスに書き込んだら止まる**——メモリ破壊犯の特定に絶大 → [メモリバグ](/runtime/memory/memory-bugs.html))
  - クラッシュダンプ(ミニダンプ)のポストモーテムデバッグ: ユーザー環境のクラッシュを、ダンプ+PDBで手元で再生
  - アタッチ: 起動済みのゲームプロセスに後から接続
- 「printfデバッグは恥」ではない——並行・タイミング系はログの方が有効なことも多い。**両刀**が正解

## C#/Unityとの対応

| Unity/C# | C++ |
|---|---|
| エディタ再生(Mono/JIT) | Debug/Development相当 |
| Development Build チェックボックス | Development構成 |
| IL2CPP + Release | Release/Shipping構成(このページの世界) |
| .pdb/.mdb(スクリプトデバッグ情報) | PDB(概念同一) |
| Cloud Diagnostics / Crashlytics | クラッシュダンプ+シンボルサーバー |

Unityでは構成が2〜3個に見えるが、その下でIL2CPPが吐いたC++がこのページの構成でビルドされています。

## Unity開発者が誤解しやすい点

1. 「デバッグはエディタでやるもの」— C++では**Shipping相当でだけ出るバグ**(最適化・タイミング・アセット差)を追う技術(ダンプ解析)が必須スキル
2. 「PDBはビルドの副産物」— Shippingでは**成果物の一部**(保管しないとサポート不能)
3. assertは「あると安心」ではなく構成戦略の一部——Debugで大量に入れ、Shippingで消えることで、開発中の検出力と出荷物の速度を両立する(→ [契約のassert](/languages/cpp/exceptions.html))

## 実務指針

- 毎日Developmentで開発し、**週次以上でShippingビルドを起動・テスト**(構成差バグの早期発見)
- ビルドIDをゲーム内に表示(スクショから即座にどのビルドか特定)+ PDBと紐付け
- assertには**メッセージと値**を(`assert(index < size && "enemy index out of range")`)

## 理解度チェック

1. 4構成の違いを「最適化・チェック・デバッグ情報」の3軸で言えますか。
2. ShippingビルドでPDBを生成・保管すべき理由は?
3. データブレークポイントはどんなバグに効きますか。

## 演習

samples/cmake_demo/ を `-DCMAKE_BUILD_TYPE=Debug` と `Release` でそれぞれビルドし、(a) 実行ファイルサイズ、(b) assertの有効/無効(NDEBUGの効果)を確認してください。

---

前: [ビルドツール: CMake](/tools/build/build-tools-cmake.html) | [カテゴリ目次](/tools/build/) | 次: [ビルド時間](/tools/build/build-speed.html)
