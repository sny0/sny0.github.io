---
title: "第1部 演習 — 設計の基礎"
study:
  source: "C++ Wiki"
  kind: "演習"
  status: "既存原稿"
  summary: "解答は各問の直後に折りたたみで置いています。まず自力で答えてから開いてください。 次の記述の正誤を判定し、誤りなら訂正してください。 凝集度はモジュール間の関係を表す指標である。"
---

# 第1部 演習 — 設計の基礎

解答は各問の直後に折りたたみで置いています。まず自力で答えてから開いてください。

## 問1. 概念確認

次の記述の正誤を判定し、誤りなら訂正してください。

1. 凝集度はモジュール間の関係を表す指標である。
2. DRY原則は、同じ字面のコードを2度書くことを禁じている。
3. リファクタリングとは、コードの振る舞いを改善することである。
4. 継承は is-a、コンポジションは has-a の関係を表す。

<details><summary>解答</summary>

1. **誤り。** 凝集度はモジュール**内部**の関連の強さ。モジュール間は結合度([凝集度と結合度](/design/foundations/cohesion-and-coupling.html))。
2. **誤り。** DRYが禁じるのは**知識**の重複。字面が同じでも変更理由が違うなら統合すべきでない([YAGNI・KISS・DRY](/design/foundations/yagni-kiss-dry.html))。
3. **誤り。** リファクタリングは**振る舞いを変えずに**内部構造を改善すること。振る舞いの改善は機能追加・バグ修正であり、混ぜないことが原則([リファクタリング](/design/foundations/tech-debt-and-refactoring.html))。
4. **正しい。** ただし「is-aが字面上成り立つ」だけでは不十分で、置換可能性([LSP](/design/solid/lsp.html))まで満たす必要がある。
</details>

## 問2. コード読解(変更理由の数)

```cpp
// C++20
class Player {
public:
    void Update() {
        if (Input::GetKey(Key::A)) x_ -= speed_;
        if (Input::GetKey(Key::D)) x_ += speed_;
        if (hp_ <= 0) { PlayDeathAnim(); SaveScoreToFile(); }
        hpBarWidth_ = 200.0f * hp_ / maxHp_;
    }
    // メンバ定義は省略
};
```

このUpdateに混ざっている「変更理由」を列挙してください。

<details><summary>解答</summary>

少なくとも4つ: (1) キー割り当て・入力方式の変更(入力)、(2) 移動仕様の変更(操作ロジック)、(3) 死亡時の演出・記録の変更(演出/永続化 — さらに分ければ2つ)、(4) HPバーの見た目の変更(UI)。SaveScoreToFile はファイル形式という別の変更理由も抱えている。**別解**: 分類の粒度は一意ではない。「入力と移動を操作系として1つに数える」のも、当面一緒に変わるなら妥当。重要なのは列挙できることと、分割コストに見合うかの判断([責務](/design/foundations/responsibility-and-separation.html))。
</details>

## 問3. 問題のあるコードの改善

問2のコードを、変更理由ごとに分ける改善案の骨格(クラス名と持つ関数だけで可)を書いてください。分けすぎない案も1つ作ってください。

<details><summary>解答</summary>

**分割案**: `PlayerInput`(意図の生成: MoveLeft/MoveRight)、`PlayerMovement`(座標更新)、`PlayerHealth`(hpと死亡通知イベント)、UI・保存は `PlayerHealth` のイベント購読側へ。
**分けすぎない案**: `Player`(入力+移動+HP)はそのまま、**UIと保存だけ**イベント購読に出す。入力と移動は当面同時に変わるので急いで分けない。
**トレードオフ**: 分割案はテスト容易・変更が局所化するが、ファイル4つ+イベント機構が必要。小規模なら後者で十分。「全部分ける」だけが正解ではない点が本問の狙い([YAGNI](/design/foundations/yagni-kiss-dry.html))。
</details>

## 問4. 設計比較

