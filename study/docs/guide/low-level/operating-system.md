---
title: 第8章 OSの仕組み
study:
  source: IT教本
  status: outline
  summary: 起動からシステムコール、スレッドの実行、ハンドル、パイプ、仮想メモリとI/Oを学ぶ計画。各段階の解説と観察例へ進む。
  verification: 同期・I/O項目の一次資料照合（2026-11-04）
  section: learning
  format: path
  domain: os
  collection: low-level
  order: 9
---

<div id="第8章-os-──-プロセス・スレッド・仮想メモリ・システムコール" class="study-legacy-anchor" aria-hidden="true"></div>

# 第8章 OSの仕組み

## このページで案内すること

プロセス・スレッド・仮想メモリ・システムコール・I/Oを学ぶ順序と観察課題をまとめた**学習計画・概要**です。実行ファイルの起動を入口に、スレッドがCPU時間を受け取り、OSのサービスを呼び出し、別プロセスやファイルとデータをやり取りする流れを追います。

## 関連する辞典本文・実践

- [実行ファイルを起動してmainへ到達するまで](/os/process-startup.html)でプロセス・スレッド・ローダー・CRTを分け、[Windowsのプロセス観察](/practice/process/windows-process-observation.html)でPID・TIDや親子プロセスを確かめられます。
- [システムコールとCPUの権限](/os/system-calls-and-privilege.html)と[Windowsのスレッドスケジューリング](/os/thread-scheduling.html)で、カーネルへの移行、実行可能になった後の待ち、CPU上の実行を分けて追えます。
- [Windowsのハンドル](/os/windows-handles.html)と[子プロセスの標準入出力](/os/pipes-and-process-io.html)で、親子が持つパイプの端を調べます。[パイプの終端を調べる実践](/practice/process/windows-pipe-observation.html)

- [仮想メモリ](/os/virtual-memory.html)で予約・コミット・常駐、ページ表・TLB・ページフォルトを調べ、[Windows/C++の観察サンプル](/practice/memory/windows-memory-observation.html)で確かめられます。

- [アロケータ](/runtime/memory/allocators-and-pools.html)で、アプリ側の領域管理とOSへの要求を区別できます。
- [スレッド間の安全なデータ共有](/runtime/thread-synchronization.html)でmutex・C#のlock・共有状態の寿命を調べ、[在庫の観察例](/practice/threads/inventory-synchronization.html)で守る範囲と完了待ちを確かめられます。
- [並行処理のバグ](/runtime/memory/concurrency-bugs.html)では、共有データを扱う際のデータ競合や、性能に影響するフォールスシェアリングを調べられます。
- [ファイルを開いて読むまでの流れ](/os/file-read-journey.html)でハンドル・ストリーム・読取り位置・実際の読取り量・EOFを調べ、[ファイル読取りの観察例](/practice/io/file-read-observation.html)で確かめられます。
- [Windowsのファイルキャッシュと先読み](/os/windows-file-cache.html)で読み取りの経路を押さえ、[I/O計測の解説](/tools/windows/file-io-tracing.html)と[ファイル読み取りをトレースする実践](/practice/io/file-io-trace-observation.html)で、アプリのファイル操作とディスクへの要求を照合します。
- [非同期ファイルI/O](/os/asynchronous-file-io.html)で要求の開始と完了、バッファや要求情報の寿命を調べ、[同期・非同期の観察例](/practice/io/async-file-read-observation.html)で同じ内容を読み比べられます。
- [I/O完了ポート](/os/io-completion-ports.html)と[非同期I/Oのキャンセル](/os/cancelling-overlapped-io.html)で、複数の完了を受け取る方法と、処理を止めるときの寿命管理を追います。[C++のIOCP観察例](/practice/io/iocp-observation.html)で実際の完了通知を照合できます。
- [ファイルの書き込みと永続化](/os/file-write-and-durability.html)で、キャッシュに受理された時点と、障害後に復元できる条件を分けて考えます。
- [メモリマップドファイル](/os/memory-mapped-files.html)でファイル・仮想アドレス・ページの関係を調べ、[マッピングの観察例](/practice/io/mapped-file-observation.html)でビューの範囲と寿命を確かめられます。
- I/Oの先の状態・登録・所有権は[実行時のアセットロード](/game/asset-loading.html)へ進みます。[状態と寿命の実践](/practice/assets/asset-lifecycle-model.html)は実I/OやGPUを使わないモデルです。
- [TCPとソケット](/network/tcp-sockets.html)で接続・バイト列・受信の区切り・送信終了を調べ、[ループバック通信の観察例](/practice/network/tcp-loopback-observation.html)で部分送受信とEOF、アプリの応答を確かめられます。

