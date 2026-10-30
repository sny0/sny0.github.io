---
title: C++ — 所有権・RAII・値の意味を設計する
study:
  source: 設計の手帖
  status: published
  summary: C++ では、どんな操作ができるかと同じくらい、誰が所有し、いつ破棄するかがインターフェースの一部です。
  section: reference
  format: article
  domain: design
---

# C++ — 所有権・RAII・値の意味を設計する

C++ では、どんな操作ができるかと同じくらい、誰が所有し、いつ破棄するかがインターフェースの一部です。

タグ: C++ / RAII / Rule of Zero / unique_ptr / Pimpl / concepts / CRTP

## まず値、その次に所有権

<div v-pre>

<div class="table-scroll"><table><thead><tr><th>表現</th><th>設計上の読み方</th><th>注意点</th></tr></thead><tbody><tr><td>T</td><td>値として保持・返却する</td><td>コピーやムーブの意味とコストを決める</td></tr><tr><td>T& / const T&</td><td>既存の対象を借りる</td><td>参照先の寿命を延ばさない。原則 null なし</td></tr><tr><td>T*</td><td>任意の対象を借りる用途が典型</td><td>所有の移動は別の型で明示する</td></tr><tr><td>std::unique_ptr&lt;T></td><td>一つの所有者が破棄を担当</td><td>コピー不可、ムーブで所有を移す</td></tr><tr><td>std::shared_ptr&lt;T></td><td>複数の所有者で寿命を共有</td><td>循環参照には weak_ptr 等を検討</td></tr><tr><td>std::span / std::string_view</td><td>連続領域や文字列を所有せず見る</td><td>元データの寿命と再配置に注意</td></tr></tbody></table></div><p>これは現代的な C++ の慣例です。古いコードや外部 API には所有する生ポインタもあるため、契約を確認します。「どこでも shared_ptr」は所有の判断を先送りし、寿命やコストを見えにくくします。</p>

</div>

## RAII：スコープとリソースを結び付ける

<div v-pre>

<p>ファイル、ロック、メモリなどを管理するオブジェクトへ寿命を委ねます。スコープを出るとデストラクタが呼ばれ、例外があっても通常のスタック巻き戻しで解放できます。強制終了など、デストラクタが実行されない状況は別です。</p>

</div>

### 標準ライブラリでファイルとロックを管理 / 独立した関数

::: code-group

```cpp [C++]
#include <fstream>
#include <mutex>
#include <stdexcept>
#include <string>

void appendLine(const std::string& line, std::mutex& mutex) {
    std::lock_guard<std::mutex> lock(mutex);
    std::ofstream out("notes.txt", std::ios::app);
    if (!out) throw std::runtime_error("open failed");
    out << line << "\n";
    if (!out) throw std::runtime_error("write failed");
} // out が閉じられ、lock が解除される
```

```csharp [C#]
using System.IO;

public static class NoteWriter
{
    private static readonly object Gate = new();

    public static void AppendLine(string line)
    {
        lock (Gate)
        {
            using var writer = new StreamWriter("notes.txt", append: true);
            writer.WriteLine(line);
        }
    }
} // using で破棄、lock ブロックを出ると解除
```

:::

## Rule of Zero とポリモーフィズム

<div v-pre>

<p><code>std::string</code>、<code>std::vector</code>、スマートポインタなどに管理を任せ、特別な理由がなければ独自のデストラクタ・コピー・ムーブを定義しないのが Rule of Zero の考え方です。手動管理を一つ追加すると、他の特殊メンバー関数への影響も確認する必要があります。</p><p>基底ポインタ経由で派生オブジェクトを破棄する契約なら、基底デストラクタを virtual にします。ポリモーフィックな基底型を値でコピーすると派生部分が失われる slicing にも注意します。継承が必要ない型は値として素直に設計します。</p>

</div>

## Pimpl・templates・concepts・CRTP の使いどころ

<div v-pre>

<ul><li><strong>Pimpl：</strong>実装データを別の Impl へ隠し、ヘッダーの依存や ABI の影響を抑える。間接参照や動的確保の負担があり、ABI 安定性は他の条件も含めて判断します。</li><li><strong>templates / concepts：</strong>コンパイル時に型に要求する操作を表す。実行時の差し替えが必要なら virtual の契約が適する場合もあります。</li><li><strong>CRTP：</strong>派生型をテンプレート引数に渡す静的な多態性の技法。型関係が複雑になるため、単純な関数や通常のテンプレートで足りるかを先に考えます。</li></ul><aside class="article-note"><strong>API の設計メモ</strong><p>参照をメンバーに保持する、string_view を返す、コールバックで this を捕捉する場面では、利用側へ寿命の前提を必ず伝えます。</p></aside>

</div>

## 理解度チェック

戻り値の string_view は、関数内のローカル文字列を参照していませんか？

## この章の参考資料

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Bjarne Stroustrup / Herb Sutter ほか。インターフェース、所有権、クラス設計の指針。規格書そのものではありません。

[クラス名辞典](/design/naming.html) / [パターン一覧](/design/pattern-index.html) / [手帖の参考資料](/design/notebook-references.html)
