---
title: IPアドレス・ポート・ホスト名 — 接続先をどう指定するか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: URLから接続先を読むために、ホスト名、IPv4・IPv6、ポート、TCP・UDPの違いを説明する。ローカルのアドレスと接続をPowerShellで確認する。
  aliases: [IPアドレス, IPv4, IPv6, ホスト名, ポート, endpoint, エンドポイント, localhost, loopback, プライベートIP, グローバルIP, 一時ポート]
  verification: IETF・IANA・Microsoftの仕様に照合。掲載した3種のPowerShellコマンドをWindowsで実行確認（2026-11-07）
---

# IPアドレス・ポート・ホスト名 — 接続先をどう指定するか

通信先を指定するときは、「どのアドレスへ届けるか」と「その先のどの受け口へ届けるか」を組み合わせます。**IPアドレス**はIPによる配送に使うアドレスです。**ポート番号**は、TCPやUDPが受け口を区別するための番号です。ポートはOSがソケットに対応付け、アプリはそのソケットを通してデータを読み書きします。[IPアドレスとポート](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.1) · [UDPの送信元・宛先ポート](https://www.rfc-editor.org/rfc/rfc768.html)

## URLに書いてあるもの

次は説明用のURLです。`example.com`は文書の例に使えるドメイン名です。[RFC 2606の例示用ドメイン](https://www.rfc-editor.org/rfc/rfc2606.html#section-3)

```text
https://example.com:8443/game/status?room=7
```

| 部分 | 意味 |
| --- | --- |
| `https` | 使う方式を表すスキーム。HTTPSで通信する。 |
| `example.com` | 接続先を名前で表すホスト名。名前解決でIPアドレスの候補を得る。 |
| `8443` | このURLで指定した接続先のポート番号。 |
| `/game/status` | サーバー側で要求する対象を表すパス。 |
| `room=7` | 対象に渡す追加情報を表すクエリー。解釈はそのサービスが決める。 |

HTTPSのURLでポートを省略すると、既定の番号は`443`です。通常のホスト名のA・AAAAレコードを調べるDNSの問い合わせでは、IPv4・IPv6アドレスを得ます。アプリが使うポートはURLの指定やプロトコルの既定値などから決めます。サービスの発見に使うSRVなど、ポート情報を持つ別のDNSレコードもあります。[URIの構成](https://www.rfc-editor.org/rfc/rfc3986.html#section-3) · [HTTPSのURL](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.2.2) · [DNSのSRVレコード](https://www.rfc-editor.org/rfc/rfc2782.html)

## IPv4とIPv6の表記

**ビット**は0か1かの一つ分です。**IPv4**のアドレスは32ビットで、通常は`192.0.2.10`のように、0〜255の数を四つ並べて書きます。**IPv6**は128ビットで、`2001:db8::20`のように16進数をコロンで区切ります。`::`は連続する0の部分を短く書く表記です。ここでの二つのアドレスは、どちらも文書用の例です。[IPv4のアドレス形式](https://www.rfc-editor.org/rfc/rfc791.html#section-3.2) · [IPv6の表記](https://www.rfc-editor.org/rfc/rfc4291.html#section-2.2) · [IPv4の文書用範囲](https://www.rfc-editor.org/rfc/rfc5737.html#section-3) · [IPv6の文書用範囲](https://www.rfc-editor.org/rfc/rfc3849.html#section-2)

IPアドレスはネットワークの接続口である**インターフェース**に割り当てられます。一つのPCに有線とWi-Fiの接続口があり、それぞれにアドレスが付く場合も、一つの接続口が複数のIPv6アドレスを持つ場合もあります。相手へ送る際に使うアドレスは、通信先とOSの経路選択にも関わります。[ホストのインターフェース](https://www.rfc-editor.org/rfc/rfc1122.html#section-1.1.1) · [IPv6のアドレス割り当て](https://www.rfc-editor.org/rfc/rfc4291.html#section-2.1)

| よく見るアドレス | 使う範囲 |
| --- | --- |
| IPv4の`10.*.*.*`、`172.16.*.*`〜`172.31.*.*`、`192.168.*.*` | **プライベートアドレス**。家庭や組織の中で使い、別のネットワークでも同じ番号を使える。 |
| IPv4の`127.0.0.1`、IPv6の`::1` | **ループバックアドレス**。通信を自分のホスト内へ戻す。ローカルの開発サーバーなどで使う。 |
| インターネットへ経路を広報するグローバルアドレス | インターネットで配送先を指定するために使う。実際に通信できる条件には、経路、ファイアウォール、相手の待ち受けも含まれる。 |

プライベートIPv4の端末が外部と通信するときは、ルーターで外側のアドレスへ変換する構成がよく使われます。`localhost`は自分のホストを指すための名前で、ローカルの名前解決でループバックアドレスに対応します。[プライベートIPv4](https://www.rfc-editor.org/rfc/rfc1918.html#section-3) · [IPv4ループバック](https://www.rfc-editor.org/rfc/rfc1122.html#section-3.2.1.3) · [IPv6ループバック](https://www.rfc-editor.org/rfc/rfc4291.html#section-2.5.3) · [localhost](https://www.rfc-editor.org/rfc/rfc6761.html#section-6.3) · [NATとポート変換](/network/nat-and-port-mapping.html)

## ポートと接続の両端を読む

ポート番号は16ビットで、`0`〜`65535`の値を表せます。アプリがOSへポート`0`を指定して割り当てを頼むと、OSが利用できる番号を選ぶAPIもあります。TCPの`443`とUDPの`443`は、それぞれのプロトコルに属する番号です。アドレス、ポート、TCPかUDPかを合わせて読むと、どの受け口を見ているかを区別できます。[IANAのサービス名とポート番号](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml) · [Microsoftのbindとポート0](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-bind)

<figure class="study-figure">
  <img src="/images/network/ip-addresses-and-ports.svg" alt="クライアント192.0.2.10の一時ポート55000から、サーバー203.0.113.20のTCP 443へ接続する。応答はその両端を逆にして戻る。同じサーバーのTCP 8443とUDP 443は別の受け口になる。" width="760" height="408" loading="lazy">
  <figcaption>アドレスとポートは説明用の例です。NATを通る場合は、経路上でアドレスやポートが変わることがあります。<a href="/study/images/network/ip-addresses-and-ports.svg" target="_blank" rel="noopener noreferrer">接続の両端の図を拡大</a></figcaption>
</figure>

接続の一方の端を**エンドポイント**と呼びます。図ではクライアント側が`192.0.2.10:55000`、サーバー側が`203.0.113.20:443`です。クライアント側の番号は、その接続のためにOSが選ぶ**一時ポート**の例です。TCPの接続はローカルと相手の両方のIPアドレス・ポートの組で区別されるので、同じサーバーの`443`へ複数のクライアントが接続できます。[TCPの接続とソケットの組](https://www.rfc-editor.org/rfc/rfc9293.html#section-4) · [Microsoftのクライアント側ポート割り当て](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-connect)

IPv6のIPアドレスとポートを一緒に書くときは、`[2001:db8::20]:443`のように角括弧でアドレスの範囲を示します。IPv6アドレス自体にもコロンが使われるため、ポートの区切りを読み分けられます。[URIのホスト表記](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.2.2)

## Windowsで自分のPCを確認する

PowerShellで、接続口のアドレス、TCPの接続、UDPのローカル側の受け口を表示できます。下のコマンドは現在の状態を読む操作です。表示される値と件数は、起動中のアプリや通信状態で変わります。[Get-NetIPConfiguration](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipconfiguration) · [Get-NetTCPConnection](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection) · [Get-NetUDPEndpoint](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netudpendpoint)

```powershell
Get-NetIPConfiguration
Get-NetTCPConnection | Select-Object -First 10 LocalAddress, LocalPort, RemoteAddress, RemotePort, State
Get-NetUDPEndpoint | Select-Object -First 10 LocalAddress, LocalPort, OwningProcess
```

TCPの`LocalAddress`と`LocalPort`が自分側、`RemoteAddress`と`RemotePort`が相手側です。`State`は待ち受け中や接続済みなどの状態を表します。UDPの表示では、ローカル側のアドレス・ポートと、所有するプロセスの番号を確認できます。相手先を指定して送るUDPの動作は、送受信の実践で確かめられます。[TCPソケットの実践](/practice/network/tcp-loopback-observation.html) · [UDPの送受信の実践](/practice/network/udp-loopback-observation.html)

## 関連記事

- [ネットワークの基本](/network/network-basics.html)
- [家庭のネットワーク機器](/network/home-network-devices.html)
- [DNSと名前解決](/network/dns-resolution.html)
- [IPルーティングとEthernetフレーム](/network/ip-routing-and-ethernet.html)
