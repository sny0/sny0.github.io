---
title: RAII (Resource Acquisition Is Initialization)
study:
  source: C++ Wiki
  status: published
  summary: 「リソースの確保をコンストラクタで、解放をデストラクタで行い、リソースの寿命をオブジェクトの寿命に一致させる」— C++最重要のイディオムです。名前は分かりにくいですが、意味は「後片付けを型に組み込む」。スマートポインタ、vector、stringなど、C++標準ライブラリの大半はRAIIでできてい
  section: reference
  format: article
  domain: languages
---

# RAII (Resource Acquisition Is Initialization)

## 一言で言うと

「**リソースの確保をコンストラクタで、解放をデストラクタで**行い、リソースの寿命をオブジェクトの寿命に一致させる」— C++最重要のイディオムです。名前は分かりにくいですが、意味は「**後片付けを型に組み込む**」。スマートポインタ、vector、stringなど、C++標準ライブラリの大半はRAIIでできています。

## 解決したい問題

```cpp
// C++20(問題例)— 手動の後片付け
void SaveGame(const GameState& state) {
    FILE* f = std::fopen("save.dat", "wb");
    if (!f) return;
    if (!WriteHeader(f)) { std::fclose(f); return; }   // 全ての出口でclose
    if (!WriteBody(f))   { std::fclose(f); return; }   // 書き忘れたら即リーク
    // 途中で例外が飛んだら? → closeされない
    std::fclose(f);
}
```

- **全ての出口**(early return、例外、後から追加されるreturn)で解放を書く必要があり、1つでも漏れるとリーク
- 「確保と解放を対で書く」規律は、人間には守り続けられない(ことが歴史的に証明済み)

## RAII適用後

```cpp
// C++20 — リソースを型で包む
#include <cstdio>

class File {
public:
    explicit File(const char* path, const char* mode) : f_(std::fopen(path, mode)) {}
    ~File() { if (f_) std::fclose(f_); }            // 解放はデストラクタが保証

    File(const File&) = delete;                     // コピー禁止(二重closeの防止)
    File& operator=(const File&) = delete;
    File(File&& o) noexcept : f_(o.f_) { o.f_ = nullptr; }   // ムーブで所有権移転
    File& operator=(File&& o) noexcept {
        if (this != &o) { if (f_) std::fclose(f_); f_ = o.f_; o.f_ = nullptr; }
        return *this;
    }

    bool IsOpen() const { return f_ != nullptr; }
    FILE* Get() const { return f_; }                // C APIとの境界用
private:
    FILE* f_;    // 生リソースはこのクラスだけが触る(Rule of Five → 前ページ)
};

void SaveGame(const GameState& state) {
    File f("save.dat", "wb");
    if (!f.IsOpen()) return;
    if (!WriteHeader(f.Get())) return;   // どの出口でも
    if (!WriteBody(f.Get())) return;     // 例外が飛んでも
}                                        // ← 必ず ~File() が走り、closeされる
```

検証済みサンプル: <a href="/study/samples/cpp/raii_file.cpp">samples/raii_file.cpp</a>

## 仕組み: なぜ「必ず」なのか

C++の言語仕様が保証するもの:

1. スコープを抜けるとき(正常・return・例外のスタック巻き戻し)、そのスコープの完全構築済みオブジェクトのデストラクタが**生成の逆順で必ず**呼ばれる
2. メンバも同様(構築の逆順で破棄)

つまり「後片付けの実行」を、プログラマの記憶力ではなく**言語仕様**に担わせるのがRAIIです。

## 「リソース」はメモリだけではない

| リソース | RAIIラッパ |
|---|---|
| ヒープメモリ | `std::unique_ptr` / `std::vector` / `std::string` |
| ファイル | `std::fstream`(標準でRAII) |
| ミューテックスのロック | `std::lock_guard` / `std::scoped_lock` |
| GPUリソース・サウンドハンドル | 自作ラッパ(上のFileと同型) |
| 「処理の対」一般 | スコープガード(開始/終了、プロファイルの計測区間、[Observer](/design/patterns/observer.html)の購読/解除) |

```cpp
// ロックの例: 「unlockし忘れ」がこの世から消える
std::mutex m;
void AddScore(int s) {
    std::lock_guard lock(m);   // 構築=lock
    score += s;
}                              // 破棄=unlock(例外でも)
```

