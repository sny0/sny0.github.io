---
title: Windowsのファイルキャッシュと先読み
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: 同じ範囲の読み取りがRAMで満たされる条件、キャッシュマネージャーの先読み、アクセスヒントと非バッファーI/O、ゲームのロードを測る手順を扱う。
  aliases: [ファイルキャッシュ, system file cache, Cache Manager, read-ahead, 先読み, warm cache, cold cache, FILE_FLAG_SEQUENTIAL_SCAN, FILE_FLAG_RANDOM_ACCESS, FILE_FLAG_NO_BUFFERING, noncached I/O]
  verification: MicrosoftのWindows APIとドライバー資料に照合（2026-11-06）
---

# Windowsのファイルキャッシュと先読み

Windowsで同じファイル範囲を二度読むと、二度目は**すでにRAMにあるデータ**から結果を返せることがあります。キャッシュマネージャー（Cache Manager）はファイルシステムと協力してデータをキャッシュし、後続の範囲を先読みすることもあります。ここではローカルストレージ上の通常ファイルを例に、どの範囲がいつRAMにあるかを追います。[Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching) · [読み取りAPIの基本](/os/file-read-journey.html)

## 必要な範囲を取り寄せ、残っていれば再利用する

例えば、レベルのパックファイル内の範囲Aを `ReadFile` で読みます。必要なデータがRAMにない場合、ファイルシステムとストレージの層を通して取得します。次に同じ範囲を要求し、必要なページがまだRAMにあれば、Windowsはファイルデータをそこから返せます。一部のページだけが残っていれば、足りない部分の取得が必要になることもあります。[Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching)

<figure class="study-figure">
  <img src="/images/os/windows-file-cache.svg" alt="最初の読み取りで範囲AがRAMにないときはストレージから取得し、後続のBを先読みする場合がある。再読み取りでAがまだRAMにある場合は、Aをキャッシュからアプリのバッファに返す。" width="760" height="524" loading="lazy">
  <figcaption>最初の読み取りがキャッシュミス、二度目がキャッシュヒットになった場合の概念図です。<a href="/study/images/os/windows-file-cache.svg" target="_blank" rel="noopener noreferrer">読み取り経路の図を拡大</a></figcaption>
</figure>

