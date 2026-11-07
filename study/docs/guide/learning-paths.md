---
{
  "title": "疑問から選ぶ読み順",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "learning",
    "format": "path",
    "domain": "guide",
    "collection": "questions",
    "order": 0,
    "summary": "コンピュータの部品と通信の基礎から、整数・文字コード、メモリ確保、起動、同期、ファイルI/O、アセットロード、DNS・TCP・HTTP・TLS、入力と描画、Webの疑問から本文をたどる。"
  }
}
---

<div id="読み進め方" class="study-legacy-anchor" aria-hidden="true"></div>

# 疑問から選ぶ読み順

辞典を最初から順番に読む必要はありません。いまの疑問に関係する本文から選びます。

## 部品や通信の名前から確認したい

- [コンピュータの部品から読む](/guide/hardware-basics.html)で、CPU・RAM・SSDの役割から、命令の実行とメモリの使い分けへ進む。
- [ネットワークの基本から読む](/guide/network-basics.html)で、パケットとプロトコル、IPとポート、家庭内の機器を調べる。
- [プログラムを書く・動かす基礎](/guide/software-development-basics.html)で、OSとファイル、変数と関数、コンパイルと開発ツールの関係を追う。

## 整数はメモリにどう並ぶか

1. [整数をビット列・16進数・バイト列で読む](/data/integer-bits-and-bytes.html)で、値、表記、符号の解釈、バイト順を分ける。
2. [C++の整数・バイト列観察サンプル](/practice/data/integer-byte-observation.html)で、型の幅と実メモリ、明示的なLE/BE形式を比較する。
3. [メモリレイアウトとアラインメント](/runtime/cpp-internals/memory-layout.html)で、オブジェクトを置く場所やパディングとの違いを調べる。

## floatで小さな差が消えるのはなぜか

1. [floatが表せる値と丸め](/data/floating-point-spacing.html)で、binary32の有効精度、表現できる値の間隔、丸めを調べる。
2. [C++のfloat観察サンプル](/practice/data/float-spacing-observation.html)で、ビット表現、隣接値、2の冪の境界、epsilonの意味を確かめる。
3. [座標変換](/math/rendering/transform.html)と[カメラ・深度](/math/rendering/camera.html)で、描画で数値の尺度を扱う場面へつなぐ。

## floatを等しいと判定するには

