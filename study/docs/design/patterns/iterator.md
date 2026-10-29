---
title: "Iterator"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "コレクションの内部構造(配列か、リストか、ツリーか)を知らずに、要素を順に処理したい。走査のやり方をコレクション自身から分離する。 このパターンはC++/C#では言語とライブラリに完全に吸収済みです(C++のイテレータ・range-for、C#の IEnumerable/foreach)。学ぶ意義は"
---

# Iterator

## 解決する問題

コレクションの**内部構造(配列か、リストか、ツリーか)を知らずに**、要素を順に処理したい。走査のやり方をコレクション自身から分離する。

このパターンはC++/C#では**言語とライブラリに完全に吸収済み**です(C++のイテレータ・range-for、C#の `IEnumerable`/`foreach`)。学ぶ意義は「自作コンテナを言語の走査機構に乗せる方法」と「走査の抽象が何を保証し、何を保証しないか」の理解にあります。

## 登場人物と責務

- **Iterator**: 現在位置を保持し、「次へ」「現在の要素」「終わりか」を提供
- **Aggregate(コレクション)**: イテレータを生成する(`begin()/end()`)
- **Client**: イテレータ経由でのみ要素にアクセス

## パターンなしの実装

```cpp
// C++20(問題例)— 内部構造がむき出し
class EnemyManager {
public:
    std::vector<Enemy> enemies;   // publicで公開
};
// 利用側: for (std::size_t i = 0; i < mgr.enemies.size(); ++i) ...
// 内部をチャンク分割・空間分割構造に変えた瞬間、全利用箇所が壊れる
```

## 問題点

- 内部表現(vectorであること)に全利用者が結合(→ [情報隠蔽](/design/foundations/abstraction-encapsulation.html))
- 「生きている敵だけ」「距離順」など走査のバリエーションを利用側が毎回書く

## パターン適用後のC++コード

```cpp
// C++20 — begin/endを提供すればrange-forに乗れる(これがC++流のIterator)
#include <vector>

class EnemyManager {
public:
    // 内部表現は隠しつつ、走査だけを公開する
    auto begin() { return enemies_.begin(); }
    auto end()   { return enemies_.end(); }
    auto begin() const { return enemies_.begin(); }
    auto end()   const { return enemies_.end(); }
private:
    std::vector<Enemy> enemies_;
};
// 利用側: for (Enemy& e : mgr) { ... }  — 内部がdequeに変わっても無傷
```

「生きている敵だけ」のようなフィルタ走査は、C++20 ranges で走査側の合成として書けます(→ [STL/ranges](/languages/cpp/stl.html))。

```cpp
// C++20 ranges(GCC 10+/MSVC 2019 16.10+。フィルタはビューであってコピーではない)
// for (Enemy& e : mgr | std::views::filter([](const Enemy& e){ return e.IsAlive(); })) ...
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_iterator.cpp">samples/pattern_iterator.cpp</a>(ranges部分はGCC 9のため未検証、構文はcppreference準拠)

## C#またはUnityでの実装

```csharp
// IEnumerable<T> を実装(またはyield returnで生成)すればforeachに乗る
public class EnemyManager : IEnumerable<Enemy> {
    private readonly List<Enemy> enemies = new();
    public IEnumerator<Enemy> GetEnumerator() {
        foreach (var e in enemies)
            if (e.IsAlive) yield return e;   // 「生きている敵だけ」の走査を提供側で定義
    }
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
```

`yield return`(コルーチン的な遅延列挙)はC#がIteratorパターンを言語機能化したもの。UnityのコルーチンもIEnumeratorの転用です。注意: LINQ/列挙はUnityでは**GC Alloc**の発生源になりやすい(→ [UnityのGC](/languages/csharp/memory-management-vs-gc.html))。

## 走査の抽象が保証しないこと(実務の要点)

- **走査中の変更**: 多くのコンテナは走査中の追加・削除で**イテレータが無効化**されます(C++: 未定義動作の温床、C#: 例外)。「敵を走査しながら死んだ敵を削除」はゲームで最頻出の事故。対策: 削除予約リスト、`remove_if` の後処理、逆順走査など(→ [STLコンテナ](/languages/cpp/stl.html))。
- **順序**: `unordered_map` の走査順は不定。順序に依存したゲームロジック(処理順で結果が変わる)は再現性バグになる。

## ゲームでの具体例

- 空間分割構造(→ [Spatial Partition](/game/patterns/optimization-patterns.html))の「この範囲のオブジェクト」走査 — 内部が四分木でもグリッドでも同じforで書ける
- インベントリのフィルタ表示(装備可能なものだけ)
- セーブ対象オブジェクトの列挙

## 利点

- 内部構造と走査の分離(内部変更に強い/[情報隠蔽](/design/foundations/abstraction-encapsulation.html))
- 言語機能(range-for/foreach)・標準アルゴリズムにそのまま乗れる
- 複数の走査方法(順方向・フィルタ付き)を共存させられる

## 欠点

- 自作イテレータの正しい実装は意外に面倒(C++は5つの型定義と演算子群、C#はステートマシン)
- 抽象化により「今どの構造を走査しているか」の性能感覚が薄れる(リストの線形探索を配列と同じ気分で使う等)
- 走査中変更の制約は抽象化しても消えない(むしろ見えにくくなる)

## 適用条件

- コレクションの内部構造を隠したい・変えうる
- 標準アルゴリズム・range-forの恩恵を受けたい(自作コンテナ)

## 避けるべき条件

- 内部が単純な配列で今後も変わらず、利用箇所も少ない → `std::span` やconst参照で中身を渡す方が単純
- インデックスそのものに意味がある走査(グリッド座標など)

## 似たパターンとの違い

- [Composite](/design/patterns/composite.html): ツリー構造の走査を平坦な列として見せるのにIteratorを併用
- [Visitor](/design/patterns/visitor.html): 「走査+要素ごとの処理」を外部化する別解。Iteratorは制御を**利用側**に残す(breakできる)、Visitorは構造側が制御する

## 実務でよく見かける変形

- コールバック走査: `ForEach(std::function<void(Enemy&)>)` — 実装が楽で、内部ロックや分割構造に向く(breakしにくいのが弱点)
- インデックス+世代ハンドルの走査(→ [Object Pool](/game/patterns/object-pool.html))

## 過剰設計になる例

`std::vector<int>` をメンバに持つだけのクラスにフル自作イテレータクラスを書く——`begin()/end()` の転送だけで済みます。

## 関連項目

- [STLコンテナ・イテレータ・アルゴリズム・ranges](/languages/cpp/stl.html)
- [Composite](/design/patterns/composite.html) / [Visitor](/design/patterns/visitor.html)

## 理解度チェック

1. Iteratorパターンが分離する2つのものは何ですか。
2. 「走査中の削除」が危険な理由と、代表的な対策を2つ挙げてください。
3. C++で自作クラスをrange-forに乗せる最小要件は?

## 演習

「死んだ敵を毎フレーム削除する」処理を、(a) 走査中に直接erase(バグあり版をまず観察)、(b) `std::erase_if`(C++20)または削除予約リスト、で書き比べてください(検証サンプル参照)。

---

前: [Interpreter](/design/patterns/interpreter.html) | [カテゴリ目次](/design/patterns/) | 次: [Mediator](/design/patterns/mediator.html)
