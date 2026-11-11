---
title: 開発ツールの基本 — エディター・IDE・デバッガ・プロファイラー
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: tools
  summary: コードを書く、ビルドする、動作を追う、性能を測る場面から、エディター、IDE、コンパイラ、デバッガ、プロファイラーの機能を説明する。
  aliases: [IDE, 統合開発環境, エディター, エディタ, debugger, デバッガ, profiler, プロファイラ, コード補完, ステップ実行, ウォッチ, コールスタック]
  verification: MicrosoftのVisual Studio・Visual Studio Code・デバッグ・性能計測の公式資料に照合（2026-11-07）
---

# 開発ツールの基本 — エディター・IDE・デバッガ・プロファイラー

ゲームのコードを書くときは、文字を編集するほか、実行できる形を作り、動きを調べ、重い処理を測ります。こうした作業を助けるソフトウェアが**開発ツール**です。一つのアプリの中から複数の道具を呼び出すこともあります。[Visual Studioの開発環境](https://learn.microsoft.com/en-us/visualstudio/get-started/visual-studio-ide)

## 何をしたいかで機能を見る

| 道具 | 主な仕事 | 使う場面 |
| --- | --- | --- |
| **コードエディター** | ソースコードの文字を編集し、色分けや検索で読み書きを助ける。 | プレイヤーの移動処理を書く。 |
| **コンパイラ** | ソースコードを解析し、次の段階で使うコードへ変換する。 | C++のソースからオブジェクトファイルを作る。 |
| **ビルドツール** | 設定や依存関係をもとに、必要な変換・リンクなどを実行する。 | 変更したファイルからゲームを作り直す。 |
| **デバッガ** | 実行を止めたり進めたりして、値や呼び出しの流れを調べる。 | ダメージ後のHPが想定外になる場所を追う。 |
| **プロファイラー** | 実行中の時間、CPU使用、メモリなどを計測する。 | フレームが遅くなった区間と、時間を使った処理を探す。 |

IDE（統合開発環境）は編集、ビルド、デバッグなどを一つの作業環境にまとめます。Visual Studioはその一例です。Visual Studio Codeのようなエディターでも、言語の拡張機能や外部ツールを組み合わせれば、補完・ビルド・デバッグの機能を使えます。[Visual Studioの構成](https://learn.microsoft.com/en-us/visualstudio/get-started/visual-studio-ide) · [Visual Studio Codeの言語機能](https://code.visualstudio.com/docs/languages/overview)

<figure class="study-figure">
  <img src="/images/tools/development-tools-basics.svg" alt="編集したソースコードをビルドしてプログラムを実行する。実行中の値と呼び出しはデバッガで追い、CPU時間やメモリはプロファイラーで測る。結果をもとにコードを編集する。" width="760" height="442" loading="lazy">
  <figcaption>作業に応じて使う機能を変えます。IDEから各ツールを起動する構成もあります。<a href="/study/images/tools/development-tools-basics.svg" target="_blank" rel="noopener noreferrer">開発ツールの図を拡大</a></figcaption>
</figure>

## 書いている途中に助ける機能

**コード補完**は、変数や関数の候補を表示します。**定義へ移動**では、使っている名前がどこで宣言・定義されているかを開けます。**参照の検索**は、その名前を使っている場所を探します。名前の変更を参照先へ反映する機能は、**リファクタリング**の一つです。こうした機能は、選んだ言語や拡張機能、プロジェクトの設定に応じて使えます。[Visual Studio Codeの補完](https://code.visualstudio.com/docs/editor/intellisense) · [コードの移動と参照検索](https://code.visualstudio.com/docs/editor/editingevolved)

エディター上のエラー表示と、ビルド時のエラーには、それぞれ解析元があります。どのファイル・行で、どのツールが出したメッセージかを読みます。ビルドを実行すると、実際に使う設定でコンパイラなどを動かした結果を確認できます。[ソースコードから実行まで](/compilers/source-code-and-execution.html) · [ビルドとは何か](/tools/build/what-is-build.html)

## 値がおかしいときは実行を追う

例えばHPが`10`から`7`になるはずなのに、`4`になったとします。HPを更新する行に**ブレークポイント**を置くと、その位置で実行を一時停止できます。**ウォッチ**で変数の値を見て、**ステップ実行**で処理を少しずつ進め、更新が二度行われていないかを確かめます。[Visual Studioのデバッガ](https://learn.microsoft.com/en-us/visualstudio/debugger/debugger-feature-tour)

| 機能 | 見るもの |
| --- | --- |
| **ステップイン** | 呼び出す関数の中へ入り、処理を追う。 |
| **ステップオーバー** | 関数呼び出しを一まとまりとして進め、呼び出し元の続きを追う。 |
| **コールスタック** | 現在の関数へ、どの呼び出しを経て到達したか。 |
| **ローカル変数・ウォッチ** | 停止位置で読める変数や式の値。 |

最適化されたコードでは、変数が保持される場所やソース行との対応が変わることがあります。詳しい確認方法は、[ブレークポイント](/tools/windows/debugger-breakpoints-and-watchpoints.html)と[ビルド構成・シンボル](/tools/build/build-configurations.html)へ進みます。[Visual Studioの最適化済みコードのデバッグ](https://learn.microsoft.com/en-us/visualstudio/debugger/how-to-debug-optimized-code)

## 遅いときは時間と量を測る

**プロファイリング**は、実行中に計測データを集め、時間や資源を使う箇所を調べる作業です。CPU使用率や関数ごとの実行時間、メモリの使用量など、目的に合う計測を選びます。実際のゲームに近いビルド設定と操作をそろえると、変更前後を比べられます。[Visual Studioの性能計測](https://learn.microsoft.com/en-us/visualstudio/profiling/profiling-feature-tour)

例えば「CPUが計算していた時間」と「I/Oなどの完了を待っていた時間」では、改善する箇所が変わります。GPUの描画を調べるときは、GPU向けの計測やフレーム解析も使います。デバッガで停止する操作は実行のタイミングを変えるため、通常の実行速度を調べるときは計測用の実行を用意します。[計測ツールの選び方](https://learn.microsoft.com/en-us/visualstudio/profiling/choose-performance-tool) · [GPUの調査ツール](/graphics/optimization/tools.html) · [フレームタイム](/graphics/optimization/frame-pacing.html)

コマンドから道具を呼び出す方法は、[ターミナル・シェル・コマンド](/tools/terminal-shell-and-commands.html)で扱います。
