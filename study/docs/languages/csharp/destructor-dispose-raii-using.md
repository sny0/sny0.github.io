---
title: デストラクタと Dispose / RAII と using
study:
  source: C++ Wiki
  status: published
  summary: "C#の~の感覚(いつか呼ばれるかも)をC++に持ち込むと、逆方向に驚くことになります: C++のデストラクタは決定的・同期的で、設計の主役です(RAII)。 C#: 型がIDisposableでも、usingを書くかは利用者次第(呼び忘れがコンパイルは通る)"
  section: reference
  format: article
  domain: languages
---

# デストラクタと Dispose / RAII と using

## 対応表

| C# | C++ | 似ている点 | 違う点 |
|---|---|---|---|
| `~ClassName()`(ファイナライザ) | `~ClassName()`(デストラクタ) | 名前・構文 | **実行タイミングが根本的に違う** |
| `IDisposable.Dispose()` | デストラクタ | 決定的な後片付け | C#は呼び忘れ可能、C++は自動 |
| `using var f = ...;` | スコープ+[RAII](/languages/cpp/raii.html) | スコープ終了で解放 | C++は書き忘れという概念がない |

## 同名の罠: ファイナライザ ≠ デストラクタ

```csharp
// C#のファイナライザ: GCが「いつか」呼ぶ(呼ばれない可能性すらある)。
class NativeWrapper {
    ~NativeWrapper() { /* 実行タイミング不定。ここに重要な処理を書いてはいけない */ }
}
```

```cpp
// C++のデストラクタ: スコープを抜けた「その行」で確実に実行
{
    File f("save.dat");
}   // ← ここで必ず ~File()。例外でも、returnでも
```

**C#の`~`の感覚(いつか呼ばれるかも)をC++に持ち込むと、逆方向に驚く**ことになります: C++のデストラクタは決定的・同期的で、設計の主役です([RAII](/languages/cpp/raii.html))。

## using は「手動RAII」

```csharp
// C#: Disposeを呼ぶ責任は「使う側」にある
using var file = new StreamWriter("save.dat");   // usingを書き忘れたら? → リーク(検出は解析器頼み)
```

```cpp
// C++: 解放は「型の性質」。使う側は何も書かない・書き忘れられない
std::ofstream file("save.dat");
```

- C#: 型がIDisposableでも、usingを書くかは利用者次第(呼び忘れが**コンパイルは通る**)
- C++: RAIIの型を使った時点で解放は保証。**「正しく使うのが簡単、間違って使うのが難しい」方向に倒れている**
- C#の `using` はブロック/宣言スコープのみ。C++はメンバ変数・コンテナ要素としてもRAIIが機能する(vectorが破棄されれば全要素のデストラクタが走る)——**合成可能性**がC++の強み

## Dispose相当をC++で設計するとき

- 基本はデストラクタのみでよい(Rule of Zero → [特殊メンバ関数](/languages/cpp/ctor-dtor-copy-move.html))
- 「失敗を報告したい後始末」(ファイルclose失敗など)は、明示的 `Close()` を併設し、デストラクタは保険とする——C#の「DisposeとファイナライザのDisposeパターン」に構造が似る
- C#の `IAsyncDisposable` に相当する標準機構はC++にない(非同期の後始末は自前設計)

## Unity特有の注意

- MonoBehaviourの後片付けは `OnDestroy`(エンジンのライフサイクル)であり、C#のファイナライザともC++のデストラクタとも別物。**Unityの寿命はエンジンが管理**している(→ [UEのGCとの比較](/game/unreal/gc-and-object-pointers.html)と同じ構図)
- `RenderTexture` や `NativeArray` などネイティブ資源を持つ型は「Disposeを忘れるとリーク」——C++のRAIIが欲しくなる体験、として記憶しておくとよい

## 使い分けの理解チェック

1. C#のファイナライザとC++のデストラクタの実行タイミングの違いは?
2. usingとRAIIの「責任の所在」の違いを説明できますか。
3. C++で明示的Close()を併設するのはどんなときですか。

## 演習

C#で書いたことのある `using` 使用コードを1つ思い出し、C++のRAIIクラスとして書き直してください(<a href="/study/samples/cpp/raii_file.cpp">samples/raii_file.cpp</a>が参考)。「using書き忘れに相当する事故がC++版で構造的に不可能なこと」を確認するのがゴールです。

---

関連項目：[学習ガイド](/languages/csharp/) / [ポインタと参照型 / 値セマンティクス](/languages/csharp/pointers-references-value-semantics.html)
