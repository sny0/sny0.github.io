---
title: プロンプトのプレフィックスキャッシュ — 同じ長い前置きを毎回計算し直さなくてよい理由
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 共通の前置きと異なる質問を持つ2入力で、先頭から一致したトークン列のKVを再利用する仕組みと、ブロック単位・追い出し・初回応答への影響を追う。
  aliases: [プレフィックスキャッシュ, プロンプトのプレフィックスキャッシュ, Prefix Caching, Prompt Prefix Cache, Automatic Prefix Caching, APC]
  verification: vLLMの設計・機能・実装資料とTransformer原論文を照合し、WindowsのPython 3.12.4で一致長、ブロック境界、追い出し後の再利用範囲を検算（2026-11-21）
---

# プロンプトのプレフィックスキャッシュ — 同じ長い前置きを毎回計算し直さなくてよい理由

ゲームの描画仕様書をAIに渡し、最初は描画負荷について、次はメモリ使用量について尋ねるとします。どちらの入力も、同じ指示と仕様書から始まります。**プレフィックスキャッシュ**は、以前処理したリクエストと先頭から一致する部分（プレフィックス）の[KVキャッシュ](/algorithms/kv-cache.html)を、後のリクエストで再利用する仕組みです。[vLLMのAutomatic Prefix Caching設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/)

## この記事で分かること

同じ前置きに異なる質問が続くとき、どの位置のKVを再利用できるかを説明できます。途中だけが一致する場合と区別し、ブロックの境界や保持状況から、最初の出力までにどこを計算するか判断できます。

## 先頭のKVを使い、残りの入力を計算する

次の図では、同じモデル・設定でテキストだけを処理します。指示と仕様書をトークンID 11〜18で表し、異なる質問を 21・90 と 22・90 で表します。共通部分は8トークン、各質問は2トークンです。数字は説明用で、実際の文章を分割した結果ではありません。

Aが先に来たときには、使えるキャッシュがないので10トークン分のKVを作ります。Bが来たときに、Aで作った先頭8トークンのKVが利用可能なら、Bはそれを参照して、質問の2トークンのKVを新しく計算します。図では、4トークン単位の満杯ブロックを2つ使える例にしています。[vLLMのAutomatic Prefix Caching設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/)

<figure style="margin: 1rem 0">
  <div role="img" aria-label="入力Aは共通の指示・仕様書のトークンID11から18に質問21、90が続きます。Aの入力処理で共通のKVを保存します。入力Bは同じ先頭8トークンに質問22、90が続き、先頭2ブロックのKVを再利用します。Bの質問2トークンのKVは新しく計算し、最後の90も含みます。" style="display: grid; grid-template-columns: 3.2em repeat(3, minmax(0, 1fr)); gap: 0.36rem; max-width: 34rem; align-items: center; text-align: center; font-variant-numeric: tabular-nums">
    <span></span><strong style="grid-column: span 2">共通の指示と仕様書</strong><strong>質問</strong>
    <strong style="text-align: left">入力A</strong>
    <span style="border: 1px solid var(--vp-c-divider); border-radius: 4px">11 12 13 14</span>
    <span style="border: 1px solid var(--vp-c-divider); border-radius: 4px">15 16 17 18</span>
    <span style="border: 1px solid var(--vp-c-divider); border-radius: 4px">21 90</span>
    <span></span><span style="grid-column: span 2">↓ Aで作った先頭のKVを保存</span><span></span>
    <strong style="text-align: left">入力B</strong>
    <strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">11 12 13 14</strong>
    <strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">15 16 17 18</strong>
    <span style="border: 1px solid var(--vp-c-divider); border-radius: 4px">22 90</span>
    <span></span><strong style="grid-column: span 2">KVを再利用</strong><strong>新しく計算</strong>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">Bは保存済みの2ブロックを読みながら、別の質問を処理する。質問の末尾に共通の90があっても、第3ブロックの先頭で入力が分かれている。</figcaption>
</figure>

ここで再利用しているのは、各Attention層が入力位置について計算したKとVです。質問がよく似ていても、キャッシュの照合は意味の近さで判断しません。すでに出した回答文を保存して返す応答キャッシュとも扱うデータが異なります。Bの質問に対する出力は、Bの入力を使って生成します。[vLLMのAutomatic Prefix Caching設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/)

## 同じトークンでも、そこまでの文脈を照合する