1. [浮動小数点の比較と許容差](/math/floating-point-comparison.html)で、厳密な等値と近似一致、単位を持つ絶対許容差と無次元の相対許容差を分ける。
2. [C++・C#の比較サンプル](/practice/math/float-comparison-observation.html)で、境界・NaN・Inf・非推移性・保存時に失われた座標差を確かめる。
3. 表現できる値の間隔から調べたい場合は[floatの刻み幅](/data/floating-point-spacing.html)へ戻る。

## 文字はどのようにバイト列になるか

1. [Unicodeと文字コード](/data/unicode-and-encoding.html)で、コードポイント、UTF-8／UTF-16のコード単位、バイト列を分ける。
2. [C++・C#の文字列観察サンプル](/practice/data/unicode-observation.html)で、日本語・絵文字・結合文字の表現と、長さの数え方を比べる。
3. [整数とバイト列](/data/integer-bits-and-bytes.html)のエンディアンと結び付け、ファイルやAPIの文字コードを確認する。

## 「確保する」と内部で何が起きるか

1. [記憶域期間・スコープ・寿命](/runtime/memory/storage-duration-and-lifetime.html)を区別する。
2. [malloc/newの内部](/runtime/memory/allocation-journey.html)で、空き領域の再利用、必要時のOS要求、構築・破棄を追う。
3. [仮想メモリ](/os/virtual-memory.html)で、アドレス空間、ページ、予約・コミット・常駐、ページフォルトを区別する。
4. [Windows/C++の観察サンプル](/practice/memory/windows-memory-observation.html)で、予約・コミット・初回書込み・解放を実際に分けて確かめる。
5. [用途別アロケータ](/runtime/memory/allocators-and-pools.html)、[メモリバグ](/runtime/memory/memory-bugs.html)、[キャッシュ局所性](/runtime/memory/cache-locality-aos-soa.html)へ進む。

## ソースコードがCPUで動くまで

1. [ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html)でコンパイルとリンクをたどる。
2. [翻訳単位・ヘッダー](/runtime/cpp-internals/translation-units-and-headers.html)、[シンボル・ABI](/runtime/cpp-internals/symbols-and-linkage.html)、[実行ファイル・ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)を調べる。
3. [実行ファイルを起動してmainへ到達するまで](/os/process-startup.html)で、プロセス・スレッド、ローダー、CRTの役割を分ける。
4. [Windows/C++のプロセス観察](/practice/process/windows-process-observation.html)で、main前の記録、親子プロセス、ワーカースレッドのPID・TIDを確かめる。
5. [関数呼び出し・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)へ進む。

## スレッド間でデータを安全に共有するには

1. [スレッドと同期](/runtime/thread-synchronization.html)で、共有状態と不変条件、同じロックで守る範囲、データを受け渡す順序を調べる。
2. [C++・C#の在庫消費サンプル](/practice/threads/inventory-synchronization.html)で、確認と消費、Snapshot、終了待ちと寿命を確かめる。
3. [並行処理のバグ](/runtime/memory/concurrency-bugs.html)で、データ競合・競合状態・false sharingの違いを調べる。

## ワーカーで準備したアセットを描画側へ渡すには

1. [容量を決めたワーカーキュー](/runtime/bounded-worker-queues.html)で、満杯や空で待つ条件、受付の終了と回収の順番を調べる。
2. [アセットをワーカーから描画側へ渡す設計](/game/asset-worker-handoff.html)で、世代の確認、登録する側の責任、CPUとGPUそれぞれの完了を追う。
3. [C++のワーカー受け渡し実践](/practice/threads/asset-worker-handoff-observation.html)で、結果キューを回収し、古い世代を捨てて終了する。
4. [D3D12の並列コマンド記録](/graphics/optimization/parallel-command-recording.html)で、描画コマンド自体を複数スレッドで記録するときの提出順と寿命を調べる。

## D3D12でコマンドを記録し、依存する処理を実行するには

1. [D3D12のリソースバリア](/graphics/optimization/d3d12-resource-barriers.html)で、コピーから読み取りへの遷移やUAV・エイリアシングの依存関係を調べる。
2. [C++の並列コマンド記録実践](/practice/graphics/parallel-command-recording-observation.html)で、CPUがリストを閉じた順番と、一つのキューへの提出順を変えて確かめる。
3. [D3D12のキュー間同期](/graphics/optimization/gpu-queue-synchronization.html)で、コピーと描画を別のキューに分けるときのフェンスと状態を追う。
4. [D3D12のディスクリプターヒープ](/graphics/optimization/d3d12-descriptor-heaps.html)で、シェーダーへ渡す参照と、その参照を再利用する条件を調べる。

## 描いた画像を次のパスで使うには

1. [テクスチャに描き、次のパスで読む](/graphics/postprocess/render-to-texture.html)で、中間画像をRTVとして書き、SRVとして読む流れを追う。
2. [C++の2パス描画実践](/practice/graphics/render-to-texture-observation.html)で、色を入れ替える前後の全画素を読み戻す。
3. [ピンポンバッファとフレーム履歴](/graphics/postprocess/ping-pong-and-history.html)で、後処理をつなぐときと前フレームの結果を残すときの違いを調べる。
4. [描画パスのアタッチメント](/graphics/optimization/render-pass-attachments.html)で、どの画像を残すか、いつ破棄や再利用ができるかを追う。

## ファイルを読むと内部で何が起きるか

1. [ファイルを読む仕組み](/os/file-read-journey.html)で、アプリのバッファ、OSのファイルキャッシュ、ストレージへの要求を分ける。
2. [C++・C#の読み取り観察](/practice/io/file-read-observation.html)で、要求数と実読取数、ファイル位置、EOF、seek、失敗を確かめる。
3. テキストとして解釈するときは[Unicodeと文字コード](/data/unicode-and-encoding.html)へ進む。

## ファイルを読む処理と、ディスクへの要求を計測で分けるには

1. [Windowsのファイルキャッシュと先読み](/os/windows-file-cache.html)で、同じ範囲の再読み取りと先読みでI/Oの量が変わる理由を調べる。
2. [ProcmonとWPRでファイルI/Oを追う](/tools/windows/file-io-tracing.html)で、ファイル操作とディスク要求をどのツールで見るか決める。
3. [ファイル読み取りをトレースするC++実践](/practice/io/file-io-trace-observation.html)で、同じファイルを2回読み、バイト数と記録を照合する。

## I/Oの完了を待ちながら、別の処理を進めるには

1. [非同期I/O](/os/asynchronous-file-io.html)で、要求の発行と完了、即時完了、待機と継続、バッファの寿命を分ける。
2. [C++・C#の同期・非同期比較](/practice/io/async-file-read-observation.html)で、同じファイルを読み、完了結果と内容の一致を確かめる。
3. 複数の処理から状態を共有するときは[スレッドと同期](/runtime/thread-synchronization.html)も確認する。

## WindowsでI/Oの完了をまとめて受け取り、安全に終了するには

1. [I/O完了ポート](/os/io-completion-ports.html)で、完了キーと要求ポインター、発行時の失敗と完了時の失敗を分ける。
2. [C++のIOCP観察例](/practice/io/iocp-observation.html)で、一つのファイルに出した2件の要求をポートから受け取る。
3. [非同期I/Oのキャンセル](/os/cancelling-overlapped-io.html)で、停止を要求してから完了を回収し、バッファを解放する順序を確認する。

## ゲームのセーブデータをファイルに保存するには

1. [ファイルの書き込みと永続化](/os/file-write-and-durability.html)で、書き込み成功、読み手への公開、停電後の復旧を別々に考える。
2. 読み戻し側は[ファイルを読む仕組み](/os/file-read-journey.html)で、短い読み取りやEOFと、ファイルの形式の検査を区別する。

## ファイルをメモリへのアクセスとして読むには

1. [メモリマップドファイル](/os/memory-mapped-files.html)で、ファイル内位置と仮想アドレス、ページフォルト、ビューの寿命を分ける。
2. [C++・C#の読み取り専用マッピング](/practice/io/mapped-file-observation.html)で、通常のreadと内容を照合し、整列した位置と使いたい範囲の対応を確かめる。
3. アドレス変換の基礎は[仮想メモリ](/os/virtual-memory.html)、実行時の組立ては[アセットロード設計](/game/asset-loading.html)へ進む。

## アセットが読み終わってから、ゲームで使えるまで

1. [アセットロード設計](/game/asset-loading.html)で、読み取り、展開・検証、登録、利用可能化、解放を分ける。
2. [C++・C#の状態と寿命のモデル](/practice/assets/asset-lifecycle-model.html)で、古い要求の完了、キャンセル、失敗を含む所有権の移動を確かめる。
3. 実I/Oの完了待ちは[非同期I/O](/os/asynchronous-file-io.html)、共有するキューや状態の保護は[スレッドと同期](/runtime/thread-synchronization.html)も確認する。
4. Windows PCの[DirectStorage](/game/directstorage.html)で、読み取りの一括発行、展開、GPUが結果を使えるまでの条件を確認する。

## ゲームの素材をまとめて配布し、必要な範囲だけ読むには

1. [アセットパック](/game/asset-pack-files.html)で、名前、目次、格納位置、圧縮の単位を分ける。
2. [バイナリファイルの範囲検査](/data/binary-file-validation.html)で、件数や長さを読み取り・確保に使う前の検査を確かめる。
3. [C++でアセットパックを作る実践](/practice/io/asset-pack-observation.html)で、1件の素材を取り出し、壊れた索引が拒否されるところを試す。
4. [アセットビルドと差分配信](/game/asset-build-and-patches.html)で、読み込みやすい配置と更新で再利用できる配信単位を考える。

## テクスチャのファイルを読み、GPUで使えるようにするには

1. [DDSとサブリソース](/graphics/texture/dds-and-subresources.html)で、テクスチャの形式、mip、配列スライスからファイル内の位置を求める。
2. [D3D12でテクスチャを転送する流れ](/graphics/texture/d3d12-texture-upload.html)で、行の再配置、コピー、リソースの状態とフェンスを追う。
3. [C++のDDS転送実践](/practice/graphics/dds-upload-observation.html)で、2つのmipをD3D12へコピーし、読み戻したバイトを照合する。
4. [テクスチャストリーミング](/graphics/texture/texture-streaming-and-mip-residency.html)で、先に使える解像度と、メモリに置く範囲を決める。

## 3Dモデルのファイルから三角形を描くには

1. [glTFのメッシュデータ](/graphics/mesh/gltf-mesh-buffers.html)で、buffer、bufferView、accessorをたどって頂点とインデックスの位置を求める。
2. [頂点入力とインデックス描画](/graphics/mesh/vertex-and-index-input.html)で、バッファの配置と頂点シェーダーの入力をつなぐ。
3. [GLBから三角形を描くC++実践](/practice/graphics/glb-mesh-observation.html)で、ファイルを作り、WARPで描いた色を読み戻す。
4. [メッシュのインポートとクック](/graphics/mesh/mesh-import-and-cooking.html)で、座標系、マテリアル、描画範囲、実行時のバッファ配置を決める。

## 入力からゲーム画面まで

1. [ゲームループ](/game/patterns/game-loop-and-update.html)で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [座標変換](/math/rendering/transform.html)と[描画パイプライン](/graphics/pipeline/overview.html)から画面へつなぐ。
4. 作って試すなら[シューティングの設計](/game/shooter-design.html)を読み、[C++版](/game/shooter-cpp.html)または[Unity版](/game/shooter-unity.html)へ進む。

## sendしたデータが、相手のアプリへ届くまで

1. [ソケットとTCP通信](/network/tcp-sockets.html)で、IP・ポート、送受信バッファ、バイト列とメッセージ、半閉鎖を分ける。
2. [C++・C#のローカル通信](/practice/network/tcp-loopback-observation.html)で、長さ付きメッセージを復元し、送信停止後の応答と受信EOFを確かめる。
3. 待機と非同期処理の基本は[非同期I/O](/os/asynchronous-file-io.html)へ進む。今回の通信例は、非ブロッキング操作とreadiness待ちを使う。

## UDPでメッセージを送り、通信の遅れを調べるには

1. [IPの経路選択とEthernet](/network/ip-routing-and-ethernet.html)で、送信先IPから次の経由先を選び、同じリンク上でフレームを届ける流れを追う。
2. [UDPとデータグラム](/network/udp-datagrams.html)で、送受信の区切り、順序や再送、パケットの大きさを調べる。
3. [C++のUDPループバック実践](/practice/network/udp-loopback-observation.html)で、受信バッファが足りない場合と空データグラムの戻り値を確かめる。
4. [NATとポート変換](/network/nat-and-port-mapping.html)で、ルーターの変換表、UDPの応答、外部からの接続を追う。
5. [通信の遅延と帯域](/network/latency-throughput-and-queues.html)で、RTT、転送量、混雑時のキューを分けて観測する。

## SSDやNICがメモリとデータをやり取りするには

1. [PCIeのリンク](/hardware/io/pcie-links.html)で、CPU側とデバイスをつなぐ経路、レーン数、リンク速度を調べる。
2. [DMAとIOMMU](/hardware/io/dma-and-iommu.html)で、デバイスから見たアドレス、読み書き、完了通知を追う。
3. [NICの受信キューとRSS](/hardware/io/nic-receive-queues.html)で、NICがフレームを書き込んだ後、ドライバーが結果を回収してソケットへ渡すまでを追う。
4. [DRAMのチャネルと帯域](/hardware/memory/dram-channels-and-bandwidth.html)で、メモリ側の転送速度、バンクと行、アクセスの待ち時間を調べる。
5. アプリが見る操作とOSのディスク要求の違いは[WindowsのファイルI/O計測](/tools/windows/file-io-tracing.html)で確かめる。

## TCPのバイト列が、Webの要求と応答になるまで

1. [HTTP通信](/network/http-messages.html)で、要求行、状態コード、ヘッダー、本文の形式と長さを分ける。
2. [C++・C#のHTTP観察](/practice/network/http-message-observation.html)で、ローカルのGETと応答を照合し、本文のバイト数と文字数、メッセージ完成とEOFを確かめる。
3. 下の層から調べる場合は[TCPとソケット](/network/tcp-sockets.html)、文字の表現は[Unicodeと文字コード](/data/unicode-and-encoding.html)へ戻る。

## パケットが欠けたとき、どのHTTP応答が待つか

1. [QUICとHTTP/3](/network/quic-and-http3.html)で、QUICのパケット番号とストリームのオフセット、HTTP/2とHTTP/3の違いを調べる。
2. [TCPとQUICの配送の比較](/practice/network/stream-loss-observation.html)で、欠けるパケットを切り替え、届いていても待つデータと先に使えるデータを確かめる。

## 保存したHTTP応答を、いつ再利用できるか

1. [HTTPキャッシュ](/network/http-caching.html)で、保存、freshness、再検証、Cache-Control、ETagと304の役割を調べる。
2. [C++・C#のHTTP再検証](/practice/network/http-cache-observation.html)で、ローカルサーバーへ条件付きGETを送り、304に本文がないことと、保存した本文を使う流れを確かめる。
3. メッセージの構造は[HTTP通信](/network/http-messages.html)、本文を段階的に扱う仕組みは[Streams API](/browser/streams-backpressure.html)へつなげる。

## 名前から、接続先のIP候補が決まるまで

1. [DNSと名前解決](/network/dns-resolution.html)で、OSの名前解決、再帰リゾルバー、権威DNS、レコードとキャッシュを分ける。
2. [C++・C#の名前解決観察](/practice/network/name-resolution-observation.html)で、数値IP・localhost・追加指定する公開名を調べ、APIの結果から分かる範囲を確かめる。
3. IPを得た後の接続は[TCPとソケット](/network/tcp-sockets.html)、要求と応答は[HTTP通信](/network/http-messages.html)へ進む。

## HTTPSで暗号化し、接続相手を確かめるには

1. [TLS・証明書・HTTPS](/network/tls-https.html)で、鍵共有、証明書、相手名の検証、暗号化したHTTPの関係を調べる。
2. [C++・C#のHTTPS観察](/practice/network/https-observation.html)で、標準の証明書検証を保ち、APIが返す接続情報とHTTP応答を確かめる。
3. 接続先の候補は[DNSと名前解決](/network/dns-resolution.html)、要求の意味は[HTTP通信](/network/http-messages.html)で確認する。

## URLを開いてからページが見えるまで

1. 通信は[DNSと名前解決](/network/dns-resolution.html)、[TCPとソケット](/network/tcp-sockets.html)、[HTTPの要求と応答](/network/http-messages.html)、[TLS・証明書・HTTPS](/network/tls-https.html)で調べる。
2. [ブラウザの描画](/browser/rendering-journey.html)で、受信したHTMLからDOM、スタイル、レイアウト、描画、合成までをつなぐ。
3. [DOMと描画の変化を観察する](/practice/browser/render-observation.html)で、幅・色・移動・透明度を変え、寸法APIとrAFで確認できる範囲を試す。

## Promiseやawaitの続きは、いつ動くのか

1. [イベントループ・Promise・async/await](/browser/event-loop-promises.html)で、同期処理、タスク、マイクロタスク、描画機会を区別する。
2. [Promiseとawaitの実行順を観察する](/practice/browser/event-loop-observation.html)で、有限のコードから実行順を記録する。timerとrAFの相対順は固定しない。
3. 画面の更新は[ブラウザの描画](/browser/rendering-journey.html)、要求の発行と完了は[非同期I/O](/os/asynchronous-file-io.html)へつなげる。

## メイン側とは別の実行主体へ、仕事とデータを渡すには

1. [Web Workerとメッセージ通信](/browser/web-workers-messages.html)で、実行の分担、メッセージの受信、コピーと転送、寿命を区別する。
2. [Workerのコピー・転送・停止を観察する](/practice/browser/worker-message-observation.html)で、16バイトの往復、バッファの切り離し、要求ID、停止と再起動を試す。
3. 同じ実行先の続きを扱う[イベントループ・Promise・async/await](/browser/event-loop-promises.html)と、共有状態を守る[スレッド同期](/runtime/thread-synchronization.html)へつなげる。

## 依頼が増えたとき、Workerと待ち行列をどう管理するか

1. [Worker poolと待ち行列の制御](/browser/worker-pool-backpressure.html)で、受付数・実行数・待機数、上流への抑制、取消しと終了を区別する。
2. [Worker poolの待機数と取消しを観察する](/practice/browser/worker-pool-observation.html)で、2実行・4待機・1拒否、待機の取消しと結果破棄による違いを確かめる。
3. [Web Workerの通信](/browser/web-workers-messages.html)でデータの受け渡しを確認し、[アセットロード](/game/asset-loading.html)の段階と利用可能になる条件へつなぐ。

## 読み込みより処理が遅いとき、供給をどう抑えるか

1. [Streams APIとストリーミング処理](/browser/streams-backpressure.html)で、chunk、queue、pull、バックプレッシャー、終了の伝播を区別する。
2. [Streams APIで供給と処理の速度差を観察する](/practice/browser/stream-backpressure-observation.html)で、有限のデータを遅いsinkへ送り、先読みと中断を確かめる。
3. 仕事の受付数は[Worker pool](/browser/worker-pool-backpressure.html)、文字の境界は[Unicodeとエンコーディング](/data/unicode-and-encoding.html)、利用可能になる条件は[アセットロード](/game/asset-loading.html)へつなげる。

## ブラウザのどこへ保存し、いつまで残るのか

1. [ブラウザの保存領域とデータの寿命](/browser/storage-lifetime.html)で、localStorage・IndexedDB・Cache API、保存区画、transaction、容量と保持方針を区別する。
2. [保存・再読込・削除の観察](/practice/browser/storage-observation.html)で、3方式へ固定データを保存し、ページ再読込後の読出しと専用データの削除を試す。
3. 応答の自動的な再利用は[HTTPキャッシュ](/network/http-caching.html)、Request／Responseの本文を扱う流れは[Streams API](/browser/streams-backpressure.html)へつなげる。

## 通信できないとき、保存した応答をどう返すか

1. [Service Workerとオフライン動作](/browser/service-worker-offline.html)で、登録・有効化・ページの制御、fetchへの介入と応答の選択を調べる。
2. [Service Workerで応答元と登録状態を観察する](/practice/browser/service-worker-observation.html)で、専用scopeの登録、固定GETの代替応答、解除と後片付けを試す。
3. 応答の明示的な保存は[ブラウザの保存領域](/browser/storage-lifetime.html)、HTTPの再利用と再検証は[HTTPキャッシュ](/network/http-caching.html)で確認する。

## 別オリジンへの通信で、応答を読めるかは何で決まるか

1. [同一オリジンポリシーとCORS](/browser/same-origin-cors.html)で、文書間の境界、応答の公開、preflightによる事前確認を区別する。
2. [ブラウザでCORSの応答を比べる](/practice/browser/cors-observation.html)で、通常ページとsandboxから同じデータをGETし、公開版とローカル配信で結果を比べる。
3. [HTTPメッセージ](/network/http-messages.html)で要求・応答を確認し、[HTTPキャッシュ](/network/http-caching.html)で応答を再利用する条件へつなげる。

## ページをまたいで、サーバーが同じセッションをどう見つけるか

1. [Cookieとセッション](/browser/cookies-and-sessions.html)で、Cookieを送る条件、サーバーによるIDの照合、ログアウト時の失効を区別する。
2. [Cookieの範囲とセッションIDを観察する](/practice/browser/cookie-session-observation.html)で、Pathによる見え方と、HttpOnlyのIDが次の要求に付くところを確かめる。
3. 別オリジンでの応答の読み取りは[CORS](/browser/same-origin-cors.html)、ブラウザ内でのデータ保持は[ブラウザの保存領域](/browser/storage-lifetime.html)へつなげる。

## 表示する文字列がHTMLやコードに変わるのはどこか

1. [XSSとCSP](/browser/xss-and-csp.html)で、入力元、HTMLとして解釈する箇所、スクリプトの実行条件を区別する。
2. [textContent・innerHTML・CSPの観察](/practice/browser/xss-csp-observation.html)で、同じ入力が文字・要素・イベント処理になる違いを確かめる。
3. DOMができる段階は[ブラウザの描画](/browser/rendering-journey.html)、スクリプトからCookieを読める条件は[Cookieとセッション](/browser/cookies-and-sessions.html)へつなげる。

## Cookie付きの要求をどの条件で受理するか

1. [CSRFとリクエスト検証](/browser/csrf-and-request-validation.html)で、Cookieが届く条件、送信元の照合、セッションとトークンの照合を区別する。
2. [CSRFでCookie付きの要求が届く条件を観察する](/practice/browser/csrf-observation.html)で、同一サイトの別オリジンからフォームを送り、受理と拒否を比べる。
3. Cookieの送信条件は[Cookieとセッション](/browser/cookies-and-sessions.html)、別オリジンの応答公開は[CORS](/browser/same-origin-cors.html)で確認する。

## ブラウザのWorkerと、同じメモリを共有するには

1. [クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)で、COOP・COEP・CORPと、分離状態が成立する条件を整理する。
2. [Workerへのコピーと共有メモリを観察する](/practice/browser/cross-origin-isolation-observation.html)で、4種類のヘッダー設定と、コピー・共有の結果を比べる。
3. データの転送は[Web Workerとメッセージ通信](/browser/web-workers-messages.html)、並行処理の同期は[スレッドと同期](/runtime/thread-synchronization.html)へつなげる。

## WebAssemblyから整数を読み書きするには

1. [WebAssemblyと線形メモリ](/browser/webassembly-linear-memory.html)で、モジュールのバイナリ、インスタンス、バイト位置と境界チェックを区別する。
2. [WebAssemblyの読み込みと線形メモリを観察する](/practice/browser/wasm-memory-observation.html)で、JavaScriptとWasmから同じバイト列を読み、拡張前後のビューを比べる。
3. バイト列での整数の表現は[整数とビット・バイト](/data/integer-bits-and-bytes.html)、Workerをまたぐ共有は[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)で確認する。

## 配列や文字列をWasmへ渡すとき、どこに何を置くか

1. [WebAssemblyのデータ受け渡しとメモリ確保](/browser/wasm-data-and-allocation.html)で、ポインタと長さの単位、配置、確保位置とメモリの容量を整理する。
2. [Wasmへ配列とUTF-8を渡す実験](/practice/browser/wasm-abi-observation.html)で、実際のバイト列、アラインメントによる空き、確保失敗と拡張を観察する。
3. 文字列のバイト表現は[Unicodeとエンコーディング](/data/unicode-and-encoding.html)、メモリ確保を実行環境の内側から見る場合は[メモリ確保の内部](/runtime/memory/allocation-journey.html)へつなげる。

## 2つのWorkerが同じ値を更新すると何が起きるか

1. [Web Workerと共有メモリの同期](/browser/shared-memory-atomics.html)で、失われた更新、不可分な加算、待機と通知を区別する。
2. [Workerの競合とAtomicsの待機・通知を観察する](/practice/browser/atomics-observation.html)で、読み取りと書き込みの順序をたどる。実際のWorkerで確認する場合はローカル配信を使う。
3. 共有できる条件は[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)、複数の値を一緒に守る設計は[スレッドと同期](/runtime/thread-synchronization.html)で調べる。

## 固定サイズのメモリで値を順番に渡すには

1. [リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)で、読み書き位置が末尾から先頭に戻る仕組みと、空・満杯の判定を整理する。
2. [リングバッファの満杯・折り返し・読み出し順を観察する](/practice/browser/ring-buffer-observation.html)で、満杯で拒否された値を空きができてから入れ直し、読み出し順を比べる。
3. 異なるWorkerへの公開順序は[Web Workerと共有メモリの同期](/browser/shared-memory-atomics.html)、受付を制御する方針は[Worker poolとバックプレッシャー](/browser/worker-pool-backpressure.html)へつなげる。

## 音声データが出力に間に合わないと何が起きるか

1. [AudioWorkletと音声バッファ](/browser/audio-worklet-buffering.html)で、サンプルフレーム、レンダリングの処理単位、データの供給不足を区別する。
2. [AudioWorkletで先読みとアンダーランを観察する](/practice/browser/audio-buffer-observation.html)で、同じ到着の遅れを与え、先読みの有無で波形と不足したフレーム数を比べる。
3. 待ち行列で枠を使い回す仕組みは[リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)で確認する。

## 複数の音を重ねると波形はどう変わるか

1. [Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)で、音源ごとのゲイン、加算、出力までの振幅の余裕を確認する。
2. [Web Audioでゲインとクリッピングを観察する](/practice/browser/audio-mixing-observation.html)で、マスターゲインを変えてクリップ前後の波形とピークを比べる。
3. 音声フレームの供給と出力の関係は[AudioWorkletと音声バッファ](/browser/audio-worklet-buffering.html)で確認する。

## 再生中の音を急に消すと何が起きるか

1. [Web Audioのゲインオートメーション](/browser/audio-gain-automation.html)で、音声の時刻に沿ってゲインが変わる仕組みと、急な消音で生じる波形の段差を確認する。
2. [Web Audioで急な消音とフェードを観察する](/practice/browser/audio-fade-observation.html)で、フェードの長さを変え、切り替え前後のサンプル値と波形を比べる。
3. 複数の音を足し合わせる場合のゲインは[Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)で確認する。

## 二つの音を入れ替える途中で音量はどう変わるか

1. [Web Audioのクロスフェード](/browser/audio-crossfade.html)で、二つのゲインの形と、音源の相関が加算結果にどう関わるかを確認する。
2. [Web Audioで線形と等電力のクロスフェードを比べる](/practice/browser/audio-crossfade-observation.html)で、音源の組み合わせを変え、切り替え前と中点付近の実効値を比べる。
3. ゲインを音声の時刻で変える仕組みは[Web Audioのゲインオートメーション](/browser/audio-gain-automation.html)で確認する。

## 同じ音を少し遅らせて重ねると何が起きるか

1. [Web Audioのコムフィルター](/browser/audio-comb-filter.html)で、遅延した音を足すと周波数によって強め合ったり弱め合ったりする理由を確認する。
2. [Web Audioで遅延とコムフィルターを観察する](/practice/browser/audio-comb-observation.html)で、遅延時間とゲインを変え、最初にへこむ周波数を比べる。
3. 二つの音を切り替える途中の実効値は[Web Audioのクロスフェード](/browser/audio-crossfade.html)で確認する。

## 一つの音から反響を繰り返すには

1. [Web Audioのフィードバックディレイ](/browser/audio-feedback-delay.html)で、出力を遅延経路に戻す接続と、繰り返すたびに振幅が小さくなる仕組みを確認する。
2. [Web Audioで反響の間隔と減衰を観察する](/practice/browser/audio-feedback-observation.html)で、遅延時間と戻すゲインを変え、反響の時刻と振幅を比べる。
3. 遅延した入力を一度だけ重ねたときの周波数応答は[Web Audioのコムフィルター](/browser/audio-comb-filter.html)で確認する。

## インパルス応答から部屋の響きを加えるには

1. [Web Audioの畳み込みリバーブ](/browser/audio-convolution-reverb.html)で、インパルス応答をずらして重ねる計算と、直接音と残響を合流させる経路を確認する。
2. [Web Audioで畳み込みリバーブを聴き比べる](/practice/browser/audio-reverb-observation.html)で、小部屋とホールを模した応答を切り替え、打音のあとに残る響きを比べる。
3. 出力を遅延経路に戻して反響を作る方法は[Web Audioのフィードバックディレイ](/browser/audio-feedback-delay.html)で確認する。

## 音源が動くと左右の出力はどう変わるか

1. [Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)で、聞き手から見た方向と距離が、左右の出力にどう反映されるかを確認する。
2. [Web Audioで音の方向と距離を変えて聴く](/practice/browser/audio-spatial-observation.html)で、角度と距離を別々に変え、左右のゲインと聞こえ方を比べる。
3. 部屋から返ってくる音を別の経路で加える仕組みは[Web Audioの畳み込みリバーブ](/browser/audio-convolution-reverb.html)で確認する。

## 壁越しに聞こえる音は何が変わるか

1. [Web Audioの音の遮蔽](/browser/audio-occlusion.html)で、聞き手と音源の間を判定し、ゲインとローパスで壁越しの音を表す仕組みを確認する。
2. [Web Audioで壁越しの音量と音色を比べる](/practice/browser/audio-occlusion-observation.html)で、距離をそろえた二つの位置を切り替え、音量だけを下げたときと高音も弱めたときを比べる。
3. 聞き手から見た方向と距離による処理は[Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)で確認する。

## 扉が開いたときの音をなめらかに戻すには

1. [Web Audioで遮蔽をなめらかに切り替える](/browser/audio-occlusion-transition.html)で、ゲインとカットオフを同じ時刻から徐々に変える仕組みを確認する。
2. [Web Audioで扉が開くときの音の切り替えを比べる](/practice/browser/audio-occlusion-transition-observation.html)で、時定数を変え、出力波形とゲインの実測値を比べる。
3. 遮蔽時にゲインとローパスが音へ与える影響は[Web Audioの音の遮蔽](/browser/audio-occlusion.html)で確認する。

## 近づく音源と遠ざかる音源で高さが変わるのはなぜか

1. [Web Audioでドップラー効果を再現する](/browser/audio-doppler.html)で、音源が動くと波の山が届く間隔が変わる仕組みを確認する。
2. [Web Audioでドップラー効果を聴き比べる](/practice/browser/audio-doppler-observation.html)で、速さと進行方向を変えて、基準の440 Hzと変化後の波形を比べる。
3. 音源の位置を左右の配分と音量に反映する方法は[Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)で確認する。

## 目の前を通過する音を作るには

1. [Web Audioで音源の通過音を作る](/browser/audio-flyby.html)で、一つの軌道から高さ、左右の配分、距離減衰を求める。
2. [Web Audioで音源が通過する前後の音を比べる](/practice/browser/audio-flyby-observation.html)で、通過の前後をたどりながら、音源の位置と試聴音を比べる。
3. 音源がまっすぐ近づく場合の周波数は[ドップラー効果](/browser/audio-doppler.html)、左右の配分と距離によるゲインは[音の定位と距離減衰](/browser/audio-spatial-panning.html)で確認する。

## 平均60 FPSなのにカクつくとき

1. [フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)で、CPU・GPUの処理時間と画面の表示間隔を区別する。
2. [同じ60 FPSで表示間隔を比べる](/practice/graphics/frame-pacing-observation.html)で、平均が同じ二つの動きと、時間ごとの長い表示間隔を比べる。
3. [デバッグ・プロファイリングツール](/graphics/optimization/tools.html)で、処理が長引いた箇所を調べるための道具を確認する。

## GPUが描き終えた絵はいつ画面に出るか

1. [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)で、描画用の画像を受け取ってから表示側が使い終えるまでを追う。
2. [FIFO・MAILBOX・IMMEDIATEで画面の切り替わりを比べる](/practice/graphics/swap-chain-observation.html)で、表示待ち、表示されずに置き換わる絵、ティアリングを観察する。
3. [デバイス初期化と画面クリア](/graphics/capstone/02-device.html)で、Vulkanで画像を取得し、描画の完了に合わせてPresentするコードを読む。

## 入力への反応が遅いときに、どこで待ったかを調べる

1. [入力から画面に出るまでの遅延](/graphics/optimization/input-to-display-latency.html)で、入力の取得から走査までを追い、[入力遅延の実験](/practice/graphics/input-latency-observation.html)で一つ前の走査に間に合う条件を試す。
2. [GPU時間をタイムスタンプで測る](/graphics/optimization/gpu-timestamp-queries.html)で、GPUキューのどの区間を測っているかを確かめる。
3. [GPUリソースの寿命とフェンス](/graphics/optimization/gpu-resource-lifetime.html)で、GPUが使用中の領域をCPU側で再利用できる時点を調べる。
4. [シェーダーコンパイルのカクつきとパイプラインキャッシュ](/graphics/optimization/pipeline-compilation-stutter.html)で、初回だけ起きる処理を記録し、先に準備する仕組みを読む。

## ゲームのデータをどの構造に入れるか

1. [配列と動的配列](/algorithms/arrays-and-dynamic-arrays.html)と[連結リスト](/algorithms/linked-lists.html)で、並び方、挿入・削除、再確保が参照に及ぼす影響を比べる。
2. [スタック・キュー・デック](/algorithms/queues-and-deques.html)と[二分ヒープ](/algorithms/binary-heaps.html)で、追加した順や優先度から次に処理するデータを選ぶ。
3. [ハッシュ表](/algorithms/hash-tables.html)と[探索木](/algorithms/search-trees.html)で、キーの一致を調べたいときと、キーの順序や範囲が必要なときの違いを確認する。
4. [スパースセット](/algorithms/sparse-sets.html)と[IDを出し入れする実験](/practice/algorithms/sparse-set-observation.html)で、IDからの直接参照と、コンポーネントを詰めた走査を両立する仕組みを試す。
5. [世代付きハンドル](/algorithms/generational-handles.html)と[スロット再利用の実験](/practice/algorithms/generational-handle-observation.html)で、同じIDを再利用したときに古い参照を識別する条件を確かめる。

## 近くの物体だけを調べるには

1. [均等グリッドと空間ハッシュ](/algorithms/uniform-grid-and-spatial-hash.html)で、座標からセルを引き、複数セルに登録された物体を一度だけ検査する仕組みを読む。
2. [四分木と八分木](/algorithms/quadtrees-and-octrees.html)と[BVHとAABB](/algorithms/bounding-volume-hierarchies.html)で、場所を分ける方法と、物体をグループに分けて箱で包む方法を比べる。
3. [範囲検索の実験](/practice/algorithms/spatial-query-observation.html)で、物体の配置や検索範囲を動かし、命中と詳細判定の件数を確かめる。

## ソースコードの呼び出しを、実行時のアドレスまで追う

1. [トークン・AST・型検査](/compilers/tokens-ast-and-type-checking.html)と[LLVM IRとSSA](/compilers/llvm-ir-and-ssa.html)で、ソースを解釈して中間表現にするまでを追う。
2. [COFFの再配置](/compilers/coff-relocations.html)と[WindowsのPEローダー](/os/pe-loading-and-imports.html)で、リンクで埋める参照と、ロード時に決まるアドレスを調べる。
3. [OBJ・EXE・PDBを作って読む実践](/practice/compilers/build-artifact-observation.html)で、同じ関数呼び出しをOBJとEXEから確認する。

## ゲームが止まった箇所や値を書き換えた箇所を探す

1. [ブレークポイントとデータブレークポイント](/tools/windows/debugger-breakpoints-and-watchpoints.html)で、指定した命令や、特定アドレスへの書き込みで止める。
2. [クラッシュダンプとシンボル](/tools/windows/crash-dumps-and-symbols.html)で、停止時の例外、スレッド、モジュールを確認し、対応するPDBから関数や行を調べる。

## 起動したプロセスはOSとどうやり取りするか

1. [システムコールとCPUの権限](/os/system-calls-and-privilege.html)で、同じスレッドがカーネルの処理へ入る流れを追う。
2. [Windowsのスレッドスケジューリング](/os/thread-scheduling.html)で、実行中・実行可能・待機中の違いと、CPU時間を割り当てる条件を調べる。
3. [Windowsのハンドルとカーネルオブジェクト](/os/windows-handles.html)で、操作できる対象と、別プロセスにハンドルを渡す方法を読む。
4. [パイプと子プロセスの標準入出力](/os/pipes-and-process-io.html)と[パイプの終端を調べる実践](/practice/process/windows-pipe-observation.html)で、出力と終端を確認する。

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)の作品・ハード・媒体・流通と、[リアルタイム3D技術史](/guide/rendering/timeline.html)の技術の変化から、気になった仕組みへ進みます。
