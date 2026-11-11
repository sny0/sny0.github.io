---
title: 家庭のネットワーク機器 — LAN・ルーター・Wi-Fiの役割
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: PCからインターネットへ届く経路を、NIC、スイッチ、Wi-Fiアクセスポイント、ルーター、ONUに分けて説明する。LANとWAN、DHCPとDNSの役割も整理する。
  aliases: [LAN, WAN, NIC, Ethernet, Wi-Fi, スイッチ, ルーター, アクセスポイント, AP, ONU, モデム, DHCP, デフォルトゲートウェイ]
  verification: Cisco・NTT・バッファローの機器解説と、IETFのDHCP・DNS・IPルーティング関連仕様に照合（2026-11-07）
---

# 家庭のネットワーク機器 — LAN・ルーター・Wi-Fiの役割

PCでオンラインゲームに接続すると、PC自身の通信機能に加え、家庭内の機器と回線を通ってサーバーへデータが向かいます。店頭で「Wi-Fiルーター」と呼ばれる一台の中にも、複数の役割が入っています。ここでは役割ごとに分けて、PCから家の外へ出るまでを追います。[Ciscoのネットワーク機器の概要](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-computer-networking.html) · [ネットワークの基礎](/network/network-basics.html)

## LANとWAN

**LAN**（Local Area Network）は、自宅やオフィスなど、限られた範囲の機器を結ぶネットワークです。有線の**Ethernet**でも、無線の**Wi-Fi**でもLANを構成できます。家庭用ルーターのLAN側には、PC、ゲーム機、スマートフォンなどがつながります。[CiscoのLANの説明](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-computer-networking.html#types-of-computer-networks)

WAN（Wide Area Network）は離れた場所のネットワークを広域に結びます。家庭用ルーターの「WAN」「Internet」と書かれた端子は、一般に回線事業者側へ接続するために使います。その先のインターネットでは、複数のネットワークやルーターを経由してデータを宛先へ転送します。[CiscoのWANの説明](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-computer-networking.html) · [IPルーティング](/network/ip-routing-and-ethernet.html)

## 家庭で出会う機器

| 機器・機能 | 主な仕事 | 家庭での例 |
| --- | --- | --- |
| **NIC・ネットワークアダプター** | PCがネットワークにデータを出し入れする。 | PCの有線LAN端子やWi-Fiアダプター。 |
| **スイッチ** | 同じLANの有線機器を結び、Ethernetの宛先MACアドレスを手がかりに転送する。 | LAN端子を増やす機器、家庭用ルーター内のLAN端子部分。 |
| **アクセスポイント（AP）** | Wi-Fi端末をLANにつなぐ。 | ノートPCの無線通信を、LAN側へ橋渡しする部分。 |
| **ルーター** | 別々のIPネットワークの間で、宛先IPに応じて次の送り先を選ぶ。 | 家庭のLANと回線側のネットワークを結ぶ部分。 |
| **ONU・光回線終端装置** | 光回線の信号と、端末側で使う電気信号とのやり取りを担う。 | 光ファイバーを接続する回線終端の機器。 |
| **モデム** | 回線で使う信号の変調・復調を行う。方式は回線によって異なる。 | 電話線を使うDSLモデムや、ケーブル回線のモデム。 |

Ethernetでは、同じリンクで届ける相手を示す**MACアドレス**と、IPネットワークで宛先を示す**IPアドレス**を使います。一般的なスイッチは前者を、ルーターの経路選択は後者を手がかりにします。機種によってはスイッチにルーティング機能も備わります。[Ciscoのスイッチとルーター](https://www.cisco.com/site/us/en/learn/topics/small-business/network-switch-vs-router.html) · [MicrosoftのNICの説明](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/network-interface-card-support) · [NTTのONU・モデム・ルーターの解説](https://www.ntt.com/business/services/network/internet-connect/ocn-business/bocn/knowledge/archive_118.html)

<figure class="study-figure">
  <img src="/images/network/home-network-devices.svg" alt="有線のPCはスイッチ、ルーター、ONUを経て回線事業者側へ進む。Wi-FiのPCはアクセスポイントからスイッチにつながる。家庭用Wi-Fiルーターではスイッチ・アクセスポイント・ルーターの三機能を一台にまとめた製品が多い。" width="760" height="420" loading="lazy">
  <figcaption>光回線を使う家庭の一例を、機能単位で描いています。ONUとルーターが一体の製品もあります。<a href="/study/images/network/home-network-devices.svg" target="_blank" rel="noopener noreferrer">家庭の接続図を拡大</a></figcaption>
</figure>

## 同じLANへの通信と、家の外への通信

同じ**IPサブネット**（IPアドレスで区切るネットワークの範囲）内で直接届けられる相手なら、PCはその相手へLAN上で送ります。例えばPCから家庭内の別のPCへ送るデータは、同じスイッチで届く構成なら、そのスイッチ内を通れます。Wi-Fi端末ならアクセスポイントも通ります。ゲスト用Wi-Fiなどでは、設定によって端末同士の通信が制限される場合があります。[IPルーティングとEthernet](/network/ip-routing-and-ethernet.html) · [Cisco Merakiの端末間通信の分離](https://documentation.meraki.com/Wireless/Operate_and_Maintain/How_Tos/Firewall_and_Traffic_Shaping/Wireless_Client_Isolation)

外部のゲームサーバーへ送る場合、PCは通常、**デフォルトゲートウェイ**として設定されたルーターへ渡します。ルーターが回線側へ転送し、その先のルーターも次の送り先を選びます。IPv4の家庭用接続では、途中で内側のIPやポートを外側の値へ書き換えるNATが使われることがあります。[IETF RFC 1812の経路選択](https://www.rfc-editor.org/rfc/rfc1812.html#section-5.2.4) · [NATとポート変換](/network/nat-and-port-mapping.html)

家庭用のWi-Fiルーターは、スイッチ、アクセスポイント、ルーターの機能を一台にまとめた製品が多くあります。アクセスポイントとして使うモードでは、接続先の別ルーターが経路選択やアドレス配布を担当する構成にできます。一台の箱にまとまっていても、通信の流れはそれぞれの役割に分けて考えられます。[バッファローのAPモード](https://www.buffalo.jp/support/faq/detail/290.html) · [NTTの一体型ONU・ルーター](https://www.ntt.com/business/services/network/internet-connect/ocn-business/bocn/knowledge/archive_118.html)

## IP設定を配るDHCPと、名前を調べるDNS

**DHCP**は、端末がIPアドレスやネットワーク設定を受け取るための仕組みです。IPv4の家庭内LANでは、ルーター内のDHCPサーバーが、端末へ利用するアドレスやゲートウェイ、DNSサーバーの情報を配る構成がよく使われます。これらはルーティングとは別の機能で、別のサーバーで動かすこともできます。[IETF RFC 2131のDHCP](https://www.rfc-editor.org/rfc/rfc2131.html#section-1) · [RFC 2132のルーターとDNSオプション](https://www.rfc-editor.org/rfc/rfc2132.html#section-3.5)

**DNS**は、`example.com`のような名前からIPアドレスなどの情報を調べる仕組みです。家庭用ルーターがDNSの問い合わせを受け、別のDNSサーバーへ問い合わせる構成もあります。IPv6では、ルーターの通知によるアドレス設定やDHCPv6など、IPv4のDHCPとは異なる設定方法も使われます。[IETF RFC 1034のDNS](https://www.rfc-editor.org/rfc/rfc1034.html#section-2) · [IPv6のアドレス自動設定](https://www.rfc-editor.org/rfc/rfc4862.html#section-5.5) · [DNSと名前解決](/network/dns-resolution.html)

接続を調べるときは、PCのネットワークアダプター、接続先のLAN、ゲートウェイ、DNSの値を順に確認すると、どの機器やサービスを使っているか分かります。IPアドレスとポートの読み方は[IPアドレスとポート](/network/ip-addresses-and-ports.html)、実際にNICがデータを受け取る仕組みは[NICの受信キューとRSS](/hardware/io/nic-receive-queues.html)で扱います。
