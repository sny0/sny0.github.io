---
title: Windowsのファイル書き込みと永続化
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: WriteFileの完了後にデータがどこにあるかを追い、キャッシュのフラッシュ、ファイルの置き換え、ゲームのセーブからの復旧を分けて考える。
  aliases: [書き込みキャッシュ, write-back, ライトスルー, durability, FlushFileBuffers, FILE_FLAG_WRITE_THROUGH, FILE_FLAG_NO_BUFFERING, ReplaceFileW]
  verification: MicrosoftのWin32 API仕様に照合し、C#例の出力と保存したバイト列をWindowsで確認（2026-11-06）
---

# Windowsのファイル書き込みと永続化

ゲームがセーブデータをファイルに書くと、Windowsは通常、そのデータをシステムのファイルキャッシュに受け取ります。この時点で書き込みAPIは成功を返せます。キャッシュ内の変更は、キャッシュマネージャーが後からストレージへ書き出します。電源断に備えて保存の区切りを決めるには、書き込みの完了と、保存先へのフラッシュの完了を別々に確認します。[Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching) · [ファイルを読むと内部で何が起きるか](/os/file-read-journey.html)

## バイトがストレージへ届くまで

<figure class="study-figure">
  <img src="/images/os/file-write-and-durability.svg" alt="通常の書き込みでは、データがアプリのバッファからWindowsのファイルキャッシュに渡り、ストレージを通って不揮発媒体へ書き出される。ランタイムのフラッシュはアプリ側のバッファをOSへ渡し、FlushFileBuffersは対象ファイルについてOSから保存先への書き出しを求める。" width="760" height="334" loading="lazy">
  <figcaption>Windowsでキャッシュを使ってローカルファイルに書くときの概念図です。ストレージ側にも揮発性のキャッシュがある構成を示しています。<a href="/study/images/os/file-write-and-durability.svg" target="_blank" rel="noopener noreferrer">書き込み経路の図を拡大</a></figcaption>
</figure>

