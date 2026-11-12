---
title: ゲームの動きと構成から読む
study:
  source: 新規執筆
  section: learning
  format: path
  status: published
  domain: game
  collection: foundations
  order: 5
  summary: エンジン、時間、シーンと衝突から、入力、UI、プレハブ、ポーズ、イベント、セーブへ進む読み順。
---

# ゲームの動きと構成から読む

ゲームエンジンに任せる処理と、ゲームのルールを書く場所を確認します。プレイヤーを配置して動かし、壁に当たる場面を例に、用語がどの処理を指すかを追います。

[ゲーム開発のテックツリー](/learn/roadmap.html#game)では、シューティングの制作やECSなど、目標ごとに必要な前提と達成条件を確認できます。

## 読む順番

1. [ゲームエンジンの役割](/game/basics/game-engine-basics.html)で、素材、制作ツール、実行する機能、ゲームのルールの関係をつかみます。
2. [ゲームループと時間](/game/basics/game-loop-and-time.html)で、入力、状態の更新、描画を繰り返す流れを追います。
3. [シーンとコンポーネント](/game/basics/scenes-and-components.html)で、配置した物体に機能を組み合わせる方法を見ます。
4. [衝突判定と物理](/game/basics/collisions-and-physics.html)で、見た目の形、判定の形、接触後の動作を確かめます。

## 操作・表示・進行を組み立てる

1. [入力アクションと機器](/game/basics/input-actions-and-devices.html)で、キーやパッドの操作をゲームの意味へ対応させます。
2. [UIの配置と操作](/game/basics/ui-layout-and-interaction.html)で、HPやメニューを画面に置き、操作を受け付ける方法を見ます。
3. [プレハブとオブジェクトの寿命](/game/basics/prefabs-and-object-lifetimes.html)で、同じ設定から物体を作り、有効化・無効化・破棄を扱います。
4. [ゲームの状態とポーズ](/game/basics/game-states-and-pause.html)で、今の場面に応じて入力と更新を切り替えます。
5. [ゲーム内イベントと通知](/game/basics/game-events-and-notifications.html)で、HPなどの変化を必要な表示へ伝えます。
6. [セーブデータとシリアライズ](/game/basics/save-data-and-serialization.html)で、次の起動へ引き継ぐ情報を保存し、読み戻す流れを見ます。

## 確かめること

- 素材のファイルと、実行中のオブジェクトや値の関係を説明できる。
- 描画フレームと、状態を進める更新の回数を分けて数えられる。
- 描画、衝突判定、物理、ゲームのルールが、それぞれ何を担当するか説明できる。

## 小さなゲームにまとめる

[小さなシューティングの設計](/game/shooter-design.html)では、入力、移動、弾、敵、HPをつなげて考えます。設計を読んでから、[C++版](/game/shooter-cpp.html)または[UnityのC#版](/game/shooter-unity.html)へ進めます。

画像が作られる側は[3DCGの基礎](/guide/graphics-basics.html)、コードの読み方や実行方法は[プログラムを書く・動かす基礎](/guide/software-development-basics.html)で確認できます。
