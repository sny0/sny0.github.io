---
title: UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr
study:
  source: C++ Wiki
  status: published
  summary: UObjectのGCと、UPROPERTY・TObjectPtr・TWeakObjectPtrなどの参照が寿命にどう関係するかを調べる。
  section: reference
  format: article
  domain: game
---

# UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr

## 一言で言うと

UEはUObjectだけを対象とするマーク&スイープGCを備えています。UEでは[RAIIとGCの両方](/runtime/memory/gc-and-csharp-comparison.html)を使います。UObjectの寿命を考えるときは、GCがそのポインタを参照として追跡できるかを確認します。

## 仕組み(概要)

- ルートから、GCへ登録された強参照を辿り、到達できないUObjectを回収します。UObjectのメンバーでは`UPROPERTY`で宣言した`TObjectPtr`が基本です
- .NETのGCは管理対象の参照をスタック・レジスタなどから追跡しますが、UEでは通常のC++生ポインタをローカル変数へ入れただけでGCのルートになるわけではありません。ただし、GCに参照を伝える方法は`UPROPERTY`以外にもあります

非UObjectの所有者からは`FGCObject::AddReferencedObjects`で列挙したり、`TStrongObjectPtr`で保持したりできます。UObject系の`AddReferencedObjects`による参照列挙もあります。`AddToRoot`でルートへ追加する場合は、不要になった時点の`RemoveFromRoot`と対にします。[UEのオブジェクト管理](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-object-handling-in-unreal-engine) · [オブジェクトポインタとTStrongObjectPtr](https://dev.epicgames.com/documentation/en-us/unreal-engine/object-pointers-in-unreal-engine)

```cpp
UCLASS()
class ATurret : public AActor {
    GENERATED_BODY()

    UPROPERTY()                        // GCに「この参照を辿って」と教える
    TObjectPtr<AEnemy> Target;         // → 到達可能なTurretから辿れる強参照
                                       //   ただしActorの明示的なDestroyは防がない

    AEnemy* RawTarget;                 // UPROPERTYなし: GCから不可視!
                                       // GCはこの参照を辿らず、回収後も値を自動更新しない
                                       // (Actorはレベルからの参照やDestroyの規則も持つ)
};
```

GCへ別途登録していない生ポインタを長期保存すると、その参照は対象を延命せず、回収後も自動的に無効化されません。保存する参照の登録方法と、対象の破棄時の扱いを決めます。

## ポインタ型の使い分け(UE5)

| 型 | 意味 | 対応する標準C++の概念 |
|---|---|---|
| `UPROPERTY() TObjectPtr<T>` | 所有的・強参照(延命する)。UE5でのメンバ宣言の標準形 | shared_ptr的(ただし台帳方式) |
| `TStrongObjectPtr<T>` | UPROPERTYを使えない所有者などからGCへ伝える強参照。スコープ終了・Resetで保持を解除する | スコープで管理する保持ハンドル |
| `TWeakObjectPtr<T>` | 弱参照(延命しない+**生死を問える** `IsValid()`) | [weak_ptr](/languages/cpp/smart-pointers.html) |
| `TSoftObjectPtr<T>` | アセットへの**パス参照**(ロードを強制しない) | [Proxy](/design/patterns/proxy.html)(遅延ロード) |
| 生ポインタ `T*` | 関数引数・ローカルなど**一時的な借用のみ** | 非所有生ポインタ([借用](/runtime/memory/ownership-and-borrowing.html)) |

- 使い分けの原則は[所有権と借用](/runtime/memory/ownership-and-borrowing.html)と同型: **メンバとして保存するならGCに見える形(TObjectPtr+UPROPERTY)か弱参照(TWeakObjectPtr)**、関数スコープの借用は生ポインタで可
- 「相手(敵・アイテム)が先に消えるかもしれない参照」は `TWeakObjectPtr`+IsValid()——[ロックオンカメラ問題](/runtime/memory/exercises.html)のUE公式解

## Actorの破棄はGCだけではない

`DestroyActor()` は「ゲーム的な破棄」(レベルから除去・マーク)で、メモリ回収は後のGCが行う2段階です。**破棄済みだが未回収**の期間があるため、生存確認は `IsValid(actor)`(nullチェックでは不十分——UnityのDestroyと`== null`のカスタム比較に似た構図)。

## 標準C++ではどう書くか / なぜUEはGCか

標準C++なら[所有の木+unique_ptr+ハンドル](/runtime/memory/ownership-and-borrowing.html)で設計します。UEがUObjectにGCを選んだ理由:

1. レベル・Actor・コンポーネント・アセット・Blueprintが**相互参照する巨大グラフ**であり、所有の木を全プロジェクトに強制するのは非現実的
2. **Blueprint(非プログラマ)が参照を作る**——所有権設計を要求できない
3. エディタでのオブジェクト差し替え・ホットリロードに、到達可能性ベースの回収が都合よい

一方、**非UObject**(FVector、TArrayの中身、自作の純C++クラス)は完全に標準C++の世界(RAII・値セマンティクス)。**UEプログラマは2つのメモリモデルを常に区別して書いている**のが実態です。

## Unity開発者が誤解しやすい点

1. 「C#と同じで参照してれば生きてる」— UEのGCへ伝わる強参照が必要です。UPROPERTYのメンバー以外にも登録手段はありますが、通常のローカル生ポインタだけでは保持になりません。また、強参照はActorの明示的なDestroyを防ぐものではありません
2. 「Destroyしたらnullになる」— Unityの`==null`偽装に慣れていると、UEの「IsValidで確認」を忘れる。生ポインタは**何も起きない**(dangling)
3. UObjectに`std::shared_ptr`を使う——**禁止**(2つの管理系が衝突)。UObjectはUE式、非UObjectは標準式、と世界を分ける

## 理解度チェック

1. UEのGCへ伝えていない生ポインタを保存すると何が起きますか。UPROPERTY以外の参照登録手段を二つ挙げてください。
2. TObjectPtr / TWeakObjectPtr / TSoftObjectPtr / 生ポインタの使い分けは?
3. UObjectと非UObjectでメモリ管理の流儀がどう分かれますか。

## 演習

「ロックオンカメラ(ターゲットの敵が消えるかもしれない)」を、(a) 標準C++([メモリ管理の演習](/runtime/memory/exercises.html)を参照)、(b) UE(TWeakObjectPtr+IsValid)の両方の骨格で書き、同じ問題への2つの解法として対比してください。

---

関連項目：[UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html) | [この分野の学習ガイド](/game/unreal/) | [リフレクションとUHT](/game/unreal/reflection-and-uht.html)
