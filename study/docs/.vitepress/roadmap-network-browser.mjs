export default {
  nodes: [
    {
      id: 'net-ip',
      title: 'IPアドレスとポート',
      summary: 'URLと接続情報を読み、宛先と通信の受け口を見分けます。',
      prerequisites: [],
      checks: [
        { id: 'url-parts', label: 'https://example.com:8443/status?room=7 を、スキーム、ホスト名、ポート、パス、クエリーに分けられる。' },
        { id: 'endpoints', label: '記事の接続図か自分のPCの接続一覧で、ローカル側と相手側のIPアドレス・ポートを指せる。' },
        { id: 'port-and-protocol', label: '同じIPアドレスのTCP 443とUDP 443を見て、受け口を区別するためにどの情報が必要か説明できる。' },
      ],
      resources: [
        { label: 'ネットワークの基本', url: '/network/network-basics.html' },
        { label: 'IPアドレス・ポート・ホスト名', url: '/network/ip-addresses-and-ports.html' },
      ],
    },
    {
      id: 'net-dns',
      title: 'DNSと名前解決',
      summary: 'ホスト名から接続先の候補を得る過程を、問い合わせとキャッシュに分けて追います。',
      prerequisites: ['net-ip'],
      checks: [
        { id: 'records', label: 'A・AAAA・CNAMEの応答例で、IPv4アドレス、IPv6アドレス、別の名前を指せる。' },
        { id: 'resolver', label: '必要な応答がキャッシュにない例で、アプリ、再帰リゾルバー、権威DNSの役割を図に描ける。' },
        { id: 'observe-addresses', label: '名前解決サンプルを実行するか掲載ログを読み、localhostの結果からループバックアドレスを見つけ、APIの結果からどこまで分かるか説明できる。' },
      ],
      resources: [
        { label: 'DNSと名前解決', url: '/network/dns-resolution.html' },
        { label: '実践 C++とC#でOSの名前解決結果を観察する', url: '/practice/network/name-resolution-observation.html' },
      ],
    },
    {
      id: 'net-tcp',
      title: 'TCPとソケット',
      summary: '順序のあるバイト列から、アプリがメッセージを復元する手順を追います。',
      prerequisites: ['net-ip'],
      checks: [
        { id: 'stream-boundary', label: '2回に分けて送ったデータを読み取る例で、recvの戻り値を使い、必要なバイト数まで読み続ける手順を説明できる。' },
        { id: 'length-prefix', label: '実践の14バイトの列を2バイトの長さと本文に分け、2件のフレームを復元できる。' },
        { id: 'half-close', label: 'サンプルを実行するか掲載ログを読み、送信を半閉鎖した方向のEOFと、反対向きに届くアプリの返答を指せる。' },
      ],
      resources: [
        { label: 'TCPの送受信バッファとメッセージ境界', url: '/network/tcp-sockets.html' },
        { label: '実践 TCPのフレーム復元と半閉鎖', url: '/practice/network/tcp-loopback-observation.html' },
      ],
    },
    {
      id: 'net-udp',
      title: 'UDPデータグラム',
      summary: 'データグラムの境界を保って送受信し、受信バッファの大きさが結果に与える影響を調べます。',
      prerequisites: ['net-ip'],
      checks: [
        { id: 'datagram-boundary', label: '実践でABCとxyを別々に送ったとき、各受信で読めるバイト数を予想できる。' },
        { id: 'short-buffer', label: 'Winsockのサンプルを実行するか掲載結果を読み、短い受信バッファで返るエラーと次に届くデータを指せる。' },
        { id: 'empty-datagram', label: '同じサンプルの0バイトのデータグラムの受信結果から、その後も同じソケットで受信できることを確認できる。' },
      ],
      resources: [
        { label: 'UDPデータグラムの境界と送受信', url: '/network/udp-datagrams.html' },
        { label: '実践 C++とWinsockでUDPの受信境界を確かめる', url: '/practice/network/udp-loopback-observation.html' },
      ],
    },
    {
      id: 'net-http',
      title: 'HTTPの要求と応答',
      summary: '何を要求し、どんな結果が返ったかを、メソッド、状態コード、フィールド、本文から読み取ります。',
      prerequisites: ['net-ip'],
      checks: [
        { id: 'message-parts', label: '記事のHTTP/1.1の例で、要求のメソッドとパス、応答の状態コード、ヘッダーと本文の区切りを指せる。' },
        { id: 'content-length', label: '実践の応答本文をUTF-8のバイト列として読み、Content-Lengthが9になる理由を説明できる。' },
        { id: 'body-and-eof', label: 'サンプルを実行するか掲載ログを読み、本文を読み終えた時点と接続のEOFを確認した時点を指せる。' },
      ],
      resources: [
        { label: 'HTTP通信とメッセージの構成', url: '/network/http-messages.html' },
        { label: '実践 HTTPのヘッダー・本文・終端を観察する', url: '/practice/network/http-message-observation.html' },
      ],
    },
    {
      id: 'net-tls',
      title: 'TLS・証明書・HTTPS',
      summary: 'HTTPSで通信相手を確かめ、要求と応答を暗号化して運ぶ仕組みを学びます。',
      prerequisites: ['net-http'],
      checks: [
        { id: 'handshake-roles', label: 'TLS 1.3の図で、通信に使う鍵の合意、サーバーの認証、HTTPのデータ保護の役割を分けられる。' },
        { id: 'certificate-checks', label: '証明書チェーンが信頼できる例でも、期待するホスト名との一致を確かめる理由を説明できる。' },
        { id: 'observe-https', label: 'HTTPS実践の結果から、TLSのバージョンとHTTPの状態コードを見つけ、それぞれどの層の情報か説明できる。' },
      ],
      resources: [
        { label: 'TLS・証明書・HTTPS', url: '/network/tls-https.html' },
        { label: '実践 C++とC#でHTTPSの応答とTLS情報を観察する', url: '/practice/network/https-observation.html' },
      ],
    },
    {
      id: 'net-quic',
      title: 'QUICとHTTP/3',
      summary: 'UDP上のQUICが、TLS 1.3と複数のストリームを組み合わせてHTTP/3を運ぶ仕組みを学びます。',
      prerequisites: ['net-udp', 'net-tls'],
      checks: [
        { id: 'stack', label: 'IP、HTTP/3、UDP、QUICを、要求を表す上位の層から順に並べられる。' },
        { id: 'packet-and-offset', label: 'QUICの図で、届いたパケットの識別に使う番号と、ストリーム内のデータの位置を示すオフセットを指せる。' },
        { id: 'stream-loss', label: '比較図でA0を欠落させ、A1とB0のうちQUICが先に配送できるものを予想し、結果を説明できる。' },
      ],
      resources: [
        { label: 'QUICとHTTP/3', url: '/network/quic-and-http3.html' },
        { label: '実践 パケットが欠けたときの配送を比較する', url: '/practice/network/stream-loss-observation.html' },
      ],
    },
    {
      id: 'net-http-cache',
      title: 'HTTPキャッシュ',
      summary: '保存済みの応答をいつ使えるか判断し、再検証で本文を再利用する流れを追います。',
      prerequisites: ['net-http'],
      checks: [
        { id: 'cache-control', label: 'Cache-Controlのmax-age、no-cache、no-storeを見て、鮮度、再検証、保存可否への指示を分けられる。' },
        { id: 'validator', label: '最初の200応答にあるETagと、次の要求に付けるIf-None-Matchの関係を、実践の往復から説明できる。' },
        { id: 'reuse', label: '実践の304応答の受信本文と、クライアントが再利用した本文について、それぞれ何バイトかを記録から読み取れる。' },
      ],
      resources: [
        { label: 'HTTPキャッシュと条件付き要求', url: '/network/http-caching.html' },
        { label: '実践 ETag・304・保存した本文の再利用を観察する', url: '/practice/network/http-cache-observation.html' },
      ],
    },
    {
      id: 'net-rendering',
      title: 'ブラウザの描画',
      summary: 'HTMLとCSSから、DOM、スタイル、レイアウト、ペイント、合成へ進む過程を追います。',
      prerequisites: ['net-http'],
      checks: [
        { id: 'render-stages', label: 'HTMLとCSSを受け取ってから画面に表示するまでの主な段階を並べ、各段階で扱うデータを一つずつ挙げられる。' },
        { id: 'measure-box', label: '描画サンプルで幅の変更と横移動を別々に試し、offsetWidthとgetBoundingClientRectの幅・左端がそれぞれどう変わるか説明できる。' },
        { id: 'raf-observation', label: 'rAFを1回予約したとき、ログの時刻とコールバック引数がそれぞれ何を記録したか説明できる。' },
      ],
      resources: [
        { label: 'ブラウザの描画 — HTMLから画面のピクセルまで', url: '/browser/rendering-journey.html' },
        { label: '実践 HTML・CSS・JavaScriptで変更と計測を観察する', url: '/practice/browser/render-observation.html' },
      ],
    },
    {
      id: 'net-event-loop',
      title: 'イベントループと非同期処理',
      summary: '同期処理、task、microtask、描画更新の機会を分け、Promiseやawaitの実行順を追います。',
      prerequisites: ['net-rendering'],
      checks: [
        { id: 'promise-order', label: 'ケースAの同期処理、Promiseの実行関数、then、await後の処理を予想した順に並べ、実行ログと照合できる。' },
        { id: 'microtask-checkpoint', label: 'ケースBで途中から追加されたmicrotaskとタイマーのどちらが先に処理されるか説明できる。' },
        { id: 'timer-and-raf', label: 'ケースCで、予約した行の順序から予測できるログと、タイマーとrAFのように観察が必要な順序を分けられる。' },
      ],
      resources: [
        { label: 'イベントループ・Promise・async/await', url: '/browser/event-loop-promises.html' },
        { label: '実践 Promise・await・timer・rAFの順序を観察する', url: '/practice/browser/event-loop-observation.html' },
      ],
    },
    {
      id: 'net-worker',
      title: 'Web Workerとメッセージ',
      summary: 'ページと別の実行環境へ処理を渡し、メッセージでデータと結果をやり取りします。',
      prerequisites: ['net-event-loop'],
      checks: [
        { id: 'message-reply', label: '実践のログから、Workerのready、ページからの要求、同じ要求IDの返信を順に指せる。' },
        { id: 'copy-and-transfer', label: '同じ16バイトをコピーで送る場合と移譲する場合に、送信直後の元バッファのbyteLengthを予想し、実行結果と照合できる。' },
        { id: 'stop', label: '遅延応答の実践で、返信を待っている間にWorkerを止め、現在の要求がどう扱われるかログから説明できる。' },
      ],
      resources: [
        { label: 'Web Workerとメッセージ通信', url: '/browser/web-workers-messages.html' },
        { label: '実践 Web Workerでコピー・transfer・停止を観察する', url: '/practice/browser/worker-message-observation.html' },
      ],
    },
    {
      id: 'net-url-journey',
      title: 'URLを開いてからページが見えるまで',
      summary: '名前解決、HTTPS、応答の再利用、ブラウザの描画を、一つのページを開く流れにまとめます。',
      prerequisites: ['net-dns', 'net-tls', 'net-http-cache', 'net-rendering'],
      checks: [
        { id: 'fresh-navigation', label: '新規接続でHTTPSのページを取得する例を、URL入力から名前解決、接続と認証、HTTP、描画まで図に描ける。' },
        { id: 'cached-navigation', label: '再訪時に新鮮な応答を再利用できる場合と再検証が必要な場合を比べ、HTTP要求が発生する箇所を図に書ける。' },
        { id: 'observe-navigation', label: '200と304の応答をNetworkパネルか実践の掲載ログで比較し、転送した本文とクライアントが使った本文を区別できる。' },
      ],
      resources: [
        { label: '読み順 URLを開いてからページが見えるまで', url: '/guide/learning-paths.html#browser-navigation-path' },
        { label: 'ブラウザの描画とナビゲーションの流れ', url: '/browser/rendering-journey.html' },
        { label: '実践 条件付き要求と304の結果を読む', url: '/practice/network/http-cache-observation.html' },
      ],
    },
  ],
}
