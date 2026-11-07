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
  summary: ゲームエンジンの役割、入力と時間、シーンと部品、衝突と物理を図で確かめ、小さなシューティングの実装へ進む読み順。
---

# ゲームの動きと構成から読む

ゲームエンジンに何を任せ、どこにゲームのルールを書くかを確認する入口です。「プレイヤーを配置して動かし、壁に当たる」という場面から、使う用語と処理のつながりを見ます。

## 読む順番

1. [ゲームエンジンの役割](/game/basics/game-engine-basics.html)で、素材、制作ツール、実行する機能、ゲームのルールの関係をつかみます。
2. [ゲームループと時間](/game/basics/game-loop-and-time.html)で、入力、状態の更新、描画を繰り返す流れを追います。
3. [シーンとコンポーネント](/game/basics/scenes-and-components.html)で、配置した物体に機能を組み合わせる方法を見ます。
4. [衝突判定と物理](/game/basics/collisions-and-physics.html)で、見た目の形、判定の形、接触後の動作を確かめます。

## 確かめること

- 素材のファイルと、実行中のオブジェクトや値の関係を説明できる。
- 描画フレームと、状態を進める更新の回数を分けて数えられる。
- 描画、衝突判定、物理、ゲームのルールが、それぞれ何を担当するか説明できる。

## 小さなゲームにまとめる

[小さなシューティングの設計](/game/shooter-design.html)では、入力、移動、弾、敵、HPをつなげて考えます。設計を読んでから、[C++版](/game/shooter-cpp.html)または[UnityのC#版](/game/shooter-unity.html)へ進めます。

画像が作られる側は[3DCGの基礎](/guide/graphics-basics.html)、コードの読み方や実行方法は[プログラムを書く・動かす基礎](/guide/software-development-basics.html)で確認できます。
