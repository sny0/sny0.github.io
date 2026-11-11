---
title: IPルーティングとEthernetフレーム
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: 宛先IPから最長プレフィックス一致で経路を選び、次の機器へEthernetフレームを届ける。ARP、IPv6近隣探索、ホップ制限とtracerouteを扱う。
  aliases: [IP routing, ルーティング, Ethernet, MAC address, ARP, Neighbor Discovery, next hop, デフォルトゲートウェイ, 最長プレフィックス一致, TTL, Hop Limit, ICMP, tracert]
  verification: IETFのIP・ARP・IPv6近隣探索のRFCとMicrosoftの資料に照合し、Find-NetRouteをWindowsで実行確認（2026-11-07）
---

# IPルーティングとEthernetフレーム

アプリがTCPやUDPで通信すると、OSのIP層は**宛先IPをどの経路へ送るか**を判断します。Ethernetを使う区間では、その区間で次に受け取る機器のMACアドレスを宛先にしてフレームを送ります。別のネットワークへ送るときは、IPパケットの宛先と、最初のフレームを受け取る機器が分かれます。[IETF RFC 1812 §5.2.4](https://datatracker.ietf.org/doc/html/rfc1812#section-5.2.4) · [TCPのソケット](/network/tcp-sockets.html) · [UDPのデータグラム](/network/udp-datagrams.html)

## 宛先IPから次の送り先を選ぶ

例えば送信端末のIPv4アドレスを`192.0.2.10/24`、ゲートウェイを`192.0.2.1`とします。`/24`は先頭24ビットが経路の照合に使われることを表します。簡略化した経路表では、宛先に一致する項目のうち、最も長いプレフィックスを使う項目を選びます。これを**最長プレフィックス一致**と呼びます。IPv4の`0.0.0.0/0`とIPv6の`::/0`は、照合する先頭ビットが0個のデフォルト経路です。[IETF RFC 1812 §5.2.4.3](https://datatracker.ietf.org/doc/html/rfc1812#section-5.2.4.3) · [IETF RFC 4191 §2.2](https://datatracker.ietf.org/doc/html/rfc4191#section-2.2)

| この端末の経路表 | 次ホップ | 選ばれる例 |
| --- | --- | --- |
| `192.0.2.0/24` | 宛先の機器へ直接 | `192.0.2.20`は`/24`と`/0`の両方に一致するので`/24`を使う。 |
| `0.0.0.0/0` | `192.0.2.1` | `198.51.100.8`はこの表では`/0`だけに一致する。 |

次ホップは、そのリンクで次にパケットを受け取る機器です。宛先へ直接送れる経路なら次ホップは宛先自身です。ゲートウェイを使う経路なら、まずゲートウェイへ送り、そのルーターも自分の経路表で次の区間を決めます。名前で接続するアプリはDNSなどで得たアドレスを使って接続を試みます。経路はその宛先IPに対して選ばれます。例のアドレスは文書用の範囲です。[IETF RFC 1812 §5.2.4.1](https://datatracker.ietf.org/doc/html/rfc1812#section-5.2.4.1) · [IETF RFC 5737 §3](https://datatracker.ietf.org/doc/html/rfc5737#section-3) · [DNSと名前解決](/network/dns-resolution.html)

WindowsのPowerShellで`Find-NetRoute -RemoteIPAddress 198.51.100.8`を実行すると、この文書用アドレスに対して自分の端末が選ぶ経路を照会できます。`DestinationPrefix`と`NextHop`の結果は端末の経路表によって変わります。このコマンドはローカルの経路選択を調べるものです。[MicrosoftのFind-NetRoute](https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute)

## 次ホップのIPからMACアドレスを調べる

Ethernetフレームには送信元MAC、宛先MAC、内容の種類を表す欄があり、IPv4を運ぶ場合はその中にIPパケットが入ります。送信端末が`198.51.100.8`へ送る例では、最初の次ホップは`192.0.2.1`です。IPv4のEthernetで対応がまだ分からなければ、**ARP**で`192.0.2.1`のMACアドレスを同じリンクに問い合わせます。受け取った対応はキャッシュでき、次のパケットで再利用できます。[IETF RFC 894のEthernetへの格納](https://datatracker.ietf.org/doc/html/rfc894) · [IETF RFC 826のARP](https://datatracker.ietf.org/doc/html/rfc826)

IPv6では、**近隣探索**（Neighbor Discovery）がリンク上のアドレス解決を行います。例えば未解決の相手にICMPv6のNeighbor Solicitationを送り、Neighbor Advertisementでリンク層のアドレスを得ます。IPv6端末はRouter Advertisementなどから、どのプレフィックスを直接届けられる範囲として扱うかや、どのルーターを使えるかも学びます。[IETF RFC 4861 §5.2](https://datatracker.ietf.org/doc/html/rfc4861#section-5.2) · [同 §7.2](https://datatracker.ietf.org/doc/html/rfc4861#section-7.2)

<figure class="study-figure">
  <img src="/images/network/ip-routing-and-ethernet.svg" alt="送信端末192.0.2.10からルーター192.0.2.1を経て、受信端末198.51.100.8へ送る。最初のEthernetフレームのMACはAからR1、次はルーターの別の口のR2からB。両リンクで送信元IPは192.0.2.10、宛先IPは198.51.100.8。ルーターでTTLが64から63へ減る。" width="760" height="388" loading="lazy">
  <figcaption>アドレス変換を行わないIPv4転送の例です。ルーターは受け取ったIPパケットを、次のリンクの宛先に合わせたフレームで送ります。<a href="/study/images/network/ip-routing-and-ethernet.svg" target="_blank" rel="noopener noreferrer">二つのリンクの図を拡大</a></figcaption>
</figure>

図では、最初のEthernetフレームは送信端末のMAC AからルーターのMAC R1へ届きます。ルーターの向こう側では、出口のMAC R2から受信端末のMAC Bへ、新しいフレームを送ります。アドレス変換（NAT）を行わないこの例では、IPヘッダーの送信元と宛先は両区間で同じです。転送時にはIPv4のTTLが変わります。[IETF RFC 1812 §5.2.1](https://datatracker.ietf.org/doc/html/rfc1812#section-5.2.1) · [IETF RFC 3022 §2](https://datatracker.ietf.org/doc/html/rfc3022#section-2)

## ホップの上限とtracerouteの応答

IPv4の**TTL**は転送時にルーターが少なくとも1減らし、IPv6の**Hop Limit**は転送ごとに1減ります。上限に達して転送できなくなると、ルーターはパケットを破棄し、条件に応じて送信元へICMPのTime Exceededを返します。この仕組みは、経路にループがある場合にもパケットが回り続けるのを防ぎます。[IETF RFC 1812 §5.3.1](https://datatracker.ietf.org/doc/html/rfc1812#section-5.3.1) · [IETF RFC 8200 §3](https://datatracker.ietf.org/doc/html/rfc8200#section-3) · [IETF RFC 4443 §3.3](https://datatracker.ietf.org/doc/html/rfc4443#section-3.3)

Windowsの`tracert`は、TTLやHop Limitを1から増やしながらICMPの探査パケットを送り、Time Exceededや宛先からの応答を記録します。`*`は、その探査への応答を制限時間内に受け取れなかった印です。ルーターがICMP応答を制限する場合や、計測中に経路が変わる場合があります。表示する時間は探査を送ってから応答が戻るまでなので、往路と復路の待ち時間を含みます。[Microsoftのtracert](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert) · [IETF RFC 1812 §4.3.2.8](https://datatracker.ietf.org/doc/html/rfc1812#section-4.3.2.8) · [IETF RFC 1393 §1の探査手順](https://datatracker.ietf.org/doc/html/rfc1393#section-1) · [遅延・スループットと待ち行列](/network/latency-throughput-and-queues.html)
