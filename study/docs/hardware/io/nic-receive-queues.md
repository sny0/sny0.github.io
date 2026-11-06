---
title: NICの受信キューとRSS — フレームがアプリへ届くまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: PCIe接続のNICが受信バッファをDMAで埋め、CPUが割り込みやポーリングで回収する経路を追う。RSSと、NIC側・UDPソケット側の取りこぼしを区別する。
  aliases: [NIC, RX ring, 受信リング, 受信記述子, receive queue, RSS, Receive Side Scaling, NAPI, interrupt moderation, RcvbufErrors]
  verification: LinuxカーネルとMicrosoftのドライバー資料、IETFのホスト要件、Wiresharkの公式ガイドに照合（2026-11-07）
---

# NICの受信キューとRSS — フレームがアプリへ届くまで

別のPCから送られたゲームの位置更新を、PCIe接続のネットワークカード（NIC）がEthernetで受け取る例を考えます。`recvfrom`でUDPデータグラムを読み出せるようになるまでに、NICによるメモリへの転送、ドライバーによる受信処理、OSによるソケットの振り分けが行われます。[MicrosoftのNICとDMA](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/network-interface-card-support) · [UDPデータグラムの境界と送受信](/network/udp-datagrams.html)

## フレームの置き場所を先に渡す

