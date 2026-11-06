---
title: ネットワークの遅延・帯域・待ち行列
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: RTTと片道遅延、帯域と実効速度を分けて考える。転送が回線を埋めたときのキュー待ちを計算し、ゲーム通信の遅延の分布と期限切れを測る。
  aliases: [RTT, one-way delay, latency, throughput, goodput, jitter, BDP, 帯域遅延積, バッファブロート, AQM, 輻輳制御]
  verification: IETFのIP性能指標・TCP・キュー管理とMicrosoftのping仕様に照合（2026-11-07）
---

# ネットワークの遅延・帯域・待ち行列

ダウンロードを始めたときだけ対戦の操作が遅れて見えるなら、ゲームの小さなパケットが、同じ回線を使う転送の後ろで待っている可能性があります。回線が1秒に運べる量と、操作への応答が返るまでの時間を別々に測ると、どの負荷で遅れが増えるかを調べられます。[IETFのキュー管理勧告](https://www.rfc-editor.org/rfc/rfc7567.html#section-1)

## 往復と片道では、時刻の取り方が変わる

**RTT（往復時間）**は、送信側で要求を送ってから、対応する返事を受けるまでの時間です。同じ機器の単調増加する時計で差を取れます。アプリで計測すると、ネットワークでの往復に加え、相手が返事を作る処理や、ソケットから返事を取り出すまでの待ちも入ります。行きと帰りで経路や混み方が変わるので、RTTを半分にするには両方向が同程度という仮定が要ります。[RFC 2681の往復遅延](https://www.rfc-editor.org/rfc/rfc2681.html#section-2.4) · [片道と往復の違い](https://www.rfc-editor.org/rfc/rfc2681.html#section-1.1)

**片道遅延**は、送信側で付けた時刻と受信側で付けた時刻から求めます。例えば受信側の時計が送信側より5 ms進んでいれば、時刻を引くだけでは測定値が5 ms大きくなります。時計のずれ、そのずれの変化、OSやアプリのどの位置で時刻を取ったかを測定条件に含めます。[RFC 7679の片道遅延](https://www.rfc-editor.org/rfc/rfc7679.html#section-3.4) · [時計の測定誤差](https://www.rfc-editor.org/rfc/rfc7679.html#section-3.7.1)

## 1個のパケットが届くまでにかかる時間

| 内訳 | どこで時間がかかるか |
| --- | --- |
| シリアライズ（送出） | リンクにビットを並べて出し切る時間。長さをビットに直し、リンクの毎秒ビット数で割る。 |
| 伝搬 | 電気信号、光、電波がリンクを伝わる時間。経路の長さと媒体の伝搬速度が効く。 |
| 待ち行列 | 同じ出力を使うデータが前にいて、送信の順番を待つ時間。負荷によって変わる。 |
| 処理 | 中継機器が次の転送先を調べたり、端点のOSやアプリがパケットを扱ったりする時間。 |

例えば、1,500バイト分のビットを10 Mb/sのリンクに出すには、リンク層の追加分を除くと `12,000 bit ÷ 10,000,000 bit/s = 0.0012 s`、つまり1.2 msかかります。回線を速くすればこの項目は短くなります。距離による伝搬や、別の地点で詰まっている待ち行列には、それぞれの条件が効きます。[RFC 7679の最小遅延と混雑の考え方](https://www.rfc-editor.org/rfc/rfc7679.html#section-2) · [RFC 7567の待ち行列](https://www.rfc-editor.org/rfc/rfc7567.html#section-1)

## 帯域、スループット、アプリで使えた量

**帯域**はここでは回線や経路が単位時間あたりに運べる量を指します。経路全体の上限には、途中で最も容量が小さい区間が効きます。**スループット**は実際に観測した転送量を時間で割った値で、共有回線の負荷や、どの層で数えるかでも変わります。**グッドプット**は、アプリが受け取って使えた本文の量で考えます。例えば1秒間に1 MBの本文を受け取れたなら8 Mb/sです。ヘッダーや再送で流れた分はリンクを使いますが、本文として二重に数えません。ここでは `1 MB = 1,000,000 byte` とします。[RFC 5136の経路容量](https://www.rfc-editor.org/rfc/rfc5136.html#section-2.3.3) · [RFC 6349のTCP転送と再送量](https://www.rfc-editor.org/rfc/rfc6349.html#section-4.2)

TCPでは、**フロー制御**の受信ウィンドウ `rwnd` が、受信側が追加で受け入れられる量を伝えます。**輻輳制御**の輻輳ウィンドウ `cwnd` は、送り手が経路の混み具合を考慮して管理します。送り手は両方の制約を受けるため、受信アプリの読み出しが遅いときと、途中の回線が混んでいるときでは確認する値が変わります。[RFC 9293のウィンドウ管理](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.8.6) · [RFC 5681のcwndとrwnd](https://www.rfc-editor.org/rfc/rfc5681.html#section-2) · [ソケットとTCP通信](/network/tcp-sockets.html)

## 帯域遅延積と、待ち行列が増やす時間

ボトルネックが10 Mb/s、混雑の少ないときのRTTが40 msだとします。**帯域遅延積（BDP）**は `10,000,000 bit/s × 0.040 s = 400,000 bit = 50,000 byte` です。理想化すると、応答を待つ間に約50 kB分を送り続けられる経路です。確認応答を待つデータ量がこれより小さいと、回線に空きがあっても次の送信まで待つ時間が生じます。[RFC 6349のBDPと最小受信ウィンドウ](https://www.rfc-editor.org/rfc/rfc6349.html#section-3.3.1)

同じ10 Mb/sの出口で、ゲームのパケットの前に250 kBがたまっているとします。FIFO（先着順）でそのデータを出し切るには、`2,000,000 bit ÷ 10,000,000 bit/s = 0.2 s`、つまり200 msかかります。この待ちだけが一方向に加わると、RTTは40 msから約240 msになります。過剰な待ち行列が負荷の間ずっと残り、遅延が大きくなる現象を**バッファブロート**と呼びます。AQM（能動的キュー管理）は、キューが膨らむ途中でパケットの廃棄やECNによるマークを使い、送信側へ混雑を伝える仕組みです。[RFC 7567のAQM](https://www.rfc-editor.org/rfc/rfc7567.html#section-2) · [RFC 6349の転送中の遅延測定](https://www.rfc-editor.org/rfc/rfc6349.html#section-4.3)

<figure class="study-figure">
  <img src="/images/network/latency-throughput-and-queues.svg" alt="10 Mb/sの回線の計算例。負荷がないときのRTTは40 ms。片方向の先着順キューで前に250 kBたまると200 ms待ち、ほかの条件が同じならRTTは約240 msになる。" width="760" height="404" loading="lazy">
  <figcaption>ボトルネックで前に並ぶデータ量から、ゲームのパケットに加わる待ち時間を求めた例です。<a href="/study/images/network/latency-throughput-and-queues.svg" target="_blank" rel="noopener noreferrer">待ち時間の図を拡大</a></figcaption>
</figure>

## ゲームの通信を、負荷なしと負荷ありで比べる

**ジッター**は遅延のばらつきを指す言葉で、用途によって計算方法が異なります。例えば、20 ms間隔で送った二つの更新が30 ms間隔で届いたなら、後の更新の片道遅延が前より10 ms長くなっています。**損失率**を測るときは、何秒待ったら未着と数えるかを先に決めます。ゲームで更新を適用する締め切りがそれより短ければ、受信できても適用に間に合わなかった件数を別に記録できます。[RFC 3393のパケット遅延変動](https://www.rfc-editor.org/rfc/rfc3393.html#section-2.4) · [RFC 7680の未着判定](https://www.rfc-editor.org/rfc/rfc7680.html#section-2.4) · [UDPデータグラム](/network/udp-datagrams.html)

1. 同じ接続先、パケットサイズ、送信間隔で応答を測ります。Windowsの `ping` ならICMPのエコー応答のRTTを取得できます。ゲームの応答を見るときは、シーケンス番号を付け、ゲームと同じ通信方式で要求と返事を照合します。[Microsoftのping仕様](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping)
2. 大きな転送がない状態で基準を取り、同じ測定を上りの転送中、下りの転送中にそれぞれ行います。測定条件、時間、試行数と同時転送量を記録します。どちらか一方で遅延が増えれば、次はその方向で共有する経路や、OS・アプリ側の待ちを確認します。[RFC 6349の基準RTTと負荷時の比較](https://www.rfc-editor.org/rfc/rfc6349.html#section-4.3)
3. 期限内に返事が来たサンプルのp50・p95・p99と、期限内に返らなかった割合を並べます。この集計のp95は、返事のあった値を小さい順に並べたとき、約95%がその値以下になる境目です。未応答が増えると、返事が来た分だけのp95が小さく見えることもあります。RFC 2681の指標のように未応答を無限大として扱う方法もあるため、集計方法を記録します。ゲーム側でフレームやサーバーティックまで待つ時間も、通信の往復と別に記録します。[RFC 2681のパーセンタイルと未応答の扱い](https://www.rfc-editor.org/rfc/rfc2681.html#section-4.1)

同じPCのUDP実践では、1回の受信で取り出せるデータグラムの範囲と受信バッファの挙動を確認できます。実際のLANやインターネット経路の遅延を調べるときは、別ホスト間で上の手順を使います。[UDPループバック実践](/practice/network/udp-loopback-observation.html)
