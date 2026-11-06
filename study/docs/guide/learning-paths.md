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
    "summary": "整数・浮動小数点、文字コード、メモリ確保、起動、同期、ファイルI/Oとマッピング、アセットロード、DNS・TCP・HTTP・TLS通信、入力と描画、Webの疑問から本文をたどる。"
  }
}
---

<div id="読み進め方" class="study-legacy-anchor" aria-hidden="true"></div>

# 疑問から選ぶ読み順

辞典を最初から順番に読む必要はありません。いまの疑問に関係する本文から選びます。

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

## ファイルを読むと内部で何が起きるか

1. [ファイルを読む仕組み](/os/file-read-journey.html)で、アプリのバッファ、OSのファイルキャッシュ、ストレージへの要求を分ける。
2. [C++・C#の読み取り観察](/practice/io/file-read-observation.html)で、要求数と実読取数、ファイル位置、EOF、seek、失敗を確かめる。
3. テキストとして解釈するときは[Unicodeと文字コード](/data/unicode-and-encoding.html)へ進む。

## I/Oの完了を待ちながら、別の処理を進めるには

1. [非同期I/O](/os/asynchronous-file-io.html)で、要求の発行と完了、即時完了、待機と継続、バッファの寿命を分ける。
2. [C++・C#の同期・非同期比較](/practice/io/async-file-read-observation.html)で、同じファイルを読み、完了結果と内容の一致を確かめる。
3. 複数の処理から状態を共有するときは[スレッドと同期](/runtime/thread-synchronization.html)も確認する。

## ファイルをメモリへのアクセスとして読むには

1. [メモリマップドファイル](/os/memory-mapped-files.html)で、ファイル内位置と仮想アドレス、ページフォルト、ビューの寿命を分ける。
2. [C++・C#の読み取り専用マッピング](/practice/io/mapped-file-observation.html)で、通常のreadと内容を照合し、整列した位置と使いたい範囲の対応を確かめる。
3. アドレス変換の基礎は[仮想メモリ](/os/virtual-memory.html)、実行時の組立ては[アセットロード設計](/game/asset-loading.html)へ進む。

## アセットが読み終わってから、ゲームで使えるまで

1. [アセットロード設計](/game/asset-loading.html)で、読み取り、展開・検証、登録、利用可能化、解放を分ける。
2. [C++・C#の状態と寿命のモデル](/practice/assets/asset-lifecycle-model.html)で、古い要求の完了、キャンセル、失敗を含む所有権の移動を確かめる。
3. 実I/Oの完了待ちは[非同期I/O](/os/asynchronous-file-io.html)、共有するキューや状態の保護は[スレッドと同期](/runtime/thread-synchronization.html)も確認する。

## 入力からゲーム画面まで

1. [ゲームループ](/game/patterns/game-loop-and-update.html)で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [座標変換](/math/rendering/transform.html)と[描画パイプライン](/graphics/pipeline/overview.html)から画面へつなぐ。
4. 作って試すなら[シューティングの設計](/game/shooter-design.html)を読み、[C++版](/game/shooter-cpp.html)または[Unity版](/game/shooter-unity.html)へ進む。

## sendしたデータが、相手のアプリへ届くまで

1. [ソケットとTCP通信](/network/tcp-sockets.html)で、IP・ポート、送受信バッファ、バイト列とメッセージ、半閉鎖を分ける。
2. [C++・C#のローカル通信](/practice/network/tcp-loopback-observation.html)で、長さ付きメッセージを復元し、送信停止後の応答と受信EOFを確かめる。
3. 待機と非同期処理の基本は[非同期I/O](/os/asynchronous-file-io.html)へ進む。今回の通信例は、非ブロッキング操作とreadiness待ちを使う。

## TCPのバイト列が、Webの要求と応答になるまで

1. [HTTP通信](/network/http-messages.html)で、要求行、状態コード、ヘッダー、本文の形式と長さを分ける。
2. [C++・C#のHTTP観察](/practice/network/http-message-observation.html)で、ローカルのGETと応答を照合し、本文のバイト数と文字数、メッセージ完成とEOFを確かめる。
3. 下の層から調べる場合は[TCPとソケット](/network/tcp-sockets.html)、文字の表現は[Unicodeと文字コード](/data/unicode-and-encoding.html)へ戻る。

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

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)の作品・ハード・媒体・流通と、[リアルタイム3D技術史](/guide/rendering/timeline.html)の技術の変化から、気になった仕組みへ進みます。
