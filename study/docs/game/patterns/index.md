---
title: ゲームプログラミングパターンの学習ガイド
study:
  source: C++ Wiki
  status: published
  summary: ゲームループ・通知・Component・AI・UIの本文を、前提と比較から読み進める。
  section: learning
  format: path
  domain: game
  collection: cpp-design
  order: 4
---

<div id="第4部-ゲームプログラミングで頻出するパターン" class="study-legacy-anchor" aria-hidden="true"></div>

# ゲームプログラミングパターンの学習ガイド

[GoFパターン](/design/patterns/)を踏まえ、**ゲーム開発の現場で生まれた実戦パターン**を読むためのガイドです。多くはRobert Nystrom『Game Programming Patterns』で整理されたもので、パフォーマンス(毎フレーム動く・大量に出る)とワークフロー(企画が調整する)というゲーム特有の圧力から生まれています。

## 本文を読む順序

| ページ | 扱うパターン |
|---|---|
| [Game Loop と Update Method](/game/patterns/game-loop-and-update.html) | ゲームの心臓部。固定/可変タイムステップ |
| [Component と ECS](/game/patterns/component-and-ecs.html) | Component、Entity Component System、継承方式との比較、GameObject/MonoBehaviour方式との比較 |
| [Event Queue・Message Bus・Pub/Sub](/game/patterns/event-queue-and-pubsub.html) | Observerとの比較を含む通知の全体地図 |
| [Service Locator と DI](/game/patterns/service-locator-and-di.html) | 依存の配り方2方式の比較 |
| [Object Pool](/game/patterns/object-pool.html) | 通常のnew/deleteとの比較 |
| [最適化系パターン](/game/patterns/optimization-patterns.html) | Dirty Flag、Spatial Partition、Data Locality、Double Buffer |
| [Type Object・Subclass Sandbox・Bytecode](/game/patterns/type-object-and-sandbox.html) | データ駆動設計の3段階 |
| [ステートマシン(FSM/HSM)](/game/patterns/state-machines.html) | 有限/階層型ステートマシン、State と Strategy の比較 |
| [Behavior Tree と Blackboard](/game/patterns/behavior-tree-and-blackboard.html) | AIの構造化 |
| [Command Buffer と入力処理](/game/patterns/command-buffer-and-input.html) | Commandパターンとの関係、描画コマンドバッファ |
| [MVC・MVP・MVVM](/game/patterns/mvc-mvp-mvvm.html) | UIアーキテクチャ3方式の比較 |
| [Reactive Programming](/game/patterns/reactive-and-message-bus.html) | R3/UniRx、データフローの考え方 |

仕組みを確認したら、「実践・サンプル」の[ゲームプログラミングパターン演習](/game/patterns/exercises.html)で確かめられます。

## このガイドの使い方

- 各パターンは**UnityとUnreal Engineのどこに現れるか**を必ず書いています。「自作する」より「エンジンが実装済みのものを正しく使う」場面の方が多いためです。
- 最適化系パターン(Object Pool、Data Locality等)は**計測とセット**で使うもの。計測なしの適用は[早すぎる最適化](/design/foundations/yagni-kiss-dry.html)です。

## 主要な比較(このカテゴリの核)

- [Observer vs Event Queue vs Pub/Sub](/game/patterns/event-queue-and-pubsub.html)
- [State vs Strategy](/game/patterns/state-machines.html)
- [Component方式 vs 継承方式 / ECS vs MonoBehaviour](/game/patterns/component-and-ecs.html)
- [Service Locator vs DI](/game/patterns/service-locator-and-di.html)
- [Object Pool vs new/delete](/game/patterns/object-pool.html)
- [MVC vs MVP vs MVVM](/game/patterns/mvc-mvp-mvvm.html)

---

[C++・設計の学習ガイド](/guide/cpp-index.html) | [ゲームループの本文](/game/patterns/game-loop-and-update.html)
