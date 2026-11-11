---
title: コンストラクタ・デストラクタ・コピー・ムーブ(Rule of Zero/Three/Five)
study:
  source: C++ Wiki
  status: published
  summary: C++のオブジェクトの生成、コピー、ムーブ、破棄には、6つの特殊メンバ関数が関わります。Rule of Zero/Three/Fiveを使い、これらの関数をどのようなときに定義するかを解説します。
  section: reference
  format: article
  domain: languages
---

# コンストラクタ・デストラクタ・コピー・ムーブ(Rule of Zero/Three/Five)

## 一言で言うと

C++のオブジェクトの生成、コピー、ムーブ、破棄には、6つの特殊メンバ関数が関わります。コンパイラがこれらの関数を自動生成しますが、メモリやファイルなどのリソースをクラスが直接持つときは、自分で書く必要があります。どの関数を定義するかの目安が Rule of Zero/Three/Five です。

## 6つの特殊メンバ関数

```cpp
// C++20
class Buffer {
public:
    Buffer();                              // 1. デフォルトコンストラクタ
    ~Buffer();                             // 2. デストラクタ
    Buffer(const Buffer& other);           // 3. コピーコンストラクタ
    Buffer& operator=(const Buffer&);      // 4. コピー代入
    Buffer(Buffer&& other) noexcept;       // 5. ムーブコンストラクタ
    Buffer& operator=(Buffer&&) noexcept;  // 6. ムーブ代入
};
```

### いつどれが呼ばれるか

```cpp
Buffer a;              // 1 (誕生)
Buffer b = a;          // 3 コピーコンストラクタ(aを手本に新規作成)
Buffer c = std::move(a); // 5 ムーブコンストラクタ(aの中身を奪って新規作成)
b = c;                 // 4 コピー代入(既存のbへ上書き)
b = std::move(c);      // 6 ムーブ代入
// スコープ終了時: 2 が生成の逆順で呼ばれる(c → b → a)
```

## デストラクタ: C++の要

