---
title: "リフレクション — UCLASS・UFUNCTION・UPROPERTY・Unreal Header Tool"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "リフレクション=「実行時に型の情報(クラス名・プロパティ一覧・関数一覧)を調べ、操作できる仕組み」。C#では言語標準(GetType()、属性)ですが、C++にはほぼ存在しない(RTTIは型の同定のみ)。UEはこれをコード生成で自作しました——UCLASS()等のマクロとUnreal Header "
---

# リフレクション — UCLASS・UFUNCTION・UPROPERTY・Unreal Header Tool

## 一言で言うと

**リフレクション**=「実行時に型の情報(クラス名・プロパティ一覧・関数一覧)を調べ、操作できる仕組み」。C#では言語標準(`GetType()`、属性)ですが、**C++にはほぼ存在しない**([RTTIは型の同定のみ](/runtime/cpp-internals/exceptions-and-rtti-impl.html))。UEはこれを**コード生成で自作**しました——`UCLASS()`等のマクロと**Unreal Header Tool (UHT)** がその仕組みです。

## 仕組み: マクロは「印」、UHTが「生成」

```cpp
// enemy.h(UE概念コード)
#pragma once
#include "Enemy.generated.h"        // ← UHTが生成するファイル(命名固定・最後のincludeにする)

UCLASS(Blueprintable)               // ← UHTへの印(C++コンパイラにとってはほぼ空マクロ)
class AEnemy : public AActor {
    GENERATED_BODY()                // ← 生成コードの差し込み口

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Stats")
    float MaxHp = 100.f;

    UFUNCTION(BlueprintCallable)
    void ApplyDamage(float Amount);
};
```

ビルドの流れ([UBT](/game/unreal/build-system-ubt.html)が指揮):

```
1. UHTが全ヘッダーを走査し、UCLASS/UPROPERTY等の印を収集
2. *.generated.h / *.gen.cpp を生成
   — 「AEnemyにはMaxHpというfloatがあり、オフセットはXで、EditAnywhereで…」という
     型情報の登録コード(UClassオブジェクトの構築)
3. 通常のC++コンパイル(生成コード込み)→ 実行時にはUClassとして型情報が引ける
```

つまり**「C++の外側のツールがC++コードを書き足す」**ことでリフレクションを実現しています。C#がコンパイラ標準でメタデータを吐くのと同じ結果を、生成で作っている——[名前修飾やRTTIの限界](/runtime/cpp-internals/symbols-and-linkage.html)を知っていれば、この力技の必然性が分かります。

## リフレクションの上に載っている機能(UEの本体と言ってよい)

| 機能 | リフレクションの使われ方 |
|---|---|
| エディタのDetailsパネル | UPROPERTYの列挙・型に応じたUI生成・編集 |
| シリアライズ(保存/ロード) | プロパティを名前で読み書き(バージョン耐性) |
| [GC](/game/unreal/gc-and-object-pointers.html) | UPROPERTYのポインタを辿って到達可能性を判定 |
| Blueprint | UFUNCTION/UPROPERTYをノードとして公開・呼び出し |
| ネットワークレプリケーション | UPROPERTY(Replicated)の自動同期 |
| `Cast<T>()` | UClass階層の照合(RTTIなしのdynamic_cast代替 → [キャスト](/languages/cpp/casts.html)) |

## 指定子(specifier)の読み方(代表例)

- UPROPERTY: `EditAnywhere`(エディタで編集可)/ `VisibleAnywhere`(表示のみ)/ `BlueprintReadWrite` / `Replicated` / `Transient`(保存しない)
- UFUNCTION: `BlueprintCallable` / `BlueprintImplementableEvent`(実装をBPに任せる)/ `Server/Client/Reliable`(RPC)
- **指定子は「この情報を誰に公開するか」の宣言**——[カプセル化](/design/foundations/abstraction-encapsulation.html)の「コードへの公開」とは別軸で「エディタ・BP・ネットへの公開」を制御している、と整理すると混乱しない

## 標準C++ではどう書くか

- 型情報が要る場面を自作するなら: enumの型ID+switch、[Visitor](/design/patterns/visitor.html)、マクロ/テンプレートによる登録制、外部コード生成——どれも部分的な再発明になる
- C++標準のリフレクション(静的リフレクション)は将来規格で議論中(C++26方向)だが、現時点のゲーム開発では「**必要ならUEのように生成で作る**」が現実解
- Unityとの対比: C#は`[SerializeField]`や`GetType()`が**言語とランタイムの標準機能**——UEが大量の機械を回してやっと得ているものを、C#は無料で持っていた、という見方ができる

## Unity開発者が誤解しやすい点

1. 「UCLASSはC++の文法」— 違う。UHTという**外部ツールへの指示**であり、標準C++コンパイラだけでは意味を持たない(UEコードが単体でコンパイルできない理由)
2. `[SerializeField]`感覚でUPROPERTYを「保存の印」とだけ思う——GC追跡という**生死に関わる役割**が乗っている(→ [前ページ](/game/unreal/gc-and-object-pointers.html))
3. generated.hのinclude順・命名を「おまじない」で崩す——UHTの生成規約なので固定(最後のincludeでなければならない)

## 理解度チェック

1. UHTは何を入力に何を生成しますか。マクロ自体は何をしていますか。
2. リフレクションの上に載っているUE機能を4つ挙げてください。
3. C#では同じものがなぜ「無料」なのですか。

## 演習

UEプロジェクトを持っている場合: 任意のUCLASSヘッダーの `*.generated.h`(Intermediateフォルダ)を開き、(a) UClass登録らしきコード、(b) プロパティのオフセット記録らしきコードを探してください。持っていない場合: 「HPと名前を持つ敵クラスの型情報(プロパティ名・型・オフセットの表)を実行時に引けるようにする」最小のC++登録機構を、[offsetof](/runtime/cpp-internals/memory-layout.html)を使って自作してみてください(UHTの1万分の1を体験するのが目的)。

---

前: [UEのGCとUPROPERTY](/game/unreal/gc-and-object-pointers.html) | [カテゴリ目次](/game/unreal/) | 次: [UBT・Module・Build.cs](/game/unreal/build-system-ubt.html)
