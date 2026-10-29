---
{
  "title": "読み進め方",
  "study": {
    "source": "統合ガイド",
    "kind": "統合ガイド",
    "status": "初版",
    "domain": "guide",
    "generated": true,
    "catalog": true,
    "summary": "辞典を最初から順番に読む必要はありません。いま持っている疑問を、関係する項目へつなげる読み順です。"
  }
}
---

# 読み進め方

辞典を最初から順番に読む必要はありません。いま持っている疑問を、関係する項目へつなげる読み順です。

## 「確保する」と内部で何が起きるか

1. [所有・記憶域・寿命](/runtime/memory/storage-duration-and-lifetime.html)を区別する。
2. [アロケータ](/runtime/memory/allocators-and-pools.html)で、小さい領域の再利用とOSへの追加要求を調べる。
3. [OS](/os/)の仮想メモリ、ページフォルト、物理ページとの関係へ進む。
4. [調査ツール](/tools/)で、確保量・常駐量・解放と再利用を観察する。

## ソースコードがCPUで動くまで

1. [ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html)から、コンパイルとリンクをたどる。
2. [コンパイラ](/compilers/)と[言語](/languages/)から、型・ABI・実行方式を調べる。
3. [ハードウェア](/hardware/)の命令、レジスタ、キャッシュへつなぐ。

## 入力からゲーム画面まで

1. [ゲームループ](/game/patterns/game-loop-and-update.html)で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [数学](/math/)と[グラフィックス](/graphics/)から座標・GPU・表示へ進む。
4. [計測](/guide/low-level/debugging-and-profiling.html)で、CPU・GPU・待機・確保のどこが重いか確かめる。

## URLを開いてからページが見えるまで

[ネットワーク](/network/)のDNS・接続・HTTPから、[ブラウザ](/browser/)の解析・実行・描画へ進む系列です。この系列は現在、基礎本文を充実させる段階で、分野索引に項目を整理しています。

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)で作品・ハード・媒体・流通を並べ、気になった時代からメモリ、描画、入力、通信の各論へ進めます。年別の表は地域・初公開・発売を区別して読みます。
