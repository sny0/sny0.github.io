---
{
  "title": "プログラミング・ビルド・開発ツールの用語集",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "reference",
    "format": "glossary",
    "domain": "terms",
    "summary": "プログラミング・ビルド・開発ツールで使う語の定義、用例、関連する解説記事。"
  }
}
---

# プログラミング・ビルド・開発ツールの用語集

[用語集の入口・全用語検索](/glossary/)

読み順で 54 項目を掲載しています。

## アサート {#assert}

**assert / assertion** ／ 読み あさーと

ここで成り立つはずの条件をコードに記述し、条件が破れた場合に検出する仕組み。

**この分野での意味**　C++20のassertマクロはNDEBUGを定義すると検査を省く。C++26の草案N5050には、関数の事前条件pre・事後条件postと、文として書くcontract\_assertがある。テストフレームワークのアサーションはテストの成否を記録する。

**例**　添字が範囲内であることをアサートする。

**関連**　[自動テストの基礎](/tools/automated-testing.html) · [C++26の契約](/languages/cpp/cpp26-features.html) · [テスト](/glossary/programming.html#test) · [例外を投げる](/glossary/programming.html#throw)

**出典**　[WG21 N4861（C++20）— Assertions](https://timsong-cpp.github.io/cppwp/n4861/assertions) · [WG21 N5050（C++26 DISの基礎となった草案）— Contract assertions](https://timsong-cpp.github.io/cppwp/n5050/basic.contract) · [GoogleTest — Primer](https://google.github.io/googletest/primer.html)

## インクリメンタルビルド {#incremental-build}

**incremental build** ／ 読み いんくりめんたるびるど

前回の成果物を利用し、変更された入力や依存先の影響を受ける処理だけを再実行するビルド。

**例**　ヘッダーを変更したので、それを使う翻訳単位を再コンパイルする。

**関連**　[ビルド高速化](/tools/build/build-speed.html) · [クリーンビルド](/glossary/programming.html#clean-build) · [ビルド](/glossary/programming.html#build)

**出典**　[Ninja — Manual](https://ninja-build.org/manual.html) · [Microsoft Learn — Visual Studioのビルド・リビルド・クリーン](https://learn.microsoft.com/en-us/visualstudio/ide/building-and-cleaning-projects-and-solutions-in-visual-studio?view=visualstudio)

## API {#api}

**Application Programming Interface** ／ 読み えーぴーあい

プログラムが他の部品やサービスを使うための公開された呼び出し口や取り決め。

**この分野での意味**　関数や型を通じて使うライブラリのAPIも、通信経由で使うWeb APIもある。

**例**　ファイルを開くOSのAPIを使う。

**関連**　[ライブラリ・API・SDK](/compilers/libraries-apis-and-sdks.html) · [APIを叩く](/glossary/programming.html#call-api) · [ラッパー](/glossary/programming.html#wrapper)

**出典**　[Microsoft — Windows API index](https://learn.microsoft.com/en-us/windows/win32/apiindex/windows-api-list)

## APIを叩く {#call-api}

**call an API / make an API request** ／ 読み えーぴーあいをたたく

APIを呼び出すという現場の言い回し。Web APIならHTTPなどで要求を送ることを指す。

**この分野での意味**　シェルなどでコマンドを入力して実行することは「コマンドを叩く」と言う。

**例**　ランキング取得APIを叩いて結果を表示する。

**関連**　[ライブラリ・API・SDK](/compilers/libraries-apis-and-sdks.html) · [API](/glossary/programming.html#api)

## エンバグ {#enbug}

**introduce a bug** ／ 読み えんばぐ

コードや設定を変更した結果、新しい不具合を入れてしまうことを指す現場の言い回し。

**この分野での意味**　日本語の開発現場で使う言い方。英語では introduce a bug と表現する。

**例**　入力処理の修正で、長押しの処理にエンバグした。

**関連**　[デグレ](/glossary/programming.html#degrade) · [リグレッション](/glossary/programming.html#regression)

## 落ちる {#crash-slang}

**crash / fail / go down** ／ 読み おちる

ソフトウェアが異常終了することを指す現場の言い回し。

**この分野での意味**　「テストが落ちる」は検査の失敗、「ビルドが落ちる」はビルドの失敗、「サーバーが落ちる」はサービスを利用できない状態を指す。原因は文脈やログから判断する。

**例**　セーブを開くとアプリが落ちる。

**関連**　[ログを吐く](/glossary/programming.html#emit-log) · [テスト](/glossary/programming.html#test)

## 技術的負債 {#technical-debt}

**technical debt** ／ 読み ぎじゅつてきふさい

今の実装や設計を維持すると将来の変更や保守に追加の手間がかかる状態を、借金にたとえた言い方。

**この分野での意味**　短期の判断で意図的に持つ場合もあり、あらゆる不具合を指すわけではない。

**例**　端末ごとの例外処理が増え、入力設定の変更に余計な確認が必要になった。

**関連**　[技術的負債とリファクタリング](/design/foundations/tech-debt-and-refactoring.html) · [リファクタリング](/glossary/programming.html#refactoring)

**出典**　[Ward Cunningham — The WyCash Portfolio Management System](https://c2.com/doc/oopsla92.html) · [Martin Fowler — Refactoring](https://refactoring.com/)

## クリーンビルド {#clean-build}

**clean build** ／ 読み くりーんびるど

既存の中間ファイルや出力を削除するか、空のビルド先を用意してからビルドすること。

**この分野での意味**　依存関係やダウンロードのキャッシュまで消すかは、ツールや指定した対象による。

**例**　古い生成コードの影響を調べるためクリーンビルドする。

**関連**　[ビルド高速化](/tools/build/build-speed.html) · [インクリメンタルビルド](/glossary/programming.html#incremental-build) · [リビルド](/glossary/programming.html#rebuild)

**出典**　[Microsoft Learn — Visual Studioのビルド・リビルド・クリーン](https://learn.microsoft.com/en-us/visualstudio/ide/building-and-cleaning-projects-and-solutions-in-visual-studio?view=visualstudio) · [Microsoft — Visual Studio 2026 リリースノート](https://learn.microsoft.com/en-us/visualstudio/releases/2026/release-notes) · [CMake 4.3 — cmake(1)](https://cmake.org/cmake/help/v4.3/manual/cmake.1.html)

## コミット {#commit}

**commit** ／ 読み こみっと

Gitで、その時点の変更を履歴に記録する操作。また、記録された履歴の一単位。

**例**　描画の修正と、その確認用のテストを一つのコミットにする。

**関連**　[Gitの基本](/tools/git-basics.html) · [チェックイン / サブミット](/glossary/programming.html#check-in) · [ブランチ](/glossary/programming.html#branch)

**出典**　[Git — git commit](https://git-scm.com/docs/git-commit)

## コンパイル {#compile}

**compile** ／ 読み こんぱいる

プログラムを、実行や後続処理に適した別の表現へ変換すること。出力は機械語、バイトコード、中間表現など処理系で異なる。

**この分野での意味**　CやC++のツールでは、一連の変換をまとめてコンパイルと呼ぶこともある。

**例**　player.cppをオブジェクトファイルへコンパイルする。

**関連**　[コンパイラの仕事](/tools/build/compilers.html) · [ビルド](/glossary/programming.html#build) · [リンク](/glossary/programming.html#link) · [パース](/glossary/programming.html#parse)

**出典**　[GCC — Options Controlling the Kind of Output](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html) · [Clang — Compiler User’s Manual](https://clang.llvm.org/docs/UsersManual.html)

## コンフリクト {#conflict}

**conflict / merge conflict** ／ 読み こんふりくと

複数の変更を統合するときに、ツールが結果を自動で決められない競合。

**例**　同じ行を別の内容に変更したため、マージでコンフリクトが起きる。

**関連**　[Gitの基本](/tools/git-basics.html) · [マージ](/glossary/programming.html#merge) · [差分](/glossary/programming.html#diff)

**出典**　[Git — git merge](https://git-scm.com/docs/git-merge)

## 差分 {#diff}

**diff / difference** ／ 読み さぶん / でぃふ

二つの版やファイルを比較したときに分かる変更点。また、その表示や出力を指す。

**例**　コミット前に差分を見て、意図しない変更がないか確認する。

**関連**　[Gitの基本](/tools/git-basics.html) · [パッチ](/glossary/programming.html#patch) · [コミット](/glossary/programming.html#commit)

**出典**　[Git — git diff](https://git-scm.com/docs/git-diff)

## CI / 継続的インテグレーション {#ci}

**Continuous Integration** ／ 読み しーあい / けいぞくてきいんてぐれーしょん

変更を共有の履歴へ頻繁に統合し、ビルドやテストの自動実行で問題を早く見つける開発の進め方。

**この分野での意味**　「CIが通る」のCIは、運用している自動チェック一式を指す。

**例**　変更を送ったら、CIでWindows向けのビルドとテストを実行する。

**関連**　[CIとビルド自動化](/tools/ci-and-build-automation.html) · [パイプライン](/glossary/programming.html#pipeline) · [テスト](/glossary/programming.html#test) · [ビルド](/glossary/programming.html#build)

**出典**　[Microsoft — Continuous integration](https://learn.microsoft.com/en-us/devops/develop/what-is-continuous-integration) · [GitHub Actions — Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)

## シム {#shim}

**shim** ／ 読み しむ

既存コードと実行環境の間に入り、呼び出しや戻り値の変換などで互換性の差を吸収する薄い層。

**この分野での意味**　機械のshimは隙間を調整する薄い部品。ソフトウェアでも、隙間を埋める役割を指す。

**例**　古いツールが呼ぶAPIを新しい環境向けのシムで補う。

**関連**　[Adapterパターン](/design/patterns/adapter.html) · [ラッパー](/glossary/programming.html#wrapper) · [フック](/glossary/programming.html#hook)

**出典**　[Microsoft — Compatibility fixes](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/deployment/compatibility/compatibility-fixes-for-windows-8-windows-7-and-windows-vista)

## シリアライズ {#serialize}

**serialize / serialization** ／ 読み しりあらいず

データを保存・転送できるテキストやバイト列に変換すること。変換した表現からデータを取り出す操作をデシリアライズと呼ぶ。

**この分野での意味**　処理を並列に進めず順番に実行することも、英語ではserializeと呼ぶ。

**例**　プレイヤーの進行状況をJSONにシリアライズする。

**関連**　[セーブデータとシリアライズ](/game/basics/save-data-and-serialization.html) · [マーシャリング](/glossary/programming.html#marshalling) · [パース](/glossary/programming.html#parse)

**出典**　[Protocol Buffers — Encoding](https://protobuf.dev/programming-guides/encoding/)

## スタック {#stack}

**stack / call stack** ／ 読み すたっく

関数の呼び出しに伴う情報を積み、内側の呼び出しから順に取り除く仕組み。また、そのためのメモリ領域。

**この分野での意味**　データ構造のスタックは後入れ先出しの入れ物。「技術スタック」は使う技術群を指す。

**例**　再帰が深くなり、スレッドのスタックを使い切った。

**関連**　[関数呼び出しとCPU](/runtime/cpp-internals/function-calls-and-cpu.html) · [スタック・キュー・デック](/algorithms/queues-and-deques.html) · [スタックフレーム](/glossary/programming.html#stack-frame) · [ヒープ](/glossary/programming.html#heap)

**出典**　[Microsoft — x64 stack usage](https://learn.microsoft.com/en-us/cpp/build/stack-usage?view=msvc-170) · [Visual Studio 2022 — Call Stack window](https://learn.microsoft.com/en-us/visualstudio/debugger/how-to-use-the-call-stack-window?view=vs-2022)

## スタックフレーム {#stack-frame}

**stack frame / activation record** ／ 読み すたっくふれーむ

一回の関数呼び出しに対応する実行情報のまとまり。呼び出し規約や最適化によって、戻り先、退避したレジスター、局所データなどの配置が変わる。

**この分野での意味**　ここでのフレームは関数呼び出しの単位。描画や通信にも、それぞれ別のフレームがある。

**例**　デバッガーで呼び出し元のスタックフレームを選ぶ。

**関連**　[関数呼び出しとCPU](/runtime/cpp-internals/function-calls-and-cpu.html) · [スタック](/glossary/programming.html#stack) · [デバッガー](/glossary/programming.html#debugger)

**出典**　[Microsoft — x64 stack usage](https://learn.microsoft.com/en-us/cpp/build/stack-usage?view=msvc-170) · [Visual Studio 2022 — Call Stack window](https://learn.microsoft.com/en-us/visualstudio/debugger/how-to-use-the-call-stack-window?view=vs-2022)

## スタブ {#stub}

**stub / test stub** ／ 読み すたぶ

テスト対象から呼ばれたときに、あらかじめ決めた値や応答を返す代役。

**この分野での意味**　未実装の関数を仮につなぐ短い実装や、別プロセスに呼び出しを中継するコードもスタブと呼ばれる。

**例**　時刻を取得する関数を、決まった時刻を返すスタブにする。

**関連**　[テストダブル](/glossary/programming.html#test-double) · [モック](/glossary/programming.html#mock) · [トランポリン](/glossary/programming.html#trampoline)

**出典**　[Martin Fowler — Test Double](https://martinfowler.com/bliki/TestDouble.html) · [Microsoft — How Remote Procedure Call (RPC) works](https://learn.microsoft.com/en-us/windows/win32/rpc/how-rpc-works)

## スパイ {#spy}

**spy / test spy** ／ 読み すぱい

実際に呼ばれた回数や引数などを記録し、テストの後から確認できるようにする代役。

**例**　通知先にスパイを渡し、記録したイベントを検査する。

**関連**　[テストダブル](/glossary/programming.html#test-double) · [モック](/glossary/programming.html#mock)

**出典**　[Martin Fowler — Mocks Aren’t Stubs](https://martinfowler.com/articles/mocksArentStubs.html)

## ダーティ {#dirty}

**dirty / dirty flag** ／ 読み だーてぃ

変更が発生し、保存・再計算・再描画などの反映がまだ済んでいない状態。

**この分野での意味**　Gitのdirtyな作業ツリーは未コミットの変更がある状態。再計算用のダーティフラグは、更新が必要な対象を記録する。

**例**　親の位置を変更したら、子のワールド行列をダーティにする。

**関連**　[Gitの基本](/tools/git-basics.html) · [フラグ](/glossary/programming.html#flag) · [コミット](/glossary/programming.html#commit)

**出典**　[Git — Git Glossary](https://git-scm.com/docs/gitglossary) · [Microsoft — WPF UIElement.InvalidateVisual](https://learn.microsoft.com/en-us/dotnet/api/system.windows.uielement.invalidatevisual?view=windowsdesktop-10.0)

## ダングリング {#dangling}

**dangling pointer / dangling reference** ／ 読み だんぐりんぐ

ポインターや参照などが、すでに寿命の終わった対象を指したままになっている状態。

**例**　破棄済みの敵を指すダングリングポインターが更新リストに残る。

**関連**　[メモリのバグ](/runtime/memory/memory-bugs.html) · [記憶域期間・スコープ・寿命](/runtime/memory/storage-duration-and-lifetime.html) · [ヒープ](/glossary/programming.html#heap) · [リーク](/glossary/programming.html#leak)

**出典**　[WG21 N4861（C++20）— Object lifetime](https://timsong-cpp.github.io/cppwp/n4861/basic.life) · [Clang — AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)

## チェックイン / サブミット {#check-in}

**check in / submit** ／ 読み ちぇっくいん / さぶみっと

バージョン管理へ変更を登録すること。Perforce P4のsubmitは、変更リストをサーバーのdepotへ登録する。

**この分野での意味**　登録の範囲はツールによる。Gitでは履歴を記録するcommitと、リモートに反映するpushが別の操作。

**例**　修正したアセットとコードを同じ変更リストでサブミットする。

**関連**　[Gitの基本](/tools/git-basics.html) · [コミット](/glossary/programming.html#commit) · [ブランチ](/glossary/programming.html#branch)

**出典**　[Perforce P4 — p4 submit](https://help.perforce.com/helix-core/server-apps/cmdref/current/Content/CmdRef/p4_submit.html) · [Git — git commit](https://git-scm.com/docs/git-commit) · [Git — Git Glossary](https://git-scm.com/docs/gitglossary)

## デグレ {#degrade}

**regression / degradation** ／ 読み でぐれ

変更後に、以前はできたことができなくなったり、性能や品質が以前より悪化したりすることを指す現場の言い回し。

**この分野での意味**　日本語の開発現場で使う略語。変更による機能や性能の後退は、英語では regression と表現する。

**例**　メニューの修正後、ゲームパッドでの操作がデグレした。

**関連**　[エンバグ](/glossary/programming.html#enbug) · [リグレッション](/glossary/programming.html#regression)

## テスト {#test}

**test / software test** ／ 読み てすと

入力と条件を決め、ソフトウェアの出力や振る舞いが期待に合うか確かめること。

**例**　HPが0になったときにゲームオーバーへ移るかをテストする。

**関連**　[自動テストの基礎](/tools/automated-testing.html) · [テストダブル](/glossary/programming.html#test-double) · [アサート](/glossary/programming.html#assert) · [リグレッション](/glossary/programming.html#regression)

**出典**　[GoogleTest — Primer](https://google.github.io/googletest/primer.html)

## テストダブル {#test-double}

**test double** ／ 読み てすとだぶる

テスト時に本物の依存先と差し替えて使う代役の総称。スタブ、モック、フェイク、スパイなどがある。

**例**　通信を伴わずに確認できるよう、サーバーへの依存をテストダブルに差し替える。

**関連**　[自動テストの基礎](/tools/automated-testing.html) · [スタブ](/glossary/programming.html#stub) · [モック](/glossary/programming.html#mock) · [フェイク](/glossary/programming.html#fake) · [スパイ](/glossary/programming.html#spy)

**出典**　[Martin Fowler — Test Double](https://martinfowler.com/bliki/TestDouble.html)

## デバッガー {#debugger}

**debugger** ／ 読み でばがー

プログラムの実行を止め、命令の進行、変数、スレッド、呼び出し履歴などを調べる道具。

**例**　デバッガーでHPが書き換わる直前に実行を止める。

**関連**　[ブレークポイントとデータブレークポイント](/tools/windows/debugger-breakpoints-and-watchpoints.html) · [スタックフレーム](/glossary/programming.html#stack-frame) · [ログを吐く](/glossary/programming.html#emit-log)

**出典**　[Visual Studio 2022 — Call Stack window](https://learn.microsoft.com/en-us/visualstudio/debugger/how-to-use-the-call-stack-window?view=vs-2022)

## デプロイ {#deploy}

**deploy / deployment** ／ 読み でぷろい

作ったソフトウェアや設定を、実際に動かす環境へ配置して使える状態にすること。

**この分野での意味**　テスト環境への配置もデプロイと呼ぶ。利用者への公開を伴うかは環境と運用で決まる。

**例**　修正版をステージング環境へデプロイする。

**関連**　[CIとビルド自動化](/tools/ci-and-build-automation.html) · [リリース](/glossary/programming.html#release) · [パイプライン](/glossary/programming.html#pipeline)

**出典**　[GitHub Actions — Control deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)

## トランポリン {#trampoline}

**trampoline** ／ 読み とらんぽりん

本来の処理へジャンプする前に経由する小さな中継コード。呼び出し先が必要とする情報の設定を受け持つことがある。

**この分野での意味**　GCCの入れ子関数では、外側の文脈を渡してから本体へ移る中継を使う構成がある。関数フックでは、置き換え前の関数の処理を呼び出すための中継を指す。

**例**　計測用のフックから、トランポリンを通して元の関数を呼ぶ。

**関連**　[関数呼び出しとCPU](/runtime/cpp-internals/function-calls-and-cpu.html) · [フック](/glossary/programming.html#hook) · [スタブ](/glossary/programming.html#stub) · [スタックフレーム](/glossary/programming.html#stack-frame)

**出典**　[GCC Internals — Trampolines](https://gcc.gnu.org/onlinedocs/gccint/Trampolines.html) · [Microsoft Detours — Interception of Binary Functions](https://github.com/microsoft/Detours/wiki/OverviewInterception)

## パース {#parse}

**parse / parsing** ／ 読み ぱーす

入力の記述を文法や形式に従って解析し、その構造を読み取ること。

**この分野での意味**　コンパイラでは、字句解析で作ったトークン列から式や文の構造を調べる段階を指す。

**例**　設定ファイルをパースしてキーと値を取り出す。

**関連**　[トークン・AST・型検査](/compilers/tokens-ast-and-type-checking.html) · [コンパイル](/glossary/programming.html#compile) · [シリアライズ](/glossary/programming.html#serialize)

**出典**　[Clang — The Parser Library](https://clang.llvm.org/docs/InternalsManual.html#the-parser-library)

## パイプライン {#pipeline}

**pipeline** ／ 読み ぱいぷらいん

成果や処理を受け渡す工程のつながり。CI/CDではビルド、テスト、配布先への反映などを順に、または依存に応じて実行する。

**この分野での意味**　GPUの描画パイプラインは、頂点などの入力から画面の出力を作る処理段階を指す。

**例**　テストに通った成果物だけをデプロイするパイプラインを組む。

**関連**　[CIとビルド自動化](/tools/ci-and-build-automation.html) · [CI / 継続的インテグレーション](/glossary/programming.html#ci) · [デプロイ](/glossary/programming.html#deploy)

**出典**　[GitHub Actions — Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)

## パッチ {#patch}

**patch** ／ 読み ぱっち

既存のソフトウェアやデータに適用する変更。ソース管理では、適用できる形式で書き出した差分を指すことがある。

**この分野での意味**　配信では、修正版の更新データや小規模な更新版もパッチと呼ぶ。

**例**　不具合を直すパッチを保守ブランチにも適用する。

**関連**　[ゲームのアセットビルドと差分配布](/game/asset-build-and-patches.html) · [差分](/glossary/programming.html#diff) · [モンキーパッチ](/glossary/programming.html#monkey-patch) · [リリース](/glossary/programming.html#release)

**出典**　[Git — git apply](https://git-scm.com/docs/git-apply)

## ヒープ {#heap}

**heap / dynamic memory heap** ／ 読み ひーぷ

実行時の要求に応じて領域を確保し、不要になった領域を解放・再利用するメモリ管理の領域。

**この分野での意味**　アルゴリズムのヒープは、親子間の順序を保つデータ構造を指す。

**例**　ロードしたデータ用の領域をヒープから確保する。

**関連**　[メモリ確保の内部](/runtime/memory/allocation-journey.html) · [二分ヒープと優先度付きキュー](/algorithms/binary-heaps.html) · [スタック](/glossary/programming.html#stack) · [リーク](/glossary/programming.html#leak)

**出典**　[Microsoft — Heap Functions](https://learn.microsoft.com/en-us/windows/win32/memory/heap-functions)

## ビルド {#build}

**build** ／ 読み びるど

ソースや素材から実行ファイルなどの成果物を作る工程。構成によってはコード生成、コンパイル、リンク、パッケージ化まで含む。

**この分野での意味**　「最新ビルドを試す」のように、出来上がった成果物や版を指すこともある。

**例**　Windows向けのRelease構成でビルドする。

**関連**　[ビルドとは何か](/tools/build/what-is-build.html) · [コンパイル](/glossary/programming.html#compile) · [リンク](/glossary/programming.html#link) · [ビルド成果物](/glossary/programming.html#artifact)

**出典**　[CMake 4.3 — cmake(1)](https://cmake.org/cmake/help/v4.3/manual/cmake.1.html) · [GCC — Options Controlling the Kind of Output](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)

## ビルド成果物 {#artifact}

**build artifact** ／ 読み びるどせいかぶつ

ビルドや自動処理が作ったファイル。実行ファイル、配布パッケージ、デバッグ情報などを指す。

**この分野での意味**　CIではテスト結果やログも、実行後に取り出せる成果物として保存することがある。

**例**　CIで作った実行ファイルとデバッグ情報を保存する。

**関連**　[CIとビルド自動化](/tools/ci-and-build-automation.html) · [ビルド](/glossary/programming.html#build) · [パイプライン](/glossary/programming.html#pipeline)

**出典**　[GitHub Actions — Workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)

## ビルドを回す {#run-build}

**run a build** ／ 読み びるどをまわす

ビルドを実行して成果物や結果を確認できる状態にする、という開発現場の言い回し。

**この分野での意味**　「CIを回す」「テストを回す」のように、処理を繰り返し、あるいは定期的に実行するときにも使う。

**例**　修正を取り込んだら、もう一度ビルドを回す。

**関連**　[ビルド](/glossary/programming.html#build) · [CI / 継続的インテグレーション](/glossary/programming.html#ci)

## フェイク {#fake}

**fake / fake object** ／ 読み ふぇいく

実際に処理できる簡易実装を使い、本物の依存先を置き換えるテスト用の代役。

**例**　データベースのフェイクをメモリ上の連想配列で実装する。

**関連**　[テストダブル](/glossary/programming.html#test-double) · [スタブ](/glossary/programming.html#stub)

**出典**　[Martin Fowler — Test Double](https://martinfowler.com/bliki/TestDouble.html) · [GoogleTest — gMock for Dummies](https://google.github.io/googletest/gmock_for_dummies.html)

## フック {#hook}

**hook** ／ 読み ふっく

処理の決まった地点で、利用側が登録した処理を呼べるようにする仕組み。また、登録した処理そのもの。

**この分野での意味**　既存の呼び出しへ処理を差し込むことも「フックする」と呼ぶ。利用できる仕組みや呼ばれる時点は環境による。

**例**　コミット前のフックで整形結果を確認する。

**関連**　[Template Methodパターン](/design/patterns/template-method.html) · [ラッパー](/glossary/programming.html#wrapper) · [シム](/glossary/programming.html#shim)

**出典**　[Git — githooks](https://git-scm.com/docs/githooks)

## フラグ {#flag}

**flag** ／ 読み ふらぐ

状態や機能の有無を示す値。複数の独立した状態を整数のビットで表すこともある。

**この分野での意味**　コマンドの「フラグ」は、機能や動作を指定するコマンドラインオプションを指す。

**例**　デバッグ表示を有効にするフラグを立てる。

**関連**　[ダーティ](/glossary/programming.html#dirty) · [コンパイル](/glossary/programming.html#compile)

**出典**　[.NET 10 — FlagsAttribute](https://learn.microsoft.com/en-us/dotnet/api/system.flagsattribute?view=net-10.0) · [Clang — Compiler User’s Manual](https://clang.llvm.org/docs/UsersManual.html)

## ブランチ {#branch}

**branch** ／ 読み ぶらんち

バージョン管理で、変更を別の流れとして進めるための分岐。Gitのブランチ名は履歴の先端のコミットを指す。

**この分野での意味**　プログラムやCPUでbranchと言うと、実行する経路を切り替える分岐を指す。

**例**　敵の行動を修正する作業用ブランチを作る。

**関連**　[Gitの基本](/tools/git-basics.html) · [コミット](/glossary/programming.html#commit) · [マージ](/glossary/programming.html#merge)

**出典**　[Git — Git Glossary](https://git-scm.com/docs/gitglossary)

## ボイラープレート {#boilerplate}

**boilerplate / boilerplate code** ／ 読み ぼいらーぷれーと

同種のファイルやプロジェクトで繰り返し使う定型コード。初期化や登録などの共通部分を指す。

**例**　プロジェクト生成コマンドで初期化のボイラープレートを用意する。

**関連**　[ビルド](/glossary/programming.html#build) · [リファクタリング](/glossary/programming.html#refactoring)

**出典**　[Cargo — cargo new](https://doc.rust-lang.org/cargo/commands/cargo-new.html)

## ホットリロード {#hot-reload}

**hot reload** ／ 読み ほっとりろーど

アプリや開発環境を再起動せず、実行中にコードやデータの変更を反映すること。

**この分野での意味**　どの変更を反映できるか、既存の状態がどこまで残るかは実装や編集内容で変わる。

**例**　プレイ中のままUIの変更をホットリロードする。

**関連**　[ビルド](/glossary/programming.html#build) · [デバッガー](/glossary/programming.html#debugger)

**出典**　[Microsoft Learn — Visual Studioのホットリロード設定](https://learn.microsoft.com/en-us/visualstudio/debugger/edit-and-continue) · [Microsoft — Visual Studio 2026 リリースノート](https://learn.microsoft.com/en-us/visualstudio/releases/2026/release-notes)

## マージ {#merge}

**merge** ／ 読み まーじ

バージョン管理で、別々の履歴にある変更を統合すること。

**この分野での意味**　Gitでは統合の形によって、マージコミットを作る場合と、ブランチの参照先を進める場合がある。

**例**　レビュー済みの変更をメインブランチにマージする。

**関連**　[Gitの基本](/tools/git-basics.html) · [ブランチ](/glossary/programming.html#branch) · [コンフリクト](/glossary/programming.html#conflict)

**出典**　[Git — Git Glossary](https://git-scm.com/docs/gitglossary) · [Git — git merge](https://git-scm.com/docs/git-merge)

## マーシャリング {#marshalling}

**marshal / marshalling** ／ 読み まーしゃりんぐ

言語やプロセスなどの境界を越えて値を渡せるよう、型や表現を受け渡し先に合わせる処理。

**この分野での意味**　シリアライズを含む場合もある。.NETとネイティブコードの相互運用では、文字列の表現や構造体の配置などの変換を指す。

**例**　C#の文字列をネイティブAPIが要求する表現にマーシャリングする。

**関連**　[ライブラリ・API・SDK](/compilers/libraries-apis-and-sdks.html) · [シリアライズ](/glossary/programming.html#serialize) · [API](/glossary/programming.html#api)

**出典**　[.NET — Type marshalling](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/type-marshalling)

## モック {#mock}

**mock / mock object** ／ 読み もっく

期待する呼び出し、引数、回数などを設定し、実際のやり取りが期待どおりか確かめるテスト用の代役。

**この分野での意味**　画面設計で「モック」と言う場合は、操作や見た目を試すための模型を指すことがある。

**例**　セーブを1回だけ要求したか、保存先のモックで確かめる。

**関連**　[テストダブル](/glossary/programming.html#test-double) · [スタブ](/glossary/programming.html#stub) · [スパイ](/glossary/programming.html#spy)

**出典**　[Martin Fowler — Test Double](https://martinfowler.com/bliki/TestDouble.html) · [GoogleTest — gMock for Dummies](https://google.github.io/googletest/gmock_for_dummies.html)

## モンキーパッチ {#monkey-patch}

**monkey patch** ／ 読み もんきーぱっち

実行時に既存のモジュールやオブジェクトの属性・関数を差し替えて振る舞いを変えること。

**この分野での意味**　テスト中だけ一時的に差し替える用途もある。どの名前を変更すると呼び出し側に効くかは、参照の取り方で決まる。

**例**　テスト中だけ時刻取得関数を差し替える。

**関連**　[パッチ](/glossary/programming.html#patch) · [スタブ](/glossary/programming.html#stub) · [フック](/glossary/programming.html#hook)

**出典**　[Python — unittest.mock.patch](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.patch)

## ラッパー {#wrapper}

**wrapper** ／ 読み らっぱー

既存の関数やオブジェクトを包み、呼び出しを委譲する関数や型。変換やログ記録などの処理を加えることもできる。

**例**　ファイルAPIのラッパーで失敗時のログをそろえる。

**関連**　[Decoratorパターン](/design/patterns/decorator.html) · [シム](/glossary/programming.html#shim) · [フック](/glossary/programming.html#hook)

**出典**　[Python — functools.wraps](https://docs.python.org/3/library/functools.html#functools.wraps)

## リーク {#leak}

**leak / memory leak / resource leak** ／ 読み りーく

使い終えたメモリやリソースが解放されず、占有が続くこと。

**この分野での意味**　ゲームの告知前情報が漏れる「リーク」とは区別する。メモリの例では、参照が残って回収されない場合もある。

**例**　シーンを開き直すたびにテクスチャがリークしてメモリ使用量が増える。

**関連**　[メモリのバグ](/runtime/memory/memory-bugs.html) · [ヒープ](/glossary/programming.html#heap) · [ダングリング](/glossary/programming.html#dangling)

**出典**　[Clang — LeakSanitizer](https://clang.llvm.org/docs/LeakSanitizer.html)

## リグレッション {#regression}

**regression / software regression** ／ 読み りぐれっしょん

変更によって、以前動いていた機能や満たしていた性能・品質が悪化すること。

**この分野での意味**　回帰テストは以前の振る舞いが保たれるかを検査する。統計学の「回帰」は、変数どうしの関係をモデル化する別の用法。

**例**　描画負荷のリグレッションを前のビルドと比較する。

**関連**　[自動テストの基礎](/tools/automated-testing.html) · [デグレ](/glossary/programming.html#degrade) · [テスト](/glossary/programming.html#test)

**出典**　[Git — git bisect](https://git-scm.com/docs/git-bisect) · [NIST — What is regression?](https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd141.htm)

## リビルド {#rebuild}

**rebuild** ／ 読み りびるど

成果物を作り直すこと。Visual Studio 2022・2026の「リビルド」は、選んだ対象をクリーンにしてからビルドする操作。

**この分野での意味**　「リビルドして」は単にビルドを再実行する意味でも使う。対象や消す範囲は操作名とツールによる。

**例**　構成を切り替えてソリューションをリビルドする。

**関連**　[クリーンビルド](/glossary/programming.html#clean-build) · [インクリメンタルビルド](/glossary/programming.html#incremental-build)

**出典**　[Microsoft Learn — Visual Studioのビルド・リビルド・クリーン](https://learn.microsoft.com/en-us/visualstudio/ide/building-and-cleaning-projects-and-solutions-in-visual-studio?view=visualstudio) · [Microsoft — Visual Studio 2026 リリースノート](https://learn.microsoft.com/en-us/visualstudio/releases/2026/release-notes)

## リファクタリング {#refactoring}

**refactor / refactoring** ／ 読み りふぁくたりんぐ

外から観察できる振る舞いを保ったまま、コードの内部構造を改善すること。

**例**　同じ計算を一つの関数にまとめ、変更前と同じ結果をテストする。

**関連**　[技術的負債とリファクタリング](/design/foundations/tech-debt-and-refactoring.html) · [C++・設計の用語集](/guide/cpp-glossary.html) · [技術的負債](/glossary/programming.html#technical-debt) · [リグレッション](/glossary/programming.html#regression)

**出典**　[Martin Fowler — Refactoring](https://refactoring.com/)

## リリース {#release}

**release** ／ 読み りりーす

特定の版を利用者や配布先が使えるようにすること。また、その公開版を指す。

**この分野での意味**　Releaseビルドの「Release」は構成名。最適化の設定と配布の可否はそれぞれ決まる。

**例**　バージョン1.2をリリースし、変更点を公開する。

**関連**　[ビルド構成とデバッグ情報](/tools/build/build-configurations.html) · [デプロイ](/glossary/programming.html#deploy) · [パッチ](/glossary/programming.html#patch)

**出典**　[GitHub Docs — About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) · [Microsoft Learn — Visual Studioのビルド・リビルド・クリーン](https://learn.microsoft.com/en-us/visualstudio/ide/building-and-cleaning-projects-and-solutions-in-visual-studio?view=visualstudio)

## リンク {#link}

**link / linking** ／ 読み りんく

オブジェクトファイルやライブラリのシンボル参照を解決し、実行ファイルやライブラリなどへまとめる処理。

**この分野での意味**　この文脈では、Webページ間のリンクや資料への参照とは別の処理を指す。

**例**　入力モジュールと描画モジュールをリンクする。

**関連**　[リンクエラー](/tools/build/link-errors.html) · [オブジェクトファイルとライブラリ](/runtime/cpp-internals/object-files-and-libraries.html) · [コンパイル](/glossary/programming.html#compile) · [ビルド](/glossary/programming.html#build)

**出典**　[GCC — Options Controlling the Kind of Output](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)

## 例外を投げる {#throw}

**throw an exception** ／ 読み れいがいをなげる

例外を発生させ、通常の処理の流れから、対応する例外ハンドラーを探す処理へ移ること。

**例**　想定していない形式のデータを受け取ったら例外を投げる。

**関連**　[C++の例外](/languages/cpp/exceptions.html) · [C++例外とC#例外](/languages/csharp/exceptions-comparison.html) · [落ちる](/glossary/programming.html#crash-slang) · [アサート](/glossary/programming.html#assert)

**出典**　[WG21 N4861（C++20）— Throwing an exception](https://timsong-cpp.github.io/cppwp/n4861/except.throw)

## ログを吐く {#emit-log}

**emit a log / write a log** ／ 読み ろぐをはく

実行時の情報をログとして出力する、という現場の言い回し。

**この分野での意味**　ダンプを書き出すことや、ツールがコードを生成して出力することも「吐く」と表現する。

**例**　ロードが失敗したら、対象のファイル名と理由をログに吐く。

**関連**　[落ちる](/glossary/programming.html#crash-slang) · [デバッガー](/glossary/programming.html#debugger)

**出典**　[Python — logging](https://docs.python.org/3/library/logging.html)
