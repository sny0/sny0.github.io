---
title: UDPデータグラムの境界と送受信
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: UDPがメッセージを渡す単位を追い、Winsockでの送信元、受信バッファ不足、空のデータグラムを説明する。経路MTU、輻輳制御、ゲームの状態更新にもつなげる。
  aliases: [UDP, datagram, データグラム, sendto, recvfrom, WSAEMSGSIZE, path MTU, PMTU, IPフラグメント, QUIC]
  verification: IETFのUDP関連RFCとMicrosoftのWinsock仕様に照合（2026-11-07）
---

# UDPデータグラムの境界と送受信

UDPでは一件のメッセージをデータグラムとして送ります。例えば位置の更新を二件送ると、受信側は届いたデータグラムを一件ずつ取り出せます。届くか、送信順に並ぶか、同じものが複数届くかはUDPの外で扱う必要があります。TCPで順序のあるバイト列を読む場合は、アプリが長さなどからメッセージの境界を復元します。[IETF RFC 768](https://www.rfc-editor.org/rfc/rfc768.html) · [TCPのメッセージ境界](/network/tcp-sockets.html)

## 送信元・宛先とデータグラムの長さ

UDPはIPの上で動きます。IPヘッダーに送信元と宛先のIPアドレスがあり、8バイトのUDPヘッダーに送信元ポート、宛先ポート、長さ、チェックサムがあります。通常のUDPの長さ欄はヘッダーとペイロードの合計です。ペイロードが空なら、長さ欄は`8`です。[IETF RFC 768のヘッダー形式](https://www.rfc-editor.org/rfc/rfc768.html)

Winsockでは`SOCK_DGRAM`のソケットを使います。受信側は`bind`でローカルのアドレスとポートを割り当てます。`sendto`は宛先を渡して送信し、`recvfrom`は受信データに加えて、そのデータグラムの送信元アドレスとポートを返せます。実践では`127.0.0.1`とポート`0`で受信側をバインドし、`getsockname`で取得した実際のポートを宛先に使います。`sendto`が成功を返した段階で確認できるのは、ローカルの送信処理がデータを受け付けたことまでです。[Microsoftのbind](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-bind) · [sendto](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-sendto) · [recvfrom](https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-recvfrom)

相手が一つなら、WinsockのUDPソケットにも`connect`で相手を設定できます。設定後は`send`で既定の宛先へ送り、`recv`でその相手からのデータグラムを受け取れます。この操作はローカルソケットの設定であり、相手とのハンドシェイクを伴いません。相手が応答したことを確認したい場合は、アプリの要求と応答を照合します。[Microsoftのconnect](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-connect) · [IETF RFC 8085 §5](https://www.rfc-editor.org/rfc/rfc8085.html#section-5)

## 受信バッファが短い場合と、長さ0の場合

以下は、フラグ`0`を渡し、正の長さの受信バッファを使うWindowsの`recvfrom`の結果です。成功時の戻り値はペイロードのバイト数です。エラー時は`SOCKET_ERROR`を返すので、その場で`WSAGetLastError`を呼びます。[Microsoftのrecvfrom](https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-recvfrom)

<figure class="study-figure">
  <img src="/images/network/udp-datagrams.svg" alt="WindowsのUDP受信例。小さなデータグラムAとBは、それぞれ別のrecvfromで受け取る。8バイトを4バイトのバッファで受けると、先頭4バイトが入り、残りは失われてWSAEMSGSIZEになる。空のデータグラムを受けると0が返る。" width="760" height="410" loading="lazy">
  <figcaption>キューの先頭にあるデータグラムを一件ずつ取り出します。<a href="/study/images/network/udp-datagrams.svg" target="_blank" rel="noopener noreferrer">UDPの受信例を拡大</a></figcaption>
</figure>

| 受信時の状況 | Windowsの`recvfrom`の結果 |
| --- | --- |
| バッファに収まるAとBがこの順で受信キューに入った | 一回目にA、次の呼び出しでBを受け取ります。 |
| 8バイトのデータグラムに4バイトのバッファを渡した | 先頭4バイトをバッファに入れ、`WSAEMSGSIZE`で失敗します。残り4バイトは失われます。 |
| 長さ0のデータグラムが届いた | `0`を返します。空のメッセージを一件受け取った結果で、次のデータグラムも同じソケットで受信できます。 |
| キューが空で、ソケットが非ブロッキングに設定されている | `WSAEWOULDBLOCK`で失敗します。 |

`WSAEMSGSIZE`のあとの受信は次のデータグラムを対象にします。切り詰められたデータは、完全なメッセージとして処理する前に破棄します。一回の`recvfrom`に渡すバッファは、OS側のソケットの受信キューとは別です。キューが処理しきれない速度で受信すると、アプリが読む前にデータグラムを失うこともあります。[Microsoftのrecvfrom](https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-recvfrom) · [IETF RFC 8085 §5](https://www.rfc-editor.org/rfc/rfc8085.html#section-5)

## 経路のMTUと、送る速さを考える

経路MTU（PMTU）は、宛先までの経路を分割せずに通れるIPパケットの上限です。UDPペイロードに使える長さは、そこからIPヘッダーとUDPヘッダーを引いて求めます。例えばPMTUが1,500バイトで、IPv4ヘッダーにオプションがなければ`1500 − 20 − 8 = 1472`バイト、IPv6で拡張ヘッダーがなければ`1500 − 40 − 8 = 1452`バイトです。トンネルやヘッダーの追加で、使える長さは変わります。[IETF RFC 8085 §3.2](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.2) · [IETF RFC 8200 §3](https://www.rfc-editor.org/rfc/rfc8200.html#section-3)

IPがパケットを複数のフラグメントに分ける場合、受信側は断片をすべて集めて再構成してからUDPへ渡します。一つの断片を失うと元のデータグラムを受け取れません。IPv6でフラグメントを作るのは送信元です。大きさを調べながら送る方式には、アプリやトランスポートが応答を確認できる探査データグラムを使うDPLPMTUDがあります。[IETF RFC 8085 §3.2](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.2) · [IETF RFC 8200 §4.5](https://www.rfc-editor.org/rfc/rfc8200.html#section-4.5) · [IETF RFC 8899](https://www.rfc-editor.org/rfc/rfc8899.html)

UDPを直接使うインターネット通信では、アプリか上位プロトコルで輻輳に応じて送信を調整します。例えば送信を短時間に集中させず、受信側からのフィードバックで混雑を検知したら送る量や頻度を落とします。送信量が経路上のボトルネックを超えると、キューの待ち時間が増え、容量を使い切ると損失も起きます。[IETF RFC 8085 §3.1](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.1) · [遅延・スループットと待ち行列](/network/latency-throughput-and-queues.html)

## ゲームのデータごとに期限と順序を決める

例えば毎回全体を送る状態スナップショットなら、更新番号`100 → 102 → 101`の順に届いたとき、`102`を採用したあとの`101`を捨てる設計ができます。番号の比較は同じセッションや同じ状態系列の中で行い、有限の番号が一周する場合の比較規則も決めます。古いデータが届くまで進行を止める必要があるかは、状態の置き換え方で変わります。[IETF RFC 8085 §3.3](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.3)

一度だけ適用する操作なら、識別子を付け、受信側で重複を検査します。応答がなければ再試行する設計では、再試行の期限と頻度、応答が何を確認したかも定義します。必要な順序や配送の性質に合うトランスポートを選ぶ方法もあります。例えばQUICはUDP上で暗号化された接続を確立し、順序のある信頼性付きストリームと輻輳制御を提供します。拡張を使うと、同じ接続上で再送されないデータグラムも扱えます。[QUICとHTTP/3](/network/quic-and-http3.html) · [IETF RFC 9000](https://www.rfc-editor.org/rfc/rfc9000.html) · [IETF RFC 9221](https://www.rfc-editor.org/rfc/rfc9221.html)

ルーターを通るUDP通信では、応答を返せる時間や外部から接続できる条件が変換表の状態にも左右されます。[NATとポート変換](/network/nat-and-port-mapping.html)

実践ではWindowsのIPv4ループバックで、二件の境界、受信バッファ不足、空のデータグラムに続く通常の受信を観察します。[C++でUDPの受信結果を確かめる](/practice/network/udp-loopback-observation.html)
