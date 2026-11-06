---
title: WindowsのファイルI/OをProcmonとWPRで追う
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: tools
  summary: Procmonのファイル操作と、WPAのFile I/O・Disk Usageを使い分ける。時刻・パス・プロセスを手掛かりに、アプリの読み取りと下位のディスク要求の関係を調べる。
  aliases: [Process Monitor, Procmon, WPR, WPA, ETW, ETL, File I/O, Disk Usage, Disk Service Time, I/Oトレース]
  verification: MicrosoftのSysinternals、Windows Performance Toolkit、ETWイベント仕様に照合（2026-11-06）
---

# WindowsのファイルI/OをProcmonとWPRで追う

ゲームがアセットを読み込むとき、ファイルを開けたか、データがどのくらい届いたか、ストレージへの要求が発生したかは、それぞれ観測する場所が違います。**Process Monitor（Procmon）**では、ファイルシステムの操作をパス・結果・スレッドスタックと一緒に調べられます。**Windows Performance Recorder（WPR）**で記録し、**Windows Performance Analyzer（WPA）**で開くと、ファイル操作と下位のディスク要求を共通の時間軸で見比べられます。[MicrosoftのProcmon資料](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon) · [WPRとWPAの概要](https://learn.microsoft.com/en-us/troubleshoot/windows-server/support-tools/support-tools-xperf-wpa-wpr)

<figure class="study-figure">
  <img src="/images/tools/file-io-tracing.svg" alt="同じファイル範囲を2回読む架空の時間軸。アプリの要求AとBに対応する2件のファイル操作がある。Aの間にはディスク読み取りが1件あり、BはOSに残ったデータで完了して下位の読み取りを発行しない。" width="760" height="410" loading="lazy">
  <figcaption>同じ範囲を2回読む概念例です。Aで取得したデータがOSに残っていれば、Bのファイル操作はディスクへの新しい読み取りを伴わずに終わります。<a href="/study/images/tools/file-io-tracing.svg" target="_blank" rel="noopener noreferrer">観測位置の図を拡大</a></figcaption>
</figure>

## Procmonでファイル操作と結果を見る

対象のプロセス名またはPID、ファイルのパス、操作の種類で絞り込みます。`CreateFile`の行で、パスを開く処理の結果や要求されたアクセス権を調べます。`ReadFile`の行では、ファイル先頭からのオフセットと読み取り長などを確認します。操作を開いて`Stack`を表示すると、記録された呼び出し元をたどれます。シンボルが解決できると、どのライブラリやアセットローダーから来た操作かを絞りやすくなります。[MicrosoftのProcmon資料](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon) · [ファイルを開いて読むまで](/os/file-read-journey.html)

たとえば、ロードの失敗なら`CreateFile`で`NAME NOT FOUND`や`ACCESS DENIED`が出たパスを確認します。候補の場所を順に探すアプリでは、途中の候補が見つからなくても、後続のパスで開けることがあります。対象機能が最終的にどのパスを開いたかまで追います。`ReadFile`の結果が`SUCCESS`であれば、まずファイルシステムで読み取りが成功した行として扱います。そのデータの取得経路は、OSのファイルキャッシュとディスク側の記録を照合して調べます。[Microsoftのアクセス拒否の調査例](https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/troubleshoot-apps-start-failure-use-process-monitor) · [ファイルが見つからない場合の調査例](https://learn.microsoft.com/en-us/windows/msix/psf/psf-current-working-directory) · [Windowsのファイルキャッシュ](/os/windows-file-cache.html)

## WPRで記録し、WPAで層を並べる

**ETW（Event Tracing for Windows）**は、OSやアプリなどが出すイベントを記録する仕組みです。WPRではプロファイルを選んで対象のイベントを記録し、`.etl`に保存します。ファイル操作とディスク要求を調べるときは、`File I/O activity`と`Disk I/O activity`を選び、同じ実行の区間を記録します。WPAで開き、`Storage`の`File I/O`と`Disk Usage`を表示します。[WPRのセッションとバッファ](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/sessions) · [WPRの記録プロファイル](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/recording-for-resource-based-analysis) · [WPAのグラフ一覧](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/list-of-wpa-graphs)

| 観測する場所 | 主な手掛かり | 調べたいこと |
| --- | --- | --- |
| アプリのログ | 要求ID、PID、パス、ファイル内オフセット、要求長、実際のバイト数 | どのアセット処理が読み取りを出し、どの段階で結果を受け取ったか |
| Procmon | 操作、パス、結果、詳細、スレッドスタック | 開けなかったファイルや、意図せず繰り返したファイル操作はどれか |
| WPAの`File I/O` | プロセス、スレッド、ファイル名、種類、サイズ、時間 | 指定区間に、どのファイル操作がどれくらい発生したか |
| WPAの`Disk Usage` | ディスク、種類、サイズ、パス、サービス時間 | Windowsのストレージ側で、どの要求が処理されたか |

## 同じ時間軸で対応を絞る

1. アプリがログに出したパスとPIDを使い、`File I/O`で対象のプロセスと操作を絞ります。対象の読み取りが集まる区間を選び、`Disk Usage`も同じ区間に拡大します。
2. `Disk Usage`では操作の種類、パス、サイズ、時刻を照合します。対象アプリのPIDの行に加えて、`System`などの行も確認します。先読みや遅延書き込みは、元のアプリの呼び出しと別のスレッドや時刻に処理される場合があります。名前を特定できなかった行も含めて確認します。[Microsoftのキャッシュマネージャーとワーカーの解説](https://learn.microsoft.com/en-us/windows-server/administration/performance-tuning/role/file-server/smb-file-server)
3. 一つのファイル操作に対応するディスク要求の数は、キャッシュやファイルの配置に応じて変わります。たとえば小さな読み取りに対して先読みで広い範囲が取得され、後の読み取りもそのデータで済むことがあります。ファイルイベントのオフセットは**ファイル先頭**、ディスクイベントのオフセットは**ディスク先頭**を基準にします。両方の数字をそのまま照合すると、別の位置を比べることになります。[ETWのFileIo_ReadWrite](https://learn.microsoft.com/en-us/windows/win32/etw/fileio-readwrite) · [ETWのDiskIo_TypeGroup1](https://learn.microsoft.com/en-us/windows/win32/etw/diskio-typegroup1) · [Windowsのファイルキャッシュ](/os/windows-file-cache.html)

時刻を突き合わせる場合は基準をそろえます。たとえばアプリの開始からの経過時間とWPAのトレース開始からの経過時間を使う場合、アプリの起動など、両方で識別できる出来事を基点にします。短い処理が並ぶ区間ではパス・種類・サイズも使って候補を絞ります。

## 時間が長い場所を切り分ける

`Disk Usage`の`IO Time`と`Disk Service Time`を見比べると、Windowsでディスク要求を処理する過程のうち、待ち行列を含む時間とサービス時間を区別できます。ファイルを読み始めてからゲームが使えるまでの時間には、これに加えて、ファイルシステムの処理、完了通知をワーカーが取り出すまでの時間、展開や解析などが含まれます。アプリでも発行と回収の時刻を記録し、非同期読み取りの時間と、その結果を使う時間を分けます。[WPAでディスク利用を分析する例](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/optimizing-performance-and-responsiveness-exercise-2#step-5-analyze-process-disk-usage) · [I/O完了ポート](/os/io-completion-ports.html) · [実行時のアセットロード](/game/asset-loading.html)

ディスク要求が見えた場合、確認できるのはWindowsから見たストレージI/Oです。たとえばSSDが内部キャッシュで応答したか、フラッシュメモリから読んだかを知るには、デバイス側の観測が必要です。対応するディスク読み取りが見えない場合は、対象のプロファイル・期間・フィルターを確かめ、イベントの欠落がないか確認した上で、OSのキャッシュで処理された可能性を調べます。[Microsoftのファイルバッファリング資料](https://learn.microsoft.com/en-us/windows/win32/fileio/file-buffering) · [ETWのDiskIo_TypeGroup1](https://learn.microsoft.com/en-us/windows/win32/etw/diskio-typegroup1)

## 比較できる記録を取る

対象の操作を短く再現し、使うプロファイルを絞ります。ファイルへ記録する設定では、トレースファイルの書き込み自体もディスク使用量に加わります。メモリへ記録する設定では、長く続けると古いイベントが上書きされます。記録時に`Events dropped`が増えた場合は、対象区間を短くしたりプロファイルを減らしたりして、記録を取り直します。[WPRの記録モード](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/logging-mode) · [WPRでイベント欠落を調べる方法](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/wpr-how-to-topics#avoid-lost-events)

記録にはファイルのパス、プロセス名やコマンドライン、環境によってはユーザー名なども含まれます。結果を教材やチケットに載せるときは、試験用の名前で再現し、必要な行を抜き出して共有します。Procmonの通常の表示フィルターは、元の記録にあるイベントを保持します。[MicrosoftのProcmon資料](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon) · [WPRで記録に含まれる情報](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/wpr-how-to-topics#stop-a-recording)

手元では、同じファイルに対する読み取りを繰り返し、アプリの出力とツールの記録を比べられます。[ファイル読み取りをトレースする実践](/practice/io/file-io-trace-observation.html)
