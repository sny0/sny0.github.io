---
title: WebAssemblyと線形メモリ — バイナリから実行・共有するバイト列まで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: browser
  summary: Wasmのバイナリと実行時の状態を分け、JavaScriptとWasmが線形メモリを読み書きする仕組み、拡張と境界検査を説明する。
  aliases: [WebAssembly, Wasm, WAT, 線形メモリ, linear memory, memory32, instantiate, instantiateStreaming, imports, exports, LEB128, i32.load, i32.store, memory.grow, trap]
  verification: WebAssembly Core・JavaScript Interface・Web API、V8・Emscripten・rustcの公式資料と照合（2026-11-05）
---

# WebAssemblyと線形メモリ — バイナリから実行・共有するバイト列まで

**WebAssembly（Wasm）** は、ブラウザなどの実行環境が検証して動かせる命令形式です。ブラウザでは、JavaScriptがWasmのモジュールを読み込み、外部へ公開された関数を呼びます。関数に配列などを渡すときは、**線形メモリ**上にデータを並べ、どの位置から何バイト使うかを双方で決める方法があります。[WebAssembly Coreの概要](https://webassembly.github.io/spec/core/intro/introduction.html)、[WebAssembly JavaScript Interface](https://webassembly.github.io/spec/js-api/)

## .wasmの先頭とセクションを読む

`.wasm` はモジュールのバイナリ表現です。実践のファイルでは、先頭4バイトの `00 61 73 6d` が形式を見分けるマジック番号、その次の `01 00 00 00` がバイナリ形式の版を表します。この後に、型、インポート、関数、メモリ、エクスポート、命令本体などの**セクション**が続きます。各セクションには種別を表すIDと内容のバイト数があり、バイト数は符号なしの**LEB128**という可変長形式で表します。[WebAssembly Coreのバイナリモジュール](https://webassembly.github.io/spec/core/binary/modules.html#binary-module)、[セクションの形式](https://webassembly.github.io/spec/core/binary/modules.html#binary-section)、[整数のエンコード](https://webassembly.github.io/spec/core/binary/values.html#integers)

**WAT**（WebAssembly Text Format）は、同じモジュールの構造を人が読める形で表したものです。たとえば `(memory (export "memory") 1 2)` は、初期1ページ・最大2ページのメモリを定義し、外から `memory` という名前で参照できるようにします。ブラウザのWebAssembly APIへは、WATをツールで変換したバイナリを渡します。[WebAssembly Coreのテキスト形式](https://webassembly.github.io/spec/core/text/index.html)

## 検証・コンパイル・インスタンス化を分ける

| 段階 | ブラウザで起きること |
| --- | --- |
| 取得 | HTTP応答からモジュールのバイト列を受け取る |
| 検証 | モジュールを解釈し、命令が使う型や関数の参照先が規則に合うかを調べる |
| コンパイル | 実行に使える形を準備し、JavaScriptには `WebAssembly.Module` を返す |
| インスタンス化 | インポートを実際の関数やメモリなどに結び付け、モジュール内で定義したメモリなどを作る |
| 呼び出し | `WebAssembly.Instance` の `exports` にある関数を呼び、必要に応じてメモリを読み書きする |

インスタンス化では、データセグメントを使って初期化し、開始関数の宣言があれば実行します。同じ `Module` から複数の `Instance` を作れます。メモリを独自に定義したインスタンスはそれぞれ別のメモリを使い、同じメモリをインポートしたインスタンスはそのメモリを使います。エンジンの内部では、呼び出し時に関数をコンパイルしたり、頻繁に使う関数を後から最適化したりする構成もあります。[WebAssembly Coreのインスタンス化](https://webassembly.github.io/spec/core/exec/modules.html)、[JavaScript InterfaceのModuleとInstance](https://webassembly.github.io/spec/js-api/)、[V8のコンパイル実装例](https://v8.dev/docs/wasm-compilation-pipeline)

JavaScriptでは、`compile()` でモジュールを用意してから、`instantiate()` でインスタンスを作る段階を分けられます。次の `bytes` は取得済みのバイト列、`imports` はモジュールに渡す値を名前でまとめたオブジェクトです。[WebAssembly JavaScript Interfaceのコンパイルとインスタンス化](https://webassembly.github.io/spec/js-api/)

```js
const module = await WebAssembly.compile(bytes)
const instance = await WebAssembly.instantiate(module, imports)
```

<figure class="study-figure">
  <img src="/images/browser/wasm-module-to-instance.svg" alt="先頭8バイトとセクション列を持つWasmバイナリを読み込む。検証とコンパイルでModuleを用意し、インポートの結び付けと初期化でInstanceを作る。JavaScriptが公開された関数を呼び、エクスポートされたメモリを使う。" width="760" height="1060" loading="lazy">
  <figcaption>モジュールの定義を読み込む段階と、値を保持するインスタンスを用意する段階を分けて見ます。<a href="/study/images/browser/wasm-module-to-instance.svg" target="_blank" rel="noopener noreferrer">モジュールからインスタンスまでの図を拡大</a></figcaption>
</figure>

`WebAssembly.instantiateStreaming(fetch(url), imports)` では、HTTP応答の受信とコンパイルを並行して進められます。検証を通ったモジュールからインスタンスを作ります。成功を表すHTTPステータスと、パラメータのない `Content-Type: application/wasm` が必要です。別オリジンの応答ならCORSの条件も満たします。応答を `arrayBuffer()` で受け取ってから `WebAssembly.instantiate()` に渡す経路もあります。[WebAssembly Web APIのストリーミング](https://webassembly.github.io/spec/web-api/#streaming-modules)、[同一オリジンポリシーとCORS](/browser/same-origin-cors.html)

| エラー | どこで起きるかの例 |
| --- | --- |
| `WebAssembly.CompileError` | バイナリを解釈できない、あるいはモジュールが検証規則に合わない |
| `WebAssembly.LinkError` | インスタンス化時に、指定されたインポートの値が要求される種類や型に合わない |
| `WebAssembly.RuntimeError` | 実行中にトラップした。線形メモリの範囲外を読む例など |

通信や応答の条件に関わる失敗と、Wasmの検証・実行に関わる失敗を分けると、調べる箇所を絞れます。たとえばストリーミング時のMIME型の不一致は `TypeError` です。開始関数がトラップすれば、インスタンスを作る途中でも `RuntimeError` が起きます。[WebAssembly JavaScript Interfaceのエラー型](https://webassembly.github.io/spec/js-api/#error-objects)、[WebAssembly Web APIのストリーミング](https://webassembly.github.io/spec/web-api/#streaming-modules)

## 線形メモリはバイトオフセットで読む

**線形メモリ**は、先頭を0とする連続したバイト列です。実践で使う `memory32` では、`i32.load` や `i32.store` が32ビットのアドレス値を受け取り、線形メモリの中で位置を求めます。たとえば `add_at(16, 1)` の `16` は先頭から16バイト進んだ位置です。OS上のプロセスやJavaScriptオブジェクトの位置とは別のアドレス空間です。Wasmの関数が使う局所変数やオペランドスタックも、仕様では線形メモリと区別されます。C/C++のツールチェーンが線形メモリ上に置くスタックは、ツールチェーンが設ける領域です。[WebAssembly Coreのメモリ命令](https://webassembly.github.io/spec/core/exec/instructions.html#memory-instructions)、[実行時の状態](https://webassembly.github.io/spec/core/exec/runtime.html)、[EmscriptenのSTACK_SIZE](https://emscripten.org/docs/tools_reference/settings_reference.html#stack-size)

実践では、JavaScriptが `memory.buffer` に対して `DataView` を作り、`setInt32(16, 41, true)` で値を書きます。最後の `true` はリトルエンディアンの指定です。Wasmの `i32.load` と `i32.store` もリトルエンディアンで4バイトを扱います。Wasm関数が1を加えると、同じオフセット16〜19の4バイトは `29 00 00 00` から `2a 00 00 00` に変わり、JavaScriptからは42と読めます。[WebAssembly Coreのメモリ命令](https://webassembly.github.io/spec/core/exec/instructions.html#memory-instructions)、[ECMAScriptのDataView.setInt32](https://tc39.es/ecma262/multipage/structured-data.html#sec-dataview.prototype.setint32)

<figure class="study-figure">
  <img src="/images/browser/wasm-linear-memory-layout.svg" alt="1ページの線形メモリのオフセット16から19にJavaScriptが41をリトルエンディアンで書く。Wasmが1を加えると同じ4バイトが42を表す。非共有メモリを1ページから2ページに拡張すると、古い固定長バッファは切り離され、新しいビューから既存の値を読める。" width="760" height="1040" loading="lazy">
  <figcaption>JavaScriptで書き込んだ値、Wasmによる更新、メモリを拡張した後のビューを順に確かめます。<a href="/study/images/browser/wasm-linear-memory-layout.svg" target="_blank" rel="noopener noreferrer">線形メモリとビューの図を拡大</a></figcaption>
</figure>

4バイトを読むときは、先頭だけでなく最後のバイトまでメモリ内に入る必要があります。1ページが65,536バイトの例で、65,533から始めると末尾の65,536が範囲外です。この `i32.load` はトラップし、JavaScriptでは `WebAssembly.RuntimeError` が投げられます。ここで検査されるのは線形メモリ全体の境界です。その中に並べた配列や構造体ごとの境界は、言語処理系やプログラム側で扱います。[WebAssembly Coreのロード命令](https://webassembly.github.io/spec/core/exec/instructions.html#memory-instructions)、[JavaScript Interfaceのエラー型](https://webassembly.github.io/spec/js-api/#error-objects)

## 拡張した後はビューを作り直す

今回のメモリは非共有で、1ページは64 KiB（65,536バイト）です。これはWasmでメモリを拡張する単位です。OSでのアドレス空間の予約や実メモリの確保方法は、エンジンの実装に依存します。[WebAssembly Coreのメモリインスタンス](https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances)

JavaScriptの `memory.grow(1)` は1ページを追加し、成功時には拡張前のページ数を返します。先にあったバイト列は保持され、追加した領域はゼロで初期化されます。既定の固定長バッファを使うこの例では、拡張に成功すると古い `ArrayBuffer` が切り離されます。そこから作った古い `Uint8Array` の `byteLength` は0になるので、読み書きするコードは新しい `memory.buffer` からビューを作ります。[JavaScript InterfaceのMemory](https://webassembly.github.io/spec/js-api/#memories)

上限を超えるなど拡張できない場合、JavaScriptの `Memory.grow()` は `RangeError` を投げます。Wasm命令の `memory.grow` は失敗を `-1` で表します。Workerをまたいで共有するメモリでは `SharedArrayBuffer` と同期が関わるため、使うバッファの種類と実行環境を確認します。[WebAssembly Coreのmemory.grow](https://webassembly.github.io/spec/core/exec/instructions.html#memory-instructions)、[JavaScript InterfaceのMemory](https://webassembly.github.io/spec/js-api/#memories)、[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)

## ホストとの境界と、ゲームで使うとき

WasmからJavaScriptを呼びたい場合は、モジュールが関数をインポートとして宣言し、ページがインスタンス化の際に実装を渡します。たとえば表示処理やブラウザのAPI呼び出しをJavaScript側に置けます。Wasmの命令が読み書きできる範囲はメモリ命令の規則に従い、外の機能はホストが渡す実装を介して利用します。渡す関数にどの操作を許すかは、組み込む側で決めます。[WebAssembly Coreのホスト関数と実行環境](https://webassembly.github.io/spec/core/exec/runtime.html#function-instances)、[JavaScript Interfaceのインポート](https://webassembly.github.io/spec/js-api/)

たとえばゲームの当たり判定やアセットのデコードをWasmにまとめ、入力、描画、音声などはページやツールチェーンの接続コードで扱う構成があります。C/C++ではEmscripten、Rustでは `wasm32-unknown-unknown` などがビルドの選択肢です。元のコードが使うファイルI/Oや描画APIをブラウザ向けに置き換える作業もあります。処理時間を見るときは、Wasm内の計算、JavaScriptとの呼び出し、データのコピーを別々に測ります。[EmscriptenのWebAssembly向けビルド](https://emscripten.org/docs/compiling/WebAssembly.html)、[rustcのWebAssemblyターゲット](https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html)、[アセットロード](/game/asset-loading.html)

## 実践との対応

実践ページでは、WATと変換済みの `.wasm` を照らし合わせ、先頭8バイト、JavaScriptからの書き込み、Wasmの更新、拡張後のビュー、境界を越える読み取りを順に確認できます。[WebAssemblyと線形メモリの実験](/practice/browser/wasm-memory-observation.html)

配列や文字列を置く場所を確保し、ポインタと長さでWasmへ伝える方法は、[WebAssemblyのデータ受け渡しとメモリ確保](/browser/wasm-data-and-allocation.html)で扱います。
