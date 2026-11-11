---
title: PCI Expressのリンクとレーン
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: CPU側からGPU・NVMe SSD・NICまでのPCIe経路をたどる。リンクの世代と幅、片方向帯域の計算、経路上のボトルネックを扱う。
  aliases: [PCI Express, PCIe, root complex, root port, endpoint, switch, lane, レーン, リンク幅, GT/s]
  verification: PCI-SIGの公開技術資料、MicrosoftのPCIeレジスター資料、LinuxカーネルのPCI API資料に照合（2026-11-07）
---

# PCI Expressのリンクとレーン

PCの各部品が担う役割は、[コンピュータを構成する部品](/hardware/computer-components.html)の図で確認できます。

GPUへのアップロード、NVMe SSDからの読み取り、ネットワークカードでのパケット受信では、データがCPU・メモリ側とデバイスの間を移動します。**PCI Express（PCIe）**は、こうした機器を、両端にポートを持つ点対点の**リンク**で結びます。どのリンクを通り、各リンクが何レーン・何GT/sで動くかを調べると、転送経路のどこで帯域を使い合うかが分かります。[Intel公開のPCIeトポロジー資料 §1.3](https://www.intel.com/content/dam/support/us/en/programmable/support-resources/fpga-wiki/asset03/pci-express-base-r2.1.pdf#page=39)

## CPU側からデバイスまでの経路

**ルートコンプレックス（Root Complex）**はCPU・メモリ側とPCIe階層をつなぎます。その**ルートポート**から、GPUなどの**エンドポイント**へ直接リンクを張ることも、PCIeスイッチへつなぐこともできます。スイッチは上流ポートと複数の下流ポートを持ち、行き先に応じてトランザクションを中継します。CPU側へ向かう複数機器のデータが同じ上流リンクを通る構成では、そのリンクの帯域を分け合います。[Intel公開のPCIeトポロジー資料 §1.3](https://www.intel.com/content/dam/support/us/en/programmable/support-resources/fpga-wiki/asset03/pci-express-base-r2.1.pdf#page=39) · [Linux PCIサポートライブラリー](https://docs.kernel.org/driver-api/pci/pci.html)

<figure class="study-figure">
  <img src="/images/hardware/pcie-links.svg" alt="CPUとRAMにつながるルートコンプレックスから、GPUへ直結するx16リンクとPCIeスイッチへ向かうx4リンクが伸びる。スイッチに接続したNVMe SSDとNICは、CPU側との通信で上流x4を共有する。" width="760" height="424" loading="lazy">
  <figcaption>GPUが直結し、SSDとNICがスイッチを経由する構成例です。各リンクの幅と経路上で共有する区間を見ます。<a href="/study/images/hardware/pcie-links.svg" target="_blank" rel="noopener noreferrer">PCIeの接続図を拡大</a></figcaption>
</figure>

## レーン数と速度はリンクごとに決まる

1レーンには送信用と受信用の差動ペアがあり、両方向へ同時に信号を送れます。複数のレーンをまとめて1リンクとして動かし、`x4`なら4レーン、`x16`なら16レーンです。リンクを立ち上げるトレーニングで、両端の能力と利用できるレーンに応じて速度・幅が決まります。ボードの仕様にあるスロットの長さ、電気的に配線されたレーン数、リンクが現在使うレーン数はそれぞれ確認します。例えばx16形状のスロットでも、配線がx4ならリンクに使えるのは最大4レーンです。[PCI-SIGの公開リンク技術資料](https://pcisig.com/sites/default/files/files/PCI-SIG%20Cabling%20Webinar_FINAL.pdf) · [Microsoftの交渉済みリンク速度と幅](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_pci_express_link_status_register)

調査では、機器が**対応できる最大値**と、実際に**交渉された値**を並べて見ます。例えばGen 5対応のSSDでも、接続先とGen 4 x4で交渉された場合は、そのリンクの計算に16 GT/sと4レーンを使います。スイッチや別のブリッジがあれば上流リンクの設定も確認します。[Microsoftの対応速度レジスター](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-pci_express_link_capabilities_2_register) · [Linuxの経路上のリンク帯域確認](https://docs.kernel.org/driver-api/pci/pci.html#c.pcie_bandwidth_available)

## GT/sから片方向のバイト数を見積もる

GT/sは、1レーンが1秒間に行う転送回数を10億回単位で表します。Gen 3〜5のNRZでは1転送が1ビットに対応し、128b/130bの符号化で128ビットごとに130ビットを使います。ここでの片方向の計算値は、`GT/s × (128 / 130) ÷ 8 × レーン数` GB/sです。例えばGen 4 x4なら `16 × 128 / 130 ÷ 8 × 4 ≈ 7.88` GB/s です。1 GBは10億バイトとして計算します。[PCI-SIGの転送レート・符号化・信号方式の表](https://pcisig.com/sites/default/files/files/PCI-SIG%20Cabling%20Webinar_FINAL.pdf)

| 世代 | 1レーンの転送回数 | x1の片方向 | x4の片方向 | x16の片方向 |
| --- | ---: | ---: | ---: | ---: |
| Gen 3 | 8 GT/s | 約0.98 GB/s | 約3.94 GB/s | 約15.75 GB/s |
| Gen 4 | 16 GT/s | 約1.97 GB/s | 約7.88 GB/s | 約31.51 GB/s |
| Gen 5 | 32 GT/s | 約3.94 GB/s | 約15.75 GB/s | 約63.02 GB/s |

表は符号化の分を引いた段階の帯域です。アプリのデータに加えて、PCIeではトランザクションのヘッダー、読み取り要求と応答、データリンクの制御情報なども流れます。小さいデータを細かく運ぶ場合は、同じバイト数を大きなペイロードにまとめられる場合より、ペイロード以外の占める割合が増えます。[PCI-SIGのペイロードサイズと帯域効率の比較](https://pcisig.com/blog/evolution-pci-express-specification-its-sixth-generation-third-decade-and-still-going-strong) · [Linux PCIの最大ペイロードと最大読み取り要求](https://docs.kernel.org/driver-api/pci/pci.html#c.pcie_get_mps)

## リンクの上限と処理時間を切り分ける

図のSSDとNICが同時にRAMへデータを書き込むと、両者は上流x4の同じ方向を使います。個々の下流リンクが速くても、上流の帯域が合計の上限になります。SSDを単独で読む場合は、経路の各リンクに加え、SSD内部の処理、要求サイズ、同時に出している要求の数、OSのキャッシュ、読み取り後の展開も時間に影響します。ゲームのロードでは、転送量と完了までの時間を段階ごとに測り、どの区間が実際に遅いかを調べます。[Linuxの経路上の帯域制約](https://docs.kernel.org/driver-api/pci/pci.html#c.pcie_bandwidth_available) · [WindowsのI/Oトレース](/tools/windows/file-io-tracing.html) · [DirectStorageの読み取りと展開](/game/directstorage.html)

PCIeを通るデータの出発点と行き先を決めるとき、ドライバーはデバイスが使えるアドレスを用意します。[DMAとIOMMU](/hardware/io/dma-and-iommu.html)
