---
title: 値型と参照・ポインタ・参照
study:
  source: C++ Wiki
  status: published
  summary: "C++の変数は既定で値そのもの(代入=中身のコピー)。他の場所にあるものを指したいときだけ、ポインタ(T*: アドレスを入れる変数)か参照(T&: 既存の変数の別名)で明示します。C#の「class=参照型、struct=値型」という型ごとの区別はC++にはなく、使う側がその都度選びます。"
  section: reference
  format: article
  domain: languages
---

# 値型と参照・ポインタ・参照

## 一言で言うと

C++の変数は**既定で値そのもの**(代入=中身のコピー)。他の場所にあるものを指したいときだけ、**ポインタ**(`T*`: アドレスを入れる変数)か**参照**(`T&`: 既存の変数の別名)で明示します。C#の「class=参照型、struct=値型」という**型ごとの区別はC++にはなく**、使う側がその都度選びます。

## C#との違い(まずここから)

```csharp
// C#: classは参照型 — 代入は「同じ実体を指す」
var a = new Enemy { hp = 100 };
var b = a;          // bとaは同一実体
b.hp = 50;          // a.hpも50
```

```cpp
// C++20: 既定は値 — 代入はコピー
struct Enemy { int hp = 100; };
Enemy a{};
Enemy b = a;        // bはaの完全な複製(別実体)
b.hp = 50;          // a.hpは100のまま

Enemy& r = a;       // 参照: aの別名(コピーではない)
r.hp = 30;          // a.hpが30になる

Enemy* p = &a;      // ポインタ: aのアドレスを保持
p->hp = 10;         // a.hpが10になる
```

検証済みサンプル: <a href="/study/samples/cpp/values_and_refs.cpp">samples/values_and_refs.cpp</a>

## メモリ上で起きること

```
Enemy a;        スタック上に4バイト(int hp)の実体
Enemy b = a;    スタック上に別の4バイトを確保し、中身をコピー
Enemy& r = a;   新しいメモリは(概念上)なし。「a」の別名(実装上はアドレスで実現されるが、言語上は同一物)
Enemy* p = &a;  スタック上に8バイト(64bit環境のアドレス)を確保し、aの番地を格納

  スタック
  ┌─────────┐
  │ a: hp=10 │←──┐
  │ b: hp=50 │    │
  │ p: 0x7ffe...│─┘(aの番地)
  └─────────┘
```

C#の`new Enemy()`は管理ヒープに実体+変数はその参照、という**常に1段間接**の世界。C++は間接をゼロ段(値)にも1段(ポインタ)にも自分で選べます。この選択がキャッシュ効率を決めます(→ [Data Locality](/game/patterns/optimization-patterns.html))。

## ポインタと参照の使い分け

| | 参照 `T&` | ポインタ `T*` |
|---|---|---|
| null | 不可(必ず有効な対象を指す) | 可(`nullptr`) |
| 差し替え | 不可(初期化後は同じ対象) | 可(別の対象を指し直せる) |
| 演算 | 不可 | 可(配列の走査 `p+1`) |
| 使う場面 | 関数引数、必ず存在する相手 | 「無いかもしれない」相手、付け替える相手 |

**ガイドライン**: まず値 → 大きい/共有したいなら参照 → nullや差し替えが必要ならポインタ → 所有(delete責任)が絡むなら[スマートポインタ](/languages/cpp/smart-pointers.html)。

```cpp
// 関数引数の3形態(C++の日常)
void Heal(Enemy e);          // 値渡し: コピーが渡る。元は変わらない(小さい型向け)
void Heal(Enemy& e);         // 参照渡し: 本人が渡る。変更が呼び出し元に反映
void Heal(const Enemy& e);   // const参照: コピーなしで読むだけ(大きい型の読み取りの定石)
```

(→ 判断フロー: [値渡しか参照渡しか](/design/decisions/cpp-choices.html))

## Unity開発者が誤解しやすい点

1. **「structは遅い/classが普通」という感覚の逆転**: C#ではclassが既定ですが、C++では値(struct的な使い方)が既定で、ヒープ+ポインタは選んだときだけ。「とりあえずnewしてポインタで持つ」はC++ではJava/C#の書き癖であり、大抵は値でよい
2. **`Enemy b = a;` がコピーである**こと: C#の感覚で「同じ敵を指してるつもり」が、別の敵を作って片方だけ変更している——初学者バグの筆頭
3. **参照はC#の`ref`より広く使う**: C#の`ref`は特殊な機能ですが、C++の`const T&`は引数の基本形
4. **nullの怖さが桁違い**: C#のnull参照は例外(NullReferenceException)で止まるが、C++のnullptr参照外しは**未定義動作**(→ [18](/languages/cpp/undefined-behavior.html))。クラッシュすら保証されない

## ゲーム開発での使用例

- 座標・ベクトル・色は**値**(コピーが安く、共有すると事故る): `Vec3 pos = enemy.pos;`
- 「ターゲットの敵」は**ポインタ**(いない=nullptr、途中で切り替わる): `Enemy* target_;` — ただし相手が先に死ぬ問題(dangling)への対策が必要(→ [所有権と借用](/runtime/memory/ownership-and-borrowing.html))
- 大きなデータの読み取りは**const参照**: `int CalcDamage(const AttackData& atk, const DefenseData& def);`

## よくある誤解

- 「参照はポインタの安全版(同じもの)」— 役割が違います。参照は「別名」で、nullも差し替えもない**約束**を型で表現するもの
- 「ポインタは危険だから使わない」— 非所有の「見ているだけ」ポインタは現代C++でも普通に使います。危険なのは**所有権が曖昧な**生ポインタ(newしたものを生ポインタで持ち回る)です

## 使う場面 / 使わない場面(まとめ)

- 値: 既定。小さいデータ、コピーされて困らないもの
- 参照: 関数の入出力、確実に存在する相手への別名
- ポインタ: 任意(null)・付け替え・配列走査。所有はスマートポインタへ
- **使わない場面**: 「共有しているつもりのコピー」「コピーのつもりの共有」— どちらも意図を型で表現し損ねた状態。迷ったら「この関数は相手を変更するか? 相手は存在しないことがあるか?」で決める

## 関連項目

- [スマートポインタ](/languages/cpp/smart-pointers.html) / [所有権と借用](/runtime/memory/ownership-and-borrowing.html)
- [ポインタと参照型(C#対比の詳細)](/languages/csharp/pointers-references-value-semantics.html)
- [メモリレイアウト](/runtime/cpp-internals/memory-layout.html)

## 理解度チェック

1. `Enemy b = a;` のC#(class)とC++での意味の違いを説明できますか。
2. 参照とポインタの「型で表現される約束」の違いを2つ挙げてください。
3. 関数引数を `const T&` にする動機は?

## 演習

samples/values_and_refs.cpp を改造し、(a) 値渡し関数内での変更が呼び出し元に影響しないこと、(b) 参照渡しでは影響すること、(c) `sizeof(Enemy*)` と `sizeof(Enemy)` の違い、を出力で確認してください。

---

関連項目：[学習ガイド](/languages/cpp/) / [const と const correctness](/languages/cpp/const-correctness.html)
