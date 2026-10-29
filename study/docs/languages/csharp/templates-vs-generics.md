---
title: "テンプレートとジェネリック"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "構文は瓜二つ(List と std::vector )ですが、仕組みは正反対に近い: C#ジェネリック = 1つのコード+実行時の型情報(ランタイムが面倒を見る) C++テンプレート = コンパイル時のコード生成器(型ごとに完全な実物を作る)"
---

# テンプレートとジェネリック

## 一言で言うと

構文は瓜二つ(`List<T>` と `std::vector<T>`)ですが、**仕組みは正反対に近い**:

- C#ジェネリック = **1つのコード+実行時の型情報**(ランタイムが面倒を見る)
- C++テンプレート = **コンパイル時のコード生成器**(型ごとに完全な実物を作る)

詳細な言語仕様は[テンプレートとconcepts](/languages/cpp/templates-and-concepts.html)で説明済み。このページは対応と差分に集中します。

## 対応表

| C# | C++ | 差分 |
|---|---|---|
| `class Pool<T>` | `template <typename T> class Pool` | C++は使用時に型ごとの実体を生成 |
| `where T : IWeapon` | concepts(C++20)`template <Weapon T>` | C#は制約必須、C++は制約なしでも書ける |
| `where T : new()` | (不要: 書けば検査される) | C++はダックタイピング |
| `typeof(T)` / `is T` | 対応物ほぼなし(型情報は消える) | C++は実行時にTを知らない |
| `default(T)` | `T{}` | ほぼ対応 |
| 数値を型引数に | `template <int N>` | **C++のみ**(固定長配列などに強力) |
| 特殊化(不可) | `template <> class Pool<bool>` | **C++のみ**(型ごとに別実装を書ける) |

## 決定的な違い1: 制約の方向

```csharp
// C#: 「Tができること」を先に宣言しないと使えない
T Strongest<T>(List<T> list) where T : IHasPower {
    // list[0].Power は IHasPower にあるから呼べる(宣言ベース)
}
```

```cpp
// C++: 書けばよい。実体化時に「その型にPowerがあるか」を検査(使用ベース)
template <typename T>
const T& Strongest(const std::vector<T>& list) {
    // t.Power() と書けば、Power()を持つ型なら何でも通る
    // 持たない型を渡すと、この行のエラーになる(C++20 conceptsで事前宣言も可能に)
}
```

- C#方式: 誤用がインターフェース境界で止まる。ただし全部にinterface実装が必要(重い)
- C++方式: 既存の型を無改造で使える(ダックタイピング)。ただし契約が暗黙(→ conceptsが解決)

## 決定的な違い2: 実体化のタイミングと帰結

| | C# | C++ |
|---|---|---|
| コード生成 | JITが実行時に(値型は特殊化、参照型は共有) | コンパイル時に型ごと全部 |
| 新しい型引数を実行時に | 可能(リフレクション+MakeGenericType) | **不可能**(コンパイル済みのものだけ) |
| ビルド時間 | 影響小 | 増える([実体化](/runtime/cpp-internals/template-instantiation-and-inline.html)) |
| バイナリサイズ | 小 | 型数に比例して増える |
| 実行速度 | 参照型Tは共有コード(間接) | 常に型特化の最速コード |

**IL2CPPがこの2つの世界の橋**: C#ジェネリックをAOTでC++的に事前実体化するため、「実行時に初めて現れる値型のジェネリック組み合わせ」が失敗する(ExecutionEngineException系)——Unityで`AOT対応`と言われていた問題の正体はこの表にあります(→ [IL2CPP](/languages/csharp/il2cpp.html))。

## Unity開発者が誤解しやすい点

1. 「`List<T>`と`vector<T>`は同じもの」— 使用感は近いが、C++は使った型の数だけvectorのコードが生成されている(ビルド時間・サイズで払う)
2. C#の感覚で「制約を書かないと何もできない」と思う——C++は逆に何でも書けてしまい、**契約が読めない**のが問題(conceptsを書く動機)
3. 「テンプレートはライブラリ作者のもの」— 使う側としては毎日触れている(STL全部)。書く側に回るのは共通部品を作るときだけでよい

## ゲーム開発での使い分けの直感

- C#でinterface+ジェネリックにしていた共通処理 → C++ではテンプレート(実行時コストゼロ)か仮想関数(柔軟)の**選択になる**(→ [判断ガイド](/design/decisions/cpp-choices.html))
- C#で「structのList」で最適化していた箇所 → C++では `vector<T>` が最初からその形

## 理解度チェック

1. 「宣言ベースの制約」と「使用ベースの検査」の違いを説明できますか。
2. C++テンプレートが実行時に新しい型引数を受けられない理由は?
3. IL2CPPのAOTジェネリック問題は、2言語のどの仕組みの違いから来ますか。

## 演習

C#で書いた経験のあるジェネリックメソッド(例: `T GetOrDefault<T>(Dictionary<string,T>, string)`)をC++テンプレートで書き、(a) 制約なしで動くこと、(b) 意図的に要件を満たさない型を渡してエラーメッセージを観察、(c) 可能ならconceptで制約を書いてエラーの変化を比較してください(<a href="/study/samples/cpp/templates_basic.cpp">samples/templates_basic.cpp</a>を土台に)。

---

前: [ポインタと参照型](/languages/csharp/pointers-references-value-semantics.html) | [カテゴリ目次](/languages/csharp/) | 次: [仮想関数とvirtual/override](/languages/csharp/virtual-and-polymorphism.html)
