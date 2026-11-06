---
title: ソケットとTCP通信 — send/recvの内部とメッセージ境界
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: IP・port・接続・ソケットを区別し、TCPの送受信バッファと順序制御、部分的なsend/recv、長さ付きフレーム、半閉鎖、アプリ側ACKと期限を説明する。
  aliases: [socket, ソケット, TCP, IP, port, ポート, endpoint, listener, accept, connect, send, recv, byte stream, バイトストリーム, framing, メッセージ境界, length prefix, half-close, 半閉鎖, WouldBlock, application ACK, loopback]
  verification: 一次資料照合（2026-11-04）
---

# ソケットとTCP通信 — send/recvの内部とメッセージ境界

TCPは、接続した相手との間で**順序のあるバイト列**をやり取りする通信方式です。送信側の`send`一回が、受信側の`recv`一回や、アプリのメッセージ一件に対応するわけではありません。byteを届けるTCPと、byteの意味や区切りを決めるアプリの規約を分けます。[IETF RFC 9293 §2.2: Key TCP Concepts](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2)

ここではTCPの基本と、WindowsのWinsock／.NET 10のソケットAPIを説明します。実践は同一プロセス内のIPv4ループバック通信です。外部ネットワーク、Unity、他OSでの実行結果を含みません。

## IP・port・socket・接続

| 用語 | このページでの意味 |
| --- | --- |
| IPアドレス | IP層で配送先などを表すアドレス。1台につき常に一つとは限らない |
| port番号 | TCP内で通信先を区別する16bitの番号。プロセスIDとは別 |
| エンドポイント | IPアドレスとport番号の組 |
| ソケット | アプリがOSの通信状態を操作するための資源。C++では`SOCKET`、C#では`Socket`で扱う |
| TCP接続 | 二つのエンドポイント間で維持する通信状態 |

