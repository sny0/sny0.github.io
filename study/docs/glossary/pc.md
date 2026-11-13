---
{
  "title": "PC・OS・ハードウェアの用語集",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "reference",
    "format": "glossary",
    "domain": "terms",
    "summary": "PC・OS・ハードウェアで使う語の定義、用例、関連する解説記事。"
  }
}
---

# PC・OS・ハードウェアの用語集

[用語集の入口・全用語検索](/glossary/)

読み順で 55 項目を掲載しています。

## IRQ {#irq}

**IRQ / Interrupt Request** ／ 読み あいあーるきゅー / わりこみようきゅう

機器などがCPU側に処理を求める割り込み要求。「IRQ番号」は、OSや機器の割り込みを識別する番号を指す。

**例**　LinuxでIRQごとの割り込み回数を確認する。

**関連**　[NICの受信キュー](/hardware/io/nic-receive-queues.html) · [割り込み](/glossary/pc.html#interrupt) · [ドライバー](/glossary/pc.html#driver)

**出典**　[Linuxカーネル文書 — 割り込みの処理](https://docs.kernel.org/core-api/genericirq.html) · [Intel — Intel 64・IA-32 Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)

## IOMMU {#iommu}

**IOMMU / Input–Output Memory Management Unit** ／ 読み あいおーえむえむゆー

機器がDMAで指定するアドレスを変換し、その機器がアクセスできるメモリの範囲を制御する仕組み。

**例**　IOMMUで機器に見せるDMA先を設定する。

**関連**　[DMAとIOMMU](/hardware/io/dma-and-iommu.html) · [DMA](/glossary/pc.html#dma) · [仮想メモリ](/glossary/pc.html#virtual-memory)

**出典**　[Linuxカーネル文書 — DMAマッピング](https://docs.kernel.org/core-api/dma-api-howto.html)

## Ethernetフレーム {#ethernet-frame}

**Ethernet frame** ／ 読み いーさねっとふれーむ

Ethernetのリンクでやり取りするデータの単位。送信元と宛先のMACアドレスなどの情報と、運ぶデータを含む。

**この分野での意味**　例えばIPv4のパケットは、Ethernetフレームのデータ部分に入れて同じリンク上の機器へ送る。

**例**　ルーターへ送るEthernetフレームに、次の機器のMACアドレスを入れる。

**関連**　[IPの経路選択とEthernet](/network/ip-routing-and-ethernet.html) · [割り込み](/glossary/pc.html#interrupt) · [スループット](/glossary/pc.html#throughput)

**出典**　[IETF RFC 894 — EthernetフレームでのIPデータグラムの伝送](https://datatracker.ietf.org/doc/rfc894/)

## ウォッチドッグ {#watchdog}

**watchdog / watchdog timer** ／ 読み うぉっちどっぐ

一定時間ごとに進行を示す通知を待ち、途絶えたときに再起動や診断などを行う監視機構。

**例**　OSが通知を返せなくなり、ウォッチドッグが機器を再起動した。

**関連**　[ハング](/glossary/pc.html#hang) · [フリーズ](/glossary/pc.html#freeze)

**出典**　[Linuxカーネル文書 — ウォッチドッグAPI](https://docs.kernel.org/watchdog/watchdog-api.html) · [UEFI Forum — UEFI 2.11、Boot Manager](https://uefi.org/specs/UEFI/2.11/03_Boot_Manager.html)

## カーネル {#kernel}

**kernel / operating system kernel** ／ 読み かーねる

OSの中核。CPUで実行する仕事の割り当て、メモリ、機器へのアクセスなどを管理する。

**この分野での意味**　GPU計算では、デバイス上で多くの処理単位に実行させる関数をカーネルと呼ぶこともある。

**例**　カーネルがファイルを読む要求を処理する。

**関連**　[OSの役割とユーザーモード・カーネル](/os/operating-system-basics.html) · [システムコール](/glossary/pc.html#system-call) · [カーネルモード](/glossary/pc.html#kernel-mode) · [ドライバー](/glossary/pc.html#driver)

**出典**　[Microsoft — ユーザーモードとカーネルモード](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode) · [Microsoft — プロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads) · [Linuxカーネル文書 — メモリ管理の概念](https://docs.kernel.org/admin-guide/mm/concepts.html)

## カーネルモード {#kernel-mode}

**kernel mode** ／ 読み かーねるもーど

OSの中核や一部のドライバーが、CPUの特権操作や保護されたメモリにアクセスできる実行状態。

**例**　システムコールでカーネルモードの処理へ移る。

**関連**　[システムコールと特権](/os/system-calls-and-privilege.html) · [ユーザーモード](/glossary/pc.html#user-mode) · [システムコール](/glossary/pc.html#system-call) · [カーネル](/glossary/pc.html#kernel)

**出典**　[Microsoft — ユーザーモードとカーネルモード](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode) · [Intel — Intel 64・IA-32 Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)

## 仮想メモリ {#virtual-memory}

**virtual memory** ／ 読み かそうめもり

プログラムが使うアドレスを物理メモリなどの裏付けと分け、OSが配置とアクセス権を管理する仕組み。

**この分野での意味**　RAM不足時のスワップは、仮想メモリの用途の一つ。

**例**　別々のプロセスが同じ仮想アドレスを使う。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [ページング](/glossary/pc.html#paging) · [ページテーブル](/glossary/pc.html#page-table) · [スワップ](/glossary/pc.html#swap)

**出典**　[Linuxカーネル文書 — メモリ管理の概念](https://docs.kernel.org/admin-guide/mm/concepts.html) · [Linuxカーネル文書 — ページテーブル](https://docs.kernel.org/mm/page_tables.html)

## 環境変数 {#environment-variable}

**environment variable** ／ 読み かんきょうへんすう

プロセスに渡される名前と値の組。実行環境の設定やコマンド探索先を指定できる。

**この分野での意味**　Windowsでは既定で子プロセスに親の環境が継承される。親が起動後に変更した値まで自動で伝わるわけではない。

**例**　環境変数PATHに開発ツールのディレクトリを追加する。

**関連**　[ターミナル・シェル・コマンド](/tools/terminal-shell-and-commands.html) · [プロセス](/glossary/pc.html#process) · [パス](/glossary/pc.html#path) · [レジストリ](/glossary/pc.html#registry)

**出典**　[Microsoft — 環境変数](https://learn.microsoft.com/en-us/windows/win32/procthread/environment-variables) · [Microsoft — PATHの探索先](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/path)

## キャッシュ {#cache}

**cache** ／ 読み きゃっしゅ

使いそうなデータや結果を再利用しやすい場所に置いて、次の取得や計算を省く仕組み。

**この分野での意味**　CPUキャッシュは主にメモリの内容、OSのファイルキャッシュはファイルの内容、アセットビルドのキャッシュは変換済み成果物を保持する。

**例**　よく読むデータがCPUキャッシュに収まる。

**関連**　[RAM・キャッシュ・ストレージの違い](/hardware/memory/ram-cache-and-storage.html) · [Windowsのファイルキャッシュ](/os/windows-file-cache.html) · [キャッシュヒット](/glossary/pc.html#cache-hit) · [キャッシュミス](/glossary/pc.html#cache-miss) · [キャッシュライン](/glossary/pc.html#cache-line)

**出典**　[Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html) · [Microsoft — ファイルキャッシュ](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching)

## キャッシュライン {#cache-line}

**cache line / cache block** ／ 読み きゃっしゅらいん

CPUキャッシュがメモリの内容を保持し、取得や更新を行う単位。1回のアクセスで近接する複数の値が同じラインに入ることがある。

**例**　配列を順番に読み、取り込んだキャッシュライン内の値を使い切る。

**関連**　[キャッシュ局所性とAoS・SoA](/runtime/memory/cache-locality-aos-soa.html) · [キャッシュ](/glossary/pc.html#cache) · [キャッシュミス](/glossary/pc.html#cache-miss)

**出典**　[Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html)

## クラッシュ {#crash}

**crash** ／ 読み くらっしゅ

エラーなどでアプリやOSが異常終了すること。

**この分野での意味**　現場で「落ちる」と言うこともある。操作に応答しなくてもプロセスが残る場合は、ハングとして扱うことが多い。

**例**　セーブ直後にクラッシュしたため、ダンプを調べる。

**関連**　[ハング](/glossary/pc.html#hang) · [クラッシュダンプ](/glossary/pc.html#crash-dump) · [ブルースクリーン](/glossary/pc.html#blue-screen)

**出典**　[Microsoft — アプリケーションとサービスのクラッシュ](https://learn.microsoft.com/en-us/troubleshoot/windows-server/performance/troubleshoot-application-service-crashing-behavior) · [Microsoft — ユーザーモードダンプ](https://learn.microsoft.com/en-us/windows/win32/wer/collecting-user-mode-dumps)

## クラッシュダンプ {#crash-dump}

**crash dump / memory dump** ／ 読み くらっしゅだんぷ / めもりだんぷ

異常終了時などに、原因を調べるためメモリやスレッドの状態を保存したファイル。

**例**　クラッシュダンプと対応するシンボルをデバッガーで開く。

**関連**　[クラッシュ](/glossary/pc.html#crash) · [ブルースクリーン](/glossary/pc.html#blue-screen)

**出典**　[Microsoft — ユーザーモードダンプ](https://learn.microsoft.com/en-us/windows/win32/wer/collecting-user-mode-dumps) · [Microsoft — Bug Checkと停止コード](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-checks--blue-screens-)

## コンテキストスイッチ {#context-switch}

**context switch** ／ 読み こんてきすとすいっち

CPUで実行するスレッドなどを切り替え、前の実行状態を保存して次の実行状態を復元すること。

**例**　入力待ちに入ったスレッドから別のスレッドへ切り替える。

**関連**　[スレッドのスケジューリング](/os/thread-scheduling.html) · [スレッド](/glossary/pc.html#thread) · [スケジューラー](/glossary/pc.html#scheduler)

**出典**　[Microsoft — コンテキストスイッチ](https://learn.microsoft.com/en-us/windows/win32/procthread/context-switches)

## サービス {#service}

**service / Windows service** ／ 読み さーびす

Windowsで、サービスコントロールマネージャーに登録して開始・停止などを管理するプログラム。

**この分野での意味**　オンライン開発でいう「サービス」は、ネットワーク越しに機能を提供するシステムも指す。

**例**　ログオン前にサーバー用のWindowsサービスを起動する。

**関連**　[デーモン](/glossary/pc.html#daemon) · [プロセス](/glossary/pc.html#process) · [レジストリ](/glossary/pc.html#registry)

**出典**　[Microsoft — Windowsサービス](https://learn.microsoft.com/en-us/windows/win32/services/about-services)

## システムコール {#system-call}

**system call / syscall** ／ 読み しすてむこーる / しすこーる

プログラムがOSカーネルに処理を要求するためのインターフェース。

**この分野での意味**　公開APIの中にはユーザーモードだけで完了するものや、複数のシステムコールを発行するものもある。

**例**　OSへ新しいファイルディスクリプターの取得を要求する。

**関連**　[システムコールと特権](/os/system-calls-and-privilege.html) · [カーネル](/glossary/pc.html#kernel) · [ユーザーモード](/glossary/pc.html#user-mode) · [ファイルディスクリプター](/glossary/pc.html#file-descriptor)

**出典**　[Linux man-pages — syscall(2)](https://man7.org/linux/man-pages/man2/syscall.2.html) · [Microsoft — ユーザーモードとカーネルモード](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode)

## スケジューラー {#scheduler}

**scheduler / thread scheduler** ／ 読み すけじゅーらー

実行できるスレッドのうち、どれをいつ、どの論理プロセッサで実行するか決める仕組み。

**この分野での意味**　エンジン内のジョブスケジューラーは、仕事をワーカースレッドに割り振る。

**例**　スケジューラーが実行可能になったスレッドにCPUを割り当てる。

**関連**　[スレッドのスケジューリング](/os/thread-scheduling.html) · [スレッド](/glossary/pc.html#thread) · [コンテキストスイッチ](/glossary/pc.html#context-switch)

**出典**　[Microsoft — プロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads) · [Microsoft — コンテキストスイッチ](https://learn.microsoft.com/en-us/windows/win32/procthread/context-switches)

## スループット {#throughput}

**throughput** ／ 読み するーぷっと

単位時間あたりに処理や転送を完了できる量。測定では仕事の種類と条件をそろえる。

**この分野での意味**　一つの要求にかかる時間を表すレイテンシと区別する。複数の仕事を並行に進めると、待ち時間が同じでも完了する件数を増やせる。

**例**　データを展開する処理のスループットをMB/sで比べる。

**関連**　[DRAMチャネルと帯域](/hardware/memory/dram-channels-and-bandwidth.html) · [レイテンシ](/glossary/pc.html#latency) · [帯域](/glossary/pc.html#bandwidth)

**出典**　[IETF RFC 1242 — ネットワーク機器の計測用語](https://www.rfc-editor.org/info/rfc1242/) · [Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html)

## スレッド {#thread}

**thread** ／ 読み すれっど

OSがCPUに割り当てる実行の流れ。同じプロセスのスレッドは通常アドレス空間を共有し、スタックや実行位置をそれぞれ持つ。

**例**　描画とデータの展開を別スレッドに分ける。

**関連**　[スレッドと同期](/runtime/thread-synchronization.html) · [プロセス](/glossary/pc.html#process) · [コンテキストスイッチ](/glossary/pc.html#context-switch) · [スケジューラー](/glossary/pc.html#scheduler)

**出典**　[Microsoft — プロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

## スワップ {#swap}

**swap / swap space / paging file** ／ 読み すわっぷ

RAMに置いていたページの内容を退避し、必要になったときに戻す仕組み。退避に使う領域も指す。

**この分野での意味**　OSによって仕組みや呼び方が異なる。Windowsにはページファイルがあり、描画でいうswap chainの画像切り替えとは用途が違う。

**例**　RAMの使用量が増えてスワップ領域への書き出しが起きる。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [仮想メモリ](/glossary/pc.html#virtual-memory) · [ワーキングセット](/glossary/pc.html#working-set) · [ページフォルト](/glossary/pc.html#page-fault)

**出典**　[Linuxカーネル文書 — メモリ管理の概念](https://docs.kernel.org/admin-guide/mm/concepts.html) · [Microsoft — 64ビットWindowsのページファイル](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/how-to-determine-the-appropriate-page-file-size-for-64-bit-versions-of-windows)

## 帯域 {#bandwidth}

**bandwidth / data transfer bandwidth** ／ 読み たいいき

メモリや通信路が単位時間に転送できるデータ量。理論上の上限を指す場合と実測値を指す場合がある。

**この分野での意味**　信号処理の帯域は、扱う周波数範囲の幅をHzで表すことがある。

**例**　メモリ帯域をGB/sで見積もる。

**関連**　[DRAMチャネルと帯域](/hardware/memory/dram-channels-and-bandwidth.html) · [スループット](/glossary/pc.html#throughput) · [レイテンシ](/glossary/pc.html#latency) · [PCI Express](/glossary/pc.html#pcie)

**出典**　[PCI-SIG — PCI Expressの仕様と帯域](https://pcisig.com/faq?field_category_value%5B%5D=pci_express_7.0) · [Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html) · [ITU-R SM.328-12 — 電波のスペクトルと帯域幅](https://www.itu.int/dms_pubrec/itu-r/rec/sm/R-REC-SM.328-12-202509-I%21%21PDF-E.pdf)

## DMA {#dma}

**DMA / Direct Memory Access** ／ 読み でぃーえむえー

CPUが各データを一つずつ移さず、機器や転送用コントローラーがメモリとのデータ転送を行う仕組み。

**例**　NICが受信データをDMAでRAMへ書く。

**関連**　[DMAとIOMMU](/hardware/io/dma-and-iommu.html) · [IOMMU](/glossary/pc.html#iommu) · [割り込み](/glossary/pc.html#interrupt) · [PCI Express](/glossary/pc.html#pcie)

**出典**　[Linuxカーネル文書 — DMAマッピング](https://docs.kernel.org/core-api/dma-api-howto.html)

## TLB {#tlb}

**TLB / Translation Lookaside Buffer** ／ 読み てぃーえるびー

仮想アドレスから物理アドレスへの変換結果を保持するCPU内のキャッシュ。

**この分野での意味**　TLBミスでも、有効な対応をページテーブルで見つけられれば、通常ページフォルトを起こさずに処理を続けられる。

**例**　広い範囲のページを飛び飛びに読むとTLBミスが増えることがある。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [ページテーブル](/glossary/pc.html#page-table) · [キャッシュミス](/glossary/pc.html#cache-miss) · [ページフォルト](/glossary/pc.html#page-fault)

**出典**　[Linuxカーネル文書 — ページテーブル](https://docs.kernel.org/mm/page_tables.html) · [Intel — Intel 64・IA-32 Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)

## デーモン {#daemon}

**daemon** ／ 読み でーもん

Unix系OSでバックグラウンドに常駐し、要求の受け付けや定期的な処理などを行うプロセス。

**例**　ログを集めるデーモンがシステム起動時に立ち上がる。

**関連**　[サービス](/glossary/pc.html#service) · [プロセス](/glossary/pc.html#process)

**出典**　[systemd — daemon(7)](https://www.freedesktop.org/software/systemd/man/latest/daemon.html)

## ドライバー {#driver}

**driver / device driver** ／ 読み どらいばー

OSの入出力要求を機器や下位層の操作へつなぐソフトウェア。OS上の仮想的な機能を提供するものもある。

**この分野での意味**　Windowsのドライバーには、ユーザーモードで動作するものもある。

**例**　GPUドライバーが描画コマンドの実行を支える。

**関連**　[OSの役割とユーザーモード・カーネル](/os/operating-system-basics.html) · [カーネル](/glossary/pc.html#kernel) · [ファームウェア](/glossary/pc.html#firmware) · [割り込み](/glossary/pc.html#interrupt)

**出典**　[Microsoft — ドライバーの役割](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/what-is-a-driver-) · [Microsoft — ユーザーモードとカーネルモード](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode)

## BIOS {#bios}

**BIOS / Basic Input/Output System** ／ 読み ばいおす

PCの起動時に機器を初期化し、起動用コードへ制御を渡す従来型のファームウェア。

**この分野での意味**　日常的にはUEFI機の設定画面も「BIOS」と呼ばれる。起動方式を指定するときはレガシーBIOSとUEFIを区別する。

**例**　古いPCをレガシーBIOS方式で起動する。

**関連**　[UEFI](/glossary/pc.html#uefi) · [ファームウェア](/glossary/pc.html#firmware) · [電源投入時自己診断](/glossary/pc.html#post)

**出典**　[NIST — Basic Input/Output System](https://csrc.nist.gov/glossary/term/Basic_Input_Output_System) · [Microsoft — Windowsの起動段階](https://learn.microsoft.com/en-us/windows/client-management/advanced-troubleshooting-boot-problems) · [UEFI Forum — UEFI 2.11、Boot Manager](https://uefi.org/specs/UEFI/2.11/03_Boot_Manager.html)

## パス {#path}

**path / pathname** ／ 読み ぱす

ファイルやディレクトリなどの場所を、名前の並びで指定する文字列。

**この分野での意味**　環境変数のPATHはコマンドを探すディレクトリの一覧。描画で英語がpassの場合は処理の一段階を指す。

**例**　設定ファイルの相対パスを作業ディレクトリから解決する。

**関連**　[ファイルとパス](/os/files-and-paths.html) · [ファイルシステム](/glossary/pc.html#file-system) · [環境変数](/glossary/pc.html#environment-variable)

**出典**　[Microsoft — ファイル名、パス、名前空間](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) · [Microsoft — PATHの探索先](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/path)

## ハング {#hang}

**hang / unresponsive** ／ 読み はんぐ / はんぐあっぷ

プロセスやシステムが終了せず、期待した処理の進行や応答が観測できない状態。

**この分野での意味**　フリーズと重なる呼び方。ハングという語だけでは、待機、処理の過負荷、無限ループなどの原因は分からない。

**例**　終了ボタンを押しても応答せず、アプリがハングした。

**関連**　[並行処理のバグ](/runtime/memory/concurrency-bugs.html) · [フリーズ](/glossary/pc.html#freeze) · [クラッシュ](/glossary/pc.html#crash) · [ウォッチドッグ](/glossary/pc.html#watchdog)

**出典**　[Microsoft — Windowsのフリーズ](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/windows-based-computer-freeze-troubleshooting)

## ハンドル {#handle}

**handle / object handle** ／ 読み はんどる

APIでリソースを指定するための値。Windowsではファイルやイベントなど、開いたOSオブジェクトを操作するために使う。

**この分野での意味**　ゲームではスロット番号と世代などでオブジェクトを識別し、DCCツールでは画面上で対象を操作するつまみも指す。

**例**　読み取りを終えたファイルのハンドルを閉じる。

**関連**　[Windowsのハンドル](/os/windows-handles.html) · [世代付きハンドル](/algorithms/generational-handles.html) · [ファイルディスクリプター](/glossary/pc.html#file-descriptor) · [プロセス](/glossary/pc.html#process)

**出典**　[Microsoft — オブジェクトハンドル](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/object-handles) · [SideFX — Houdiniの操作ハンドル](https://www.sidefx.com/docs/houdini/basics/handles.html)

## PCI Express {#pcie}

**PCIe / PCI Express** ／ 読み ぴーしーあいえくすぷれす / ぴーしーあいいー

PCのCPUやチップセットと、GPUやSSDなどの機器を接続する高速な入出力規格。

**例**　GPUがPCIeの何レーンで接続されているか調べる。

**関連**　[PCI Expressのリンクと帯域](/hardware/io/pcie-links.html) · [DMA](/glossary/pc.html#dma) · [帯域](/glossary/pc.html#bandwidth)

**出典**　[PCI-SIG — PCI Expressの仕様と帯域](https://pcisig.com/faq?field_category_value%5B%5D=pci_express_7.0)

## キャッシュヒット {#cache-hit}

**hit / cache hit** ／ 読み ひっと / きゃっしゅひっと

必要なデータや結果が、調べたキャッシュに見つかること。

**この分野での意味**　ゲームの当たり判定でいう「ヒット」は、攻撃などが対象に当たること。

**例**　L1キャッシュにヒットし、下位のキャッシュを参照せずに済んだ。

**関連**　[キャッシュ局所性とAoS・SoA](/runtime/memory/cache-locality-aos-soa.html) · [キャッシュ](/glossary/pc.html#cache) · [キャッシュミス](/glossary/pc.html#cache-miss)

**出典**　[Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html)

## ファームウェア {#firmware}

**firmware** ／ 読み ふぁーむうぇあ

機器に組み込まれ、機器の初期化や動作を担うソフトウェア。更新できる製品もある。

**この分野での意味**　PC側でOSの要求を仲介するソフトウェアは、通常ドライバーと呼ぶ。

**例**　SSDのファームウェアを更新する。

**関連**　[コンピュータを構成する部品](/hardware/computer-components.html) · [ドライバー](/glossary/pc.html#driver) · [UEFI](/glossary/pc.html#uefi)

**出典**　[NIST — firmware](https://csrc.nist.gov/glossary/term/firmware) · [Microsoft — ドライバーの役割](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/what-is-a-driver-)

## ファイルシステム {#file-system}

**file system / filesystem** ／ 読み ふぁいるしすてむ

ファイルの内容やメタデータを管理し、パスからデータにアクセスできるようにする仕組み。

**例**　ファイルシステムがファイル名から対応するデータを探す。

**関連**　[ファイルとパス](/os/files-and-paths.html) · [マウント](/glossary/pc.html#mount) · [パス](/glossary/pc.html#path) · [ファイルディスクリプター](/glossary/pc.html#file-descriptor)

**出典**　[Linuxカーネル文書 — 仮想ファイルシステム](https://docs.kernel.org/filesystems/vfs.html) · [Microsoft — ファイル名、パス、名前空間](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)

## ファイルディスクリプター {#file-descriptor}

**file descriptor / fd** ／ 読み ふぁいるでぃすくりぷたー

Unix系OSで、開いたファイルやパイプ、ソケットなどをプロセス内で指定するための非負の整数。

**例**　ファイルディスクリプターをreadに渡す。

**関連**　[パイプとプロセスの入出力](/os/pipes-and-process-io.html) · [ハンドル](/glossary/pc.html#handle) · [ファイルシステム](/glossary/pc.html#file-system)

**出典**　[Linux man-pages — open(2)](https://man7.org/linux/man-pages/man2/open.2.html)

## ブート {#boot}

**boot / booting** ／ 読み ぶーと / きどう

PCを起動し、ファームウェアやローダーを経てOSを動かせる状態にすること。

**この分野での意味**　ゲームではタイトルの起動時に行う初期化の一連の処理を指すこともある。

**例**　USBメモリからOSをブートする。

**関連**　[ブートストラップ](/glossary/pc.html#bootstrap) · [ブートローダー](/glossary/pc.html#boot-loader) · [UEFI](/glossary/pc.html#uefi)

**出典**　[Microsoft — Windowsの起動段階](https://learn.microsoft.com/en-us/windows/client-management/advanced-troubleshooting-boot-problems) · [UEFI Forum — UEFI 2.11、Boot Manager](https://uefi.org/specs/UEFI/2.11/03_Boot_Manager.html)

## ブートストラップ {#bootstrap}

**bootstrap / bootstrap code** ／ 読み ぶーとすとらっぷ

起動に必要な最初の小さな処理で、後続のローダーや実行環境を立ち上げること。そのためのコードも指す。

**この分野での意味**　コンパイラ開発では、既存の処理系を使って新しい処理系を構築する過程にも使う。

**例**　レガシーBIOSの起動経路で、最初のブートストラップコードが次段を読み込む。

**関連**　[ブート](/glossary/pc.html#boot) · [ブートローダー](/glossary/pc.html#boot-loader)

**出典**　[Microsoft — Windowsの起動段階](https://learn.microsoft.com/en-us/windows/client-management/advanced-troubleshooting-boot-problems) · [GNU Project — GCCのブートストラップ](https://gcc.gnu.org/install/build.html)

## ブートローダー {#boot-loader}

**boot loader / OS loader** ／ 読み ぶーとろーだー

起動時にOSのカーネルなどを読み込み、実行に必要な状態を整えて制御を渡すプログラム。

**この分野での意味**　どのOSやローダーを起動するか決める部分はブートマネージャーと呼ぶことがある。

**例**　ブートローダーがカーネルと初期ドライバーを読み込む。

**関連**　[ブート](/glossary/pc.html#boot) · [ブートストラップ](/glossary/pc.html#bootstrap) · [カーネル](/glossary/pc.html#kernel)

**出典**　[Microsoft — Windowsの起動段階](https://learn.microsoft.com/en-us/windows/client-management/advanced-troubleshooting-boot-problems) · [UEFI Forum — UEFI 2.11、Boot Manager](https://uefi.org/specs/UEFI/2.11/03_Boot_Manager.html)

## フリーズ {#freeze}

**freeze / unresponsive** ／ 読み ふりーず

操作に応答せず、画面や処理が止まったように見える状態。アプリだけの場合とOS全体の場合がある。

**例**　ロード画面で入力を受け付けずフリーズする。

**関連**　[スレッドのスケジューリング](/os/thread-scheduling.html) · [ハング](/glossary/pc.html#hang) · [クラッシュ](/glossary/pc.html#crash)

**出典**　[Microsoft — Windowsのフリーズ](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/windows-based-computer-freeze-troubleshooting)

## ブルースクリーン {#blue-screen}

**BSOD / Blue Screen of Death / bug check** ／ 読み ぶるーすくりーん / びーえすおーでぃー

Windowsが処理の続行が危険と判断して停止したときの通称。停止コードやダンプが原因調査の手がかりになる。

**この分野での意味**　エラー画面の色や表示はWindowsの版などで変わる。Windowsの技術文書ではbug checkやstop codeと呼ぶ。

**例**　ブルースクリーンで表示された停止コードを控える。

**関連**　[クラッシュ](/glossary/pc.html#crash) · [クラッシュダンプ](/glossary/pc.html#crash-dump) · [カーネル](/glossary/pc.html#kernel)

**出典**　[Microsoft — Bug Checkと停止コード](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-checks--blue-screens-) · [Microsoft — Windowsの予期しない再起動と停止コード](https://support.microsoft.com/en-us/windows/experience/performance-optimization/troubleshooting-windows-unexpected-restarts-and-stop-code-errors)

## プロセス {#process}

**process** ／ 読み ぷろせす

実行中のプログラムに、仮想アドレス空間、権限、開いているリソースなどをまとめた単位。

**この分野での意味**　同じ実行ファイルを2回起動すると、別々のプロセスが作られる構成にできる。

**例**　ゲームとエディターを別プロセスで動かす。

**関連**　[プロセスが起動するまで](/os/process-startup.html) · [スレッド](/glossary/pc.html#thread) · [ハンドル](/glossary/pc.html#handle) · [仮想メモリ](/glossary/pc.html#virtual-memory)

**出典**　[Microsoft — プロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

## ページ {#page}

**memory page / page** ／ 読み ぺーじ

OSやCPUがアドレスの変換、保護、メモリ管理に使う固定長の範囲。大きさは構成や用途によって異なる。

**例**　アクセス権をページ単位で設定する。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [ページング](/glossary/pc.html#paging) · [ページテーブル](/glossary/pc.html#page-table) · [ページフォルト](/glossary/pc.html#page-fault)

**出典**　[Linuxカーネル文書 — ページテーブル](https://docs.kernel.org/mm/page_tables.html)

## ページテーブル {#page-table}

**page table** ／ 読み ぺーじてーぶる

仮想ページと物理メモリの対応や、そのページのアクセス権などを記録する表。

**例**　ページテーブルを参照して仮想アドレスを変換する。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [ページ](/glossary/pc.html#page) · [TLB](/glossary/pc.html#tlb) · [仮想メモリ](/glossary/pc.html#virtual-memory)

**出典**　[Linuxカーネル文書 — ページテーブル](https://docs.kernel.org/mm/page_tables.html) · [Intel — Intel 64・IA-32 Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)

## ページフォルト {#page-fault}

**page fault** ／ 読み ぺーじふぉると

ページが未配置だったりアクセスが許可されなかったりして、メモリアクセスを続けるためにOSの処理が必要になる例外。

**この分野での意味**　必要なページを割り当てて処理を続けられる場合もあり、ストレージへの読み込みを伴うとは限らない。

**例**　確保した領域の初回アクセスでページフォルトが起きる。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [ページング](/glossary/pc.html#paging) · [ページテーブル](/glossary/pc.html#page-table) · [ワーキングセット](/glossary/pc.html#working-set)

**出典**　[Linuxカーネル文書 — ページテーブル](https://docs.kernel.org/mm/page_tables.html) · [Microsoft — ワーキングセット](https://learn.microsoft.com/en-us/windows/win32/memory/working-set)

## ページング {#paging}

**paging** ／ 読み ぺーじんぐ

メモリをページに分け、仮想アドレスの対応付けやRAMへの配置をページ単位で管理すること。

**この分野での意味**　「ページングI/O」は、ページの読み込みや書き戻しに伴う入出力を指す。

**例**　必要になったページをRAMに読み込む。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [仮想メモリ](/glossary/pc.html#virtual-memory) · [ページテーブル](/glossary/pc.html#page-table) · [ページフォルト](/glossary/pc.html#page-fault)

**出典**　[Linuxカーネル文書 — メモリ管理の概念](https://docs.kernel.org/admin-guide/mm/concepts.html) · [Linuxカーネル文書 — ページテーブル](https://docs.kernel.org/mm/page_tables.html)

## ポーリング {#polling}

**polling** ／ 読み ぽーりんぐ

状態の変化を知るため、同じ対象を定期的または繰り返し調べること。

**例**　受信キューにデータが届いたかポーリングする。

**関連**　[NICの受信キュー](/hardware/io/nic-receive-queues.html) · [割り込み](/glossary/pc.html#interrupt) · [レイテンシ](/glossary/pc.html#latency)

**出典**　[Linuxカーネル文書 — NAPI](https://docs.kernel.org/networking/napi.html)

## 電源投入時自己診断 {#post}

**POST / Power-On Self-Test** ／ 読み ぽすと / でんげんとうにゅうじじこしんだん

PCの電源投入後にファームウェアが行う基本的なハードウェアの診断。

**例**　POSTでメモリの初期化に失敗する。

**関連**　[BIOS](/glossary/pc.html#bios) · [UEFI](/glossary/pc.html#uefi) · [ブート](/glossary/pc.html#boot)

**出典**　[Microsoft — Windowsの起動段階](https://learn.microsoft.com/en-us/windows/client-management/advanced-troubleshooting-boot-problems)

## ホットプラグ {#hot-plug}

**hot plug / hot plugging** ／ 読み ほっとぷらぐ

電源を切らずに、対応する機器を接続または取り外せること。

**この分野での意味**　ストレージを動作中に外す場合は、未完了の書き込みや安全な取り外しの手順も確認する。

**例**　実行中にUSBゲームパッドを接続して認識させる。

**関連**　[USBキーボードの入力とWindowsのRaw Input](/hardware/io/usb-keyboard-raw-input.html) · [ドライバー](/glossary/pc.html#driver) · [マウント](/glossary/pc.html#mount)

**出典**　[Microsoft — WindowsのPlug and Play](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/introduction-to-plug-and-play)

## マウント {#mount}

**mount / mount point** ／ 読み まうんと

ファイルシステムをOSの名前空間に接続し、ある場所から中身にアクセスできるようにすること。

**この分野での意味**　ゲームのパックを「マウントする」と言う場合は、エンジン内の仮想ファイルシステムにパックを登録することがある。

**例**　USBドライブをディレクトリにマウントする。

**関連**　[ファイルとパス](/os/files-and-paths.html) · [ファイルシステム](/glossary/pc.html#file-system) · [パス](/glossary/pc.html#path)

**出典**　[Linux man-pages — mount(2)](https://man7.org/linux/man-pages/man2/mount.2.html) · [Linuxカーネル文書 — 仮想ファイルシステム](https://docs.kernel.org/filesystems/vfs.html) · [Epic Games — Unreal Engine 5.8 FPakPlatformFile::Mount](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/PakFile/FPakPlatformFile/Mount?application_version=5.8)

## キャッシュミス {#cache-miss}

**miss / cache miss** ／ 読み みす / きゃっしゅみす

必要なデータや結果が、調べたキャッシュにないこと。下の階層から取り寄せたり、計算し直したりする。

**例**　L1でミスしたが、L2にはデータがあった。

**関連**　[キャッシュ局所性とAoS・SoA](/runtime/memory/cache-locality-aos-soa.html) · [キャッシュ](/glossary/pc.html#cache) · [キャッシュヒット](/glossary/pc.html#cache-hit) · [レイテンシ](/glossary/pc.html#latency)

**出典**　[Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html)

## メモリマップドファイル {#file-mapping}

**memory-mapped file / file mapping** ／ 読み めもりまっぷどふぁいる

ファイルの一部または全部を仮想アドレス空間に対応付け、メモリを読むようにアクセスする仕組み。

**例**　大きなアセットパックの索引をメモリマップする。

**関連**　[メモリマップドファイル](/os/memory-mapped-files.html) · [仮想メモリ](/glossary/pc.html#virtual-memory) · [ページフォルト](/glossary/pc.html#page-fault) · [ファイルシステム](/glossary/pc.html#file-system)

**出典**　[Microsoft — ファイルマッピング](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping)

## UEFI {#uefi}

**UEFI / Unified Extensible Firmware Interface** ／ 読み ゆーいーえふあい

OSローダーとプラットフォームのファームウェアがやり取りするためのインターフェース仕様。UEFI 2.11では起動項目の選択やEFIアプリケーションの読み込みも定める。

**例**　UEFIの起動順でWindows Boot Managerを先にする。

**関連**　[BIOS](/glossary/pc.html#bios) · [ファームウェア](/glossary/pc.html#firmware) · [ブートローダー](/glossary/pc.html#boot-loader)

**出典**　[UEFI Forum — UEFI 2.11、Boot Manager](https://uefi.org/specs/UEFI/2.11/03_Boot_Manager.html)

## ユーザーモード {#user-mode}

**user mode** ／ 読み ゆーざーもーど

一般のアプリなどが動く実行状態。CPUの特権操作や他のプロセスのメモリへのアクセスが制限される。

**例**　ゲームの更新処理はユーザーモードで実行する。

**関連**　[OSの役割とユーザーモード・カーネル](/os/operating-system-basics.html) · [カーネルモード](/glossary/pc.html#kernel-mode) · [プロセス](/glossary/pc.html#process)

**出典**　[Microsoft — ユーザーモードとカーネルモード](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode)

## レイテンシ {#latency}

**latency** ／ 読み れいてんし / れいてんしー / ちえん

要求を出してから、決めた応答や完了を観測するまでの時間。

**この分野での意味**　ネットワークの片道、往復、ゲームの入力から画面表示など、測定の始点と終点で値が変わる。

**例**　入力から表示までのレイテンシをミリ秒で測る。

**関連**　[入力から画面表示までの遅延](/graphics/optimization/input-to-display-latency.html) · [スループット](/glossary/pc.html#throughput) · [帯域](/glossary/pc.html#bandwidth)

**出典**　[IETF RFC 1242 — ネットワーク機器の計測用語](https://www.rfc-editor.org/info/rfc1242/) · [Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html)

## レジストリ {#registry}

**Windows Registry / registry** ／ 読み れじすとり

WindowsがOSやアプリなどの設定をキーと値で管理する階層型のデータベース。

**この分野での意味**　パッケージの配布先を表すpackage registryや、CPUのレジスタとは別のもの。

**例**　Windowsのレジストリからアプリの設定を読む。

**関連**　[環境変数](/glossary/pc.html#environment-variable) · [サービス](/glossary/pc.html#service)

**出典**　[Microsoft — レジストリ](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry)

## ワーキングセット {#working-set}

**working set** ／ 読み わーきんぐせっと

Windowsのメモリ計測では、プロセスの仮想アドレス空間のうち現在RAMに常駐しているページの集合。

**この分野での意味**　性能の議論では、ある時間内に繰り返しアクセスするデータのまとまりを指すこともある。

**例**　ロード後にプロセスのワーキングセットが増えた。

**関連**　[仮想メモリとアドレス変換](/os/virtual-memory.html) · [ページ](/glossary/pc.html#page) · [スワップ](/glossary/pc.html#swap)

**出典**　[Microsoft — ワーキングセット](https://learn.microsoft.com/en-us/windows/win32/memory/working-set) · [Intel — Intel 64・IA-32 Optimization Reference Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel64-and-ia32-architectures-optimization.html)

## 割り込み {#interrupt}

**interrupt** ／ 読み わりこみ

機器などの通知を受けて、CPUが現在の処理の途中で所定のハンドラーへ実行を移す仕組み。

**例**　NICが受信を通知し、ドライバーの割り込み処理が走る。

**関連**　[NICの受信キュー](/hardware/io/nic-receive-queues.html) · [ドライバー](/glossary/pc.html#driver) · [DMA](/glossary/pc.html#dma) · [ポーリング](/glossary/pc.html#polling) · [IRQ](/glossary/pc.html#irq)

**出典**　[Linuxカーネル文書 — 割り込みの処理](https://docs.kernel.org/core-api/genericirq.html) · [Intel — Intel 64・IA-32 Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
