---
title: DirectStorageでゲームの読み取りと展開をまとめる
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: Windows PCのDirectStorageで読み取りをキューへ積み、バッチの結果を受け取る。GDeflateのCPU・GPU展開、ステージング、描画までの同期を扱う。
  aliases: [DirectStorage, GDeflate, BypassIO, IDStorageQueue, EnqueueRequest, EnqueueStatus, EnqueueSignal, GetCompressionSupport, GPU decompression, GPU展開]
  verification: MicrosoftのWin32 API仕様、DirectStorage SDK資料と公式サンプルに照合（2026-11-06）
---

# DirectStorageでゲームの読み取りと展開をまとめる

オープンワールドで次の地区へ近づくと、地形・建物・テクスチャなど多数のデータが必要になります。Windows PCの**DirectStorage**は、こうした読み取りをまとめて発行し、必要に応じて圧縮データを展開して、システムメモリやDirect3D 12のリソースへ届けるAPIです。たとえば配布用ファイルのどの範囲に各テクスチャがあるかを目次から引き、読み取り要求を組み立てます。何をいつ読み、どこで利用可能とするかはゲーム側で決めます。[MicrosoftのWin32 DirectStorage概要](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage-portal) · [実行時のアセットロード設計](/game/asset-loading.html)

<figure class="study-figure">
  <img src="/images/game/directstorage.svg" alt="ゲームがファイルの範囲を指定して複数の要求をキューに積み、まとめて提出する。圧縮データはCPUまたはGPUで展開され、指定したメモリやD3D12リソースに届く。ゲームは完了とエラーを確認し、描画用の準備を終えてから利用可能にする。" width="760" height="440" loading="lazy">
  <figcaption>Windows PCで圧縮アセットを読み取るときの概念図です。展開経路は書き込み先と実行環境によって変わります。<a href="/study/images/game/directstorage.svg" target="_blank" rel="noopener noreferrer">読み取りと展開の図を拡大</a></figcaption>
</figure>

## 要求を積む、提出する、結果を受け取る

