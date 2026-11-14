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

C++のオブジェクトの生成、コピー、ムーブ、破棄には、6つの特殊メンバ関数が関わります。暗黙に宣言される関数と、それを実際に使えるかどうかは、クラスの宣言やメンバの型によって決まります。メモリやファイルを直接所有する型では、解放・複製・所有権移転の方針を決め、必要な関数を定義するか `= delete` で禁止します。どの関数を見直すかの目安が Rule of Zero/Three/Five です。

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
//                                  a: [nullptr](この例の所有型では空にする)
```

```cpp
std::vector<int> MakeLevel() {
    std::vector<int> tiles(1'000'000);
    return tiles;      // ムーブ(またはコピー省略)— 100万要素の複製は起きない
}
std::vector<int> v = MakeLevel();   // 安い
```

- `std::move(x)` は `x` を右辺値として扱えるようにするキャスト。所有権が移るか、コピーされるかは、選ばれたコンストラクタや代入演算子の実装で決まる。
- 標準ライブラリ型のムーブ元は、別の指定がなければ「有効だが未規定の状態」。例えば `std::vector` の `empty()` は呼べる。`front()` を呼べるのは `empty()` が `false` のとき。独自の型では、ムーブ後に何ができるかをその型の契約で決める。[C++20作業草案 N4861: ムーブ後の状態](https://timsong-cpp.github.io/cppwp/n4861/lib.types.movedfrom)・[有効だが未規定の状態](https://timsong-cpp.github.io/cppwp/n4861/defns.valid)
- 例外を送出しないことを保証できるムーブには `noexcept` を付けられる。ムーブが例外を投げ得る場合、`vector` の再確保では例外保証を保つためにコピーが使われることがある。

## Rule of Zero / Three / Five

| 規則 | 内容 |
|---|---|
| **Rule of Zero** | リソースは`std::vector`や[`unique_ptr`](/languages/cpp/smart-pointers.html)などの部品に持たせ、**自分では6つを一切書かない**。部品の特殊メンバ関数が全部やってくれる。**現代C++の既定方針** |
| **Rule of Three** | デストラクタ・コピーコンストラクタ・コピー代入のどれかを独自に定義するなら、残りも型の契約に合うか見直す。例えば生ポインタを所有する型のメンバごとのコピーは、所有権まで複製して二重解放を招く |
| **Rule of Five** | Three に加えてムーブ構築とムーブ代入も見直す。その型で許したい操作は実装または `= default` で宣言し、禁止したい操作は `= delete` で示す |

例えばムーブコンストラクタをユーザー宣言すると、暗黙のコピーコンストラクタとコピー代入は削除され、ムーブ代入は暗黙に宣言されません。コンストラクタと代入は別の操作です。[C++20作業草案 N4861: コピー・ムーブ構築](https://timsong-cpp.github.io/cppwp/n4861/class.copy.ctor)・[コピー・ムーブ代入](https://timsong-cpp.github.io/cppwp/n4861/class.copy.assign)・[CRTP の計数 mixin の例](/languages/cpp/crtp.html)

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

Rule of Three/Five を検討する典型例は、OSハンドル・生メモリ・Cライブラリのリソースを直接包む型です。生メモリを所有する例では、コピーで内容を複製し、ムーブで所有権を移します。<a href="/study/samples/cpp/rule_of_five.cpp">実行例のソース</a>

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

- C# の代入は、`class` なら参照を、`struct` なら値をコピーします。構造体に参照型のフィールドがあれば、その参照がコピーされます。`record class` のコピーコンストラクタは `with` 式で使われ、通常の代入では呼ばれません。[Microsoft: C# 言語仕様の record class](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes#151644-copy-and-clone-members)
- デストラクタ(ファイナライザ)はC#では「いつ呼ばれるか不明・呼ばれないかも」。C++は決定的。C#の`Dispose`/`using`がC++のデストラクタ/RAIIに対応(→ [デストラクタと Dispose / RAII と using](/languages/csharp/destructor-dispose-raii-using.html))

## Unity開発者が誤解しやすい点

1. この `Buffer` 例で `b = a` が呼ぶコピー代入は、所有する配列を複製します。共有所有するポインタをメンバに持つ型など、コピー代入の内容は型ごとに異なります。
2. `std::move` でムーブ構築を要求できる形にしても、呼び出せるムーブコンストラクタがなければ、コピーが選ばれるかコンパイルエラーになります。生配列メンバを持つこと自体はムーブの暗黙宣言を妨げません。C++20 で `return std::move(local);` と書くと、`return local;` が対象になり得た名前付き戻り値のコピー省略（NRVO）の対象から外れます。[C++20作業草案 N4861: コピー・ムーブ構築](https://timsong-cpp.github.io/cppwp/n4861/class.copy.ctor)・[コピー省略](https://timsong-cpp.github.io/cppwp/n4861/class.copy.elision)
3. デストラクタに「たぶん呼ばれる」感覚を持ち込まない——C++では**呼ばれないケース(newしてdeleteし忘れ)が即リーク**

## ゲーム開発での使用例

- アセット(テクスチャ、サウンド)のハンドルクラス: コピー禁止+ムーブ可(所有権1つを型で保証)
- レベルデータの受け渡し: 戻り値ムーブで大構造を無コピーで返す
- フレーム処理での不要な一時コピーの除去(プロファイルで「コピーコンストラクタが上位に出る」のは頻出の発見)

## 使う場面 / 使わない場面

- **Rule of Zero を守る**: 通常のゲームロジッククラスすべて
- **Five を検討する**: 生リソースの所有や、生存数の計数など、構築・代入・破棄に型独自の規則がある場合
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

<a href="/study/samples/cpp/rule_of_five.cpp">生メモリを持つ <code>Buffer</code> の実行例</a>で、コピーとムーブのログを観察してください。`b = MakeBig();` は既存の `b` へのムーブ代入です。`MakeBig` の中で NRVO が行われると戻り値を作るムーブ構築のログは省かれます。NRVO を無効にしたビルドと比べると、構築と代入の違いを確認できます。

---

関連項目：[構造体・クラス・アクセス指定子](/languages/cpp/structs-and-classes.html) / [学習ガイド](/languages/cpp/) / [RAII](/languages/cpp/raii.html)
