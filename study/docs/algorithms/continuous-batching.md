---
title: LLMの連続バッチング（Continuous Batching）— 生成途中でリクエストをどう入れ替えるか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 到着時刻と出力長の異なる3リクエストで、固定バッチと反復ごとに入れ替える連続バッチングを比べる。
  aliases: [連続バッチング, Continuous Batching, Iteration-level Scheduling, 反復単位のスケジューリング, Orca]
  verification: Orca、Sarathi-Serve、PagedAttentionの原論文に照合し、WindowsのPython 3.12.4でタイムラインと時刻・処理量の例を検算（2026-11-21）
---

# LLMの連続バッチング（Continuous Batching）— 生成途中でリクエストをどう入れ替えるか

同じLLMに、Aは一言の返事を、Bは長めの説明を頼みます。Aが先に書き終えた時点で、Cの依頼も届いています。Bが生成を続ける間、Aが使っていた実行枠をCに渡せるでしょうか。**連続バッチング**は、モデルを1回進めるたびに、同時に処理するリクエストの組を見直す方式です。[YuらのOrca原論文 §3](https://www.usenix.org/conference/osdi22/presentation/yu)

## この記事で分かること

3件のタイムラインから、固定バッチで空いた枠と、反復の境界で別のリクエストが入る枠の違いを説明できます。最初の出力を待つ時間、生成中の出力間隔、全体の処理量を分けて読めます。

## バッチを組み直す境界を変える

**バッチ**は、モデルがまとめて処理するリクエストの組です。ここでは、バッチをモデルに1回通して各列を先へ進めることを**反復**と呼びます。通常のdecodeでは、1列が一度の反復で次の出力を1トークン選びます。列ごとにそれまでの履歴を持ち、自分の続きを生成します。[YuらのOrca原論文 §2–3](https://www.usenix.org/system/files/osdi22-yu.pdf#page=5) · [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html)

- **固定バッチ**では、バッチの開始時にメンバーを決めます。途中で1件が終了しても、残りのメンバーが全員終わった後に次のバッチを始めます。
- **連続バッチング**では、反復が終わるたびに生成を終えた列を外し、続く列と待機中の列から次の組を作ります。すでに実行中の反復はその境界まで進みます。Orcaの論文では、この計算を割り当てる単位を**反復単位のスケジューリング**（iteration-level scheduling）と呼びます。[YuらのOrca原論文 §3 C1・S1](https://www.usenix.org/system/files/osdi22-yu.pdf#page=5)

ここで比べるのは、次のバッチに誰を入れるかです。固定バッチでも、実行エンジンと配信の仕組みが対応していれば、トークンが生成された時点で送れます。Orcaが比較対象として説明した従来型のインターフェースは、全員の完了後に応答を受け取る設計でした。[YuらのOrca原論文 §3 C1](https://www.usenix.org/system/files/osdi22-yu.pdf#page=5)

## Aの終了後、Cはいつ参加できるか

図は、Aが0 ms、Bが0.5 ms、Cが2.5 msにサーバーへ届く場合です。AとCは2トークン、Bは5トークンで終了します。比較のため、両方式とも最初は1 msにA・Bで開始し、同時に処理できるのは2列までとします。どの反復も1 msで、各列の最初の反復には入力処理（prefill）と最初の出力をまとめて数えます。反復の終わりに、選んだトークンをすぐ送れると仮定します。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="到着はAが0ミリ秒、Bが0.5ミリ秒、Cが2.5ミリ秒。固定バッチではAは時刻2、3に出力し、Bは時刻2、3、4、5、6、待機したCは時刻7、8に出力する。連続バッチングではAとBの出力時刻は同じで、Cは時刻3に参加し、時刻4と5に出力する。" style="display: grid; gap: 0.6rem; max-width: 30rem; font-variant-numeric: tabular-nums">
    <span>到着（ms） A 0 ／ B 0.5 ／ C 2.5</span>
    <strong>固定バッチ</strong>
    <div style="display: grid; grid-template-columns: 3.4em repeat(7, minmax(0, 1fr)); gap: 0.22rem; text-align: center">
      <span style="text-align: left">時刻</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
      <strong style="text-align: left">A</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">◎</strong><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span>
      <strong style="text-align: left">B</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">◎</strong><span>—</span><span>—</span>
      <strong style="text-align: left">C</strong><span>—</span><span>待</span><span>待</span><span>待</span><span>待</span><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">◎</strong>
    </div>
    <strong>連続バッチング</strong>
    <div style="display: grid; grid-template-columns: 3.4em repeat(7, minmax(0, 1fr)); gap: 0.22rem; text-align: center">
      <span style="text-align: left">時刻</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
      <strong style="text-align: left">A</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">◎</strong><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span>
      <strong style="text-align: left">B</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">◎</strong><span>—</span><span>—</span>
      <strong style="text-align: left">C</strong><span>—</span><span>待</span><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">●</strong><strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">◎</strong><span>—</span><span>—</span><span>—</span>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.65rem">列の数字は反復が終わる時刻（ms）。●は出力1個、◎は最後の1個、待は到着後の待機、—はその回の出力なし。</figcaption>
</figure>

Aはどちらでも3 msで終了します。Cが2.5 msに着いたときはA・Bの反復が実行中です。固定バッチでは、3 msでAが終わっても、Bが6 msで終わるまでCを組に入れません。連続バッチングでは3 msの境界でAの枠にCを入れられ、Bの次の1トークンとCの最初の1トークンを同じ反復で処理します。この例では先に到着したBが6 msに終わり、後から参加したCは5 msで終わります。

## 初回の待ち、出力間隔、処理量を分ける

**TTFT**（Time to First Token）は最初の出力までの待ち時間です。この図ではサーバーへの到着から最初のトークンが出るまでを測ります。**ITL**（Inter-Token Latency）は、この例のように1トークンずつ出す場合の、隣り合う出力時刻の差です。**処理量**（スループット）は、ここでは全リクエストで1 msあたりに生成した出力トークン数です。[Sarathi-Serve原論文 §2.4](https://arxiv.org/html/2403.02310#S2.SS4) · [待ち時間の測定点を分ける](/algorithms/llm-prefill-and-decode.html)

| この図から数える値 | 固定バッチ | 連続バッチング |
| --- | ---: | ---: |
| CのTTFT（2.5 msの到着から） | 4.5 ms | 1.5 ms |
| CのITL | 1 ms | 1 ms |
| 最初の実行開始から全員完了まで | 7 ms | 5 ms |
| 全体の出力トークン数 | 9個 | 9個 |
| 上の実行区間での処理量 | 約1.29個/ms | 1.8個/ms |

Cの初出力が早まる理由は、待機していたCを早い境界で実行するからです。反復時間を両方式とも同じ1 msに置いたので、ITLは変わりません。全体では同じ9個の出力を短い時間で終えています。この数値は説明用で、入力長やバッチの大きさが違ってもGPU上の反復時間が一定という意味ではありません。

実際には、生成中の列が毎回選ばれるか、選ばれた反復にどれだけ時間がかかるかでも出力間隔が変わります。たとえば、上の図の3 msから始まる回が、Cの長いprefillを含んで3 msかかったとします。直前に3 msで出力したBの続きは6 msに出るため、その区間のITLは3 msになります。入力を小分けにして一部ずつdecodeと同じ回に入れる方法は、こうした反復時間の伸びを抑える工夫の一つです。[Sarathi-Serve原論文 §3.2・§4](https://arxiv.org/html/2403.02310#S3.SS2)

## 空きができても、入れられる件数には上限がある

図の2列は教材用の上限です。実際には最大同時列数に加え、一度に処理する入力のトークン数や、保持するKVキャッシュに使えるメモリが限られます。枠が空いていても、次の反復に必要な資源が足りないリクエストは待ちます。待機列から誰を先に選ぶかはスケジューラーの方針です。Orcaは先着順を基本とし、生成に必要なKV用の枠も見て参加を決めます。[YuらのOrca原論文 §4.2](https://www.usenix.org/system/files/osdi22-yu.pdf#page=9) · [Sarathi-Serve原論文 §4.3](https://arxiv.org/html/2403.02310#S4.SS3)

同じ回に入る列が増えると、重みの読み出しを複数の列で活用できます。一方で長い文脈のKVも読むため、列を増やしたときの反復時間は負荷やハードウェアで変わります。全体の処理量と各リクエストのTTFT・ITLは、それぞれ同じ負荷・測定点で比較します。[YuらのOrca原論文 §3・§6](https://www.usenix.org/conference/osdi22/presentation/yu) · [Sarathi-Serve原論文 §3](https://arxiv.org/html/2403.02310#S3)

## 連続バッチング、PagedAttention、投機的デコーディングの役割

| 仕組み | 何を決めるか |
| --- | --- |
| 連続バッチング | 次の反復に参加するリクエストを選ぶ |
| [PagedAttention](/algorithms/paged-attention.html) | 各列のKVを置いたブロックを引き、分散して置いたKVをAttentionから参照する |
| [投機的デコーディング](/algorithms/speculative-decoding.html) | 同じ列の続きの候補を本命モデルでまとめて評価し、確定できるトークンを選ぶ |

連続バッチングの入れ替えは、KVの置き方や出力トークンを選ぶ規則とは別の判断です。vLLMの原論文では、ブロックの割り当てと反復ごとの選択を組み合わせています。Orcaの論文は別のKV管理で反復単位のスケジューリングを説明しています。図の1反復1トークンは、単純なdecodeを使った比較の条件です。[KwonらのPagedAttention原論文 §4.3](https://arxiv.org/html/2309.06180#S4.SS3) · [YuらのOrca原論文 §4.2](https://www.usenix.org/system/files/osdi22-yu.pdf#page=9) · [Leviathanらの投機的デコーディング原論文](https://proceedings.mlr.press/v202/leviathan23a.html)

## 要点

- 固定バッチはメンバーを開始時に決め、連続バッチングは反復の境界ごとに実行する列を選び直します。
- 短いリクエストが先に終わると、残りの生成中に待機中のリクエストを入れられます。入れられる数は計算とメモリの予算に左右されます。
- 初回応答は到着から最初の出力まで、生成中の待ちは出力間隔、全体の処理量は時間あたりの出力数として読み分けます。
- 連続バッチングは実行する列、PagedAttentionはKVの配置、投機的デコーディングは候補列の検証を扱います。

## 理解度チェック

::: details Cが2.5 msに届いたその瞬間、すぐAとの入れ替えはできる？
図では2 msからの反復が実行中です。Aが3 msで完了した後に、次の反復へCを入れます。
:::

::: details Cの最初のトークンが早まれば、Bがより短い間隔で出力する？
図ではBの出力時刻はどちらも2、3、4、5、6 msです。実際の出力間隔は、Bを処理する反復の間隔と、その回の処理時間にも左右されます。
:::

## 検証範囲

2026年11月21日にOrcaなどの原論文を確認しました。WindowsのPython 3.12.4で図の両方式を反復ごとに進め、各列の出力時刻、TTFTとITL、処理量、長い反復の例の値を検算しました。時刻は説明用です。実機のGPU、推論サービスやネットワークでのレイテンシ・処理量は測っていません。

## 関連項目

- [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) — 入力処理と逐次生成、待ち時間の測定区間を読む。
- [PagedAttention](/algorithms/paged-attention.html) — メモリ予算内で各リクエストのKVをどこに置くかを追う。
- [投機的デコーディング](/algorithms/speculative-decoding.html) — 一つの列について、複数の候補トークンを一度に評価する仕組みを読む。

## 参考資料

- [Gyeong-In Yuほか — Orca: A Distributed Serving System for Transformer-Based Generative Models（OSDI 2022）](https://www.usenix.org/conference/osdi22/presentation/yu) — 反復単位のスケジューリングと、長さの異なる列をまとめて処理する設計。
- [Amey Agrawalほか — Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve（OSDI 2024）](https://arxiv.org/html/2403.02310) — prefillとdecodeの計算コスト、出力間隔、入力の分割。
- [Woosuk Kwonほか — Efficient Memory Management for Large Language Model Serving with PagedAttention（SOSP 2023）](https://arxiv.org/abs/2309.06180) — KVのブロック割り当てと各反復の実行。
- [Yaniv Leviathan, Matan Kalman, Yossi Matias — Fast Inference from Transformers via Speculative Decoding（ICML 2023）](https://proceedings.mlr.press/v202/leviathan23a.html) — 候補列の一括評価と採択。
