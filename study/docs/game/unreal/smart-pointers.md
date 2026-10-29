---
title: "UEのスマートポインタ — TSharedPtr・TUniquePtr・TWeakPtr・TSoftObjectPtr"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "UEは標準の std::shared_ptr 等を使わず、同じ概念の独自実装(TSharedPtr等)を持ちます。使い分けの考え方は標準スマートポインタと同一で、適用対象が「非UObject」に限られる点だけがUE特有の重要ルールです。"
---

# UEのスマートポインタ — TSharedPtr・TUniquePtr・TWeakPtr・TSoftObjectPtr

## 一言で言うと

UEは標準の `std::shared_ptr` 等を使わず、**同じ概念の独自実装**(TSharedPtr等)を持ちます。使い分けの考え方は[標準スマートポインタ](/languages/cpp/smart-pointers.html)と同一で、**適用対象が「非UObject」に限られる**点だけがUE特有の重要ルールです。

## 対応表

| 標準C++ | UE(非UObject用) | UObject用(→ [GCページ](/game/unreal/gc-and-object-pointers.html)) |
|---|---|---|
| `std::unique_ptr<T>` | `TUniquePtr<T>` | (対応なし — GCが管理) |
| `std::shared_ptr<T>` | `TSharedPtr<T>` / `TSharedRef<T>`(null非許容版) | `UPROPERTY() TObjectPtr<T>` |
| `std::weak_ptr<T>` | `TWeakPtr<T>` | `TWeakObjectPtr<T>` |
| `std::make_shared` | `MakeShared<T>()` / `MakeShareable` | `NewObject<T>()` |
| (遅延ロードの概念なし) | — | `TSoftObjectPtr<T>`(パス保持・要求時ロード → [Proxy](/design/patterns/proxy.html)) |

**鉄則: UObjectに標準/TSharedPtrを使わない。非UObjectにTObjectPtrは使えない。** 2つの管理系([GCとRAII](/runtime/memory/gc-and-csharp-comparison.html))を型で混ぜないことがUE C++の秩序です。

## なぜ独自実装なのか

1. **歴史**: UEのコードベースはC++11(std::shared_ptr標準化)より古く、独自実装が先にあった
2. **制御**: スレッドセーフモードの選択(`ESPMode`)、エンジンのアロケータ・診断との統合、公開する型や実装をUE側の規約にそろえられる。ただしUE独自型でも、コンパイラ・対象CPU・エンジン版・ビルド設定などの[ABI](/runtime/cpp-internals/symbols-and-linkage.html)互換条件がなくなるわけではない
3. コンテナ(TArray/FString)も同じ理由で独自——「標準が悪いから」ではなく「**エンジンが全プラットフォームで同一の挙動とメモリ管理を保証したいから**」。この動機は[EASTLなど他エンジン系STL](/languages/cpp/stl.html)と共通

## TSharedRef(標準にない良いもの)

`TSharedRef<T>` は**nullになれないshared参照**。「必ず存在する」を型で表現でき([参照のnull非許容性](/languages/cpp/values-pointers-references.html)と同じ発想)、APIの契約が明確になります。標準C++に相当物がなく、UEから輸入したくなる設計です。

## TSoftObjectPtr(アセット参照の要)

```cpp
UPROPERTY(EditAnywhere)
TSoftObjectPtr<UStaticMesh> HeavyMesh;   // エディタではアセットを「パス」で指す(ロードしない)

// 使うとき明示的にロード(同期/非同期)
UStaticMesh* Mesh = HeavyMesh.LoadSynchronous();            // または StreamableManagerで非同期
```

- **ハード参照(TObjectPtr)の連鎖はロードの連鎖**: あるActorをロードすると、そのUPROPERTYが指すアセットも芋づるでロードされる。ソフト参照はこの連鎖を切る道具——[Proxy/遅延ロード](/design/patterns/proxy.html)と[アセット管理](/game/patterns/optimization-patterns.html)の実践形
- Unity対応: `AssetReference`(Addressables)とほぼ同じ役割

## 使い分けフローチャート(UE版)

```
管理したいのは UObject 系?
 ├ Yes → メンバ保存: UPROPERTY() TObjectPtr<T>
 │        消えるかもしれない相手: TWeakObjectPtr<T>
 │        アセットで、ロード時期を制御したい: TSoftObjectPtr<T>
 └ No(純C++クラス、Slateウィジェット等)
          → 所有1人: TUniquePtr (第一候補)
            共有が本当に必要: TSharedPtr(/TSharedRef)
            循環切り・観測: TWeakPtr
```

判断の考え方は[unique_ptrかshared_ptrか](/design/decisions/cpp-choices.html)がそのまま適用できます。

## Unity開発者が誤解しやすい点

1. 「スマートポインタは1種類覚えればいい」— UEでは**UObject系と非UObject系の2系統**を必ず区別する
2. SlateのUI(SWidget)はTSharedPtrの世界(UObjectではない)——UMG(UObject)とSlateで管理系が変わる(→ [Gameplay Framework](/game/unreal/gameplay-framework.html))
3. `TSoftObjectPtr`を「弱参照の一種」と混同——弱参照(生死の観測)ではなく**ロード制御**(パス参照)。目的が違う

## 理解度チェック

1. UObjectと非UObjectでポインタの選択肢がどう分かれますか。
2. UEが標準スマートポインタを使わない理由を2つ挙げてください。
3. ハード参照とソフト参照の違いは何に効きますか。

## 演習

「ボス戦アセット(巨大)を、ボス部屋の手前で先読みし、戦闘後に解放する」フローを、TSoftObjectPtr+非同期ロードの擬似コードで設計してください。Unity Addressablesで同じことを書いた場合との対応も書き添えてください。

---

前: [UBT・Module・Build.cs](/game/unreal/build-system-ubt.html) | [カテゴリ目次](/game/unreal/) | 次: [UEのDelegateとInterface](/game/unreal/delegates-and-interfaces.html)