## 学ぶ理由

ゲームは必ずOSの上で走る(コンソールでも薄いOSがある)。
パッド入力は**割り込みとドライバ**が、ロード画面は**ファイルI/Oと
ページキャッシュ**が、ジョブシステムは**スレッドとスケジューラ**が、
メモリは**仮想メモリ**が支えている。「なぜ入力に遅延があるのか」
「なぜスレッドを増やしても速くならないのか」に答えられるかは、
この章の理解にかかっている。

## 到達目標

- カーネル/ユーザーモード、システムコールの仕組みを説明できる
- プロセスとスレッドの違い、コンテキストスイッチのコストを説明できる
- 仮想メモリ(ページング、ページテーブル、TLB、ページフォルト)を説明できる
- データ競合、mutexで守る範囲、atomic操作の保証を区別できる。ロックフリーは発展項目として位置付ける
- 割り込み→ドライバ→アプリというパッド入力の経路を説明できる
- ジョブシステムの設計原理を説明できる
- 通常のファイル読取りで、要求量・実際の読取り量・位置・EOF・失敗を分けて確認できる
- 非同期I/Oの開始と完了を分け、未完了の要求が使うバッファや管理情報の寿命を説明できる
- ファイルマッピングとreadを区別し、ビューの作成・アクセス・解除の境界を説明できる
- TCPのバイト列とアプリのメッセージ境界、readinessとI/O完了、受信EOFと送信終了を区別できる

## 前提知識

第2〜4章(CPU・メモリ・アセンブリ)、第7章(実行ファイル)。

## 学ぶ内容

1. **OSの役割とカーネル/ユーザーモード**
   - ここではWindows/x86-64を主な例にする。ring0/ring3はx86の特権レベルの呼称。
     アプリからの特権操作はOSが管理する。許可されたデバイスのマッピングや
     ユーザーモードドライバもあり、「ハードアクセスは全てカーネル内」とは限らない
   - **システムコール**: x86-64ではsyscall命令等を通じてカーネルの処理を要求する。
     遷移と要求処理にはコストがあり、CPU・OS・要求内容で変わる。必要ならまとめて計測する
   - Win32 API → ntdll → カーネルという層構造
2. **プロセス**
   - プロセス = 仮想アドレス空間 + リソース + スレッド群
   - Windowsの起動ではプロセスと初期スレッドを作成し、実行イメージ・依存DLL等を準備する。
     初期スレッドはローダー側の初期化やEXEの開始点、通常のCRT起動処理を経てmainへ進む。
     CreateProcessの成功は、子がmainへ到達したことを保証しない（詳しくは[起動の辞典本文](/os/process-startup.html)）
   - プロセスのアドレス空間は通常隔離される。共有メモリや、権限を持つ
     デバッガ等による他プロセスの読取り/書込みは、OSの仕組みを通じて行う
