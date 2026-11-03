---
title: ファイルを読むと内部で何が起きるか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: アプリの受取バッファ、ライブラリの緩衝、OSのファイルキャッシュ、ファイルシステムとストレージを分けて読む。要求数と実際数、ファイル位置、短いread、EOFとエラー、デコードと所有権も扱う。
  aliases: [file I/O, ファイルI/O, ファイル読み取り, ReadFile, CreateFileW, FileStream, ファイルキャッシュ, file cache, buffer, バッファ, buffered I/O, EOF, end of file, short read, seek, ファイル位置, 同期I/O, 非同期I/O]
  verification: 一次資料照合（2026-11-04）
---

# ファイルを読むと内部で何が起きるか

ファイルの読取りAPIは、指定した位置のbyte列を、アプリが使えるバッファへ渡します。その裏にはライブラリの緩衝、OSのファイルキャッシュ、ファイルシステム、デバイスなどの層があります。**読取りAPIを一回呼んだことと、SSDやHDDへ一回アクセスしたことは同じではありません。**

ここではWindowsの通常のファイルを、キャッシュを利用する**同期読み取り**で扱います。具体例はC++からの`CreateFileW`／`ReadFile`と、C#の緩衝を使う`FileStream.Read`です。パイプやソケットまで同じEOF規則とせず、POSIXのAPIもWindows内部と同じ詳細実装だとは説明しません。

## 読み取り経路の各層

| 層 | 役割 |
| --- | --- |
| アプリの受取バッファ | 今回読み取れたbyteを受け取り、処理する領域 |
| ライブラリのバッファ | 小さな読み取りを、内部に保持したデータから満たすなどの緩衝 |
| OSのファイルキャッシュ | ファイルデータをシステムのメモリ上に保持し、再利用する仕組み |
| ファイルシステム | ファイルやディレクトリを管理し、保存する形式やアクセスを支える仕組み |
| デバイス・ストレージ | 必要なデータを下位層から取得する。ドライバーや機器側の処理も関わる |

Windowsは通常、ファイルデータをOSのキャッシュに保持します。必要な内容がそこにあれば再利用し、なければ取得する経路へ進みます。**ヒット**は必要なデータがキャッシュにあること、**ミス**はそこにないことです。実際には部分的なヒットや先読みもあり、図は代表的な役割をまとめたものです。[Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching)

