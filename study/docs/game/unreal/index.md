---
title: Unreal Engineと標準C++をつなぐ学習ガイド
study:
  source: C++ Wiki
  status: published
  summary: 標準C++の仕組みと、UObject・GC・リフレクション・UBTの対応を順に読む。
  section: learning
  format: path
  domain: game
  collection: cpp-design
  order: 10
---

<div id="第10部-unreal-engineとの対応" class="study-legacy-anchor" aria-hidden="true"></div>

# Unreal Engineと標準C++をつなぐ学習ガイド

UEのC++は「標準C++の上に、**エンジン独自の層**(リフレクション・GC・独自コンテナ・ビルドツール)を被せたもの」です。このガイドから読む各本文では「**標準C++ではどう書くか**」と「**UEではなぜ独自の方法を使うか**」を対比します。UE独自仕様を標準C++と混同しないことが、両方を正しく学ぶ鍵です。

## 本文を読む順序

1. [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html)
2. [UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr](/game/unreal/gc-and-object-pointers.html)
3. [リフレクション: UCLASS・UFUNCTION・Unreal Header Tool](/game/unreal/reflection-and-uht.html)
4. [Unreal Build Tool・Module・Build.cs・Target.cs](/game/unreal/build-system-ubt.html)
5. [UEのスマートポインタ: TSharedPtr・TUniquePtr・TSoftObjectPtr](/game/unreal/smart-pointers.html)
6. [UEの Delegate と Interface](/game/unreal/delegates-and-interfaces.html)
7. [Gameplay Framework・Subsystem・Slate/UMG・DataAsset/DataTable](/game/unreal/gameplay-framework.html)

仕組みを確認したら、「実践・サンプル」の[Unreal Engine演習](/game/unreal/exercises.html)で確かめられます。

## 全体対応表

| 領域 | 標準C++ | UE |
|---|---|---|
| 基底オブジェクト | なし(自由) | UObject(リフレクション+GCの世界) |
| メモリ管理 | RAII+スマートポインタ | UObject層=GC / 非UObject層=標準流 **2層構造** |
| 型情報 | RTTI(最小限) | 自作リフレクション(UCLASS等+UHT生成コード) |
| コンテナ | std::vector, std::string... | TArray, FString...(独自。理由は本文) |
| ビルド | CMake等 | UBT+Build.cs/Target.cs |
| イベント | 自作(std::function) | Delegateマクロ群(+Blueprint連携) |
| 例外 | 選択制 | **非使用**(check/ensure文化) |

## 前提

[スマートポインタ](/languages/cpp/smart-pointers.html)、[所有権](/runtime/memory/ownership-and-borrowing.html)、[翻訳単位](/runtime/cpp-internals/translation-units-and-headers.html)を先に読むと、「UEがなぜそうしたか」が理解できます。

---

[C++・設計の学習ガイド](/guide/cpp-index.html) | [UObject・Actor・ActorComponentの本文](/game/unreal/uobject-actor-component.html)
