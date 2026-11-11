---
title: ラムダ式・関数ポインタ・std::function
study:
  source: C++ Wiki
  status: published
  summary: "「関数を値として持ち運ぶ」3つの手段です。 関数ポインタ void(*)(int): 関数のアドレス。状態を持てない。C言語から続く最軽量の形 ラムダ式 x{ return x+y; }: その場で作る無名の関数オブジェクト。変数をキャプチャ(捕獲)できる"
  section: reference
  format: article
  domain: languages
---

# ラムダ式・関数ポインタ・std::function

## 一言で言うと

「関数を値として持ち運ぶ」3つの手段です。

- **関数ポインタ** `void(*)(int)`: 関数のアドレス。**状態を持てない**。C言語から続く最軽量の形
- **ラムダ式** `[x](int y){ return x+y; }`: その場で作る無名の関数オブジェクト。**変数をキャプチャ(捕獲)できる**
- **std::function** `std::function<void(int)>`: コピー可能な呼び出し対象を**統一的に入れられる箱**。柔軟だがコストあり

C#ではdelegateが1つの言語機能でこの3つの役割を担います(→ 対比の詳細: [関数ポインタと delegate / Observer と event](/languages/csharp/delegates-events-function-pointers.html))。

## 関数ポインタ

```cpp
// C++20
int Add(int a, int b) { return a + b; }
int (*op)(int, int) = &Add;    // 関数のアドレスを変数に
op(2, 3);                      // 5

// 用途: C APIのコールバック、データ駆動のジャンプテーブル
```

状態(環境)を持てないため、「このボタンが押されたら**この画面を**閉じる」のような文脈付き処理には不向きです(C APIは`void* userData`引数で文脈を運ぶ伝統)。

## ラムダ式

```cpp
// C++20
int threshold = 50;

// [キャプチャ](引数){ 本体 }
auto isStrong = [threshold](const Enemy& e) { return e.attack > threshold; };

auto it = std::ranges::find_if(enemies, isStrong);   // アルゴリズムに渡す(最頻出用途)
```

### キャプチャの2形態と寿命の罠

```cpp
int hp = 100;
auto byValue = [hp]()  { return hp; };     // コピーを保持(安全。以後hpが変わっても影響なし)
auto byRef   = [&hp]() { return hp; };     // 参照を保持(軽いが、hpより長生きしたらdangling!)

// 危険例: ローカル変数を参照キャプチャしたラムダを、後で実行されるキューに積む
// queue.Push([&hp]{ ... });   // この関数を抜けた後に実行されたら未定義動作
// → 後で実行するなら[hp]などで必要な値と、その所有権を個別に確認する
```

