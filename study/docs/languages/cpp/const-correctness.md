---
title: "const と const correctness"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "const は「これは変更しない」という約束をコンパイラに検査させる仕組み。const correctness とは、コード全体で「変更するもの/しないもの」を一貫して型に刻む規律です。ドキュメントではなく、破るとコンパイルエラーになる契約である点が価値です。"
---

# const と const correctness

## 一言で言うと

`const` は「これは変更しない」という**約束をコンパイラに検査させる**仕組み。const correctness とは、コード全体で「変更するもの/しないもの」を一貫して型に刻む規律です。**ドキュメントではなく、破るとコンパイルエラーになる契約**である点が価値です。

## 基本形

```cpp
// C++20
const int kMaxHp = 100;          // 定数(再代入不可)

void Draw(const Sprite& s);      // 引数: この関数はsを変更しない、という公開契約

class Enemy {
public:
    int Hp() const { return hp_; }        // constメンバ関数: thisを変更しない
    void TakeDamage(int d) { hp_ -= d; }  // 非const: 変更する
private:
    int hp_ = 100;
};

const Enemy& e = GetEnemy();
e.Hp();            // OK: constオブジェクトはconstメンバ関数だけ呼べる
// e.TakeDamage(1); // コンパイルエラー: 「読み取り専用の敵」を変更しようとした
```

### ポインタとconstの位置(初学者の壁)

```cpp
const int* p1;        // 指す先が変更不可(ポインタ自体は差し替え可)
int* const p2 = &x;   // ポインタが差し替え不可(指す先は変更可)
const int* const p3 = &x;   // 両方不可
// 読み方: 「*の左は指す先、右はポインタ自体」
```

## 解決したい問題

「この関数、渡した敵を変更する? しない?」— constがなければ**実装を読むまで分からず**、しかも実装が変わっても呼び出し側は気づけません。const correctnessが守られたコードでは、シグネチャだけで読み書きの契約が分かり、違反はコンパイル時に検出されます。

```cpp
// constがないコードの事故例
int CalcDamage(Enemy& target, const AttackData& atk) {
    target.hp -= 1;   // 「計算するだけ」のはずの関数が、こっそり状態を変えていた
    return ...;       // → constで書いていればこの行はコンパイルエラーだった
}
```

## const correctnessは「伝染」する

const参照で受けたオブジェクトからは、constメンバ関数しか呼べません。つまり**一部だけconstにすることはできず、コードベース全体の規律**になります。途中から導入すると連鎖的な修正(const化の波)が起きるため、**最初から書く**のが鉄則です。

### mutable(例外の明示)

論理的には「変更していない」が、実装上は書き換えたいメンバ(キャッシュ、統計カウンタ)には `mutable` を付けます。

```cpp
class Pathfinder {
public:
    float Distance(Vec2 a, Vec2 b) const {   // 論理的には読み取り
        if (auto it = cache_.find({a,b}); it != cache_.end()) return it->second;
        float d = Compute(a, b);
        cache_[{a,b}] = d;                   // mutableなので constでも書ける
        return d;
    }
private:
    mutable std::map<std::pair<Vec2,Vec2>, float> cache_;   // 「外から見えない変更」の明示
};
```

## C#との違い

- C#の `const` はコンパイル時定数のみ、`readonly` はフィールドの再代入禁止のみ。**「このメソッドはthisを変更しない」「この引数を変更しない」を表す手段がC#にはほぼない**(`in`引数、`readonly struct` が部分的に対応)
- つまりC++のconstはC#より遥かに強力な契約システム。C#の感覚で「constは定数のことでしょ」と思っていると、C++のconstメンバ関数・const参照の意味を取り違えます

## Unity開発者が誤解しやすい点

1. 「constを付け忘れてもエラーにならないから不要」— 逆で、**付けないと後から付けられなくなる**(伝染性のため)。新規コードでは機械的に付ける習慣が正解
2. `const std::string& name` を「読み取り専用の最適化テク」とだけ理解 — 最適化(コピー回避)と契約(変更しない)の**両方**の意味がある
3. constは実行時コストゼロ(コンパイル時だけの検査)——「constで遅くなる?」という心配は不要

## メモリ上で起きること

- `const` 自体は基本的に**実行時の何も変えない**(型検査のみ)。ただし `constexpr` 定数や文字列リテラルは読み取り専用領域(.rodata)に置かれることがある(→ [メモリレイアウト](/runtime/cpp-internals/memory-layout.html))
- 読み取り専用ページへの書き込み(const_castで無理やり書く等)はOSレベルのアクセス違反または未定義動作

## ゲーム開発での使用例

- 描画・UI・AIの「読むだけ」系関数はすべて `const Enemy&` を取る — 「描画がゲーム状態を変えてしまう」バグを型で根絶
- 設定データ・マスタデータは `const` 参照で配る([Type Object](/game/patterns/type-object-and-sandbox.html)の共有データは不変が原則)
- `Hp() const` のようなgetterのconst付けは無条件の習慣にする

## 使う場面 / 使わない場面

- **使う場面**: 原則すべて。「変更しないものにはconst」を機械的に
- **使わない(付けられない)場面**: 値渡し引数のconst(`void f(const int x)`)は呼び出し側に意味がなく省略が普通。ムーブして渡すもの(→ [ムーブ](/languages/cpp/ctor-dtor-copy-move.html))はconstにできない(constからはムーブできずコピーになる)

## よくある誤解

- 「constは絶対に変更されない保証」— `mutable` メンバと、参照先が別経路から変更される場合(const参照は「自分からは変更しない」だけで「誰も変更しない」ではない)がある
- 「const_castで外せばいい」— 本当にconstなオブジェクトへの書き込みは未定義動作。const_castの正当な用途はレガシーAPI境界などごく僅か(→ [キャスト](/languages/cpp/casts.html))

## 関連項目

- [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html) / [キャスト](/languages/cpp/casts.html)
- [constexpr(コンパイル時定数)](/languages/cpp/auto-and-constexpr.html)

## 理解度チェック

1. constが「ドキュメントより強い」のはなぜですか。
2. `const int*` と `int* const` の違いは?
3. mutableの正当な使い道を1つ挙げてください。

## 演習

samples/values_and_refs.cpp の関数群にconstを可能な限り付けてください。「付けられない関数」が見つかったら、それは本当に変更が必要なのか(設計の問題ではないか)を検討してください。

---

前: [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html) | [カテゴリ目次](/languages/cpp/) | 次: [配列と文字列](/languages/cpp/arrays-and-strings.html)
