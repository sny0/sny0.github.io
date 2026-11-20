---
title: チャンク化prefill：長い入力を分割して、生成中の応答をどう守るか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 長い入力Aのprefillを分割し、生成中のBと一緒に進める流れを、一括処理と比べる。初回応答と出力間隔、チャンクサイズの調整を説明する。
  aliases: [チャンク化prefill, Chunked Prefill, Chunked Prefills, 分割prefill, Sarathi-Serve, Stall-free Batching]
  verification: Sarathi-Serveの原論文に照合し、WindowsのPython 3.12.4で概念図の反復とTTFT・出力間隔を検算（2026-11-21）
---

# チャンク化prefill：長い入力を分割して、生成中の応答をどう守るか

LLMがBの回答を少しずつ返している間に、長い仕様書を含む新しい依頼Aが届きます。Aの入力処理を一度に実行すると、その反復が終わるまで、Bの次の出力も待たされることがあります。**チャンク化prefill**は、モデルに渡す長い入力をいくつかの連続した区間（チャンク）に分け、進行中の生成と少しずつ一緒に処理する方法です。[AgrawalらのSarathi-Serve原論文 §3.2・§4](https://www.usenix.org/conference/osdi24/presentation/agrawal)

## この記事で分かること

長い入力Aを一括で処理する場合と分割する場合で、生成中のBの出力間隔がどう変わるかを説明できます。連続バッチングとの役割の違いと、チャンクの大きさがAの初回応答にも効く理由を読み分けられます。

## 長い入力と生成中の1トークンが同じ反復に入る

**prefill**は入力のトークン列を処理して、最初の出力を選ぶ段階です。その後の**decode**では、直前の出力をモデルに通して次の出力を選びます。ここでいう**反復**は、推論エンジンが一組の仕事をまとめて1回モデルで処理する単位です。長い入力のprefillとBの1回のdecodeを同じ反復に入れると、Bの出力を返すまでの時間は、その組全体の処理時間の影響を受けます。[Sarathi-Serve原論文 §2.2・§3.2](https://arxiv.org/html/2403.02310#S3.SS2) · [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html)

## Aの初回応答と、Bの出力間隔を同じ図で読む

図は**説明用の時刻**です。0 msでBの直前のトークンが出力され、新しいAが到着したとします。どちらも同じAの入力をすべて処理し、Bは生成を続けます。出力は反復の終了時に観測し、通信・配信の時間は省きます。

- **一括**では、Aの全入力とBのdecodeを含む反復に6 msかかると仮定します。後続のB単独の反復は1 msずつです。
- **分割**では、Aを4つに分けて、Aの1チャンクとBの1回のdecodeを同じ反復に入れます。それぞれの混在する反復に2 msかかると仮定します。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="時刻0ミリ秒でAが到着し、Bの直前の出力がある。一括ではAの全入力とBを処理する反復が0〜6で、Aの初出力は6、Bの出力は6、7、8。分割ではAの4チャンクをBのdecodeと一緒に0〜2、2〜4、4〜6、6〜8で処理する。Aの初出力は8、Bの出力は2、4、6、8。" style="display: grid; gap: 0.6rem; max-width: 35rem; font-variant-numeric: tabular-nums">
    <span>0 msでAが到着し、Bの直前の出力がある。</span>
    <strong>Aを一括処理</strong>
    <div style="display: grid; grid-template-columns: 4.5em repeat(8, minmax(0, 1fr)); gap: 0.2rem; text-align: center; align-items: center; font-size: 0.9em">
      <span style="text-align: left">時刻(ms)</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
      <span style="text-align: left">反復</span><strong style="grid-column: span 6; border-radius: 4px; background: var(--vp-c-brand-soft)">A一括＋B</strong><span>B</span><span>B</span>
      <span style="text-align: left">A初出力</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>◎</span><span>—</span><span>—</span>
      <span style="text-align: left">Bの出力</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>●</span><span>●</span><span>●</span>
    </div>
    <strong>Aを4チャンクに分ける</strong>
    <div style="display: grid; grid-template-columns: 4.5em repeat(8, minmax(0, 1fr)); gap: 0.2rem; text-align: center; align-items: center; font-size: 0.9em">
      <span style="text-align: left">時刻(ms)</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
      <span style="text-align: left">反復</span><strong style="grid-column: span 2; border-radius: 4px; background: var(--vp-c-brand-soft)">A1＋B</strong><strong style="grid-column: span 2; border-radius: 4px; background: var(--vp-c-brand-soft)">A2＋B</strong><strong style="grid-column: span 2; border-radius: 4px; background: var(--vp-c-brand-soft)">A3＋B</strong><strong style="grid-column: span 2; border-radius: 4px; background: var(--vp-c-brand-soft)">A4＋B</strong>
      <span style="text-align: left">A初出力</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>◎</span>
      <span style="text-align: left">Bの出力</span><span>—</span><span>●</span><span>—</span><span>●</span><span>—</span><span>●</span><span>—</span><span>●</span>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">反復の帯は左から右へ時間幅を示す。出力の印は反復が終わる時刻。◎はAの最初の出力、●はBの出力、—は出力なし。A1〜A4はAの入力の区間を表す。</figcaption>
</figure>

Aの**TTFT**（Time to First Token）は、この図では到着から最初の出力までです。Bの**出力間隔**は、続いて出るトークン同士の時間差です。1トークンずつ観測するこの図では、ITL（Inter-Token Latency）としても読めます。Sarathi-Serveの論文は、この生成時刻の差をTBT（Time Between Tokens）と呼びます。[Sarathi-Serve原論文 §2.4](https://arxiv.org/html/2403.02310#S2.SS4)

| 図で数える値 | 一括 | 分割 |
| --- | ---: | ---: |
| AのTTFT | 6 ms | 8 ms |
| Bの0 msから次の出力まで | 6 ms | 2 ms |
| 図の範囲内でのBの出力間隔 | 6・1・1 ms | 2・2・2・2 ms |

この例では、Aが初めて出力するまでの時間は長くなり、Bの長い空白は短くなりました。Aのprefillを途中で区切ると、その区切りごとに進めたBの出力を返せるためです。同じ長さのチャンクでも、参照する文脈や同じ回に入る列が変わると処理時間は変わります。図の6 msと2 msは、実機の測定値や時間の上限ではありません。[Sarathi-Serve原論文 §3.2・§4.1–4.3](https://arxiv.org/html/2403.02310#S4)

## 区間を分けても、Aは前の文脈を読める

Aのチャンクは、元の入力順に処理します。最初のチャンクを処理すると、その位置のKeyとValue（KV）がキャッシュに入ります。次のチャンクは、先行チャンクの保存済みKVと、今回の区間で因果マスクが許す位置を使ってAttentionを計算します。たとえばA3はA1・A2のKVを読みます。こうしてAの文脈を保ちながら進み、最後のチャンクで入力末尾まで処理してAの最初の出力を選びます。[Sarathi-Serve原論文 §4.1](https://arxiv.org/html/2403.02310#S4.SS1) · [KVキャッシュ](/algorithms/kv-cache.html)

同じ反復で処理するBは、B自身の履歴を参照します。AとBでまとめて実行する演算があっても、Attentionはそれぞれの列の文脈を読むように管理されます。[Sarathi-Serve原論文 §4.1–4.2](https://arxiv.org/html/2403.02310#S4.SS2)

## 誰を入れるかと、その回にどこまで進めるか

[連続バッチング](/algorithms/continuous-batching.html)が決めるのは、次の反復にどのリクエストを入れるかです。チャンク化prefillでは、そこに入れた長い入力について、どの範囲をこの回で処理するかを決めます。連続バッチングで新しいAを追加できても、一度にAの全入力を処理すれば、同じ反復にいるBはその終了を待ちます。[Sarathi-Serve原論文 §2.5・§3.2](https://arxiv.org/html/2403.02310#S3.SS2)

Sarathi-Serveは、進行中のdecodeに先に枠を取り、反復で処理するトークン数の上限（**トークン予算**）の残りでprefillの区間を入れます。メモリや実行枠にも制約があり、入力の続きをこの回に入れられなければ、次の機会を待ちます。論文がいうstall-freeは、進行中のdecodeを外して長いprefillだけを走らせる事態を避けるという設計です。混在する反復の処理時間には、入れたチャンクの計算も含まれます。[Sarathi-Serve原論文 §4.2・Algorithm 3](https://arxiv.org/html/2403.02310#S4.SS2)

## チャンクは小さくするほどよいのか

小さいチャンクなら1回に入る新規入力が少なくなり、Bの出力間隔が長くなるのを抑えやすくなります。一方、Aを処理する反復数は増え、各回の起動などの固定費が積み重なります。図の4分割で全体を参照するAttentionなら、A1のKVはA2・A3・A4から参照されます。Aの前半のKVを複数回読み戻す費用も考えます。小さすぎる単位では、GPUの演算をまとめる効率が落ちる場合もあります。[Sarathi-Serve原論文 §4.3・§5.4.1](https://arxiv.org/html/2403.02310#S4.SS3)

大きめのチャンクは一度に処理する位置を増やし、必要な反復を減らせます。一方、その回に生成中の列がいれば、次の出力までの間隔が伸びることがあります。実際のトレードオフには、入力長、同時に生成している列の数、使うGPUやカーネルが関わります。AのTTFT、Bの出力間隔、全体の処理量を分けて測ると、どの費用を払っているかが分かります。[Sarathi-Serve原論文 §4.3・§5.2](https://arxiv.org/html/2403.02310#S4.SS3)

## 要点

- 長い入力のprefillを一括で混ぜると、同じ反復のdecodeも、その終了まで出力を待ちます。
- チャンク化prefillは、前の区間のKVを使いながらAを少しずつ進め、反復ごとにBの出力を返す機会を作ります。
- 連続バッチングは「どのリクエストを入れるか」を決め、チャンク化は「その回で入力をどこまで処理するか」を決めます。
- チャンクを小さくすると出力間隔を抑えやすくなる一方、反復数やKVの読み出しが増えます。Aの初回応答とBの出力間隔は別の指標です。

## 理解度チェック

::: details A2まで処理した時点で、Aの最初の回答を出せる？
この図では入力の後半が残っています。A4の末尾まで処理した反復の終了時に、最初の出力を選びます。
:::

::: details Aの最初の出力までが6 msから8 msになっても、分割に利点はある？
この例のBでは、0 msから次の出力までが6 msから2 msになっています。どちらを重視するかは、初回応答と生成中の間隔それぞれの要件で変わります。
:::

## 検証範囲

2026年11月21日にSarathi-Serveの原論文を確認し、WindowsのPython 3.12.4で両方式の反復時刻、AのTTFT、Bの各出力間隔を検算しました。時間は概念図の仮定です。学習済みモデルの実行、GPU負荷、実サービスの処理量は測っていません。

## 関連項目

- [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) — 入力処理と生成の違い、最初の出力と続きの測定区間を確認する。
- [連続バッチング](/algorithms/continuous-batching.html) — 反復の境界で実行するリクエストを入れ替える仕組みを読む。
- [KVキャッシュ](/algorithms/kv-cache.html) — 処理済みの位置のどの値を保存し、続きの計算で使うかを追う。

## 参考資料

- [Amey Agrawalほか — Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve（OSDI 2024）](https://www.usenix.org/conference/osdi24/presentation/agrawal) — チャンク化prefillとスケジューラーの設計、性能評価。
- [Sarathi-Serve原論文 §4・§5.4.1](https://arxiv.org/html/2403.02310#S4) — チャンク間のKV参照、トークン予算、分割による追加費用。
