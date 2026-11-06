---
title: C++の有界キューと条件変数
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: runtime
  summary: 要求と結果の待ち行列に上限を設ける。条件変数で空きとデータを待ち、フレーム側で結果を回収してからワーカーを終了する。
  aliases: [有界キュー, bounded queue, producer consumer, condition variable, std::condition_variable, std::unique_lock, notify_one, notify_all, backpressure, バックプレッシャー, close, drain]
  verification: C++20草案N4861の条件変数・mutex・joinに照合（2026-11-06）
---

# C++の有界キューと条件変数

メッシュを読み込む処理では、要求を出す側、データを準備するワーカー、結果を受け取る描画側が、それぞれ違う速さで進みます。ワーカーが満杯のキューへ結果を入れようとすると、空きができるまで待ちます。要求側のキューも満杯になれば、要求を出す側まで待ちが伝わります。このように下流の空きに合わせて上流を調整することを**バックプレッシャー**と呼びます。[スレッドと同期](/runtime/thread-synchronization.html) · [アセットを描画スレッドへ渡す](/game/asset-worker-handoff.html)

<figure class="study-figure">
  <img src="/images/threads/bounded-worker-queues.svg" alt="要求側が有界の要求キューへ投入し、二つのワーカーが処理した結果を有界の結果キューに入れる。結果キューが満杯になるとワーカーが空きを待つ。終了時は要求の受付を閉じ、フレーム側が結果を取り続け、ワーカーの終了と残りの結果を確認する。" width="760" height="430" loading="lazy">
  <figcaption>満杯になったキューでは投入側が空きを待ちます。終了中もフレーム側が結果を取り出せば、ワーカーは待ちを抜けて残りの処理を進められます。<a href="/study/images/threads/bounded-worker-queues.svg" target="_blank" rel="noopener noreferrer">キューと終了順の図を拡大</a></figcaption>
</figure>

## ワーカー数とキューの容量を決める

**有界キュー**は、同時に格納できる要素の数を制限する待ち行列です。例えば要求を2件まで、結果を1件までとし、ワーカーを2本置きます。キューから取り出した仕事はワーカーが保持します。二つのキューが満杯で各ワーカーが1件ずつ持つ瞬間は、待機中の要求2件、処理中または公開待ちの仕事2件、回収待ちの結果1件があります。キューへ投入しようとして待っている側や、回収済みのデータもメモリの予算に含めます。

ワーカーを増やすと同時に担当できる仕事が増え、キューを広げると後で処理するために保持できる仕事が増えます。要素によってサイズが異なる場合は、件数とバイト数の両方に上限を設けると、大きなメッシュの結果が重なった場合も予算に収められます。満杯時の動作は受付の契約にします。例えばバックグラウンドの要求側は空きを待ち、フレーム内の要求側は満杯を受け取って後で再試行します。[アセットの依存関係と予算](/game/asset-loading.html)

## 共有状態を調べてから条件変数で待つ

同じmutexでキュー本体と受付状態 `closed_` を守ります。投入側は空きができるか受付が閉じるまで、取出し側はデータが入るか受付が閉じるまで待ちます。例えば次のように、ロックを取得した上で待つ条件を渡します。

```cpp
// push: wait for a free slot, or for close to reject the push.
std::unique_lock lock(mutex_);
not_full_.wait(lock, [&] { return closed_ || queue_.size() < capacity_; });
```

```cpp
// pop: wait for an item, or for close to let an empty queue finish.
std::unique_lock lock(mutex_);
not_empty_.wait(lock, [&] { return closed_ || !queue_.empty(); });
```

述語が偽なら、`wait`はmutexの解放と待機への移行を一体で行います。起きるとmutexを取り直し、述語を確認します。通知のあとに別のワーカーが先に要素を取ったり、通知なしで待機が解除されたりする場合があるので、ロックを取り直した時点の状態で進めるか決めます。[C++20草案の条件変数と述語付きwait](https://timsong-cpp.github.io/cppwp/n4861/thread.condition.condvar)

投入では受付が開いていれば要素を追加し、取り出しを待つ側に `notify_one()` で知らせます。取出しでは要素を移してキューから消し、空きを待つ側に `notify_one()` で知らせます。共有状態をロック中に更新したあと、ロックを解放して通知する形にできます。別スレッドへ結果を渡す順序は、更新した側の `unlock()` と同じmutexを取得する側の `lock()` がつなぎます。通知を受ける時点までに待ち始めていないスレッドも、あとでロックを取り、状態を調べて進めます。[C++20草案のmutexによる同期](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.requirements.mutex) · [C++20草案の条件変数](https://timsong-cpp.github.io/cppwp/n4861/thread.condition.condvar)

## フレーム側は、受け取れる分だけ処理する

キュー内で行うのは、空きやデータの有無の確認、要素の追加や移動です。ワーカーのデコードや、フレーム側の登録は、キューから取り出したあとにロックの外で進めます。処理中のデータの所有者を一つに決めておけば、次のスレッドへ移したあとに元の所有者が書き換える経路も避けられます。[スレッドと同期](/runtime/thread-synchronization.html) · [アセットを描画スレッドへ渡す](/game/asset-worker-handoff.html)

例えばフレームの先頭で `try_pop` を1回呼びます。結果があれば1件だけ取り出し、空なら次の処理へ進みます。ここでの `try_pop` はデータが入るまで条件変数で待たない操作です。内部で通常のmutexを取る実装では、他スレッドがロックを持っている間は取得待ちがあり得ます。ロック取得も待たずに進みたい場合は、`try_lock()` が失敗したときの扱いを決めます。取得失敗はキューを調べて空だった場合と区別できます。[C++20草案のlockとtry_lock](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.requirements.mutex)

## 受付を閉じ、残りを回収して終了する

この構成の `close()` は、新しい投入の受付を止め、すでに入っている要素は受け取れるようにする操作です。mutexを取って `closed_` を設定し、空きを待つ側とデータを待つ側の両方を `notify_all()` で起こします。投入側は閉じた状態を見て失敗を返し、取出し側は残りを受け取り、閉じていて空なら終了します。[C++20草案のnotify_allとwait](https://timsong-cpp.github.io/cppwp/n4861/thread.condition.condvar)

1. 要求キューを閉じます。ワーカーは受付済みの要求を取り出し、結果を送ります。
2. フレーム側はその間も結果を回収します。最後の結果の投入が済んだら、結果キューも閉じます。終了の管理役を別に置き、全ワーカーの終了を確認してから結果キューを閉じる構成も取れます。
3. 閉じた結果キューが空になり、各スレッドの `join()` が戻ってからキューを破棄します。結果のうち、画面切替などで現在の世代から外れたものは受け取った上で破棄できます。[C++20草案のjoin](https://timsong-cpp.github.io/cppwp/n4861/thread.thread.member) · [結果の採用と世代](/game/asset-worker-handoff.html)

結果キューが満杯のまま、結果を取り出す唯一のスレッドが先にワーカーの `join()` を呼ぶと、取出し側はワーカーの終了を待ち、ワーカーは結果キューの空きを待ちます。互いに必要な処理が進まないので、終了を待つ前にフレーム側の回収を続けるようにします。[要求と結果をキューで渡すC++実践](/practice/threads/asset-worker-handoff-observation.html)
