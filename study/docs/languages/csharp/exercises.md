---
title: "第9部 演習 — Unity/C#との対応"
study:
  source: "C++ Wiki"
  kind: "演習"
  status: "既存原稿"
  summary: "C#の各機能に対応するC++の道具を答え、「似ているが同じではない」差分を一言添えてください。 using var f = ... 2. event Action 3. List 4. where T : IComparable 5. override(キーワード)"
---

# 第9部 演習 — Unity/C#との対応

## 問1. 概念確認(対応表の穴埋め)

C#の各機能に対応するC++の道具を答え、「似ているが同じではない」差分を一言添えてください。

1. `using var f = ...`  2. `event Action<int>`  3. `List<T>`  4. `where T : IComparable`  5. `override`(キーワード)

<details><summary>解答</summary>

1. RAII(スコープ+デストラクタ)。差分: C++は書き忘れ不能([RAIIとusing](/languages/csharp/destructor-dispose-raii-using.html))。2. `std::vector<std::function<...>>` の自作リスト+Subscribe/Unsubscribe。差分: マルチキャストと解除は言語サポートなし([delegate](/languages/csharp/delegates-events-function-pointers.html))。3. `std::vector<T>`(std::listではない!)。差分: 型ごとにコード生成([テンプレート](/languages/csharp/templates-vs-generics.html))。4. concepts。差分: C++は制約なしでも書ける(使用ベース検査)。5. `override`(同名)。差分: C#は必須、C++は任意なので**書く規律**が必要([仮想関数](/languages/csharp/virtual-and-polymorphism.html))。
</details>

## 問2. コード読解(C#の感覚で読むと誤る)

```cpp
std::vector<Enemy> enemies = GetEnemies();
Enemy strongest = enemies[0];
for (const Enemy& e : enemies)
    if (e.power > strongest.power) strongest = e;
strongest.hp = 0;      // 「最強の敵を倒した」つもり
```

このコードのバグをC#(class)との違いから説明し、修正してください。

<details><summary>解答</summary>

`strongest` は**コピー**(C#のclassなら参照)。最後の行はコピーのhpを0にしただけで、vector内の実物は無傷([値セマンティクス](/languages/csharp/pointers-references-value-semantics.html))。修正: インデックスまたはポインタで追う(`std::size_t best = 0;` を回して `enemies[best].hp = 0;`、または `Enemy* strongest = &enemies[0];`)。参照 `Enemy&` は再代入できない(別名の付け替え不可)ためループでの追跡には使えない点も学びどころ。
</details>

## 問3. 問題のあるコードの改善

「C#の癖でC++を書いた」コードです。3か所指摘し、修正方針を書いてください。

```cpp
class ScoreSystem {
public:
    ScoreSystem() { instance = this; }
    static ScoreSystem* instance;
    void Add(int v) { score += v; }
private:
    int score = 0;
};
void OnEnemyDied() {
    ScoreSystem* s = new ScoreSystem();   // (?)
    ScoreSystem::instance->Add(100);
}
```

<details><summary>解答の要点</summary>

(1) `new ScoreSystem()` してポインタを捨てている——GCがないので即リーク。そもそも生成の必要がない([メモリ管理](/languages/csharp/memory-management-vs-gc.html))。(2) コンストラクタでの `instance = this` はSingletonもどきで、複数生成・寿命・スレッドの問題が全部未定義([Singleton](/design/patterns/singleton.html))。(3) staticポインタの寿命管理(誰がいつ設定・解除?)が不在でdangling必至。修正方針: ScoreSystemは所有者(GameContext等)が値またはunique_ptrで所有し、使う側は参照で受け取る(DI)か、必要ならMeyers' Singletonにする。
</details>

## 問4. 設計比較

「HPが変わったらUIを更新する」を、(a) C#: `event Action<int>`+OnEnable/OnDisableで購読、(b) C++: std::functionリスト+RAII購読トークン、で実装した場合の「解除忘れ事故」の現れ方の違いを説明してください。

<details><summary>解答の要点</summary>

(a) C#: 解除忘れ→delegateがUI(破棄済みのはず)を延命し、非表示のUIが通知を受け続ける(リーク+Unityでは MissingReferenceException)。事故は「死なない」方向。(b) C++: 解除忘れ→リストに死んだオブジェクトへの参照が残り、通知時にUAF(未定義動作)。事故は「死んだ後に触る」方向。RAIIトークンは購読の寿命を部品の寿命に物理的に連動させることで両方向の事故を封じる([delegateとevent](/languages/csharp/delegates-events-function-pointers.html)、[第7部](/runtime/memory/ownership-and-borrowing.html))。
</details>

## 問5. デバッグ問題

「エディタでは動くのにIL2CPPの実機ビルドでだけ `ExecutionEngineException` が出る」。原因の候補と対策を、C++の語彙(実体化・デッドコード除去)で説明してください。

<details><summary>解答の要点</summary>

候補1: **AOTジェネリック実体化漏れ**——リフレクション経由でのみ使われる値型ジェネリックの組み合わせは、事前生成の対象から漏れる(C++テンプレートが「使った分だけ生成」なのと同じ仕組み)。対策: ダミーの明示的使用箇所を書く等で実体化を強制。候補2: **コードストリッピング**——リフレクションでしか呼ばれないメソッドがリンカのデッドコード除去で消えた。対策: link.xmlで保護([IL2CPP](/languages/csharp/il2cpp.html))。
</details>

## 問6. 説明問題

「C++ではnullチェックしてもクラッシュするときはする、と先輩に言われた。C#では防げたのに」— この発言の背景を、danglingとnullの違いから3〜4文で説明してください。

<details><summary>解答例</summary>

C#では「無効な参照」はnullしかなく、チェックすれば安全が保証される(GCが生きている参照を無効にしないから)。C++のポインタには「null」と「**死んだものを指すdangling**」の2種類の無効があり、danglingはnullチェックをすり抜ける(deleteされてもポインタは非nullのまま)。だからC++では「nullかどうか」より「所有者は誰で、いつまで生きるか」を設計することが本質的な対策になる([第7部: 所有権](/runtime/memory/ownership-and-borrowing.html)、[メモリバグ](/runtime/memory/memory-bugs.html))。
</details>

## 問7. 小規模実装問題

C#で書いた経験があるはずの「クールダウン付きスキル使用判定」を、C++で移植してください。仕様: `TryUse(skillId)` は クールダウン中ならfalse、使用可能なら使用してtrue。時間は `Update(dt)` で進む。

要件: (a) C#ならDictionaryを使う場面のC++の選択とその理由、(b) constの付け場所、(c) Rule of Zeroの確認、を実装コメントで説明すること。<a href="/study/samples/cpp/cooldown_set.cpp">samples/cooldown_set.cpp</a> が参考実装です。

---

前: [C++例外とC#例外](/languages/csharp/exceptions-comparison.html) | [カテゴリ目次](/languages/csharp/) | [第10部: Unreal Engineとの対応へ](/game/unreal/)
