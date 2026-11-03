---
title: スレッドと同期 — 共有状態の不変条件をmutexとlockで守る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: runtime
  summary: 在庫の確認から消費までを一つのクリティカルセクションにまとめ、読み取りも同じロックで守る。C++とC#の排他、更新の受け渡し、Snapshot、joinと共有物の寿命、デッドロックを区別する。
  aliases: [thread synchronization, スレッド同期, mutex, ミューテックス, std::mutex, lock_guard, クリティカルセクション, critical section, lock, Monitor, 排他制御, 不変条件, happens-before, synchronizes-with, Snapshot, join, デッドロック]
  verification: 一次資料照合（2026-11-04）
---

# スレッドと同期 — 共有状態の不変条件をmutexとlockで守る

複数のスレッドから同じデータを使うときは、**どの読み書きを一つの操作として扱い、どの条件を守るか**を先に決めます。「変数を一個ずつ壊さずに書く」だけでは、確認と更新を合わせた処理の正しさまでは保証できません。

ここではC++20の`std::mutex`と`std::lock_guard`、C#の専用`object`に対する`lock`を中心に説明します。プロセスとスレッドの区別、並行実行と並列実行の違いは[プロセスとスレッド](/os/process-startup.html)を参照してください。スレッドが複数あっても、常に複数のCPUで同時に実行されるわけではありません。

## 共有状態と不変条件

初期在庫N個から、一回につき一個を消費する例を考えます。Nは0以上で、在庫は勝手に補充せず、個数が整数型の範囲内に収まるものとします。共有する状態は「残数」と「消費数」です。

**不変条件**（invariant）は、操作の外から状態を観察するときに保つ条件です。この例なら、次を一緒に守ります。

- 残数と消費数は、ともに0以上。
- 残数＋消費数＝初期在庫N。
- 残数が0なら消費に失敗し、状態を変えない。
- 一回の成功で残数を一つ減らし、消費数を一つ増やす。

更新の途中には、片方だけを書き換えた瞬間があります。その中間状態を別スレッドから観察させないよう、**確認と二つの更新を同じ保護範囲**へ入れます。

## 「確認してから消費する」を分けない

「残数があるか確認する」関数と「残数を減らす」関数が、それぞれ内部でロックしていても、二回の呼出しの間には別スレッドが入れます。在庫1個をAとBがそれぞれ確認した後、両方が消費できると判断する流れが作れてしまいます。

