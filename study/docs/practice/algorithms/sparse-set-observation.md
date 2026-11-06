---
title: スパースセットでIDの追加と削除を試す
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: algorithms
  collection: sparse-set-observation
  order: 1
  summary: IDの追加・削除を行い、密な配列、IDから引く位置、所属判定を見比べる。
  aliases: [スパースセット, sparse set, dense, sparse, swap-and-pop, ECS]
  verification: Nodeで追加・削除5000回と境界条件を検証し、Chromium系ブラウザで削除、再追加、初期状態への復帰を確認（2026-11-06）
---

# スパースセットでIDの追加と削除を試す

ID `0`〜`7` を使うスパースセットです。最初はID `2`、`7`、`4` が入っています。`dense` は入っているIDを詰めた配列、`sparse` はIDから位置を引く配列です。[スパースセットとECSの解説](/algorithms/sparse-sets.html)

<p><a href="/study/samples/algorithms/sparse-set-observation/index.html" target="_blank" rel="noopener noreferrer">スパースセットの実験を開く</a></p>

1. **ID 7** を選んで「選んだIDを削除」を押します。末尾のID `4` が位置 `1` に移り、`sparse[4]` も `1` に変わります。
2. ID `7` の古い位置は `sparse[7]` に残ります。位置 `1` にあるIDは `4` なので、ID `7` が存在するという判定にはなりません。
3. ID `7` を再び追加します。今度は末尾の位置 `2` に置かれ、`sparse[7]` が `2` になります。別のIDも出し入れして、どの位置が変わるか確かめます。

## 手元で動かす {#run-locally}

<a href="/study/samples/algorithms/sparse-set-observation/index.html" download>index.html</a>、<a href="/study/samples/algorithms/sparse-set-observation/styles.css" download>styles.css</a>、<a href="/study/samples/algorithms/sparse-set-observation/main.js" download>main.js</a>を同じフォルダに保存します。そのフォルダで次を実行し、ブラウザで `http://127.0.0.1:4204/` を開きます。停止はCtrl+Cです。

```powershell
python -m http.server 4204 --bind 127.0.0.1
```

## コード

<<< @/public/samples/algorithms/sparse-set-observation/main.js{js}
