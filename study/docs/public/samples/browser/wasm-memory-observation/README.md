# WebAssemblyと線形メモリの観察

[公開サンプル](https://sny0.com/study/samples/browser/wasm-memory-observation/index.html)で、JavaScriptとWasmが同じ線形メモリを使う様子を観察します。[実践手順とコード](https://sny0.com/study/practice/browser/wasm-memory-observation.html)

## 手元で試す

`index.html`、`styles.css`、`main.js`、`memory.wasm` を同じフォルダに置き、Python 3で配信します。

```powershell
python -m http.server 4184 --bind 127.0.0.1
```

`http://127.0.0.1:4184/index.html` を開きます。停止するときは端末でCtrl+Cを押します。

「配信条件に合わせて読み込む」は、`WebAssembly.instantiateStreaming()` が利用でき、応答の `Content-Type` が `application/wasm` のときにストリーミングAPIを使います。MIME型にパラメーターを付けると条件から外れます。「ArrayBuffer で読み込む」は、応答の全バイトを取得してから `WebAssembly.instantiate()` に渡します。両方とも、新しいインスタンスのメモリの位置16にJavaScriptから41を書きます。[WebAssembly Web APIのinstantiateStreaming](https://webassembly.github.io/spec/web-api/)

## 観察の順番

1. どちらかの方法で読み込みます。線形メモリは1ページ（65,536バイト）で、位置16の値は41、16〜19のバイトは `29 00 00 00` です。
2. 「Wasm の関数を呼ぶ」を押します。Wasmの `add_at(16, 1)` が値を42に変えます。JavaScriptから読むと `2a 00 00 00` です。
3. 「範囲外の読み取りを試す」を押します。末尾から3バイトの位置で4バイトを読もうとするため、`RuntimeError` が発生します。位置16の値とメモリのバイト長は同じです。
4. 「メモリを1ページ拡張」を押します。 `memory.grow(1)` の戻り値は拡張前の1ページです。元の固定長ビューのバイト長は0、新しいビューは131,072バイトになります。位置16の値は保持され、追加ページの先頭4バイトは `00 00 00 00` です。
5. どちらかの読み込みボタンを押して初期状態へ戻します。

この教材のメモリは非共有で、1ページから始まり、最大2ページです。拡張後は `memory.buffer` を取り直して、JavaScript側のビューを作り直します。

## WATから組み立てる

配布の `memory.wat` と同じフォルダで、Node.jsの `npx` を使ってWABTで組み立てます。

```powershell
npx --yes --ignore-scripts --package=wabt@1.0.39 wat2wasm memory.wat -o memory.wasm
```
