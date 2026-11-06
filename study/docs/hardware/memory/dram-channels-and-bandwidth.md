---
title: DRAMのチャネルと帯域 — データをどこから、どの速さで読むか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: CPUのメモリコントローラーがチャネル、ランク、バンク、行を選ぶ流れを追う。DDR4・DDR5の理論帯域を計算し、キャッシュにない1件を読む時間との違いを考える。
  aliases: [DRAM, DDR4, DDR5, メモリコントローラー, メモリチャネル, ランク, バンク, row buffer, MT/s, CL, メモリ帯域]
  verification: Intel・Micron・ISSIのメモリ仕様とIntelのメモリ計測資料に照合（2026-11-07）
---

# DRAMのチャネルと帯域 — データをどこから、どの速さで読むか

CPUが通常のメモリを読み、キャッシュ階層で要求を満たせずDRAMのデータが必要になると、メモリコントローラーが転送を進めます。例えばCPUが大きな配列を読むとき、複数のチャネルを使って同時に運べる量を増やせます。一方、次に読むアドレスが前の読み取り結果で決まる場合は、個々の要求を待つ時間が効きます。[Intelのメモリコントローラー資料](https://edc.intel.com/content/www/us/en/design/ipla/software-development-platforms/client/platforms/alder-lake-desktop/12th-generation-intel-core-processors-datasheet-volume-1-of-2/001/memory-controller-mc/) · [Intelの遅延測定の仕組み](https://www.intel.com/content/www/us/en/developer/articles/tool/intelr-memory-latency-checker.html) · [メモリとキャッシュの学習ガイド](/guide/low-level/memory-and-cache.html)

## チャネル、ランク、バンク、行

メモリコントローラーは物理アドレスに対応する場所を選び、待っている読み書きとDRAMのリフレッシュを調整します。一般的なDIMMを使う構成では、場所を次の単位に分けて考えられます。アドレスを各単位へ振り分ける規則はコントローラーや構成で変わります。[Intelのメモリコントローラー資料](https://edc.intel.com/content/www/us/en/design/ipla/software-development-platforms/client/platforms/alder-lake-desktop/12th-generation-intel-core-processors-datasheet-volume-1-of-2/001/memory-controller-mc/) · [Micronのバンクとランクの説明](https://jp.micron.com/sales-support/sales/faqs)

| 単位 | 役割 |
| --- | --- |
| チャネル | コントローラーとメモリの間の転送経路。独立したチャネルを使えれば転送を並行させられる。 |
| ランク | 同じ選択信号で選ばれ、協力して転送するチップの組。複数のランクが同じチャネルのデータ線を使うことがある。 |
| バンク | DRAMチップ内で行を選んで開ける記憶領域。コントローラーはタイミングの制約に従って別バンクの操作も進められる。 |
| 行・列 | バンク内の位置。行を開いてから、列を指定して必要な範囲を連続転送する。 |

例えば、データ幅8ビットのDDR4チップ8個で、64ビット幅の1ランクを構成できます。1枚のDIMMが複数のランクを持つ構成もあります。同じチャネル上でランクが増えると、切り替えながら別の要求を進められますが、チャネルのデータ線は共用するため、帯域を求める式にランク数を掛けません。[Micronのランクの説明](https://jp.micron.com/sales-support/sales/faqs) · [ISSIの共有データ線を使う複数ランクの例](https://www.issi.com/WW/pdf/43-46QR8K02S2A.pdf#page=6)

<figure class="study-figure">
  <img src="/images/hardware/dram-channels-and-bandwidth.svg" alt="CPUから必要なデータをDRAMに求めると、メモリコントローラーがチャネルを選ぶ。データ幅64ビットのDDR4-3200では1チャネル25.6 GB/s、独立した2チャネルで合計51.2 GB/sが理論上限。同じバンクで別の行を読むには、今の行を閉じ、次の行を開いてから読む。" width="760" height="414" loading="lazy">
  <figcaption>チャネルはデータの通り道です。DRAMの中では、選ばれたバンクの行が開いているかでも読み取り手順が変わります。<a href="/study/images/hardware/dram-channels-and-bandwidth.svg" target="_blank" rel="noopener noreferrer">チャネルと行の図を拡大</a></figcaption>
</figure>

## 行を開き、列を読み、次の行へ切り替える

バンクが閉じていれば、`ACTIVATE`で行を選びます。開いた行の内容はセンスアンプに保持されます。`READ`はその行の列を指定し、データを数回分まとめて転送します。同じ行が開いている間に次の要求が来れば、再度行を開く手順を省けます。これを**行ヒット**と呼びます。同じバンクの別の行が必要なら、`PRECHARGE`で今の行を閉じてから、次の行を開きます。別バンクなら、一方が待つ間に他方を準備できる場合があります。[ISSIのDDR4コマンド仕様](https://www.issi.com/WW/pdf/43-46QR81024A-16512A.pdf) · [IntelのDRAMタイミング表](https://edc.intel.com/content/www/us/en/design/ipla/software-development-platforms/client/platforms/alder-lake-desktop/12th-generation-intel-core-processors-datasheet-volume-1-of-2/001/system-memory-timing-support_1/)

このようにDRAMにもアクセスの局所性があります。プログラムが連続するアドレスを読むときも、アドレスをチャネルやバンクへ分散させる規則と、コントローラーが行を保持する方針に応じて行ヒット率は変わります。プログラム側でまず調べるのは、隣り合うデータを同じキャッシュラインから使えているかです。[CPUのキャッシュ局所性](/runtime/memory/cache-locality-aos-soa.html)

## MT/sから理論帯域を求める

**MT/s**は1秒あたり100万回の転送を表します。DDRは入出力で1クロック周期に2回転送するため、DDR4-3200では外部クロックは1,600 MHz、転送率は3,200 MT/sです。帯域を計算するときは、すでに2回分を含む転送率に、1転送あたりのデータ幅をバイトに直して掛けます。データ幅64ビットのチャネルは1転送で8バイトです。[Intelの理論帯域の計算方法](https://www.intel.com/content/www/us/en/support/articles/000056722/processors/intel-core-processors.html) · [ISSIのDDR4入出力仕様](https://www.issi.com/WW/pdf/43-46QR81024A-16512A.pdf#page=7)

| DDR4-3200の例 | 理論帯域（1 GB = 10億バイト） |
| --- | --- |
| データ幅64ビットの1チャネル | `3,200 × 10⁶ 転送/s × 8 バイト/転送 = 25.6 GB/s` |
| 同じ速度の独立した2チャネルを使用 | `25.6 × 2 = 51.2 GB/s` |

この合計を使うには、要求が両方に分かれて処理される構成が要ります。DIMMの枚数だけで判断せず、コントローラーが使っているチャネルと実際の転送率を確認します。リフレッシュや読み書きの切り替え、転送前の待ちがあるため、アプリで計測する帯域はアクセスの仕方でも変わります。[Intelの独立したメモリコントローラーの例](https://edc.intel.com/content/www/us/en/design/ipla/software-development-platforms/client/platforms/alder-lake-desktop/12th-generation-intel-core-processors-datasheet-volume-1-of-2/001/memory-controller-mc/) · [Intelの読み書き比率別の帯域計測](https://www.intel.com/content/www/us/en/developer/articles/tool/intelr-memory-latency-checker.html)

DDR5の一般的なクライアント向けDIMMでは、データ幅32ビットの独立したサブチャネルを2本持ちます。DDR5-5600の各サブチャネルは `5,600 × 10⁶ × 4 = 22.4 GB/s`、2本合計のデータ幅64ビットでは44.8 GB/sです。製品資料がチャネルを数えるときは、対応するデータ幅も確認します。外部ECCの検査ビットを運ぶ構成でも、アプリのデータ帯域にはデータ本体の幅を使います。[MicronのDDR5 DIMMとサブチャネルの資料](https://assets.micron.com/adobe/assets/urn%3Aaaid%3Aaem%3A5902f17e-8bde-4246-971c-8d7f274c6b1a/original/as/ddr5-key-module-features-wp-client.pdf) · [MicronのDDR5転送率表](https://my.micron.com/content/dam/micron/global/public/products/part-numbering-guide/numsdrammod.pdf)

## 1回の読み取りにかかる時間を分けて見る

DDR4-3200では1クロックが0.625 nsです。CASレイテンシーが22クロックの設定なら、`READ`から最初のデータまでの目安は `22 × 0.625 ns = 13.75 ns` です。行を開く時間や切り替える時間は別の項目で、CPU側から見た読み取りには、キャッシュの確認、コントローラーまでの移動、先行する要求を待つ時間なども加わります。[IntelのDDR4-3200タイミング表](https://edc.intel.com/content/www/us/en/design/ipla/software-development-platforms/client/platforms/alder-lake-desktop/12th-generation-intel-core-processors-datasheet-volume-1-of-2/001/system-memory-timing-support_1/) · [Intelのメモリ計測資料](https://www.intel.com/content/www/us/en/developer/articles/tool/intelr-memory-latency-checker.html)

大きな配列のコピーでは、複数の読み取りを先に発行できるため、単位時間あたりの転送量を測ります。ポインターをたどる処理では、次のアドレスを知るまで先へ進めないので、1回ずつの読み取りの遅延が表れやすくなります。テストのデータがキャッシュに収まるか、ほかの処理もDRAMを使うかを揃えて比べます。例えば統合GPUがシステムメモリを共有する構成では、描画中にもCPUが使える帯域や遅延が変わり得ます。[Intelの帯域・負荷時遅延の計測](https://www.intel.com/content/www/us/en/developer/articles/tool/intelr-memory-latency-checker.html) · [CPUとGPU](/hardware/gpu/cpu-vs-gpu.html) · [デバイスとメモリ間のDMA](/hardware/io/dma-and-iommu.html)