1. ファイルを開き、`DSTORAGE_REQUEST`に読み取り元の範囲、展開形式、書き込み先を指定します。たとえば、パックファイル内のオフセットと圧縮後のサイズを読み取り元に、D3D12バッファの領域を出力先に設定します。圧縮済みなら、展開後のサイズも渡します。[Win32の`DSTORAGE_REQUEST`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/ns-dstorage-dstorage_request) · [書き込み先の種類](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/ne-dstorage-dstorage_request_destination_type)
2. `IDStorageQueue::EnqueueRequest`で複数の要求をキューに積みます。グループの末尾に`EnqueueStatus`でステータスを書き込む項目を積み、`Submit`で提出します。未提出項目がキュー容量の半分に達した場合は自動提出も行われます。空き枠がない場合は`EnqueueRequest`が待つため、ゲーム側で発行量を制限し、描画を進めるスレッドに待ちを持ち込まないように設計します。[`EnqueueRequest`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/nf-dstorage-idstoragequeue-enqueuerequest) · [`Submit`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/nf-dstorage-idstoragequeue-submit) · [Microsoftのバッチ運用ガイド](https://github.com/microsoft/DirectStorage/blob/main/Docs/DeveloperGuidance.md#best-practices)
3. `IDStorageStatusArray::GetHResult`で、直前のステータス項目から今回の項目までの要求を確認します。`E_PENDING`は処理中、`S_OK`はすべて成功、それ以外は失敗した要求のうちキューへの追加順が最初のエラーです。キューのエラーイベントが通知された場合は、`RetrieveErrorRecord`で診断情報を取得できます。要求をキューに積む時点から処理が終わるまでは、書き込み先など実行に必要な資源を保持します。[`EnqueueStatus`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/nf-dstorage-idstoragequeue-enqueuestatus) · [`GetHResult`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/nf-dstorage-idstoragestatusarray-gethresult) · [`RetrieveErrorRecord`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/nf-dstorage-idstoragequeue-retrieveerrorrecord)

`EnqueueSignal`でD3D12フェンスを積むと、その項目より前の要求が完了した後にフェンス値が更新されます。描画側ではこのフェンスで処理順を合わせ、ステータスで結果を確認します。リソースの状態や依存アセット、エンジンへの登録も揃えたところでゲーム側が利用可能とします。[`EnqueueSignal`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/nf-dstorage-idstoragequeue-enqueuesignal) · [D3D12キュー間の同期](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization) · [Direct3D 12の基礎](/graphics/api/directx12.html)

## GDeflateで展開する層とテクスチャ形式

**GDeflate**は、DirectStorage 1.1で利用できるようになった可逆圧縮形式です。要求の出力先がシステムメモリならCPUが展開します。D3D12リソースへの出力では、対応するGPUとドライバーの経路で展開できます。ドライバー最適化の経路、組み込みのGPUシェーダー、CPUによる代替経路があり、1.2以降の`IDStorageQueue2::GetCompressionSupport`でキューと圧縮形式に対してランタイムが選んだ経路を調べられます。[MicrosoftのGDeflateと展開経路の解説](https://devblogs.microsoft.com/directx/directstorage-1-1-now-available/) · [`GetCompressionSupport`](https://learn.microsoft.com/en-us/windows/win32/dstorage/dstorage/nf-dstorage-idstoragequeue2-getcompressionsupport)

たとえば、テクスチャは制作時に**BC7**へ変換し、そのデータを配布時にさらにGDeflateで圧縮できます。読み取り時にGDeflateで展開すると、元のBC7データに戻ります。描画時にはGPUがBC7のブロックからテクスチャの値を読みます。GDeflateはファイル内のデータ量、BC7はテクスチャの保持形式を変える別々の段階です。[MicrosoftのBC7仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d11/bc7-format) · [公式BulkLoadDemoのパック作成例](https://github.com/microsoft/DirectStorage/blob/main/Samples/BulkLoadDemo/README.md#building-marc-files)

## どの経路が使われ、どこで待つかを測る

DirectStorageは処理途中のデータを**ステージングバッファ**に置きます。GPU展開の経路では、圧縮データをGPU側へコピーし、コンピュートキューで展開し、結果を目的のリソースへコピーします。出力がステージングを通る場合は、展開後のサイズがそのバッファに収まる必要があります。たとえば複数のmipレベルを別々のタイミングで読むなら、必要な範囲ごとに独立して展開できる形で格納します。バッファを小さくすると空き待ちが増える場合があり、大きくすると描画などに使えるメモリが減ります。バッチの大きさ、発行する要求数、バッファのサイズを一緒に測ります。[MicrosoftのGPU展開処理](https://devblogs.microsoft.com/directx/directstorage-1-1-now-available/) · [データ経路とバッファ設定](https://github.com/microsoft/DirectStorage/blob/main/Docs/DeveloperGuidance.md#compressed-assets) · [公式のGPU展開計測サンプル](https://github.com/microsoft/DirectStorage/tree/main/Samples/GpuDecompressionBenchmark)

Windows 10と11で使えるDirectStorageのリリースがあり、使える機能は採用したSDK、ランタイム、Windowsのバージョン、デバイスとドライバーで決まります。たとえばWindows 11の**BypassIO**は、対応する保存先とドライバーで読み取り経路の一部を短縮します。使えない場合は従来のI/O経路が使われます。GPU展開がCPUへ切り替わる条件は、これとは別に確認します。[DirectStorage SDKのリリース一覧](https://devblogs.microsoft.com/directx/directstorage-api-downloads/) · [MicrosoftのWindows対応の説明](https://devblogs.microsoft.com/directx/directstorage-1-1-coming-soon/) · [WindowsのBypassIOドライバー仕様](https://learn.microsoft.com/en-us/windows-hardware/drivers/storage/bypassio)

比較では、同じアセットを使い、提出から完了までの時間と、完了から描画できるまでの時間を分けて記録します。CPU時間、GPUのコピー・展開の負荷、描画フレーム時間も合わせると、展開先を変えたときに待ちがどこへ移ったかを確認できます。コードでは`HelloDirectStorage`がファイルからGPUバッファまでの流れ、`BulkLoadDemo`がアセットのまとまりと展開経路の比較を扱います。[ファイルI/Oの観測方法](/tools/windows/file-io-tracing.html) · [MicrosoftのHelloDirectStorage](https://github.com/microsoft/DirectStorage/tree/main/Samples/HelloDirectStorage) · [MicrosoftのBulkLoadDemo](https://github.com/microsoft/DirectStorage/tree/main/Samples/BulkLoadDemo)