メンバー関数内の`[=]`は、メンバーの値全体をコピーする指定ではありません。メンバーを使うために`this`ポインタを暗黙に捕捉し、対象の寿命を延ばしません（この暗黙捕捉はC++20で非推奨）。値のスナップショットなら`[hp = hp_]`、オブジェクト全体のコピーが適切ならC++17の`[*this]`などを使います。ポインタを値キャプチャしても、指す先の寿命までは保証されません。[C++草案: ラムダのキャプチャ](https://eel.is/c++draft/expr.prim.lambda.capture)

### 仕組み: ラムダの正体

ラムダは**コンパイラが生成する無名クラスのインスタンス**です。

```cpp
// [threshold](const Enemy& e){ return e.attack > threshold; } はおよそ以下と同じ:
struct __Lambda_1 {
    int threshold;                                  // キャプチャ=メンバ変数
    bool operator()(const Enemy& e) const { return e.attack > threshold; }
};
```

- キャプチャなしのラムダは関数ポインタに変換可能
- テンプレート(`find_if`等)に渡したラムダはインライン化されます。ポインタ経由の呼び出しは最適化しにくいため、関数ポインタを渡すより速いことが多くなります。
- サイズはキャプチャ量に比例。`sizeof`可能な普通のオブジェクト

## std::function

```cpp
// C++20
#include <functional>

std::function<void(int)> onDamage;               // 「int を受ける呼び出せる何か」の箱
onDamage = [](int d) { /* ラムダ */ };
onDamage = &FreeFunction;                        // 関数ポインタも
onDamage = std::bind_front(&Hud::Show, &hud);    // メンバ関数+インスタンスも

if (onDamage) onDamage(10);                      // 空チェック→呼び出し
```

### コスト(知っておくべき)

- **型消去**の仕組み上、呼び出しは間接呼び出し(仮想関数相当)。インライン化されない
- 大きいキャプチャのラムダを入れると**ヒープ確保**が起きうる(小さければSBO=内部バッファに収まる。閾値は実装依存)
- → 「コールバックを保存する」用途の標準解だが、**ホットループ内での呼び出しの塊**には向かない。その場合はテンプレート引数(`template <class F> void ForEach(F&& f)`)で受けるとインライン化される

## 3手段の使い分け

| 状況 | 選択 |
|---|---|
| アルゴリズム・即時実行に渡す | ラムダを直接(テンプレート引数で受ける) |
| コピー可能なコールバックを**保存**する([Observer](/design/patterns/observer.html)等) | `std::function`。参照・ポインタが指す先の寿命も管理する |
| `unique_ptr`を捕捉するなど、ムーブ専用のコールバックを保存 | C++23の`std::move_only_function` |
| 呼び出し期間だけ借り、保存しない関数ラッパー | C++26草案の`std::function_ref`（対象より長生きさせない） |
| C APIとの境界・データテーブル | 関数ポインタ |
| 性能が最優先の内側ループ | テンプレート+ラムダ(functionを避ける) |

## C#との違い

`std::function`の格納対象にはコピー可能性が必要です。C++26草案には、呼び出しのconst・参照・noexcept修飾も表せる`std::copyable_function`もあります。新しいラッパーは標準ライブラリの対応を確認して選びます。[C++草案: 関数ラッパー](https://eel.is/c++draft/func.wrap)

- C#のラムダは変数をクロージャクラスへ移すので、外側からの変更がラムダにも反映されます。C++では値キャプチャと参照キャプチャを選びます。値キャプチャでは元の変数を変更してもキャプチャ時の値を読み、参照キャプチャでは対象の寿命が切れると参照がdanglingになります。
- C#のdelegateはGC管理で寿命の心配がない。C++の参照キャプチャは寿命を自分で保証する
- `+=`によるマルチキャスト(複数登録)はdelegate組み込み。C++では`vector<std::function>`を自分で持つ(→ [Observer](/design/patterns/observer.html))

## Unity開発者が誤解しやすい点

1. 「ラムダを作るとGC Alloc」というUnityの感覚——C++ではキャプチャ付きラムダも**スタックに置かれる普通の値**。Allocを恐れてラムダを避ける必要はない(std::functionへの格納時のみヒープの可能性)
2. コルーチンやInvokeの感覚で「後で実行」に参照キャプチャを使うと、C++では即未定義動作
3. `std::function`はdelegateの近似だが、**null呼び出しは例外(bad_function_call)**、C#のnullデリゲート呼び出しはNullReferenceException——どちらも呼ぶ前チェックの習慣は同じ

## ゲーム開発での使用例

- イベント購読(`std::function`のリスト → [Observer](/design/patterns/observer.html))
- 遅延実行キュー(「3秒後にこれ」/フレーム末尾処理 → [Event Queue](/game/patterns/event-queue-and-pubsub.html))
- 軽量[Strategy](/design/patterns/strategy.html)/[Command](/design/patterns/command.html)(クラスを作るまでもない差し替え)
- ソート順・フィルタの指定(`std::sort`+ラムダ)

## 使う場面 / 使わない場面

- ラムダ: 日常のあらゆる場面(C++20の主力構文)
- std::function: 保存が必要なときだけ(「とりあえずfunctionで受ける」はコストの無駄)
- 関数ポインタ: C境界・テーブル。新規設計の主役にはしない

## よくある誤解

- 「[&]と書いておけば楽」— 全参照キャプチャは寿命バグの温床。**保存されるラムダでは[&]を禁止**くらいの規律が安全
- 「std::functionはラムダの型」— ラムダの型は無名の独自型。functionはそれを入れられる「箱」で、別物

## 関連項目

- [関数ポインタとdelegate(C#対比の詳細)](/languages/csharp/delegates-events-function-pointers.html)
- [テンプレート](/languages/cpp/templates-and-concepts.html) / [Observer](/design/patterns/observer.html)

## 理解度チェック

1. 値キャプチャと参照キャプチャの使い分けの原則(「後で実行」との関係)は?
2. std::functionのコストを2つ挙げてください。
3. ラムダの「正体」は何ですか。

## 演習

samples/lambdas_functions.cpp(検証済み)で、(a) 参照キャプチャのラムダをスコープ外で呼ぶとどうなるか(コメントアウトされた危険例を読む)、(b) `std::function`のリストによる簡易イベントを動かしてください。

---

関連項目：[テンプレートと concepts](/languages/cpp/templates-and-concepts.html) / [学習ガイド](/languages/cpp/) / [enum・enum class・namespace](/languages/cpp/enums-and-namespaces.html)
