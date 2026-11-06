---
title: NATとポート変換
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: IPv4のNATで送信元IPとポートが変わり、変換表から応答の転送先を決める流れを追う。UDPの期限、CGNAT、STUN・ICE・TURNも扱う。
  aliases: [NAT, NAT44, NAPT, PAT, CGNAT, ポート変換, ポート転送, STUN, ICE, TURN, UDP hole punching, NAT rebinding]
  verification: IETFのNAT動作要件、CGN、STUN・ICE・TURNのRFCに照合（2026-11-07）
---

# NATとポート変換

自宅のPCがゲームサーバーへUDPを送ると、サーバーから見える送信元のIPアドレスやポートは、PCが使っている値と異なることがあります。途中の**NAT**（Network Address Translation）がパケットのアドレスを書き換えるためです。**Basic NAT**はIPアドレスを変換し、**NAPT**（Network Address Port Translation）はTCP・UDPのポートも変換できます。以下では、複数の端末が一つの外側IPv4アドレスを共有するNAPTを追います。[IETF RFC 3022 §2](https://www.rfc-editor.org/rfc/rfc3022.html#section-2) · [IPルーティングとEthernetフレーム](/network/ip-routing-and-ethernet.html)

## パケットが往復するときに書き換わる欄

端末Aが `192.0.2.10:55000` からサーバー `203.0.113.8:30000` にUDPで送る例です。NATは内側と外側のIPアドレス・ポートの対応を作り、外へ出るデータグラムの**送信元**を `198.51.100.20:62000` に書き換えます。サーバーは受信時に見えたこの送信元へ応答します。NATは戻ってきたデータグラムの**宛先**を対応から調べ、受信が許可されていれば `192.0.2.10:55000` に書き換えて転送します。例のIPアドレスはすべて文書用です。[IETF RFC 3022 §2.2](https://www.rfc-editor.org/rfc/rfc3022.html#section-2.2) · [RFC 4787 §5](https://www.rfc-editor.org/rfc/rfc4787.html#section-5) · [RFC 5737 §3](https://www.rfc-editor.org/rfc/rfc5737.html#section-3) · [UDPデータグラムの境界と送受信](/network/udp-datagrams.html)

<figure class="study-figure">
  <img src="/images/network/nat-and-port-mapping.svg" alt="端末Aからサーバーへの送信では、NATが送信元を192.0.2.10:55000から198.51.100.20:62000へ変換する。応答では、NATが宛先を198.51.100.20:62000から192.0.2.10:55000へ戻す。サーバーの203.0.113.8:30000は書き換わらない。" width="760" height="386" loading="lazy">
  <figcaption>左列がNATの内側、右列が外側です。往路と復路では、NATが書き換える欄が異なります。<a href="/study/images/network/nat-and-port-mapping.svg" target="_blank" rel="noopener noreferrer">NATの往復図を拡大</a></figcaption>
</figure>

端末Bも同じサーバーへUDPを送り始めたとします。端末Bが自分の端末で同じ `55000` を使っても、この例ではNATが外側で異なるポートを割り当てます。サーバーから `62000` に戻った応答はA、`62001` に戻った応答はBへ転送できます。表は変換の説明用に簡略化しており、実際の照合に相手先の情報を使う方式もあります。[IETF RFC 4787 §4.1–4.2](https://www.rfc-editor.org/rfc/rfc4787.html#section-4.1) · [RFC 7857 §3](https://www.rfc-editor.org/rfc/rfc7857.html#section-3)

| プロトコル | 内側のIPとポート | 外側のIPとポート |
| --- | --- | --- |
| UDP | `192.0.2.10:55000` | `198.51.100.20:62000` |
| UDP | `192.0.2.11:55000` | `198.51.100.20:62001` |

IPアドレスの書き換えに伴ってIPv4ヘッダーのチェックサムも調整します。UDPチェックサムを使っている場合は、ポートと、計算に含まれるIPアドレスが変わるため、UDP側も調整します。[IETF RFC 3022 §4.1](https://www.rfc-editor.org/rfc/rfc3022.html#section-4.1)

## マッピングとフィルタリング

**マッピング**は、内側の端末に対して外側のどのIPアドレスとポートを使うかを決めます。例えばAが同じソケットで別のサーバーへ送ったとき、既存の `198.51.100.20:62000` を再利用する方式を**相手先に依存しないマッピング**（Endpoint-Independent Mapping）と呼びます。RFC 4787はユニキャストUDPでこの方式を求めています。同じ文書では、外側の宛先IPやポートに応じてマッピングを変える方式も区別しています。[IETF RFC 4787 §4.1](https://www.rfc-editor.org/rfc/rfc4787.html#section-4.1)

**フィルタリング**は、どの送信元からの着信を内側へ通すかを決めます。例えばAが `203.0.113.8:30000` にだけ送信したあと、同じサーバーの別ポートから `198.51.100.20:62000` へパケットが届いたとします。相手先IPだけを見るフィルターはこのパケットを通し得ます。相手先のIPとポート両方を見るフィルターを通るには、Aが事前にその別ポートへも送信している必要があります。[IETF RFC 4787 §5](https://www.rfc-editor.org/rfc/rfc4787.html#section-5)

## UDPの変換表には期限がある

動的に作られたUDPの対応は、通信が途絶えると期限切れになります。RFC 4787では、一部の既知ポート向けの例外を除き、UDPのマッピングを少なくとも2分間保持するよう求め、既定値として5分以上を推奨しています。実際の期限は機器や設定、経路上の装置で変わります。同じソケットから後で送信しても、新しい外側ポートが割り当てられることがあります。この変化を **NAT rebinding** と呼びます。[IETF RFC 4787 §4.3](https://www.rfc-editor.org/rfc/rfc4787.html#section-4.3) · [RFC 9000 §9.3](https://www.rfc-editor.org/rfc/rfc9000.html#section-9.3) · [QUICとHTTP/3](/network/quic-and-http3.html)

RFC 4787は内側からの送信で期限を更新するよう求めています。外からの受信で更新するかは任意です。RFC 7857は、送信元を問わず着信を通す方式で受信時の更新が有効でも、別のセキュリティポリシーでセッションの作成を拒否した着信では期限を延ばさないよう勧めています。ゲームが待機中も経路を保つ必要があれば、既存の通信で期限が更新されるかを踏まえ、必要に応じて**キープアライブ**（維持用の小さな送信）を設けます。キープアライブ自体も失われ得るので、長時間の待機後は応答の有無を確認し、必要なら再接続します。[IETF RFC 4787 §4.3](https://www.rfc-editor.org/rfc/rfc4787.html#section-4.3) · [RFC 7857 §7](https://www.rfc-editor.org/rfc/rfc7857.html#section-7) · [RFC 8085 §3.5](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.5)

## 自宅で待ち受けるときとCGNAT

**ポート転送**では、例えばルーター外側のUDP `30000` を、内側のゲームサーバーのUDP `30000` に転送するようあらかじめ設定します。相手が送った最初のパケットから届けるには、外側の宛先がそのルーターまで到達し、経路上と端末のフィルターで受信が許可され、サーバーがそのポートで待ち受けている必要があります。[IETF RFC 3022 §2.2](https://www.rfc-editor.org/rfc/rfc3022.html#section-2.2) · [RFC 6887 §11](https://www.rfc-editor.org/rfc/rfc6887.html#section-11)

**CGNAT**（Carrier-Grade NAT）は、通信事業者が複数の契約者で外側IPv4アドレスを共有するためのNATです。自宅にもNATがあると変換が二段になります。自宅ルーターだけでポート転送を設定しても、事業者側のNATに着信を通すための対応がなければ、外部からは届きません。CGNで使う共有アドレス空間として `100.64.0.0/10` が予約されています。IPv6でグローバルアドレスを割り当てられていても、着信を通すかはファイアウォールの規則で決まります。[IETF RFC 6888 §1–2](https://www.rfc-editor.org/rfc/rfc6888.html#section-1) · [RFC 6598 §1](https://www.rfc-editor.org/rfc/rfc6598.html#section-1) · [RFC 6092 §3](https://www.rfc-editor.org/rfc/rfc6092.html#section-3)

## プレイヤー同士で直接通信したいとき

専用ゲームサーバーへ各プレイヤーが接続する方式では、各端末から外向きに通信を始められます。端末同士で直接通信する方式では、互いの候補アドレスとポートを交換して、実際に双方向で届く経路を調べます。双方から候補へUDPを送ると、それぞれのNATに対応が作られ、フィルターを通せる場合があります。この方法を **UDPホールパンチング**と呼びます。[IETF RFC 5128 §3.3](https://www.rfc-editor.org/rfc/rfc5128.html#section-3.3) · [RFC 8445 §2](https://www.rfc-editor.org/rfc/rfc8445.html#section-2)

| 仕組み | 担当すること |
| --- | --- |
| **STUN** | サーバーへのBinding要求で、サーバーから見えた送信元IPとポートを知る。ICEの接続性チェックにも使う。[RFC 8489 §2](https://www.rfc-editor.org/rfc/rfc8489.html#section-2) |
| **ICE** | 別の通信経路で候補を交換し、候補の組み合わせをチェックして、データに使う組を選ぶ。ローカルアドレス、STUNで分かったアドレス、TURNの中継アドレスなどを候補にできる。[RFC 8445 §2](https://www.rfc-editor.org/rfc/rfc8445.html#section-2) |
| **TURN** | 中継サーバーにアドレスとポートを確保し、そのサーバーを介して相手とデータをやり取りする。[RFC 8656 §3](https://www.rfc-editor.org/rfc/rfc8656.html#section-3) |

STUNで観測した外側ポートが別の相手への送信でも使われるかは、マッピングの方式によります。また、送信が届いても、逆向きのフィルターで止まることがあります。そこでICEは、候補の組み合わせごとに実際のパケットで接続性を確認します。直接通る候補がなく、中継候補で通信できた場合は、その中継を使えます。中継を使うと経路が変わるため、ゲームの計測では直接通信と中継通信を区別して、RTTや揺れを比較します。[IETF RFC 4787 §4.1・§5](https://www.rfc-editor.org/rfc/rfc4787.html#section-4.1) · [RFC 8445 §2.2–2.3](https://www.rfc-editor.org/rfc/rfc8445.html#section-2.2) · [遅延・スループットと待ち行列](/network/latency-throughput-and-queues.html)