TCPの接続は、送信元IP・送信元port・宛先IP・宛先portという**4つ組**で区別します。同じサーバーportへ複数のクライアントが接続できるのは、相手側のエンドポイントも含めて識別するためです。これはアプリが持つソケットのハンドル値や、ログインしたユーザーIDとは別の識別です。[IETF RFC 9293 §4: connection / socket](https://www.rfc-editor.org/rfc/rfc9293.html#section-4)

サーバーは`bind`でローカルのエンドポイントを割り当て、`listen`で接続要求を待つ状態にします。この**待受けソケット**（listener）と、`accept`が返す**接続済みソケット**は別です。実際の相手との送受信は後者で行い、元のlistenerは別の接続を受け付けられます。[Microsoft: accept](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-accept)

クライアントは`connect`で相手を指定します。通常のTCP接続確立では、SYN・SYN/ACK・ACKを交わし、両方向のシーケンス番号などを同期します。これが**3ウェイハンドシェイク**です。接続成功はアプリ側のログイン成功や、任意の要求の処理完了を意味しません。[Microsoft: TCP/IPの3ウェイハンドシェイク](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/three-way-handshake-via-tcpip)

実践は`127.0.0.1`を直接指定し、名前をIPへ解決するDNSは使いません。listenerのportを0としてOSに割り当ててもらい、実際のportへクライアントを接続します。**port 0を宛先にして通信する例ではありません。** IPv4を選ぶのはこの例の範囲で、TCPにはIPv6で使うソケットもあります。[Microsoft: bind — port zero](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-bind)、[WSASocket — address families](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-wsasocketw)

## sendから相手のrecvまで

次は通常の送受信を考えるための**概念上の経路**です。OSごとの関数呼出しの厳密な順序や、コピー回数を固定するものではありません。

1. アプリが送るbyte列を用意し、`send`へ範囲を渡す。OS側の送信管理へ受け入れられた分を、戻り値で確認する。
2. TCPがバイト列へシーケンス番号を対応させ、セグメントという転送単位にまとめる。受信確認や必要な再送を管理する。
3. 別ホストへの通信ではIP層が配送先や経路を扱い、ネットワークインターフェースなどを通じてデータを送る。
4. 相手側のTCPが順序や重複を管理し、アプリへ渡すバイト列を受信側のバッファに保持する。
5. 相手の`recv`が今回取り出せたbyteを返す。アプリは蓄積したbyte列からメッセージを解析する。

シーケンス番号はbyteの位置を扱い、再送しても同じデータをアプリへ重複して渡さないために使います。**フロー制御**は相手の受信能力に合わせて送信を制限する仕組みです。ネットワークの混雑に応じた送信量の調整である輻輳制御とも区別します。TCPの信頼性は、無限に通信が成功し続けることや、一定時間で届くことを保証しません。[IETF RFC 9293 §2.2 / §3.8](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.8)

OSのバッファは送受信を仲介しますが、アプリのすべてのバッファと一対一の連続領域である必要はありません。API、OS、オフロードなどで処理経路は変わり、「send一回でコピー一回」「send一回でパケット一個」とは数えません。

<figure class="study-figure">
  <img src="/images/network/tcp-data-path.svg" alt="送信アプリからOSの送信管理、TCP、別ホストへのIP配送とネットワークインターフェース、相手のTCP受信バッファ、recvと解析へ進む概念図。ループバック実践は同一ホスト内で、物理NICや外部ネットワークの動作を測定しない。" width="760" height="1510" />
  <figcaption><strong>sendで受け入れられる時点と、相手アプリが解析する時点を分ける。</strong> 別ホスト通信の経路は概念図です。実践の<code>127.0.0.1</code>通信は同一ホスト内で、NICや外部ネットワークを実測しません。<a href="/study/images/network/tcp-data-path.svg" target="_blank" rel="noopener noreferrer">TCPのデータ経路を拡大</a></figcaption>
</figure>

**ループバック**は、自分のホスト内へ戻す通信です。IPv4の127から始まるアドレスは、ホスト外へ出すための宛先ではありません。ローカル実験の時間や成功率から、実ネットワークの遅延・混雑・再送・NIC性能を結論しません。[IETF RFC 1122 §3.2.1.3: loopback](https://www.rfc-editor.org/rfc/rfc1122.html#section-3.2.1.3)

## send成功、TCPのACK、アプリのACK

`send`が正の数を返しても、相手のアプリが既に受け取り、解析し、処理を終えた証拠にはなりません。Winsockの資料も、送信呼出しの成功だけでは相手への配送成功を示さないと区別しています。[Microsoft: send — successful completion](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-send)

TCPの**ACK**は、TCPがどこまでのシーケンス番号を受信確認したかを伝えるものです。相手のゲーム処理がそのデータを採用したか、保存が完了したかは別です。[IETF RFC 9293 §3.1: Acknowledgment Number](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.1)

アプリに必要なら、別途「要求ID 42の処理を受け付けた」「保存まで終えた」などの返答を設計します。これをここでは**アプリ側ACK**と呼びます。何を確認したACKなのかまで規約に含めます。単に`OK`と返すだけで、永続保存や重複防止が自動で保証されるわけではありません。

## 部分的なsend・recvと、0・エラー

通常のフラグで、正のbyte数を要求するTCP通信を考えます。必要な範囲が一回で処理されるとは限りません。

| 結果 | 意味と扱い |
| --- | --- |
| `send`が正の数`n` | その`n`byte分だけ進め、未送信の残りを保持する |
| `recv`が正の数`n` | 今回の結果は受取領域の先頭`n`byte。解析用の状態へ追加する |
| 正の数を要求した`recv`が0 | 相手の正常な送信終了を受け、残りの受信データもなくなった |
| `WouldBlock` | 今は進める条件がない。終了や永久的な失敗とは区別する |
| その他のエラー | リセットなどをAPIのエラーコードに従って処理する |

Winsockの`send`／`recv`は、失敗時に`SOCKET_ERROR`を返し、`WSAGetLastError`で理由を取得します。`WSAEWOULDBLOCK`はnonblockingソケットが今は待機を必要とする場合の結果です。正常な受信終了の0と、接続リセットの`WSAECONNRESET`を同じ成功として扱いません。[Microsoft: recv](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-recv)

C#の`Socket.Send`／`Socket.Receive`も実際数を確認します。特にnonblockingの`Send`は、要求より少ない数で成功する場合があります。使用するオーバーロードによって、エラーを`SocketException`や`SocketError`で受け取ります。[Microsoft: Socket.Send](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.send?view=net-10.0)、[Socket.Receive](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.receive?view=net-10.0)

要求数0の操作を、相手の終了検査の代わりにしません。また、**受信データ中の`00`は通信終了の印ではありません。** byte内容とreadの実際数を分ける点は[ファイルread](/os/file-read-journey.html)にも通じますが、ソケットの切断や待機には別の契約があります。

## TCPの上でメッセージの境界を作る

TCPは`send`の区切りを保存しません。ヘッダーだけが先に届く、本文が分かれる、複数メッセージが一回の`recv`に入る、という組合せをアプリが扱います。TCPセグメントの境界も、アプリのread/writeバッファ境界との対応は保証されません。[IETF RFC 9293 §3.7: Segmentation](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.7)

実践では、各本文の前に**2byteの長さをbig-endianで置く**規約を使います。長さは本文のbyte数で、2byteのヘッダー自体は含みません。これは教材が選んだアプリの規約であり、TCPがこのヘッダーを追加するわけではありません。

```text
長さ     本文
00 06 | 41 42 00 E3 81 82
00 04 | 10 20 30 40

送る全体は14byte:
00 06 41 42 00 E3 81 82 00 04 10 20 30 40
```

解析側は、まず長さ用の2byteを揃え、`上位byte × 256 + 下位byte`で本文長を求めます。その長さの本文が揃ったら一件を完成させ、残りがあれば次のヘッダーへ進みます。CPUネイティブの整数表現を、そのままネットワーク形式と見なしません。[整数とバイト順](/data/integer-bits-and-bytes.html)を参照してください。

受信時には、許容する本文長、蓄積量、未完了フレームの期限を設けます。宣言長を無検証で確保すると、壊れた入力が大量のメモリや待機を要求し得ます。ヘッダーや本文の途中でEOFになったら、今回の規約では未完成のメッセージです。EOFだけで正常な一件に変わるわけではありません。

実践はsend／recvの要求を最大3byteに制限して、累積処理を観察しやすくします。**要求を小さくしたことは、実ネットワークのパケット分割を観測したことではありません。** APIの呼出し回数、実際数、待機回数は固定の通信規約にしません。

## 半閉鎖と、逆方向の返答

TCPは双方向です。一方がもう送らないことと、逆方向のデータも受け取れないことを分けられます。**送信側の半閉鎖**では、Winsockの`shutdown(SD_SEND)`、C#の`Shutdown(SocketShutdown.Send)`で以後の送信を終了し、受信は続けます。[Microsoft: shutdown](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-shutdown)、[Socket.Shutdown](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.shutdown?view=net-10.0)

実践の順序は次のとおりです。

1. クライアントが14byteをすべてsendへ受け入れてもらい、送信側を半閉鎖する。
2. サーバー側が2フレームを解析し、`recv`の0でクライアントの送信終了まで確認する。
3. サーバーがアプリ側ACKとして`4F 4B 00 01`の4byteを返し、自分の送信側も半閉鎖する。
4. クライアントがACKの内容と、その後の受信終了を確認する。

この4byteは独自の固定返答で、上の長さ付きフレームとは別に定めています。途中の`00`もデータです。ここでのACKは「2フレームと送信終了を検証した」という教材上の返答で、ゲーム内処理や保存を行うものではありません。

<figure class="study-figure">
  <img src="/images/network/tcp-framing-and-half-close.svg" alt="14byteのストリームから2byteの長さ付き本文6byteと4byteを復元し、クライアントの送信半閉鎖後もサーバーから4byteのアプリ側ACKを返せることを示す図。recv境界やパケット境界はフレーム境界として扱わない。" width="760" height="1510" />
  <figcaption><strong>フレームの完成、相手の送信終了、逆方向の返答を別に確認する。</strong> <code>shutdown</code>自体はソケットの解放ではありません。最後はC++の<code>closesocket</code>やC#の<code>Dispose</code>で所有資源を解放します。<a href="/study/images/network/tcp-framing-and-half-close.svg" target="_blank" rel="noopener noreferrer">境界と半閉鎖の図を拡大</a></figcaption>
</figure>

## nonblocking、待機、期限

nonblockingは「今は進まない操作を、無期限に待ち続けず結果として返す」設定です。常にデータがあることや、処理全体が別スレッドで進むことを意味しません。nonblockingの`connect`も即時成功だけでなく、接続中の状態を返すため、その後の成立や失敗を確認します。[Microsoft: connect](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-connect)

Windowsの`select`やC#の`Poll`は、進めそうな操作や終了を待つ道具です。**readableは、完全な一件のメッセージが届いたという通知ではありません。** データだけでなく切断やリセットの場合もあるため、実際の`recv`結果を読みます。これらの待機呼出し自体は、呼出しスレッドを待機させる場合があります。[Microsoft: select](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-select)、[Socket.Poll](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.poll?view=net-10.0)

実践は単一スレッドで接続や送受信を進め、nonblockingと有限の待機を組み合わせます。期限は、時刻補正で前後しない単調な経過時間を基準にした**絶対期限**で管理し、繰返しのたびに待ち時間を最初から延ばしません。C++の`steady_clock`や、WindowsでのQPCを基準にした経過時間と、日時を表す時計を区別します。ただしOSのスケジュールや待機精度があるため、正確な実時間で必ず復帰する保証ではありません。[C++20草案 N4861: steady_clock](https://timsong-cpp.github.io/cppwp/n4861/time.clock.steady)、[Microsoft: 高精度の時刻と経過時間](https://learn.microsoft.com/en-us/windows/win32/sysinfo/acquiring-high-resolution-time-stamps)

**期限切れは、データが相手へ全く届かなかった証明ではありません。** 相手が処理した後に返答だけ失われた場合も、まだ処理していない場合も区別できないことがあります。再接続して同じ購入や保存要求を再試行する設計なら、要求ID、重複の記録、同じ要求を二度適用しない規約などを別途考えます。TCP内部の再送と、アプリによる要求の再実行は別です。

## ゲームへの接続と実践の範囲

受信完了を別スレッドやイベントで扱う場合も、共有状態とバッファの所有期間を決めます。[スレッド同期](/runtime/thread-synchronization.html)や[非同期I/O](/os/asynchronous-file-io.html)の「要求・完了・利用」を分ける考え方につながりますが、ファイルAPIの契約をソケットへそのまま移しません。

ゲームでは必要な順序、期限、再送、帯域、認証などから通信方式を選びます。UDPでは受け取るデータの区切りと失敗時の扱いが変わります。回線が混雑した場合は、転送量と遅延を分けて測ります。[UDPとデータグラム](/network/udp-datagrams.html) · [通信の遅延と帯域](/network/latency-throughput-and-queues.html)

Webの要求・応答へ進む場合は[HTTP通信](/network/http-messages.html)、名前からIP候補を得る処理は[DNSと名前解決](/network/dns-resolution.html)、暗号化と相手の確認は[TLS・証明書・HTTPS](/network/tls-https.html)へ進んでください。

IPアドレスが決まった後に、OSがどのインターフェースと経由先を選ぶかは、[IPの経路選択とEthernet](/network/ip-routing-and-ethernet.html)で追えます。

[C++とC#でTCPループバックを観察する](/practice/network/tcp-loopback-observation.html)では、既知の2フレーム、部分的なAPI処理、アプリ側ACK、両方向の送信終了を照合します。実パケットの境界、再送、外部ネットワーク性能、物理NICの動作は観測対象に含めません。
