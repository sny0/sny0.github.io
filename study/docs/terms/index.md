---
{
  "title": "用語・別名から調べる",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "reference",
    "format": "glossary",
    "domain": "terms",
    "summary": "表記の違いから、用語や仕組みの主な説明へ進む。"
  }
}
---

# 用語・別名から調べる

| 用語・別名 | 説明への入口 |
| --- | --- |
| [Service Worker / service worker scope / install / waiting / activate / controller / ready / fetch event / respondWith / waitUntil / unregister / オフライン](/browser/service-worker-offline.html) | 登録、ページの制御、要求の介入、保存済み応答の利用、更新と解除を調べる |
| [ブラウザ保存領域 / Web Storage / localStorage / sessionStorage / IndexedDB / object store / IDBTransaction / Cache API / CacheStorage / quota / eviction / persist / storage partition](/browser/storage-lifetime.html) | 保存対象、同期・非同期処理、transactionの完了、データの保持と削除を調べる |
| [HTTPキャッシュ / HTTP cache / Cache-Control / ETag / If-None-Match / 304 / freshness / max-age / no-cache / no-store / Vary / 再検証](/network/http-caching.html) | 保存した応答の再利用、鮮度、条件付きGET、本文とメタデータの更新を調べる |
| [Streams API / ストリーミング / ReadableStream / WritableStream / TransformStream / chunk / pull / desiredSize / highWaterMark / pipeTo / writer.ready / cancel / abort](/browser/streams-backpressure.html) | データの供給と消費、キューの閾値、バックプレッシャー、正常終了と中断を調べる |
| [Worker pool / ワーカープール / 待ち行列 / bounded queue / admission control / backpressure / バックプレッシャー / drain / shutdown](/browser/worker-pool-backpressure.html) | 実行数と待機数の上限、受付拒否、取消し、結果破棄、停止を調べる |
| [Web Worker / Dedicated Worker / postMessage / structured clone / 構造化クローン / transfer list / transferable / detach / terminate / messageerror](/browser/web-workers-messages.html) | 実行の分担、メッセージによるデータのコピーと転送、応答と終了の扱いを調べる |
| [イベントループ / event loop / task / microtask / マイクロタスク / Promise / async / await / queueMicrotask / setTimeout](/browser/event-loop-promises.html) | 同期処理と非同期の続き、Promiseの状態、実行順と描画機会の関係を調べる |
| [DOM / CSSOM / スタイル計算 / layout / paint / raster / composite / rAF / requestAnimationFrame](/browser/rendering-journey.html) | HTMLからピクセルまでの段階と、変更後の更新、寸法取得、描画前のcallbackを調べる |
| [TLS / HTTPS / 証明書 / SAN / CA / 信頼アンカー / SNI / ALPN / 鍵共有 / CertificateVerify / AEAD](/network/tls-https.html) | 暗号化と相手の検証、鍵共有、証明書の信頼、TLSとHTTPの境界を調べる |
| [DNS / 名前解決 / リゾルバー / 権威DNS / A / AAAA / CNAME / TTL / NXDOMAIN / NODATA](/network/dns-resolution.html) | 名前解決API、委任をたどる問い合わせ、レコードとキャッシュ、失敗の違いを調べる |
| [HTTP / HTTP/1.1 / GET / Host / 状態コード / ヘッダー / Content-Length / Content-Type / CRLF](/network/http-messages.html) | 要求と応答の形式、本文のバイト数、メッセージの完成と接続終了を調べる |
| [ソケット / socket / TCP / IPアドレス / ポート / send / recv / フレーミング / 半閉鎖 / loopback](/network/tcp-sockets.html) | 送受信バッファ、バイト列の境界、EOFとエラー、接続の終了を調べる |
| [メモリマップドファイル / file mapping / mmap / MapViewOfFile / MemoryMappedFile / ビュー](/os/memory-mapped-files.html) | ファイルの範囲と仮想アドレスを対応付け、ページとビューの寿命を調べる |
| [アセットロード / asset loading / リソース管理 / cook / 読み込み完了 / 利用可能 / 世代トークン](/game/asset-loading.html) | byte取得から登録・利用可能化・解放までの状態と所有権を整理する |
| [非同期I/O / asynchronous I/O / Overlapped I/O / ERROR_IO_PENDING / ReadAsync / await / IOCP](/os/asynchronous-file-io.html) | 要求の発行、完了結果、待機と継続、バッファを再利用できる時点を調べる |
| [ファイルI/O / read / FileStream / ReadFile / EOF / seek / ファイルキャッシュ / ページキャッシュ](/os/file-read-journey.html) | 読み取り要求と実読取数、ファイル位置、OSキャッシュと保存装置の違いを調べる |
| [スレッド同期 / mutex / lock / lock_guard / 排他制御 / critical section / happens-before / join](/runtime/thread-synchronization.html) | 共有する状態、ロックの排他と同期、終了待ちとオブジェクトの寿命を結び付ける |
| [近似一致 / 絶対許容差 / 相対許容差 / 浮動小数点の比較 / NaN / Inf](/math/floating-point-comparison.html) | 厳密な等値、用途に応じた近似判定、特殊値と非推移性を区別する |
| [Unicode / 文字コード / UTF-8 / UTF-16 / コードポイント / サロゲートペア / BOM / 文字化け](/data/unicode-and-encoding.html) | 文字の番号、コード単位、バイト列と、長さの数え方を区別する |
| [float / binary32 / 浮動小数点 / 丸め / 刻み幅 / epsilon / nextafter](/data/floating-point-spacing.html) | ビット表現と有効精度、隣接値、最近接・偶数丸めを区別する |
| [bit / byte / 2進数 / 16進数 / 整数表現 / 2の補数 / エンディアン](/data/integer-bits-and-bytes.html) | 値と表記、符号の解釈、アドレス順のバイト列を区別する |
| [プロセス / スレッド / PID / TID / ローダー / エントリポイント / CRT](/os/process-startup.html) | 実行環境と実行単位、EXEの開始点からmainまでの違い |
| [alloc / allocate / malloc / アロック / メモリ確保](/runtime/memory/allocation-journey.html) | 確保・初期化・解放、再利用とOSへの要求の関係 |
| [仮想メモリ / reserve / commit / resident / ページフォルト](/os/virtual-memory.html) | アドレス変換と、予約・コミット・常駐の違い |
| [ECS / Entity Component System](/game/ecs.html) | ID、Component、System、Query、格納方式 |
| [RAII / 所有 / 寿命](/runtime/memory/storage-duration-and-lifetime.html) | 記憶域、寿命、後片付けの区別 |
| [HLSL](/graphics/shader/hlsl.html) | Direct3Dやエンジンで使うシェーダ言語 |
| [GLSL](/graphics/shader/glsl.html) | OpenGL系のシェーダ言語とコンパイル経路 |
| [OpenGL / GL](/graphics/api/opengl.html) | 状態、リソース、パイプライン、同期 |
| [DirectX / Direct3D / D3D / DX](/graphics/api/comparison.html) | DirectX全体、描画API、DXGIの区別 |
| [Vulkan / VK](/graphics/api/vulkan.html) | 明示的な資源管理、コマンド、同期、表示 |
| [DIP / DI](/design/solid/dip.html) | 依存性逆転と依存性注入 |
| [命名辞典 / Factory / Service / Repository](/design/naming.html) | 名前と責務、具体例と注意点 |

- [C++・設計の用語集](/guide/cpp-glossary.html)
- [クラス名辞典](/design/naming.html)
- [問題から選ぶパターン索引](/design/pattern-index.html)
- [技術辞典のタイトル・別名索引](/)
