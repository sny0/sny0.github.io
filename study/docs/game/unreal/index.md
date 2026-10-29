---
title: "第10部: Unreal Engineとの対応"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "UEのC++は「標準C++の上に、エンジン独自の層(リフレクション・GC・独自コンテナ・ビルドツール)を被せたもの」です。この章は各ページで必ず「標準C++ではどう書くか」と「UEではなぜ独自の方法を使うか」を対比します。UE独自仕様を標準C++と混同しないことが、両方を正しく学ぶ鍵です。"
---

# 第10部: Unreal Engineとの対応

UEのC++は「標準C++の上に、**エンジン独自の層**(リフレクション・GC・独自コンテナ・ビルドツール)を被せたもの」です。この章は各ページで必ず「**標準C++ではどう書くか**」と「**UEではなぜ独自の方法を使うか**」を対比します。UE独自仕様を標準C++と混同しないことが、両方を正しく学ぶ鍵です。

## ページ一覧

1. [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html)
2. [UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr](/game/unreal/gc-and-object-pointers.html)
3. [リフレクション: UCLASS・UFUNCTION・Unreal Header Tool](/game/unreal/reflection-and-uht.html)
4. [Unreal Build Tool・Module・Build.cs・Target.cs](/game/unreal/build-system-ubt.html)
5. [UEのスマートポインタ: TSharedPtr・TUniquePtr・TSoftObjectPtr](/game/unreal/smart-pointers.html)
6. [UEの Delegate と Interface](/game/unreal/delegates-and-interfaces.html)
7. [Gameplay Framework・Subsystem・Slate/UMG・DataAsset/DataTable](/game/unreal/gameplay-framework.html)

仕上げに [演習](/game/unreal/exercises.html)。

## 全体対応表(この章の地図)

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

第5〜7部(特に[スマートポインタ](/languages/cpp/smart-pointers.html)、[所有権](/runtime/memory/ownership-and-borrowing.html)、[翻訳単位](/runtime/cpp-internals/translation-units-and-headers.html))を先に読むと、「UEがなぜそうしたか」が理解できます。

---

[全体目次](/guide/cpp-index.html) | 次: [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html)