1. **アプリとランタイム**。Cの`FILE*`やC#の`StreamWriter`などは、データをプロセス内のバッファにまとめてから、下のファイルAPIへ渡すことがあります。Cの`fflush`は通常、このストリームの書き込みバッファをOSへ渡します。MSVCには、ディスクへのコミットも求める拡張設定があります。[Microsoft: `fflush`の仕様](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/fflush) · [コミットの設定](https://learn.microsoft.com/en-us/cpp/c-runtime-library/commit-to-disk-constants)
2. **Windows**。通常のファイルハンドルに対する`WriteFile`は、キャッシュでデータを受け取り、保存先への書き出しを後に回せます。この間でも、アクセスが許可された読み手には、Windowsのキャッシュから更新後のバイトが見えることがあります。ハンドルを閉じた後も、キャッシュに残る変更の書き出し時期はOSが決めます。[Microsoft: File Caching](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching) · [システムバッファのフラッシュ](https://learn.microsoft.com/en-us/windows/win32/fileio/flushing-system-buffered-i-o-data-to-disk)
3. **ストレージ**。下位層はファイルの変更を装置への書き込みに変換します。装置にも揮発性のキャッシュがある場合、そこに受け取った時点と、不揮発媒体に記録した時点が分かれます。保存先へのフラッシュがどこまで届くかには、ファイルシステム、ドライバー、装置の仕様が関わります。ネットワーク越しではサーバー側の動作も関わります。[Microsoft: CreateFileWのキャッシュ動作](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew#caching-behavior) · [Microsoft: FlushViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-flushviewoffile)

同期書き込みが返る時点と、非同期書き込みの完了を受け取る時点は、それぞれの書き込み要求が終わった時点です。どちらもキャッシュ設定に従います。たとえば、通常のキャッシュ付きファイルに対する`WriteFile`の完了通知を受けた後、アプリはバッファを再利用できます。保存の区切りでフラッシュする場合は、その区切りに含める書き込みがすべて完了してから行います。[Microsoft: WriteFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-writefile) · [非同期ファイルI/O](/os/asynchronous-file-io.html)

## FlushFileBuffersとファイルを開くときの設定

| 操作 | 何を変えるか |
| --- | --- |
| `FlushFileBuffers(handle)` | 書き込み権限を持つハンドルを渡し、対象ファイルについてOSが保持する変更を保存先へ書き出す。保存の区切りで呼び、戻り値を確認する |
| `FILE_FLAG_WRITE_THROUGH` | `CreateFileW`で指定する。通常のシステムキャッシュと組み合わせると、変更をキャッシュへ入れつつ、後回しにせず書き出す |
| `FILE_FLAG_NO_BUFFERING` | `CreateFileW`で指定し、ファイルデータの読み書きでWindowsのファイルキャッシュを迂回する。ファイルのメタデータはキャッシュされることがあり、装置のキャッシュは別に扱う。バッファ、サイズ、オフセットのアラインメントを確認する |

二つのフラグは独立です。両方を指定した場合、Windowsはシステムのファイルキャッシュを迂回し、装置のキャッシュから不揮発媒体への書き込みも要求します。対応する装置の能力を前提とする動作です。通常のファイルでは、小さな書き込みをまとめ、セーブの区切りで一度フラッシュする方法が取れます。フラッシュの待ち時間がフレーム進行に影響する場合は、セーブ処理をゲームループから分離します。[Microsoft: FlushFileBuffers](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers) · [CreateFileWのキャッシュ動作](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew#caching-behavior) · [アラインメントの要件](https://learn.microsoft.com/en-us/windows/win32/fileio/file-buffering)

ファイルをメモリへマップして書き換えた場合は、`FlushViewOfFile`で変更したページの書き出しを始めます。ファイルのメタデータも含めて保存先へ書き出す手順として、Microsoftは続けて`FlushFileBuffers`を呼ぶよう示しています。[Microsoft: FlushViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-flushviewoffile) · [メモリマップドファイル](/os/memory-mapped-files.html)

## セーブのどの状態を守るか

| 観点 | ゲームのセーブでの問い |
| --- | --- |
| 可視性 | 次の読み手が、新しいデータをいつ読めるか |
| 原子性 | 観察される状態が更新前と更新後のどちらかに収まり、途中の状態を見せずに済むか |
| 永続性 | セーブ完了を知らせた後に、電源断やOSの異常終了が起きてもデータが残るか |

たとえば、既存のセーブを開いて先に長さを0にし、データを書き直すと、途中で失敗した際に旧データを失います。最後にフラッシュを加えても、その前に発生した失敗からは復旧できません。複数セクターにまたがる通常の`WriteFile`にも、書き込み全体の原子性は保証されません。[Microsoft: WriteFileの注意事項](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-writefile#remarks)

既存のセーブを更新するなら、次のように内容の書き出しと、ゲームが参照するファイル名の更新を分けられます。

1. セーブ本体と同じディレクトリに、別名でファイルを新規作成する。新しいデータを最後まで書き、書き込み結果を確認する。
2. ランタイムのバッファがあれば先にフラッシュし、その後OSにフラッシュを要求する。成功を確認してハンドルを閉じる。
3. `ReplaceFileW`で既存のセーブと置き換える。必要なら旧版のバックアップ名も指定する。初回のセーブで置き換え先がまだなければ、完成したファイルを目的の名前へ移動する。戻り値を確認し、失敗時はエラーに応じて各ファイルの状態を調べる。
4. 起動時はファイル形式の版、長さ、チェックサムなどを検証する。本体を読めないときは、検証を通った旧版から復旧する。[Microsoft: ReplaceFileWのエラーと同一ボリューム要件](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) · [Microsoft: MoveFileExW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)

この手順で先にフラッシュする対象は、新しく作ったファイルの内容です。その後の置き換えは名前やメタデータの更新を伴います。`ReplaceFileW`の`REPLACEFILE_WRITE_THROUGH`はサポートされていません。また、`MoveFileExW`は別ボリュームへの移動を許す設定ではコピーと削除で処理できます。置き換え後に電源断が起きたとき何が残るかは、採用するAPIと保存先の契約を確認し、復旧手順も用意します。[Microsoft: ReplaceFileWのフラグ](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) · [Microsoft: MoveFileExWのフラグ](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)

## C#で保存先へのフラッシュを要求する

.NETのコンソールプロジェクトの`Program.cs`で実行できます。`dotnet run`を実行したディレクトリに`flush-demo.txt`を新規作成し、同名のファイルがあれば例外で終了します。`Flush(flushToDisk: true)`は、`FileStream`自身のバッファとOSのバッファの書き出しを求めます。[Microsoft: FileStream.Flush(Boolean)](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.flush?view=net-8.0#system-io-filestream-flush(system-boolean)) · [Microsoft: FileMode.CreateNew](https://learn.microsoft.com/en-us/dotnet/api/system.io.filemode?view=net-8.0)

```csharp
using System;
using System.IO;
using System.Text;

byte[] bytes = Encoding.UTF8.GetBytes("save demo\n");
using var file = new FileStream("flush-demo.txt", FileMode.CreateNew, FileAccess.Write);
file.Write(bytes, 0, bytes.Length);
file.Flush(flushToDisk: true);
Console.WriteLine("Flush completed.");
```

`StreamWriter`を使う場合は、その書き込みバッファを先に`Flush()`で下の`FileStream`へ渡してから、`FileStream.Flush(flushToDisk: true)`を呼びます。この例で観察するのはフラッシュ要求の戻りです。保存名の更新や、電源断からの復旧を調べる場合は、それぞれ別に途中状態を再現して確認します。[Microsoft: StreamWriter.Flush](https://learn.microsoft.com/en-us/dotnet/api/system.io.streamwriter.flush?view=net-8.0)
