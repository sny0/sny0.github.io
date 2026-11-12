---
title: 構造体・クラス・アクセス指定子
study:
  source: C++ Wiki
  status: published
  summary: C++のstructとclassはほぼ同じ機能を持ち、既定のアクセスはstructがpublic、classがprivateです。C#での違いと、C++での慣習的な使い分けも扱います。
  section: reference
  format: article
  domain: languages
---

# 構造体・クラス・アクセス指定子

## 一言で言うと

C++の `struct` と `class` は**ほぼ同一の機能**で、違いは既定のアクセスだけ(struct=public、class=private)。C#のような「struct=値型、class=参照型」という**意味の違いはありません**(どちらも値です)。使い分けは**慣習**で表現します: 「structはただのデータ、classは不変条件を持つもの」。

## 基本とアクセス指定子

```cpp
// C++20
struct Vec2 {              // struct: 全メンバ公開が既定
    float x = 0, y = 0;    // ただのデータの束。隠すものがない
};

class Health {             // class: 非公開が既定
public:                    // ここから公開
    void TakeDamage(int d) {
        hp_ = std::max(0, hp_ - std::max(0, d));   // 不変条件: hpは0..max_の範囲
    }
    int Value() const { return hp_; }
protected:                 // 派生クラスまで公開
    // (継承させる設計のときだけ使う)
private:                   // このクラスの中だけ
    int hp_ = 100;         // 直接触らせない=不変条件を守る手段
    int max_ = 100;
};
```

- `public` / `protected` / `private` は何度でも書け、順序も自由
- アクセス制御は**クラス単位**であり、**同じクラスの別インスタンスのprivateには触れる**(コピーコンストラクタが `other.hp_` を読めるのはこのため)。C#と同じ仕様

## 使い分けの慣習(重要)

| | struct を選ぶ | class を選ぶ |
|---|---|---|
| データ | 全部publicで問題ない「値の束」 | 守るべき**不変条件**がある |
| 例 | Vec2, Color, DamageInfo, 設定Desc | Health(0..max), Inventory(整合性), FSM(遷移規則) |
| メソッド | あってもよい(Length()等の純関数) | 状態を守る操作が主役 |

判定基準: 「**任意のメンバに任意の値を入れられて、壊れるか?**」壊れるならclass+private、壊れないならstruct+public([情報隠蔽](/design/foundations/abstraction-encapsulation.html)の判断そのもの)。全フィールドにgetter/setterを生やすくらいなら、それはstructでよいサインです(→ [構造体かクラスか](/design/decisions/cpp-choices.html))。

## メモリ上で起きること

```cpp
struct Enemy {
    int hp;        // オフセット0(4バイト)
    float speed;   // オフセット4(4バイト)
    bool alive;    // オフセット8(1バイト)
};                 // sizeof(Enemy) == 12(パディング3バイトが末尾に入る — 典型的な実装)
```

