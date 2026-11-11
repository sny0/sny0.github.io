---
title: ゲームループと時間 — 入力・更新・描画を繰り返す
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: プレイヤーの移動を例に、入力、状態の更新、描画、フレームとFPS、経過時間、可変更新と固定更新の役割を説明する。
  aliases: [ゲームループ, game loop, フレーム, FPS, フレームタイム, delta time, deltaTime, dt, Update, FixedUpdate, 固定更新, 可変更新, 入力, 押し始め]
  verification: Unity 6.0のUpdate・FixedUpdate・Time.deltaTimeと、ゲームループの既存詳解に照合（2026-11-07）
---

# ゲームループと時間 — 入力・更新・描画を繰り返す

移動キーを押している間、プレイヤーの位置は少しずつ変わり、画面も更新されます。入力を受け取り、ゲームの状態を変え、画像を作る処理を繰り返す仕組みが**ゲームループ**です。エンジンを使うときは、その繰り返しの中から自分の処理が呼ばれます。[UnityのUpdate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Update.html) · [ゲームエンジンの役割](/game/basics/game-engine-basics.html)

## 入力、状態、表示する画像

| 段階 | すること | プレイヤーを動かす例 |
| --- | --- | --- |
| **入力を受け取る** | 操作の状態やイベントを読む。 | 右方向が押されているかを調べる。 |
| **状態を更新する** | ルールと経過時間に応じて値を変える。 | 位置を進め、HPやゲームの状態を更新する。 |
| **描画する** | 現在の状態をもとに画像を作る。 | カメラから見たプレイヤーを描く。 |

**状態**は、その時点の位置、速度、HPなど、後の動作に必要なデータです。描画は、その状態から画像を作る処理です。画像を作り終えた後には、実際に表示へ渡す段階もあります。[光から描画された画像へ](/graphics/basics/light-and-rendered-images.html) · [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)

<figure class="study-figure">
  <img src="/images/game/game-loop-and-time.svg" alt="右方向の入力を受け取り、状態の位置を6m/sと0.02秒から0.12m進め、カメラから描画する。その繰り返しの中で、固定更新と描画の回数は別に数える。" width="760" height="442" loading="lazy">
  <figcaption>入力・更新・描画の関係を示す説明用の順序図です。実際のエンジンは処理をさらに分け、CPUとGPUの仕事を重ねる場合があります。<a href="/study/images/game/game-loop-and-time.svg" target="_blank" rel="noopener noreferrer">ゲームループの図を拡大</a></figcaption>
</figure>

## 一回の更新で、何秒進めるか

「更新のたびに位置を1増やす」とすると、同じ時間に更新する回数が変わったとき、進む距離も変わります。そこで、一定速度の移動なら**速度 × 進める秒数**を使います。1秒に6m進む場合、0.02秒の更新で進む距離は`6 × 0.02 = 0.12m`です。[Unityの経過時間を使う移動](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Time-deltaTime.html)

```text
新しい位置 = 今の位置 + 速度 × 今回進める秒数
```

| この一定速度の例での更新 | 合計の時間 | 合計の移動距離 |
| --- | --- | --- |
| 0.02秒で一回進める | 0.02秒 | 0.12m |
| 0.01秒で二回進める | 0.02秒 | 0.06m + 0.06m = 0.12m |

今回進める時間を**デルタタイム**や`dt`と呼ぶことがあります。Unityの通常の`Update`から使う`Time.deltaTime`は、ゲームの時間を進めるための値で、時間倍率の影響も受けます。実際に経過した時間を調べる場合は、用途に合う時計を選びます。[Time.deltaTime](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Time-deltaTime.html) · [Time.unscaledDeltaTime](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Time-unscaledDeltaTime.html)

## フレームとFPS

描画や画面の更新を一回ずつ数えるとき、その一回を**フレーム**と呼びます。**FPS**は一秒あたりのフレーム数です。均等な間隔の60 FPSなら、一回の間隔は約16.7msです。同じ平均60 FPSでも間隔にばらつきがあると、動きの滑らかさは変わります。[フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)

CPU側で描画を準備する回数、GPUが画像を作る時刻、ディスプレイが更新する時刻を調べると、どこで待ちが発生したかを追えます。ゲーム内の状態を進める**更新ステップ**も、必要に応じて別に数えます。[入力から画面に出るまで](/graphics/optimization/input-to-display-latency.html)

## 可変更新と固定更新

**可変更新**では、更新に渡す時間刻みが変わります。**固定更新**では、設定した時間刻みで状態を進めます。例えば物理を0.02秒ずつ進め、描画はそれとは別の頻度で行う構成があります。Unityでは`Update`と`FixedUpdate`がこうした処理の入口です。`FixedUpdate`は、一つの描画フレームの間に0回、1回、複数回呼ばれる場合があります。[UnityのFixedUpdate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.FixedUpdate.html)

固定更新を使うと、物理に渡す時間刻みをそろえられます。結果を再現できるかどうかには、入力を適用するステップ、処理の順番、数値計算なども関わります。詳しい設計は、[Game LoopとUpdate Method](/game/patterns/game-loop-and-update.html)と[衝突判定と物理](/game/basics/collisions-and-physics.html)で扱います。

## 押し続ける入力と、押し始める入力

キーやパッドの操作をゲームの動作へ割り当てる方法は、[入力アクションと機器](/game/basics/input-actions-and-devices.html)で説明します。

移動では「いま押されているか」を使い、弾を一発だけ撃つ操作では「押し始めたか」を使うなど、必要な情報を選びます。固定更新が同じ描画フレーム内に複数回あるなら、一度受けた発射要求をどの更新で使い切るかも決めます。入力の取得時点と、状態へ適用した時点を追うと、意図した回数だけ動かせるかを確認できます。[Unity Input Systemのアクション](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Actions.html) · [入力とCommand Buffer](/game/patterns/command-buffer-and-input.html)

具体的なゲーム全体への組み込みは、[小さなシューティングの設計](/game/shooter-design.html)へ進みます。
