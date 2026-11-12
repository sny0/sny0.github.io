---
{
  "title": "ゲームとエンジン",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": false,
    "section": "reference",
    "format": "index",
    "domain": "game"
  }
}
---

# ゲームとエンジン

入力、時間、ECSと各サブシステムの関係を調べる。

## 辞典の本文

- [Behavior Tree と Blackboard](/game/patterns/behavior-tree-and-blackboard.html)
- [Command Buffer と入力処理(Commandパターンとの関係)](/game/patterns/command-buffer-and-input.html)
- [Component と Entity Component System(比較つき)](/game/patterns/component-and-ecs.html)
- [DirectStorageでゲームの読み取りと展開をまとめる](/game/directstorage.html)
- [ECS — Entity Component System](/game/ecs.html) — 草稿
- [Event Queue・Message Bus・Publish/Subscribe(Observerとの比較)](/game/patterns/event-queue-and-pubsub.html)
- [Game Loop と Update Method](/game/patterns/game-loop-and-update.html)
- [Gameplay Framework・Subsystem・Slate/UMG・DataAsset/DataTable](/game/unreal/gameplay-framework.html)
- [MVC・MVP・MVVM(比較)](/game/patterns/mvc-mvp-mvvm.html)
- [Object Pool(通常のnew/deleteとの比較)](/game/patterns/object-pool.html)
- [Reactive Programming](/game/patterns/reactive-and-message-bus.html)
- [Service Locator と Dependency Injection(比較)](/game/patterns/service-locator-and-di.html)
- [Type Object・Subclass Sandbox・Bytecode](/game/patterns/type-object-and-sandbox.html)
- [UEの Delegate と Interface](/game/unreal/delegates-and-interfaces.html)
- [UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr](/game/unreal/gc-and-object-pointers.html)
- [UEのスマートポインタ — TSharedPtr・TUniquePtr・TWeakPtr・TSoftObjectPtr](/game/unreal/smart-pointers.html)
- [Unreal Build Tool・Module・Build.cs・Target.cs](/game/unreal/build-system-ubt.html)
- [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html)
- [ゲームUIの基本 — 表示・配置・操作をつなぐ](/game/basics/ui-layout-and-interaction.html)
- [ゲームエンジンの役割 — 素材とルールからゲームを動かす](/game/basics/game-engine-basics.html)
- [ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html)
- [ゲームのアセットロード設計 — 状態・世代・所有権](/game/asset-loading.html)
- [ゲームのアセットをパックファイルにまとめる](/game/asset-pack-files.html)
- [ゲームのネットワーク同期 — 状態・入力・予測とロールバック](/game/network-sync.html)
- [ゲームの状態とポーズ — タイトル・プレイ・結果を切り替える](/game/basics/game-states-and-pause.html)
- [ゲームループと時間 — 入力・更新・描画を繰り返す](/game/basics/game-loop-and-time.html)
- [ゲーム内イベントと通知 — HPの変化をUIへ伝える](/game/basics/game-events-and-notifications.html)
- [シーン・オブジェクト・コンポーネントの基本](/game/basics/scenes-and-components.html)
- [セーブとシリアライズの基本 — 実行中の状態を保存する](/game/basics/save-data-and-serialization.html)
- [プレハブと生成・破棄の基本 — 同じ部品から複数の物を作る](/game/basics/prefabs-and-object-lifetimes.html)
- [リフレクション — UCLASS・UFUNCTION・UPROPERTY・Unreal Header Tool](/game/unreal/reflection-and-uht.html)
- [ワーカーが準備したアセットを描画側へ渡す](/game/asset-worker-handoff.html)
- [最適化系パターン: Dirty Flag・Spatial Partition・Data Locality・Double Buffer](/game/patterns/optimization-patterns.html)
- [衝突と物理の基本 — コライダー・Rigidbody・トリガー](/game/basics/collisions-and-physics.html)
- [入力の基本 — デバイスからゲームのアクションへ](/game/basics/input-actions-and-devices.html)
- [有限ステートマシンと階層型ステートマシン(State と Strategy の比較つき)](/game/patterns/state-machines.html)

## この分野の学習ガイド

- [低レイヤからゲームの仕組みを学ぶ](/guide/low-level/)
- [第0章 学習全体マップ](/guide/low-level/learning-map.html) — 学習計画・概要
- [ゲームプログラミングパターンの学習ガイド](/game/patterns/)
- [ゲームの動きと構成から読む](/guide/game-development-basics.html)
- [Unreal Engineと標準C++をつなぐ学習ガイド](/game/unreal/)
- [第14章 入力とゲームループ](/guide/low-level/input-and-game-loop.html) — 学習計画・概要
- [第15章 ゲームエンジンの構成とECS](/guide/low-level/engine-architecture-ecs.html) — 学習計画・概要
- [第16章 Unityの内部を調べる](/guide/low-level/unity-internals.html) — 学習計画・概要
- [第17章 Unreal Engineのソースを読む](/guide/low-level/unreal-internals.html) — 学習計画・概要
- [最終章 ボタンを押してから画面に出るまで](/guide/low-level/button-to-screen.html) — 学習計画・概要
- [発展編 専門テーマを選ぶ](/guide/low-level/advanced-topics.html) — 学習計画・概要

## 作って試す

- [C++でアセットパックを作って必要な範囲を読む](/practice/io/asset-pack-observation.html)
- [C++とC#でアセットの状態・世代・所有権を検証する](/practice/assets/asset-lifecycle-model.html)
- [Unity実践 — シーンにキャラクターとダメージ床を配置する](/practice/unity/scene-health-demo.html)
- [小さなシューティングの設計 — C++とUnityで作る](/game/shooter-design.html)
- [Unity実践 — キーボードとゲームパッドでPlayerを動かす](/practice/unity/input-health-demo.html)
- [シューティング実装例 — C++17とraylib](/game/shooter-cpp.html)
- [シューティング実装例 — C#とUnity 6](/game/shooter-unity.html)
- [ゲームプログラミングパターンの演習](/game/patterns/exercises.html)
- [Unreal Engineと標準C++の演習](/game/unreal/exercises.html)

## 扱う範囲・増補する項目

- 入力・ループ
- シーン
- ECS
- 物理・衝突
- AI
- 音
- UI
- アセット
- 通信
- Unity・Unreal
