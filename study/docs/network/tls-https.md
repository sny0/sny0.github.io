---
title: TLS・証明書・HTTPS — 暗号化と相手の確認
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: TLS 1.3の鍵共有、証明書と秘密鍵の確認、AEADによる通信保護を分けて説明する。証明書チェーンと期待する名前、SNI・ALPN・HTTP Hostの違い、HTTPSの保護範囲とAPI観察の限界を整理する。
  aliases: [TLS, TLS 1.3, HTTPS, certificate, 証明書, PKI, CA, SAN, EKU, trust anchor, トラストアンカー, certificate chain, 証明書チェーン, hostname verification, SNI, ALPN, ECDHE, AEAD, ClientHello, CertificateVerify, Finished, ECH, session resumption, 0-RTT, WinHTTP, HttpClient]
  verification: 一次資料照合（2026-11-04）
---

# TLS・証明書・HTTPS — 暗号化と相手の確認

**TLS**は、通信する両端の間に、内容を盗聴から守り、改ざんを検出し、相手を確認するための通信路を作る仕組みです。**HTTPS**では、その保護された通信路でHTTPをやり取りします。暗号化されたことと、意図した相手につながったことは、両方を確認する必要があります。

名前から候補を得る[DNS](/network/dns-resolution.html)、[TCPの接続とバイト列](/network/tcp-sockets.html)、[HTTPの要求・応答](/network/http-messages.html)とは別の役割です。例えば名前解決に成功し、TCPがつながっても、証明書の検証に失敗すれば、その相手とのHTTPS通信を受け入れられるとは限りません。

