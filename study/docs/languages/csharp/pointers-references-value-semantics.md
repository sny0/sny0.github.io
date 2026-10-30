---
title: ポインタと参照型 / 値セマンティクスと class・struct
study:
  source: C++ Wiki
  status: published
  summary: C#の「class/structの選択」に相当する判断を、C++では変数を書くたびに行う——これがC++習得の第一関門であり、同時に性能を制御できる自由の源です(→ 値と参照の基礎)。
  section: reference
  format: article
  domain: languages
---

# ポインタと参照型 / 値セマンティクスと class・struct

## 核心: 「型で決まる」C#、「使い方で決める」C++

```csharp
// C#: セマンティクスは型の宣言時に固定される
class EnemyC { public int hp; }    // 参照型: 代入=共有、ヒープ、GC管理
struct EnemyS { public int hp; }   // 値型: 代入=コピー、インライン配置
```

```cpp
// C++: 同じ型を、置き場所も渡し方もその都度選ぶ
Enemy e;                          // 値(スタック)
Enemy* p = &e;                    // ポインタで参照
Enemy& r = e;                     // 参照(別名)
auto u = std::make_unique<Enemy>(); // ヒープ+所有
std::vector<Enemy> v;             // 値の配列(連続メモリ)
std::vector<Enemy*> vp;           // 参照の配列
```

**C#の「class/structの選択」に相当する判断を、C++では変数を書くたびに行う**——これがC++習得の第一関門であり、同時に性能を制御できる自由の源です(→ [値と参照の基礎](/languages/cpp/values-pointers-references.html))。

## 対応表

| C#の書き方 | C++での近似 | 差分・注意 |
|---|---|---|
| `EnemyC a = b;`(class) | `Enemy& a = b;` or `Enemy* a = &b;` | C++の`Enemy a = b;`は**コピー**になる(最頻出の取り違え) |
| `EnemyS a = b;`(struct) | `Enemy a = b;` | ほぼ同じ(C++はコピーの中身を型が定義できる → [コピー](/languages/cpp/ctor-dtor-copy-move.html)) |
| `null` | `nullptr`(ポインタのみ) | C++の参照はnull不可。null許容はポインタ/optionalで表現 |
| `ref` 引数 | `T&` 引数 | C++では日常(C#より頻用) |
| `in` 引数 | `const T&` | 同上 |
| `out` 引数 | 戻り値 / `T&` / `std::optional` | C++は多値をstructやtupleで返す方が主流 |
| ボックス化(struct→object) | 対応物なし | C++には「値を参照型に包む」自動機構はない |

## null の扱いの違い(事故の質が違う)

- C#: null参照アクセスは **NullReferenceException**(その場で安全に停止、スタックトレース付き)
- C++: nullptr参照外しは**未定義動作**(→ [UB](/languages/cpp/undefined-behavior.html))。典型的にはアクセス違反で落ちるが、保証はない
- C++の**参照**は「nullがない世界」を型で作る道具: `void Heal(Enemy& e)` は「必ず実在の敵が来る」という契約。C# 8のnullable参照型(`Enemy?`)が目指した安全性を、C++は参照とポインタの使い分けで昔から表現していた、と対応づけると腑に落ちる

## 値セマンティクスの設計上の意味

C#では「基本class、パフォーマンスが要るときだけstruct」でした。C++は逆で「**基本は値、共有・多態が要るときだけポインタ**」:

- 値は**エイリアシングがない**(誰かが勝手に書き換える心配がない)→ 推論もテストも楽([不変性に近い安全](/design/foundations/abstraction-encapsulation.html))
- 値は**連続メモリに置ける**(→ [Data Locality](/game/patterns/optimization-patterns.html))
- 共有が必要な場面: 同一実体の観測(HPバーがPlayerのHPを見る)、多態(→ [仮想関数はポインタ/参照経由でだけ働く](/languages/cpp/inheritance-and-virtual.html)、値だとスライシング)

## Unity開発者の躓きポイント(重要順)

1. **「代入したのに反映されない」**: `Enemy target = enemies[0]; target.hp = 0;` — targetはコピー。`Enemy& target = enemies[0];` が意図(C#のstructで同じ罠を踏んだ経験があれば、その全面版と理解)
2. **「参照を保存したら壊れた」**: C#では参照保存は常に安全(GCが延命)。C++では[寿命](/runtime/memory/storage-duration-and-lifetime.html)・[イテレータ無効化](/languages/cpp/stl.html)を考える
3. **「とりあえずnewでヒープに」**: C#の癖。C++では値・スタックが既定(速く、安全で、自動解放)
4. Transformのような「エンジン内実体へのハンドル」感覚は、C++ではポインタ+所有権設計([所有権と借用](/runtime/memory/ownership-and-borrowing.html))で自作する側になる

## 理解度チェック

1. C#とC++で「セマンティクスが決まる場所」の違いを一言で言えますか。
2. `Enemy a = b;` の意味がC#(class)とC++で逆になる、とはどういうことですか。
3. C++の参照が表現する「契約」は何ですか。

## 演習

<a href="/study/samples/cpp/values_and_refs.cpp">samples/values_and_refs.cpp</a> を使い、C#経験者の同僚に「この1ファイルでC#との違いを説明する」つもりで、各行にC#ならどうなるかのコメントを付けてください。

---

関連項目：[デストラクタとDispose](/languages/csharp/destructor-dispose-raii-using.html) / [学習ガイド](/languages/csharp/) / [テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html)
