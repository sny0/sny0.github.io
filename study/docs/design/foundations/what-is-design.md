---
title: "設計とは何を決める行為なのか"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "設計とは「変更が来たとき、どこを直せば済むようにしておくか」を決める行為です。動くコードを書く行為ではなく、コードの分け方と繋ぎ方を決める行為です。 ゲーム開発のコードは必ず変更されます。企画は仕様を変え、レベルデザイナーはパラメータを変え、プラットフォームは増え、パフォーマンス要件は途中で判明しま"
---

# 設計とは何を決める行為なのか

## 一言で言うと

設計とは「**変更が来たとき、どこを直せば済むようにしておくか**」を決める行為です。動くコードを書く行為ではなく、**コードの分け方と繋ぎ方**を決める行為です。

## 解決したい問題

ゲーム開発のコードは必ず変更されます。企画は仕様を変え、レベルデザイナーはパラメータを変え、プラットフォームは増え、パフォーマンス要件は途中で判明します。

設計をしない(=とりあえず動くように書く)こと自体は悪ではありません。問題は、**変更が来たときに直す場所が散らばっている・直すと別の場所が壊れる**状態になることです。

## 最も単純な例

「敵がダメージを受けたらHPを減らし、0になったら死ぬ」。これだけなら設計は不要です。

```cpp
// C++20
struct Enemy {
    int hp = 100;
    void TakeDamage(int amount) {
        hp -= amount;
        if (hp <= 0) { /* 死亡処理 */ }
    }
};
```

## 問題のある実装(設計しなかった場合の3か月後)

仕様追加のたびに `TakeDamage` に書き足していくと、こうなります。

```cpp
// C++20(問題例。実際はもっと長くなる)
void TakeDamage(int amount, DamageType type, Player* attacker) {
    if (isInvincible) return;
    if (type == DamageType::Fire && hasFireResist) amount /= 2;
    hp -= amount;
    ui->ShowDamageNumber(amount);            // UIの都合
    audio->Play("hit.wav");                  // サウンドの都合
    if (attacker) attacker->AddScore(10);    // スコアの都合
    achievement->Notify("first_hit");        // 実績の都合
    if (hp <= 0) {
        ui->ShowKillLog(name);
        questSystem->OnEnemyKilled(id);      // クエストの都合
        // ... 死亡処理
    }
}
```

何が問題か:

- **変更理由が混ざっている。** ダメージ計算の変更でも、UI演出の変更でも、実績の変更でも、全部この関数を触ることになる(→ [責務](/design/foundations/responsibility-and-separation.html))。
- **依存が増えている。** Enemy が UI・オーディオ・実績・クエストを知ってしまった。Enemy を単体でテストできない(→ [依存関係](/design/foundations/dependency.html))。
- **壊れやすい。** 実績の仕様変更でダメージ計算を壊すリスクがある。

## 改善した実装(の方向性)

具体的な手法は以降の章で扱うので、ここでは「何を決めるか」だけ示します。

```cpp
// C++20(方向性を示す骨格。EventBus等の実装は第4部参照)
struct Enemy {
    int hp = 100;
    // Enemyは「ダメージを受けてHPが変わる」ことだけに責任を持つ
    void TakeDamage(int amount) {
        hp -= amount;
        events.Publish(DamageTaken{id, amount});   // 起きたことを通知するだけ
        if (hp <= 0) events.Publish(EnemyDied{id});
    }
};
// UI・サウンド・実績・クエストは DamageTaken / EnemyDied を購読する側で実装する
```

決めたのは次の2つです。

1. **分け方**: 「HPの増減」と「それに反応する演出・記録」を別の場所に置く。
2. **繋ぎ方**: Enemy が各システムを呼ぶのではなく、イベントで疎に繋ぐ(→ [Observer](/design/patterns/observer.html)、[Event Queue](/game/patterns/event-queue-and-pubsub.html))。

## 何が改善されたか

- UI・実績・クエストの変更で Enemy を触らなくてよくなった。
- Enemy 単体でテストできるようになった(HPが減るかだけ確認すればよい)。

## 代わりに何を失ったか

- **追いにくさ。** 「敵を殴ると何が起きるか」がコードを直線的に読んでも分からなくなった。イベントの購読者を検索する必要がある。
- **コード量。** イベント型と配信の仕組みが増えた。
- 小さいゲームジャムの規模なら、最初の素朴な実装の方が**明確に優れています**。

## 設計が決めていること(まとめ)

| 決めること | 対応する概念 |
|---|---|
| コードをどの単位で分けるか | [責務](/design/foundations/responsibility-and-separation.html)、[凝集度](/design/foundations/cohesion-and-coupling.html) |
| 分けたもの同士をどう繋ぐか | [結合度](/design/foundations/cohesion-and-coupling.html)、[依存関係](/design/foundations/dependency.html) |
| どちらがどちらを知るか | [依存の方向](/design/foundations/dependency.html) |
| 何を見せて何を隠すか | [カプセル化・情報隠蔽](/design/foundations/abstraction-encapsulation.html) |
| 差し替えたい部分をどう差し替えるか | [ポリモーフィズム](/design/foundations/polymorphism-interface.html)、[パターン](/design/patterns/) |

## Unity/C# との対応

MonoBehaviour に何でも書いた「神クラス」化した Player.cs は、上の問題例と同じ状態です。Unity では `UnityEvent` / C# の `event` / ScriptableObject などが「繋ぎ方」の道具になります(→ [第9部](/languages/csharp/))。

## Unreal Engine との対応

UE では Actor / Component の分割、Delegate による通知、Subsystem への役割の切り出しが同じ判断に対応します(→ [第10部](/game/unreal/))。

## よくある誤解

- 「設計 = クラス図を書くこと」ではありません。図は道具で、決めているのは分け方と繋ぎ方です。
- 「設計 = 最初に全部決めること」でもありません。変更が来てから分けても遅くないことは多く、むしろ早すぎる分割は害になります(→ [YAGNI・早すぎる抽象化](/design/foundations/yagni-kiss-dry.html))。

## 使う場面 / 使わない場面

- **設計に時間をかける場面**: 長期運用するコード、複数人が触るコード、変更が頻繁に来ると分かっている部分(ゲームの仕様まわり)。
- **かけない場面**: 捨てるプロトタイプ、ゲームジャム、一度書いたら変わらない部分(数学ユーティリティなど)。「全コードを等しく丁寧に設計する」のは時間の浪費です。

## 関連項目

- [責務と関心の分離](/design/foundations/responsibility-and-separation.html)
- [設計の品質特性](/design/foundations/quality-attributes.html)
- [YAGNI・KISS・DRY](/design/foundations/yagni-kiss-dry.html)
- [判断ガイド: クラスを分けるべきか](/design/decisions/split-class.html)

## 理解度チェック

1. 「設計する」とは具体的に何を決めることか、2つ挙げられますか。
2. 上の問題例 `TakeDamage` には何種類の「変更理由」が混ざっていますか。
3. 改善版が素朴版より不利になるのはどんな状況ですか。

## 演習

自分が最近書いた(または見た)一番大きい関数を1つ選び、「この関数が変更されるとしたら、どんな理由か」を箇条書きにしてください。3つ以上の異なる理由が出たら、それがそのまま分割候補です。

---

[カテゴリ目次](/design/foundations/) | 次: [責務と関心の分離](/design/foundations/responsibility-and-separation.html)
