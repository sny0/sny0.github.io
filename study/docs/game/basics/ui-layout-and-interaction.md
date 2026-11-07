---
title: ゲームUIの基本 — 表示・配置・操作をつなぐ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: HP表示とポーズメニューを例に、UI、HUD、Canvas、アンカー、ピボット、画面サイズへの対応、選択と決定の役割を説明する。
  aliases: [UI, HUD, ユーザーインターフェース, Canvas, RectTransform, アンカー, ピボット, レイアウト, フォーカス, ナビゲーション, ボタン, uGUI]
  verification: Unity 6.0向けuGUI 2.0とInput System 1.11の公式資料に照合（2026-11-07）
---

# ゲームUIの基本 — 表示・配置・操作をつなぐ

画面のHP、アイテム一覧、ポーズメニューは、プレイヤーへ情報を伝えたり操作を受け取ったりする**UI（ユーザーインターフェース）**です。プレイ中に重ねて表示するHPや照準などを**HUD**と呼びます。ここではUnity 6.0向けの**uGUI**を例に、画面上の部品と操作を見ます。[UnityのuGUI](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/index.html)

## 表示する情報と、操作する部品

| 部品の例 | 担当すること |
| --- | --- |
| **文字・画像** | HPの数値、アイテムの絵、説明文などを表示する。 |
| **ゲージ** | 現在値と最大値の関係などを、長さや塗りつぶしで示す。 |
| **ボタン** | 決定操作を受け、再開や購入などの処理へつなぐ。 |
| **パネル・一覧** | 関連する表示や操作部品をまとめる。 |

例えば現在HPが70、最大HPが100なら、UIはその値を読み、`70 / 100`の文字や70%のゲージを表示できます。ゲームが管理するHPと、そこから作る表示を対応付け、値が変わったときや画面を開いたときに更新します。[ゲーム内イベントと通知](/game/basics/game-events-and-notifications.html) · [UI通知の設計例](/design/case-studies/ui-notification.html)

## Canvasに置き、表示する場所を決める

uGUIでは**Canvas**がUIの描画のまとまりになります。**Screen Space - Overlay**は画面上へUIを重ね、**Screen Space - Camera**は指定したカメラで描画します。**World Space**は、ゲーム世界の位置にUIを置きます。例えば画面端のHP表示と、キャラクターの頭上に置く表示では、使う基準が変わります。[uGUIのCanvasと描画モード](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UICanvas.html)

UIの位置と大きさを表す部品が**RectTransform**です。**アンカー**は親の矩形のどの位置を基準にするか、**ピボット**はそのUI自身の回転や拡縮などの基準点を表します。アンカーを左上へまとめ、そこからの余白でHP表示を置けば、親の幅が変わっても左上を基準に配置できます。[uGUIの基本レイアウト](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UIBasicLayout.html)

<figure class="study-figure">
  <img src="/images/game/ui-layout-and-interaction.svg" alt="幅の違う二つの画面で、HP表示は左上、ポーズボタンは右上を基準に置く。ゲームのHPから表示を更新し、再開ボタンの操作からゲームへ要求を送る。" width="760" height="470" loading="lazy">
  <figcaption>上は親の角を基準にする配置、下はゲームのデータとUIの操作の関係です。<a href="/study/images/game/ui-layout-and-interaction.svg" target="_blank" rel="noopener noreferrer">UIの配置と操作の図を拡大</a></figcaption>
</figure>

## 画面の大きさに合わせる

画面の解像度や縦横比が変わると、置ける範囲も変わります。**Canvas Scaler**の設定では、UIの大きさを一定のピクセル数で扱ったり、基準解像度と画面サイズに応じて拡縮したりできます。アンカーによる配置と、全体の拡縮は別の設定として確認します。[Canvas Scaler](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html)

ボタンや文章を並べるときは、**レイアウトグループ**などで間隔やサイズを管理できます。横長、縦長、長い翻訳文などの条件で、文字が切れず、押す場所を見分けられるかを確認します。ここでのCanvasやRectTransformはuGUIの仕組みです。Unityの別のUIシステムを使う場合は、その配置と入力の規則を確認します。[uGUIの自動レイアウト](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UIAutoLayout.html)

## 指す操作と、選んで決定する操作

マウスやタッチは、画面の位置を指定する**ポインター操作**です。キーボードやゲームパッドでは、「いま選択しているボタン」を移し、決定します。操作を受け取る対象を示す考え方を**フォーカス**と呼び、uGUIではEventSystemが管理する現在の選択と、Selectableのナビゲーション設定などを使います。[uGUIの選択移動](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-SelectableNavigation.html) · [Input SystemのUI入力](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/UISupport.html)

メニューを開いたら最初に何を選ぶか、上下左右でどこへ移るか、戻るとどの画面へ戻るかを決めます。Input SystemとuGUIを組み合わせる構成では、`InputSystemUIInputModule`がポインターや移動・決定などのアクションをUIへ渡します。[Input SystemのUI入力モジュール](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/UISupport.html)

## 小さな確認手順

1. ゲームのHPを変え、文字とゲージが同じ値を表すことを確かめる。
2. 画面を横長・縦長に変え、HPとメニューの位置、文字の収まりを見る。
3. ポインター操作と、方向キー・決定による操作をそれぞれ試し、再開後の表示とゲームの状態を確かめる。

## UIの操作からゲームへ要求する

再開ボタンを決定すると、ゲームへ再開を要求し、ゲーム側が状態を切り替えます。その結果をUIに反映すると、表示と操作のつながりを追えます。ポーズ中の操作とプレイ中の移動をどう切り替えるかは、[入力アクション](/game/basics/input-actions-and-devices.html)と[ゲームの状態とポーズ](/game/basics/game-states-and-pause.html)へ進みます。

シーン内の部品としての配置は[シーンとコンポーネント](/game/basics/scenes-and-components.html)、画面へ映す座標は[座標変換とカメラ](/graphics/basics/transforms-and-cameras.html)で扱います。
