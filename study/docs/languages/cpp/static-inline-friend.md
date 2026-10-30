---
title: static・inline・friend
study:
  source: C++ Wiki
  status: published
  summary: 3つとも「1つのキーワードに複数の意味がある」ため混乱しやすい機能です。文脈ごとに分解します。 C#のstaticと同じ概念。個々のインスタンスではなく型に属します。 寿命はプログラム終了まで(→ 静的記憶域期間)
  section: reference
  format: article
  domain: languages
---

# static・inline・friend

3つとも「**1つのキーワードに複数の意味がある**」ため混乱しやすい機能です。文脈ごとに分解します。

## static(文脈で4つの意味)

### 1. クラスの static メンバ(C#と同じ)

```cpp
// C++20
class Enemy {
public:
    static int AliveCount() { return count_; }   // インスタンス不要で呼べる
private:
    inline static int count_ = 0;   // 全インスタンスで共有(C++17からinlineでヘッダー内初期化可)
};
```

C#のstaticと同じ概念。個々のインスタンスではなく型に属します。

### 2. 関数内 static(ローカル静的変数)

```cpp
int NextId() {
    static int id = 0;    // 初回呼び出し時に1度だけ初期化され、以後関数を跨いで生存
    return ++id;
}
```

- 寿命はプログラム終了まで(→ [静的記憶域期間](/runtime/memory/storage-duration-and-lifetime.html))
- 初期化はC++11以降**スレッドセーフ**([Meyers' Singleton](/design/patterns/singleton.html)の基盤)
- C#に直接の対応物なし(フィールドで代用する)

### 3. ファイルスコープの static(内部リンケージ)

```cpp
// あるcppファイル内
static int helperValue = 42;          // このファイル(翻訳単位)の外から見えない
static void HelperFunc() {}           // 同上
```

「このファイル専用」を表す古い書き方。現代は**無名namespace**が推奨(→ [リンケージ](/runtime/cpp-internals/symbols-and-linkage.html))。C#のprivate/internalに似た役割をファイル単位で果たします。

### 4. (参考)staticではないもの

C#の `static class` のような「インスタンス化禁止のクラス」構文はC++にない——namespaceと自由関数で書くのがC++流です。

## inline(名前と実態がズレた機能)

### 歴史: 「インライン展開のヒント」→ 現在: 「多重定義の許可」

```cpp
// ヘッダーファイルに書かれた関数定義
inline float Clamp01(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
```

現代の `inline` の実質的な意味は「**この定義が複数の翻訳単位に現れてもリンクエラーにしない**([ODR](/runtime/cpp-internals/translation-units-and-headers.html)の例外)」です。

- ヘッダーに関数の**定義**を書くなら inline が必要(クラス定義内に書いたメンバ関数は暗黙にinline)
- **インライン展開されるかどうかは最適化器が決める**。inlineキーワードはほぼ影響しない(→ [inlineの実際](/runtime/cpp-internals/template-instantiation-and-inline.html))
- C++17から変数にも使える(`inline static` メンバ、ヘッダー内グローバル定数)

**Unity開発者の注意**: C#にはヘッダーがないのでこの問題自体が存在しない。「inline=高速化キーワード」という古い理解は捨て、「ヘッダーに定義を置くための許可証」と覚え直すのが正確です。展開の強制は各コンパイラの拡張(`__forceinline` / `__attribute__((always_inline))`)で、それも最終的にはコンパイラ判断です。

## friend(カプセル化の例外指定)

```cpp
// C++20
class Inventory {
public:
    // ...
private:
    std::vector<Item> items_;
    friend class InventoryDebugger;                       // このクラスにはprivateを見せる
    friend std::ostream& operator<<(std::ostream&, const Inventory&);  // この関数にも
};
```

- 指定した相手だけに private/protected へのアクセスを許す。**「片思い」**(相手側は宣言不要)で、**継承もしない**
- C#に対応物なし(internalは「アセンブリ全体」への公開で粒度が粗い。`InternalsVisibleTo`が近い)

### 正当な用途と乱用

- **正当**: 対で動作する密結合な2クラス(コンテナとそのイテレータ)、演算子オーバーロードの非メンバ関数(`operator<<`)、テスト用アクセス(賛否あり)、[Memento](/design/patterns/memento.html)のように「特定クラスだけに中身を見せる」設計
- **乱用**: 「アクセスしたいからfriend」— それはカプセル化の放棄。friendが増えるクラスは、そもそも責務分割が誤っているサイン([SRP](/design/solid/srp.html))

## ゲーム開発での使用例

- `inline static` メンバ: 全インスタンス共有のカウンタ、設定
- 関数内static: 遅延初期化(ただしマルチスレッドの破棄順に注意 → [Singleton](/design/patterns/singleton.html))
- ヘッダーのinline関数: 数学ユーティリティ(Clamp, Lerp)— 展開されて高速
- friend: エンジンの内部連携(SceneがNodeの内部を直接組み替える等)

## メモリ・ビルド上で起きること

- staticメンバ・関数内staticは**データ領域**(.data/.bss)に置かれる(スタックでもヒープでもない → [メモリレイアウト](/runtime/cpp-internals/memory-layout.html))
- ファイルstatic/無名namespaceはシンボルが外部に公開されず、リンクの衝突を防ぐ
- inline関数は各翻訳単位に複製され、リンカが1つに統合する(→ [シンボルとリンケージ](/runtime/cpp-internals/symbols-and-linkage.html))

## 使う場面 / 使わない場面

- static(クラス): 型に属する情報。ただし**可変のstaticデータはグローバル変数と同じ危険**([Singleton](/design/patterns/singleton.html)の問題がそのまま)
- inline: ヘッダーに定義を書くとき(機械的に)
- friend: 上記の正当な用途のみ。迷ったら使わない

## 理解度チェック

1. staticの4つの文脈のうち3つを、それぞれ一言で説明できますか。
2. 現代の inline の実質的な意味は?「高速化キーワード」ではない理由は?
3. friendの「片思い」とはどういう性質ですか。

## 演習

samples/static_inline.cpp(検証済み)で、(a) 関数内staticが呼び出しを跨いで値を保持すること、(b) inline関数をヘッダー相当の形で2つの翻訳単位から使ってもリンクが通ることを確認してください。

---

関連項目：[auto・decltype・constexpr・consteval](/languages/cpp/auto-and-constexpr.html) / [学習ガイド](/languages/cpp/) / [キャスト](/languages/cpp/casts.html)
