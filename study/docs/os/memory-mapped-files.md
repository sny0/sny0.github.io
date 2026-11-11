---
title: メモリマップドファイル — ファイルの範囲をアドレスへ対応させる
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: ファイルオフセットと仮想アドレスの対応、ビューの整列、ページフォルトによる待ち、ビューと参照の寿命を説明する。Windowsと.NETの読取り専用マッピングを中心に、書込み・COW・flushとの境界を区別する。
  aliases: [メモリマップドファイル, memory-mapped file, file mapping, mmap, マッピング, ファイルビュー, CreateFileMapping, MapViewOfFile, UnmapViewOfFile, MemoryMappedFile, MemoryMappedViewAccessor, PointerOffset, allocation granularity]
  verification: 一次資料照合（2026-11-04）
---

# メモリマップドファイル — ファイルの範囲をアドレスへ対応させる

メモリマップドファイルは、ファイルの内容をプロセスの仮想アドレス空間の一部に対応付けて扱う仕組みです。対応する範囲をビュー（view）と呼びます。通常の`ReadFile`ではアプリの受取バッファへ読み取りますが、マッピングではビューのアドレスを通じて内容へアクセスします。[Microsoft: File Mapping](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping)

ここではWindowsの通常ファイルと、Windows版.NET 10の読取り専用ビューを中心に説明します。POSIXの`mmap`と同じAPI契約として扱いません。アドレス変換とページの基本は[仮想メモリ](/os/virtual-memory.html)、通常のreadとキャッシュは[ファイルを読む仕組み](/os/file-read-journey.html)を参照してください。

## ファイルの位置と、メモリの位置を区別する

**ファイルオフセット**は先頭から何byte目かを示す数です。**仮想アドレス**は、現在のプロセス内でメモリへアクセスするための場所です。同じファイルをマップし直しても、同じ仮想アドレスになる保証はありません。

例えば、ファイルのオフセット65536から13byteをマップし、返された先頭アドレスを`p`とします。このとき`p + 5`は、ファイルオフセット65541に対応します。65541はアドレスそのものではなく、`p`もディスク上の位置ではありません。

```text
対応するファイルオフセット = ビュー開始のファイルオフセット + ビュー内の位置
アクセスする仮想アドレス   = ビューの先頭アドレス             + ビュー内の位置
```

この対応には範囲があります。計算が整数型に収まり、対象がファイルと要求ビューの有効範囲内にあることを確認します。OSがページ単位に丸めて管理していても、余分な部分までアプリの有効なデータとして読んでよい根拠にはしません。[Microsoft: MapViewOfFile — offset and size](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile)

## Windowsの割当粒度に合わせてビューを作る

Win32の`MapViewOfFile`では、開始ファイルオフセットをシステムの**割当粒度**（allocation granularity）の倍数にします。`GetSystemInfo`が返す`dwAllocationGranularity`で取得する値です。`dwPageSize`はページ保護やコミットの粒度を表す別の値で、混同しません。[Microsoft: SYSTEM_INFO](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/ns-sysinfoapi-system_info)

割当粒度を`G`、読みたい先頭を`offset`、必要な長さを`length`とすると、次のように前へ揃えます。ここではすべて非負の整数です。

```text
baseOffset = (offset / G) * G
delta      = offset - baseOffset
viewLength = delta + length
```