## C#との違い

- C#の対応物は `using`/`IDisposable`(→ [デストラクタと Dispose / RAII と using](/languages/csharp/destructor-dispose-raii-using.html))。ただし**usingは書き忘れられる**(Disposeを呼ぶかは使う側の責任)のに対し、RAIIは**型の性質**なので使う側は何も書かない
- GCはメモリしか回収しない&タイミング不定。RAIIは全リソースを決定的タイミングで解放

## Unity開発者が誤解しやすい点

1. 「デストラクタ=ファイナライザ(いつか呼ばれる)」— C++のデストラクタはスコープ終了の**その行で**呼ばれる。この決定性こそが機能
2. 「後片付けは自分でCleanup()を呼ぶもの」— MonoBehaviourのOnDestroyの習慣。C++では「呼び忘れられるAPI」は設計ミスとみなし、型に組み込む
3. RAIIオブジェクトを`new`で作って放置したらRAIIも無力(デストラクタが走らない)。**スコープ(または所有者)に載せて初めて機能する**

## ゲーム開発での使用例

- アセットハンドル(ロード=構築、アンロード=破棄)
- スコープ計測(`ScopedTimer t("AI update");` — 構築で計測開始、破棄で記録)
- 描画ステートのpush/pop、SpriteBatchのBegin/End
- フレームアロケータのマーカー(スコープを抜けたら一括巻き戻し → [arena allocator](/runtime/memory/allocators-and-pools.html))

## 利点

- リーク・解放忘れ・二重解放が**構造的に**消える(人の注意力に依存しない)
- 例外安全性がほぼ自動で手に入る
- 「所有者は誰か」が型に現れる(→ [所有権](/runtime/memory/ownership-and-borrowing.html))

## 欠点・注意点

- デストラクタは**失敗を報告できない**(例外を投げてはいけない)。「closeの失敗を知りたい」場合は明示的な `Close()` メソッドも併設し、デストラクタは保険にする
- 解放のタイミングがスコープに縛られる。「フレーム末尾でまとめて解放したい」等はスコープと合わない → 遅延破棄キューなど別の仕組みと併用
- 循環参照は`shared_ptr`でも解決しない(→ [スマートポインタ](/languages/cpp/smart-pointers.html))

## 使う場面 / 使わない場面

- **使う場面**: 「確保/解放」「開始/終了」の対があるものすべて。C++ではこれが既定
- **使わない場面**: 寿命がスコープ構造と一致しないリソース(プールから借りてイベントで返す等)は、RAIIラッパよりハンドル+マネージャ管理が合うことがある。ただしその場合も内部実装はRAIIで守る

## よくある誤解

- 「RAII=スマートポインタのこと」— スマートポインタはRAIIの一例。ロック、ファイル、計測など全リソースに適用できる考え方
- 「C++は手動メモリ管理の言語」— 現代C++は「**手動で管理しない仕組みを自分で選ぶ**言語」。newとdeleteを直接書くコードはRAII部品の内側だけ

## 関連項目

- [コンストラクタ・デストラクタ・ムーブ](/languages/cpp/ctor-dtor-copy-move.html) / [スマートポインタ](/languages/cpp/smart-pointers.html)
- [RAIIとusing(C#対比)](/languages/csharp/destructor-dispose-raii-using.html)
- [所有権と借用](/runtime/memory/ownership-and-borrowing.html)

## 理解度チェック

1. RAIIが「人間の規律」を「言語の保証」に置き換えている、とはどういうことですか。
2. デストラクタが例外を投げてはいけないことと、RAIIの「Close()併設」の関係は?
3. `new File(...)` して生ポインタで放置するとRAIIが機能しない理由は?

## 演習

samples/raii_file.cpp を参考に、「構築で計測開始、破棄で経過時間を出力する `ScopedTimer`」を書き、early returnや例外があっても計測が出力されることを確認してください。

---

関連項目：[コンストラクタ・デストラクタ・コピー・ムーブ](/languages/cpp/ctor-dtor-copy-move.html) / [学習ガイド](/languages/cpp/) / [継承・仮想関数](/languages/cpp/inheritance-and-virtual.html)
