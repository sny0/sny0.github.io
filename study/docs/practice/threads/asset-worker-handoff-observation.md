---
title: C++でワーカーの結果を描画側へ渡し、古い世代を捨てる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: runtime
  collection: asset-worker-handoff-observation
  order: 1
  summary: 2つのワーカーが境界を計算し、容量1の完了キューへ返す。フレーム側は現在の世代だけを採用し、完了を回収してからスレッドを終了する。
  aliases: [ワーカー, producer consumer, bounded queue, condition_variable, backpressure, 世代, drain, join]
  verification: Windows x64のMSVCでビルド。40回実行し、現在の3件、破棄1件、完了キューの最大1件と終了を確認（2026-11-06）
---

# C++でワーカーの結果を描画側へ渡し、古い世代を捨てる

2つのワーカーがメッシュを表す短い頂点列から、X座標の最小値と最大値を計算します。ワーカーは結果を容量1のキューに入れます。描画側に見立てたメインスレッドは一度に最大1件を取り出し、シーンの世代を照合してから採用します。[容量を決めたキュー](/runtime/bounded-worker-queues.html) · [アセットを描画側へ渡す設計](/game/asset-worker-handoff.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/threads/asset-worker-handoff-observation/asset_worker_handoff.cpp" download>asset_worker_handoff.cpp</a>を空の作業フォルダーに保存します。WindowsのVisual Studioで**x64 Native Tools Command Prompt**を開き、そのフォルダーで次を実行します。サンプルはC++20の標準ライブラリを使います。[MicrosoftのC++コマンドラインツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX asset_worker_handoff.cpp
asset_worker_handoff.exe
```

```text
asset 0 generation 2 x=[-3,2]
asset 1 generation 2 x=[5,9]
asset 2 generation 2 x=[-2,4]
published=3 stale=1 result_queue_peak=1
```

`published=3`は世代2の結果をすべて採用した数です。`stale=1`は、同じ素材番号0でも世代1だった結果を破棄した数です。`result_queue_peak=1`はキューに同時に入った結果の最大件数で、計算中の結果は含みません。表示は回収後に素材番号順で行うため、ワーカーが終わった順には依存しません。

## 満杯、空、終了の流れを追う

| 段階 | 動作 |
| --- | --- |
| 要求を出す | メインスレッドは世代1の要求を1件出してから世代2に切り替えます。要求を追加する専用スレッドは、容量2の要求キューに世代2の3件を順に入れます。 |
| ワーカーが計算する | 要求が空なら待ち、受け取った頂点列はロックの外で処理します。完了キューが満杯なら、空きができるまで待ちます。 |
| フレーム側が回収する | `try_pop`は空のキューにデータが来るまで待たず、その周を進めます。キューの状態を調べるための短いロックは取ります。 |
| 終了する | 追加側が要求キューを閉じ、ワーカーは残りを処理します。最後のワーカーが完了キューを閉じます。メインは完了キューが閉じて空になるまで回収し、その後に`join`します。 |

メインが先に`join`すると、完了キューが満杯のとき、ワーカーは空きを待ったまま終了できません。回収側を動かしたままにすると、ワーカーが残りの結果を渡せます。`close`では、データを待つ側と空きを待つ側を両方起こし、条件を見直せるようにします。[C++の条件変数と述語](https://learn.microsoft.com/en-us/cpp/standard-library/condition-variable?view=msvc-170) · [スレッドと同期](/runtime/thread-synchronization.html)

この教材は、同期と受け渡しを確かめるCPU上のモデルです。頂点列はコード内にあり、描画側の採用は配列への保存で表します。実際の描画では、採用したデータをGPUへ渡し、コピーや描画の完了も別に追います。[GPUリソースの寿命とフェンス](/graphics/optimization/gpu-resource-lifetime.html) · [D3D12でコマンドを並列に記録する](/graphics/optimization/parallel-command-recording.html)

## ソース

<<< @/public/samples/threads/asset-worker-handoff-observation/asset_worker_handoff.cpp{cpp}
