---
title: 仮想メモリ — アドレス変換・ページ・予約とコミット
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: 仮想アドレスが物理ページへ対応する仕組みと、Windowsの予約・コミット・常駐を区別する。TLB、ページフォルト、遅延割当、コピーオンライト、保護と観察方法を調べる。
  aliases: [virtual memory, 仮想メモリ, 仮想アドレス, 物理アドレス, アドレス空間, ページ, page table, ページ表, TLB, MMU, page fault, ページフォルト, demand paging, demand-zero, copy-on-write, COW, reserve, commit, resident, working set, ワーキングセット, VirtualAlloc]
  verification: Windows API契約とIntel SDMの一次資料照合（2026-11-02）
---

# 仮想メモリ — アドレス変換・ページ・予約とコミット

仮想メモリは、**プロセスが使うアドレスを管理し、物理メモリとの対応とアクセス権を決める仕組み**です。RAMが足りないときの退避だけでなく、プロセスの隔離、ファイルの共有、必要になってからの割当にも使います。

ここでは通常のWindowsアプリを中心に、CPU側はx64のページングを説明モデルにします。CPUの変換機構と、Windows APIの予約・コミットという契約を分けて読みます。GPUの仮想メモリ、仮想マシンの二段階変換、AWEやラージページの詳細は扱いません。

## 仮想アドレスと物理アドレス

アプリがポインタを使ってメモリを読むとき、そのアドレスは通常、**そのプロセスの仮想アドレス空間**に属します。物理アドレスは、変換後にメモリへアクセスする側のアドレスです。ポインタの数値からRAM上の位置を直接読めるわけではありません。