**常駐**はページの内容が物理メモリにある状態です。ファイルを開くと、その内容を扱うための情報が用意されます。必要なページがRAMに載る時点や、再利用されるまで残る期間は、アクセスの履歴とメモリの状況で変わります。ページがワーキングセットから外れた後もRAMに残る場合があり、その間は再び使えます。アプリが `CloseHandle` して開き直す場合も、ファイルの内容がすでにRAMにある可能性があります。[Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching) · [Microsoft: Working Set](https://learn.microsoft.com/en-us/windows/win32/memory/working-set)

仮想アドレスにファイルの範囲を対応付ける場合も、アクセスしたときにページが必要になります。ページフォルトにはRAMに残っているページを使う場合と、保存先からページ内容を取り寄せる場合があります。ある時点でどのファイルのページがRAMにあるかは、SysinternalsのRAMMapの `File Summary` や `File Details` で調べられます。個々の読み取りの前後関係を追うには、時系列のトレースを使います。[メモリマップドファイル](/os/memory-mapped-files.html) · [Microsoft: Working Set](https://learn.microsoft.com/en-us/windows/win32/memory/working-set) · [Microsoft: RAMMap](https://learn.microsoft.com/en-us/sysinternals/downloads/rammap)

## 先読みとアクセスパターンのヒント

先読み（read-ahead）は後で要求されそうなファイル範囲をあらかじめ取得する処理です。例えばアプリが範囲Aに続いてBを読むとき、その時点でBを取得済みなら待ち時間を短くできます。先読みした範囲を使わなくても、取得に使った帯域とキャッシュ領域は消費します。Windowsやファイルシステムが先読みの範囲やタイミングを決めるため、アプリが要求したバイト数と下位で取得したバイト数は異なり得ます。[Microsoft: CcScheduleReadAhead](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ccschedulereadahead) · [Microsoft: CcSetReadAheadGranularity](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ccsetreadaheadgranularity)

| `CreateFileW` の指定 | 想定する使い方 |
| --- | --- |
| どちらのヒントも指定しない | OSの標準のキャッシュ方針を使う。読み方が混在する場合や比較実験の基準にできる。 |
| `FILE_FLAG_SEQUENTIAL_SCAN` | 先頭から末尾へ進む読み方を伝える。大きなファイルを前方に向かって走査する処理に合う。 |
| `FILE_FLAG_RANDOM_ACCESS` | 離れたオフセットへ飛ぶ読み方を伝える。Windows Serverの資料では、この指定でキャッシュマネージャーがファイルデータの先読みを抑えると説明している。 |

ヒントを使う場合は、ファイルを開くときに読み方に合う方を一つ選びます。`FILE_FLAG_RANDOM_ACCESS` でも、すでにキャッシュにあるデータは利用できます。キャッシュ保持への影響はWindowsの版によって異なり、大きなファイルを多数開く構成ではメモリ使用量も測ります。[Microsoft: CreateFileW のキャッシュ動作](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew#caching-behavior) · [Microsoft: Windows Serverのキャッシュ調査](https://learn.microsoft.com/en-us/windows-server/administration/performance-tuning/subsystem/cache-memory-management/troubleshoot#system-file-cache-contains-memory-mapped-files)

## OSのデータキャッシュを迂回する場合

`FILE_FLAG_NO_BUFFERING` を付けて開いたハンドルから読み取ると、Windowsのファイルデータキャッシュを迂回します。比較する場合は、通常の読み取りとは別の経路として測ります。ファイルシステムのメタデータやデバイス側のキャッシュは別の層です。例えばOSがデバイスに読み取りを渡したあと、機器が保持していたデータで応答できる場合があります。[Microsoft: CreateFileW のキャッシュ動作](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew#caching-behavior) · [Microsoft: File Buffering](https://learn.microsoft.com/en-us/windows/win32/fileio/file-buffering)

この指定では**ファイル内オフセット、要求サイズ、バッファのアドレス**をそれぞれ確認します。オフセットとサイズは対象ボリュームのセクターサイズの倍数にします。バッファのアドレスについては、Microsoftはストレージの物理セクター境界にそろえるよう推奨しています。論理セクターと物理セクターはサイズが異なる場合があるため、実際の対象で照会します。例えば論理が512バイト、物理が4,096バイトなら、オフセット8,192、要求サイズ4,096、4,096バイト境界にそろえたバッファは、それぞれの条件を満たします。[Microsoft: File Bufferingのアラインメント要件](https://learn.microsoft.com/en-us/windows/win32/fileio/file-buffering#alignment-and-file-access-requirements) · [Microsoft: セクター情報を照会するFILE_STORAGE_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_storage_info)

## 計測で初回と再読み取りを比べる

初回と再読み取りで同じファイル、範囲、要求サイズを使い、要求時刻、完了時刻、読めたバイト数を記録します。**コールド**は対象範囲が比較対象のキャッシュにない状態、**ウォーム**は必要なデータがすでにある状態です。初回でも、ファイルを作った直後や、別のプロセスが先に読んだ範囲はウォームになり得ます。記録の上では「初回」「再読み取り」という実行順と、トレースから推定したキャッシュ状態を分けます。[Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching)

アプリの所要時間、ファイル操作のトレース、OSが記録したディスクI/Oの時系列を見比べます。同じ範囲の要求が完了し、対応するディスク読み取りが再試行で減った場合は、キャッシュ再利用を説明する材料になります。先読みが計測区間の外で済んでいた可能性や、記録できたイベントの種類も合わせて確認します。[WindowsでファイルI/Oを計測する](/tools/windows/file-io-tracing.html) · [ファイル読み取りをトレースで観察する実践](/practice/io/file-io-trace-observation.html)

## ゲームのアセットで読み取りの単位を決める

パックファイルから近い範囲を何度も小分けに読む場合は、一つの要求にまとめるとAPI呼び出しや完了処理を減らせます。離れた範囲まで広げると使わないデータを読むので、まとめる前後で要求数と実際の読取量を比べます。ゲーム側が優先度の低い先読みでキューを埋めると、あとから必要になった要求が待つことがあります。同時発行数と保持する受取バッファの総量に上限を設け、長く待った要求やフレーム時間も確認します。例えば最大8件に各256 KiBを用意すると、読み取り中の受取バッファだけで最大2 MiBです。完了後に展開を待つデータには別の上限を設けます。[非同期I/Oの要求と完了](/os/asynchronous-file-io.html) · [ゲームのアセットロード設計](/game/asset-loading.html)

アセットを使える時刻まで追うときは、読み取りの待ち、CPUでの展開、GPUへの転送と利用可能になる時刻を別々に記録します。読み取りが短縮されても、展開や転送で待っていればアセットが使える時刻はあまり変わりません。セーブデータの書き込みを調べる場合は、キャッシュから読める時点と障害後も残る条件を区別します。[アセットの状態と寿命](/game/asset-loading.html) · [ファイルの書き込みと永続化](/os/file-write-and-durability.html)
