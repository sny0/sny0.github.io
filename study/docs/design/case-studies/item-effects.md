---
title: "ケーススタディ 12: アイテム効果"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "「ポーションはHP回復、エリクサーは全回復、爆弾は範囲ダメージ、鍵は扉を開ける」——使うと何かが起きるものの設計です。 アイテム100種でswitchが巨大化。効果の説明文・アイコンは別の場所にあり、効果とデータの二重管理(説明は回復60、実装は50のズレ事故)"
---

# ケーススタディ 12: アイテム効果

「ポーションはHP回復、エリクサーは全回復、爆弾は範囲ダメージ、鍵は扉を開ける」——**使うと何かが起きる**ものの設計です。

## 素朴な実装

```cpp
// C++20
void Inventory::UseItem(int itemId, Player& p) {
    switch (itemId) {
        case 1: p.Heal(50); break;                    // ポーション
        case 2: p.HealFull(); p.CureAll(); break;     // エリクサー
        case 3: world_.ExplodeAt(p.Pos(), 3.f); break; // 爆弾
        // 100種のアイテム = 100 case...
    }
    Remove(itemId, 1);
}
```

## 機能追加で破綻する過程

1. アイテム100種でswitchが巨大化。効果の説明文・アイコンは別の場所にあり、**効果とデータの二重管理**(説明は回復60、実装は50のズレ事故)
2. 「戦闘中しか使えない」「対象を選ぶ(単体回復)」→ 使用可否・対象選択の情報がswitchの外に散る
3. 「装備すると攻撃+10」「持っているだけで金運UP」→ **「使う」以外の効果タイミング**が現れ、この関数では表現できない
4. 効果の組み合わせ(回復+解毒)のたびに新case
5. 企画がアイテムを追加できない(全部プログラマ作業)

## 案A: 効果のデータ駆動(Type Object — 定石)

```cpp
// アイテム定義はデータ([Type Object](../04_game_patterns/type_object_and_sandbox.md))
struct EffectDesc { std::string type; float value; float radius; };  // {"heal", 50, 0}
struct ItemDef {
    int id; std::string name; std::string icon;
    std::vector<EffectDesc> effects;         // ★効果は小さな効果の合成(回復+解毒)
    bool usableInBattle = true;
};

// 効果の実行はtype→関数の登録テーブル(効果の「種類」だけコード)
class EffectRunner {
public:
    using Fn = std::function<void(const EffectDesc&, Player&, World&)>;
    void Register(std::string_view type, Fn fn);
    void Run(const ItemDef& item, Player& p, World& w) {
        for (const auto& e : item.effects) fns_.at(e.type)(e, p, w);
    }
};
```

- アイテム追加=データ行の追加(効果の**種類**が既存なら)。説明文・数値・実装が同じデータから出る(二重管理の解消)
- 効果の合成が「効果リスト」で自然に表現でき、破綻4が消える
- 新しい効果**種類**だけコード追加(Register 1件)——[OCP](/design/solid/ocp.html)がデータとコードの2層で成立

## 案B: Commandオブジェクト案

効果を`IItemEffect { Execute(ctx) }`のクラス階層にする([Command](/design/patterns/command.html)/[Strategy](/design/patterns/strategy.html))。

- 利点: 複雑な効果(「使うと3ターン後に爆発」)を型で表現できる。Undo(デバッグ)も視野
- 欠点: アイテム1種=クラス1個は量産に不向き。**案Aのtype登録テーブルの「中身」がこの形**なので、対立ではなく階層の違い(データで表現しきれない効果だけクラス化)

## 案C: タイミング分離(装備・パッシブへの拡張)

破綻3への回答は「効果」と「**いつ発火するか**」の分離:

```
ItemDef { effects[], trigger }   trigger: OnUse / OnEquip・OnUnequip / Passive(所持中)
OnEquip系 → [ステート異常](04_status_effects.md)の効果リストに変換して装着(同じ仕組みに合流!)
```

装備効果と状態異常が**同じ「効果リスト」基盤**に乗る——システムの統合が起きるのがこの題材の面白いところです。

## 案D: パターンを使わない簡潔案

アイテム10種以下: 素朴なswitchのまま、**ItemDefデータ(名前・説明・数値)だけ**先に分離する(効果ロジックはswitch、数値はデータ参照)。二重管理事故だけ先に潰す形。

## 継承案について

`Item` → `HealingItem` → `SuperHealingItem` の継承は、効果の合成(回復+解毒)で早々に破綻します([組み合わせ爆発](/design/foundations/inheritance-delegation-composition.html))。効果は**リストの合成**で表現するのが正解で、is-a階層に向きません。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(〜10種) | 案D(switch+データ分離) |
| 中(〜50種、効果種類10前後) | 案A(データ+効果登録テーブル) |
| 大(数百種・運用追加・装備/パッシブあり) | 案A+案C(トリガー分離)+特殊効果のみ案B |
| Unity | ItemDef=ScriptableObject、効果=SO参照 or typeId。定石そのまま |
| UE | DataTable(ItemDef)+GameplayEffect(GAS)が案A+Cの完成品 |

## この題材の教訓

- 「アイテムの種類」を数えるのではなく「**効果の種類**」を数える——100種のアイテムの効果が12種の組み合わせなら、書くべきコードは12個
- 効果には**タイミング(使用/装備/所持)**という直交軸があり、これを見落とすと設計のやり直しになる。仕様ヒアリングで最初に聞くべき質問

---

前: [サウンド管理](/design/case-studies/sound-manager.html) | [カテゴリ目次](/design/case-studies/) | 次: [クエスト](/design/case-studies/quest-system.html)
