---
title: ゲームエンジンの役割 — 素材とルールからゲームを動かす
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: プレイヤーを表示して動かす場面から、ゲームエンジン、エディター、実行時の機能、アセット、プロジェクト、ビルドの役割を説明する。
  aliases: [ゲームエンジン, game engine, Unity, Unreal Engine, エディター, editor, ランタイム, プロジェクト, アセット, ビルド, ゲームロジック]
  verification: Unity 6.0のアセット・シーン・ビルドとEpicのGameplay Frameworkの公式資料に照合（2026-11-07）
---

# ゲームエンジンの役割 — 素材とルールからゲームを動かす

プレイヤーを画面に表示し、入力で動かし、壁に当たったら止めるゲームを考えます。そこには画像を作る処理、機器からの入力、衝突の計算、ファイルの読み込みなどが必要です。**ゲームエンジン**は、こうしたゲームで使う機能や実行の仕組みを提供するソフトウェアです。UnityやUnreal Engineには、制作を支援するエディターもあります。[Unityの制作環境の概要](https://docs.unity.com/en-us/engine/6000.0/manual/get-started) · [Unreal EngineのGameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine)

## ゲームのルールと、使う機能

| 作りたい動作 | エンジンの機能を使う例 | ゲーム側で決めること |
| --- | --- | --- |
| キーでプレイヤーを動かす | 入力を受け取り、オブジェクトの位置を更新する。 | 移動速度、操作できる状態。 |
| キャラクターを表示する | メッシュと材質を使って、カメラから画像を作る。 | 使うモデル、見た目、カメラの置き方。 |
| 壁に当たる | コライダーや物理の計算を使う。 | 止まる、跳ね返る、ダメージを受けるなどのルール。 |
| HPを表示する | UIの文字やゲージを表示する。 | 何を表示し、いつ更新するか。 |

このように、作品ごとのルールを実装する処理を**ゲームロジック**と呼びます。エンジンが提供する部品と、自分で書いたコードや設定を組み合わせて作ります。Unreal EngineのGameplay Frameworkのように、ルールやプレイヤーの状態を実装するための構成も用意されています。[Unreal Engineのゲームプレイの構成](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine) · [シーンとコンポーネント](/game/basics/scenes-and-components.html)

<figure class="study-figure">
  <img src="/images/game/game-engine-basics.svg" alt="ゲーム側の素材とルールを、エンジンの入力・シーン・描画・物理などの機能と組み合わせる。実行時にはOSと機器の機能も使う。制作中のエディターでは素材や設定を編集する。" width="760" height="446" loading="lazy">
  <figcaption>役割を見分ける概念図です。提供される機能やまとめ方はエンジンによって異なります。<a href="/study/images/game/game-engine-basics.svg" target="_blank" rel="noopener noreferrer">ゲームエンジンの図を拡大</a></figcaption>
</figure>

## エディターで作り、実行時の機能で動かす

**エディター**では、素材を取り込み、オブジェクトを配置し、値を設定して動きを確認できます。**ランタイム**は、エンジンの機能、ゲームのコード、必要なデータを使ってゲームを動かす仕組みです。制作画面から再生する場合も、対象プラットフォーム向けに作ったアプリを起動する場合もあります。[Unityのエディター](https://docs.unity.com/en-us/engine/6000.0/manual/unity-editor) · [Unityのビルド](https://docs.unity3d.com/6000.0/Documentation/Manual/BuildSettings.html)

例えばUnityの**Gameビュー**ではカメラからの表示を確認し、**Sceneビュー**では制作中の配置を編集できます。制作時に見ている視点と、ゲームで使うカメラを確認すると、表示される内容を追えます。[UnityのGameビュー](https://docs.unity3d.com/6000.0/Documentation/Manual/GameView.html) · [Sceneビュー](https://docs.unity3d.com/6000.0/Documentation/Manual/UsingTheSceneView.html)

## アセット、プロジェクト、実行中の状態

**アセット**は、制作に使うモデル、画像、シーン、コードなどの素材やデータです。**プロジェクト**には、使うアセットや設定、コードなどをまとめます。エンジンは素材を取り込み、対象の実行環境で使うデータを準備します。この取り込みを**インポート**と呼びます。[Unityのアセット](https://docs.unity3d.com/6000.0/Documentation/Manual/AssetWorkflow.html) · [アセットのインポート](https://docs.unity3d.com/6000.0/Documentation/Manual/ImportingAssets.html)

| 何を見ているか | 例 |
| --- | --- |
| 保存した素材・設定 | プレイヤーのモデル、最初の位置、最大HP。 |
| 実行中のオブジェクトや値 | 今の位置、現在のHP、発射された弾。 |
| 次の起動に残す情報 | クリア済みステージ、所持アイテム、保存した進行状況。 |

ゲームは素材や設定から実行中の状態を用意し、更新していきます。進行状況を次の起動にも引き継ぐには、必要な情報を保存する処理を設計します。素材のファイル、実行中に使うデータ、セーブするデータをそれぞれ確認すると、読み込みや保存のタイミングを考えられます。[アセットロードの状態と所有権](/game/asset-loading.html) · [ファイルとパス](/os/files-and-paths.html)

## 小さな制作の流れ

1. モデルや画像を取り込み、必要な材質を用意する。
2. シーンにプレイヤー、カメラ、床などを配置する。
3. 入力から移動へつなぐコードや設定を加える。
4. 必要なら衝突判定やUIを組み合わせ、動作を確かめる。
5. 対象プラットフォーム向けにビルドし、そのアプリでも動作を確認する。

**ビルド**では、コードやアセットを、選んだ環境で実行できるアプリにまとめます。エディターからの再生と、実機へ配布するアプリでは設定や使える機能が変わる場合があります。対象の設定をそろえて確認します。[Unityのビルド手順](https://docs.unity3d.com/6000.0/Documentation/Manual/BuildSettings.html) · [ゲームのアセットビルド](/game/asset-build-and-patches.html)

実行中に処理がどう回るかは[ゲームループと時間](/game/basics/game-loop-and-time.html)、形と位置は[モデルとメッシュ](/graphics/basics/models-and-meshes.html)と[座標とカメラ](/graphics/basics/transforms-and-cameras.html)へ進めます。小さな作品にまとめる例は[シューティングの設計](/game/shooter-design.html)で扱います。
