---
title: 世代付きハンドル — 再利用したIDを区別する
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: スロット番号と世代番号で対象の入れ替わりを検出し、世代番号が周回する場合や別スレッドで使う場合の条件を調べる。
  aliases: [世代付きハンドル, 世代付きID, generational handle, generation counter, slot map, entity aliasing, スロット再利用]
---

# 世代付きハンドル — 再利用したIDを区別する

敵Aを追う弾が、敵の配列の位置 `2` を記録したとします。Aが消えたあと、その空き枠を敵Bに使うと、位置だけを持っていた弾はBを追い始めます。**世代付きハンドル**は、スロット番号と、そのスロットが何代目かを表す世代番号を組み合わせます。EnTTでは、エンティティの識別子を解放すると、通常は版番号を進めてから再利用します。[EnTTの識別子と版番号](https://skypjack.github.io/entt/md_docs_2md_2entity.html)

## 空き枠を再利用するたびに世代を進める

<figure class="study-figure">
  <img src="/images/algorithms/generational-handles.svg" alt="スロット2の敵Aは世代5。解放して世代を6に進め、同じスロットを敵Bへ割り当てる。位置2だけを保存すると敵Bが返るが、古いハンドルの世代5はスロットの世代6と一致せず無効になる。" width="760" height="280" loading="lazy">
  <figcaption>スロット番号が同じでも、世代が変われば古いハンドルを拒否できます。<a href="/study/images/algorithms/generational-handles.svg" target="_blank" rel="noopener noreferrer">スロット再利用の図を拡大</a></figcaption>
</figure>

1. 空きスロットに対象を置き、スロット番号と現在の世代を返します。
2. 参照するときは、番号がテーブルの範囲内か、スロットが使用中か、世代が一致するかを確認します。固定長のスロット表なら、表の参照と照合は定数回です。
3. 解放する側も同じ条件を確認します。使用中の値を取り除き、世代を進めてから、そのスロットを次の割り当てに戻します。二度目の解放や、別の世代に対する解放は拒否します。

ECSでデータを密な配列に置く場合、**スロット番号と密な配列の添字は別々**です。例えばスロット2に格納位置を持たせ、末尾の要素を移す削除で位置が変わったら、その対応だけを更新します。対象が生きている間は同じハンドルで引き直せます。スロットを別の対象に使うときに世代を進めます。[スパースセットとECS](/algorithms/sparse-sets.html) · [オブジェクトプール](/game/patterns/object-pool.html)

## 世代番号が一周すると、同じ値に戻る

世代を2ビットにすると、`0 → 1 → 2 → 3 → 0` と進みます。同じスロットを4回解放して再利用すると、最初に保存した `（0, 0）` が別の対象の値と一致します。この性質は世代の**周回**によるものです。Bevyの資料にも、世代が周回すると異なるエンティティの値が一致し得ることが記載されています。[BevyのEntityGeneration](https://docs.rs/bevy/latest/bevy/ecs/entity/struct.EntityGeneration.html)

世代番号に使う範囲を広げると、番号が一周するまでの再利用回数を増やせます。周回を許さない設計では、上限に達したスロットは解放後に再利用せず、次の割り当てには別のスロットを使います。この方式では、長時間動くシステムで再利用できなくなった枠をどう扱うかも決めます。[2ビットの世代を使った実験](/practice/algorithms/generational-handle-observation.html)

## どこでハンドルが通用するか決める

同じ番号と世代は、別のワールドやプールでも発行できます。どの管理表のハンドルかを利用側が把握し、別の管理表に渡る設計なら識別子も含めます。セーブデータやネットワーク越しに対象を引く場合は、その範囲で有効なIDの契約を用意します。[BevyのEntityと識別子の範囲](https://docs.rs/bevy_ecs/latest/bevy_ecs/entity/struct.Entity.html)

複数スレッドで使う場合、ハンドルの照合後に他スレッドが対象を解放することがあります。照合から利用まで同じロックで保護する、操作を管理スレッドに送るなど、対象の寿命を保つ仕組みも必要です。非同期の読み込み結果でも、世代を照合して結果の適用先を確かめ、使わない結果が持つ資源は回収します。[スレッドと同期](/runtime/thread-synchronization.html) · [アセットロードの取消しと世代](/game/asset-loading.html)
