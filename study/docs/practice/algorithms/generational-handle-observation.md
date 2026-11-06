---
title: 世代付きハンドルでスロットの再利用を追う
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: algorithms
  collection: generational-handle-observation
  order: 1
  summary: スロットを解放して別の対象に割り当て、古いハンドルの検査と、世代の周回・退役の違いを観察する。
  aliases: [世代付きハンドル, 世代付きID, generation, slot, wraparound, オブジェクトプール]
  verification: Nodeで世代の周回・退役・無効な操作を確認し、Chromium系ブラウザで解放と再割り当てを検証（2026-11-06）
---

# 世代付きハンドルでスロットの再利用を追う

スロット0を最初のオブジェクトが使っています。位置だけを保存した参照と、世代を含む `(0, 0)` のハンドルを横に並べ、同じ枠を使い回したときの結果を見ます。[世代付きハンドルの解説](/algorithms/generational-handles.html)

<p><a href="/study/samples/algorithms/generational-handle-observation/index.html" target="_blank" rel="noopener noreferrer">スロット再利用の実験を開く</a></p>

1. **解放**を押すと、スロットが空き、世代が1になります。空の状態ではどちらの参照も対象を返しません。
2. **割り当て**を押します。位置だけなら新しいオブジェクト2が見つかり、保存した世代付きハンドルは世代が違うため拒否されます。
3. **入れ替える**をあと3回押すと、合計4回の解放で世代が0に戻ります。オブジェクト5に対して、最初の `(0, 0)` が再び一致してしまいます。
4. **上限で退役する**に切り替えると最初から試せます。「入れ替える」を4回押します。世代3で使っていた対象を解放するとスロットは退役し、その枠への割り当てが止まります。

世代は違いを見やすくするため2ビットです。対象の番号は実験画面が別々に付けており、実際の照合で使うのは使用中かどうか、スロット番号、世代番号です。

## 手元で動かす {#run-locally}

<a href="/study/samples/algorithms/generational-handle-observation/index.html" download>index.html</a>、<a href="/study/samples/algorithms/generational-handle-observation/styles.css" download>styles.css</a>、<a href="/study/samples/algorithms/generational-handle-observation/main.js" download>main.js</a>を同じフォルダに保存します。そのフォルダで次を実行し、ブラウザで `http://127.0.0.1:4206/` を開きます。停止はCtrl+Cです。

```powershell
python -m http.server 4206 --bind 127.0.0.1
```

## コード

<<< @/public/samples/algorithms/generational-handle-observation/main.js{js}