3. **仮想メモリ(最重要)**
   - 仮想アドレス→物理アドレスの変換。ページ、ページテーブル、TLB。
     4KiBは一般的なx86-64環境の基本ページの例。サイズはOS/構成に依存し、
     WindowsではGetSystemInfoのdwPageSize等で確認する(予約時の粒度とは別)
   - **メリット**: プロセス隔離/連続に見える空間/メモリ保護(ヌルポでAV)/
     デマンドページング/メモリマップドファイル
   - ページフォルト: 遅延割り当てやデータの読込み等でOSが処理できる場合と、
     不正なアドレス/保護違反等でAccess Violationに至る場合を分ける
     → **0xC0000005はOSの保護機構がバグを検出してくれた瞬間**
   - VirtualAlloc(予約/コミットの2段階)── 大型ゲームのメモリ戦略
   - メモリマップドファイルは、ファイルの一部などをプロセスの仮想アドレス空間へ対応付けてアクセスする方式。マップしただけで全内容が物理RAMへ読み込まれる、I/Oがなくなる、通常のreadより必ず速い、という意味ではない。アクセス時にページの準備やI/Oを待つ場合があり、非同期readの発行とも区別する。[マッピングの本文](/os/memory-mapped-files.html)と[Windowsのファイルビュー](https://learn.microsoft.com/en-us/windows/win32/memory/creating-a-file-view)を参照
   - TLBミスとヒュージページ(大規模ゲームの最適化)
4. **スレッドとスケジューリング**
   - スレッド = 実行文脈(レジスタ+スタック)。同一プロセス内でメモリ共有
   - プリエンプティブスケジューリング、タイムスライス、優先度
   - **コンテキストスイッチのコスト**と、キャッシュ/TLBへの影響。時間は環境による。
     CPU負荷が高いworkerは利用可能なCPU数を出発点に計測し、メイン/描画thread、
     SMT、I/O待ち、ジョブ粒度も考慮する。総スレッド数の最適値が常にコア数とは限らない
   - CPUアフィニティ(コンソール開発ではコア割り当てを明示することも)
5. **同期と並行性(ゲーム実務の核心)**
   - C++20のデータ競合: 異なるスレッドで競合する操作の少なくとも一方が非atomicで、どちら向きにもhappens-beforeがなければ未定義動作。単に「同時刻に触ったか」では判定しない。[C++20草案の定義](https://timsong-cpp.github.io/cppwp/n4861/intro.races#21)を参照
   - まずmutexで、共有状態の関係する読み書きを同じ保護方針にそろえる。C#の`lock`もAPIの契約に従って使い、C++20の未定義動作の規則とC#の保証を一括りにしない。詳しくは[同期の本文](/runtime/thread-synchronization.html)へ
   - atomic操作の不可分性と、別の通常データを公開する順序の保証を区別する。特定のCPU命令一つと同一視せず、型や環境によってロックフリーではない実装もある。[C++20草案の順序](https://timsong-cpp.github.io/cppwp/n4861/atomics.order)と[ロックフリー性](https://timsong-cpp.github.io/cppwp/n4861/atomics.lockfree)を参照
   - 条件変数・セマフォは、mutexによる共有状態の保護と完了待ちの基本から発展させる
   - デッドロック(ロック順序)、優先度逆転
   - acquire/releaseなどのメモリオーダーは、どの操作の間に同期ができるかを調べる発展項目。キャッシュを即座に全CPUへ反映させる命令という説明ではない
   - **ゲームのジョブシステム**: スレッドプール+ワークスティーリング+
     フレームを小さなジョブに分割(UE Tasks / Unity C# JobSystem の原理)
6. **割り込みとデバイスドライバ、入力の経路**
   - ハードウェア割り込み → カーネルのハンドラ → ドライバ
   - USBはポーリングベース(パッドは125Hz〜1000Hz)
   - パッド入力の全経路:
     パッド内マイコン → USB/BT → HIDドライバ → (XInput/GameInput) →
     ゲームのポーリング → 今フレームの入力として消費
   - **入力遅延の分解**: パッドスキャン+USBポーリング+OS+
     ゲームループの待ち+表示遅延
7. **ファイルI/Oと時間**
   - まず通常のファイルを開き、ハンドルやストリームから読み、実際に得たbyte数と位置、EOF、失敗を区別する。[読取りの辞典本文](/os/file-read-journey.html)と[観察例](/practice/io/file-read-observation.html)へ
   - Windowsの通常の読取りではシステムのファイルキャッシュが関わる。アプリ側のバッファや記憶装置側のキャッシュとは分け、APIのread一回が物理ディスクの読取り一回とは考えない。開き直してもキャッシュが空になる保証はなく、1回目と2回目の時間差だけで物理I/Oや特定のキャッシュの効果を断定しない。[Windowsのファイルキャッシュ](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching)を参照
   - 同期I/Oと非同期I/Oは、完了をどう待つか、完了結果をどう受け取るかの違いを学ぶ。WindowsのOverlapped I/Oでもすぐ完了する場合や呼出し側が待つ場合があり、非同期を選べば必ず高速になるわけではない。要求中のバッファや管理情報は完了まで有効に保ち、同期版のEOF判定も無条件に流用しない。[非同期I/Oの本文](/os/asynchronous-file-io.html)、[Microsoftの同期・非同期I/O](https://learn.microsoft.com/en-us/windows/win32/fileio/synchronous-and-asynchronous-i-o)を参照
   - 観察例ではC++のOVERLAPPEDと手動リセットイベント、C#／.NET 10の`FileOptions.Asynchronous`と`ReadAsync`を扱う。`async`や`await`は要求ごとの専用スレッド作成を意味しない。IOCPの実践詳解は次の発展項目とする。[Microsoftのasyncとスレッド](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model#threads)を参照
   - アセットの読取り完了とゲームで利用可能なReadyを区別する。展開・デコード・登録・転送などの条件は[アセットロードの本文](/game/asset-loading.html)で学び、OSのI/O契約とエンジン側の状態管理をつなぐ
   - ネットワークでは[TCPソケットの本文](/network/tcp-sockets.html)で、バイト列を必要量まで累積し、アプリがメッセージの区切りを決める。`send`の成功は相手の受信・解析完了の保証ではなく、必要ならアプリの応答で確認する。[Microsoft: send](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-send)を参照
   - 非blockingソケットの`select`や`Poll`は、送受信できる状態などを調べる方式。発行済みOVERLAPPED要求の完了回収とは別で、通知後も実際の送受信結果を確認する。読取り可能にはデータだけでなく接続終了やエラーも含まれ得る。[Microsoft: select](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-select)、[Socket.Poll](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.poll?view=net-10.0)を参照
   - 高精度タイマ QueryPerformanceCounter(第14章で使用)
8. **(演習として)OS自作という選択肢**
   - 『ゼロからのOS自作入門』は最高の理解をくれるが時間も莫大。
     本教本では**任意課題**とし、MikanOSの序盤(ブート〜画面描画)だけでも
     価値があると付記する

## 重要概念

- **仮想メモリ** ── 現代OSの中心発明。AVも隔離もストリーミングもこれ
- **OSへの要求にもコストがある** ── 呼出し回数・要求内容・待機を測り、必要ならバッチングする
- **スレッドは無料ではない** ── コンテキストスイッチ・同期コスト
- **C++20のデータ競合は未定義動作** ── 偶然正しい結果が出ても安全の証明にはならず、同期があっても一連の処理の論理バグは残り得る
- **入力はポーリングで刻まれている** ── 遅延理解の鍵

## ゲーム開発との関係

| 現場の事象 | この章の知識 |
|---|---|
| Access Violation (0xC0000005) | 仮想メモリの保護 |
| ロード最適化・アセットストリーミング | 要求量・実読取り量・待機とキャッシュ条件。必要に応じて非同期I/Oやファイルマッピング |
| ジョブシステム/ワーカースレッド設計 | スレッド・同期・ワークスティーリング |
| 「たまに壊れる」マルチスレッドバグ | データ競合・アトミック |
| 入力遅延の計測と削減 | USBポーリング・割り込み・経路分解 |
| ヒッチ(スパイク)の原因がOS側 | ページフォルト・スケジューラ |
| コンソールの厳しいメモリ管理 | VirtualAllocの予約/コミット |

## 演習

1. `VirtualAlloc`で1GBを**予約**し、少しずつ**コミット**して使うプログラムを
   書け。タスクマネージャの「コミット済み」と「ワーキングセット」の違いを観察。
2. わざとnullptrに書き込み、VSで例外コード0xC0000005を確認。
   「なぜOSはこれを検出できるのか」をページテーブルの言葉で説明せよ。
3. [在庫の同期を観察するサンプル](/practice/threads/inventory-synchronization.html)を実行し、確認と消費を同じロック区間に置く理由、読取りの保護、workerの完了待ちを説明せよ。data raceのある非保護版を実行して結果や速度を比較する課題にはしない。
4. **ミニジョブシステム**: スレッドプール+ジョブキュー(mutex+条件変数)を
   実装し、1万個の粒子更新をジョブ分割して並列化せよ。コア数と
   スループットの関係を計測せよ。
5. `XInputGetState`をループで呼び、パッドのボタン状態が変わる様子を
   コンソール表示せよ(第14章の先取り。10行で書ける)。
6. WSLで `strace ./a.out` を実行し、printfやmallocの裏で走る
   システムコール(write, mmap, brk)を観察せよ。
7. [ファイル読取りの観察例](/practice/io/file-read-observation.html)を実行し、要求した量と実際の読取り量、位置の変化、EOF、失敗を確認せよ。扱う既知のbyte列と照合し、読んでいないバッファ部分まで有効なデータとして使わない理由を説明せよ。
8. [同期・非同期の読取り観察例](/practice/io/async-file-read-observation.html)で、同じデータを読む結果と完了の受取りを比べよ。内容の一致を確かめ、開始後の未完了状態が毎回現れることや、非同期版が必ず速いことを期待条件にしない。
9. [ファイルマッピングの観察例](/practice/io/mapped-file-observation.html)で既知のbyte列を読み、ファイル内の位置とビュー内の位置、ビューの範囲と寿命を説明せよ。成功だけから全ページの常駐や通常のreadより速いことを結論にしない。
10. [TCPループバックの観察例](/practice/network/tcp-loopback-observation.html)で、部分的な送受信を累積し、長さ付きメッセージ、片方向の送信終了、相手アプリの応答を区別せよ。APIへ渡す小さな要求量やログの分割を、実際のパケットの区切りとして扱わない。

## おすすめ書籍

- **"Operating Systems: Three Easy Pieces (OSTEP)"** ── 無料Web公開・
  邦訳あり。仮想化/並行性/永続化の3部構成が美しい。この章の主教材
- 『Windowsの仕組み(Windows Internals 第7版)』── 辞書として。
  プロセス・メモリ・I/O章を拾い読み
- 『ゼロからのOS自作入門』内田公太 ── OSの実装を追う任意課題
- 『詳解Linuxカーネル』── 発展編送りでよい
- 『[試して理解]Linuxのしくみ』武内覚 ── 手を動かす系の良書(WSLで)

## おすすめOSS

- **MikanOS**(uchan-nos/mikanos)── 日本語で読める教育用OS
- xv6(MIT)── 1万行のUNIX。プロセス・システムコールの実装が読める
- Wine のXInput実装(パッド入力の中身が覗ける)
- marl(google/marl)── ゲーム向き協調スケジューラ/ファイバー

## おすすめ動画

- OSTEPの著者講義(YouTube)
- CppCon "C++ atomics, from basic to advanced"(Fedor Pikus)
- GDC "Parallelizing the Naughty Dog Engine Using Fibers" ──
  ジョブシステム講演の金字塔。**必見**
- Molecular Matters等のジョブシステム解説ブログ(Job System 2.0)

## 読むべきソースコード

- xv6 の `proc.c`(コンテキストスイッチ)、`vm.c`(ページテーブル)
- marl のスケジューラ
- UE5 `Engine/Source/Runtime/Core/Private/HAL/` のスレッド抽象
  (`FRunnableThreadWin` など)── Win32 APIの薄い包装だと分かる

## 理解度チェック

1. システムコールは通常の関数呼出しと何が違うか。遷移・要求処理・待機のコストを区別できるか。
2. 仮想メモリの利点を4つ挙げよ。Access Violationはどう検出されるか。
3. プロセスとスレッドの違いは? ゲームが1プロセス多スレッドなのはなぜ?
4. データ競合とは何か。mutexとatomicの使い分けは?
5. CPU中心のジョブのworker数をCPU数から検討する理由と、常にその数が最適とは限らない条件は?
6. パッドのボタン押下がゲームに届くまでの経路を、割り込み/ポーリング/
   ドライバの言葉で説明せよ。
7. ファイルの読取り要求量と、実際に得た量が異なる場合をどう扱うか。再読込みの時間差だけで、特定のキャッシュや物理ディスクの読取りを断定できるか。
8. ジョブシステムはなぜ「スレッドを毎回作る」設計にしないのか。

---

## この章がゲームのどこで使われているか

```
             ┌─────────── ゲームプロセス ───────────┐
 パッド ──USB─→ [HIDドライバ] ─→ XInput ─→ 入力ポーリング   │
             │                     (メインスレッド)        │
 ディスク ──→ [ファイルI/O/ページキャッシュ] ─→ 非同期ロード │
             │                     (ストリーミングスレッド) │
             │  [ジョブシステム] ワーカー×Nコア              │
             │   物理/アニメ/カリングを並列実行              │
             │  [仮想メモリ] 全確保の土台(VirtualAlloc)     │
             └─────────────┬───────────────────────┘
                           ▼
              [GPUドライバ(カーネル)] ─→ GPU (第11-13章)
 スケジューラが全スレッドをコアに配置 / AVはページ保護が検出
```

## 記述の確認資料

- [Microsoft: User mode and kernel mode](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode)
- [Microsoft: SYSTEM_INFO — page size and allocation granularity](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/ns-sysinfoapi-system_info)
- [Microsoft: Virtual Address Space](https://learn.microsoft.com/en-us/windows/win32/memory/virtual-address-space)
- [Microsoft: Scheduling Priorities](https://learn.microsoft.com/en-us/windows/win32/procthread/scheduling-priorities)
- [C++20草案 N4861: data races](https://timsong-cpp.github.io/cppwp/n4861/intro.races)、[mutex requirements](https://timsong-cpp.github.io/cppwp/n4861/thread.mutex.requirements)
- [Microsoft: C# lock](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)
- [Microsoft: ReadFile — 読取り量と位置](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)
- [Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching)、[Synchronous and Asynchronous I/O](https://learn.microsoft.com/en-us/windows/win32/fileio/synchronous-and-asynchronous-i-o)
- [Microsoft: Creating a File View](https://learn.microsoft.com/en-us/windows/win32/memory/creating-a-file-view)
- [Microsoft: Testing for the End of a File](https://learn.microsoft.com/en-us/windows/win32/fileio/testing-for-the-end-of-a-file)、[GetOverlappedResult](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getoverlappedresult)
- [Microsoft: asyncとスレッド](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model#threads)
- [Intel 64 and IA-32 Architecture / Optimization manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
