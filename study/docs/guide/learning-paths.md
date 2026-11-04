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
    "summary": "整数・浮動小数点、文字コード、メモリ確保、起動、同期、ファイルI/Oとマッピング、アセットロード、TCP・HTTP通信、入力と描画、Webの疑問から本文をたどる。"
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

## URLを開いてからページが見えるまで

[ネットワーク](/network/)には[TCPとソケット](/network/tcp-sockets.html)、[HTTPの要求と応答](/network/http-messages.html)の本文があります。DNS・TLSと[ブラウザ](/browser/)の専用詳解は準備中です。通信の基礎と、URLから表示までの全体像を区別して増補します。

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)の作品・ハード・媒体・流通と、[リアルタイム3D技術史](/guide/rendering/timeline.html)の技術の変化から、気になった仕組みへ進みます。