このように複数の処理の組合せや順序で起きる問題と、言語が定義する**データ競合**（data race）は区別します。C++では、同じメモリ位置への競合する操作の少なくとも一方が非atomicで、必要な順序関係がない場合、データ競合となり未定義動作に至ります。各関数の個々の読み書きに競合がなくても、確認と消費の分離による仕様上の競合は残り得ます。[C++20草案N4861: intro.races](https://timsong-cpp.github.io/cppwp/n4861/intro.races)

解決の単位は、「一つ消費を試みる操作」です。在庫の確認から更新までを、**クリティカルセクション**（同じロックで守る操作を、スレッド間で重ねずに実行する範囲）としてまとめます。

<figure class="study-figure">
  <img src="/images/threads/check-and-consume.svg" alt="残数の確認と消費を別々に保護すると、在庫一個を二つのスレッドが確認できてしまう。一つのクリティカルセクションに確認と更新をまとめると、先に消費した後の状態を次のスレッドが確認する図。" width="760" height="1600" />
  <figcaption><strong>ロックの個数より、何を一つの操作として守るかが重要。</strong> 上段も各操作の中では同じロックを使い、C++のデータ競合がない前提です。それでも操作全体の規則を破り得ます。取得順は説明用の一例です。<a href="/study/images/threads/check-and-consume.svg" target="_blank" rel="noopener noreferrer">確認と消費の図を拡大</a></figcaption>
</figure>

## C++のmutexとlock_guard

**mutex**（ミューテックス）は、同じmutexの所有権を一度に一つのスレッドへ与える排他の仕組みです。`std::lock_guard`は、生成時にロックし、自身の寿命が終わるとアンロックします。スコープと資源の所有を結び付けるRAIIの使い方です。[N4861: thread.mutex.class](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.class)、[thread.lock.guard](https://timsong-cpp.github.io/cppwp/n4861/thread.lock.guard)

次は、在庫オブジェクトのメソッド内部の要点です。`gate_`はそのオブジェクトの`std::mutex`、残数と消費数は外部から直接書き換えないメンバーとします。

```cpp
std::lock_guard<std::mutex> guard(gate_);
if (remaining_ == 0) return false;
--remaining_;
++consumed_;
return true;
```

早い`return`でも、通常の例外によるスコープ退出でも、構築済みのガードの破棄でロックを解放します。手作業の`lock()`と`unlock()`を複数の分岐へ散らす必要が減ります。ただし、**ロック解放は途中の状態変更を自動で巻き戻す機能ではありません。** 例外を投げ得る処理を追加する場合は、不変条件を保てる更新の順序も設計します。

mutex自身も、ガードによる解放を含め、そのmutexを使うすべての操作が完了するまで有効である必要があります。破棄したmutexをガードが後から解放するような寿命関係にはできません。今回の実践では、全workerの終了待ちまでmutexを保持します。[N4861: lock_guardの寿命要件](https://timsong-cpp.github.io/cppwp/n4861/thread.lock.guard)

## C#のprivate objectとlock

C#では、在庫ごとに外部へ公開しないロック専用の`private readonly object _gate = new();`を持たせ、同じインスタンスに対して`lock`します。次もメソッド内部の要点です。

```csharp
lock (_gate)
{
    if (_remaining == 0) return false;
    --_remaining;
    ++_consumed;
    return true;
}
```

この`object`経路は`Monitor.Enter`と`Monitor.Exit`を使う処理に対応し、`finally`により通常の例外でもロックを解放します。`this`、共有され得る文字列、`Type`などを安易にロックの対象にすると、外部のコードと同じロックを使ってしまう可能性があります。[Microsoft: C# lock statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)

### 再入性と新しいLock型は区別する

C#の`object`に対する`lock`／Monitorは**再入可能**です。同じスレッドは、所有中の同じロックへ再び入れます。一方、C++の`std::mutex`は非再帰で、既に所有している同じスレッドが再度取得してよい契約ではありません。C#で成立する入れ子の呼出しを、そのままC++へ移植しないようにします。再入できることも、不変条件の更新途中へ呼び戻して安全であることの保証にはなりません。[Microsoft: lock](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)、[N4861: mutexの取得条件](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.requirements.mutex)

.NET 9／C# 13以降には、式の型が`System.Threading.Lock`だと分かると`EnterScope()`を使う別の経路もあります。本記事と実践サンプルは、比較する対象を**privateな`object`を使うMonitor経路**にそろえています。C#の`lock`がどの環境でも常に同じ展開になる、とは説明しません。[Microsoft: lockの型による違い](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)

## 排他だけでなく、更新を受け渡す順序を作る

C++では、同じmutex Mに対する`unlock()`と、**その後にMの所有権を取得するロック操作の間に、synchronizes-withの関係**があります。これはスレッド間の同期を結び付ける規則です。ロックを取得できていない状態や、別のmutexを使う経路を、同じ同期とみなすことはできません。[N4861: mutexの同期規則](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.requirements.mutex)

一つのスレッド内の処理順と、この同期の関係をつなぐと、**happens-before**という「先の処理を後の処理へ順序付ける関係」が成立します。例えば、Aが保護中に更新して解放し、Bが同じmutexを取得して読む、という経路で共有状態を受け渡せます。これは時計で先に実行されたように見えることや、ログの表示順とは別の、言語の規則です。[N4861: intro.races — happens-before](https://timsong-cpp.github.io/cppwp/n4861/intro.races)

この保証を「ロックのたびに全CPUのキャッシュをすべてflushする」「unlockした瞬間、無関係な全スレッドが最新値を読む」と説明しません。必要な命令や待機の実装は、処理系とCPUに依存します。使う側は、共有状態をどの同期の経路で扱うかを守ります。

## 読み取りも同じロックで守り、値をコピーして返す

書き手だけがロックしていても、読み手が無保護で残数を読むなら、その読み取りは保護されません。残数と消費数を別々に取得すると、二つの呼出しの間に状態が進み、同じ時点の組にならないこともあります。

この例では**Snapshot**（その時点の値の組）を取得する操作も同じロックに入れます。保護中に残数と消費数を値としてコピーし、ロックを解放してから表示や検査をします。更新の中間ではなく、一つの整合した組として読み取れます。コピー後に在庫が進んでも、Snapshotは取得時の値のままです。

内部メンバーへの参照や、変更可能な共有オブジェクトへのポインタを返すだけでは、コピー後の独立した値になりません。Snapshotが共有参照を含む設計なら、その参照先にも別の寿命・同期の検討が必要です。今回の在庫では個数の値だけを受け渡し、表示処理をロック内へ持ち込みません。

<figure class="study-figure">
  <img src="/images/threads/lock-publication-and-join.svg" alt="同じmutexのunlockから次の取得へ更新を受け渡す関係と、ワーカー終了からjoinの正常復帰へつながる関係を分けた図。共有状態の読み取りは同じロックで値をコピーし、全ワーカーの終了後に共有物を破棄する。" width="760" height="1450" />
  <figcaption><strong>実行中の共有状態を守ることと、完了を待つことは別の仕事。</strong> 矢印は同期による順序関係で、キャッシュ全体のコピーや、各スレッドの実行速度を示しません。<a href="/study/images/threads/lock-publication-and-join.svg" target="_blank" rel="noopener noreferrer">更新の受け渡しとjoinの図を拡大</a></figcaption>
</figure>

## スレッド開始・join・共有物の寿命

共有する在庫とmutexは、ワーカーを開始する前に準備します。C++の`std::thread`では、コンストラクター呼出しの完了が、新しいスレッドで関数のコピーの呼出しを開始することと同期します。その後も共有物を変更するなら、引き続き決めたロックが必要です。[N4861: thread.thread.constr](https://timsong-cpp.github.io/cppwp/n4861/thread.thread.constr)

`join()`は、対象スレッドの終了まで呼出し側を待たせます。C++では、対象スレッドの完了が、対応する`join()`の正常な復帰と同期します。ワーカーが書く結果を完了後に利用したり、ワーカーが参照するオブジェクトをその後で破棄したりするための境界です。[N4861: thread.thread.member](https://timsong-cpp.github.io/cppwp/n4861/thread.thread.member)

**最後にjoinすれば、実行中のデータ競合まで修正できるわけではありません。** 他のスレッドがまだ更新中なら、読み取りの同期も必要です。スレッド作成の途中で例外になった場合も、既に開始したワーカーを取り残さず、共有物の破棄前に完了を待つ所有関係を設計します。C++の`std::thread`は、joinableなままデストラクターへ入ると`std::terminate`を呼びます。[N4861: thread.thread.destr](https://timsong-cpp.github.io/cppwp/n4861/thread.thread.destr)

実践のC++版は`std::jthread`を使い、破棄時にjoinableなら停止要求後にjoinしますが、停止要求はワーカーの協調を必要とし、強制停止ではありません。[N4861: jthreadのデストラクター](https://timsong-cpp.github.io/cppwp/n4861/thread.jthread.cons#12)、[停止要求](https://timsong-cpp.github.io/cppwp/n4861/thread.stoptoken)

C#の`Thread.Join()`も、対象スレッドの終了を待つAPIです。タイムアウト付きの版では、時間切れと終了を区別します。待機したつもりで共有資源を解放せず、実際に完了したことを確認します。[Microsoft: Thread.Join](https://learn.microsoft.com/en-us/dotnet/api/system.threading.thread.join?view=net-10.0)

## 待機、デッドロック、性能

他のスレッドがmutexを所有していれば、ロック取得は待機することがあります。どのスレッドが次に走るか、各ワーカーが何回成功するかはスケジュールにも依存します。今回の仕組みから、先着順の公平性、一定時間内の取得、ワーカー数に比例した高速化は保証できません。

同じ在庫を守る部分は、一度に一つのスレッドしか処理できません。ワーカーを増やすとロックの取り合いが増える場合もあります。成功回数の分布やログの出力順を、正しさの固定期待値にはしません。

**デッドロック**は、互いに相手の解放などを待ち、先へ進めなくなる状態です。AがロックXを持ってYを待ち、BがYを持ってXを待つと循環します。複数のロックを使う場合は、取得順序を統一するなど、待ちの関係を設計します。

ロック中に外部のコールバックを呼ぶと、その先で別のロックを取得したり、同じ在庫へ入り直したりするかもしれません。長い入出力や、ワーカーの完了待ちを持ち込むことも、待機関係を複雑にします。**必要な状態だけを保護し、未知の処理や表示は保護範囲の外へ分ける**方針を基本にします。C#で再入できても、複数のロックの循環が消えるわけではありません。

## atomic・Interlocked・volatileとの境界

`std::atomic`やC#の`Interlocked`は、共有変数の読み書きや更新を不可分に扱う別の道具です。ただし個々の操作を並べただけで、複数項目の不変条件や「確認してから消費」の全体が自動的に保護されるわけではありません。別の同期設計はできますが、今回の教材では共有状態を一つのロックで守ります。[Microsoft: Interlocked](https://learn.microsoft.com/en-us/dotnet/api/system.threading.interlocked?view=net-10.0)

C++20の`volatile`もC#の`volatile`も、今回の複数操作をまとめた排他の代わりにはなりません。両言語の`volatile`の保証が同じという意味でもありません。「volatileを付ければ常に最新値で安全」と判断せず、必要な排他と順序を持つ道具を選びます。[N4861: data races](https://timsong-cpp.github.io/cppwp/n4861/intro.races)、[Microsoft: C# volatile](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/volatile)

競合や寿命の失敗例は[並行処理のバグ](/runtime/memory/concurrency-bugs.html)、完全な所有関係と検査を含むコンソール例は[在庫の確認と消費をC++／C#で同期する](/practice/threads/inventory-synchronization.html)へつなぎます。この単位ではUnity上の動作検証はしていません。Unityへ持ち込む際は、使用するAPIのスレッド条件を個別に確認します。
