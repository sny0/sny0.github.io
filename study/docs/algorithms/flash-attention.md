---
title: FlashAttention：計算を近似せずにGPUメモリの往復を減らす
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: HBMに中間行列を保存するAttentionと、オンチップでタイルを処理するFlashAttentionを比べる。走行最大値が変わるオンラインsoftmaxを検算する。
  aliases: [FlashAttention, Flash Attention, フラッシュアテンション, オンラインsoftmax, Online Softmax]
  verification: FlashAttentionとPagedAttentionの原論文およびNVIDIAの数値資料に照合し、WindowsのPython 3.12.4でオンラインsoftmaxと容量例を検算（2026-11-21）
---

# FlashAttention：計算を近似せずにGPUメモリの往復を減らす

長い文章のAttentionを計算するとき、各位置がどの位置をどれほど参照するかを表にすると、トークン数が2倍になれば表の要素数は4倍になります。GPUで表を丸ごと保存すると、次の処理で読み直す時間もかかります。**FlashAttention**は、必要な範囲を小分けに読み、表全体をGPUメモリへ書かずに、同じAttentionの結果を組み立てる方法です。[DaoらのFlashAttention原論文](https://arxiv.org/abs/2205.14135)

## この記事で分かること

通常の段階別実装とFlashAttentionで、GPUメモリに何を読み書きするかを説明できます。途中でsoftmaxの最大値が更新されても、先に足した分を補正すると同じ計算になる理由を追えます。

## N×Nの中間行列を、段ごとに保存する場合

系列長を $N$、1ヘッドの次元を $d$ とします。ここでは、1系列の密な自己Attentionの**前向き計算**を考え、マスクとドロップアウトは省きます。$Q$は参照する側、$K$は参照先と比べる値、$V$は参照先から混ぜる値です。まず $S=QK^\mathsf{T}/\sqrt d$ でスコアを作り、行ごとのsoftmaxで重みの表 $P$ にします。出力 $O$ は $PV$ です。$S$ と $P$ はそれぞれ $N\times N$ になります。[TransformerとAttention](/algorithms/transformer-attention.html) · [Daoらの原論文 §2](https://arxiv.org/html/2205.14135v2#S2)

$N=4096$、中間行列の要素が2バイトなら、$S$ だけで $4096^2\times 2$ バイト（32 MiB）です。$P$ も同じ条件なら32 MiBです。段ごとに別の処理として実行して中間を保存する実装では、出力 $O$ を得るまでに、これらをGPUの主メモリへ書き、後の段で再び読みます。転送総量は行列の容量に加えて、各段で何回読み書きするかに左右されます。[Daoらの原論文 §2.2・Appendix B](https://arxiv.org/abs/2205.14135)

## タイルに切り、GPU内でまとめて計算する

**HBM**（High Bandwidth Memory）は、論文が想定するGPUの主メモリです。**オンチップSRAM**は、GPUチップ内の容量が小さい高速な作業領域です。FlashAttentionは $Q$、$K$、$V$ を、チップ上で扱える大きさの小片（**タイル**）に分けます。スコアと指数を小片のまま計算し、その場で行ごとの出力に足し込みます。[Daoらの原論文 図1・§3.1](https://arxiv.org/abs/2205.14135) · [GPUアーキテクチャ](/hardware/gpu/architecture.html)

<figure style="margin: 1rem 0">
  <div role="img" aria-label="段ごとに保存する方式は、HBMからQとKを読みスコアSの全行列をHBMへ書き、Sを読み直してsoftmaxのPをHBMへ書き、PとVを読んでOを書く。FlashAttentionはHBMからQ、K、Vのタイルと行の状態を読み、小片のスコアと重み付き和をオンチップで処理し、部分出力と行の状態をHBMへ戻す。SとPの全行列はHBMへ書かない。" style="display: grid; gap: 0.55rem; max-width: 36rem">
    <strong>段ごとに保存する場合</strong>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.3rem; text-align: center; align-items: center; font-size: 0.92em">
      <strong>HBMから読む</strong><strong>GPU内で計算</strong><strong>HBMへ書く</strong>
      <span>Q・K →</span><span>スコア →</span><strong style="border: 1px solid var(--vp-c-divider); border-radius: 4px">S 全体<br>（N×N）</strong>
      <span>S 全体 →</span><span>行softmax →</span><strong style="border: 1px solid var(--vp-c-divider); border-radius: 4px">P 全体<br>（N×N）</strong>
      <span>P 全体・V →</span><span>重み付き和 →</span><span>出力 O</span>
    </div>
    <strong>FlashAttentionでタイルを処理する場合</strong>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.3rem; text-align: center; align-items: center; font-size: 0.92em">
      <strong>HBMから読む</strong><strong>オンチップSRAM</strong><strong>HBMへ戻す</strong>
      <span>Q・K・Vの小片<br>行の途中結果 →</span>
      <strong style="border-radius: 4px; background: var(--vp-c-brand-soft)">小片を計算し<br>行の状態を更新 →</strong>
      <span>部分出力 O<br>行ごとの統計量</span>
    </div>
  </div>
  <figcaption style="font-size: 0.875rem; margin-top: 0.55rem">上のSとPは、次の段で読み直すための全行列。下は、タイルの計算を繰り返しながら、行ごとの途中結果を更新する。全タイルの処理後に最終出力Oが得られる。</figcaption>
</figure>

2022年の原論文のAlgorithm 1では、外側のループで $K$ と $V$ のタイルをHBMから読みます。その間に内側のループで $Q$ のタイルと行ごとの途中結果を読み、計算後に部分出力と統計量をHBMへ書き戻します。この往復は残ります。省くのは、$N\times N$ のスコアと重みを丸ごと並べた中間行列の保存と再読です。タイルの順序や行の状態をどこに保持するかは、実装によって変わります。[Daoらの原論文 §3.1・Algorithm 1](https://arxiv.org/pdf/2205.14135#page=5)

## 最大値が途中で変わったら、先に足した分を調整する

1行のsoftmaxは、スコア $s_j$ ごとの指数の比です。最大値 $m$ を全スコアから引いても、その比は変わりません。指数が過大にならないようにするため、この $m$ を使います。タイルを読んでいる途中では、後ろにもっと大きい値があるかは未確定です。そこで、ここまでの最大値（**走行最大値**）と、分母に使う和 $\ell$、まだ正規化していないVの加重和 $z$ を持ちます。

$$
\begin{aligned}
m &= \max_j s_j,\\
\ell &= \sum_j \exp(s_j-m),\\
z &= \sum_j \exp(s_j-m)\,v_j,\\
o &= z/\ell.
\end{aligned}
$$

新しいタイルを読んで最大値が $m'$ になったら、先に足した $\ell$ と $z$ の両方に $\exp(m-m')$ を掛けます。これは、以前の指数 $\exp(s_j-m)$ を、新しい基準の $\exp(s_j-m')$ へ変えるためです。その後、新しいタイルの分を同じ基準で足し、最後に $z/\ell$ を求めます。これが**オンラインsoftmax**の要点です。ここでは説明用に $z$ を持ち、2022年のAlgorithm 1は、正規化した途中出力と統計量を更新します。[Daoらの原論文 §3.1・Appendix C](https://arxiv.org/abs/2205.14135)

### 2枚目のタイルで最大値が更新される例

スコアを $(0,\ln2\mid\ln4,\ln8)$、対応するスカラーのVを $(1,3\mid5,7)$ とします。縦線がタイルの境界です。スコアはすでに内積とスケーリングを終えた説明用の値です。

| 段階 | $m$ | $\ell$ | $z$ |
| --- | --- | ---: | ---: |
| 1枚目 | $\ln2$ | $3/2$ | $7/2$ |
| 2枚目 | $\ln8$ | $15/8$ | $83/8$ |

1枚目では、指数を $(1/2,1)$ として足します。2枚目が来ると、新しい最大値は $\ln8$ です。以前の値に掛ける係数は $\exp(\ln2-\ln8)=1/4$ です。2枚目の新しい指数は $(1/2,1)$ なので、分母は $(3/2)/4+1/2+1=15/8$、加重和は $(7/2)/4+5/2+7=83/8$ になります。出力は $83/15$ です。一括でも、元のスコアの指数は $(1,2,4,8)$ で、$1\cdot1+2\cdot3+4\cdot5+8\cdot7=83$ を合計の15で割ります。

次のコードは1行の計算をPythonで検算する例です。タイルやGPUカーネルの性能を測るためのコードとは範囲が異なります。

```python
from math import exp, inf, isclose, log

scores = [0.0, log(2), log(4), log(8)]
values = [1.0, 3.0, 5.0, 7.0]
m, total, weighted = -inf, 0.0, 0.0

for start in range(0, len(scores), 2):
    tile = scores[start:start + 2]
    tile_values = values[start:start + 2]
    next_m = max(m, max(tile))
    rescale = exp(m - next_m)
    weights = [exp(s - next_m) for s in tile]
    total = rescale * total + sum(weights)
    weighted = rescale * weighted + sum(
        w * v for w, v in zip(weights, tile_values, strict=True)
    )
    m = next_m

whole_m = max(scores)
whole_weights = [exp(s - whole_m) for s in scores]
whole = sum(w * v for w, v in zip(whole_weights, values, strict=True)) / sum(whole_weights)
online = weighted / total
assert isclose(online, whole, rel_tol=1e-12)
assert isclose(online, 83 / 15, rel_tol=1e-12)
print(f"{online:.12f}")
```

出力は `5.533333333333` です。実数の式では同じ出力になります。浮動小数点では、足し算の順序や中間値の丸めが変わるため、ビット単位で一致するとは限りません。[NVIDIAの浮動小数点解説](https://docs.nvidia.com/cuda/floating-point/index.html)

## 演算量と、KVの置き場所を区別する

FlashAttentionの密な計算では、参照する各QとKの組の内積が残ります。1組あたりの次元が $d$ なら、密な自己Attentionの前向き計算の演算量は $O(N^2d)$ です。因果マスクで未来側を省く場合も、有効な組は $N(N+1)/2$ あり、系列長に対して二次です。中間行列を保存する必要をなくすことと、参照する組の数を減らすことは別です。速さは、GPUと入力形状、タイルの取り方、実装に左右されます。[Daoらの原論文 §3.1–3.2](https://arxiv.org/html/2205.14135v2#S3)

[PagedAttention](/algorithms/paged-attention.html)が扱うのは、リクエストの過去のKVをどこに置き、どのブロックから探すかです。FlashAttentionのタイルは、Attentionを評価する間にチップ上へ載せる計算単位です。前者はKVキャッシュの配置と割り当て、後者はAttentionの中間行列とメモリの往復を主に扱います。[KwonらのPagedAttention原論文 §4.1–4.3](https://arxiv.org/abs/2309.06180) · [DaoらのFlashAttention原論文](https://arxiv.org/abs/2205.14135)

## 要点

- 段ごとに分ける実装では、長さ $N$ の自己Attentionで $N\times N$ のスコアと重みをHBMへ保存し、読み直します。
- FlashAttentionはタイル内で計算し、行の途中結果を更新して、全行列の保存と再読を省きます。
- オンラインsoftmaxで走行最大値が変わるときは、先に足した分母と加重和を新しい基準に調整します。
- 同じAttentionの式を計算しても丸め差はあり得ます。密な演算量は $O(N^2d)$ で、PagedAttentionは別の課題であるKVの配置を扱います。

## 理解度チェック

::: details 2枚目の最大値が大きかったとき、分母だけを調整すればよい？
Vの加重和にも、以前の基準で計算した指数が入っています。分母と加重和を同じ係数で調整します。
:::

::: details HBMにN×Nの重みを書かないなら、密なAttentionで計算する組も減る？
この方式はタイルで各組を評価します。変わるのは、途中結果をどの段でどこに保存するかです。
:::

## 検証範囲

2026年11月21日に、2022年のFlashAttention原論文などを照合し、WindowsのPython 3.12.4で32 MiBの容量例と、走行最大値が変わる1行のオンラインsoftmaxを検算しました。GPUでの転送量、カーネルの速度、モデルの出力は測っていません。

## 関連項目

- [TransformerとAttention](/algorithms/transformer-attention.html) — QとKでスコアを作り、softmaxでVを混ぜる元の計算を読む。
- [GPUアーキテクチャ](/hardware/gpu/architecture.html) — オンチップの作業領域と、GPUの主メモリの位置づけを確認する。
- [Rooflineモデル](/hardware/gpu/roofline-model.html) — デバイスメモリとの転送量を減らすと、帯域から決まる演算性能の上限がどう変わるかを読む。
- [PagedAttention](/algorithms/paged-attention.html) — 過去のKVを離れたブロックへ置き、ブロック表から参照する仕組みを読む。

## 参考資料

- [Tri Daoほか — FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness（2022）](https://arxiv.org/abs/2205.14135) — タイリング、オンライン集計、HBM転送と演算量の分析。
- [Woosuk Kwonほか — Efficient Memory Management for Large Language Model Serving with PagedAttention（2023）](https://arxiv.org/abs/2309.06180) — KVブロックの配置と参照。
- [NVIDIA — Floating Point and IEEE 754](https://docs.nvidia.com/cuda/floating-point/index.html) — 浮動小数点での丸めと演算順序。