プロセスAとBに同じ数値の仮想アドレスがあっても、同じデータとは限りません。OSが別の物理ページへ対応付けられるためです。同一プロセスのスレッドはアドレス空間を共有しますが、別プロセスとの共有には、共有メモリなどの仕組みを使います。隔離は「他プロセスのアドレスを整数として作れない」という意味ではなく、それだけでは対象のメモリへ到達できないという意味です。[Microsoft: Virtual Address Space](https://learn.microsoft.com/en-us/windows/win32/memory/virtual-address-space)

| 言葉 | このページでの意味 |
| --- | --- |
| 仮想アドレス空間 | プロセスが使うアドレスの範囲。すべての場所にデータがあるわけではない |
| 仮想ページ | 仮想アドレス空間を一定の大きさで区切った単位 |
| 物理ページ／ページフレーム | RAM側を区切った単位。仮想ページと対応付ける |
| マッピング | どの仮想ページを、どこへ、どの権限で対応させるかという関係 |
| 常駐（resident） | 対象の内容が現在RAMにあること。アドレスの予約とは別の性質 |

**仮想的に連続する領域を、物理的には離れたページで支えられます。** 大きな配列の仮想アドレスが連続していても、同じ大きさの連続したRAM領域を丸ごと探す必要があるとは限りません。OSが対応を管理するので、アプリは通常、物理配置を意識せずに仮想アドレスを使います。[Microsoft: Virtual Address Space and Physical Storage](https://learn.microsoft.com/en-us/windows/win32/memory/virtual-address-space-and-physical-storage)

<figure class="study-figure">
  <img src="/images/memory/address-translation.svg" alt="連続した仮想ページV0からV3を、離れたRAMの物理ページへ対応付ける模式図。CPUはTLBまたはページ表の情報から変換と権限を確認する。TLBミスはページフォルトと同義ではなく、ページフォルト時にはOSが対応を判断する。" width="760" height="1460" />
  <figcaption><strong>同じアドレスを使い続けられることと、RAM上で連続していることは別。</strong> ページ番号と配置は説明用です。矢印は変換情報を参照する流れを示し、データのコピーを表しません。<a href="/study/images/memory/address-translation.svg" target="_blank" rel="noopener noreferrer">アドレス変換の図を拡大</a></figcaption>
</figure>

## ページ・ページ表・TLBの仕事

### ページ内の位置は引き継ぐ

ページによる変換では、アドレスを「ページ番号」と「ページ内の位置（オフセット）」に分けます。例えばページサイズが4 KiBなら、仮想アドレス`0x12345080`は、仮想ページ番号`0x12345`とオフセット`0x080`に分かれます。対応する物理ページの先頭を見つけ、同じオフセットの場所へアクセスします。

4 KiBは基本ページの説明例です。Windowsでは`GetSystemInfo`が返す`SYSTEM_INFO.dwPageSize`で、通常のページサイズを確認します。`dwAllocationGranularity`は仮想領域の予約開始アドレスに関する粒度で、ページサイズとは別です。「64 bitなら全アドレスが使える」「ページも予約粒度もいつも同じ定数」とは扱いません。[Microsoft: SYSTEM_INFO](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/ns-sysinfoapi-system_info)

### ページ表は対応を記録し、TLBは変換を覚える

**ページ表（page table）**は、OSが管理する変換用データ構造です。x64の通常のページングでは、CPUのメモリ管理機構（MMU）が階層状の表をたどり、対応と権限を確認します。図ではこの階層を一つの箱に省略しています。

**TLB（Translation Lookaside Buffer）**は、アドレス変換の情報をキャッシュします。対象の情報があれば利用し、なければページ表などを参照して変換を進めます。ヒットした場合でもアクセス権を無視できるわけではありません。TLBは変換の情報、データキャッシュは読み書きする内容を扱う、と役割を分けます。

**TLBミスだけで、ページフォルトやディスク読込みになるわけではありません。** x64では有効な変換をハードウェアが求められる場合、OSの例外処理へ渡さずアクセスを進められます。表の形式や段数、キャッシュ構成は対象CPU・設定に依存します。[Intel SDM Volume 3A, §5.10「Caching Translation Information」](https://cdrdv2.intel.com/v1/dl/getContent/671190#page=153)

## Windowsの予約・コミット・常駐を分ける

以下は、通常の`VirtualAlloc`によるプライベートメモリの説明です。ファイルマッピングなど、別のAPIで作る領域まで同じ手順になるとは限りません。

ファイルの内容を仮想アドレス空間へ対応付ける方式は、[メモリマップドファイル](/os/memory-mapped-files.html)で扱います。ビューを作ることと、全内容がRAMへ読み込まれていることは別です。必要なページへのアクセスで、ページの準備やI/Oを待つ場合もあります。これは`ReadAsync`などの非同期readを発行したこととも異なります。[Microsoft: File Mapping](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping)

| 言葉 | 何を確保・確認するか | その時点でRAMを占有するか |
| --- | --- | --- |
| 予約（reserve） | そのプロセスで使う仮想アドレスの範囲を取り置く | 対象データの物理ページは割り当てない |
| コミット（commit） | ページを使用するための、システムの資源負担を引き受けさせる | それだけで全ページがRAMに置かれるとは限らない |
| 常駐（resident） | 現在、内容がRAMにあるかを表す | 現在の配置についての状態 |

Windowsのページ状態には、空きの`MEM_FREE`、予約済みの`MEM_RESERVE`、コミット済みの`MEM_COMMIT`があります。**residentは、この三つに続く第四のページ状態ではありません。** コミット済みでも、まだ触っていない、あるいは常駐していない場合があります。アクセスできるかには保護属性も関係します。[Microsoft: Page State](https://learn.microsoft.com/en-us/windows/win32/memory/page-state)

`MEM_RESERVE`はアドレスの場所取りです。予約しただけのページを読んだり書いたりすることはできません。`MEM_COMMIT`はコミット量（commit charge）に関係する処理で、**呼出し時に全ページへ物理RAMを配る処理ではありません**。通常のこの割当では、初回の読取り・書込みで必要な物理ページが用意され、初期内容はゼロになります。`malloc`から再利用された領域までゼロになるという意味ではありません。[Microsoft: VirtualAlloc — MEM_RESERVE / MEM_COMMIT](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualalloc)

### 「仮想メモリ」と「ページファイル」は同義ではない

ページファイルは、変更されたページの内容を退避し、システムのコミット可能量を支えるために使われます。仮想アドレスの変換・保護・共有という仕組み全体の名前ではありません。コミット量も、今ページファイルへ書かれているデータ量とは一致しません。

ページファイルがなくても、RAMに裏付けられる範囲で仮想メモリを使用できます。ただしコミット上限やクラッシュダンプ等の条件が変わります。ここから「無効にすべき」と設定方針を導くのではなく、予約量・コミット量・RAMの使用量・退避先を区別します。[Microsoft: Introduction to page files](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/introduction-to-the-page-file)

## ページフォルトで起きること

ページフォルトは、アクセスに必要な変換がそのまま使えない場合や、ページの権限に合わないアクセスなどで、CPUから処理を移す仕組みです。OSは原因と領域の管理情報を調べ、処理を続けられるか判断します。x64の例外には、単に変換先がない場合と保護違反の場合を区別する情報があります。[Intel SDM Volume 3A, §5.7「Page-Fault Exceptions」](https://cdrdv2.intel.com/v1/dl/getContent/671190#page=148)

| きっかけ | OSが行うことの例 | 毎回ディスクI/Oが必要か |
| --- | --- | --- |
| コミットした通常ページへの初回アクセス | ゼロ初期化されたページを用意する（demand-zero） | 不要な場合がある |
| 内容が既にRAMにあるが、現在のワーキングセットにない | 既存のページを再び利用可能にする | 不要な場合がある |
| 内容を退避先やマッピング元から読み戻す必要がある | ページファイルやファイルから読み込む | 読込みを必要とする |
| 予約だけの領域、解放済み領域、許可されない書込み | 正常な割当の続きとしては扱わず、例外を通知する | 読み込めば解決するとは限らない |

Windowsでは、退避先へのアクセスなしに解決できるものをsoft fault、退避先から読込みが必要なものをhard faultと区別します。**fault数が増えたことだけでは、ディスクが遅かったとも、メモリバグとも判断できません。** 初回アクセスも起きるため、原因やI/O、処理時間を合わせて観察します。[Microsoft: Working Set](https://learn.microsoft.com/en-us/windows/win32/memory/working-set)

必要になってからページの内容を用意する考え方が**demand paging**です。起動時に全データをRAMへ展開せず、アクセスに応じて準備することができます。一方、処理の途中で準備やI/Oを待つ可能性もあります。ゲームのヒッチを調べるときは、確保APIの呼出し時間だけでなく、その領域を初めて触った区間も分けて観察します。

重要なのは、**未コミットへのアクセスは、コミット済みの正常な初回アクセスとは違う**ことです。普通のアプリが予約領域を触るだけで、自動的にコミットされる契約ではありません。必要な範囲を先にコミットしてから使います。不正アクセスはAccess Violationとして通知され得ます。[Microsoft: Page State](https://learn.microsoft.com/en-us/windows/win32/memory/page-state)

## コピーオンライトと共有

複数の仮想ページを同じ物理ページへ対応付けることもできます。**コピーオンライト（copy-on-write、COW）**は、変更するまで内容を共有し、書込み時に必要なページを複製して、その側の対応を変更する方式です。最初から各利用者へ全ページを複製するより、コピーと物理メモリの消費を遅らせられます。[Microsoft: Memory Protection — Copy-on-Write Protection](https://learn.microsoft.com/en-us/windows/win32/memory/memory-protection)

Windowsの具体例は、`MapViewOfFile`の`FILE_MAP_COPY`で作るビューです。書き込んだページはそのプロセス用のコピーになり、元ファイルへは書き戻されません。通常の書込み可能な共有ビューとは契約が異なります。「共有されているページなら、必ず書込み時にコピーされる」とは考えません。

また、**実際のコピーを遅らせることと、コミット量の計上を遅らせることも別**です。`FILE_MAP_COPY`では全ページが書き換えられ得るため、ビュー全体についてコミット量が計上されます。[Microsoft: MapViewOfFile — FILE_MAP_COPY](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile)

[ファイルマッピングの観察例](/practice/io/mapped-file-observation.html)では、ファイルに対応するビューと、その範囲・寿命を確かめます。マッピング元のファイル、マッピングオブジェクト、ビューは別の資源です。ビューを解除した後は、そのアドレスやそこを借りた参照を使いません。[Microsoft: Closing a File Mapping Object](https://learn.microsoft.com/en-us/windows/win32/memory/closing-a-file-mapping-object)

## 保護が防ぐもの・防がないもの

Windowsでは、`PAGE_READONLY`、`PAGE_READWRITE`、`PAGE_NOACCESS`、`PAGE_EXECUTE_READ`などでページへの操作を指定します。読めること・書けること・命令として実行できることは別です。保護はページ単位なので、ページ内の一部分だけへ同じ仕組みで異なる保護を付けることはできません。[Microsoft: Memory Protection Constants](https://learn.microsoft.com/en-us/windows/win32/memory/memory-protection-constants)

そのため、OSの保護だけでC++のオブジェクト寿命や配列の範囲を検査できるわけではありません。解放済みの領域がまだアクセス可能なページに残っていたり、はみ出した先も書込み可能だったりすると、すぐには例外にならない場合があります。**「クラッシュしなかった」は正しいアクセスの証明になりません。** 言語側の規則と[メモリバグの検出](/runtime/memory/memory-bugs.html)も必要です。

## 解放と観察のつなぎ方

`VirtualFree`の`MEM_DECOMMIT`は、コミットを解除して予約状態へ戻します。`MEM_RELEASE`は通常、予約した領域全体を解放してアドレスの取り置きも終えます。後者は予約時のベースアドレスとサイズ`0`を渡すなど、API固有の条件があります。どちらもC++のデストラクタを呼ぶ操作ではありません。[Microsoft: VirtualFree](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualfree)

通常の`free`や`delete`はアロケータ側へ返す操作も含むため、毎回このOS APIの解放まで進むとは限りません。その経路は[確保すると内部で何が起きるか](/runtime/memory/allocation-journey.html)、再利用戦略は[プール・アリーナ](/runtime/memory/allocators-and-pools.html)へ進んで確認できます。

観察するときは、質問と指標を合わせます。

| 知りたいこと | Windowsで見るもの |
| --- | --- |
| この仮想領域は予約済みか、コミット済みか | `VirtualQuery`の`State` |
| 読み書きなどの保護は何か | `VirtualQuery`の`Protect` |
| 対象ページの常駐などの情報 | `QueryWorkingSetEx` |
| 現在のプロセスでRAMに常駐するページ量 | ワーキングセット。共有ページも含み得る |

`VirtualQuery`は仮想領域の状態や保護を調べるAPIです。`MEM_COMMIT`という結果だけで全ページの常駐を確認したことにはなりません。ページごとの情報には、対象アドレスを指定する`QueryWorkingSetEx`などを使います。[Microsoft: VirtualQuery](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualquery)、[QueryWorkingSetEx](https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-queryworkingsetex)

[Windowsメモリ観察サンプル](/practice/memory/windows-memory-observation.html)では、予約・コミット・ページへの書込み・コミット解除・解放を分けて試せます。測定値は、その瞬間のOSの管理やプロセス全体の活動にも左右されます。「要求したバイト数と、ある指標の増分が毎回ぴったり一致する」と決めず、何を数えている値かを先に確認してください。
