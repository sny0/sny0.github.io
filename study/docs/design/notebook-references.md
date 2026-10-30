---
title: 設計の手帖の参考資料
study:
  source: 設計の手帖
  status: published
  summary: Bjarne Stroustrup / Herb Sutter ほか 資料を開く インターフェース、所有権、クラス設計の指針。規格書そのものではありません。 Microsoft Learn
  section: reference
  format: references
  domain: design
---

# 設計の手帖の参考資料

## C++ Core Guidelines {#core}

Bjarne Stroustrup / Herb Sutter ほか

[資料を開く](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)

インターフェース、所有権、クラス設計の指針。規格書そのものではありません。

## .NET の依存関係の挿入 {#di}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/overview)

DI の仕組みと、Transient・Scoped・Singleton のライフタイム。

## Common web application architectures {#arch}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/common-web-application-architectures)

レイヤーと、Application Core へ向ける依存関係。

## Designing a DDD-oriented microservice {#ddd}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice)

ドメイン層、アプリケーション層、インフラ層の役割。DDD はマイクロサービス以外にも適用できます。

## Value Object {#value}

Martin Fowler

[資料を開く](https://martinfowler.com/bliki/ValueObject.html)

値によって等しさを判断するオブジェクト。

## Repository {#repo}

Martin Fowler

[資料を開く](https://martinfowler.com/eaaCatalog/repository.html)

ドメインオブジェクトの集合として永続化を扱うパターン。

## Data Transfer Object {#dto}

Martin Fowler

[資料を開く](https://martinfowler.com/eaaCatalog/dataTransferObject.html)

境界を越えてデータを運ぶためのオブジェクト。

## CQRS {#cqrs}

Martin Fowler

[資料を開く](https://martinfowler.com/bliki/CQRS.html)

更新用と参照用のモデルを分ける考え方と、複雑性の注意点。

## Names of Classes, Structs, and Interfaces {#names}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/names-of-classes-structs-and-interfaces)

.NET の型名、I 接頭辞、Exception・EventArgs などの慣例。既存チームの規約も確認します。

## Implement a Dispose method {#dispose}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)

IDisposable、所有するリソースの解放、継承時の Dispose。

## Task asynchronous programming model {#async}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model)

async / await と Task の基本。

## Data binding and MVVM {#mvvm}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/en-us/windows/apps/develop/data-binding/data-binding-and-mvvm)

View・ViewModel・Model の分離と、データバインディング。

## Commanding overview — WPF {#commands}

Microsoft Learn

[資料を開く](https://learn.microsoft.com/dotnet/desktop/wpf/advanced/commanding-overview)

操作の意味を入力装置から切り離すコマンド。