- 非ゼロサイズの非静的データメンバーの順序は、C++20までは同じアクセス制御を持つ範囲で保証され、C++23以降はアクセス指定をまたいでも宣言順が保証される。unionやゼロサイズになり得るメンバーなどは別の規則を確認する。[C++草案: メンバー配置](https://eel.is/c++draft/class.mem.general)
- アラインメントを満たすためにパディングが入る(→ 詳細: [メモリレイアウト](/runtime/cpp-internals/memory-layout.html))。メンバの並び順で構造体のサイズが変わるため、大量に保持する構造体ではメンバをサイズの大きい順に並べる最適化がある
- メソッドは**インスタンスの中には存在しない**(コードは1か所、thisポインタが渡るだけ)。仮想関数を持つと**vptr(8バイト)が追加**される(→ [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))

## C#との違い

| | C# | C++ |
|---|---|---|
| struct/class | 値型/参照型という**意味の違い** | 既定アクセスの違いのみ(両方値) |
| 割り当て | classは参照型。通常はGCヒープ上で管理するが、JITが割り当てを除去・スタック化する場合もある | どちらも自動/動的/静的記憶域などを選べる |
| 継承 | structは継承不可 | structも継承可(機能差なし) |
| 型やメンバーの公開範囲 | `internal` は型やメンバーへのアクセスを原則として同じアセンブリ内に制限する | C++20以降の名前付きモジュールでは `export` する宣言を選び、モジュールの外に公開する名前を絞れる |

C#の `internal` は型やメンバーに付けるアクセス修飾子です。C++20の名前付きモジュールを外部のコードが `import` すると、`export` で公開した名前が名前探索の対象になります。ヘッダー方式では、非公開ヘッダーでライブラリの公開APIを絞り、無名namespaceで名前のリンケージを翻訳単位内に限定できます。[C#のinternal](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/internal) · [C++20草案のモジュール公開宣言](https://timsong-cpp.github.io/cppwp/n4861/module.interface) · [ヘッダー分割と Assembly Definition](/languages/csharp/headers-vs-asmdef.html)

C#の値型・参照型の意味と、実際の格納先は別です。.NETのエスケープ解析による最適化はランタイムやコードの形に依存し、Unityのすべての実行環境で同じになるとは限りません。[.NET 10のスタック割り当て](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/runtime)

C#の「structは16バイト以下にすべき」的なガイドラインは、**値渡しコピーのコスト**の話であり、C++でも値渡しするなら同じ配慮をします(大きければconst参照 → [値渡しか参照渡しか](/design/decisions/cpp-choices.html))。

## Unity開発者が誤解しやすい点

1. 「structだから値、classだから参照」の感覚を**C++に持ち込むと混乱**する。C++ではどちらも値で、参照にしたければ`&`や`*`を自分で書く
2. C#のプロパティ(`public int Hp { get; private set; }`)に相当する言語機能はC++にない。関数(`int Hp() const`)で書く
3. Unityの `[SerializeField] private` のような「エディタには見せるがコードには隠す」という区別はC++単体には存在しない(UEでは`UPROPERTY`が同じ役割 → [リフレクション — UCLASS・UFUNCTION・UPROPERTY・Unreal Header Tool](/game/unreal/reflection-and-uht.html))

## ゲーム開発での使用例

- **structの典型**: `Vec3`, `Quat`, `Color`, `HitInfo{position, normal, damage}`(関数間で値を運ぶ)、[Builder](/design/patterns/builder.html)のDesc構造体、[ECS](/game/patterns/component-and-ecs.html)のComponent(データのみが原則)
- **classの典型**: `Inventory`(個数の整合性)、`StateMachine`(遷移規則)、`ResourceHandle`(解放の保証 → [RAII](/languages/cpp/raii.html))

## 使う場面 / 使わない場面

- 「とりあえず全部class+getter/setter」は**C#の癖**。C++では公開データのstructが読みやすく速い(最適化も効きやすい)場面が多い
- 逆に「不変条件があるのにstruct公開」は、全利用箇所が規約を守る前提のコードになり崩壊する(→ [カプセル化](/design/foundations/abstraction-encapsulation.html))

## よくある誤解

- structとclassでは、生成されるコードは同じです。どちらの構文を使うかで処理の重さは変わりません。
- 「privateはセキュリティ機能」— コンパイル時の設計規律であり、メモリを覗けば読める。チート対策とは別の話

## 関連項目

- [抽象化・カプセル化・情報隠蔽](/design/foundations/abstraction-encapsulation.html)
- [コンストラクタ・デストラクタ](/languages/cpp/ctor-dtor-copy-move.html) / [メモリレイアウト](/runtime/cpp-internals/memory-layout.html)
- [判断ガイド: 構造体かクラスか](/design/decisions/cpp-choices.html)

## 理解度チェック

1. C++のstructとclassの言語仕様上の違いは何ですか(1つだけ)。
2. struct/classの使い分けの実務的判定基準は?
3. メソッドを追加するとインスタンスのサイズは増えますか。仮想関数では?

## 演習

samples/struct_layout.cpp(検証済み)で、メンバの並び順を変えると `sizeof` がどう変わるか観察してください(int, bool, double を持つ構造体で並び替え実験)。

---

関連項目：[配列と文字列](/languages/cpp/arrays-and-strings.html) / [学習ガイド](/languages/cpp/) / [コンストラクタ・デストラクタ・コピー・ムーブ](/languages/cpp/ctor-dtor-copy-move.html)
