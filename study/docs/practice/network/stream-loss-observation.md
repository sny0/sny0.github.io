---
title: パケットが欠けたときのTCPとQUICの配送を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: network
  collection: stream-loss-observation
  order: 1
  summary: パケットが一つ欠ける場面を動かし、受信済みのデータをアプリへ渡せる範囲がTCPとQUICでどう違うかを確認する。
  aliases: [TCP, QUIC, HTTP/2, HTTP/3, HOL blocking, head-of-line blocking, ストリーム, パケット欠落]
  verification: IETFのTCP・QUIC・HTTP/3仕様と照合。ブラウザーで教材の操作を確認（2026-11-07）
---

# パケットが欠けたときのTCPとQUICの配送を比べる

アプリがA・Bという二つのデータ列を扱うとします。HTTP/2のように一つのTCP接続に両方を載せる場合、TCPは一つの順序付きバイト列として配送します。HTTP/3のように別々のQUICストリームへ分ける場合、QUICはストリームごとに順序を保ちます。同じデータが同じ順で到着すると仮定し、欠けたデータの後ろがどこまで待つかを比べます。[RFC 9293 §2.2](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2) · [RFC 9114 §1.1–1.2](https://www.rfc-editor.org/rfc/rfc9114.html#section-1.1)

## ブラウザーで試す

<a href="/study/samples/network/stream-loss-observation/index.html">比較図を開く</a>

1. 最初は`A0`を運ぶパケットが欠落し、`B0`・`A1`・`B1`が受信側に届いた場面を表示します。TCPでは三つとも待機し、QUICでは`B0`と`B1`が配送済みになります。`A1`は同じストリームの`A0`を待ちます。
2. **1段進める**を押して、欠けていた`A0`のデータが届いたときに、待っていたデータが配送されることを確認します。
3. **最初に戻す**を押し、失うパケットを`B0`に変えて4段目まで進めます。TCPでは最初の`A0`まで、QUICでは`A0`と`A1`が配送されます。
4. 欠落を**なし**に変えると、4段目でどちらも全データを配送できます。

| 4段目までに欠けたデータ | TCPでアプリへ渡せるデータ | QUICでアプリへ渡せるデータ |
| --- | --- | --- |
| `A0` | なし | `B0`・`B1` |
| `B0` | `A0` | `A0`・`A1` |
| `A1` | `A0`・`B0` | `A0`・`B0`・`B1` |
| `B1` | `A0`・`B0`・`A1` | `A0`・`B0`・`A1` |

## 教材の範囲

「配送」は、トランスポートが順序をそろえ、アプリが読み取れるようにする段階です。実際のQUICパケットには複数のストリームのデータが載ることがあり、そのパケットを失うと複数のストリームに欠落が生じます。また、輻輳制御やアプリ側の依存関係は別のストリームにも影響し得ます。教材では送信・到着の予定を固定し、順序待ちだけを図にしています。段数は経過時間や再送の待ち時間を表しません。[RFC 9000 §2.2](https://www.rfc-editor.org/rfc/rfc9000.html#section-2.2) · [RFC 9000 §13.3](https://www.rfc-editor.org/rfc/rfc9000.html#section-13.3) · [RFC 9114 §4.2.1](https://www.rfc-editor.org/rfc/rfc9114.html#section-4.2.1)

## 手元で動かす {#run-locally}

<a href="/study/samples/network/stream-loss-observation/index.html" download>index.html</a>、<a href="/study/samples/network/stream-loss-observation/main.js" download>main.js</a>、<a href="/study/samples/network/stream-loss-observation/styles.css" download>styles.css</a>を同じフォルダーに保存します。Pythonが入っていれば、そのフォルダーで次を実行し、ブラウザーで`http://127.0.0.1:8000/`を開きます。サーバーは `Ctrl+C` で止められます。

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

`main.js`の`snapshot`が各段の到着と配送を計算します。TCPは送信順で最初の欠落まで、QUICは同じストリームの自分までのデータがすべて到着した部分を取り出します。教材内の操作はブラウザーで完結します。

## 関連記事

- [QUICとHTTP/3](/network/quic-and-http3.html)
- [TCPソケットとバイトストリーム](/network/tcp-sockets.html)
- [UDPとデータグラム](/network/udp-datagrams.html)
