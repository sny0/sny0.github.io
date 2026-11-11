---
title: 二分ヒープと優先度付きキュー
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 完全二分木を配列に格納し、次に処理すべき要素を根から取り出す仕組みを調べる。
  aliases: [二分ヒープ, binary heap, min-heap, max-heap, 優先度付きキュー, priority queue, std::priority_queue, PriorityQueue, heapify]
  verification: C++のヒープ操作とpriority_queueの仕様、.NETのPriorityQueue公式資料に照合（2026-11-06）
---

# 二分ヒープと優先度付きキュー

ゲーム内で登録したイベントを、実行予定時刻の早い順に処理したいとします。**優先度付きキュー**を使うと、次に実行するイベントをすぐに確認でき、実行予定が早いイベントもあとから追加できます。**二分ヒープ**はその実装方法の一つで、優先度が最も高い要素を木の根に置きます。[C++作業草案のヒープ操作](https://eel.is/c++draft/alg.heap.operations)

## 親子の順序を守り、木を配列に置く

二分ヒープの形は**完全二分木**です。最後の段より上はすべて埋め、最後の段は左から詰めます。最小ヒープでは、どの親もその子以下です。この条件を根から子孫までたどると、根が最小と分かります。最大ヒープでは親が子以上になります。兄弟の間には大小の条件がないため、配列を先頭から読んでも全体はソート順になりません。

<figure class="study-figure">
  <img src="/images/algorithms/binary-heaps.svg" alt="最小ヒープの根は添字0の2。添字1の4と添字2の3が子で、その下に8、7、6がある。木を段ごとに左から配列へ置くと、2、4、3、8、7、6の順になる。" width="760" height="363" loading="lazy">
  <figcaption>添字1の4と添字2の3は兄弟です。この並びでも、どの親も子以下という条件を満たしています。<a href="/study/images/algorithms/binary-heaps.svg" target="_blank" rel="noopener noreferrer">配列と木の図を拡大</a></figcaption>
</figure>

0始まりの配列なら、添字 `i` の左の子は `2*i + 1`、右の子は `2*i + 2`、根以外の親は `(i - 1) / 2` の整数部分です。添字が配列の外に出る場合、その子はありません。親子をポインタでつなぐ代わりに、配列上の位置からたどれます。[動的配列の内部構造](/algorithms/arrays-and-dynamic-arrays.html) · [C++作業草案のヒープの定義](https://eel.is/c++draft/alg.heap.operations.general)

## 追加と取り出しでどこを直すか

| 操作 | 最小ヒープで行うこと | 要素数 `n` に対するコスト |
| --- | --- | --- |
| 最優先の確認（peek） | 根を見る | `O(1)` |
| 追加（push） | 末尾へ足し、親より小さい間だけ上へ移す | `O(log n)` のヒープ調整 |
| 最優先の削除（pop） | 根を取り除いて末尾の要素を置き、必要なら小さい方の子と交換しながら下へ移す | `O(log n)` |
| まとめて構築（heapify） | 葉の親から根へ、部分木ごとに下向きの調整を行う | `O(n)` |

追加・削除では木の1本の経路を直すため、調整の上限は木の高さです。動的配列の容量が足りなければ、追加には配列の再確保と要素の移動も発生します。まとめて構築するときは、多くのノードが葉に近く、下へ移す段数が短いため、全体で `O(n)` になります。[C++作業草案のpush_heap・pop_heap・make_heap](https://eel.is/c++draft/alg.heap.operations)

## 同じ時刻のイベントに順番を付ける

C++の `std::priority_queue` は既定で大きい値を先に出します。ここでは `std::greater` を指定し、`(実行時刻, 登録順)` の小さい組から処理します。時刻が同じときに登録順を保つには、比較に登録順を含めます。時刻だけを比較する場合、同じ時刻のイベントの順序は保証されません。[C++作業草案のpriority_queue](https://eel.is/c++draft/priority.queue)

```cpp
#include <functional>
#include <iostream>
#include <queue>
#include <utility>
#include <vector>

int main() {
    using Event = std::pair<int, int>; // (予定tick, 登録番号)
    std::priority_queue<Event, std::vector<Event>, std::greater<Event>> events;
    events.emplace(30, 0);
    events.emplace(10, 1);
    events.emplace(10, 2);
    events.emplace(20, 3);

    for (int tick = 0; tick <= 30; ++tick) {
        while (!events.empty() && events.top().first <= tick) {
            auto [dueTick, sequence] = events.top();
            events.pop();
            std::cout << dueTick << ':' << sequence << '\n';
        }
    }
}
```

出力は `10:1`、`10:2`、`20:3`、`30:0` の順です。C#では .NET 6以降の `PriorityQueue<TElement, TPriority>` が使えます。既定では小さい優先度から取り出すため、同じ例なら優先度に `(int Tick, int Sequence)` を指定します。.NETの実装は1ノードが最大4つの子を持つ配列ベースのヒープです。[.NETのPriorityQueue](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2?view=net-6.0)

到着順に処理するなら[FIFOキュー](/algorithms/queues-and-deques.html)が対応します。任意のキーを探したり、キー範囲を順に走査したりするなら[探索木](/algorithms/search-trees.html)を使えます。ヒープが保持する順序は親子の関係なので、優先度と無関係なイベントIDを探すには、別の索引がなければ最悪 `O(n)` の走査が必要です。
