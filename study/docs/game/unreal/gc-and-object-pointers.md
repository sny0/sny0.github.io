---
title: "UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "UEはUObjectに限定したマーク&スイープGCを自作しています。「C++なのにGC」——第7部で学んだ2つの世界がUEでは同居しており、「このポインタはGCに見えているか?」が生死を分ける独自ルールになります。"
---

# UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr

## 一言で言うと

UEは**UObjectに限定した**マーク&スイープGCを自作しています。「C++なのにGC」——[第7部で学んだ2つの世界](/runtime/memory/gc-and-csharp-comparison.html)がUEでは**同居**しており、「このポインタはGCに見えているか?」が生死を分ける独自ルールになります。

## 仕組み(概要)

- ルート(GameInstance、レベル等)から **UPROPERTYで宣言されたポインタ**を辿り、到達できないUObjectを回収(マーク&スイープ)。既定では一定間隔+レベル遷移などで実行
- **C#のGCとの決定的な違い**: .NETは実行中のあらゆる参照(スタック・レジスタ含む)を追跡できるが、UEのGCは**リフレクションに登録された(=UPROPERTYの)参照しか見えない**

```cpp
UCLASS()
class ATurret : public AActor {
    GENERATED_BODY()

    UPROPERTY()                        // GCに「この参照を辿って」と教える
    TObjectPtr<AEnemy> Target;         // → Targetが生きている限りEnemyは回収されない
                                       //   (=参照が対象を延命する。C#と同じ感覚)

    AEnemy* RawTarget;                 // UPROPERTYなし: GCから不可視!
                                       // (1) Enemyがこれ以外から参照されなければ回収される
                                       // (2) 回収後もRawTargetは残る=dangling(C++の事故がそのまま)
};
```

**UPROPERTYを付け忘れた生ポインタは「延命もしない・無効化もされない」最悪の存在**——UE C++の事故原因第1位です。

## ポインタ型の使い分け(UE5)

| 型 | 意味 | 対応する標準C++の概念 |
|---|---|---|
| `UPROPERTY() TObjectPtr<T>` | 所有的・強参照(延命する)。UE5でのメンバ宣言の標準形 | shared_ptr的(ただし台帳方式) |
| `TWeakObjectPtr<T>` | 弱参照(延命しない+**生死を問える** `IsValid()`) | [weak_ptr](/languages/cpp/smart-pointers.html) |
| `TSoftObjectPtr<T>` | アセットへの**パス参照**(ロードを強制しない) | [Proxy](/design/patterns/proxy.html)(遅延ロード) |
| 生ポインタ `T*` | 関数引数・ローカルなど**一時的な借用のみ** | 非所有生ポインタ([借用](/runtime/memory/ownership-and-borrowing.html)) |

- 使い分けの原則は第7部と同型: **メンバとして保存するならGCに見える形(TObjectPtr+UPROPERTY)か弱参照(TWeakObjectPtr)**、関数スコープの借用は生ポインタで可
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

1. 「C#と同じで参照してれば生きてる」— **UPROPERTYの参照だけ**が延命する。ローカルのC++変数に持っただけでは(次のGCで)消えうる
2. 「Destroyしたらnullになる」— Unityの`==null`偽装に慣れていると、UEの「IsValidで確認」を忘れる。生ポインタは**何も起きない**(dangling)
3. UObjectに`std::shared_ptr`を使う——**禁止**(2つの管理系が衝突)。UObjectはUE式、非UObjectは標準式、と世界を分ける

## 理解度チェック

1. UEのGCがC#のGCと違い「UPROPERTYしか見えない」ことの帰結を2つ(延命されない/danglingになる)説明できますか。
2. TObjectPtr / TWeakObjectPtr / TSoftObjectPtr / 生ポインタの使い分けは?
3. UObjectと非UObjectでメモリ管理の流儀がどう分かれますか。

## 演習

「ロックオンカメラ(ターゲットの敵が消えるかもしれない)」を、(a) 標準C++(第7部演習の解答)、(b) UE(TWeakObjectPtr+IsValid)の両方の骨格で書き、同じ問題への2つの解法として対比してください。

---

前: [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html) | [カテゴリ目次](/game/unreal/) | 次: [リフレクションとUHT](/game/unreal/reflection-and-uht.html)
