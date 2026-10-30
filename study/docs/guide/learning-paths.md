---
{
  "title": "疑問から選ぶ読み順",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "learning",
    "format": "path",
    "domain": "guide",
    "collection": "questions",
    "order": 0,
    "summary": "メモリ確保、実行、入力と描画、Webの流れなど、疑問から関連する本文をたどる。"
  }
}
---

<div id="読み進め方" class="study-legacy-anchor" aria-hidden="true"></div>

# 疑問から選ぶ読み順

辞典を最初から順番に読む必要はありません。いまの疑問に関係する本文から選びます。

## 「確保する」と内部で何が起きるか

1. [記憶域期間・スコープ・寿命](/runtime/memory/storage-duration-and-lifetime.html)を区別する。
2. [アロケータ](/runtime/memory/allocators-and-pools.html)で、小さい領域の再利用とOSへの追加要求を調べる。
3. [OSを学ぶ計画](/guide/low-level/operating-system.html)で、仮想メモリ・ページフォルトとのつながりを整理する。OS専用の辞典本文は未整備です。
4. [メモリバグ](/runtime/memory/memory-bugs.html)と[キャッシュ局所性](/runtime/memory/cache-locality-aos-soa.html)から、正しさと配置を確かめる。

## ソースコードがCPUで動くまで

1. [ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html)でコンパイルとリンクをたどる。
2. [翻訳単位・ヘッダー](/runtime/cpp-internals/translation-units-and-headers.html)、[シンボル・ABI](/runtime/cpp-internals/symbols-and-linkage.html)、[実行ファイル・ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)を調べる。
3. [関数呼び出し・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)へ進む。

## 入力からゲーム画面まで

1. [ゲームループ](/game/patterns/game-loop-and-update.html)で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [座標変換](/math/rendering/transform.html)と[描画パイプライン](/graphics/pipeline/overview.html)から画面へつなぐ。
4. 作って試すなら[シューティングの設計](/game/shooter-design.html)を読み、[C++版](/game/shooter-cpp.html)または[Unity版](/game/shooter-unity.html)へ進む。

## URLを開いてからページが見えるまで

[ネットワーク](/network/)と[ブラウザ](/browser/)の専用本文は準備中です。両ページには扱う範囲を記しています。学習計画と、既に読める詳しい説明を区別して増補します。

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)の作品・ハード・媒体・流通と、[リアルタイム3D技術史](/guide/rendering/timeline.html)の技術の変化から、気になった仕組みへ進みます。
