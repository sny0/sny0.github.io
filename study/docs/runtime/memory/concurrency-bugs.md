---
title: 並行処理のバグ — data race・race condition・false sharing
study:
  source: C++ Wiki
  status: published
  summary: C++20のdata race、同期があっても起きるrace condition、性能に影響するfalse sharingを区別する。atomicやmutexの保証と、C#・Unityで確認する条件も整理する。
  verification: 一次資料照合（2026-11-04）
  section: reference
  format: article
  domain: runtime
---

# 並行処理のバグ — data race・race condition・false sharing

## 一言で言うと

- C++20でのdata race(データ競合)は、異なるスレッドの操作が競合し、少なくとも一方が非atomicで、どちらからどちらへもhappens-beforeの関係がない場合に起きる未定義動作です。
- **race condition(競合状態)**: 実行タイミング(順序)によって結果が変わる**論理**バグ。データ競合がなくても起きる
- **false sharing(偽共有)**: 別々のデータが同じ[キャッシュライン](/runtime/cpp-internals/cache-branch-simd.html)を共有し、書き込みに伴うコヒーレンシの処理で性能に影響する現象。それ自体はdata raceではなく、影響の大きさも条件による

ここは**バグの種類を調べる辞典**です。排他・同期・寿命を組み立てる手順は[スレッド間の安全なデータ共有](/runtime/thread-synchronization.html)、動作を確かめる題材は[在庫を共有する観察例](/practice/threads/inventory-synchronization.html)へ進んでください。

## data race

