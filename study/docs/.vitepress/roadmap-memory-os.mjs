export default {
  nodes: [
    {
      id: 'memory-cache',
      title: 'メモリ階層とキャッシュ',
      summary: 'レジスタ、キャッシュ、RAM、ストレージの役割を分け、データを読む順序と配置の影響を考えます。',
      prerequisites: ['cpu'],
      checks: [
        { id: 'memory-path', label: '保存済みのファイルをアプリが読んで値を計算する例で、SSD、RAM、CPUキャッシュ、レジスタがそれぞれ何を受け持つか説明できる。' },
        { id: 'cache-lines', label: '配列を連続で読む場合と、大きな間隔で飛ばしながら読む場合を図にし、読み込んだキャッシュライン内のデータをどれだけ使えるか比べられる。' },
        { id: 'layout-choice', label: '多数の敵の座標だけを更新する例と、敵1体の全属性を読む例で、AoSとSoAの配置がアクセスにどう影響するか説明できる。' },
      ],
      resources: [
        { label: 'RAM・キャッシュ・ストレージの違い', url: '/hardware/memory/ram-cache-and-storage.html' },
        { label: 'キャッシュ局所性とAoS・SoA', url: '/runtime/memory/cache-locality-aos-soa.html' },
      ],
    },
    {
      id: 'memory-lifetime',
      title: '記憶域とオブジェクトの寿命',
      summary: '変数名が使える範囲、データを置く領域、そこにあるオブジェクトの寿命を分けます。',
      prerequisites: ['c-bytes'],
      checks: [
        { id: 'storage-duration', label: 'C++記事のUpdateの例で、ローカル変数、関数内static、unique_ptrが所有するEnemyの記憶域期間をそれぞれ答えられる。' },
        { id: 'scope-and-lifetime', label: 'ブロック内のローカル変数のアドレスを外へ渡す例で、変数名が使える範囲と、参照先を使える期間を図に示せる。' },
        { id: 'ownership', label: 'unique_ptrを値で返す例で、呼び出し側がオブジェクトを所有し始める箇所と、最後の所有者が破棄される箇所を指せる。' },
      ],
      resources: [
        { label: '記憶域期間・スコープ・寿命', url: '/runtime/memory/storage-duration-and-lifetime.html' },
        { label: 'C++23/26のコンテナとビュー', url: '/languages/cpp/modern-containers-and-views.html' },
        { label: '所有権と借用', url: '/runtime/memory/ownership-and-borrowing.html' },
      ],
    },
    {
      id: 'os-basics',
      title: 'OSの役割',
      summary: 'アプリの要求がOSに渡り、カーネルやドライバーを経て機器へ届く流れを学びます。',
      prerequisites: ['cpu'],
      checks: [
        { id: 'application-and-os', label: 'ゲームが画像ファイルを読み込む例で、ゲームが決めることと、OSが受け持つことを一つずつ挙げられる。' },
        { id: 'privilege-boundary', label: 'ファイル読み取りの例を使い、ユーザーモードのアプリとカーネルの間で要求が渡る箇所を説明できる。' },
        { id: 'driver-role', label: 'SSDからデータを読む要求が実際に機器へ届く場合を例に、アプリ、OS、ドライバー、機器の担当を分けて図に描ける。' },
      ],
      resources: [
        { label: 'OSの役割とユーザーモード・カーネル', url: '/os/operating-system-basics.html' },
        { label: 'ファイル読み取り経路の図', url: '/os/file-read-journey.html' },
      ],
    },
    {
      id: 'memory-virtual',
      title: '仮想メモリとページ',
      summary: '仮想アドレスの変換とページフォルトを追い、Windowsの予約・コミット・常駐を区別します。',
      prerequisites: ['os-basics'],
      checks: [
        { id: 'address-translation', label: '仮想アドレスがページ番号とページ内の位置に分かれる図で、ページ表の変換がどちらに使われるか示せる。' },
        { id: 'tlb-and-page-fault', label: 'TLBに変換が見つからなくてもページ表から変換できる場合と、ページフォルトでOSの処理が必要な場合を区別できる。' },
        { id: 'reserve-commit-touch', label: 'Windowsの実践を実行するか掲載ログを読み、予約・コミット・初回書き込みの前後で、ページの状態とプロセスの常駐量がどう変わったか説明できる。' },
      ],
      resources: [
        { label: '仮想メモリとアドレス変換', url: '/os/virtual-memory.html' },
        { label: '実践 Windowsで予約・コミット・初回書き込みを観察する', url: '/practice/memory/windows-memory-observation.html' },
      ],
    },
    {
      id: 'memory-allocation',
      title: '確保すると内部で何が起きるか',
      summary: '言語の確保・初期化、アロケータの空き領域の再利用、OSによるページの管理を分けて追います。',
      prerequisites: ['memory-lifetime', 'memory-virtual'],
      checks: [
        { id: 'allocate-and-construct', label: 'mallocとC++の通常のnew式を例に、記憶域の取得とオブジェクトの初期化がそれぞれどこで起きるか説明できる。' },
        { id: 'reuse-or-request', label: 'アロケータの図で、既存の空きブロックから返す場合と、アロケータがOSへ領域を求める場合の経路を指せる。' },
        { id: 'release-and-measure', label: 'freeの直後にプロセスの常駐量が下がらなかった例で、アロケータへの返却とOSへの返却を区別し、リークを調べるためにどの割当て記録を見るか説明できる。' },
      ],
      resources: [
        { label: 'malloc・newから解放まで', url: '/runtime/memory/allocation-journey.html' },
        { label: 'アロケータ・プール・アリーナ', url: '/runtime/memory/allocators-and-pools.html' },
        { label: '実践 アロケータより下のOS側を観察する', url: '/practice/memory/windows-memory-observation.html' },
      ],
    },
    {
      id: 'os-process',
      title: 'プロセスとスレッド',
      summary: 'プロセスが持つアドレス空間と、同じプロセス内で仕事を進めるスレッドの関係を学びます。',
      prerequisites: ['memory-virtual'],
      checks: [
        { id: 'file-instance-thread', label: '同じ実行ファイルを2回起動する図で、各プロセスの初期スレッドと、片方に追加したワーカーを示し、プロセスとスレッドを数えられる。' },
        { id: 'shared-address-space', label: '同じプロセスの2つのスレッドが共有するデータと、各スレッドが持つスタックや命令の位置を、プロセスの図に書き込める。' },
        { id: 'pid-and-tid', label: 'Windowsの実践の実行結果か掲載ログを使い、親のスレッド、同じプロセスのワーカー、別の子プロセスをPIDとTIDで区別できる。' },
      ],
      resources: [
        { label: 'プロセス・スレッドとOSのスケジューリング', url: '/os/process-startup.html' },
        { label: '実践 WindowsでPID・TID・子プロセスを観察する', url: '/practice/process/windows-process-observation.html' },
      ],
    },
    {
      id: 'os-sync',
      title: 'スレッドの同期',
      summary: '同じデータを使うスレッド間で、排他する範囲と処理の完了を待つ場所を決めます。',
      prerequisites: ['os-process'],
      checks: [
        { id: 'check-and-update', label: '在庫が1個のときに2つのスレッドが消費を試みる例で、在庫の確認と減算を同じロックで守る理由を説明できる。' },
        { id: 'join-order', label: '在庫サンプルで、ワーカーの完了を待つ箇所と、親が結果を集計して共有物を片付けられる時点を指せる。' },
        { id: 'inventory-invariant', label: 'C++版かC#版の実行結果か掲載ログで、残数と消費数の合計が初期在庫17に、成功と失敗の合計が総試行40に一致するか確かめられる。' },
      ],
      resources: [
        { label: 'スレッドと同期 — mutex・lock・join', url: '/runtime/thread-synchronization.html' },
        { label: 'C++メモリモデル', url: '/languages/cpp/memory-model.html' },
        { label: 'ロックフリーの基礎', url: '/runtime/lock-free-basics.html' },
        { label: 'ジョブシステムとワークスティーリング', url: '/runtime/jobs-and-work-stealing.html' },
        { label: 'ハイブリッドCPUのスケジューリング', url: '/hardware/cpu/hybrid-cpu-scheduling.html' },
        { label: '実践 C++とC#で共有する在庫の整合性を守る', url: '/practice/threads/inventory-synchronization.html' },
      ],
    },
    {
      id: 'os-file-io',
      title: 'ファイルの読み取り',
      summary: '開いたファイルからバイトを読み、ファイル位置・戻り値・OSのファイルキャッシュを区別します。',
      prerequisites: ['os-basics'],
      checks: [
        { id: 'read-path', label: 'ファイルの読み取りを、アプリのバッファ、OSのファイルキャッシュ、ストレージへの要求に分け、キャッシュにデータがある場合の経路を示せる。' },
        { id: 'short-read-and-eof', label: '12バイトのファイルへ5バイトずつ要求する実践のログで、短い読み取りとEOFの行を見つけ、戻り値とファイル位置を説明できる。' },
        { id: 'seek-and-buffer', label: '同じログで先頭から5バイトの位置へseekして3バイトを読み直す操作を追い、再読した値と読み取り後の位置を答えられる。' },
      ],
      resources: [
        { label: 'ファイルを読むと内部で何が起きるか', url: '/os/file-read-journey.html' },
        { label: '実践 C++とC#で読み取り結果・位置・EOFを観察する', url: '/practice/io/file-read-observation.html' },
      ],
    },
    {
      id: 'os-async-file-io',
      title: '非同期ファイルI/O',
      summary: '読み取りの要求と完了を分け、バッファを利用・再利用できる時点を見分けます。',
      prerequisites: ['os-file-io', 'os-sync'],
      checks: [
        { id: 'submit-and-completion', label: 'C++版の掲載ログから、要求を受理した時点のpendingと完了時点で取得した実読取数を指せる。' },
        { id: 'buffer-lifetime', label: 'C++版かC#版のコードを読み、バッファを保持する区間と、読み取ったバイトを使い始める箇所を示せる。' },
        { id: 'same-bytes', label: '実践を実行するか掲載ログを読み、同期・非同期の読み取りが同じ12バイトを返したことを確認し、開始・完了の状態表示と読み取り結果を分けて説明できる。' },
      ],
      resources: [
        { label: '非同期I/Oの要求・完了・バッファの寿命', url: '/os/asynchronous-file-io.html' },
        { label: '実践 C++とC#で非同期読み取りを観察する', url: '/practice/io/async-file-read-observation.html' },
      ],
    },
    {
      id: 'os-process-startup',
      title: '実行ファイルからmainまで',
      summary: 'リンク済みのWindows EXEを起動し、ローダーとCランタイムの準備を経てユーザーコードに入る流れを追います。',
      prerequisites: ['os-process', 'compile-link'],
      checks: [
        { id: 'loader-work', label: '実行ファイルの起動図で、プロセスと初期スレッドを用意する段階、EXEと依存DLLの配置を進める段階を指せる。' },
        { id: 'entry-and-main', label: '通常のMSVCコンソールEXEを例に、PEヘッダーのエントリポイント、CRTのスタートアップ、ユーザーのmainまたはwmainの関係を説明できる。' },
        { id: 'observe-initialization', label: 'Windowsの実践を実行するか掲載ログを読み、サンプルの初期化の目印がwmainで最初に読む時点でどうなっているか確認できる。' },
      ],
      resources: [
        { label: '実行ファイルを起動してmainへ到達するまで', url: '/os/process-startup.html' },
        { label: 'WindowsのPEローダーとインポート', url: '/os/pe-loading-and-imports.html' },
        { label: '実践 Windowsで子プロセスとmain前の初期化を観察する', url: '/practice/process/windows-process-observation.html' },
      ],
    },
  ],
}
