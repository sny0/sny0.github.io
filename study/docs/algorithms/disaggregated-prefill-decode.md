---
title: Prefillとdecodeの分離：生成を止めずにKVキャッシュをどう引き渡すか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 長い入力Aと生成中のBを同じGPU群で処理する場合と、prefillとdecodeを別のGPU群に分ける場合を比べる。KVの転送費用と、初回応答・出力間隔・goodputへの影響を追う。
  aliases: [Prefillとdecodeの分離, Prefill-Decode Disaggregation, Disaggregated Prefill, P/D分離, DistServe]
  verification: DistServeとSarathi-Serveの原論文に照合し、WindowsのPython 3.12.4で概念図の出力時刻とKV転送時間を検算（2026-11-21）
---

# Prefillとdecodeの分離：生成を止めずにKVキャッシュをどう引き渡すか

LLMがBの回答を少しずつ返している間に、長い仕様書を含む新しい依頼Aが届きます。[チャンク化prefill](/algorithms/chunked-prefill.html)では、Aの入力を小分けに処理して、同じGPU群でBの出力を返す機会を作りました。**Prefillとdecodeの分離**では、Aの入力を処理するGPU群と、Bの生成を続けるGPU群を分けます。Aの入力処理が終わったら、その続きに必要な状態を生成側へ渡します。[DistServe原論文 §2.3・§3](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

## この記事で分かること

長い入力Aと生成中のBを例に、GPU群を分けるとどの待ちが減り、KV転送でどの待ちが増えるかを説明できます。転送がAの最初の出力までと、その次の出力までのどちらに現れるかを、トークンを返す順序から判断できます。

## Aの入力を読み終えた状態を渡す

**Prefill**は入力トークン列を処理して最初の出力を選ぶ段階です。**Decode**は直前に選んだトークンをモデルに通して次の出力を選ぶ段階です。**KVキャッシュ**は、処理済みの位置について、各層のAttentionが次の計算で使うKeyとValueを保存したものです。共有GPU群ならその場で読み続けられます。分離した場合は、生成側で参照できるように移します。[DistServe原論文 §2.1・§3.2](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf) · [KVキャッシュ](/algorithms/kv-cache.html)

1. **prefill側**が、Aの入力を末尾まで処理します。入力列の各位置のKVを保存し、末尾の結果から最初の出力トークンを選びます。
2. **GPU群の間**で、入力列のKVを移します。生成側は最初の出力トークンのIDや、要求と結びつけるための情報も受け取ります。
3. **decode側**が、その最初の出力トークンをモデルに入力します。受け取ったKVを読み、そのトークン自身のKVを追加して、2番目の出力を選びます。

最初の出力を**選んだ**時点では、そのトークン自身をモデルに通して作るKVはまだありません。図で移すのは、先に処理した入力位置のKVです。DistServeではprefillとdecodeの各実行単位がモデルの重みをあらかじめ保持します。重みを置くメモリもGPUの割り当てに含めます。[DistServe原論文 §2.3・§3.2](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf) · [KVキャッシュ](/algorithms/kv-cache.html)

## 共有GPU群と分離GPU群のタイムライン

チャンク化prefillの記事と同じく、**0 msでBの直前の出力があり、長い入力Aが到着**したとします。時刻は概念図の仮定です。共有の場合はAの一括prefillとBのdecodeを含む反復が6 ms。分離した場合もAのprefillは6 msと置きます。decodeの反復は1 ms、分離した場合のKV転送は5 msです。ほかの転送や待ち行列との競合は省き、分離した場合は**prefill側の最初の出力をサービスがすぐ利用者に返す**とします。

<figure style="margin: 1rem 0">
  <div role="img" aria-label="0ミリ秒にA到着、Bの直前の出力。共有GPU群ではAの初回とBの次の出力が6。Aの2番目が7。分離ではAの初回が6、KV転送が6〜11、Aの2番目が12。Bは1から12まで1ミリ秒ごとに出力する。" style="display: grid; gap: 0.6rem; max-width: 43rem; font-variant-numeric: tabular-nums">
    <span>0 msでAが到着し、Bの直前の出力がある。</span>
    <strong>同じGPU群でAを一括処理</strong>
    <div style="display: grid; grid-template-columns: 4.15em repeat(12, minmax(0, 1fr)); gap: 0.16rem; text-align: center; align-items: center; font-size: 0.84em">
      <span style="text-align: left">時刻(ms)</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span>
      <span style="text-align: left">GPU群</span><strong style="grid-column: span 6; border-radius: 4px; background: var(--vp-c-brand-soft)">Aのprefill＋Bのdecode</strong><strong style="grid-column: span 1; border-radius: 4px; background: var(--vp-c-brand-soft)">＋</strong><strong style="grid-column: span 5; border-radius: 4px; background: var(--vp-c-brand-soft)">Bのdecode</strong>
      <span style="text-align: left">Aの出力</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>◎</span><span>●</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span>
      <span style="text-align: left">Bの出力</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span>
    </div>
    <strong>prefillとdecodeを別のGPU群に分ける</strong>
    <div style="display: grid; grid-template-columns: 4.15em repeat(12, minmax(0, 1fr)); gap: 0.16rem; text-align: center; align-items: center; font-size: 0.84em">
      <span style="text-align: left">時刻(ms)</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span>
      <span style="text-align: left">入力群</span><strong style="grid-column: span 6; border-radius: 4px; background: var(--vp-c-brand-soft)">Aのprefill</strong><span style="grid-column: span 6"></span>
      <span style="text-align: left">KV転送</span><span style="grid-column: span 6"></span><strong style="grid-column: span 5; border-radius: 4px; background: var(--vp-c-warning-soft)">AのKV（5 ms）</strong><span style="grid-column: span 1"></span>
      <span style="text-align: left">生成群</span><strong style="grid-column: span 11; border-radius: 4px; background: var(--vp-c-brand-soft)">Bのdecode（1 msごと）</strong><strong style="grid-column: span 1; border-radius: 4px; background: var(--vp-c-brand-soft)">＋</strong>
      <span style="text-align: left">Aの出力</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>◎</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>●</span>
      <span style="text-align: left">Bの出力</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">帯は処理区間を示し、列の時刻はその区間の右端。◎はAの最初の出力、●はその行の後続出力、·は出力なし。＋の区間はAとBのdecodeを同じ反復で実行する。</figcaption>
</figure>

| 図で比べる値 | 共有 | 分離 |
| --- | ---: | ---: |
| Aの最初の出力まで（TTFT） | 6 ms | 6 ms |
| Aの最初から2番目の出力まで | 1 ms | 6 ms |
| Bの0 msから次の出力まで | 6 ms | 1 ms |

**TTFT**（Time to First Token）は、ここでは到着から最初の出力までです。分離した図では、BはAの長いprefillを待たずに進み、Aの2番目の出力はKVが届くまで待ちます。GPU群の数や配置をそろえた実機の性能比較ではありません。[LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) · [DistServe原論文 §2.3・§3.3](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

## 転送の待ちはどこに現れるか

転送するKVが **256 MiB = 0.25 GiB** なら、転送時間の概算はデータ量を有効帯域で割って求められます。有効帯域はこの例でKVデータを実際に運べると仮定した速さです。転送開始の固定遅延や、転送・decodeの順番を待つ時間は別に数えます。

| 有効帯域 | KVデータを運ぶ時間 | 図の条件でのAの2番目の出力 |
| ---: | ---: | ---: |
| 50 GiB/s | （0.25 ÷ 50）秒 = 5 ms | 6 + 5 + 1 = 12 ms |
| 5 GiB/s | （0.25 ÷ 5）秒 = 50 ms | 6 + 50 + 1 = 57 ms |

この図ではAの最初の出力を先に返すため、転送の待ちはAのTTFTに入らず、**最初と2番目の出力の間**に現れます。サービスがKVの到着を待ってから最初の出力を配信する実装なら、転送の待ちは利用者が測るTTFTに現れます。段階の実行、転送、順番待ち、利用者への配信を分けて測ると、遅れの位置を特定できます。[DistServe原論文 §5・§6.3](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

## チャンク化との役割の違いとGPUの割り当て

**チャンク化prefill**は、同じGPU群のスケジュールで長い入力の仕事を区切ります。**分離**は、入力処理と続きの生成の実行場所を分けます。分離したprefill群でも、長い入力をチャンクに分けて処理できます。受け渡しが必要かどうかは、prefillとdecodeがどこで実行されるかで決まります。[Sarathi-Serve原論文 §4](https://arxiv.org/html/2403.02310#S4) · [DistServe原論文 §3・§4](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

分離すると、入力と生成の負荷に合わせてGPU数や並列化を決められます。入力側の枠が不足すればAのprefillが待ち、生成側の枠が不足すれば転送後もdecodeを待ちます。受け渡し待ちのKVもGPUメモリを使います。GPU間の経路が遅い、転送が集中する、片側のGPUが空く、といった費用もあるので、分けたときにどちらの待ちが減るかは負荷と配置によります。[DistServe原論文 §4.1–4.3・§6.3](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

## 処理量と、遅延の目標を満たす処理量

全体の**スループット**は、たとえば1秒あたりに生成したトークン数です。同じトークン数を返せても、TTFTや出力間隔の長いリクエストが増えれば、利用者の待ち方は変わります。**SLO**（Service-Level Objective）は、サービスが目指す条件です。たとえば「各リクエストでTTFTが100 ms以内、後続1トークンあたりの平均時間（TPOT）が10 ms以内。この両方を満たす割合が90%以上」と置けます。各出力間隔を一つずつ測る指標と、後続の平均を使うTPOTは分けて読みます。[DistServe原論文 §1・§6.1](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf) · [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html)

DistServeでの**GPUあたりのgoodput**は、所定のSLO達成率を保てる最大のリクエスト率を、割り当てたGPU数で割ったものです。図のBの次の出力が早いという結果だけでは、実際のgoodputは判断できません。入力と出力の長さ、リクエストの到着頻度、帯域、GPU配分を含めて、同じ遅延目標で比較します。[DistServe原論文 §1・§6.1](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)

## 要点

- Prefillとdecodeを別のGPU群に置くと、長い入力Aと生成中のBを別々に進められます。
- 生成側はAの入力列のKVを受け取り、最初に選ばれた出力トークンを入力して続きを生成します。
- 最初の出力を転送完了より先に返す場合、転送の待ちは最初と次の出力の間に現れます。
- チャンク化は仕事の区切り方、分離は実行場所の選び方です。転送、待ち行列、GPU配分も含め、遅延の目標を満たせる処理量を比べます。

## 理解度チェック

::: details 分離した図でAのTTFTが同じでも、Aに別の待ちが生じるのはなぜ？
最初の出力を6 msに先に返す仮定だからです。次の出力には入力列のKVが必要なので、5 msの転送と1 msのdecodeを待ちます。
:::

::: details 有効帯域が50 GiB/sから5 GiB/sに下がると、図のAの2番目の出力はいつになる？
256 MiBを運ぶ時間が5 msから50 msになります。先に6 msで最初の出力を返し、KV到着後のdecodeに1 msかかるので、2番目は57 msです。
:::

## 検証範囲

2026年11月21日にDistServeとSarathi-Serveの原論文を確認し、WindowsのPython 3.12.4で、図の出力時刻とTTFT・出力間隔、256 MiBの転送時間を検算しました。図の時刻、帯域、出力の配信順序は説明用の仮定です。学習済みモデル、GPU間の実効帯域、実サービスでの出力時刻やgoodputは測定していません。

## 関連項目

- [チャンク化prefill](/algorithms/chunked-prefill.html) — 同じGPU群で、長い入力Aを分けながらBの出力を返す方法を読む。
- [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) — 入力処理と生成の計算、TTFTと出力間隔の測り方を読む。
- [KVキャッシュ](/algorithms/kv-cache.html) — どの値を保存するかと、保存容量が増える条件を確認する。
- [LLMのテンソル並列](/algorithms/tensor-parallelism.html) — GPU群の内側で同じ層を分割し、部分和を足す構成を読む。
- [MoEのエキスパート並列](/algorithms/expert-parallelism.html) — 同じ層の中で、専門家との間を中間ベクトルが往復する構成を読む。

## 参考資料

- [Yinmin Zhongほか — DistServe（OSDI 2024）](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf) — 段階別のGPU配分、KVの受け渡し、遅延を考慮したgoodputと測定。
- [Amey Agrawalほか — Sarathi-Serve（OSDI 2024）](https://www.usenix.org/conference/osdi24/presentation/agrawal) — 同じGPU群でチャンク化prefillとdecodeを組み合わせる手法。
