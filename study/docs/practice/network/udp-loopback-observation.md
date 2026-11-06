---
title: C++とWinsockでUDPの受信境界を確かめる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: network
  collection: udp-loopback-observation
  order: 1
  summary: 127.0.0.1でUDPを送り、受信単位、短いバッファでのWSAEMSGSIZE、空データグラムのあとも受信できることを確認する。
  aliases: [UDP, datagram, Winsock, sendto, recvfrom, WSAEMSGSIZE, loopback, zero-length datagram]
  verification: Windows x64のMSVCでビルド。IPv4ループバックで10回実行し、データグラム境界と2種類の戻り値を確認（2026-11-07）
---

# C++とWinsockでUDPの受信境界を確かめる

一つのプロセスで送信側と受信側のソケットを作り、どちらも`127.0.0.1`にバインドします。ポートはOSが選び、受信時に`recvfrom`から得た送信元と照合します。二つのデータグラムを続けて送る場合、受信バッファが短い場合、中身が0バイトの場合を順に試します。[UDPとデータグラム](/network/udp-datagrams.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/network/udp-loopback-observation/udp_loopback.cpp" download>udp_loopback.cpp</a>を空の作業フォルダーに保存します。WindowsのVisual Studioで**x64 Native Tools Command Prompt**を開き、そのフォルダーで実行します。通信は同じPC内で完結します。[MicrosoftのC++コマンドラインツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170) · [MicrosoftのWinsock初期化手順](https://learn.microsoft.com/en-us/windows/win32/winsock/initializing-winsock)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX udp_loopback.cpp ws2_32.lib
udp_loopback.exe
```

```text
separate datagrams: ABC (3), xy (2)
8-byte datagram into 4-byte buffer: WSAEMSGSIZE
next datagram: after (5)
empty datagram: recvfrom returned 0
same socket still receives: still (5)
```

## 戻り値と次の受信を照合する

| 操作 | 確かめること |
| --- | --- |
| `ABC`と`xy`を別々の`sendto`で送る | 受信側では`recvfrom`を2回呼び、3バイトと2バイトを別のデータグラムとして受け取る。 |
| `12345678`を送り、4バイトしか渡さずに受信する | Winsockは`SOCKET_ERROR`を返し、`WSAGetLastError()`で`WSAEMSGSIZE`を得る。次の受信では、続けて送った`after`が届く。 |
| 0バイトを送る | `recvfrom`は`0`を返す。続けて送った`still`も同じソケットで受信できる。 |

最初の2件はどちらの順に届いても照合に通ります。8バイトが入りきらなかった場合に、次の`recvfrom`で残り4バイトを読むことはできません。WinsockではUDPの入りきらなかったデータは破棄されます。0バイトのデータグラムは正常に受信した一件で、TCPのEOFとは区別します。[Microsoftのrecvfrom仕様](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-recvfrom) · [RFC 8085のUDPガイドライン](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.3)

この実践が確かめるのはソケットAPIの戻り方です。実際の回線での到着時間や欠落は、送信側と受信側の時刻や番号を記録し、回線に負荷がある場合とない場合で比べます。[通信の遅延と帯域](/network/latency-throughput-and-queues.html) · [TCPのフレーム復元を試す](/practice/network/tcp-loopback-observation.html)

## ソース

<<< @/public/samples/network/udp-loopback-observation/udp_loopback.cpp{cpp}
