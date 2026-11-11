---
title: ゲームの状態とポーズ — タイトル・プレイ・結果を切り替える
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: タイトル、プレイ中、ポーズ、結果画面を例に、状態、遷移、受け付ける入力、止める更新と動かすUIを説明する。
  aliases: [ゲーム状態, game state, 状態遷移, ポーズ, pause, タイトル画面, 結果画面, timeScale, unscaledDeltaTime, ステートマシン]
  verification: Unity 6.0のTime.timeScale・unscaledDeltaTimeと、状態管理・入力の既存詳解に照合（2026-11-07）
---

# ゲームの状態とポーズ — タイトル・プレイ・結果を切り替える

同じ決定ボタンでも、タイトル画面ではゲームを始め、ポーズ画面では再開するなど、場面によって意味が変わります。**ゲームの状態**は、その時点でどんな処理を進め、どんな操作を受け付けるかを整理するために使います。ここでは小さな一人用ゲームを例にします。[ゲームループと時間](/game/basics/game-loop-and-time.html)

## 状態ごとに、することを決める

| この例の状態 | 進める処理 | 受け付ける操作の例 |
| --- | --- | --- |
| **タイトル** | メニューの表示。 | 開始、設定の変更。 |
| **プレイ中** | プレイヤーや敵、ゲームの時間の更新。 | 移動、攻撃、ポーズ。 |
| **ポーズ中** | ポーズメニューの表示と操作。 | 再開、設定、タイトルへ戻る。 |
| **結果** | スコアやクリア結果の表示。 | リトライ、タイトルへ戻る。 |

一つの状態から別の状態へ切り替えることを**遷移**と呼びます。「開始が選ばれたらプレイ中へ」「HPが0になったら結果へ」のように、きっかけと切り替え先を決めます。このように状態と遷移で動作を整理する考え方が**ステートマシン**です。[有限ステートマシンの詳解](/game/patterns/state-machines.html)

<figure class="study-figure">
  <img src="/images/game/game-states-and-pause.svg" alt="説明用のゲームはタイトルから開始してプレイ中になる。プレイ中から結果へ、またはポーズへ進む。ポーズから再開でき、結果からタイトルへ戻る。各状態で入力や更新の方針を変える。" width="760" height="446" loading="lazy">
  <figcaption>この例では、主となる状態を一つ選びます。複数のメニューを重ねる場合などは、階層やスタックを使う構成もあります。<a href="/study/images/game/game-states-and-pause.svg" target="_blank" rel="noopener noreferrer">ゲーム状態の図を拡大</a></figcaption>
</figure>

## シーンの切り替えとの関係

**シーン**は配置や設定をまとめる単位です。**状態**は、今どんな振る舞いをするかを決めるために使います。一つのシーンの上にポーズメニューを表示することも、タイトル用とプレイ用のシーンを分けることもできます。状態の名前と、読み込むシーンの構成を対応させて設計します。[シーンとコンポーネント](/game/basics/scenes-and-components.html)

例えばポーズへ入るときにはメニューを表示し、プレイヤー用の移動操作を止めます。再開するときは、メニューを閉じ、ゲームの更新と入力を戻します。状態へ入るとき・出るときの処理をまとめると、止めたものを戻し忘れていないか追えます。[入力アクションと機器](/game/basics/input-actions-and-devices.html) · [UIの表示と操作](/game/basics/ui-layout-and-interaction.html)

## ポーズでは何を止めるか

「ゲームの時間を止める」「敵の更新を止める」「移動や攻撃の操作を受け付けない」「メニューは操作できる」といった方針を、それぞれ決めます。オンライン通信や保存中の処理などがある場合は、その処理をポーズ中も進めるかも確認します。

Unityの`Time.timeScale`は、ゲーム内で時間が進む倍率です。`0`にすると、通常の`Time.deltaTime`を使う時間の進行が止まり、`FixedUpdate`や`WaitForSeconds`で待っているコルーチンの再開にも影響します。入力を受け付けるか、UIを表示するかといったゲームの規則は、状態に応じて制御します。[UnityのTime.timeScale](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Time-timeScale.html)

ポーズ中もメニューを動かす例では、時間倍率に影響されない`Time.unscaledDeltaTime`などを使えます。どの時間を使って動く処理かを見分けると、ゲーム内の時間とメニューの動きを別々に扱えます。[UnityのTime.unscaledDeltaTime](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Time-unscaledDeltaTime.html)

## 切り替え時に確認すること

1. 今の状態で、その遷移を受け付けてよいかを調べる。
2. 今の状態で使っていた操作や表示を終了する。
3. 次の状態のデータ、入力、表示を用意する。
4. 更新や通知が、次の状態の前提で動くことを確認する。

例えばリトライでは、HPを戻す、前の弾を片付ける、スコアを初期化するといった準備が必要です。状態の名前を変える処理と、ゲームを再開できるように準備する処理を、両方追います。[プレハブとオブジェクトの寿命](/game/basics/prefabs-and-object-lifetimes.html) · [ゲーム内イベントと通知](/game/basics/game-events-and-notifications.html)

より細かな状態の組み合わせや実装は、[有限ステートマシンと階層型ステートマシン](/game/patterns/state-machines.html)へ進みます。
