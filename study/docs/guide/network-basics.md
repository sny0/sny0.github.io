---
title: ネットワークの基本から読む
study:
  source: 新規執筆
  section: learning
  format: path
  status: published
  domain: network
  collection: foundations
  order: 2
  summary: PCから別のコンピュータへデータを送る場面を起点に、プロトコル、IPとポート、家庭内の接続機器を調べる読み順。
---

# ネットワークの基本から読む

Webページを開くときやオンラインゲームに接続するときの通信を例に、パケット、IP、ポート、ルーターなどの言葉を確認します。用語が分かったら、個別の仕組みへ進めます。

## 読む順番

1. [ネットワークの基本](/network/network-basics.html)で、コンピュータ同士が何をやり取りし、どんな約束を使うかをつかみます。
2. [IPアドレスとポート](/network/ip-addresses-and-ports.html)で、ホスト名、IPアドレス、ポート、URLがそれぞれ何を示すかを比べます。
3. [家庭のネットワーク機器](/network/home-network-devices.html)で、PCから外へ出るデータが通る機器を追います。

## 確かめること

- ブラウザーとWebサーバーが、要求と応答で何をやり取りするか説明できる。
- 同じPC上の複数のアプリが、通信相手や自分の受け口をどのように区別するか説明できる。
- スイッチ、ルーター、無線アクセスポイントが、家庭のどの部分を担当するか見分けられる。

## 詳しい仕組みへ進む

| 調べたいこと | 次に読む本文 |
| --- | --- |
| ホスト名から接続先を調べる | [DNSと名前解決](/network/dns-resolution.html) |
| データを順序どおりに受け取る | [ソケットとTCP通信](/network/tcp-sockets.html) |
| ゲームの位置更新などをメッセージ単位で送る | [UDPデータグラム](/network/udp-datagrams.html) |
| Webの要求と応答の中身を読む | [HTTP通信](/network/http-messages.html) |
| ルーターが送り先を決める流れを追う | [IPルーティングとEthernet](/network/ip-routing-and-ethernet.html) |
| 自宅の内側と外側でアドレスが変わる理由を知る | [NATとポート変換](/network/nat-and-port-mapping.html) |

PCの部品から確認したい場合は[コンピュータの部品から読む](/guide/hardware-basics.html)へ戻れます。
