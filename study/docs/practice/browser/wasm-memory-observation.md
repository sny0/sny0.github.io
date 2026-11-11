---
title: WebAssemblyの読み込みと線形メモリを観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: wasm-memory-observation
  order: 1
  summary: 同じWasmモジュールを2つの経路で読み込み、JavaScriptとWasmから同じ整数を更新し、境界チェックとメモリの拡張を観察する。
  aliases: [WebAssembly, Wasm, WAT, instantiateStreaming, instantiate, linear memory, Memory.grow, DataView, RuntimeError]
  verification: Windows上のブラウザで両読み込み経路、MIME型による切り替え、境界トラップとメモリ拡張を実行確認（2026-11-05）
---

# WebAssemblyの読み込みと線形メモリを観察する

小さな `memory.wasm` を実際に読み込み、エクスポートされた `add_at` を呼びます。JavaScriptから置いた32ビット整数をWasmが更新し、JavaScriptがそのバイト列を読み直します。モジュールの読み込みとメモリ配置の図は辞典記事にあります。[WebAssemblyと線形メモリ](/browser/webassembly-linear-memory.html)

<p><a href="/study/samples/browser/wasm-memory-observation/index.html" target="_blank" rel="noopener noreferrer">WebAssemblyの実験ページを新しいタブで開く</a></p>

## 2つの経路で同じモジュールを読み込む

「配信条件に合わせて読み込む」は、応答がパラメーターなしの `application/wasm` でブラウザにAPIがある場合に `WebAssembly.instantiateStreaming()` を使います。この条件を満たさない場合は、応答のバイト列を最後まで受け取ってから `WebAssembly.instantiate()` に渡します。「ArrayBuffer で読み込む」は常にバイト列を経由します。画面に実際に使った経路と、配信されたMIME型が出ます。[WebAssembly Web APIのストリーミング](https://webassembly.github.io/spec/web-api/#streaming-modules)

どちらでも、新しいインスタンスを作るたびにメモリが初期化されます。モジュールは外部からのimportを要求せず、線形メモリ `memory` と関数 `add_at` を公開します。

## バイト位置16の整数を更新する

| 操作 | 画面で観察する値 |
| --- | --- |
| モジュールを読み込む | JavaScriptがバイト位置16へ `41` を書く。4バイトは `29 00 00 00` |
| Wasmで1を足す | `add_at(16, 1)` が `42` を返す。JavaScriptが読み直した値も `42`、4バイトは `2a 00 00 00` |
| 範囲外へアクセスする | 末尾3バイトしか残らない位置から4バイトを読もうとし、Wasmの境界チェックで `WebAssembly.RuntimeError` が発生する |
| メモリを1ページ増やす | 65,536バイトから131,072バイトへ増える。以前の固定長ビューは0バイトになり、新しいビューでは元の値を読み出せる |

`16` は線形メモリの先頭から数えたバイト位置です。JavaScript側は `DataView` のリトルエンディアン指定を使います。範囲外アクセスは、教材の関数では最初のloadが失敗するため、その後のstoreまで進みません。[WebAssembly Coreのメモリ命令](https://webassembly.github.io/spec/core/exec/instructions.html#memory-instructions)

メモリを拡張したら、`memory.buffer` からビューを作り直します。教材のメモリは非共有で、固定長の `ArrayBuffer` を使います。新しいページの先頭4バイトが `00 00 00 00` であることも確認できます。このモジュールの最大サイズは2ページです。[WebAssembly JS InterfaceのMemory](https://webassembly.github.io/spec/js-api/#memories)

## 手元で動かす

次のファイルを同じフォルダに保存します。実験の実行に使うのは `index.html`、`styles.css`、`main.js`、`memory.wasm` です。

- <a href="/study/samples/browser/wasm-memory-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/wasm-memory-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/wasm-memory-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/wasm-memory-observation/memory.wat" download>memory.wat</a>
- <a href="/study/samples/browser/wasm-memory-observation/memory.wasm" download>memory.wasm</a>
- <a href="/study/samples/browser/wasm-memory-observation/README.md" download>README.md</a>

Python 3で次を実行し、`http://127.0.0.1:4184/index.html` を開きます。終了時はCtrl+Cで停止します。

```powershell
python -m http.server 4184 --bind 127.0.0.1
```

`memory.wat` はテキスト形式のソースです。配布版のバイナリはWABT 1.0.39の `wat2wasm` で組み立てました。[WABT公式リポジトリ](https://github.com/WebAssembly/wabt)

```powershell
wat2wasm memory.wat -o memory.wasm
```

## 配布したバイナリの区切り

`memory.wasm` は75バイトです。先頭の `00 61 73 6d` がWasmの識別子で、続く `01 00 00 00` がバイナリ形式のバージョンです。以降の位置はファイル先頭からのオフセットです。実験で整数を書く位置16は、インスタンスが作る線形メモリの先頭から数えます。[WebAssembly Coreのバイナリ形式](https://webassembly.github.io/spec/core/binary/modules.html)

| ファイル内の位置（16進数） | セクション | このモジュールで定義するもの |
| --- | --- | --- |
| `0x08` | Type | 2つの `i32` を受け、`i32` を返す関数型 |
| `0x11` | Function | 関数が参照する型 |
| `0x15` | Memory | 初期1ページ、最大2ページ |
| `0x1b` | Export | `memory` と `add_at` |
| `0x30` | Code | `add_at` のローカル変数と命令 |

## コード

### WATで読むモジュール

<<< @/public/samples/browser/wasm-memory-observation/memory.wat{text}

### ブラウザからの読み込みと観察

<<< @/public/samples/browser/wasm-memory-observation/main.js{js}
