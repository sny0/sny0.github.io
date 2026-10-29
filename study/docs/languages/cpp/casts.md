---
title: "キャスト"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "型変換を意図別の4種類のキャストで明示するのがC++流です。C形式キャスト (int)x は「4種類のどれか(最悪の組み合わせ)を黙って選ぶ」ため、検索もレビューもできない危険な省略記法として原則使いません。"
---

# キャスト

## 一言で言うと

型変換を**意図別の4種類のキャスト**で明示するのがC++流です。C形式キャスト `(int)x` は「4種類のどれか(最悪の組み合わせ)を黙って選ぶ」ため、**検索もレビューもできない危険な省略記法**として原則使いません。

## 4種類のキャスト

### static_cast(意味の分かっている変換)

```cpp
// C++20
float ratio = static_cast<float>(hp) / maxHp;    // int→float(整数除算バグの防止)
int damage = static_cast<int>(rawDamage * mult); // float→int(切り捨てを明示)
Derived* d = static_cast<Derived*>(basePtr);     // ダウンキャスト(※本当にDerivedだと分かっている時のみ。
                                                 //   間違っていれば未定義動作 — 検査はしない)
```

日常の95%はこれ。コンパイル時に妥当性が検査できる変換(数値変換、継承関係のポインタ変換、明示的コンストラクタ呼び出し)。

### dynamic_cast(実行時に検査するダウンキャスト)

```cpp
if (auto* boss = dynamic_cast<BossEnemy*>(enemy)) {   // 失敗ならnullptr(参照版は例外)
    boss->EnterRageMode();
}
```

- [RTTI](/runtime/cpp-internals/exceptions-and-rtti-impl.html)(実行時型情報)を使って安全に検査。**仮想関数を持つ型にのみ使える**
- コストあり(型情報の照合。継承階層を辿る)。RTTI自体を無効化するプロジェクトもある(UEは独自のCast&lt;>を使う → [第10部](/game/unreal/uobject-actor-component.html))
- **設計のサイン**: dynamic_castの連鎖は「基底のインターフェース不足」の症状([LSP](/design/solid/lsp.html)、[Visitor](/design/patterns/visitor.html)参照)。ただし単発の「能力問い合わせ」(`IDamageable`への横キャスト)は実用的な妥協

### const_cast(constの除去)

```cpp
void LegacyApi(char* s);                       // constを知らない古いC API
const std::string name = "player";
LegacyApi(const_cast<char*>(name.c_str()));    // APIが書き換えないと確信できる時のみ
```

**本当にconstなオブジェクトを書き換えたら未定義動作**。正当な用途はレガシーAPI境界くらい。自分のコードでconst_castが必要になったら、まずconst設計の誤りを疑う(→ [const correctness](/languages/cpp/const-correctness.html))。

### reinterpret_cast(ビットの読み替え)

```cpp
std::uintptr_t addr = reinterpret_cast<std::uintptr_t>(ptr);   // ポインタ⇔整数
auto* bytes = reinterpret_cast<const std::byte*>(&header);     // バイト列として見る(シリアライズ)
```

「このメモリを別の型として見なす」最も危険なキャスト。**型の実際の読み替え(type punning)は多くの場合未定義動作**(strict aliasing規則)で、正しくは `std::memcpy` や C++20の `std::bit_cast` を使います。用途はバイナリI/O、ハードウェア境界などの低レベル層のみ。

## C形式キャストを使わない理由

```cpp
(TargetType)expr;   // static_cast → const_cast → reinterpret_cast の順で「通るもの」を勝手に選ぶ
```

- 意図が読めない(数値変換のつもりがポインタ再解釈になっても通る)
- `grep "_cast"` で危険箇所を検索できるのがC++流キャストの利点。C形式はそれを壊す

## 暗黙変換にも注意

```cpp
int a = 7, b = 2;
float r = a / b;          // 3.0f!(int除算が先。頻出バグ)
float r2 = static_cast<float>(a) / b;   // 3.5f

void TakeDamage(int amount);
TakeDamage(3.7f);         // 3に切り捨てられて黙って通る(コンパイラ警告レベルを上げて検出)
```

`explicit` コンストラクタ(1引数コンストラクタに必須の習慣)や enum class は、暗黙変換を塞ぐための道具です。

## C#との違い

| | C# | C++ |
|---|---|---|
| ダウンキャスト | `(Boss)e` は失敗で例外、`as`はnull | static_castは**無検査**(失敗=未定義動作)、dynamic_castが検査版 |
| is / as | 言語組み込み | dynamic_cast+nullチェックが相当 |
| 数値変換 | 縮小変換はコンパイルエラー(明示要求) | intへのfloat代入は警告どまり(通ってしまう) |
| ビット再解釈 | unsafe/BitConverter等に隔離 | reinterpret_cast(規則を知らないとUB) |

**C#の `(Boss)e` の感覚でC++の static_cast ダウンキャストを使うのが最危険ポイント**: C#は間違えば例外で止まるが、C++は静かに壊れます。確信がなければ dynamic_cast(または設計の見直し)。

## Unity開発者が誤解しやすい点

1. `GetComponent<T>` の感覚(失敗すればnull)に対応するのは dynamic_cast。static_castは「失敗」という概念すらない
2. 数値の切り捨て・整数除算はUnityのC#でも起きるが、C++は警告レベルを上げないと沈黙する箇所が多い(→ [警告レベル](/tools/build/debugging-and-analysis.html))
3. 「キャストが多いコードは設計が古い」— C++でも同じ。ポリモーフィズム・テンプレート・variantで型分岐を減らすのが先

## ゲーム開発での使用例

- 数値計算の型合わせ(int⇔float): static_cast
- 「この敵はボスか?」の能力問い合わせ: dynamic_cast(または自前の型ID/UEのCast&lt;>)
- バイナリセーブデータの読み書き: memcpy/bit_cast(reinterpret_castの直接デリファレンスは避ける)
- エンジン境界のハンドル⇔ポインタ変換: reinterpret_cast(隔離された低レベル層で)

## 使う場面 / 使わない場面(まとめ)

- static_cast: 日常。ただしダウンキャストは「確信がある」ときのみ
- dynamic_cast: 実行時検査が必要なとき。連鎖したら設計を疑う
- const_cast / reinterpret_cast: 境界層のみ。ゲームロジックに現れたらレビューで止める
- C形式: 使わない

## 理解度チェック

1. static_castとdynamic_castのダウンキャストの違い(検査の有無と失敗時の挙動)は?
2. C形式キャストが危険な理由を2つ挙げてください。
3. 「dynamic_castの連鎖」は何のサインですか。

## 演習

samples/casts_demo.cpp(検証済み)で、(a) int除算の罠、(b) dynamic_castの成功/失敗、(c) static_castダウンキャストの「検査されなさ」(誤った型でも通ること — 実行はしない)を確認してください。

---

前: [static・inline・friend](/languages/cpp/static-inline-friend.html) | [カテゴリ目次](/languages/cpp/) | 次: [スマートポインタ](/languages/cpp/smart-pointers.html)
