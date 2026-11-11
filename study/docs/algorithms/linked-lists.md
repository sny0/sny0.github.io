---
title: 連結リスト — ノードを見つける処理とつなぎ替え
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 単方向・双方向リストのノードを図で追い、位置が分かっている場合の追加・削除と、値から位置を探す場合のコストを分ける。
  aliases: [連結リスト, linked list, 単方向リスト, 双方向リスト, ノード, std::list, std::forward_list, LinkedList<T>, splice]
  verification: C++作業草案とMicrosoft Learnに照合し、C#の例を.NET 5で実行（2026-11-06）
---

# 連結リスト — ノードを見つける処理とつなぎ替え

**連結リスト**は、値と次の要素へのリンクを持つ**ノード**をつないだ構造です。隣同士のノードが、メモリ上でも隣り合う必要はありません。ノードのリンクを書き換えると、途中の要素を外したり、新しい要素を差し込んだりできます。[C++のstd::list](https://eel.is/c++draft/list.overview) · [C++のstd::forward_list](https://eel.is/c++draft/forward.list.overview)

## 単方向は次へ、双方向は前にもたどれる

**単方向リスト**のノードは `next` を持ちます。`A → B → C` からBを外すには、Aの `next` をCに変更します。このときBのノードだけを知っていても、Bの前にあるAへは戻れません。先頭からAを探すか、前のノードを知っている場面で削除します。先頭だけを外すなら、リストが持つ先頭リンクを次へ進めます。[C++のforward_list::erase_after](https://eel.is/c++draft/forward.list.modifiers)

**双方向リスト**のノードは `next` と `prev` を持ちます。Bが分かっていれば、Bの `prev` からA、`next` からCにたどれます。途中のBを外すときは、Aの `next` をCへ、Cの `prev` をAへ向けます。端を外す場合は先頭・末尾へのリンクも更新します。[C++のlistの挿入と削除](https://eel.is/c++draft/list.modifiers)

<figure class="study-figure">
  <img src="/images/algorithms/linked-lists.svg" alt="単方向リストのA、B、Cは次へのリンクだけでつながる。双方向リストでBを外すと、AのnextはCへ、CのprevはAへ向かう。AとCの値は移動しない。" width="760" height="348" loading="lazy">
  <figcaption>矢印は論理上のリンクです。ノードの実際のアドレスは離れていても構いません。<a href="/study/images/algorithms/linked-lists.svg" target="_blank" rel="noopener noreferrer">ノードをつなぎ替える図を拡大</a></figcaption>
</figure>

## 位置を探すコストは別に数える

次の表は要素数 `n` のリストで、値1個の比較・構築・破棄を定数時間として数えたものです。ノードが既知という前提には、そのノードが現在も同じリストに属していることを含みます。

| 操作 | 単方向リスト | 双方向リスト |
| --- | --- | --- |
| 先頭から `i` 番目の位置へ進む | `i` 本の `next` をたどる | 先頭と末尾の両方を持つ場合は近い側からたどれる。中央まで `O(n)` |
| 値を探す | 最悪 `O(n)` | 最悪 `O(n)` |
| 既知のノードの直後に1個挿入 | `O(1)` | `O(1)` |
| 既知のノードを1個削除 | 先頭か、直前のノードも分かっていれば `O(1)`。途中の対象だけなら直前を探す | `O(1)` |
| 末尾へ1個追加 | 末尾リンクを保持する設計なら `O(1)` | 末尾リンクがあれば `O(1)` |

たとえば「アセットIDが7の読み込み要求を取り消す」とき、IDから探すなら、つなぎ替えが定数時間でも全体は最悪 `O(n)` です。追加時に取り消し用のノードを呼び出し側へ渡しておけば、あとから同じノードを指定して外せます。削除したノードを有効な位置として使い直さないように、取り消しと完了でトークンの状態を更新します。

## C++とC#の使い分け

C++の `std::list<T>` は双方向、`std::forward_list<T>` は単方向です。`std::list` では、1ノードの挿入で既存要素へのイテレーター・参照が無効にならず、削除で無効になるのは削除された要素を指すものだけです。単方向の `erase_after` は、消したいノード自身ではなく、その直前を受け取ります。[C++のlist.modifiers](https://eel.is/c++draft/list.modifiers) · [C++のforward.list.modifiers](https://eel.is/c++draft/forward.list.modifiers)

C#の `LinkedList<T>` は双方向で、ノードを `LinkedListNode<T>` として受け取れます。次の例では、登録時に受け取ったノードを使い、待機中の読み込み要求を一件だけ取り消します。`Remove(node)` は定数時間で、`Remove(value)` は一致する値を先頭から探します。例では、登録・取り消し・列挙を同じスレッドで順に行います。[MicrosoftのLinkedListクラス](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1?view=net-10.0) · [MicrosoftのLinkedList.Remove](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1.remove?view=net-10.0)

```csharp
using System;
using System.Collections.Generic;

var pending = new LinkedList<string>();
pending.AddLast("grass");
LinkedListNode<string> shadowRequest = pending.AddLast("shadow");
pending.AddLast("sky");

pending.Remove(shadowRequest);
Console.WriteLine(string.Join(", ", pending));  // grass, sky
```

アセットキャッシュで「直近に使った順」を保つ場合は、IDからノードを引く表とリストを組み合わせられます。C++なら `order.splice(order.begin(), order, entry)` で、同じ `std::list` 内の既知の1ノードを先頭へつなぎ替えられます。ID検索と、順序を更新する操作は別々です。[C++のlist::splice](https://eel.is/c++draft/list.ops)

## 全件を毎フレーム更新するなら配置を見る

ノードは値に加えてリンクを持ち、動的に作る実装ではノードごとの確保もかかります。ノードが離れていれば、順番にたどるときにキャッシュの同じラインを使い回しにくくなります。連続配置の配列とリストの走査はともに `O(n)` ですが、要素を読む実際のコストは変わります。弾やパーティクルの全件更新には[配列と動的配列](/algorithms/arrays-and-dynamic-arrays.html)、先頭から取り出すだけの待ち行列には[キューとデック](/algorithms/queues-and-deques.html)も候補です。[STLコンテナ](/languages/cpp/stl.html)
