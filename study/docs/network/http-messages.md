---
title: HTTP通信 — 要求・応答と本文の区切り
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: HTTP/1.1の要求行・応答行・ヘッダー・本文を、送受信するbyte列として読む。Host、CRLF、Content-Length、UTF-8、接続終了を区別し、HTTPの成功とアプリの目的達成の境界を説明する。
  aliases: [HTTP, HTTP/1.1, HTTP request, HTTP response, 要求, 応答, GET, Host, request-target, status code, ステータスコード, header, ヘッダー, CRLF, Content-Length, Content-Type, Date, Connection close, safe, idempotent, 冪等]
  verification: 一次資料照合（2026-11-04）
---

# HTTP通信 — 要求・応答と本文の区切り

HTTPは、クライアントが**要求**（request）を送り、サーバーが**応答**（response）を返すためのアプリ層の通信規約です。対象、操作、処理結果、本文の形式などを表します。ここではHTTP/1.1をTCPのバイト列へ直列化し、相手側で解析する仕組みを説明します。

[TCPソケット](/network/tcp-sockets.html)が扱うのは、順序のあるバイト列です。そのどこまでが一つのHTTPメッセージで、どのbyteが本文なのかは、HTTPの規則から決めます。HTTPの意味を定めるRFC 9110と、HTTP/1.1の構文・区切りを定めるRFC 9112を分けて参照します。[IETF RFC 9110 §3.4](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.4)、[RFC 9112 §2](https://www.rfc-editor.org/rfc/rfc9112.html#section-2)

実践は、WindowsのC++／WinsockとC#／.NET 10のraw Socketによる、同一プロセスのループバック通信です。HTTPクライアントライブラリが通常行う処理の一部を、既知の要求・応答だけに絞って見える形にします。

以前の応答を保存して使う条件と、本文を再送しない304応答は、[HTTPキャッシュと再検証](/network/http-caching.html)で扱います。

## URLから要求メッセージへ

対象を`http://127.0.0.1:<port>/study-demo`と考えます。`<port>`は説明用の置き場所で、実際にはOSが割り当てたport番号です。クライアントはそのIPとportへTCP接続し、次の要求を送ります。

```text
GET /study-demo HTTP/1.1\r\n
Host: 127.0.0.1:<port>\r\n
Connection: close\r\n
\r\n
```

ここで`\r\n`は、実際に送るCR・LFの2byteを読みやすく表した記号です。バックスラッシュを含む4文字を送るものではありません。

最初の行を**要求行**（request-line）と呼びます。

| 要素 | この要求での値と意味 |
| --- | --- |
| メソッド | `GET`。対象の現在の表現を取得するよう求める |
| request-target | `/study-demo`。この接続先で操作する対象を示す |
| HTTPバージョン | `HTTP/1.1`。このメッセージに使う構文の版 |

直接接続する通常の要求では、request-targetにパスと必要なクエリーを置く**origin-form**を使います。URL全体を常に要求行へ置く規則ではありません。`/study-demo`も、そのままディスク上のファイル名を指定する命令ではなく、サーバーがハンドラーなどへ対応付ける対象です。[RFC 9112 §3 / §3.2.1](https://www.rfc-editor.org/rfc/rfc9112.html#section-3.2.1)

`Host`は対象URIのhostとportをHTTP側へ伝えるフィールドで、HTTP/1.1のクライアント要求には必要です。一つの接続先が複数のhost名を扱う場合もあるため、TCPの接続先だけでHTTPの対象がすべて決まるわけではありません。この実践は直接指定したループバックIPを使い、DNSによる名前解決は行いません。[RFC 9110 §7.2: Host](https://www.rfc-editor.org/rfc/rfc9110.html#section-7.2)

## 行末と空行が、ヘッダーを区切る

HTTP/1.1の基本形は、開始行、0個以上の**ヘッダーフィールド**、空行、必要なら本文です。ヘッダーは`名前: 値`で、本文の形式や長さ、接続の扱いなどの情報を添えます。

送信時の開始行とヘッダー行は、`CRLF`で終えます。CRは`0D`、LFは`0A`です。最後のヘッダー行を終えるCRLFの後に空行のCRLFが続くため、この例では次の4byteがヘッダーの終端になります。

```text
\r\n\r\n  =  0D 0A 0D 0A
```

**空行はヘッダーの終了であり、本文が必ず終わった印ではありません。** その後に本文があるか、何byteあるかは別に判定します。また、HTTP/1.1のメッセージはまずbyte列として解析します。全体を先に任意の文字コードで文字列化してから行を探す設計へ置き換えません。[RFC 9112 §2.1 / §2.2](https://www.rfc-editor.org/rfc/rfc9112.html#section-2.2)

フィールド名は大文字・小文字を区別しません。異なる名前のヘッダーを、この例と同じ順に並べることも一般の受信条件ではありません。固定会話の教材が受け付ける形式を限定することと、それ以外が規格上不正であることは区別します。値の解釈や、同じ名前が複数ある場合の扱いには、個別の規則があります。[RFC 9110 §5.1 / §5.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.3)

## サーバーが解析して、応答を作る

サーバーは届いたbyteを蓄積し、要求行とヘッダーを解析します。メソッドや対象を検証して処理先を選び、返すステータス、ヘッダー、本文を決め、再びbyte列へ直列化します。クライアントは逆に応答の構文を読み、本文の範囲と形式を取り出します。

この例の要求は`Content-Length`も`Transfer-Encoding`もなく、HTTP/1.1の長さ規則では本文0byteです。**GETという名前だけから、あらゆる要求の本文が0と決まるわけではありません。** 今回は本文を持たないGETだけを扱います。[RFC 9112 §6.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-6.3)

固定の処理先`/study-demo`は、次のヘッダーと9byteの本文を返します。`<IMF-fixdate>`は、この表示で省略した日時の位置です。実際には実行時に生成したUTCの日時が入ります。

```text
HTTP/1.1 200 OK\r\n
Date: <IMF-fixdate>\r\n
Content-Type: text/plain; charset=utf-8\r\n
Content-Length: 9\r\n
Connection: close\r\n
\r\n
```

最初の**ステータス行**は、バージョン、3桁のステータスコード、省略可能な理由句で構成します。意味を判断する中心は数値の`200`で、`OK`という英語の完全一致を一般の成功判定には使いません。`200`は要求が成功したことを表し、返す内容の意味はメソッドにも依存します。[RFC 9112 §4](https://www.rfc-editor.org/rfc/rfc9112.html#section-4)、[RFC 9110 §15.3.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.1)

`Date`は、メッセージを生成した日時の近似を伝えます。時計を持つorigin serverは、この200応答にDateを生成する必要があります。生成形式は、例えば`Wed, 04 Nov 2026 01:23:45 GMT`のような**IMF-fixdate**です。この日時は説明用で、実行値は異なります。これはUTCの日時を表す時計で、I/Oの8秒の絶対期限に使う単調な経過時間とは別です。[RFC 9110 §6.6.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-6.6.1)、[§5.6.7](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.7)

<figure class="study-figure">
  <img src="/images/network/http-exchange.svg" alt="URLのhostとportへ接続してGETの要求行とHostヘッダーを送り、サーバーが対象を解析して200応答のヘッダーと本文を作り、クライアントが解析する流れ。実践はループバックで外部通信やTLSは使わない。" width="760" height="1510" />
  <figcaption><strong>要求・応答の両端で、意味のある情報と送受信するbyte列を変換する。</strong> <code>Date</code>の値とportは実行時に決まり、図の時間や通信分割は実測値ではありません。<a href="/study/images/network/http-exchange.svg" target="_blank" rel="noopener noreferrer">HTTPの要求と応答を拡大</a></figcaption>
</figure>

## Content-TypeとContent-Lengthは別の仕事

`Content-Type: text/plain; charset=utf-8`は、今回の本文をプレーンテキストとして扱い、その文字コードをUTF-8とする情報です。`Content-Type`は表現の形式と処理方法を示し、本文を何byte受け取るかを決めるフィールドではありません。[RFC 9110 §8.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.3)

本文の実体は次の9byteです。

```text
48 54 54 50 20 E3 81 82 0A
 H  T  T  P  空白   あ     LF
```

UTF-8として読むと`HTTP あ\n`です。`あ`は3byte、最後のLFは1byteで、Unicodeスカラー値は改行を含め7個になります。**Content-Lengthは文字数ではなく、本文のbyte数です。** ヘッダー部や、その終端を表す4byteはこの9に含めません。[文字コードと長さ](/data/unicode-and-encoding.html)の区別も使います。

このGETへの200応答は`Transfer-Encoding`を使わず、本文長を`Content-Length: 9`で示します。したがってヘッダー終端の直後から9byteが今回の本文です。本文末尾のLFは内容の一部で、ヘッダー行末のCRLFとは役割が異なります。[RFC 9112 §6.2 / §6.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-6.3)

これは今回の会話の長さ規則です。一般のHTTPには、本文を持たない応答や、chunkedなど別の区切り方もあります。すべての応答を「Content-Lengthを探してその数だけ読む」一種類の処理で解析できるとはしません。

## TCPのrecv境界を、HTTPの境界にしない

一回の`recv`が、ちょうど要求行一行やヘッダー全体を返す保証はありません。`\r\n\r\n`の途中で切れる場合も、ヘッダー終端と本文の一部が同時に入る場合も扱います。

受信側はbyte列を保持し、まずヘッダーの終端を探します。見つかったら終端の位置を確定し、既に受信したその後のbyteを本文の先頭として持ち越します。本文が不足すれば続きを読みます。ヘッダーを解析した時点で受取バッファを丸ごと捨てると、同時に届いた本文を失います。

実践のsend／recv要求は最大7byteです。返された実際数だけ進めることで、小さく分かれた入力を累積します。これは**API側の要求上限**で、TCPパケットを7byteにした観察ではありません。受信の実際数や待機回数も、固定のHTTP仕様にはしません。

<figure class="study-figure">
  <img src="/images/network/http-message-boundaries.svg" alt="HTTPの開始行とヘッダーがCRLFで終わり、CRLFCRLFの後にContent-Lengthで示した9byteの本文が続く図。TCPの受信境界は任意で、ヘッダー終端をまたぐ場合や本文を持ち越す場合を示す。" width="760" height="1510" />
  <figcaption><strong>ヘッダー終端、本文9byteの完成、接続の終了を別に判定する。</strong> 分割例は説明用です。<code>recv</code>一回を、一つのHTTPメッセージや一つのパケットと同一視しません。<a href="/study/images/network/http-message-boundaries.svg" target="_blank" rel="noopener noreferrer">HTTPの区切りと本文長を拡大</a></figcaption>
</figure>

## 本文完了と接続終了

HTTP/1.1は、通常は一つの接続で複数の要求・応答を扱える**持続的接続**を使います。毎回EOFになるまで待って本文完了を判定する設計では、接続が維持されたまま待ち続ける可能性があります。[RFC 9112 §9.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-9.3)

教材は要求と応答に`Connection: close`を置き、この会話の後に接続を終える条件を明示します。それでも、`Content-Length`で示した本文の完成と、TCPの正常な受信終了は別の確認です。

例えば9byteのうち5byteしか得ていない時点でEOFになったら、本文は未完成です。`200`の行を読めたことや、相手が接続を閉じたことだけで正常な9byteに変わりません。期限切れやリセットも、本文不足を埋める成功通知ではありません。逆に9byteが揃えば、今回の本文範囲はEOFを待たずに確定できます。[RFC 9112 §8: Incomplete Messages](https://www.rfc-editor.org/rfc/rfc9112.html#section-8)

## 何の成功を確認したのか

| 確認したもの | そこから判断する範囲 |
| --- | --- |
| sendの正の戻り値 | その数のbyteを送信側の処理へ受け入れた |
| TCPのACK | 相手のTCPによる受信確認。HTTPの解析・実行とは別 |
| HTTPの200 | HTTPの要求成功を示す。具体的な意味はメソッドやサービスの契約に従う |
| 本文9byteの取得 | 今回のHTTP本文の長さが揃った。内容の妥当性は別に検査する |
| アプリの目的達成 | 必要な内容、処理結果、保存条件などをアプリの規約で確認する |

200は「何を要求しても、すべての目的が達成された」という印ではありません。このGET例は既知のテキストを返すだけで、ファイル保存やゲームの状態更新を行いません。保存を伴う別のAPIなら、応答がどの段階を成功と呼ぶかを決めます。HTTPステータスだけから、任意の機器への永続化まで完了したとは推論しません。

## GETのsafeとidempotent

GETは**safe**なメソッドです。定義された意味では、クライアントは対象を変更する操作を要求せず、取得を求めます。ただし、アクセスログなど付随する処理が一切起こらないという意味ではありません。[RFC 9110 §9.2.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1)

GETは**idempotent**（冪等）でもあります。同じ要求を繰り返したときの、サーバーに対する意図した効果が、一回の場合と同じという性質です。応答の日時や本文が毎回同一であることや、ログが一回しか増えないことを保証しません。対象の内容も時間とともに変わり得ます。再試行の判断では、メソッドの意味と実際のサービスの規約を確認します。[RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## HTTPSと、今回扱わない方式

HTTPSは、HTTPの通信をTLSで保護する仕組みとして捉えます。ここで扱うHTTP/1.1とTCPの会話に、暗号化、改ざん検出、相手の確認などを担う層が加わる場合も、HTTP本文の長さと意味を判断する仕事は残ります。今回のraw Socket実践はTLSを使いません。鍵共有や証明書、相手名の検証は[TLS・証明書・HTTPS](/network/tls-https.html)で詳しく説明します。[RFC 9110 §4.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.2.2)

HTTP/2は一つのTCP接続で複数のやり取りを並行して進めます。HTTP/3はQUICのストリームを使います。パケットが欠けたときの違いは[QUICとHTTP/3](/network/quic-and-http3.html)で扱います。接続先を名前から調べる処理は[DNSと名前解決](/network/dns-resolution.html)へ進んでください。[IETF RFC 9114 §1.1–1.2](https://www.rfc-editor.org/rfc/rfc9114.html#section-1.1)

## 実践記事

[C++とC#でHTTPメッセージを観察する](/practice/network/http-message-observation.html)では、自己接続した`127.0.0.1`のソケットで既知の要求・応答を交換し、ヘッダーの区切りと9byteの本文を照合します。固定会話に限定したparserであり、任意のHTTP通信を扱う汎用実装ではありません。ソースとログはASCIIで、本文はUTF-8の既知byte列として扱います。

通信は単一スレッドで有限の待機と8秒の絶対期限を使います。外部インターネット、TLS、他OS、Unityでの動作、故障やタイムアウトの注入は検証範囲に含めません。