「敵がプレイヤーを発見したらBGMを戦闘曲に変える」機能の実装として、次の2案の利点・欠点を比較してください。

- 案A: `Enemy` が `BgmManager::Instance().Play("battle")` を直接呼ぶ
- 案B: `Enemy` が `PlayerSpotted` イベントを発行し、BGM側が購読する

<details><summary>解答</summary>

**案A** 利点: 追いやすい(発見処理を読めばBGMが変わると分かる)、実装が数分。欠点: EnemyがBGM管理に依存([依存の方向](/design/foundations/dependency.html)が悪い — ゲームロジックが演出に依存)、BGM側の仕様変更(発見者数で曲を変える等)のたびにEnemyを触る、Enemyのテストに音システムが要る。
**案B** 利点: Enemyは戦闘ロジックに集中、購読側(BGM・UI・実績)を無限に足せる。欠点: 「なぜ曲が変わった?」の追跡が困難になる、イベント機構が必要。
**判断**: 発見イベントに反応するものがBGMだけで今後も増えないなら案Aで十分。既にUI表示や実績も反応したがっているなら案B([Observer](/design/patterns/observer.html))。
</details>

## 問5. デバッグ問題

あるプロジェクトで「HPバーの表示を変更したら、敵のAIが動かなくなった」という報告がありました。設計の観点から、最も疑わしい構造上の問題は何ですか。

<details><summary>解答</summary>

UI(HPバー)とAIが**結合している**こと。典型的には (1) 神クラスがUI更新とAI更新を1つの関数で行っており、UI変更時にAI呼び出しを誤って壊した、(2) AIがUIオブジェクトの状態(表示中フラグ等)を参照している、(3) 共有のグローバル状態(Singleton)を両者が読み書きしている。いずれも「無関係なはずの変更が波及する」高結合の症状([凝集度と結合度](/design/foundations/cohesion-and-coupling.html))。調査の起点はHPバー変更のdiffと、そのコードを参照しているものの逆検索。
</details>

## 問6. 説明問題

「カプセル化と情報隠蔽の違い」を、コードを1行も使わずに後輩に説明する文章を3文以内で書いてください。

<details><summary>解答例</summary>

カプセル化は「データとそれを扱う操作を1つの箱にまとめる」こと。情報隠蔽は「箱の中の、将来変わりそうな決め事を外から見えなくする」こと。まとめても全部publicなら隠蔽はしていないし、隠蔽はまとめ方の良し悪しとは別の判断——という関係です([抽象化・カプセル化・情報隠蔽](/design/foundations/abstraction-encapsulation.html))。
</details>

## 問7. 小規模実装問題

「コイン・回復薬・鍵」の3種類が拾えるゲームを想定し、次の2通りで実装してください(コンパイルが通る最小構成)。

1. enum + switch 版
2. インターフェース版(`IPickup`)

その後、両方に「拾うと10秒間移動速度2倍のブーツ(効果が時間経過で切れる)」を追加し、変更の広がり方の違いを短くまとめてください。

<details><summary>解答の要点</summary>

実装例は <a href="/study/samples/cpp/design_basics_pickup.cpp">samples/design_basics_pickup.cpp</a> にあります(switch版とインターフェース版の両方)。
まとめの要点: switch版は「拾った瞬間の処理」に**時間経過**という新しい概念が入った時点で破綻し始める(効果の管理場所がswitchの外に必要になる)。インターフェース版は `IPickup` が `OnPickedUp` しか持たないと同じ問題に当たる——つまり**どちらの方式でも「継続効果」は拾得処理と別の設計(効果システム)が必要**、が本質。方式の優劣より、仕様の変化が設計の前提を壊す例として覚えるとよい([ケーススタディ: アイテム効果](/design/case-studies/item-effects.html))。
</details>

---

前: [技術的負債・リファクタリング](/design/foundations/tech-debt-and-refactoring.html) | [カテゴリ目次](/design/foundations/) | [第2部: SOLID原則へ](/design/solid/)
