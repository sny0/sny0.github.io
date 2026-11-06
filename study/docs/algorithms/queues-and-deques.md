---
title: スタック・キュー・デック — どちらの端から入れ、どちらから取るか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: LIFO・FIFO・両端キューの違いを整理し、固定長の配列を折り返して使うキューの添字と満杯の判定を追う。
  aliases: [stack, スタック, queue, キュー, deque, デック, 両端キュー, LIFO, FIFO, リングキュー, 循環配列]
  verification: C++のdeque・コンテナアダプターの規定と.NETのQueueに照合し、C++17の例で満杯・空・折り返しを確認（2026-11-06）
---

# スタック・キュー・デック — どちらの端から入れ、どちらから取るか

作業を入れた順に処理したいときはキュー、最後にした操作から取り消したいときはスタックが使えます。どちらの端からも追加・取り出しが必要ならデックです。先に取り出しの規則を決めると、その下で配列をどう使うかも選びやすくなります。

| 構造 | 入れる端 | 取り出す端 | ゲームでの例 |
| --- | --- | --- | --- |
| スタック（LIFO） | 上 | 同じ上 | エディターで最後にした操作を取り消す |
| キュー（FIFO） | 末尾 | 先頭 | 受け付けた描画要求やイベントを順に処理する |
| デック（両端キュー） | 両端 | 両端 | 後ろに新しい履歴を足し、古い履歴を前から捨て、巻き戻し時は後ろから取り出す |

キューへA、B、Cを入れたら、取り出しはA、B、Cの順です。スタックならC、B、Aの順です。デックでは同じ入れ方でも、その都度選んだ端で順序が決まります。期限や重要度で次の要素を選ぶなら、別の規則を持つ[優先度付きキューと二分ヒープ](/algorithms/binary-heaps.html)が候補です。

## 配列を折り返してキューにする

固定長の配列から先頭要素を取り出すたびに残りを左へ詰めると、取り出しに件数分の移動がかかります。**リングキュー**では、取り出す位置を進め、配列の末尾から先頭へ折り返します。容量を `N`、次に読む位置を `head`、件数を `size` とすると、次に書く候補は `(head + size) % N` です。論理順で `i` 番目の要素も `(head + i) % N` にあります。

<figure class="study-figure">
  <img src="/images/algorithms/queues-and-deques.svg" alt="容量4の配列がA、B、C、Dで埋まった状態からAとBを取り出す。Eを配列の添字0に書くと、先頭は添字2のCのままで、論理順はC、D、Eになる。次に書く位置は添字1。" width="760" height="359" loading="lazy">
  <figcaption>取り出し順はC、D、Eです。物理的な添字は2、3、0の順に進みます。<a href="/study/images/algorithms/queues-and-deques.svg" target="_blank" rel="noopener noreferrer">折り返しの図を拡大</a></figcaption>
</figure>

| 状態・操作 | 判定と更新 |
| --- | --- |
| 空 | `size == 0`。取り出しを断る |
| 満杯 | `size == N`。新規挿入を断る |
| 挿入 | `(head + size) % N` に書いて `size` を1増やす |
| 取り出し | `head` の要素を読み、`head = (head + 1) % N` に進めて `size` を1減らす |

空でも満杯でも、式で求めた次の書き込み候補は `head` と同じです。件数を別に持つと区別でき、4枠すべてを使えます。以下のC++17例では `0` も値として入り、取り出せないときだけ `std::nullopt` が返ります。満杯で挿入を断ったときは、要素もカーソルも変えません。

```cpp
#include <array>
#include <cassert>
#include <cstddef>
#include <initializer_list>
#include <optional>

class IntRingQueue {
public:
    bool push(int value) {
        if (size_ == slots_.size()) return false;
        slots_[(head_ + size_) % slots_.size()] = value;
        ++size_;
        return true;
    }

    std::optional<int> pop() {
        if (size_ == 0) return std::nullopt;
        const int value = slots_[head_];
        head_ = (head_ + 1) % slots_.size();
        --size_;
        return value;
    }

private:
    std::array<int, 4> slots_{};
    std::size_t head_ = 0;
    std::size_t size_ = 0;
};

int main() {
    IntRingQueue queue;
    const auto empty = queue.pop();
    assert(!empty.has_value());

    for (int value : {10, 20, 30, 40}) {
        const bool inserted = queue.push(value);
        assert(inserted);
    }
    const bool insertedWhileFull = queue.push(99);
    assert(!insertedWhileFull);
    const auto first = queue.pop();
    const auto second = queue.pop();
    assert(first == 10 && second == 20);

    const bool wrapped = queue.push(50);
    assert(wrapped);
    const auto third = queue.pop();
    const auto fourth = queue.pop();
    const auto fifth = queue.pop();
    assert(third == 30 && fourth == 40 && fifth == 50);
}
```

この例で1回の挿入・取り出しに必要な配列操作は O(1) です。固定容量で満杯になったら、挿入を断る、呼び出し元に待機を伝える、古いデータを明示的に捨てるなど、用途に応じて動作を決めます。並行処理では、書き込みをいつ公開し、読み手が使い終えた枠をいつ再利用できるかも設計します。上のコードは単一スレッド用です。[リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)

## 配列と分割されたブロックを使い分ける

- **配列で作るキュー**では、要素用の領域をまとめて持てます。可変容量にするなら、拡張時に論理順で新しい配列へ移すため、拡張を伴う1回の挿入には O(n) かかります。.NETの `Queue<T>` は循環配列を使います。[.NETのQueue](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1)
- **ブロックに分けるデック**では、端に新しいブロックを追加でき、拡張のたびに全要素をまとめて移す構造を避けられます。C++の `std::deque` はランダムアクセスが可能で、先頭・末尾への1要素の挿入・削除は O(1)、途中への挿入・削除は O(n) です。`std::deque` の全要素が連続することは規定されていません。[C++規格草案のdeque](https://eel.is/c++draft/deque.overview) · [Microsoft STLのdeque実装](https://github.com/microsoft/STL/blob/main/stl/inc/deque)
- **既存コンテナの操作を絞る**なら、C++の `std::stack` と `std::queue` が使えます。既定の基盤はいずれも `std::deque` ですが、公開する端の操作は異なります。順序の規則をAPIに表せます。[C++規格草案のコンテナアダプター](https://eel.is/c++draft/container.adaptors)

容量を変えたときに何が移るかは[配列と動的配列](/algorithms/arrays-and-dynamic-arrays.html)、ノードをつないで端の操作を行う構造は[連結リスト](/algorithms/linked-lists.html)で確認できます。
