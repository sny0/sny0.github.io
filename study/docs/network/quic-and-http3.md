---
title: QUICとHTTP/3
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: UDP上のQUICがTLS 1.3、損失検出、ストリームをどう組み合わせるか。HTTP/2とHTTP/3で欠落がどこまで影響するか、経路の切り替えやDATAGRAM、0-RTTまでたどる。
  aliases: [QUIC, HTTP/3, HTTP/2, Head-of-Line Blocking, HOL, ストリーム, コネクションID, QPACK, QUIC DATAGRAM, 0-RTT]
  verification: IETF RFC 9000・9001・9002・9114・9221・9204・8470に照合（2026-11-07）
---

# QUICとHTTP/3

ページの画像AとスタイルシートBを同じ接続で受け取るとき、途中で画像Aのデータが欠けると、先に届いたBは使えるでしょうか。HTTP/2とHTTP/3では、受信側が順番をそろえる単位が違います。[RFC 9114のHTTP/2との比較](https://www.rfc-editor.org/rfc/rfc9114.html#section-1.1)

## UDPの中でQUICが担当すること

**QUIC**は、UDPデータグラムのペイロードにQUICパケットを載せるトランスポートです。一つのUDPデータグラムに複数のQUICパケットをまとめることがあり、QUICパケットの中にはさらに `STREAM`、`ACK`、`CRYPTO` などのフレームが入ります。送受信の端点でQUICが接続状態を持ち、損失の検出、必要なデータの再送、フロー制御、輻輳制御を担当します。例えば、ネットワークで並び順が変わっても、受信側のQUICがストリームごとにバイト列を組み立てます。[RFC 9000の概要](https://www.rfc-editor.org/rfc/rfc9000.html#section-1) · [パケットをまとめる仕組み](https://www.rfc-editor.org/rfc/rfc9000.html#section-12.2) · [フレーム](https://www.rfc-editor.org/rfc/rfc9000.html#section-12.4) · [UDPデータグラム](/network/udp-datagrams.html)

QUICは接続時に**TLS 1.3のハンドシェイク**を使って相手を認証し、パケット保護用の鍵を導きます。TLSのハンドシェイクデータはQUICの `CRYPTO` フレームに入ります。HTTPSでTCPを使う場合は、TCPのバイト列にTLSレコードを流します。QUICではレコード層の役割をQUICのパケット保護が担い、アプリデータは `STREAM` などのQUICフレームに載ります。[RFC 9001の構成とTLSメッセージの運搬](https://www.rfc-editor.org/rfc/rfc9001.html#section-3) · [TLSとHTTPS](/network/tls-https.html)

## パケット番号とストリーム内のオフセット

| 値 | 何を識別するか | QUICがどう使うか |
| --- | --- | --- |
| パケット番号 | ある送信方向・番号空間で送られた一つのQUICパケット | 受信側は `ACK` で受け取った番号の範囲を返す。送信側は番号と送信時刻を使って損失を検出する。 |
| ストリームIDとオフセット | どのストリームの、各方向のバイト列のどの位置か | `STREAM` フレームを受信側で配置し、先頭から途切れずにそろったバイトを順にアプリに渡す。 |

パケット100に `Aのオフセット0から4バイト` を入れたとします。パケット100の損失を検出し、そのデータがまだ必要なら、送信側は別のパケット番号で同じオフセットのデータを送ります。受信側から見ると、パケットは別物で、埋まるのは同じバイト位置です。パケット番号は、送信方向ごとに `Initial`、`Handshake`、`Application Data` の三つの番号空間に分かれます。0-RTTと1-RTTは `Application Data` の番号空間を共有します。[RFC 9000のストリームの送受信](https://www.rfc-editor.org/rfc/rfc9000.html#section-2.2) · [パケット番号の空間](https://www.rfc-editor.org/rfc/rfc9000.html#section-12.3) · [RFC 9002の送信と損失検出](https://www.rfc-editor.org/rfc/rfc9002.html#section-3)

ストリームがアプリに渡すのは順序付きのバイト列です。例えば、送り手が4バイトずつ2回書き込んでも、受け手が8バイトを一度に読む場合があります。ゲームのメッセージなどを区別するには、長さを先頭に置くなど、アプリ側で区切りを定めます。[RFC 9000のストリームの送受信](https://www.rfc-editor.org/rfc/rfc9000.html#section-2.2)

## HTTP/2とHTTP/3で、損失の影響をたどる

**HTTP/2**は複数のHTTPストリームを一つのTCP接続に多重化します。図のようにAの部分を運ぶTCPセグメントが欠けると、TCPのバイト列に穴ができます。Bのバイトが受信側に届いていても、穴より後ろにあれば、TCPから上の層へ渡せるようになるまで待ちます。先にある欠落が後続のデータを足止めする現象を **Head-of-Line Blocking（HOLブロッキング）** と呼びます。[RFC 9114のHTTP/2との比較](https://www.rfc-editor.org/rfc/rfc9114.html#section-1.1) · [ソケットとTCP通信](/network/tcp-sockets.html)

**HTTP/3**は、クライアントからの各リクエストと対応するレスポンスに一つずつ双方向のQUICストリームを使います。設定などを伝える制御用ストリームは別にあります。Aのオフセット0が欠けていても、Bのバイトが先頭からそろっていれば、受信側のQUICはBを先にHTTP/3へ渡せます。Aの後続部分は、Aの中で欠けた範囲が届くまで待ちます。[RFC 9114のストリームへの対応付け](https://www.rfc-editor.org/rfc/rfc9114.html#section-6)

<figure class="study-figure">
  <img src="/images/network/quic-and-http3.svg" alt="Aの先頭だけが欠けた例。HTTP/2では後から届いたBも同じTCPバイト列の穴を待つ。HTTP/3では別ストリームのBを先に渡せる。Aの先頭を新しいQUICパケットで受け取ると、Aの後続も順に渡せる。" width="760" height="478" loading="lazy">
  <figcaption>Aの先頭、Bの先頭、Aの後続を、それぞれ別のTCPセグメントまたはQUICパケットで送った例です。<a href="/study/images/network/quic-and-http3.svg" target="_blank" rel="noopener noreferrer">損失の影響を比べる図を拡大</a></figcaption>
</figure>

QUICでも、次のような条件では複数のストリームに影響が及びます。

- **同じパケットに入っていたデータ。** 一つのQUICパケットにAとBの `STREAM` フレームが入っていれば、そのパケットを失うと両方のバイト列に穴ができます。[RFC 9002のパケットとフレーム](https://www.rfc-editor.org/rfc/rfc9002.html#section-3)
- **接続が共有する送信の余力。** 同じ経路を使うストリームは輻輳ウィンドウを共有します。損失に反応して送信できる量が減ると、Bの次の送信も遅くなり得ます。また、受信側が示す接続全体のフロー制御上限 `MAX_DATA` に達すると、上限が増えるまで新しいストリームデータを送れません。[RFC 9002の輻輳制御](https://www.rfc-editor.org/rfc/rfc9002.html#section-7) · [RFC 9000のフロー制御](https://www.rfc-editor.org/rfc/rfc9000.html#section-4.1) · [遅延・帯域・待ち行列](/network/latency-throughput-and-queues.html)
- **HTTP/3のヘッダー圧縮。** QPACKで動的テーブルを参照するヘッダーは、必要なテーブル更新が別ストリームから届くまでデコードを待つことがあります。データを運ぶ層でBが読めても、その上のHTTP処理で待つ場合です。[RFC 9204のブロックされるストリーム](https://www.rfc-editor.org/rfc/rfc9204.html#section-2.1.2)

[パケット損失とストリームの実践](/practice/network/stream-loss-observation.html)では、欠けるパケットを変えながら、AとBを受信側のアプリへ渡せる段階を図で追えます。

## ストリームとQUIC DATAGRAMの使い分け

| 用途の例 | QUICで運ぶ単位 | 損失時の扱い |
| --- | --- | --- |
| 確定した結果、ファイル | ストリームのバイト列 | 欠けた部分を再送して、同じストリーム内で順序どおりに渡す。 |
| 最新の位置や向きで上書きできるスナップショット | `DATAGRAM` フレームに収まる一つのメッセージ | QUICによる再送や順序保証はない。更新番号などを見て、受信側で古いものを捨てられる。 |

**QUIC DATAGRAM**は拡張機能です。送るには相手が `max_datagram_frame_size` で受信対応を示している必要があります。アプリデータの暗号化と経路の輻輳制御はストリームと同じQUIC接続で行われるため、混雑時はDATAGRAMも送信を待つか、捨てられます。DATAGRAMを含むパケットに `ACK` が返っても、相手のアプリで結果が適用されたかは、アプリ側の応答で確認します。[RFC 9221のトランスポートパラメータ](https://www.rfc-editor.org/rfc/rfc9221.html#section-3) · [受信とACK・輻輳制御](https://www.rfc-editor.org/rfc/rfc9221.html#section-5)

## IPアドレスやポートが変わったとき

Wi-Fiからモバイル回線へ切り替えると、送信元IPアドレスやUDPポートが変わることがあります。NATが外側のポートを割り当て直した場合も、相手からは送信元が変わって見えます。QUICでは端点が**コネクションID**を手がかりに受信パケットを既存の接続に対応付けます。一つの接続に複数のIDを用意できるので、経路を変えるときは別のIDで同じ接続を指せます。新しい経路の検証では、`PATH_CHALLENGE` で送った値を相手が `PATH_RESPONSE` で返せるかを確認します。QUIC v1でハンドシェイク確認後に能動的な移行を始めるのはクライアントで、サーバーは能動的な移行を無効にする設定を通知できます。[RFC 9000のコネクションID](https://www.rfc-editor.org/rfc/rfc9000.html#section-5.1) · [経路の検証](https://www.rfc-editor.org/rfc/rfc9000.html#section-8.2) · [接続の移行](https://www.rfc-editor.org/rfc/rfc9000.html#section-9) · [NATとポートの対応付け](/network/nat-and-port-mapping.html)

## 0-RTTで先に送るデータを選ぶ

**0-RTT（Early Data）**では、以前の接続で得た再開用の情報を使い、クライアントが新しいハンドシェイクの返事を待つ前にアプリデータを送れます。サーバーはこのデータを拒否できます。また、攻撃者が記録したEarly Dataを再送する**リプレイ**を考慮します。例えば、通貨を消費してアイテムを買う操作は、同じリクエストが再度処理されると困るため、1-RTTのデータとして送ります。HTTPの `425 Too Early` は、再実行の危険があるリクエストの処理を拒むための応答です。再試行はEarly Dataを使わずに行います。[RFC 9001の0-RTT](https://www.rfc-editor.org/rfc/rfc9001.html#section-4.6) · [RFC 9114のEarly Data](https://www.rfc-editor.org/rfc/rfc9114.html#section-10.9) · [RFC 8470の425](https://www.rfc-editor.org/rfc/rfc8470.html#section-5.2)
