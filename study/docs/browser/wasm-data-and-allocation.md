---
title: WebAssemblyのデータ受け渡しとメモリ確保 — ポインタ・長さ・アリーナ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: JavaScriptの配列と文字列をWasmの線形メモリに並べる規約と、アリーナが領域を確保・再利用する流れを説明する。
  aliases: [WebAssembly, Wasm, ABI, pointer, length, UTF-8, TextEncoder, alignment, padding, arena, bump allocator, alloc, cursor, reset]
  verification: WebAssembly Core・JavaScript Interface、WHATWG Encoding、ECMAScript、WebAssembly Basic C ABIと照合（2026-11-05）
---

# WebAssemblyのデータ受け渡しとメモリ確保 — ポインタ・長さ・アリーナ

JavaScriptからWasmの関数に複数の値を渡す方法の一つは、**線形メモリ**にバイト列を書き、関数に**開始位置と長さ**を渡すことです。メモリ上の表現、長さの単位、誰が領域を管理するかまで双方で取り決めます。言語や実行環境の境界で値を渡す規約は **ABI**（Application Binary Interface）の一部です。この実践では二つの `i32` を引数に取り、先頭からのバイト位置と、読み取る範囲を表します。[WebAssembly JavaScript Interfaceのエクスポート関数](https://webassembly.github.io/spec/js-api/#exported-function-exotic-objects)、[WebAssemblyと線形メモリ](/browser/webassembly-linear-memory.html)

## 配列は要素数、UTF-8はバイト数を渡す

| 関数 | 開始位置 `ptr` | 長さの単位 | メモリから読む量 |
| --- | --- | --- | --- |
| `sum_i32(ptr, count)` | 線形メモリ内のバイト位置 | 32ビット整数の個数 | `count × 4` バイト |
| `sum_u8(ptr, byteLength)` | 線形メモリ内のバイト位置 | 符号なしバイトの個数 | `byteLength` バイト |

配列 `[10, -2, 32]` は、1要素4バイトのリトルエンディアンで連続して並べます。開始位置が1024なら、要素の先頭は1024、1028、1032です。JavaScriptは `DataView.setInt32(ptr + i * 4, value, true)` で値を書き、Wasmの `sum_i32(1024, 3)` を呼びます。Wasmは `i32.load` で各要素を読み、合計の40を返します。実践の `i32.add` は32ビットで巡回します。[ECMAScriptのDataView.setInt32](https://tc39.es/ecma262/multipage/structured-data.html#sec-dataview.prototype.setint32)、[WebAssembly Coreのメモリ命令](https://webassembly.github.io/spec/core/exec/instructions.html#memory-instructions)、[整数の加算](https://webassembly.github.io/spec/core/exec/numerics.html#integer-operations)

文字列 `A猫🎮` には、UTF-16コード単位が4個、Unicodeのコードポイントが3個あります。 `TextEncoder.encode()` の結果はUTF-8の8バイトです。ここでは終端バイトを付けずに並べるので、1040へ書いたときは `sum_u8(1040, 8)` を呼びます。この関数は `i32.load8_u` で各バイトを符号なしの値として読み、合計の1322を返します。文字列に戻すには `TextDecoder` などでUTF-8をデコードします。[ECMAScriptのString型](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type)、[WHATWG EncodingのTextEncoder](https://encoding.spec.whatwg.org/#interface-textencoder)、[Unicodeと文字コード](/data/unicode-and-encoding.html)

<figure class="study-figure">
  <img src="/images/browser/wasm-abi-data-layout.svg" alt="配列は1024から3個の32ビット整数を各4バイトで置き、sum_i32に開始位置1024と要素数3を渡す。文字列は1040からUTF-8の8バイトを置き、sum_u8に開始位置1040とバイト数8を渡す。" width="760" height="1100" loading="lazy">
  <figcaption>配列から先に確保する例です。同じ長さ引数でも、関数によって数える単位が変わります。<a href="/study/images/browser/wasm-abi-data-layout.svg" target="_blank" rel="noopener noreferrer">配列とUTF-8のバイト配置を拡大</a></figcaption>
</figure>

## バイト列を作る処理とビューを作る処理

`new DataView(memory.buffer)` や `new Uint8Array(memory.buffer, ptr, n)` は、指定したバッファを参照する**ビュー**を作ります。実践では配列の値を1要素ずつその領域へ書き、文字列は `TextEncoder.encode()` で作ったバイト列を `set()` でコピーします。その後のWasm関数の呼び出しで渡すのは開始位置と長さです。関数内のload命令は、JavaScriptが書いた線形メモリを参照します。[ECMAScriptのTypedArrayとDataView](https://tc39.es/ecma262/multipage/structured-data.html#sec-structured-data)、[WHATWG EncodingのTextEncoder](https://encoding.spec.whatwg.org/#interface-textencoder)

構造体も渡す場合は、フィールドの型と順番、各フィールドの開始位置、パディング、構造体全体のサイズを合わせます。C/C++からコンパイルする場合、`int32_t*` のようなポインタ引数と長さ引数を持つ関数は、この実践と同様の形で扱えます。構造体のレイアウトや引数・戻り値の渡し方は、そのビルドが採用するABIとエクスポートされたインターフェースに従います。[WebAssembly Basic C ABI](https://github.com/WebAssembly/tool-conventions/blob/main/BasicCABI.md#data-representation)

## allocは空き領域の先頭を進める

**アリーナ**は、寿命の近いデータをまとめて置く領域です。実践ではメモリのバイト位置1024から始め、次に使える位置を `cursor` に記録します。この位置を進めながら領域を切り出す方法を **bump allocator** と呼びます。 `alloc(size)` の中では次の順に処理します。

1. 現在の `cursor` を8の倍数まで切り上げ、今回の先頭候補 `start` を求めます。
2. `size` が正で、`start` から現在のメモリ末尾までに収まるかを調べます。
3. 収まれば `cursor` を `start + size` へ進め、`start` を返します。収まらなければ `0` を返し、`cursor` はその位置にとどまります。

最初の配列は `alloc(12)` で1024から始まり、`cursor` は1036になります。次の `alloc(8)` は1036を1040へ切り上げるため、間に4バイトの**パディング**が生まれます。文字列用の領域は1040〜1047、次の `cursor` は1048です。この8バイト境界は教材の確保規約です。Wasmのロード命令には非整列アクセスも定義されているので、型のレイアウトやアロケータの規約と命令の挙動を区別して読みます。[WebAssembly Coreのメモリ命令とアライメント](https://webassembly.github.io/spec/core/syntax/instructions.html#memory-instructions)

## 確保とmemory.growとresetを分ける

実践の `alloc` は現在あるメモリの範囲で確保し、`memory.grow(1)` は別の操作として呼びます。例えば `cursor = 1048`、メモリが1ページの状態では、末尾まで64,488バイトです。 `alloc(65_536)` は `0` を返します。1ページ追加して131,072バイトになれば、同じ大きさを確保して `cursor` を66,584まで進められます。拡張時に既存のバイトは同じ位置に残ります。JavaScript側では、この実践の非共有・固定長バッファが切り離されるので、`memory.buffer` から新しいビューを作ります。[WebAssembly Coreのメモリインスタンス](https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances)、[JavaScript InterfaceのMemory](https://webassembly.github.io/spec/js-api/#memories)

<figure class="study-figure">
  <img src="/images/browser/wasm-arena-allocation.svg" alt="アリーナは開始位置1024から配列12バイトと4バイトのパディングを挟んでUTF-8の8バイトを置き、次の位置は1048になる。1ページでは65536バイトの追加確保に失敗する。メモリを2ページへ拡張すると同じ確保が成功し、リセットは次の位置を1024へ戻す。" width="760" height="1140" loading="lazy">
  <figcaption>領域の切り出し、メモリ自体の拡張、まとめて再利用するための位置の巻き戻しを分けます。<a href="/study/images/browser/wasm-arena-allocation.svg" target="_blank" rel="noopener noreferrer">アリーナの状態変化を拡大</a></figcaption>
</figure>

`reset()` は `cursor` を1024に戻します。それまで切り出した領域はまとめて再利用できる状態になり、個別に `free` する手順はありません。バイト列やページ数は保持されます。古い位置には次のデータが書かれるので、リセットを境に以前のポインタと長さの組は使えなくなると取り決めます。内容の消去が必要なら、再利用とは別に該当範囲への上書きが必要です。

## どの範囲を読んでよいかを確かめる

Wasmのload命令が検査するのは、アクセスが**線形メモリ全体**に収まるかです。配列の最後を越えた位置が線形メモリ内にあれば、ロード自体は実行されます。実践の読み取り関数は開始位置が1024以上かつ `cursor` 以下かを確かめ、残りバイト数から読める個数の上限を求めます。例えば4バイトの要素なら、`count` を `(cursor - ptr) / 4` の整数部分と比べます。範囲外の引数ではWasmがトラップし、JavaScript側では `WebAssembly.RuntimeError` になります。[WebAssembly Coreのメモリ命令](https://webassembly.github.io/spec/core/exec/instructions.html#memory-instructions)、[JavaScript Interfaceのエラー対応](https://webassembly.github.io/spec/js-api/#errors)

この検査で確かめられる範囲は、アリーナの先頭から `cursor` までです。例えば配列の開始位置1024に対して誤って要素数6を渡すと、24バイトが収まるため、パディングと文字列まで読み取ります。実践では、Wasmが領域の確保とリセットを管理し、JavaScriptは返された開始位置と実際に書いた長さを組にして、次のリセットまで使います。確保ごとに境界を検査するには領域の開始位置・サイズを、リセットをまたいだ古い参照を検査するには確保の世代も記録します。

## 実践との対応

ブラウザで配列と文字列を送り、確保前後の `cursor` と先頭のずれ、線形メモリに並んだバイト、Wasmの戻り値を確認できます。1ページ分の確保、明示的な拡張、リセットもそれぞれ実行します。[配列・文字列とアリーナの実験](/practice/browser/wasm-abi-observation.html)
