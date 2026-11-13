---
{
  "title": "ネットワーク",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": false,
    "section": "reference",
    "format": "index",
    "domain": "network"
  }
}
---

# ネットワーク

通信の層と失敗を、Webとゲームの両方から調べる。

## 辞典の本文

- [DNSと名前解決 — 名前から接続先が決まるまで](/network/dns-resolution.html)
- [HTTPS・SVCBレコードとHTTP/3の発見 — 接続候補をDNSとHTTPから知る](/network/https-svcb-and-http3-discovery.html)
- [HTTPキャッシュ — 保存・鮮度・再検証と304応答](/network/http-caching.html)
- [HTTP通信 — 要求・応答と本文の区切り](/network/http-messages.html)
- [IPアドレス・ポート・ホスト名 — 接続先をどう指定するか](/network/ip-addresses-and-ports.html)
- [IPルーティングとEthernetフレーム](/network/ip-routing-and-ethernet.html)
- [Nagle アルゴリズムと遅延 ACK — TCP の小さい送信を観察する](/network/nagle-and-delayed-ack.html)
- [NATとポート変換](/network/nat-and-port-mapping.html)
- [QUICとHTTP/3](/network/quic-and-http3.html)
- [TLS・証明書・HTTPS — 暗号化と相手の確認](/network/tls-https.html)
- [UDPデータグラムの境界と送受信](/network/udp-datagrams.html)
- [ソケットとTCP通信 — send/recvの内部とメッセージ境界](/network/tcp-sockets.html)
- [ネットワークの基本 — アプリのデータが相手へ届くまで](/network/network-basics.html)
- [ネットワークの遅延・帯域・待ち行列](/network/latency-throughput-and-queues.html)
- [家庭のネットワーク機器 — LAN・ルーター・Wi-Fiの役割](/network/home-network-devices.html)

## この分野の学習ガイド

- [ネットワークの基本から読む](/guide/network-basics.html)

## 作って試す

- [C++とC#でETag・304・保存本文の再利用を観察する](/practice/network/http-cache-observation.html)
- [C++とC#でHTTPSの応答とTLS情報を観察する](/practice/network/https-observation.html)
- [C++とC#でHTTPのヘッダー・本文・終端を観察する](/practice/network/http-message-observation.html)
- [C++とC#でOSの名前解決結果と取消しの境界を観察する](/practice/network/name-resolution-observation.html)
- [C++とC#でTCPのフレーム復元と半閉鎖を観察する](/practice/network/tcp-loopback-observation.html)
- [C++とWinsockでUDPの受信境界を確かめる](/practice/network/udp-loopback-observation.html)
- [パケットが欠けたときのTCPとQUICの配送を比べる](/practice/network/stream-loss-observation.html)

## 扱う範囲・増補する項目

- IP・DNS
- TCP・UDP・QUIC
- TLS・HTTP
- socket
- メッセージ境界
- 遅延・再送・流量制御