因果マスク付きのTransformerでは、各位置は自分と左側だけを参照します。先頭のトークン列と位置の扱いが同じで、同じモデル計算を行うなら、後ろの質問が変わっても、前置きの各層のKVは再利用できます。一方、途中のトークンは、そこまでの文脈を反映した層の出力を受け取ります。図の90は同じ位置の同じトークンでも、Aでは直前が21、Bでは22です。前の文脈が異なるので、同じ位置のKVとして取り出せるとは限りません。[Transformer原論文 §3.1–3.2](https://arxiv.org/html/1706.03762v7#S3) · [vLLMの設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/)

vLLM V1の設計では、ブロック内のトークンと、その前までを反映した親ブロックのハッシュから、キャッシュを引くためのキーを作ります。ブロックの中身だけが同じでも、先行ブロックが変われば、そのキーの入力も変わります。比較するのは、テンプレートなどを適用した後にモデルが受け取るトークン列です。文面が似ているかどうかや、途中の数トークンが偶然一致するかどうかでは決まりません。[vLLMのAutomatic Prefix Caching設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/)

## ブロックの境界と、まだ読めるかどうか

先頭が何トークン一致したかと、実際に再利用できるトークン数は別です。vLLM V1の設計資料が扱うキャッシュでは、満杯のブロックを登録し、その単位で再利用します。たとえば、4トークンごとのブロックで先頭6トークンまで一致しても、保存済みの完全な一致は最初の4トークン分だけです。次のブロックは先頭2トークンが一致していても、後ろが異なるので、5トークン目から計算します。ブロックの大きさと再利用条件は実装によって変わります。[vLLMのAutomatic Prefix Caching設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/#example) · [PagedAttention](/algorithms/paged-attention.html)

同じ入力でも、前の処理結果が再利用できる場所に残っている必要があります。vLLM V1では、使っているリクエストがなくなったブロックも、空きキューに戻った時点で内容がキャッシュとして残ることがあります。別の用途でそのブロックを使い直すときは、以前のキーとの対応を外します。これが**追い出し**です。図のAの先頭2ブロックのうち後ろの1つが追い出され、同じ内容が別に残っていなければ、Bで再利用できるのは最初の4トークン分になり、残る6トークン分を処理します。[vLLMのFreeとEviction](https://docs.vllm.ai/en/latest/design/prefix_caching/#free)

キーには、入力によってLoRAの識別子や画像のハッシュなども入ります。トークン列の見た目が同じでも、読み込みに使う画像や重みへの追加が違えば、同じ計算の結果として扱えません。vLLM V1では共有範囲を分ける識別用の値（cache salt）も使えます。再利用対象は、キャッシュを使う設定と、各リクエストで一致すべき条件に依存します。[vLLMのAutomatic Prefix Caching設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/)

## 短くなるのは主に最初の出力を選ぶまで

ヒットした先頭のKVを再計算せずに済むので、最初の出力を選ぶまでの入力処理（**prefill**）を短縮できます。長い前置きを何度も渡す場合、最初の出力までの時間（**TTFT**）を減らせることがあります。未一致部分の処理、キャッシュの読み出し、待ち行列や通信の時間はそれぞれ残ります。図では再計算する入力位置だけを数えています。[vLLMの機能説明](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/#limits) · [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html)

生成を続ける**decode**では、新しい位置の計算と、それまでのKVの参照が続きます。最初の出力が早まった場合も、続きの出力間隔は別に測ります。完全に同じプロンプトでも、vLLM v0.32.0のV1では、次のトークンを選ぶ得点（logits）を得るために末尾位置を再計算します。ブロックの境界に合わせると、末尾が属するブロック全体を処理する場合があります。[vLLMの機能説明](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/#limits) · [vLLM v0.32.0のKVキャッシュ管理実装](https://docs.vllm.ai/en/v0.32.0/api/vllm/v1/core/kv_cache_manager/#vllm.v1.core.kv_cache_manager.KVCacheManager.get_computed_blocks)

## 要点

- プレフィックスキャッシュは、以前と同じ先頭トークン列に対応するKVを、次のリクエストで再利用します。残りの入力を処理し、その質問への回答を生成します。
- 途中のトークンが一致しても、それ以前の文脈が違えば同じKVとして照合できません。
- 実際の再利用範囲は、完全ブロックなどの粒度、キーに含める計算条件、追い出しの有無で変わります。
- 主な効果はprefillで先頭の計算を省き、初回応答を早められることです。生成中の各トークンの計算は続きます。

## 理解度チェック

::: details 図のBでは、末尾の90もAのKVを使える？
AとBでは、その一つ前のトークンが異なります。Bでは22と90の両方の位置を新しく処理します。
:::

::: details 4トークン単位で前置きが6トークン一致したら、どこまで使える？
この例の満杯ブロック単位では、最初の4トークンです。残りは次のブロックで新しく処理します。
:::

## 検証範囲

2026年11月21日にvLLMの公式文書・実装資料とTransformer原論文を確認しました。WindowsのPython 3.12.4で、説明用のトークンIDについて、先頭8トークンの一致、6トークン一致時の完全ブロック、追い出し後の再利用範囲を検算しました。学習済みモデルのトークン分割、実際のvLLMの動作、GPUの負荷、応答時間は測っていません。

## 関連項目

- [KVキャッシュ](/algorithms/kv-cache.html) — 各Attention層に保存する値と、生成時に読み直す理由を追う。
- [PagedAttention](/algorithms/paged-attention.html) — KVの置き場所をブロック表で引く仕組みと、共有時の管理を読む。
- [LLM推論のprefillとdecode](/algorithms/llm-prefill-and-decode.html) — 入力の処理時間と、最初の出力や続きが届く時間を区別する。

## 参考資料

- [vLLM — Automatic Prefix Caching設計資料](https://docs.vllm.ai/en/latest/design/prefix_caching/) — V1のキャッシュキー、満杯ブロック、空きキューと追い出し。
- [vLLM — Automatic Prefix Caching機能説明](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/) — 同じ資料への質問、prefillの再利用、decodeの範囲。
- [vLLM v0.32.0 — KVCacheManager](https://docs.vllm.ai/en/v0.32.0/api/vllm/v1/core/kv_cache_manager/) — 全文一致時の末尾とブロック境界の扱い。
- [Ashish Vaswaniほか — Attention Is All You Need（2017）](https://arxiv.org/abs/1706.03762) — 因果マスクとデコーダーでの文脈の計算。
