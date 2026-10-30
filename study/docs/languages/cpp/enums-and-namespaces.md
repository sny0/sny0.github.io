---
title: enum・enum class・namespace
study:
  source: C++ Wiki
  status: published
  summary: 列挙型は「名前付きの整数定数の集合」。C++には旧式の enum(スコープなし)と、C++11以降の enum class(スコープ付き) があり、新規コードは enum class 一択です。
  section: reference
  format: article
  domain: languages
---

# enum・enum class・namespace

## enum と enum class

### 一言で言うと

列挙型は「名前付きの整数定数の集合」。C++には旧式の `enum`(スコープなし)と、C++11以降の **`enum class`(スコープ付き)** があり、**新規コードは enum class 一択**です。

```cpp
// C++20
enum Color { Red, Green, Blue };            // 旧式: 名前が外に漏れる、intに暗黙変換
enum class Element { Fire, Water, Wind };   // 推奨: スコープ付き・暗黙変換なし

int x = Red;                    // 通ってしまう(旧式の問題)
// int y = Element::Fire;       // エラー(良いこと)
int z = static_cast<int>(Element::Fire);   // 変換は明示的に

enum class ItemId : std::uint16_t { None = 0, Potion = 1 };   // 基底型の指定(サイズ制御)
```

### 旧enumの問題(enum classが直したもの)

1. **名前汚染**: `Red` がスコープに直接漏れ、他のenumや変数と衝突(`enum Fruit { Apple, Orange }` と `enum Company { Apple }` は共存不可)
2. **暗黙のint変換**: `if (color == 2)` や `Color c = (Color)999;` 的な整数との混同がすり抜ける
3. サイズ未指定(実装依存の基底型)

### switchとenumの実務パターン

```cpp
Element e = GetElement();
switch (e) {
    case Element::Fire:  /* ... */ break;
    case Element::Water: /* ... */ break;
    case Element::Wind:  /* ... */ break;
    // caseを書き漏らすと -Wall で警告(defaultを書かないことで網羅検査を活かすテクニック)
}
```

**defaultを書かない**ことで「列挙子を増やしたのにswitchを直し忘れた」をコンパイラ警告で検出できます(増え続けるswitchは[OCP](/design/solid/ocp.html)の観点も参照)。

### C#との違い / Unity開発者の注意

- C#のenumは常にスコープ付き(`Element.Fire`)で、C++の`enum class`相当。旧enumの罠はC#経験者には逆に新鮮な事故
- C#はenumに拡張メソッドを書けるがC++は不可(自由関数で代用)
- **フラグ**: C#の`[Flags]`相当はC++では演算子を自分で定義するか整数で扱う(enum classはビット演算も明示キャストが必要)
- シリアライズ済みのenum値(セーブデータ)は**番号を変えると壊れる**——明示的に番号を振り、削除しても番号を再利用しない(これはC#/Unityでも同じ)

### メモリ上

enumは実行時にはただの整数(既定はint、指定すればその型)。文字列変換テーブルは存在しない(C#の`ToString()`のようなリフレクションはない → 自分でテーブルを書くか、コード生成。UEはリフレクションで持っている → [リフレクション — UCLASS・UFUNCTION・UPROPERTY・Unreal Header Tool](/game/unreal/reflection-and-uht.html))。

## namespace

### 一言で言うと

名前の衝突を防ぐ「名字」。C#の`namespace`とほぼ同じ概念ですが、**C++はアセンブリ境界がない**ため、名前空間が唯一の論理的な区分けです。

```cpp
// C++20
namespace game::combat {              // C++17から入れ子を一気に書ける
    struct DamageInfo { int amount = 0; };
    int Calc(const DamageInfo& info);
}

game::combat::DamageInfo d{10};       // 完全修飾
using game::combat::DamageInfo;       // この名前だけ取り込む(OK)
namespace gc = game::combat;          // 別名(長い名前空間の短縮)
```

### using namespace の規律

```cpp
// using namespace std;   // 本Wikiでは原則禁止(理由: stdの数千の名前が全部流れ込み、
                          // 自作のmax, countなどと衝突・意図しないオーバーロード解決を招く)
// 特にヘッダーファイルでのusing namespaceは、include した全員を汚染するため厳禁
```

- 関数スコープ内での限定的な `using namespace std::chrono_literals;`(リテラル用)などは許容されることが多い
- **無名namespace**: そのファイル(翻訳単位)内だけの内部実装を包む(→ [リンケージ](/runtime/cpp-internals/symbols-and-linkage.html)。C#のinternalの部分的な代用)

```cpp
namespace {                 // 無名namespace: 外部から見えない(内部リンケージ)
    int CalcSecret(int x) { return x * 2; }
}
```

### ゲーム開発での使用例

- ライブラリ・モジュールの区分け: `engine::render`, `game::quest`(→ 物理的な分割は[ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)で)
- サードパーティとの衝突回避(自作`Log`とSDKの`Log`)
- ADL(引数依存名前探索)という高度な仕組みが演算子オーバーロードと絡む(自作型の演算子は同じnamespaceに置く、とだけ覚えておけば実務は足りる)

### C#との違い

- C#のnamespaceはアセンブリと独立した論理名。C++も同様だが、**アクセス制御機能はない**(namespaceでprivateにはできない。それは無名namespaceやモジュールの仕事)
- C#の`using`ディレクティブ相当が`using namespace`、`using X = Y`相当が別名宣言

## 使う場面 / 使わない場面

- enum class: 種類・状態・IDなど「有限の選択肢」全般。**intの引数が2つ並ぶAPI**(`Attack(int,int)` — どっちがダメージ?)を強い型で直すのにも有効
- namespace: ライブラリ境界・機能グループ。**小規模な単一ゲームで過剰に深い階層は不要**(`mygame::` 1段で十分なことが多い)

## 理解度チェック

1. enum classが旧enumから直した2つの問題は?
2. ヘッダーで `using namespace` が厳禁である理由は?
3. 無名namespaceは何のためにありますか。

## 演習

samples/enums_namespaces.cpp(検証済み)で、(a) enum classのswitch網羅警告(列挙子を増やしてビルド)、(b) 無名namespaceの関数が他の翻訳単位から見えないこと(リンクエラーの観察)を試してください。

---

関連項目：[ラムダ式・関数ポインタ・std::function](/languages/cpp/lambdas-and-functions.html) / [学習ガイド](/languages/cpp/) / [例外](/languages/cpp/exceptions.html)