`G = 65536`の説明例で、`offset = G + 5`から8byteを読むなら、`baseOffset = G`、`delta = 5`、`viewLength = 13`です。ファイルのオフセット`G`から13byteをビューにし、その中の5〜12番を使います。65536はこの図の値であり、実践コードは実行時に`G`を取得します。[Microsoft: Creating a File View](https://learn.microsoft.com/en-us/windows/win32/memory/creating-a-file-view)

<figure class="study-figure">
  <img src="/images/io/mapped-file-addresses.svg" alt="割当粒度Gの倍数から13byteをマップし、ビュー内delta5から8byteを読む例。ファイルオフセットG+5、Win32のビュー内位置5、.NETの要求アクセサー内位置0を区別する。" width="760" height="1510" />
  <figcaption><strong>ファイル内の位置、整列したビュー、目的範囲を分ける。</strong> 図のGは説明用の65536です。仮想アドレスの数値や物理RAM上の配置を決める図ではありません。<a href="/study/images/io/mapped-file-addresses.svg" target="_blank" rel="noopener noreferrer">ファイルとアドレスの対応図を拡大</a></figcaption>
</figure>

## マップしただけで全内容がRAMへ届くわけではない

ビューを作ることは、ファイルの全byteを事前に読み終えたという完了通知ではありません。通常のページングでは、アクセスしたページに必要な対応がなければ**ページフォルト**が起き、OSが処理します。

必要な内容がRAM内の共有ページやキャッシュにあれば、ストレージから新たに読まずに解決できる場合があります。Windowsの用語では、裏付け先からの読取りを必要としないものがソフトページフォルト、必要なものがハードページフォルトです。フォルトの回数だけで物理I/Oの回数は決まりません。[Microsoft: Working Set](https://learn.microsoft.com/en-us/windows/win32/memory/working-set)

ストレージから内容を得る必要があれば、**そのアドレスを読んだスレッドが待つことがあります。** 通常のメモリ読取りに見える式の中で、I/O待ちが現れ得るわけです。ビューを作った後に別の部分を参照すれば、そこで新たに待つ可能性もあります。

したがってマッピングは、[非同期I/O](/os/asynchronous-file-io.html)の要求・完了通知と同じ方式ではありません。「マップ済みだからメインスレッドで触っても待たない」「一度読んだから永久にRAMに残る」とは言えません。OSによる先読みやページの回収もあり、常駐状態は変化します。

また、**マッピングの作成成功と、その後の読取り成功は別**です。ファイルを支えるデバイスや接続の問題などで、アクセス時に`EXCEPTION_IN_PAGE_ERROR`が生じる場合があります。C++の通常の`catch (std::exception&)`へ自動的に同じ形で届くものではなく、Windowsの構造化例外処理（SEH）の対象です。実践のC++例は、対象範囲内のこの例外だけを小さな読取り関数で区別します。故障を意図的に起こす教材ではありません。[Microsoft: Reading and Writing From a File View](https://learn.microsoft.com/en-us/windows/win32/memory/reading-and-writing-from-a-file-view)

## Win32のファイル・マッピングオブジェクト・ビュー

読取り専用の例では、三つの資源を区別します。

| 資源 | 作る操作 | 役割と終了操作 |
| --- | --- | --- |
| ファイルハンドル | `CreateFileW` | 読取り元を開く。`CloseHandle`で閉じる |
| ファイルマッピングオブジェクト | `CreateFileMappingW` | ファイルとの対応を管理する。`CloseHandle`で閉じる |
| ビュー | `MapViewOfFile` | プロセス内でアクセスする範囲。`UnmapViewOfFile`で解除する |

`CreateFileMappingW`自体はアプリが触れるビューの先頭ポインタを返しません。読取り専用なら、読取り権限のファイルから`PAGE_READONLY`のマッピングを作り、`FILE_MAP_READ`のビューを作ります。マッピングの権限とビューの権限には互換性が必要です。[Microsoft: CreateFileMappingW](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-createfilemappingw)

**ビュー内へのポインタ、参照、そこを指すspanは、ビューの寿命を延ばしません。** 解除した後は使えません。所有者を保持して利用期間を結び付けるか、必要な内容を別の所有バッファへコピーします。実践では8byteを配列へコピーし、その配列だけを外へ返します。

ファイルやマッピングオブジェクトのハンドルを閉じることも、ビューの解除そのものではありません。Win32ではハンドルを閉じても残るビューがあるため、`CloseHandle`だけで後片付けが済むと考えません。実践はRAIIでビューを先に解除し、マッピングとファイルを閉じます。RAIIは、所有するC++オブジェクトの破棄に後片付けを結び付ける方法です。[Microsoft: Closing a File Mapping Object](https://learn.microsoft.com/en-us/windows/win32/memory/closing-a-file-mapping-object)

<figure class="study-figure">
  <img src="/images/io/mapped-access-and-lifetime.svg" alt="マッピング後のアクセスがRAM内で解決する場合、ページフォルトで待つ場合、I/O例外となる場合を示し、参照利用終了からビュー解除、ハンドルの解放までを分けた概念図。" width="760" height="1510" />
  <figcaption><strong>マップ済みでも、アクセス時の待ちと失敗を考える。</strong> ビューに依存する参照は解除前に使い終えます。物理I/Oの発生や待ち時間を実測した図ではありません。<a href="/study/images/io/mapped-access-and-lifetime.svg" target="_blank" rel="noopener noreferrer">アクセスと寿命の図を拡大</a></figcaption>
</figure>

## C#のアクセサー内位置は、要求したビューから数える

`MemoryMappedFile.CreateFromFile`は既存のファイルからマッピングを作り、`CreateViewAccessor(offset, size, MemoryMappedFileAccess.Read)`は、その範囲を読めるアクセサーを作ります。アクセサーは、位置を指定して読み書きするためのオブジェクトです。[Microsoft: CreateFromFile](https://learn.microsoft.com/en-us/dotnet/api/system.io.memorymappedfiles.memorymappedfile.createfromfile?view=net-10.0)、[CreateViewAccessor](https://learn.microsoft.com/en-us/dotnet/api/system.io.memorymappedfiles.memorymappedfile.createviewaccessor?view=net-10.0)

実践では`offset = G + 5`、`size = 8`を直接渡し、`ReadArray<byte>(position: 0, ...)`で読みます。ここで0は、**要求したアクセサーの先頭**です。Win32例の生ポインタに足す`delta = 5`を、アクセサーの位置へもう一度足しません。[Microsoft: ReadArray](https://learn.microsoft.com/en-us/dotnet/api/system.io.unmanagedmemoryaccessor.readarray?view=net-10.0)

Windows版.NET v10.0.0の公開実装では、内部で開始位置を割当粒度へ揃え、先頭の余分な部分を隠します。今回のWindows実測では、その差を表す`PointerOffset`は5でした。要求したファイルオフセット65541、アクセサー内の位置0とは別の数です。この内部整列を全OSの実装へ一般化しません。[.NET: Windowsのビュー作成](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.IO.MemoryMappedFiles/src/System/IO/MemoryMappedFiles/MemoryMappedView.Windows.cs)、[アクセサーへのオフセットの適用](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.IO.MemoryMappedFiles/src/System/IO/MemoryMappedFiles/MemoryMappedViewAccessor.cs)

`using`でアクセサー、マッピング、ストリームの順に破棄します。`leaveOpen: true`はマッピングの破棄後も元のストリームを残す指定であり、元の所有者による破棄が不要になる指定ではありません。実践はストリームも別の`using`で管理します。

## 読取り専用・COW・書込み・永続化は別の契約

読取り専用は「このビューから書かない」というアクセス権です。ファイル内容が永遠に変わらないことや、作成時点のスナップショットを意味しません。

| 方式 | 書込みの扱い |
| --- | --- |
| 読取り専用 | ビューへの書込みは許可されない |
| コピーオンライト（COW） | 書いたページをそのプロセス用に分ける。元ファイルへは書き戻さない |
| 書込み可能なビュー | ファイルへ反映する変更として扱う。同期と保存の条件が必要 |

Windowsの`FILE_MAP_COPY`はCOWです。全ページが変更され得るため、ビュー全体についてコミット量が計上される点も含め、通常の読取り専用とは区別します。[Microsoft: MapViewOfFile — access flags](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile)

書込み可能なビューへ書いても、その瞬間にストレージへの保存が完了するわけではありません。`FlushViewOfFile`だけではファイルのメタデータや、機器内部のキャッシュまでの永続化を保証しません。Windowsの資料は、対象の変更とメタデータをディスクへ書く場合に`FlushViewOfFile`に続けて`FlushFileBuffers`を呼ぶ手順を示しています。これは複数の変更の原子性や、破損しない保存形式まで保証する手順ではありません。ネットワーク越しの保存にも別の条件があります。[Microsoft: FlushViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-flushviewoffile)

今回の実践は読取り専用で、COW、共有書込み、flush、障害時の永続性は検証しません。

## ファイル変更と、ゲームで選ぶ条件

ビューが有効でも、別の処理による変更と同時に読んでよいとは限りません。読取り側が複数フィールドの途中状態を見る問題は、マッピングだけでは解決しません。通常の`ReadFile`・`WriteFile`とマップしたビューの一貫性も、一律に保証されません。実践は自己所有の固定ファイルを使い、読取り中に変更しません。[Microsoft: MapViewOfFile — coherency](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile)

切詰めも、マップしたまま安全に長さだけ変えられる操作とは扱いません。Windowsの`SetEndOfFile`には、先に全ビューを解除し、マッピングオブジェクトを閉じる条件があります。他OSの切詰め後の挙動を、そのままWindowsの説明へ移しません。[Microsoft: SetEndOfFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setendoffile)

ゲームでは、大きな読取り専用データの一部を参照する用途などで検討できます。ただし、明示的なreadの削減と、ページフォルト、仮想アドレスの消費、ビューの寿命管理を合わせて判断します。今回のように配列へコピーするコードなら、そのコピーも残ります。**必ず高速になる方式でも、必ずコピーがゼロになる方式でもありません。**

ファイル内へ実行時の生ポインタを保存せず、オフセットなどで参照を表します。byteをC++の構造体へそのまま重ねる設計も、アラインメント・型の寿命・形式の版・byte順を別に検討する必要があります。[整数とバイト列](/data/integer-bits-and-bytes.html)の区別も使います。

マッピングは[ゲームのアセットロード設計](/game/asset-loading.html)で選ぶ読取り手段の一つです。圧縮データの展開やデコード、GPUへの転送、利用可能化まで自動で済ませるものではありません。

## 実践記事

[通常のreadと読取り専用マッピングを比較する](/practice/io/mapped-file-observation.html)では、既知の8byteを両方式で読み、Win32の整列と.NETの位置指定を確かめます。作った直後の小さなファイルなので、全内容がいつRAMへ届いたか、ストレージI/Oの有無、速度の優劣はこの実験から結論しません。
