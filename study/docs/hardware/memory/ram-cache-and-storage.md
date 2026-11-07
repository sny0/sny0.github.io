---
title: RAM・キャッシュ・ストレージの違い
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: ゲームを読み込み、計算し、セーブする場面から、RAM、CPUキャッシュ、レジスタ、SSDの役割を説明する。容量、遅延、帯域、仮想メモリとの関係も整理する。
  aliases: [RAM, DRAM, 主記憶, メインメモリ, CPUキャッシュ, L1, L2, L3, レジスタ, SSD, ストレージ, メモリ階層, VRAM]
  verification: OpenStax・Armのメモリ階層、Intelの計測資料、Microsoftのメモリ管理・ファイルキャッシュ・D3D12資料と照合（2026-11-07）
---

# RAM・キャッシュ・ストレージの違い

ゲームをインストールすると、プログラムや画像はSSDなどの**ストレージ**に保存されます。ゲームを起動して遊ぶ間は、実行に必要な命令やデータを**RAM**に置き、CPUが処理します。CPUの近くには**キャッシュ**と**レジスタ**もあり、計算で使う値を保持します。まず「どこに保存しておくか」と「いま計算で何を使うか」から、それぞれの役割を見ます。[OpenStaxのメモリ階層](https://openstax.org/books/introduction-computer-science/pages/5-5-memory-hierarchy) · [コンピュータの構成要素](/hardware/computer-components.html)

## データを置く場所と目的

| 場所 | 主な役割 | ゲームでの例 |
| --- | --- | --- |
| **レジスタ** | CPUの命令が計算の入力や結果を保持する、ごく小さな記憶場所。 | 座標の加算で使う現在の値や計算結果。 |
| **CPUキャッシュ** | メモリの一部の内容をCPUの近くで保持し、必要なデータを短い待ち時間で使えるようにする。 | 毎フレーム読む敵の座標の一部分。 |
| **RAM・主記憶** | 動作中のプログラムやデータを保持する。一般的なPCの主記憶にはDRAMを使う。 | 読み込んだマップ、敵の一覧、作業中のセーブ内容。 |
| **SSDなどのストレージ** | ファイルを保存し、通常は電源を切っても内容を保持する。 | インストール済みの画像ファイルやセーブファイル。 |

レジスタ・一般的なCPUキャッシュ・DRAMは、電力の供給がなくなると内容を保持できない**揮発性**の記憶です。セーブするには、アプリが保存する内容をファイルとしてストレージへ書き出します。RAMの中でプレイヤーの位置が変わるだけでは、前回のセーブファイルの内容は更新されません。[OpenStaxの揮発性と永続ストレージ](https://openstax.org/books/introduction-computer-science/pages/5-5-memory-hierarchy) · [Armのキャッシュとメモリ階層](https://support.arm.com/documentation/den0042/latest/Caches)

<figure class="study-figure">
  <img src="/images/hardware/ram-cache-and-storage.svg" alt="レジスタは命令の入力と結果、CPUキャッシュは近くで使うメモリの一部、RAMは動作中の命令とデータ、SSDは保存するファイルを保持する。CPUの近くの記憶ほど一般に小容量で待ち時間が短く、大きな記憶と組み合わせて使う。RAMとSSDの読み書きはOSのI/O処理に関係する。" width="760" height="430" loading="lazy">
  <figcaption>役割を比べた図です。L1・L2・L3などの構成や容量はCPUによって異なります。<a href="/study/images/hardware/ram-cache-and-storage.svg" target="_blank" rel="noopener noreferrer">記憶場所の図を拡大</a></figcaption>
</figure>

## なぜ何種類も組み合わせるのか

CPUのすぐ近くで短い待ち時間で使える記憶は、用意できる容量に制約があります。一方、RAMやストレージは大量のデータを置けますが、個々のアクセスを待つ時間が長くなります。そこで、よく使う範囲を近くに保持しながら、大きな記憶も使う構成にします。この組み合わせを**メモリ階層**と呼びます。[Armのメモリ階層](https://support.arm.com/documentation/107565/0101/Memory-system/Caches-and-memory-hierarchy/Memory-hierarchy)

CPUキャッシュの**ヒット**は、必要な範囲がそのキャッシュにあることです。**ミス**すると、別のキャッシュやRAMなどからデータを得る必要があります。キャッシュは周辺のバイトを含む**キャッシュライン**という単位で扱うため、配列を隣から順に使うと、一度得た範囲を活用しやすくなります。L1・L2・L3の数字は階層を表し、一般に小さい数字ほどCPUコアに近い側です。[ArmのCPUメモリ階層](https://learn.arm.com/learning-paths/servers-and-cloud-computing/performix-memory-access/how-to-0/) · [キャッシュ局所性とAoS・SoA](/runtime/memory/cache-locality-aos-soa.html)

## 容量・遅延・帯域を分けて見る

| 指標 | 調べること | 例 |
| --- | --- | --- |
| **容量** | 同時にどれだけ置けるか。 | RAMにマップと敵の状態を合わせて何GB置けるか。 |
| **遅延・レイテンシー** | 一つの要求から結果が得られるまで、どれだけ待つか。 | 次の敵の参照先を一件ずつ読み、毎回結果を待つ時間。 |
| **帯域** | 単位時間にどれだけ転送できるか。 | 大きな画像データを連続して読み出すときのGB/s。 |

容量を増やすことと、一件の読み取りの待ち時間を短くすることは別の指標です。また、連続転送で高い帯域が出ても、次のアドレスが直前の結果で決まる読み方では、その待ち時間が処理全体に効きます。ゲームでは「読み込む総量」「繰り返し参照する範囲」「一件ずつ待つ箇所」を分けて調べます。[Intelの帯域と遅延の測定](https://www.intel.com/content/www/us/en/developer/articles/tool/intelr-memory-latency-checker.html) · [DRAMのチャネルと帯域](/hardware/memory/dram-channels-and-bandwidth.html)

## ファイルのバイトが、アプリのデータになるまで

1. ゲームが必要なファイルと範囲を指定して読み取りを要求します。Windowsの通常のキャッシュ付きI/Oでは、OSはRAM上のファイルキャッシュを使えます。そこにデータがなければストレージからの読み取りが必要になります。
2. 読み取ったバイトを、ゲームが画像やマップなどのデータとして解釈します。圧縮されたファイルなら展開も行います。アプリが扱うアドレスは通常**仮想アドレス**で、OSとCPUの仕組みにより、実際のRAM上の場所に対応付けられます。
3. CPUが命令を実行し、データを読み書きします。CPUキャッシュは、このメモリアクセスを速くするために使われます。[Microsoftのファイルキャッシュ](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching) · [仮想アドレス空間](https://learn.microsoft.com/en-us/windows/win32/memory/virtual-address-space)

巨大なファイルは必要な範囲ずつ読み込めます。メモリマップドファイルでは、ファイルの範囲を仮想アドレス空間へ対応付け、アクセスに応じてページ単位で内容を用意できます。どの範囲をいつ読み込むかは、OSとアプリの使う方法によって変わります。[メモリマップドファイル](/os/memory-mapped-files.html) · [ファイルを読むと内部で何が起きるか](/os/file-read-journey.html)

セーブではアプリがファイルへの書き込みを要求します。Windowsのキャッシュ付き書き込みでは、RAM上で変更を受け付けてからストレージへ書き出す場合があります。保存の完了をどこまで保証するかは、使うAPIやフラッシュ操作、デバイスの動作も含めて考えます。[Microsoftのファイルキャッシュ](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching) · [Windowsのファイルキャッシュ](/os/windows-file-cache.html)

## GPUが使うメモリ

**VRAM**は、画像や頂点などGPUが使うデータを保持するメモリを指します。独立したGPUボードでは専用のビデオメモリを持つ構成が一般的です。CPUとGPUが主記憶を共有する構成は**UMA**（Unified Memory Architecture）と呼びます。使える配置と転送方法は構成により変わるので、CPU用のRAM容量とGPU用の表示を合わせて確認します。[MicrosoftのD3D12メモリ構成](https://microsoft.github.io/DirectX-Specs/d3d/ResourceHeaps.html) · [CPUとGPUの役割分担](/hardware/gpu/cpu-vs-gpu.html)

命令がレジスタをどう使うかは[CPUの命令実行](/hardware/cpu/instruction-execution.html)、仮想アドレスとページは[仮想メモリ](/os/virtual-memory.html)で説明します。