ファイルシステムとドライバーは、ファイルをストレージ上で扱うための形式や機能を提供します。ローカルのSSD、ネットワーク上のファイル、フィルタードライバーなどでは経路も変わります。OSキャッシュがミスしても、機器側のキャッシュで満たされる場合があるので、「必ずNANDや磁気媒体から読んだ」とは判断できません。[Microsoft: File Systems](https://learn.microsoft.com/en-us/windows/win32/fileio/file-systems)、[File Buffering — hardware caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-buffering)

<figure class="study-figure">
  <img src="/images/io/file-read-path.svg" alt="アプリの受取バッファ、ライブラリの緩衝、OSファイルキャッシュと、キャッシュミス時にファイルシステムやデバイスを通る経路の概念図。一回の読取りAPIと一回の物理I/Oが対応するとは限らない。" width="760" height="1510" />
  <figcaption><strong>バッファやキャッシュが、どの層にあるかを分ける。</strong> 矢印は役割のつながりで、すべての環境の内部呼出し順序やコピー回数を固定する図ではありません。<a href="/study/images/io/file-read-path.svg" target="_blank" rel="noopener noreferrer">ファイル読取り経路の図を拡大</a></figcaption>
</figure>

### OSへ要求してから、完了が返るまで

ライブラリ内で満たせない読み取りは、OSが提供するI/Oサービスへ進みます。Windowsではカーネル側のI/Oマネージャーやファイルシステム・デバイスのドライバーが関わり、ドライバーへ処理を渡す仕組みの一つが**IRP**（I/O Request Packet、I/O要求パケット）です。読み取りにはFast I/Oの経路もあるので、「アプリのread一回につき、必ず一個のIRP」とは数えられません。[Microsoft: Windows I/O Model](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/overview-of-the-windows-i-o-model)、[IRP-based readとFast I/O](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/irp-based-i-o-operations-that-obey-device-object-flags)

ファイル内の位置も、装置上の住所そのものではありません。例えばクラスタで管理するファイルシステムでは、ファイル内の範囲とボリューム上の配置を対応付けます。配置は一続きとは限らず、ファイル内のオフセット5からSSDの物理位置を計算できるわけではありません。Windowsにはこの対応を調べる`FSCTL_GET_RETRIEVAL_POINTERS`もありますが、今回のサンプルは配置の照会や変更を行いません。[Microsoft: VCNとLCNの対応](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/fsctl-get-retrieval-pointers)

必要な下位I/Oが終わると、結果は上位へ返されます。エラーやキャンセルで完了する場合もあります。同期readを待っているスレッドは、その完了後に結果を受け取って先へ進みます。待ち時間の間ずっとCPUで自作のループを回して待つ、という意味ではありません。[Microsoft: I/Oの完了](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/when-to-complete-an-irp)、[同期・非同期I/O](https://learn.microsoft.com/en-us/windows/win32/fileio/synchronous-and-asynchronous-i-o)

### アプリの5byteと、下位層の読取り単位は別

アプリが5byteを要求しても、OSやデバイスまで5byteずつ読んでいるとは限りません。下位層では、より大きな単位での取得や再利用が関わります。キャッシュの管理単位を、アプリの配列サイズから推測することはできません。

C#の`FileStream`の緩衝も、OSのキャッシュとは別です。`FileStreamOptions.BufferSize`はライブラリ側の緩衝の設定です。その緩衝を無効にすることと、Windowsの`FILE_FLAG_NO_BUFFERING`でOS側のデータキャッシュを使わない指定をすることは同一ではありません。後者には別の整列などの要件があります。[Microsoft: FileStreamOptions.BufferSize](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestreamoptions.buffersize?view=net-10.0)、[File Buffering](https://learn.microsoft.com/en-us/windows/win32/fileio/file-buffering)

## 開くと、何を受け取るか

Windowsの`CreateFileW`は、名前に反して新規作成専用ではありません。`OPEN_EXISTING`を指定すれば既存ファイルを開きます。読み取り権限、他の利用者との共有条件などを指定し、成功すると**ハンドル**（OSの対象へアクセスするための値）を受け取ります。失敗の印は`INVALID_HANDLE_VALUE`で、詳細は`GetLastError`で確認します。[Microsoft: CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)

`W`はパスを渡す文字列の形式に関わるもので、ファイルの内容をUTF-16として読む指示ではありません。内容の読み取りを行う`ReadFile`は、byteをバッファへ渡します。

C#では、例えば`FileMode.Open`と`FileAccess.Read`で`FileStream`を開きます。見つからないファイルやアクセスできないファイルでは、例外で失敗を知らせます。「開けなかった」ことを「空のファイルを正常に読めた」と同じ扱いにはしません。[Microsoft: FileMode.Open](https://learn.microsoft.com/en-us/dotnet/api/system.io.filemode?view=net-10.0)

## ファイル位置と、要求数・実際数

**ファイル位置**は、次に読む場所を表すbyte単位のオフセットです。オフセット0は先頭、5は先頭から5byte進んだ位置です。今回の同期`ReadFile`では、非OVERLAPPEDのハンドルに対して`lpOverlapped`を`nullptr`として使います。成功した読み取りでは、現在位置から実際に読み取った数だけ位置が進みます。[Microsoft: ReadFile — Synchronization and File Position](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)

| APIで扱う量 | 意味 |
| --- | --- |
| 要求数 | 今回、最大で何byte読みたいか |
| 実際数 | 今回、本当に受取バッファへ渡されたbyte数 |
| バッファ容量 | バッファに安全に置ける大きさ。実際数とは別 |
| 読み取り後の位置 | 次回の開始位置。今回の読み取りでは実際数だけ進む |

`ReadFile`では、成功・失敗を戻り値で調べ、同期読み取りの実際数を別の出力引数で受け取ります。C#の`FileStream.Read`では、戻り値が実際数です。**要求数をそのまま「読めた数」として処理しません。**[Microsoft: ReadFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)、[FileStream.Read](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.read?view=net-9.0)

### 12byteを5byteのバッファで読む例

実践用の固定データは次の12byteです。他の書き手が途中で変更しない、通常のファイルとして扱います。

```text
位置:  0  1  2  3  4  5  6  7  8  9 10 11
内容: 41 42 00 0D 0A E3 81 82 10 20 FE FF
```

5byteずつ要求したときの、一つの読取り例は次のようになります。

| 開始位置 | 要求数 | 実際数 | 今回のデータ | 次の位置 |
| ---: | ---: | ---: | --- | ---: |
| 0 | 5 | 5 | `41 42 00 0D 0A` | 5 |
| 5 | 5 | 5 | `E3 81 82 10 20` | 10 |
| 10 | 5 | 2 | `FE FF` | 12 |
| 12 | 5 | 0 | なし、EOF | 12 |

最後の2byteを受け取ったら、今回のデータはバッファの先頭2byteだけです。残る3byteには以前の内容が残り得ます。毎回バッファ全体を処理すると、読んでいない部分まで今回のデータとして扱ってしまいます。

<figure class="study-figure">
  <img src="/images/io/read-position-and-eof.svg" alt="12byteのファイルを5byteずつ要求し、5、5、2、0byteを受け取る一例。位置は0から5、10、12へ進み、EOFでは12のまま。位置5へseekして3byte読むとE3 81 82を受け取り位置8となる。" width="760" height="1390" />
  <figcaption><strong>EOFはファイルに入った特別なbyteではなく、読取り結果として扱う。</strong> 分割は説明用の一例で、一般の<code>FileStream.Read</code>が必ずこの回数・大きさで返る保証ではありません。<a href="/study/images/io/read-position-and-eof.svg" target="_blank" rel="noopener noreferrer">位置とEOFの図を拡大</a></figcaption>
</figure>

## 短いread、EOF、エラー

**短いread**は、要求より少ない数が返る読み取りです。上の末尾2byteも正常な読み取りです。`FileStream.Read`は要求を常に満たす契約ではないため、短い結果だけで読み取り終了とは決めず、実際数を処理して次へ進みます。[Microsoft: FileStream.Read](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.read?view=net-9.0)

**EOF**はEnd Of File、ファイルの終わりです。今回のように**要求数が0より大きい同期ファイル読み取り**では、Windowsの`ReadFile`が成功して実際数0ならEOFとして扱います。C#でも、正の数を要求した`FileStream.Read`の戻り値0で、読める内容が終わったと判断します。要求数そのものが0なら、0が返ってもEOFの根拠にはなりません。[Microsoft: Testing for the End of a File](https://learn.microsoft.com/en-us/windows/win32/fileio/testing-for-the-end-of-a-file)

このWindowsの判定を、OVERLAPPEDを使う非同期読み取りへそのまま移しません。非同期版では、開始時の`ReadFile`や完了結果を受け取る`GetOverlappedResult`で`ERROR_HANDLE_EOF`を扱う場合があります。開始の戻り値と完了結果、EOFを分ける手順は[非同期ファイルI/Oの本文](/os/asynchronous-file-io.html)で説明します。[Microsoft: 同期と非同期で異なるEOFの検査](https://learn.microsoft.com/en-us/windows/win32/fileio/testing-for-the-end-of-a-file)

このbyte列の`00`はNUL、`0D 0A`はCRとLFですが、`ReadFile`と`FileStream`はそのまま読みます。NULで内容を打ち切ったり、改行を一byteへ変換したりしません。末尾の`FF`もEOFマークではありません。

失敗はEOFと分けます。同期`ReadFile`が失敗したら、その直後にエラー情報を確保します。C#の読取り例外も、実際数0として握りつぶしません。固定長ヘッダーなど「必要な数を読み切る」処理では、EOFまでに必要数へ届かなければ、ファイルの不足として別に検査します。

## seekで位置を変える

Windowsでは`SetFilePointerEx`、C#では`FileStream.Position`や`Seek`で位置を変更できます。今回の例で位置5へ移動し3byteを要求すると、`E3 81 82`を読み、位置は8になります。[Microsoft: SetFilePointerEx](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfilepointerex)、[FileStream.Position](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.position?view=net-10.0)

これは次の読み取り場所を変える操作です。既に受け取ったバッファを書き換える操作ではありません。`FileStream.Position`もストリーム上の位置であり、下位のI/O回数や物理デバイスの動作を観測する値ではありません。

## 読んだbyteを、何として解釈するか

読み取りと**デコード**（決めた形式から意味のあるデータへ解釈する処理）は別です。この固定データはbyteの観察用で、全体をUTF-8テキストとみなす例ではありません。位置5の`E3 81 82`だけならUTF-8の`あ`ですが、APIがその意味まで判定して返すわけではありません。

一般のテキストでは、読み取りの区切りがUTF-8の複数byte文字の途中に来ることもあります。各バッファを独立した完全なテキストとして変換せず、途中状態を引き継ぐデコーダーなどを使います。コード単位や不正列の規則は[Unicodeと文字コード](/data/unicode-and-encoding.html)を参照してください。

## closeと所有権

ファイルを開いた側は、ハンドルやストリームを誰が閉じるかを決めます。C++のWindowsハンドルはRAII（所有オブジェクトの破棄で資源を解放する形）、C#でパスから開いた`FileStream`は`using`などで、通常の例外でも解放できる形にします。`CloseHandle`と`Dispose`はそれぞれの資源を解放する契約です。[Microsoft: CloseHandle](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-closehandle)、[FileStream.Dispose](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.dispose?view=net-10.0)

閉じた後も、OSのファイルキャッシュにデータが残る場合があります。閉じて再び開いたことを、キャッシュのない状態から読み直した証拠にはできません。既存ハンドルを別のオブジェクトへ渡す設計では、借りているのか所有しているのかも確認し、二重に閉じないようにします。

## 同期読み取りの待ちと、非同期への境界

同期読み取りでは、処理が完了してから呼出し元へ戻るため、下位のI/Oが必要なら呼出し側が待つ場合があります。キャッシュにあれば短く済む場合もあり、「毎回待ち時間が同じ」「必ずディスク待ち」とは限りません。

Windowsの非同期読み取りは、`FILE_FLAG_OVERLAPPED`で開くなど、完了の扱いが別です。`ReadFile`の`FALSE`と`ERROR_IO_PENDING`は、その場合には失敗ではなく進行中を示します。完了するまでバッファや要求情報を有効に保つ必要があり、同期の戻り値判定だけを流用しません。非同期用ハンドルでも、常に即時復帰するとは限りません。[Microsoft: ReadFile — asynchronous operations](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)

C#にも`ReadAsync`がありますが、非同期化は「ストレージが速くなった」という意味ではありません。完了の受取り、エラー、キャンセル、資源の寿命を管理する別の設計です。`async`や`await`から、要求ごとに専用の別スレッドが作られるとも判断しません。[Microsoft: Asynchronous File I/O](https://learn.microsoft.com/en-us/dotnet/standard/io/asynchronous-file-i-o)、[asyncとスレッドの関係](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model#threads)

[非同期ファイルI/Oの本文](/os/asynchronous-file-io.html)と[同期・非同期の読取りを比較する観察例](/practice/io/async-file-read-observation.html)では、C++のOVERLAPPEDと手動リセットイベント、C#／.NET 10の`FileOptions.Asynchronous`と`ReadAsync`へ進みます。このページの実践は同期版の基礎を確認するもので、IOCPによる多数の要求の処理は別の発展項目です。

## ゲームのアセット読込みにつなげる

テクスチャや音声などは、byteが届いた後にも、展開・形式の解析・画像や音声のデコード・GPUへの転送などが関わります。「ファイルread完了」と「ゲームで使用可能」は別の段階です。フレームの遅延を調べるときは、読み取り待ちと、その後のCPU処理や転送を分けます。エンジンやGPU APIへ登録する処理は、そのAPIのスレッド条件にも従います。

[C++とC#でファイルの読み取りを観察する](/practice/io/file-read-observation.html)では、専用の一時領域に固定データを作り、要求数と実際数、位置、seek、EOF、存在しないファイルの失敗を確認します。warm cacheは、必要なデータが既にキャッシュにある状態を指します。**直前に作った小さなファイルやwarm cacheでの成功は、物理I/Oの発生を観測した証拠ではありません。** この実験が確かめるのはAPIの結果と内容であり、機器の読取り回数や性能は別の観測を必要とします。
