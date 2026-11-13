---
title: ロックフリーの基礎 — CAS・リングキュー・メモリー回収
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: runtime
  summary: CAS と進行保証から、SPSC と MPMC のキュー設計、ABA 問題、ハザードポインターまでを整理する。
  aliases: [Lock-free, Wait-free, CAS, Compare-and-Swap, ABA 問題, SPSC, MPMC, Hazard Pointers]
  verification: C++20 最終作業草案 N4861、Michael・Scott（1996）、Michael（2004）、WG21 P2530R3 に照合（2026-11-13）
---

# ロックフリーの基礎 — CAS・リングキュー・メモリー回収

フレーム内で仕事を受け渡すキューは、同時に触れるスレッドの数で必要な仕組みが変わる。書き手と読み手が一つずつなら、カーソルをそれぞれ専有して値を公開できる。複数のスレッドが同じカーソルやリンクを更新する場合は、更新する権利を争う処理と、読み終わったメモリーを回収する処理まで考える。

## 進行保証と CAS

| 用語 | 何が進むか |
| --- | --- |
| ロックフリー | スレッドが操作を続けているとき、システム全体では操作の完了が続く。競合した一つのスレッドが何度も負ける可能性はある。 |
| ウェイトフリー | 各操作が、その操作自身の有限で上限のあるステップ数で終わる。OS が実行を再開させるまでの時間や、キューへ必ず投入できることまで保証するものではない。 |

`std::atomic<T>` の操作にロックが使われるかは型と実装で変わる。C++20 では `is_always_lock_free` または対象の `is_lock_free()` で調べられる。キュー全体の進行保証には、使うアトミックのほか、割り当て、回収、失敗時の再試行も影響する。

CAS は、現在の値が予想した値と一致したときだけ、新しい値に更新するアトミック操作。C++20 の `compare_exchange_weak(expected, desired, ...)` は、失敗したときに観測した値を `expected` へ書く。また、値が一致していても失敗することがあるため、繰り返す場合はその都度 `desired` を作り直す。下の `reserveNumber` は数値を一つ予約するだけなので `relaxed` を使える。データの公開に使うなら、そのデータに必要な [順序と可視性](/languages/cpp/memory-model.html) を別に設計する。

## SPSC と MPMC

```mermaid
flowchart LR
    P["Producer: 空きスロットに値を書く"] --> T["write を release で進める"]
    T --> C["Consumer: write を acquire で読んでから値を読む"]
    C --> H["read を release で進める"]
    H --> R["Producer: read を acquire で読んで空きを再利用"]
```

SPSC は書き手が 1 スレッド、読み手が 1 スレッド。下のコードでは書き手だけが `write` を、読み手だけが `read` を更新する。スロットそのものは通常の整数。書き手が値を書いた後で `write` を `release` で進め、読み手がその更新を `acquire` で観測してから読む。逆方向にも同じ関係を作り、読み終わってから同じスロットを上書きする。スロットを一つ空けて満杯と空を区別するため、4 スロットなら 3 件まで保持できる。

MPMC は書き手・読み手とも複数になり得る。カーソルを読むだけでは、二つのスレッドが同じスロットを選ぶ。たとえば有界リング方式では、CAS などで位置を予約し、スロットごとの世代番号で「この周回の書き込みが完了したか」を判定する。予約だけしたスレッドが停止したときに、後続の読み手が公開待ちで止まる方式もある。どの位置で他のスレッドが進めるかまで追って、進行保証を判断する。連結リスト方式の一例である Michael–Scott キューは、末尾リンクが付いた後に末尾カーソルの更新が残っていれば、他のスレッドがその更新を進められる。

## ABA とハザードポインター

スレッド 1 が `head=A` を読んだ後、スレッド 2 が A と次のノードを取り外し、同じアドレス A が再び `head` に現れるとする。スレッド 1 の CAS はアドレスの一致だけを見るため、その間の更新を見逃すことがある。これが ABA 問題。世代番号付きポインターは、比較にアドレスと世代を使う手法。世代が一周するまで古い値を保持できるかや、両者をまとめてアトミックに更新できるかも考える。

アドレスが変わっていなくても、他のスレッドがノードを解放していれば、読もうとした時点でオブジェクトの寿命を過ぎている。ハザードポインターは「自分はこのノードを参照する可能性がある」と公開する。読み手は候補を取得し、保護を公開してから、共有元にまだ同じ候補があるか確認して参照する。ノードを取り外した側はすぐには解放せず、保護中のノードに含まれないことを手順に沿って確認してから回収する。C++20 の標準ライブラリーにこの機能は含まれず、WG21 P2530R3 は C++26 に向けたハザードポインター API の提案を示している。順序の選び方と回収のタイミングも含むアルゴリズムなので、公開と再確認だけを写して実装を作ると、回収側と競合する可能性がある。

## コード例 — CAS で番号を取り、SPSC で渡す

