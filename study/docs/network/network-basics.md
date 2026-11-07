---
title: ネットワークの基本 — アプリのデータが相手へ届くまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: ネットワーク、クライアントとサーバー、パケット、プロトコルを定義し、Webページを開く操作から通信の層と往復をたどる。
  aliases: [ネットワーク, インターネット, クライアント, サーバー, プロトコル, パケット, 通信の層, Ethernet, Wi-Fi]
  verification: MDNのWeb基礎とIETFのIP・TCP・UDP・HTTP仕様に照合（2026-11-07）
---

# ネットワークの基本 — アプリのデータが相手へ届くまで

**ネットワーク**は、機器をつないでデータをやり取りできるようにした仕組みです。家庭のPCとスマートフォンがつながる範囲もネットワークで、そのようなネットワーク同士を世界規模でつないだものが**インターネット**です。通信するときは、端末に入っているアプリ、OS、通信機器がそれぞれ仕事を受け持ちます。[MDNのインターネットの仕組み](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/How_does_the_Internet_work)

## クライアントとサーバーは会話の役割

Webページを見るとき、ブラウザーは「このページのデータをください」という**要求**を送り、相手は結果を**応答**として返します。要求する側を**クライアント**、要求を受け付ける側を**サーバー**と呼びます。「サーバー」はその役割を果たすプログラムを指すことも、そのプログラムが動く機器を指すこともあります。[HTTPのクライアントとサーバー](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.3)

ゲームでも、クライアントが操作を送り、サーバーが更新した状態を返す構成があります。また、あるPCが外部のサーバーへ要求しながら、別の通信では他のPCからの要求を受けることもできます。役割は、どの通信を見ているかで決まります。[HTTPの接続と要求の流れ](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.3)

## プロトコルはデータの形式と手順

相手と通信するには、どの欄に宛先を書くか、どんな順で要求するか、応答をどう読むかを合わせます。このような約束を**プロトコル**と呼びます。Webページの要求にはHTTP、IPアドレスを使った転送にはIPというように、担当する仕事ごとに約束があります。[MDNのWebが動く仕組み](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works)

| 名前 | 担当する仕事 |
| --- | --- |
| **HTTP** | ページなどへの要求と、応答の意味・形式を定める。 |
| **TCP** | 送ったデータを、相手が順序のそろったバイト列として読み取れるようにする。欠けた部分は再送する。バイトはデータの量を数える単位。 |
| **UDP** | 一件ずつのメッセージを送る。届く順番、再送、重複への対応は用途に合わせて上の層で扱う。 |
| **IP** | 宛先IPアドレスを使い、複数のネットワークをまたいでデータを転送する。 |
| **Ethernet・Wi-Fi** | 有線や無線のリンク上で、隣接する機器とのデータの受け渡しを担当する。 |

例えばTCPを選ぶかUDPを選ぶかで、アプリがデータの区切りや欠落を扱う方法が変わります。HTTP/3ではUDPの上にQUICを使い、QUICが信頼性のあるストリームなどを提供します。[TCPの基本](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2) · [UDPの仕様](https://www.rfc-editor.org/rfc/rfc768.html) · [QUICとHTTP/3](/network/quic-and-http3.html)

## データを小さな単位にして運ぶ

大きなページや画像を運ぶとき、通信に使うデータは複数の単位に分かれます。ネットワーク上で運ぶ単位を広く**パケット**と呼びます。各パケットには、運びたい中身に加えて、宛先などを示す**ヘッダー**が付きます。段階ごとの名前では、TCPの単位を**セグメント**、Ethernet上の単位を**フレーム**と呼びます。[TCPセグメントとIPデータグラム](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2) · [IPヘッダー](https://www.rfc-editor.org/rfc/rfc791.html#section-3.1)

<figure class="study-figure">
  <img src="/images/network/network-basics.svg" alt="送信側のHTTPデータにTCP、IP、リンクの情報が順に付き、ネットワークを通る。受信側はリンク、IP、TCPの順に処理し、HTTPのデータをアプリへ渡す。" width="760" height="436" loading="lazy">
  <figcaption>HTTP/1.1をTCPで送る例です。矢印は処理の担当を表し、各段のデータが同じ大きさの一件になることは表しません。<a href="/study/images/network/network-basics.svg" target="_blank" rel="noopener noreferrer">通信の層の図を拡大</a></figcaption>
</figure>

上の層は下の層の機能を使います。HTTPは要求と応答を決め、TCPはそのデータを運ぶための順序を扱い、IPは宛先へ向けた転送を扱います。リンク上のフレームは経由する区間ごとに作られ、宛先IPから次の経由先を選ぶ機器を**ルーター**と呼びます。[インターネットの通信の層](https://www.rfc-editor.org/rfc/rfc1122.html#section-1.1.3) · [IPルーティングとEthernetフレーム](/network/ip-routing-and-ethernet.html)

## Webページを開く操作からたどる

新しくHTTPSのページを開く場面を、HTTP/1.1またはHTTP/2を使う場合で考えます。キャッシュや既存の接続を使える場合は、一部の処理を再利用できます。[HTTPの接続とキャッシュ](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.3) · [HTTPキャッシュ](/network/http-caching.html)

1. ブラウザーがURLを読み、接続先のホスト名と、要求するページのパスを取り出します。
2. **名前解決**で、ホスト名に対応する接続先IPアドレスの候補を調べます。DNSは、そのために使う名前の仕組みです。
3. 接続先のIPアドレスとポートを決め、TCPで接続します。HTTPSではTLSで通信を保護し、証明書などで相手を確認します。
4. HTTPの要求を送り、サーバーの応答を受け取ります。
5. ブラウザーが受け取ったHTMLを読み、画像やスタイルシートなどの追加のデータを取得して表示します。

この流れを読むと、名前が見つかる段階、相手との接続、HTTPの応答、ブラウザーの表示を順に追えます。例えば「名前解決は成功したが接続を確立できない」と「接続後にHTTPのエラー応答が返る」では、調べる場所が変わります。[MDNのWebが動く仕組み](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works) · [TLSとHTTPS](/network/tls-https.html)

## ゲームの通信で同じ用語を読む

オンラインゲームで小さな状態更新を送るときも、アプリが作ったデータをOSや通信機器が相手へ運びます。ゲームが何を確定させたいかによって、TCP、UDP、QUICなどから使う方式を選びます。届くまでの時間や、失われた更新の扱いは、ゲームの状態をどう進めるかとつながります。[UDPの用途と注意点](https://www.rfc-editor.org/rfc/rfc8085.html#section-3) · [通信の遅延・帯域・待ち行列](/network/latency-throughput-and-queues.html)

## 関連記事

- [IPアドレス・ポート・ホスト名](/network/ip-addresses-and-ports.html)
- [家庭のネットワーク機器](/network/home-network-devices.html)
- [DNSと名前解決](/network/dns-resolution.html)
- [ソケットとTCP通信](/network/tcp-sockets.html)
- [HTTP通信](/network/http-messages.html)