1. **ドライバーが受信バッファを用意する。** ドライバーはホストメモリにバッファを用意し、NICから書き込めるようにDMAマッピングを設定します。NICに渡す**受信記述子（RX descriptor）**には、バッファのDMAアドレスなどが入ります。記述子を並べ、末尾の次に先頭へ戻るよう繰り返し使うのが**受信リング（RX ring）**です。
2. **NICがフレームを書き込む。** フレームが届くと、NICは使用可能な記述子を参照し、対応するバッファへDMAでデータを書き込みます。ドライバーは記述子の完了フラグや、別の完了キューのエントリーから、受信した長さと状態などを確認します。完了の表し方は機種によって異なります。
3. **ドライバーがデータを回収し、受信先を補充する。** ドライバーが受信データをOSのネットワークスタックへ渡し、処理済みのスロットへ再利用可能になったバッファか、別の空きバッファを補充します。通常のUDP受信では、OSが該当ソケットの受信キューへデータグラムを入れ、アプリが`recvfrom`などで取り出します。[MicrosoftのNICとDMA](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/network-interface-card-support) · [LinuxのENAドライバーの受信経路](https://docs.kernel.org/networking/device_drivers/ethernet/amazon/ena.html#rx) · [DMAとIOMMU](/hardware/io/dma-and-iommu.html) · [PCI Expressのリンクとレーン](/hardware/io/pcie-links.html)

<figure class="study-figure">
  <img src="/images/hardware/nic-receive-queues.svg" alt="ドライバーが記述子で受信バッファを渡し、NICがDMAでフレームを書く。OSが受信分をUDPソケットへ届け、アプリがrecvfromで読む。4スロットの受信リングの例では、0と1は回収待ち、2と3はNICが使える。末尾の次は先頭へ戻る。" width="760" height="500" loading="lazy">
  <figcaption>記述子が受信先を指し、フレームの中身は別の受信バッファに入ります。<a href="/study/images/hardware/nic-receive-queues.svg" target="_blank" rel="noopener noreferrer">NICの受信経路とリングの図を拡大</a></figcaption>
</figure>

## 割り込みで知らせ、ポーリングで回収する

**割り込み**はCPUに受信処理のきっかけを伝えます。PCIeの**MSI-X**を使う構成では、キューまたはキューの組に別々の割り込みベクターを割り当てられます。Linuxの**NAPI**では、典型的には割り込みを受けてドライバーのポーリング処理を予約します。ポーリング処理は、NICが完了を記録した受信データを一定件数まで回収し、まだ残っていれば再度実行されます。WindowsのNDISにも、割り込みのあとに**DPC**（遅延プロシージャ呼び出し）で受信処理を行う構成があります。[LinuxのMSI/MSI-X](https://docs.kernel.org/PCI/msi-howto.html) · [LinuxのNAPI](https://docs.kernel.org/networking/napi.html) · [MicrosoftのRSSとメッセージ割り込み](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/rss-with-message-signaled-interrupts)

**割り込み抑制（interrupt moderation）**を使うと、対応するNICは複数の受信完了をまとめて通知できます。割り込みの回数が減ると、CPUがパケット処理に時間を回せるため、高負荷時の処理能力が上がる場合があります。小さな更新がたまに届く場合は、通知を待つ時間が受信遅延に加わることがあります。ゲームの通信を観察するときは、平常時と負荷をかけたときで、パケット数と遅延の分布を比べます。[Microsoftの割り込み抑制と性能](https://learn.microsoft.com/en-us/windows-server/networking/technologies/network-subsystem/net-sub-performance-tuning-nics#interrupt-moderation) · [遅延・帯域・待ち行列](/network/latency-throughput-and-queues.html)

## RSSは複数のフローをキューに振り分ける

**RSS（Receive Side Scaling）**は、複数の論理CPUへ受信処理を分散する仕組みです。複数のハードウェア受信キューを使う構成では、NICがパケットのヘッダーの一部をハッシュ化し、結果から振り分け表を引いてキューを選びます。例えば対応するTCPフローでは、送信元・宛先のIPアドレスとポートがハッシュの入力になります。使う項目はプロトコルやNICの対応機能、設定によって異なります。[LinuxのRSS](https://docs.kernel.org/networking/scaling.html#rss-receive-side-scaling) · [MicrosoftのRSSの概要](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/introduction-to-receive-side-scaling)

振り分け設定とハッシュの入力が同じなら、同じ方向のフローのパケットは同じキューへ入ります。例えばフローAをキュー0、フローBをキュー1へ振り分けると、それぞれの受信処理を別のCPUで進められます。異なるフローが同じキューへ入ることもあり、一つのフローに受信が集中する場合は、そのキューを担当するCPUが先に忙しくなります。RSSで分散するのはOS側の受信処理です。ゲームの更新ロジックをどのスレッドで実行するかは、アプリ側で決まります。[LinuxのRSSとキュー・CPUの関係](https://docs.kernel.org/networking/scaling.html#rss-receive-side-scaling) · [Microsoftのハードウェア受信キュー](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/rss-with-hardware-queuing)

## 取りこぼした場所を見分ける

| 場所 | 起きること | 手がかり |
| --- | --- | --- |
| NIC側の受信リング | 空き受信バッファの補充が到着に追いつかず、NICがフレームを受け入れられないことがある。 | Linuxの`rx_missed_errors`や、ドライバーが公開するキューごとの破棄・バッファ不足のカウンターを確認する。 |
| OS側のUDPソケット | NICで受信できても、アプリが読み出すより速くデータグラムがたまると、ソケットの受信キューへ追加できずに破棄されることがある。 | Linuxでは`/proc/net/snmp`の`Udp`欄の`RcvbufErrors`を確認する。これはIPv4 UDPの集計で、個別のソケットを示す値ではない。 |

受信リングとソケットの受信キューは、それぞれ別に容量があります。ソケットの`SO_RCVBUF`はOS側の受信バッファに関わる設定で、`recvfrom`の引数で渡すアプリのバッファは、受信したデータを一回の呼び出しで受け取る置き場所です。負荷をかける前後で各カウンターの差分を取ると、どの段階で破棄が増えたかを切り分けられます。[Linuxのインターフェース統計](https://docs.kernel.org/networking/statistics.html) · [LinuxのUDP受信処理](https://github.com/torvalds/linux/blob/v6.12/net/ipv4/udp.c) · [LinuxのUDP統計の出力](https://github.com/torvalds/linux/blob/v6.12/net/ipv4/proc.c) · [Microsoftのソケットオプション](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-setsockopt)

## 手元でNICの設定と受信統計を確認する

WindowsではPowerShellで有線アダプターの名前を調べ、例の`Ethernet`をその名前に置き換えます。RSS対応アダプターでは設定を表示できます。アダプターの統計はそのインターフェースの集計で、破棄の内訳の出し方はドライバーによって異なります。[Get-NetAdapterRss](https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterrss) · [Get-NetAdapterStatistics](https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterstatistics)

```powershell
Get-NetAdapter -Physical | Select-Object Name, Status, LinkSpeed
Get-NetAdapterRss -Name 'Ethernet' | Format-List *
Get-NetAdapterStatistics -Name 'Ethernet' | Format-List *
```

Linuxでは`ip link show`で有線インターフェースを調べ、`enp3s0`をその名前に置き換えます。`ethtool -S`に出る項目はドライバーごとに異なります。[Linuxのインターフェース統計とethtool](https://docs.kernel.org/networking/statistics.html)

```sh
ip -s -s link show dev enp3s0
ethtool -S enp3s0
grep '^Udp:' /proc/net/snmp
```

実際のNICを観察するには、別のPCから対象インターフェースのIPアドレスへ送信します。UDP受信の実践サンプルは、同じホスト内で通信するループバックの`127.0.0.1`を使います。こちらは物理NICを経由せず、ソケットの使い方を確認できます。[IETF RFC 1122 §3.2.1.3](https://www.rfc-editor.org/rfc/rfc1122.html#section-3.2.1.3) · [UDP受信の実践](/practice/network/udp-loopback-observation.html)

ホスト上のキャプチャで送信パケットのチェックサムが不正に見える場合は、NICが送信時に計算する前のデータを見ている可能性があります。パケットキャプチャを読むときは、どの機器の、送受信処理のどの地点で取ったデータかも確認します。[Wiresharkのチェックサムオフロード](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvChecksums.html#ChAdvChecksumsOffload)
