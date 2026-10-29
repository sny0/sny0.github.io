---
title: "テンプレートの実体化と inline の実際"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "テンプレートの実体化: Max が使われた瞬間、その翻訳単位内に int 版の実物コードが生成されること。「テンプレートはヘッダーに書く」「ビルドが遅くなる」「同じコードが何度も作られる」——すべてこの仕組みから導かれる"
---

# テンプレートの実体化と inline の実際

## 一言で言うと

- **テンプレートの実体化**: `Max<int>` が使われた瞬間、その翻訳単位内に int 版の実物コードが生成されること。「テンプレートはヘッダーに書く」「ビルドが遅くなる」「同じコードが何度も作られる」——すべてこの仕組みから導かれる
- **inlineの実際**: キーワードinlineの現代の意味は「多重定義の許可」で、**インライン展開するかは最適化器が決める**

## 実体化の仕組み

```cpp
// max.h
template <typename T>
T Max(T a, T b) { return a < b ? b : a; }
```

```
a.cpp: Max(1, 2) を使用      → a.o に Max<int> の実体が生成される
b.cpp: Max(3, 4) を使用      → b.o にも Max<int> の実体が生成される(重複!)
リンカ: 同一シンボル(弱いシンボル/COMDAT)として1つに統合 → 実行ファイルには1個
```

ここから導かれる実務知識:

1. **テンプレート定義はヘッダーに置く**: 実体化には雛形の全文が必要。b.cppをコンパイル中のコンパイラは、定義が見えなければ int 版を作れない(宣言だけだとリンクエラー `undefined reference to Max<int>`)
2. **ビルド時間への影響**: 同じ実体化を全translation unitで繰り返し行い、リンカが捨てる——この「作っては捨てる」がC++のビルドを遅くする主犯の一つ(→ [ビルド速度](/tools/build/build-speed.html))
3. **コードサイズ**: `vector<int>`, `vector<float>`, `vector<Enemy*>` はそれぞれ完全な別コード。型の数だけ増える(テンプレートブロート)。組み込み・モバイルでは意識する
4. **明示的実体化**という緩和策: よく使う型を1つの.cppで `template class std::vector<int>;` と実体化し、他では宣言だけ(extern template)にしてビルドを速くできる

### 実体化は「使った分だけ」

```cpp
template <typename T>
struct Container {
    void Sort() { /* T に operator< が必要 */ }
    void Print() { /* T に operFAtor<< が必要 */ }
};
Container<Enemy> c;   // クラスの実体化ではメンバ関数はまだ作られない
c.Print();            // Printだけ実体化される。SortはEnemyに<がなくてもエラーにならない
```

「使わないメンバは検査すらされない」——これがテンプレートの柔軟さの源であり、「エラーが使用時まで隠れる」理由でもあります([concepts](/languages/cpp/templates-and-concepts.html)が事前検査を可能に)。

## inlineの実際

### キーワードの意味(再確認)

`inline` = 「この定義が複数の翻訳単位に現れることを許す([ODR](/runtime/cpp-internals/translation-units-and-headers.html)の例外)」。テンプレートとクラス内定義のメンバ関数は暗黙にこの性質を持ちます。

### インライン展開(最適化)は別の話

```cpp
inline int Add(int a, int b) { return a + b; }
int y = Add(x, 1);
// 最適化器の判断で: call Add → 「y = x + 1」に展開(呼び出しコスト消滅)
// さらに定数伝播などの連鎖最適化が可能になる — 展開自体より、展開後の最適化が本体
```

- 展開の判断はコスト計算(関数サイズ、呼び出し頻度の推定)で**最適化器が行う**。inlineキーワードの有無はほぼ影響しない(ヒントとして扱う処理系もある、程度)
- 展開の条件: 定義がその翻訳単位から**見えている**こと。だからヘッダーに定義がある関数(inline/テンプレート)は展開されやすく、.cppに隠れた関数は(LTOなしでは)展開できない——「ホットな小関数はヘッダーへ」の根拠
- 強制系: MSVC `__forceinline` / GCC・Clang `__attribute__((always_inline))`(非標準。プロファイル計測とセットで)
- 逆の要求: デバッグしにくくなるので展開したくない → `[[gnu::noinline]]` 等

### インライン展開のコスト

展開しすぎはコード肥大→**命令キャッシュ**を圧迫して逆に遅くなる(→ [キャッシュ](/runtime/cpp-internals/cache-branch-simd.html))。「全部inline化すれば速い」は誤りで、だからこそ判断は計測ベースの最適化器に任せるのが基本です。

## C#との対応

- C#ジェネリックは実行時(JIT)に実体化(値型のみ特殊化)。C++はコンパイル時に全部(→ [第9部](/languages/csharp/templates-vs-generics.html))
- C#のインライン展開はJITが行い、`[MethodImpl(MethodImplOptions.AggressiveInlining)]` がヒント。概念は同じで、タイミング(実行時vs事前)が違う
- IL2CPPではC#ジェネリックがC++テンプレート的な実体化に落ち、「使った組み合わせだけ生成」の性質がAOTの制約(実行時に新しい組み合わせを作れない)として現れる

## ゲーム開発での使用例

- 数学関数(Lerp, Clamp, Dot)をヘッダーinlineに→ホットループで展開されゼロコスト
- `vector<T>`の使用型を絞る(似た用途で型を乱立させない)ことでサイズとビルドを節約
- エンジンの共通テンプレート(TArray等)は明示的実体化・PCHでビルド時間対策されている

## 理解度チェック

1. テンプレートをヘッダーに書く必要があるのはなぜですか。
2. 「inlineキーワード」と「インライン展開」の関係を正しく説明できますか。
3. テンプレートがビルド時間とコードサイズに与える影響のメカニズムは?

## 演習

<a href="/study/samples/cpp/templates_basic.cpp">samples/templates_basic.cpp</a> を `-O2 -S` でコンパイルし、Max&lt;int>の呼び出しが展開されて消えている(またはされていない)ことをアセンブリで確認してください。godbolt.orgに貼ると差分が見やすいです。

---

前: [オブジェクトファイルとライブラリ](/runtime/cpp-internals/object-files-and-libraries.html) | [カテゴリ目次](/runtime/cpp-internals/) | 次: [vtable・vptr・仮想関数呼び出し](/runtime/cpp-internals/vtable-and-virtual-calls.html)
