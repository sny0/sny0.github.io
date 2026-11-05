---
title: WebAssemblyへ配列とUTF-8を渡し、メモリ確保を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: browser
  collection: wasm-abi-observation
  order: 1
  summary: 配列とUTF-8を線形メモリに配置し、ポインタと長さをWasmへ渡す。アラインメント、確保に失敗する条件、メモリ拡張とリセットを観察する。
  aliases: [WebAssembly, Wasm, ABI, pointer, length, UTF-8, TextEncoder, アリーナ, bump allocator, alloc, alignment]
  verification: Windows上のブラウザで配列・UTF-8・アラインメント、確保失敗と拡張後の成功、リセット後の再利用を確認（2026-11-05）
---

# WebAssemblyへ配列とUTF-8を渡し、メモリ確保を観察する

JavaScriptの配列や文字列からバイト列を作り、Wasmが公開した線形メモリに置きます。Wasmに渡すのは、バイト位置を表すポインタと、読み取る範囲を表す長さです。画面では、確保するたびに次の空き位置がどこまで進んだかを確認します。[WebAssemblyのデータ受け渡しとメモリ確保](/browser/wasm-data-and-allocation.html)

<p><a href="/study/samples/browser/wasm-abi-observation/index.html" target="_blank" rel="noopener noreferrer">WebAssemblyのデータ受け渡しの実験を新しいタブで開く</a></p>

## 配列と文字列を同じメモリに並べる

「インスタンスを作り直す」を押したあと、「i32配列を渡す」、「UTF-8の文字列を渡す」の順に押します。確保を始める位置は1024で、各領域の先頭を8バイト境界にそろえます。

| 入力 | 開始位置 | バイト数 | Wasmに渡す長さ | Wasmの戻り値 |
| --- | --- | --- | --- | --- |
| 配列 `[10, -2, 32]` | 1024 | 12 | `i32` の要素数3 | 整数の合計40 |
| 文字列 `A猫🎮` | 1040 | 8 | UTF-8のバイト数8 | 各バイトの合計1322 |

配列を書き終えた位置は1036です。次の確保では、そこから4バイト空けて1040へ進みます。配列は `DataView.setInt32()` にリトルエンディアンを指定して書きます。文字列は `TextEncoder` で `41 e7 8c ab f0 9f 8e ae` に変換してからコピーします。[ECMAScriptのDataView](https://tc39.es/ecma262/multipage/structured-data.html#sec-dataview.prototype.setint32)、[WHATWG EncodingのTextEncoder](https://encoding.spec.whatwg.org/#interface-textencoder)

`A猫🎮` の `String.length` はUTF-16コード単位で4、コードポイント数は3、UTF-8に変換した長さは8バイトです。Wasm関数はこの例では8バイトを読み、整数として合計します。文字列の解釈や字数の計算は行いません。[ECMAScriptのString型](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type)、[Unicodeとエンコーディング](/data/unicode-and-encoding.html)

## 確保とメモリ拡張を別々に実行する

1. 1ページの状態で「1ページ分を確保」を押します。今回の確保領域は位置1024以降にあるため、65,536バイトの連続領域は残っていません。`alloc()` は0を返し、次の空き位置とメモリ全体のバイト長は変わりません。
2. 「メモリを1ページ増やす」を押します。JavaScriptが `memory.grow(1)` を呼び、メモリは65,536バイトから131,072バイトへ増えます。この操作で確保位置は進みません。
3. もう一度「1ページ分を確保」を押します。同じ要求が成功し、返った開始位置から要求したバイト数ぶん、次の空き位置が進みます。
4. 「アリーナをリセット」を押します。次の確保位置は1024に戻り、以前の割り当てを使い終えたものとして扱います。メモリのバイト長は変わらず、以前に書いたバイトも上書きされるまで残ります。

Wasmの読み取り関数は、渡された範囲が1024から現在の確保位置までに入るかを検査します。個別の割り当ての境界や、リセット前に受け取ったポインタの有効性は呼び出し側が管理します。アラインメントのために空けた部分も、この範囲に含まれます。

## 手元で動かす

次のファイルを同じフォルダに保存します。

- <a href="/study/samples/browser/wasm-abi-observation/index.html" download>index.html</a>
- <a href="/study/samples/browser/wasm-abi-observation/styles.css" download>styles.css</a>
- <a href="/study/samples/browser/wasm-abi-observation/main.js" download>main.js</a>
- <a href="/study/samples/browser/wasm-abi-observation/arena.wat" download>arena.wat</a>
- <a href="/study/samples/browser/wasm-abi-observation/arena.wasm" download>arena.wasm</a>
- <a href="/study/samples/browser/wasm-abi-observation/README.md" download>README.md</a>

Python 3で次を実行し、`http://127.0.0.1:4186/index.html` を開きます。終了時はCtrl+Cで停止します。

```powershell
python -m http.server 4186 --bind 127.0.0.1
```

配布した `arena.wasm` は `arena.wat` からWABT 1.0.39で組み立てています。WATを変更した場合は、同じフォルダで再生成できます。[WABT公式リポジトリ](https://github.com/WebAssembly/wabt)

```powershell
npx --yes --ignore-scripts --package=wabt@1.0.39 wat2wasm arena.wat -o arena.wasm
```

## コード

### アリーナと読み取り関数

<<< @/public/samples/browser/wasm-abi-observation/arena.wat{text}

### JavaScriptからバイトを書き込み、Wasmを呼ぶ

<<< @/public/samples/browser/wasm-abi-observation/main.js{js}