自動記憶域のオブジェクトは、通常のスコープ終了や捕捉される例外によるスタック巻き戻しで自動的に破棄されます。破棄の時点が決まっているため、[RAII](/languages/cpp/raii.html)では破棄とリソース解放を結び付けられます。捕捉されない例外で終了する前に巻き戻すかは実装定義で、強制終了なども通常のスコープ終了とは異なります。[C++草案: 例外処理](https://eel.is/c++draft/except.handle)

```cpp
{
    Buffer buf;        // 誕生
    // ... returnや、外側でcatchされる例外による巻き戻しでも
}                      // ← bufを破棄して ~Buffer() を呼ぶ
```

## ムーブ: 「コピーの代わりに中身を奪う」

```cpp
// コピー: 中身を複製(高い)          ムーブ: 所有権の移転(安い)
// a: [ptr]→[10MB]                  a: [ptr]→[10MB]
// b: [ptr']→[10MBの複製]           b: [ptr]→[10MB](aから頂戴)
//                                  a: [nullptr](空になる。ただし有効な抜け殻)
```

```cpp
std::vector<int> MakeLevel() {
    std::vector<int> tiles(1'000'000);
    return tiles;      // ムーブ(またはコピー省略)— 100万要素の複製は起きない
}
std::vector<int> v = MakeLevel();   // 安い
```

- `std::move(x)` は**何も動かさない**。「xはもう使わないので奪ってよい」という**キャスト**(右辺値参照`&&`への変換)にすぎない。実際に奪うのはムーブコンストラクタ/代入
- ムーブ後のオブジェクトは「有効だが未規定の状態」。**再代入か破棄以外に使わない**
- ムーブは`noexcept`にする(vectorが再確保時にムーブを使う条件 → 例外設計と関わる)

## Rule of Zero / Three / Five

| 規則 | 内容 |
|---|---|
| **Rule of Zero** | リソースは`std::vector`や[`unique_ptr`](/languages/cpp/smart-pointers.html)などの部品に持たせ、**自分では6つを一切書かない**。部品の特殊メンバ関数が全部やってくれる。**現代C++の既定方針** |
| **Rule of Three** | デストラクタ・コピーコンストラクタ・コピー代入の**どれか1つでも自分で書くなら、3つ全部**書く(1つ必要ということは生のリソースを持っている証拠で、残り2つの自動生成は浅いコピーで壊れる) |
| **Rule of Five** | Threeに加え、ムーブ2つも書く(書かないとムーブがコピーに退化し性能を失う) |

```cpp
// Rule of Zero の実例 — 何も書かないのが最善
class Level {
public:
    // コンストラクタもデストラクタも書かない。
    // コピー・ムーブはメンバ(vector, string, unique_ptr)が正しく処理する
private:
    std::string name_;
    std::vector<Tile> tiles_;
    std::unique_ptr<NavMesh> nav_;   // これがあるとコピーは自動で禁止される(unique_ptrがコピー不可のため)
};
```

Rule of Three/Fiveを書くのは、**OSハンドル・生メモリ・Cライブラリのリソースを直接包むラッパクラスを書くときだけ**です(検証済み例: <a href="/study/samples/cpp/rule_of_five.cpp">samples/rule_of_five.cpp</a>)。

### コピーの禁止

```cpp
class RenderTarget {
public:
    RenderTarget(const RenderTarget&) = delete;             // コピー禁止(=GPUリソースの二重解放防止)
    RenderTarget& operator=(const RenderTarget&) = delete;
    RenderTarget(RenderTarget&&) noexcept = default;        // ムーブは許可
    RenderTarget& operator=(RenderTarget&&) noexcept = default;
};
```

## C#との違い

- C#にコピーコンストラクタ・ムーブはない(classは参照の代入、structは常に浅いコピー)。**「代入の意味を型が定義する」**のはC++特有
- デストラクタ(ファイナライザ)はC#では「いつ呼ばれるか不明・呼ばれないかも」。C++は決定的。C#の`Dispose`/`using`がC++のデストラクタ/RAIIに対応(→ [デストラクタと Dispose / RAII と using](/languages/csharp/destructor-dispose-raii-using.html))

## Unity開発者が誤解しやすい点

1. C++の `b = a` はコピー代入関数を呼び出します。参照の共有を意味するわけではなく、10MBのクラスなら10MBを複製します。
2. `std::move` 自体はキャストです。ムーブコンストラクタがない型(生配列メンバ等)ではコピーのままです。また、`return` で戻り値に `std::move` を使うとコピー省略(RVO)を妨げます。
3. デストラクタに「たぶん呼ばれる」感覚を持ち込まない——C++では**呼ばれないケース(newしてdeleteし忘れ)が即リーク**

## ゲーム開発での使用例

- アセット(テクスチャ、サウンド)のハンドルクラス: コピー禁止+ムーブ可(所有権1つを型で保証)
- レベルデータの受け渡し: 戻り値ムーブで大構造を無コピーで返す
- フレーム処理での不要な一時コピーの除去(プロファイルで「コピーコンストラクタが上位に出る」のは頻出の発見)

## 使う場面 / 使わない場面

- **Rule of Zero を守る**: 通常のゲームロジッククラスすべて
- **Five を書く**: リソースラッパのみ
- **不要なデストラクタは宣言しない**: `~Foo() {}`だけでなく`~Foo() = default;`もユーザー宣言なので、暗黙のムーブ生成を抑止する。宣言が必要なら、コピーとムーブも`= default`・`= delete`・独自実装のどれにするか明示する。[ムーブの暗黙宣言の条件](https://eel.is/c++draft/class.copy.ctor)

## よくある誤解

- 「ムーブは常にポインタ付け替えで一瞬」— 型による。`std::array`は要素ごとのムーブで、`int`などならコピーと同等、`std::string`などなら各要素のムーブの性質に従う。
- 「デストラクタで例外を投げてよい」— 通常は外へ例外を出さない設計にする。非送出のデストラクタから例外が漏れれば、巻き戻し中でなくても`std::terminate`。`noexcept(false)`でも巻き戻し中に例外が漏れれば終了する。暗黙の例外指定は基底・メンバーのデストラクタにも依存する。[C++草案: 例外指定](https://eel.is/c++draft/except.spec)・[破棄と例外](https://eel.is/c++draft/except.ctor)

## 関連項目

- [RAII](/languages/cpp/raii.html) / [スマートポインタ](/languages/cpp/smart-pointers.html)
- [デストラクタとDispose(C#対比)](/languages/csharp/destructor-dispose-raii-using.html)
- [所有権と借用](/runtime/memory/ownership-and-borrowing.html)

## 理解度チェック

1. Rule of Zeroが「何もしないこと」を推奨できる理由は?
2. `std::move` が実際にやっていることは何ですか。
3. デストラクタだけ自分で書いたクラスのコピーが危険な理由は?(Rule of Threeの動機)

## 演習

samples/rule_of_five.cpp(生メモリを持つBufferクラス)で、(a) コピーとムーブそれぞれのログ出力を観察、(b) ムーブ関数を消すとreturnでコピーが走ることを確認してください。

---

関連項目：[構造体・クラス・アクセス指定子](/languages/cpp/structs-and-classes.html) / [学習ガイド](/languages/cpp/) / [RAII](/languages/cpp/raii.html)
