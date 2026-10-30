---
title: 設計パターンの索引
study:
  source: 設計の手帖
  status: published
  summary: "分類: 振る舞い 方法を差し替える 使う場面: 送料や割引方式が増える Strategy・State・Command 分類: 振る舞い 状態と遷移を明示する 使う場面: 状態ごとの条件分岐が増える"
  section: reference
  format: index
  domain: design
---

# 設計パターンの索引

## Strategy

分類: 振る舞い

方法を差し替える

使う場面: 送料や割引方式が増える

[Strategy・State・Command](/design/notebook/behavior.html)

## State

分類: 振る舞い

状態と遷移を明示する

使う場面: 状態ごとの条件分岐が増える

[Strategy・State・Command](/design/notebook/behavior.html)

## Command

分類: 振る舞い

操作を一つの単位にする

使う場面: 履歴・キュー・Undo を扱う

[Strategy・State・Command](/design/notebook/behavior.html)

## Observer

分類: 振る舞い

変化を購読者へ知らせる

使う場面: 一つの変化を複数箇所が使う

[Observer とイベント設計](/design/notebook/events.html)

## Template Method

分類: 振る舞い

共通の流れを固定する

使う場面: 手順の一部だけ派生で変える

[Strategy・State・Command](/design/notebook/behavior.html)

## Mediator

分類: 振る舞い

調整の窓口を作る

使う場面: 部品同士の相互依存が増える

[Observer とイベント設計](/design/notebook/events.html)

## Factory / Factory Method

分類: 生成

作る手順や判断を集める

使う場面: 生成時の実装選択が散らばる

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Abstract Factory

分類: 生成

関連する製品を一式作る

使う場面: UI 部品の組を交換したい

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Builder

分類: 生成

段階的に組み立てる

使う場面: 任意項目や組み立て手順が多い

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Singleton

分類: 生成

一つの実体とアクセス点

使う場面: 一つ必要か、共有が必要かを検討

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Adapter

分類: 構造

異なる契約をつなぐ

使う場面: 外部 API を自分の契約に合わせる

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Decorator

分類: 構造

同じ契約のまま機能を重ねる

使う場面: ログやキャッシュを付け外す

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Facade

分類: 構造

使いやすい入口を作る

使う場面: 複数の低水準操作をまとめる

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Proxy

分類: 構造

アクセスを代理する

使う場面: 遅延生成やリモート呼び出し

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Composite

分類: 構造

単体と集合を同じように扱う

使う場面: ツリー構造を同じ操作で処理

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Bridge

分類: 構造

抽象と実装を別々に拡張する

使う場面: 二つの軸の組み合わせが増える

[Adapter・Decorator・Facade](/design/notebook/structure.html)
