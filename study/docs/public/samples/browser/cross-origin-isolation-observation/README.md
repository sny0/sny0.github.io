# クロスオリジン分離と共有メモリの観察

[公開サンプル](https://sny0.com/study/samples/browser/cross-origin-isolation-observation/index.html)を開き、「ArrayBuffer のコピーを試す」を押します。Workerは受け取ったデータの値を0から1へ変え、送信元の値は0のままです。画面には、ページとWorkerで実際に観測した分離状態が表示されます。[実践手順とコード](https://sny0.com/study/practice/browser/cross-origin-isolation-observation.html)

## ローカル版で応答ヘッダーを切り替える

`index.html`、`styles.css`、`main.js`、`worker.js`、`server.py` を同じフォルダに保存し、Python 3.8以降で起動します。

```powershell
python server.py
```

アドレスバーで `http://127.0.0.1:4194/plain/` を開き、画面のリンクで4種類を移動します。サーバーは同じHTMLとJavaScriptを返し、モードごとにページの応答ヘッダーを切り替えます。COEPを設定するモードでは、`worker.js` の応答にも同じCOEPを付けます。[HTML StandardのCOEP](https://html.spec.whatwg.org/multipage/browsers.html#coep)

| モード | ページのCOOP | ページのCOEP | 対応ブラウザでの分離の目安 |
| --- | --- | --- | --- |
| `plain` | なし | なし | `false` |
| `coop-only` | `same-origin` | なし | `false` |
| `coep-only` | なし | `require-corp` | `false` |
| `isolated` | `same-origin` | `require-corp` | `true` |

`isolated` で共有ボタンが使えるときは「SharedArrayBuffer の共有を試す」を押します。Workerが `Atomics.add()` で共有領域を更新し、完了通知の後に送信元が `Atomics.load()` で1を読みます。ブラウザや埋め込み環境によって結果は変わるため、実行時の表示を確認します。

## 画像の応答がCOEPを通る条件を比べる

各モードの「2つの画像の読み込みを試す」は、`<img>` で別ポートの `http://127.0.0.1:4195` から同じ内容の画像を取得します。2つの応答のうち `allowed.svg` にだけ `Cross-Origin-Resource-Policy: cross-origin` が付きます。[Fetch StandardのCORP](https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header)

| ページのCOEP | `unmarked.svg` | `allowed.svg` |
| --- | --- | --- |
| なし | `load` | `load` |
| `require-corp` | `error` | `load` |

開発者ツールのNetworkでページ、Worker、画像の応答ヘッダーを確認できます。画像の結果は読み込みの成否を示します。原因を切り分けるときはConsoleの診断も照合します。

2つのポートはIPv4ループバックでのみ待ち受けます。試し終えたら端末でCtrl+Cを押して停止します。