C++20 のプログラム。`tryPush` は満杯なら `false`、`tryPop` は空なら `false` を返す。再試行のポリシーは呼び出し側にあり、下のサンプルは 1,000 個の番号を順番に受け取るまで再試行する。製品のキューでは、フレームを止めずに済む上限や、満杯時に何をするかを呼び出し側で決める。

```cpp
#include <array>
#include <atomic>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <thread>

std::uint32_t reserveNumber(std::atomic<std::uint32_t>& next) noexcept
{
    auto expected = next.load(std::memory_order_relaxed);
    for (;;)
    {
        const auto desired = static_cast<std::uint32_t>(expected + 1u);
        if (next.compare_exchange_weak(expected, desired,
                                       std::memory_order_relaxed,
                                       std::memory_order_relaxed))
        {
            return expected;
        }
    }
}

class SpscQueue
{
    static constexpr std::size_t slots = 4;
    std::array<std::uint32_t, slots> data{};
    std::atomic<std::size_t> read{0};
    std::atomic<std::size_t> write{0};

public:
    bool tryPush(std::uint32_t value) noexcept
    {
        const auto cursor = write.load(std::memory_order_relaxed);
        const auto next = (cursor + 1) % slots;
        if (next == read.load(std::memory_order_acquire))
        {
            return false;
        }
        data[cursor] = value;
        write.store(next, std::memory_order_release);
        return true;
    }

    bool tryPop(std::uint32_t& value) noexcept
    {
        const auto cursor = read.load(std::memory_order_relaxed);
        if (cursor == write.load(std::memory_order_acquire))
        {
            return false;
        }
        value = data[cursor];
        read.store((cursor + 1) % slots, std::memory_order_release);
        return true;
    }
};

int main()
{
    constexpr std::uint32_t count = 1000;
    std::atomic<std::uint32_t> next{0};
    SpscQueue queue;

    std::jthread producer([&]
    {
        for (std::uint32_t i = 0; i < count; ++i)
        {
            const auto number = reserveNumber(next);
            while (!queue.tryPush(number))
            {
                std::this_thread::yield();
            }
        }
    });

    std::uint64_t sum = 0;
    bool ordered = true;
    for (std::uint32_t expected = 0; expected < count; ++expected)
    {
        std::uint32_t value = 0;
        while (!queue.tryPop(value))
        {
            std::this_thread::yield();
        }
        ordered = ordered && value == expected;
        sum += value;
    }
    producer.join();
    std::cout << "in order: " << std::boolalpha << ordered
              << ", sum: " << sum << '\n';
    return ordered && sum == 499500 ? 0 : 1;
}
```

出力は `in order: true, sum: 499500`。値は `0` から `999` なので、合計は `999 * 1000 / 2`。サンプルの番号予約は一つの書き手から呼び、CAS の使い方を示している。番号のアトミックを複数の書き手で共有しても、SPSC キューの書き手を増やせるわけではない。`tryPush` と `tryPop` 自体に再試行ループはなく、サンプル全体の再試行は相手側の進行に依存する。

## 理解度チェック

<details><summary>CAS が失敗した。失敗前に作った desired をそのまま使ってよい？</summary>

更新後の値が `expected` に依存するなら作り直す。C++ の CAS が失敗したとき、`expected` には観測された値が入る。

</details>

<details><summary>SPSC で Consumer が read を release で進めるのはなぜ？</summary>

読み手がスロットを読み終えたことを、同じ `read` を `acquire` で観測する書き手へ伝える。書き手はその後でスロットを再利用できる。

</details>

<details><summary>ポインターに世代番号を付ければ、外したノードを直ちに解放してよい？</summary>

世代番号は CAS が変更を見逃す問題に対処する。参照中のノードの寿命は、ハザードポインターなどの回収方式で別途保証する。

</details>

## 関連項目

- [C++ メモリモデル](/languages/cpp/memory-model.html)
- [スレッドと同期](/runtime/thread-synchronization.html)
- [SPSC リングバッファー](/browser/spsc-ring-buffer.html)
- [容量制限付きワーカーキュー](/runtime/bounded-worker-queues.html)

## 参考資料

- [WG21 N4861 — C++20 最終作業草案 `intro.progress](https://timsong-cpp.github.io/cppwp/n4861/intro.progress)
- [WG21 N4861 — C++20 最終作業草案 `atomics.types.operations](https://timsong-cpp.github.io/cppwp/n4861/atomics.types.operations)
- [Maged M. Michael・Michael L. Scott — Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms（PODC 1996、訂正版擬似コード）](https://www.cs.rochester.edu/research/synchronization/pseudocode/queues.html)
- [Maged M. Michael — Hazard Pointers: Safe Memory Reclamation for Lock-Free Objects（2004）](https://research.ibm.com/publications/hazard-pointers-safe-memory-reclamation-for-lock-free-objects)
- [WG21 P2530R3 — Hazard Pointers for C++26](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/p2530r3.pdf)