ここでは異なるスレッドを対象にします。一方が同じメモリ位置を書き換え、他方がそこを読んだり書いたりする操作は競合します。そのうち少なくとも一方が非atomicで、両者を順序付ける**happens-before**の関係がどちら向きにもなければ、data raceになります。「同じ時刻に実行されたか」をログで調べるだけでは判定できず、同じCPUコアで順番に実行されても、この関係がなければ問題になります。[C++20草案N4861: data raceの定義](https://timsong-cpp.github.io/cppwp/n4861/intro.races#21)

```cpp
// C++20の問題を説明する断片。スレッドを作って実行する例ではない。
int killCount = 0;
// スレッドA: ++killCount;   スレッドB: ++killCount;
// どちらも非atomicで、両者の間にhappens-beforeを作らない場合はdata race。
// 「読み→加算→書き」は操作の説明モデルで、CPU命令数の保証ではない。
// 結果が欠ける、必ず正常値になる、といった実行結果の契約はない。
```

C++は複数スレッドの実行を規定しています。data raceを含む実行はその規則で未定義動作とされるため、値の欠損だけを観察して挙動を一般化できません。「CPUやコンパイラはシングルスレッドしか想定していない」という説明ではありません。言語が認める[最適化](/runtime/cpp-internals/optimization-and-ub.html)と、プログラムが必要な同期を用意することを分けます。

次は二つの方式を示す操作の断片です。共有する変数とmutexはworker開始前に用意し、worker終了まで生存させます。カウンタが`int`の範囲を超えない呼び出し回数を前提にします。

```cpp
#include <atomic>
#include <mutex>

std::atomic<int> atomicCount{0};
std::mutex countMutex;
int guardedCount = 0;

// 方式1: atomicCount自体の加算を一つのatomic操作にする。
atomicCount.fetch_add(1);

// 方式2: guardedCountの関係する読み書きを、同じmutexで守る。
{ std::lock_guard lock(countMutex); ++guardedCount; }
```

`fetch_add`が一操作であることと、他の変数まで安全に読めることは別です。例えば`memory_order_relaxed`は対象atomicへの不可分な操作を保証しますが、それだけで別の通常データを公開する同期にはなりません。順序の保証は選んだ操作とメモリオーダーに従います。atomicであっても必ずロックフリーとは限りません。[N4861: atomicの順序](https://timsong-cpp.github.io/cppwp/n4861/atomics.order)、[ロックフリー性](https://timsong-cpp.github.io/cppwp/n4861/atomics.lockfree)

mutexでは、同じmutexの解放と後の取得が同期を作ります。共有状態の関係する読み書きを、その同じロックと必要な範囲でそろえることが重要です。「ロックすると全CPUのキャッシュを即座にRAMへ書き戻す」という契約ではありません。排他とhappens-before、終了待ちと寿命の関係は[同期の本文](/runtime/thread-synchronization.html)で扱います。[N4861: mutexの同期規則](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.requirements)

## race condition(データ競合とは別物)

```cpp
// 各メソッド自体は適切に同期済み、という仮定の擬似コード。
// 一連の処理をまとめる必要があることを示し、実行用APIは定義していない。
if (inventory.Count(potionId) > 0) {     // スレッドA: 在庫1を確認
    // ← ここでスレッドBが最後の1個を使った
    inventory.Remove(potionId);          // Aも消費 → 在庫-1(二重消費)
}
// 「確認してから使う」(check-then-act)が不可分でない、という設計の穴。
// 修正: 確認と消費を1つのロック区間に/「TryConsume」のような不可分APIに
```

**data raceをなくしてもrace conditionは残り得ます。** 個々の読み書きがatomicでも、「確認して消費する」という一連の処理の整合性まで自動的に守られるわけではありません。`TryConsume`の実装と不変条件は[在庫の観察例](/practice/threads/inventory-synchronization.html)を参照してください。

## false sharing

```cpp
// 各フィールドを別のスレッドだけが更新し、終了待ち後に結果を読む例の配置。
struct Counters {
    int threadA{0};   // 隣接するため、同じキャッシュラインに載る可能性がある。
    int threadB{0};
};
// 64byteのラインを想定し、配列要素間の距離を広げる配置の一例。
// 64という値や速度の改善を、すべてのCPUへ一般化しない。
struct alignas(64) PaddedCounter { int value{0}; };
```

同じラインを別コアから頻繁に書くなどの条件では、キャッシュのコヒーレンシに余分な処理が生じます。ラインの大きさ、配置、書き込み頻度、コアへの割り当てなどによって影響は変わり、固定倍率ではありません。false sharing自体は言語上のdata raceとは別ですが、同じプログラムに別の正しさのバグがないことまで保証しません。[Microsoftの実例と計測条件](https://learn.microsoft.com/en-us/archive/msdn-magazine/2008/october/net-matters-false-sharing)

配置とアクセスの分析から疑いを立て、条件をそろえた計測や、対応するハードウェアカウンタなどで影響を調べます。局所的に集計して終了待ち後に統合する、書き込み先を離すといった候補を比較します。パディングにも保持量を増やすコストがあるため、追加すれば常に速くなるとは考えません。

## ゲーム開発での現実的な指針

1. **共有する可変状態を減らす**: 入力をコピーまたは読み取り専用にし、出力をジョブごとに分けてから統合する候補を検討します（[Double Buffer](/game/patterns/optimization-patterns.html)）
2. **フェーズ間の境界を同期で作る**: 「更新後に描画する」という名前だけで順序は保証されません。ジョブの依存関係や完了待ちを設定し、書き手と読み手のアクセスが整合するようにします
3. **守る状態とロック範囲を決める**: 不変条件を一つのロック区間で守り、複数ロックを使うなら取得順序なども設計します。ロックを細かくすれば必ずデッドロックになるわけでも、粗ければ必ず遅いわけでもありません
4. **エンジンの依存関係・安全検査の条件を確認する**: UnityのNativeContainerでは、ジョブの読み書きや依存関係を安全システムが追跡します。ただし、対応するコンテナやアクセス経路、検査の有効条件を確認する必要があり、任意の共有状態やゲームの論理バグをすべて検出する仕組みではありません。[Unity 6のNativeContainer安全システム](https://docs.unity3d.com/6000.0/Documentation/Manual/job-system-native-container.html)

## C#との対応

- C++20のdata raceを未定義動作とする規則を、C#へそのまま移して説明しません。C#では型ごとの単純な読み書きの不可分性や、同期APIの規則を確認します。例えば`int`の単純な読み書きはatomicでも、`++`の読み・変更・書き全体がatomicになる保証はありません。「C#なら壊れ方が穏やか」とは判断できません。[C#仕様 §9.6](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/variables#96-atomicity-of-variable-references)
- `lock`は同じ対象のロック区間を排他にするための仕組みで、`Interlocked`は用意された単位のatomic操作を提供します。C#の`volatile`は一定の順序規則を持ちますが、`++`や複数操作をまとめた排他の代替ではありません。標準C++20の`volatile`もスレッド間同期の代替にはしません。[C#のlock](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)、[C#のvolatileの注意点](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/volatile)
- UnityのJob Systemの安全検査は上記の適用条件の中で役立ちます。一般の.NET、Unityの各実行系、C++標準ライブラリを一対一の置き換え表として扱わず、使うAPIと対象版を確認します

## Unity開発者が誤解しやすい点

1. Unityでもworkerやジョブへ処理を渡すなら、**どのデータを誰が触るか、完了をどこで待つか**を決めます。エンジン名だけでアクセスが安全になるわけではありません
2. atomic操作だけから、check-then-actや複数データの不変条件、寿命の安全まで導くことはできません。まず[mutexから始める同期の本文](/runtime/thread-synchronization.html)で、守る範囲を確認します
3. ログ出力で実行タイミングが変わり、症状が出なくなる場合があります。対応環境のThreadSanitizerなどのツールは調査の助けですが、検出されなかった実行だけを安全性の証明にはしません

## 理解度チェック

1. data raceとrace conditionの違いを、それぞれの修正手段と共に言えますか。
2. C++20のdata raceの条件で、非atomicな操作とhappens-beforeはそれぞれどう関わりますか。
3. false sharingを疑う配置とアクセスの特徴は何ですか。影響を比較する際にそろえる条件は?

## 演習

[在庫を共有する観察例](/practice/threads/inventory-synchronization.html)を使い、確認と消費を分けた論理上の問題と、`TryConsume`として同じロックで守る範囲を説明してください。どの読取りも同じ保護方針に従うか、worker終了前に共有状態を破棄しないかも確認します。data raceを含む非atomic版を実行して「必ず欠損する」などの結果を期待する課題にはしません。

---

関連項目：[メモリバグ図鑑](/runtime/memory/memory-bugs.html) / [学習ガイド](/runtime/memory/) / [キャッシュ局所性と AoS/SoA](/runtime/memory/cache-locality-aos-soa.html)

対象はC++20と、リンク先に示したC#・Unityの契約です。2026-11-04に一次資料と照合しました。短いコードは説明用の断片であり、false sharingの速度測定結果ではありません。動作確認の条件は[観察例](/practice/threads/inventory-synchronization.html)に記載します。
