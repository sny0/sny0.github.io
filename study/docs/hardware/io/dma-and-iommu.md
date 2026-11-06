---
title: DMAとIOMMUでデバイスがメモリにアクセスする仕組み
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: ドライバーがデバイスへ転送を指示し、SSDやNICがRAMを読み書きする経路を追う。DMAアドレス、IOMMU、キャッシュと順序、割り込みと完了を扱う。
  aliases: [DMA, direct memory access, IOMMU, DMA address, IOVA, MMIO, doorbell, scatter/gather, descriptor, 割り込み, MSI-X]
  verification: NVM Expressの仕様、LinuxカーネルのDMA・MMIO資料、Microsoftのドライバー資料に照合（2026-11-07）
---

# DMAとIOMMUでデバイスがメモリにアクセスする仕組み

NVMe SSDがファイルのデータを読み出したり、ネットワークカード（NIC）がパケットを受信したりすると、デバイスはシステムメモリのバッファへデータを書き込めます。デバイスがホストメモリを読み書きするこの仕組みを**DMA（Direct Memory Access）**と呼びます。CPUで動くドライバーは、アクセスできるバッファを用意し、デバイスが読むコマンドや記述子を作り、結果を回収します。[NVM Express 1.0e §4.1](https://nvmexpress.org/wp-content/uploads/NVM-Express-1_0e.pdf) · [MicrosoftのNICとDMA](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/network-interface-card-support)

## NVMeの読み取りをキューからたどる

ここでは、ホストメモリ上にコマンドの提出キュー（SQ）と完了キュー（CQ）がある、PCIe接続のNVMe SSDを例にします。ファイルの読み取りがOSのキャッシュから満たせる場合は、OS内の別の経路でデータが返ります。[NVM Express 1.0e §4.1](https://nvmexpress.org/wp-content/uploads/NVM-Express-1_0e.pdf) · [ファイル読み取りの経路](/os/file-read-journey.html)

1. ドライバーが、転送先のバッファをデバイスからアクセスできるようにします。読み取り対象や転送先の情報をSQに書き、デバイスのドアベルレジスターへ新しい末尾の位置を書き込みます。CPUは、アドレス空間に割り当てられたデバイスのレジスターを、**MMIO（Memory-Mapped I/O）**として操作します。
2. NVMeコントローラーはSQからコマンドを取得し、SSDから読み出したデータを指定されたホストバッファへDMAで書き込みます。書き込みコマンドでは、コントローラーがホストバッファからデータを読み出します。
3. コントローラーがCQへ完了エントリーを書き、設定に応じて割り込みなどで知らせます。ドライバーはCQから対象コマンドとステータスを確認し、使用済みのエントリーを回収します。[NVM Expressの提出・完了キューとドアベル §3.1・§4.1](https://nvmexpress.org/wp-content/uploads/NVM-Express-1_0e.pdf) · [LinuxのMMIOアクセス](https://docs.kernel.org/driver-api/device-io.html)

<figure class="study-figure">
  <img src="/images/hardware/dma-and-iommu.svg" alt="上段ではCPUが提出キューとドアベルで依頼し、デバイスがRAMへDMAし、CPUが完了キューで結果を回収する。下段ではCPU仮想アドレスはCPUのページ表を、デバイスのDMAアドレスはIOMMUを通り、同じRAMの物理ページを指す。" width="760" height="510" loading="lazy">
  <figcaption>転送を始める通知と結果の回収はCPU側が行います。デバイスがRAMにアクセスするときは、デバイス用のアドレスを使います。<a href="/study/images/hardware/dma-and-iommu.svg" target="_blank" rel="noopener noreferrer">DMAとアドレス変換の図を拡大</a></figcaption>
</figure>

## CPUのポインターとDMAアドレスを区別する

CPUがバッファを参照するときの**仮想アドレス**は、CPUのページ表を通ってRAM上の**物理アドレス**へ対応します。デバイスに渡すのは、OSのDMA APIがその機器に対して用意する**DMAアドレス**です。Linuxの資料ではバスアドレス、Windowsのドライバー資料では論理アドレスとも呼びます。OSはDMAの間に必要なメモリを使える状態にし、対応するDMAアドレスを返します。[LinuxのDMAアドレス空間の解説](https://docs.kernel.org/core-api/dma-api-howto.html) · [Microsoftの仮想・物理・論理アドレスの解説](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/map-registers)

**IOMMU（I/O Memory Management Unit）**を使う構成では、デバイスが出したI/O仮想アドレス（IOVA）をIOMMUが変換し、許可された物理ページへアクセスさせます。OSはデバイスの属するドメインにマッピングを設定し、アクセスできるメモリを制限できます。ページが物理的に離れていても連続したIOVAを割り当てられる場合があります。機器や構成によっては、複数の範囲を記した**scatter/gather**の一覧や、機器が届く一時バッファを使って転送します。[LinuxのDMAマッピングAPI](https://docs.kernel.org/core-api/dma-api.html) · [MicrosoftのIOMMUによるDMAの分離](https://learn.microsoft.com/en-us/windows/security/information-protection/kernel-dma-protection-for-thunderbolt)

## キャッシュの整合性と見える順序を揃える

| 観点 | ドライバーが揃えるもの |
| --- | --- |
| CPUとデバイスからの見え方 | DMAマッピングの種類と転送方向に従い、必要に応じてキャッシュの同期を行う。例えばLinuxでストリーミングマッピングを保持したままCPUとデバイスが交代で使うなら、`dma_sync_*_for_cpu`、`dma_sync_*_for_device`で受け渡す。 |
| 書き込みの順序 | バッファのアドレスや長さがデバイスに見える順序で書き、記述子の有効フラグやドアベルを更新する。キャッシュコヒーレントなメモリでも、公開順を作るためにDMA用バリアや規定されたMMIOアクセスを使う。 |
| バッファの寿命 | 転送先と記述子をデバイスが参照している間は、マッピングを維持する。完了を確認した後に、CPUへ所有権を戻して再利用・解放する。 |

例えば受信側のNICでは、ドライバーが書き込み先をキューへ補充し、NICが受信データを書いて完了を知らせます。ドライバーが完了を確認してから、ネットワークスタックがそのデータを扱います。送信側ではNICがメモリからパケットを読み出します。[NICの受信キューとRSS](/hardware/io/nic-receive-queues.html) · [LinuxのDMAマッピングとキャッシュ同期](https://docs.kernel.org/core-api/dma-api-howto.html) · [LinuxのDMAバリアとドアベルの例](https://docs.kernel.org/core-api/wrappers/memory-barriers.html) · [MicrosoftのNICの送受信](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/network-interface-card-support)

## 完了の通知と、完了を確認する処理

PCIeデバイスは、**MSI-X**などのメッセージで割り込みを通知できます。複数のキューに割り込みベクターを分ける構成では、ドライバーは対応するキューを処理します。**ポーリング**では、CPU側が完了エントリーを調べます。短い間隔で調べるほど反応を早められる場合があり、その間CPU時間を使います。LinuxのNICで使うNAPIのように、割り込みをきっかけに受信キューをポーリングし、まとめて処理する方式もあります。[LinuxのMSI/MSI-Xドライバー解説](https://docs.kernel.org/PCI/msi-howto.html) · [LinuxのNAPI](https://docs.kernel.org/networking/napi.html)

デバイスからの完了通知のあと、ドライバーとOSがI/Oの結果を処理し、呼び出し元へ返します。アプリが待つI/O完了通知はこの上の段階です。ゲームのロード時間を調べるときは、リンクの転送、OSの完了、アセットの展開を分けて観察します。[PCI Expressのリンクとレーン](/hardware/io/pcie-links.html) · [WindowsのI/O完了ポート](/os/io-completion-ports.html) · [DirectStorageの読み取りと展開](/game/directstorage.html)
