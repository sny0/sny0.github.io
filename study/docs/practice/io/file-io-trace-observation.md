---
title: Windowsで2回のファイル読み取りをトレースする
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: os
  collection: file-io-trace-observation
  order: 1
  summary: 64 MiBのファイルを2回読み、ProcmonとWPR・WPAでファイル操作とディスクI/Oの記録を読み分ける。
  aliases: [Procmon, Process Monitor, WPR, WPA, ETW, File I/O, Disk Usage, ファイルI/O計測]
  verification: Windows x64のMSVCで通常・非バッファーの両モードを実行。WPRのプロファイル名と構文、WPAとProcmonの操作をMicrosoft資料に照合（2026-11-06）
---

# Windowsで2回のファイル読み取りをトレースする

同じ64 MiBのファイルを、同じプロセスで先頭から2回読みます。C++の出力でアプリが取得したバイト数を確認し、Process Monitorでファイル操作、Windows Performance Analyzerでファイル操作とディスクI/Oを観察します。ファイルキャッシュから返る読み取りは、アプリにバイトが届いても、その読み取りに対応するディスクI/Oが記録されない場合があります。[Windowsのファイルキャッシュ](/os/windows-file-cache.html) · [ファイルI/Oの計測方法](/tools/windows/file-io-tracing.html)

## 手元で動かす {#run-locally}

Windowsのローカルドライブに空の作業フォルダーを作り、<a href="/study/samples/io/file-io-trace-observation/file_io_trace.cpp" download>file_io_trace.cpp</a>を保存します。Visual Studioの **x64 Native Tools Command Prompt** でそのフォルダーを開き、次を実行します。ビルドとサンプルの実行には、作業フォルダーへの通常の書き込み権限があれば足ります。[Microsoftのコマンドライン用C++ツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170)

```bat
cl /nologo /std:c++20 /EHsc /O2 /W4 /WX file_io_trace.cpp
file_io_trace.exe prepare
file_io_trace.exe read buffered
```

`prepare`は作業フォルダーに`study-io-fixture.bin`を新規作成し、内容をフラッシュして閉じます。同名のファイルがあると作成を中止します。トレースを取るときは、準備済みのファイルをそのまま使い、記録中に実行するのは`read`だけです。`read`の既定モードは`buffered`です。

`read`は1 MiBずつ2周読み、プロセスID（PID）、各周の開始・終了のUTC時刻、`calls`、`bytes`、`checksum`、`read_ms`を出力します。通常は各周`calls=64`、`bytes=67108864`となり、チェックサムが一致します。各周の`read_ms`は`ReadFile`呼び出しに費やした時間の合計です。呼び出しの間のチェックサム計算と、2周の間に置いた750ミリ秒の待ち時間は集計から外しています。この間隔と先頭オフセットに戻る位置を使って、トレースの2周を見分けます。

実行結果のうち、各周の集計行を抜き出した例です。`read_ms`は環境と実行時の状態で変わります。

```text
pass=1 mode=buffered calls=64 bytes=67108864 checksum=8555990276 read_ms=12.002
pass=2 mode=buffered calls=64 bytes=67108864 checksum=8555990276 read_ms=10.648
```

## Process Monitorでファイル操作を観察する

Microsoft Sysinternalsの**Process Monitor**（Procmon）を管理者権限で起動します。起動直後に記録が始まった場合は、**File → Capture Events**（`Ctrl+E`）でいったん停止します。**Edit → Clear Display**で現在の一覧を空にし、**Filter → Filter…**で次の表示条件を追加します。以前の調査の条件が残っている場合は先にリセットします。[MicrosoftのProcmonによる記録手順](https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/troubleshoot-apps-start-failure-use-process-monitor) · [SysinternalsのProcess Monitor](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon)

| 項目 | 条件 | 値 | アクション |
| --- | --- | --- | --- |
| Process Name | is | `file_io_trace.exe` | Include |
| Path | ends with | `\study-io-fixture.bin` | Include |

記録を開始し、作業フォルダーで`file_io_trace.exe read buffered`を1回実行します。終了後すぐに記録を止めます。一覧で出力と同じPIDを確認し、`ReadFile`を開いて**Result**と**Detail**の`Offset`、`Length`を見ます。通常はオフセット0から1 MiBずつ進む読み取りが続き、2周目でオフセット0に戻ります。読み取りに絞る場合は`Operation is ReadFile → Include`を追加します。

Procmonで確認したのは、対象プロセスが対象ファイルに行った操作です。`SUCCESS`の行はキャッシュからデータを受け取った場合にも現れます。行の件数とディスク要求の件数は、それぞれ別に数えます。Procmonの表示フィルターは記録を保持したまま切り替えられるため、`.pml`を保存する場合は手元の作業フォルダーで扱います。[Sysinternalsのフィルターとログ形式の説明](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon)

## WPRで記録し、WPAで2つの層を重ねる