ここではTLS 1.3の、サーバー証明書で認証する通常の完全ハンドシェイクを主に説明します。TLS 1.3の現行仕様はRFC 9846（2026年7月）で、以前のRFC 8446を置き換えています。TLS 1.2の通信順序まで同じものとして扱いません。[IETF RFC 9846 §1 / §2](https://www.rfc-editor.org/info/rfc9846/)

## 鍵を共有すること、相手を確認すること、本文を暗号化すること

TLSの開始時に行う条件の合意や相手の確認を**ハンドシェイク**と呼びます。このページの例では、次の役割を分けます。

| 仕組み | 役割 |
| --- | --- |
| ECDHEによる鍵共有 | 双方の一時的な鍵の情報から、共有する秘密の材料を得る |
| 証明書チェーンの検証 | 公開鍵と名前などの対応を、信頼の起点までたどって確認する |
| CertificateVerify | 今のハンドシェイクに対する署名から、対応する秘密鍵を相手が持つことを確認する |
| AEADによるレコード保護 | 導出した共通鍵で通信内容を暗号化し、改ざんも検出する |

**ECDHE**は、楕円曲線を使う一時的なDiffie–Hellman鍵共有です。交換する公開情報と、自分だけが持つ秘密の材料を使い、共通の秘密を計算します。証明書の秘密鍵や、本文の暗号鍵をそのままネットワークへ送る方式ではありません。鍵共有だけでは相手の名前は確認できないため、認証も必要です。

**AEAD**は、暗号化と認証を組み合わせ、暗号文の改ざんを検出する方式です。TLS 1.3の大量のアプリデータは、導出した方向別の鍵などを使って保護します。**証明書の公開鍵で、すべてのHTTP本文を直接暗号化するモデルではありません。** TLS 1.3の暗号スイートは、レコード保護の方式と鍵導出用ハッシュを表し、証明書の署名方式や鍵共有のグループとは別に合意します。[RFC 9846 §4.2.1 / §5 / §7](https://www.rfc-editor.org/rfc/rfc9846.txt)

## TLS 1.3の開始からHTTP要求まで

次はECDHEを使い、クライアント証明書を要求しない例です。再開用の事前共有鍵（PSK）、0-RTT、鍵共有条件を選び直すHelloRetryRequestは含めません。

1. **ClientHello**で、対応バージョン、暗号方式、鍵共有用の`key_share`などを提示する。接続先の名前を伝えるSNIや、アプリのプロトコル候補を伝えるALPNも関わる。
2. **ServerHello**で、選んだバージョンや暗号スイート、サーバー側の鍵共有情報を返す。双方が共有秘密と、それまでのやり取りからハンドシェイク用の鍵を導出する。
3. サーバーが暗号化した**EncryptedExtensions**で追加条件を返し、**Certificate**で証明書を提示する。**CertificateVerify**の署名と**Finished**が続く。
4. クライアントが証明書、署名、Finishedなどを検証し、自分の**Finished**を返す。この例では、その後にHTTP要求をアプリデータとして送る。

TLS 1.3では、ServerHelloの後の上記ハンドシェイク内容は暗号化されます。サーバー証明書も「ネットワーク上で常に平文のまま渡る」とは限りません。[RFC 9846 §2](https://www.rfc-editor.org/info/rfc9846/)

`CertificateVerify`は、ハンドシェイクの記録に結び付いた署名で、証明書に対応する秘密鍵の所持を確認します。証明書ファイルを誰かがコピーしただけで、同じ署名を作れるわけではありません。`Finished`は、計算した鍵とやり取りの整合性を確認するMACです。MACは、秘密の鍵を使って生成・検証する認証値です。[RFC 9846 §4.5.2 / §4.5.3](https://www.rfc-editor.org/rfc/rfc9846.txt)

<figure class="study-figure">
  <img src="/images/network/tls-handshake.svg" alt="TLS 1.3の証明書認証とECDHEを使う完全ハンドシェイクの例。ClientHello、ServerHello、暗号化されたサーバーの条件と証明書・署名・Finished、クライアントFinished、その後のHTTP要求を示す。PSK、0-RTT、HelloRetryRequest、クライアント証明書は省略する。" width="760" height="1510" />
  <figcaption><strong>鍵共有、秘密鍵の所持確認、共通鍵での本文保護を分ける。</strong> クライアントがHTTP要求を送る例です。メッセージ一つとパケット一つの対応や、実測した時間軸を示しません。<a href="/study/images/network/tls-handshake.svg" target="_blank" rel="noopener noreferrer">TLSの開始手順を拡大</a></figcaption>
</figure>

この順序は、すべての方向のアプリデータが必ずclient Finished後に始まるという意味ではありません。TLS 1.3では、サーバーが自分のFinishedを送った後、client Finishedを受け取る前にアプリデータを送れる場合もあります。また、クライアント証明書を使わないこの例では、サーバーはTLSだけで利用者のアカウントまで認証するわけではありません。[RFC 9846 §4.5.3](https://www.rfc-editor.org/rfc/rfc9846.txt)

## 証明書には何が入っているか

ここで扱う公開鍵証明書は、公開鍵と対象に関する情報を、発行者の署名で結び付けたものです。**CA**は、証明書を発行する認証局です。

| 項目 | 確認するもの |
| --- | --- |
| 公開鍵 | ハンドシェイクの署名検証などで使う鍵。秘密鍵そのものは含まない |
| SAN | Subject Alternative Name。DNS名やIPアドレスなど、相手の識別に使う情報 |
| 発行者 | 誰が発行したか。表示名を見るだけでなく署名とチェーンを検証する |
| 有効期間 | `notBefore`から`notAfter`まで。検証時刻も関わる |
| Key Usage / EKU | 鍵の使用目的。EKUは拡張鍵用途で、TLSサーバー認証などの条件を示す |
| 発行者の署名 | その証明書の情報を、発行者の鍵で検証するための署名 |

証明書上の発行者の署名と、現在の接続でサーバーが作るCertificateVerifyの署名は別です。前者は証明書の情報、後者は今のハンドシェイクに結び付く所持証明を扱います。[RFC 5280 §4](https://www.rfc-editor.org/rfc/rfc5280.html#section-4)、[RFC 9846 §4.5.2](https://www.rfc-editor.org/rfc/rfc9846.txt)

## チェーンが信頼できることと、名前が一致すること

相手の証明書から、中間CAなどを経て、クライアントが信頼する**トラストアンカー**まで検証経路を作ります。トラストアンカーは、信頼の起点となる名前や公開鍵などの情報です。通常のWeb環境ではOSやアプリの信頼設定が関わります。

**root証明書が自己署名だから、それだけで信頼できるわけではありません。** 誰でも自分の鍵で自己署名できます。どの起点を信頼するかは、検証の入力になるポリシーです。相手から送られてきたrootを、受け取ったという理由だけで起点へ追加しません。[RFC 5280 §6.1 / §6.2](https://www.rfc-editor.org/rfc/rfc5280.html#section-6)

署名のつながりだけでなく、有効期間、CAとしての制約、用途、使用可能な方式なども確認します。失効確認の方法や失敗時の扱いには、実装・設定の条件が関わります。「チェーンを表示できた」と「対象用途の検証が通った」も区別します。

さらに、クライアントが**期待している相手の名前**と、証明書のSANなどが一致する必要があります。`https://example.com/`へ接続するなら、証明書を見てから都合のよい名前を選ぶのでなく、元の対象名と照合します。信頼されたCAの有効な証明書でも、別の名前用ならその接続の相手確認には足りません。[RFC 9525 §6: Verifying Service Identity](https://www.rfc-editor.org/rfc/rfc9525.html#section-6)

現行のサービス識別の規則では、SubjectのCommon Nameを名前検証の代用にしません。DNS名はSANのDNS識別子、IPを直接対象にする場合はSANのIP識別子など、適切な型と規則で照合します。DNSで得たIPと、元のURLの名前は同じ識別子ではありません。[RFC 9525 §4 / §6.4](https://www.rfc-editor.org/rfc/rfc9525.html#section-6.4)

<figure class="study-figure">
  <img src="/images/network/tls-certificate-validation.svg" alt="期待するexample.comという名前、提示されたサーバー証明書のSANや有効期間・用途、CAへの署名チェーン、設定済みトラストアンカーを別々に確認する概念図。SNIやHTTP Hostは証明書検証そのものではなく、事業者やアプリの安全性も別に判断する。" width="760" height="1510" />
  <figcaption><strong>信頼する起点までの検証と、期待する名前の照合を両方行う。</strong> <code>Issuer</code>や<code>Subject</code>の表示だけで、すべての検証条件を確認したとは判断しません。<a href="/study/images/network/tls-certificate-validation.svg" target="_blank" rel="noopener noreferrer">証明書と相手確認を拡大</a></figcaption>
</figure>

## SNI・ALPN・HTTP Hostは何が違うか

**SNI**（Server Name Indication）は、TLSの開始時に、接続したいサーバー名を伝える拡張です。一つのIPで複数の名前を扱うサーバーが、証明書などを選ぶ手掛かりになります。名前を伝えたこと自体が、その相手を正しく検証した証拠にはなりません。[RFC 6066 §3](https://www.rfc-editor.org/rfc/rfc6066.html#section-3)

**ALPN**は、この通信で使うアプリ層プロトコルを合意する拡張です。クライアントが候補を提示し、サーバーが選びます。HTTPなら`http/1.1`や`h2`などが関わります。TLS 1.3のサーバー側の選択結果はEncryptedExtensionsに入り、ServerHelloの平文の選択結果として一律に説明しません。[RFC 7301](https://www.rfc-editor.org/rfc/rfc7301.html)、[RFC 9846 §4.3 / §4.4.1](https://www.rfc-editor.org/rfc/rfc9846.txt)

HTTP/1.1の`Host`は、その上で送るHTTP要求の対象情報です。**SNI、期待する名前の検証、HTTP Hostは、それぞれ目的が異なります。** URLの名前をIPへ置き換えると、期待する証明書の識別子やSNI、HTTP側の対象が変わり、同じ動作になるとは限りません。

## HTTPSが保護する範囲

TLSの両端間では、アプリデータとして送るHTTPのパス、ヘッダー、本文などを暗号化して保護します。ただし、TLSがすべての観測情報を隠すわけではありません。

- IPアドレスやport、通信量や時刻などの情報は、通信の観測から分かる場合がある。
- DNSの問い合わせは別の通信であり、HTTPSだけで自動的に暗号化されない。
- ECHを使わないClientHelloでは、SNIなどが平文に含まれ得る。
- TLSを終端するクライアントやサーバーは内容を復号する。メモリ、ログ、そこから先の通信には別の保護条件がある。

**ECH**（Encrypted Client Hello）は、ClientHelloの機密な内容を暗号化する拡張です。SNIは常に平文とも、TLS 1.3なら無条件で隠れるとも断定しません。ECHの利用条件、DNSやIPなど別の情報経路も考慮します。[RFC 9849 §1](https://www.rfc-editor.org/rfc/rfc9849.html#section-1)

証明書と通信路の検証に成功しても、事業者の信用、アプリの不具合、購入や保存の完了は別の判断です。

## レコード、再開、バージョン

TLSの**レコード**は、暗号化などを施して運ぶ単位です。TCPのセグメントや`recv`一回、HTTPの一件と境界が一致する保証はありません。複数の層の長さと状態を、それぞれのAPI・規約に従って扱います。

**セッション再開**では、以前の接続から得た情報を使い、以後の確立を効率化できます。毎回同じ証明書メッセージ列が流れるとは限りません。**0-RTT**は一部のデータを早く送れる方式ですが、リプレイ、つまり同じ要求の再提示を考慮する必要があります。暗号化されていても、一度だけ実行される保証にはなりません。[RFC 9846 §2.2 / §2.3 / §8](https://www.rfc-editor.org/info/rfc9846/)

TLS 1.0と1.1は現在の仕様で使用しないものとされます。OSや実行基盤を更新し、対応する安全な設定を使います。「OS既定」を全OS・全バージョンで同じ固定値とは考えず、対象環境と合意された版を記録します。[RFC 8996 §4 / §5](https://www.rfc-editor.org/rfc/rfc8996.html#section-4)

HTTP/3では、TLSのハンドシェイクと暗号技術をQUICへ組み込んで使います。HTTPS全般を常に「HTTP→TLSレコード→TCP」という積み方だけで説明しません。[RFC 9001 §1](https://www.rfc-editor.org/rfc/rfc9001.html#section-1)

## 実践記事で観察する範囲

[C++とC#でHTTPSを観察する](/practice/network/https-observation.html)は、`--live`指定時だけ`https://example.com/`へGETします。指定なしの案内表示は未通信で、検証成功には数えません。Windowsの同期WinHTTPと.NET 10のHttpClientを使い、HTTP/1.1を指定します。TLSの版はOS側の既定で合意させ、TLS 1.3を固定の期待値にしません。

通常の証明書チェーン・名前の検証を保ち、検証を迂回する設定や信頼ストアの変更は行いません。C#の`SocketsHttpHandler.PlaintextStreamFilter`は、認証後のストリームから情報を読み、証明書の合否を置き換えるcallbackとは区別します。[Microsoft: PlaintextStreamFilter](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.socketshttphandler.plaintextstreamfilter?view=net-10.0)

TLSの版・暗号スイート・サーバー証明書のSHA-256と、HTTPステータス・本文byte数を別に観察します。証明書のハッシュ値は識別用で、それ自体が信頼の根拠ではありません。一部のTLS接続情報は、取得に対応しない場合に`unavailable`と表示します。証明書取得など他のAPI失敗は、処理の失敗として報告します。HTTPの版をTLSの版の代用にもせず、例えば`HttpResponseMessage.Version`はHTTPの版です。[Microsoft: HttpResponseMessage.Version](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpresponsemessage.version?view=net-10.0)

失効確認は追加で有効化せず既定を使い、C#側は`revocation_policy`へ実際の設定値を表示します。2026-11-11に確認した.NET 10.0.14の`SocketsHttpHandler`では`NoCheck`でした。WinHTTP側はOSの既定です。API資料の既定値と、使用するランタイム・設定も確認してください。すべての証明書について最新の失効情報を確認した、という実験ではありません。[Microsoft: CertificateRevocationCheckMode](https://learn.microsoft.com/en-us/dotnet/api/system.net.security.sslclientauthenticationoptions.certificaterevocationcheckmode?view=net-10.0)

リダイレクト・HTTPの自動認証・cookieは無効で、本文は64 KiBまでです。WinHTTPは各段階8秒以内の待機設定と30秒の経過時間予算、C#は要求と本文読取りに共通の30秒の取消しを使います。実時間の厳密な上限ではありません。正の数を要求した本文readの正常な結果が0なら、ここでは本文の終了であり、TLSの`close_notify`やTCPのEOFの直接観測ではありません。[Microsoft: WinHttpReadData](https://learn.microsoft.com/en-us/windows/win32/api/winhttp/nf-winhttp-winhttpreaddata)

ハンドシェイク全体、ECDHE内部、実パケット境界は追跡しません。不正証明書、名前の不一致、期限切れ、取消しなどの注入や、他OS・Unityも未検証です。実行結果の細部は実践記事を参照してください。

HTTPSで受け取ったHTMLが表示になる過程は、[ブラウザの描画](/browser/rendering-journey.html)へ進みます。通信の完了と、画面にページが見える時点を分けて追います。
