---
title: 入力の基本 — デバイスからゲームのアクションへ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: キーボードとゲームパッドから移動や攻撃を受け取る流れを、デバイス、コントロール、バインディング、アクション、更新時刻に分けて説明する。
  aliases: [入力, input, デバイス, コントロール, バインディング, アクション, Action Map, 押下, 押し始め, ポーリング, デッドゾーン, リマップ, Input System]
  verification: Unity Input System 1.11のActions・Bindings・Processors・Update Mode・UI入力の公式資料に照合（2026-11-07）
---

# 入力の基本 — デバイスからゲームのアクションへ

キーボードのキーとゲームパッドのスティックは、形も出す値も違います。ゲーム側では、どちらの入力も「移動する」という同じ操作に対応付けられます。機器から受け取る値とゲーム内の操作の対応を、主に**Unity Input System 1.11**の用語で説明します。[Input Systemのアクション](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Actions.html)

## 機器、操作箇所、ゲームの意味

| 用語 | 表すもの | 例 |
| --- | --- | --- |
| **デバイス** | 入力を送る機器。 | キーボード、マウス、ゲームパッド。 |
| **コントロール** | デバイス上の操作箇所や状態。 | Wキー、左スティック、マウス位置。 |
| **バインディング** | コントロールとアクションの対応。 | WASDや左スティックを移動へ対応付ける。 |
| **アクション** | ゲームが使う操作の意味。 | 移動、攻撃、決定、キャンセル。 |

例えば移動を二つの数値`(x, y)`で表せば、左右と前後の入力をまとめられます。キーボードの複数キーを合成した値や、スティックの値を移動アクションから読み、ゲームが速度や移動可能な状態と組み合わせて使います。[Input Systemのバインディングと合成入力](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/ActionBindings.html)

<figure class="study-figure">
  <img src="/images/game/input-actions-and-devices.svg" alt="WASDキーと左スティックを、それぞれのバインディングからMoveアクションへ対応付け、ゲームが移動に使う。ボタンは押されている状態と、押し始め・離した変化を区別する。" width="760" height="470" loading="lazy">
  <figcaption>上は異なる機器を同じ操作へ結び付ける流れ、下はボタンの状態と変化の例です。<a href="/study/images/game/input-actions-and-devices.svg" target="_blank" rel="noopener noreferrer">入力の対応と押下状態の図を拡大</a></figcaption>
</figure>

## 押されている状態と、変わった瞬間

移動では「いま押されているか」、一回だけの攻撃では「この更新で押し始めたか」を使うなど、欲しい情報を選びます。アナログボタンでは、値がしきい値を越えたかなどの規則で押下を扱います。[InputActionの押下状態と変化](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/api/UnityEngine.InputSystem.InputAction.html)

| 調べるもの | 使い方の例 |
| --- | --- |
| **現在の値** | スティックの向きと倒した量を読む。 |
| **押されている** | キーを押している間、移動する。 |
| **押し始めた** | 押下へ変わった更新で、一回の攻撃を要求する。 |
| **離した** | 押下から戻った更新で、チャージなどの終了を要求する。 |

長押し、短押しなどを区別する場合は、その判定の規則も定めます。Input Systemのアクションの`performed`などの通知は、アクションの種類やInteractionの設定によって起きる条件が変わります。欲しい操作に合う通知や状態を選びます。[Input SystemのInteraction](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Interactions.html)

## 小さな揺れと、操作の割り当てを扱う

スティックは、中央に戻しても値が少しずれることがあります。**デッドゾーン**は、小さな入力をゼロとして扱うなどの範囲です。Input SystemのStick Deadzoneでは、大きさが最小値より小さい入力をゼロにし、範囲内の値を調整します。採用する処理によって、操作し始める感覚も変わります。[Input Systemのデッドゾーン](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Processors.html#stick-deadzone)

**リマップ・リバインド**は、操作の割り当てを変更することです。ゲームの「攻撃」という意味を保ちながら、別のキーやボタンへ対応を変えられます。変更を次回にも使う場合は、バインディングの上書き情報を保存し、起動時に適用する仕組みも用意します。[Input Systemの実行時リバインド](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/ActionBindings.html#interactive-rebinding)

## いつ取得し、いつゲームへ適用するか

**ポーリング**は、必要な時点で現在の値や状態を読む方式です。**イベント・コールバック**では、変化やアクションの通知を受け取る処理を登録します。いずれも、入力システムが機器の情報を処理する更新時刻と、ゲームが値を使う時刻を確認します。[InputActionのポーリングとコールバック](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/api/UnityEngine.InputSystem.InputAction.html)

Unity Input Systemでは、入力イベントを描画フレームに対応した動的更新、固定更新、手動更新で処理する設定があります。固定更新が一フレームに複数回あれば、発射要求をどの更新で消費するかを決めます。また、短い間に押して離した操作を必要な回数だけ扱うには、現在の値に加えて変化や記録する情報も検討します。[Input Systemの更新設定](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Settings.html#update-mode) · [ゲームループと時間](/game/basics/game-loop-and-time.html)

## プレイ中とメニューで使う操作を切り替える

同じ方向キーでも、プレイ中は移動、メニューでは選択先の変更へ使えます。Input Systemの**Action Map**は、関連するアクションをまとめて有効・無効にする単位です。プレイ用とUI用の入力をどの状態で使うか決めると、メニューを操作したときにキャラクターも動くといった干渉を扱えます。[Input Systemのアクションとマップ](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Actions.html) · [UI用の入力](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/UISupport.html)

画面側の選択や決定は[ゲームUI](/game/basics/ui-layout-and-interaction.html)、ポーズ時の切り替えは[ゲームの状態とポーズ](/game/basics/game-states-and-pause.html)、ゲーム内で決まった結果の通知は[ゲーム内イベント](/game/basics/game-events-and-notifications.html)へ進みます。

[Unity実践 キーボードとゲームパッドでPlayerを動かす](/practice/unity/input-health-demo.html)では、同じ移動アクションに両方のデバイスを割り当て、ダメージ床のシーンを操作します。

[USBキーボードとWindowsのRaw Input](/hardware/io/usb-keyboard-raw-input.html)では、キーボード内の状態がWindowsのアプリに届くまでを追い、押下と解放をWin32のC++例で見比べます。