**Windows Performance Recorder**（WPR）でETWのイベントを採取し、**Windows Performance Analyzer**（WPA）で開きます。WPRのコマンドライン版はWindowsに含まれ、WPAはWindows ADKの**Windows Performance Toolkit**から導入できます。Procmonの記録を止めてから、管理者権限のコマンドプロンプトを同じ作業フォルダーで開きます。[MicrosoftのWPRとWPAの手順](https://learn.microsoft.com/en-us/troubleshoot/windows-server/support-tools/support-tools-xperf-wpa-wpr) · [Windows ADKの入手先](https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install)

`wpr -profiles`で`FileIO`と`DiskIO`があることを、`wpr -status`で別の記録が動いていないことを確認します。次の開始コマンドが成功したら、読み取りと停止を実行します。ここでは短い区間を既定のメモリモードで記録し、停止時に`.etl`へ保存します。[WPRのコマンドライン仕様](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/wpr-command-line-options)

```bat
wpr -start FileIO -start DiskIO
file_io_trace.exe read buffered
wpr -stop buffered.etl "Two buffered reads of study fixture"
```

自分で開始した記録を保存せずに中止する場合は`wpr -cancel`を使います。収集中の`wpr -status collectors`ではコレクターごとの`Events Lost`を確認できます。欠落が見つかった場合は計測区間を短くして採り直します。`.etl`には他プロセスのイベントやファイル名も含まれるため、外に出すのは自分で確認した集計値に留めます。[WPRの状態確認と中止](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/wpr-command-line-options) · [ETWのセッションと欠落](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/sessions)

1. `buffered.etl`をWPAで開き、**Graph Explorer → Storage**から**File I/O**と**Disk Usage**を同じ**Analysis**タブへ置きます。同じタブのグラフは横軸を共有します。[WPAのグラフ一覧](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/list-of-wpa-graphs)
2. **File I/O**では**Size by File Name, Process, Stack for Read/Write**を手掛かりに、`study-io-fixture.bin`と、その記録の`file_io_trace.exe`のPIDを探します。行の右クリックから**Filter To Selection**で対象を絞り、横軸で読み取りの2周が収まる区間を選びます。選択範囲を右クリックして**Zoom to selected time range**で拡大します。列やプリセットの表示はWPAの版によって異なります。[WPAのフィルター操作](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/search-or-filter-data) · [WPAの時間範囲の操作](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/wpa-step-by-step-guide)
3. 同じ区間を**Disk Usage**で見ます。**Size by Process, Path Name, Stack**のようにパスが見えるプリセットを使い、対象のファイル名と読み取りの区間から対応しそうな行を探します。先読みや別のシステム処理が関わるので、最初からアプリのPIDだけに絞ると候補を見落とします。パスが付かない行や、同じ時間帯の他のI/Oは、対象の読み取りと結び付けられる情報が揃うまで分けて扱います。[Windowsのディスク読み書きイベント](https://learn.microsoft.com/en-us/windows/win32/etw/diskio-typegroup1) · [Windowsのファイル読み書きイベント](https://learn.microsoft.com/en-us/windows/win32/etw/fileio-readwrite)

ProcmonとWPRではサンプルを別々に起動するため、PIDや時刻はそれぞれの記録で照合します。**File I/O**と**Disk Usage**の対応は一つのETLの中で調べます。ファイル内オフセットとディスク上のオフセットは別の位置なので、二つの数値が一致する行を探す手順にはしません。

## 結果を比べる

| 観察点 | 2周で見るもの |
| --- | --- |
| コンソール | それぞれ64 MiBを取得し、チェックサムが一致するか。`read_ms`がどう変化したか。 |
| Procmon／WPAのFile I/O | 同じファイルに対する読み取りが、2周とも記録にあるか。 |
| WPAのDisk Usage | それぞれの区間に、対象へ結び付けられるディスク読み取りがどれくらいあるか。 |

たとえば、2周ともアプリは64 MiBを受け取り、後の周だけ対象のディスク読み取りが少ない場合、キャッシュが再利用された場合と整合します。2周とも対象のディスク読み取りが少ないこともあります。`prepare`で書いたファイルのデータはフラッシュ後もキャッシュに残る場合があり、直前の試行も状態を変えます。ディスクI/Oを見つけたときに確認できるのは、OSがその層で要求を観測したことまでです。SSD内部での処理は機器側のキャッシュや制御にも依存します。[Windowsのファイルキャッシュ](/os/windows-file-cache.html) · [書き込みとフラッシュ](/os/file-write-and-durability.html)

追加の比較では`file_io_trace.exe read unbuffered`を使い、別の短い記録を`unbuffered.etl`に保存します。このモードは`FILE_FLAG_NO_BUFFERING`を指定し、位置・長さ・バッファのアラインメント条件を確認します。環境によって条件を満たせない場合は、通常モードでの観察まで進められます。二つのモードでバイト数とチェックサムを照合したうえで、ディスク側の記録を比べます。[Microsoftのファイルバッファリングの仕様](https://learn.microsoft.com/en-us/windows/win32/fileio/file-buffering)

[前回のIOCPサンプル](/practice/io/iocp-observation.html)もProcmonで観察できます。その場合は`iocp_observation.exe`をプロセス名とパスの手掛かりにします。実行ファイル自身の先頭2バイトを2件の要求で読み、IOCPから完了を回収します。ファイルに対する読み取りと、プログラムが完了を回収する時点を別々に追えます。

## ソース

<<< @/public/samples/io/file-io-trace-observation/file_io_trace.cpp{cpp}
