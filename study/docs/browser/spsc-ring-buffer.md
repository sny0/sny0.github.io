---
title: リングバッファとSPSCキュー — 満杯・折り返し・受け渡し
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: 固定長の配列を先頭と末尾でつなぎ、読み書きの位置で空と満杯を区別する。書き手と読み手が一人ずつの共有キューで、値を公開し、読み終えた枠を再利用する順序を図解する。
  aliases: [リングバッファ, ring buffer, circular buffer, SPSC, single producer single consumer, FIFO, cursor, キュー, 満杯, 折り返し, バックプレッシャー]
  verification: LinuxのCircular Buffers文書とECMAScriptのAtomics・メモリモデルに照合（2026-11-05）
---

# リングバッファとSPSCキュー — 満杯・折り返し・受け渡し

**リングバッファ**は固定長の配列を、末尾の次が先頭につながるものとして使う方式です。キューとして使うと、入れた順に取り出す **FIFO**（first in, first out）になります。例えば別の処理が作った音声サンプルや読み込み済みのアセットを順番に渡すとき、渡し先が一時的に遅れても、決めた件数まで待ち行列に置けます。[LinuxのCircular Buffers](https://docs.kernel.org/core-api/circular-buffers.html#what-is-a-circular-buffer)、[ゲームのアセット読み込み](/game/asset-loading.html)

## 読み位置と書き位置で空と満杯を見分ける

4枠の配列を使います。次に取り出す位置を `R`、次に書く候補の位置を `W` とします。どちらも最初は0です。位置を1つ進める式は `next(i) = (i + 1) % 4` で、添字3の次は0になります。データは `R` から `W` の手前までを円を描くようにたどった範囲です。

| 状態 | 判定 | 操作したとき |
| --- | --- | --- |
| 空 | `R === W` | 取り出す値がなく、`R` を進めない |
| 満杯 | `next(W) === R` | 挿入を断り、値を書かず `W` も進めない |
| 挿入できる | `next(W) !== R` | `W` の枠に書き、`W` を進める |
| 取り出せる | `R !== W` | `R` の枠から読み、`R` を進める |

満杯でも挿入して `W` を進めると `R === W` になり、位置だけでは空と見分けられなくなります。この方式では常に少なくとも1枠を空け、4枠で3件まで保持します。空ける枠はカーソルとともに移ります。別の実装では件数などを記録し、4枠すべてを使う設計もあります。[LinuxのCircular Buffers](https://docs.kernel.org/core-api/circular-buffers.html#what-is-a-circular-buffer)

<figure class="study-figure">
  <img src="/images/browser/ring-buffer-cursors.svg" alt="4枠のリングバッファに10、20、30を入れると満杯になり、40の挿入は断られる。10を取り出して40を枠3に書くと書き位置は0へ戻る。次に20を取り出し、空いた枠0に50を書く。取り出し順は30、40、50のまま。" width="760" height="1300" loading="lazy">
  <figcaption>枠番号と取り出し順は、書き位置が折り返すと異なります。図の「—」はキューに含まれない枠です。<a href="/study/images/browser/ring-buffer-cursors.svg" target="_blank" rel="noopener noreferrer">カーソルと折り返しの図を拡大</a></figcaption>
</figure>

10、20、30を入れると `R=0, W=3` で満杯です。40の挿入をいったん断り、10を取り出して `R=1` にしてから40を挿入すると、40は枠3に入り、`W` が0に戻ります。この時点では `next(0) === R` なので再び満杯です。20を取り出して空きを作ってから50を入れると、10が入っていた枠0を再利用し、`R=2, W=1` になります。そこから読む順は枠2、3、0なので、30、40、50です。取り出すときに残っている要素を移動する必要はありません。読み終えた枠に古い値が残っていても、その枠がキューの範囲外なら取り出しの対象から外れます。

## 一人ずつなら更新するカーソルを分けられる

**SPSC**（single producer, single consumer）は、書き手と読み手が一人ずつという条件です。書き手だけが `W` を更新し、読み手だけが `R` を更新します。二人の書き手が同じ `W` を読み、同じ枠に書く事態を、書き手を一人に限定して防ぎます。二人以上で役割を分担するキューには、枠を取り合わないための別の設計が必要です。[LinuxのCircular Buffers](https://docs.kernel.org/core-api/circular-buffers.html)、[スレッドと同期](/runtime/thread-synchronization.html)

ブラウザで別々のWorkerが同じキューを操作する場合は、`SharedArrayBuffer` にカーソルとデータ枠を置きます。実践の `Int32Array` は、添字0に `R`、添字1に `W`、添字2〜5にデータを置く24バイトの構成です。相手のカーソルは `Atomics.load()` で読み、自分のカーソルは処理が終わってから `Atomics.store()` で進めます。カーソルの更新には二つの役割があります。[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)、[Web Workerと共有メモリの同期](/browser/shared-memory-atomics.html)

- **値の公開**。書き手は満杯かを確認し、枠に値を書いてから `W` を進めます。読み手は `W` を読み、空でなければ `R` の枠の値を取得します。
- **読み終えた枠の解放**。読み手は枠から値を取得し終えてから `R` を進めます。書き手は `R` を読み、満杯でなければ `W` の枠に書きます。この確認で、読み手がまだ使っている枠を追い越さずに済みます。

<figure class="study-figure">
  <img src="/images/browser/ring-buffer-publication.svg" alt="書き手は枠に値を書いた後でWをアトミックに更新する。読み手がその更新を確認してから枠を読む。読み手は枠を読み終えた後でRをアトミックに更新する。書き手がその更新を確認して空きを判断し、後で枠を再利用する。" width="760" height="1160" loading="lazy">
  <figcaption>書き手から読み手には値の準備ができたことを、読み手から書き手には読み終えた範囲を伝えます。<a href="/study/images/browser/ring-buffer-publication.svg" target="_blank" rel="noopener noreferrer">公開と枠の再利用の図を拡大</a></figcaption>
</figure>

JavaScriptのアトミックな読み書きは逐次一貫（sequentially consistent）です。同じカーソルの `load` が `store` による更新を読んだとき、両者は同期します。この関係と各Workerの中の操作順をつなげると、値の書き込みが値の読み取りに先行し、値の読み取りが同じ枠への次の書き込みに先行します。データ枠はこの手順で使用権を渡すので、実践ではデータ自体を通常の `Int32Array` の読み書きで扱えます。表示のために第三の処理が並行実行中のデータ枠を直接読むと、同じ手順で保護されないため、共有実験の表示にはWorkerから返った結果を使います。[ECMAScriptのAtomics.load](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.load)、[Atomics.store](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.store)、[synchronizes-with](https://tc39.es/ecma262/multipage/memory-model.html#sec-synchronizes-with)、[happens-before](https://tc39.es/ecma262/multipage/memory-model.html#sec-happens-before)

## 満杯や空を処理する方針を決める

キューに空きがないとき、この実装はキューが満杯であることを呼び出し元に返します。呼び出し元はその項目を保持し、受け取り側が読み進めたあとに再試行できます。例えば読み込み済みの結果を渡す処理なら、供給側を一時停止することで、受け取り側が処理できる量に合わせられます。どのデータを破棄してよいかは用途で変わります。音声出力でデータが間に合わない場合など、受け取り側が待てないときは、無音を出すなどの方針を別に決めます。[Workerプールのキューとバックプレッシャー](/browser/worker-pool-backpressure.html)、[Streams APIとバックプレッシャー](/browser/streams-backpressure.html)

公開ページでは `ArrayBuffer` 上で `tryEnqueue()` と `tryDequeue()` を一操作ずつ動かし、枠とカーソルを確認できます。付属のローカル配信を使うと、二つのDedicated Workerが同じ実装を `SharedArrayBuffer` 上で動かします。Workerは満杯や空が返ったら処理をいったん譲って再試行します。再試行の回数は実行順によって変わります。[実践サンプル](/practice/browser/ring-buffer-observation.html)

音声のように出力を止めずに進める場合は、空のキューをどう扱うかも決めます。音声データを先にためる効果と、不足分を無音で埋める流れは[AudioWorkletと音声バッファ](/browser/audio-worklet-buffering.html)で確認できます。
