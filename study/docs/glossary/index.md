---
{
  "title": "用語集",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "reference",
    "format": "glossary",
    "domain": "terms",
    "summary": "PC、プログラミング、3DCG、ゲーム制作の用語を短い定義から調べる。"
  }
}
---

<script setup>
import StudyGlossarySearch from '../.vitepress/theme/StudyGlossarySearch.vue'
</script>

# 用語集

ゲーム開発で見かける言葉の意味と使い方を、2026年11月時点の資料をもとにまとめています。

<StudyGlossarySearch />

## 分野別に読む

- [PC・OS・ハードウェア](/glossary/pc.html)（55項目）
- [プログラミング・ビルド・開発ツール](/glossary/programming.html)（54項目）
- [3DCG・グラフィックス](/glossary/graphics.html)（59項目）
- [ゲーム開発・エンジン・現場の言い回し](/glossary/game.html)（53項目）

## 分野で意味が変わる語

| 語 | 分野ごとの意味 |
| --- | --- |
| bake | [ライティング](/glossary/graphics.html#bake)　照明の計算結果をライトマップへ書き込む。<br>[DCC](/glossary/graphics.html#bake)　シミュレーションや制約の結果をキャッシュやキーフレームに保存する。<br>[ゲーム制作](/glossary/game.html#asset-baking)　事前に求めた結果を、実行時に読み込めるデータとして固定する。 |
| 焼く | [ゲーム制作](/glossary/game.html#asset-baking)　計算結果をテクスチャやキャッシュに保存する。<br>[配布・実機検証](/glossary/game.html#asset-baking)　光ディスクや書き込み可能なROMにデータを書き込む。 |
| cook | [Unreal Engine](/glossary/game.html#cook)　制作時のアセットを対象プラットフォームで使う形式に変換する。<br>[Houdini](/glossary/game.html#houdini-cook)　依存するノードを評価して、現在の入力・設定・時刻で出力を作る。 |
| boot | [PC](/glossary/pc.html#boot)　ファームウェアが制御を取り、ブートローダーを経てOSを起動する。<br>[ゲーム](/glossary/game.html#boot-sequence)　タイトルが起動し、設定やサービスを初期化して最初の画面へ進む。 |
| blit | [2D画像](/glossary/graphics.html#blit)　画像の矩形領域をまとめて別の描画先へ転送する。<br>[GPU](/glossary/graphics.html#blit)　テクスチャを別の描画先に移す。描画で実装する場合は色変換などもできる。 |
| build | [プログラミング](/glossary/programming.html#build)　コンパイルやリンクなどを実行し、成果物を作る。<br>[ゲーム制作](/glossary/game.html#build)　試遊や配布に使う、ある時点の実行ファイルとデータ一式を指すことがある。 |
| frame | [描画](/glossary/graphics.html#frame)　描画して表示へ渡す画像の一枚。<br>[ゲームループ](/glossary/game.html#frame)　更新や描画を進める一巡。固定間隔のtickは別に数える。<br>[動画](/glossary/graphics.html#frame)　時間順に並んだ映像の一コマ。<br>[Ethernet](/glossary/pc.html#ethernet-frame)　リンク層で送るデータの単位。<br>[スタック](/glossary/programming.html#stack-frame)　関数呼び出しに伴う情報を保存する領域。 |
| pipeline | [GPU](/glossary/graphics.html#pipeline)　頂点処理、ラスタライズ、画素処理などの段階をつなぐ。<br>[ビルド・CI](/glossary/programming.html#pipeline)　ビルド、テスト、配布などの処理を依存順につなぐ。<br>[アセット制作](/glossary/game.html#pipeline)　素材の制作、検査、変換、配布までの工程とデータの流れ。 |
| shader | [GPU](/glossary/graphics.html#shader)　描画やComputeのステージで実行するプログラム。<br>[エンジンの会話](/glossary/game.html#shader)　シェーダー資産や材質の設定もまとめて指すことがある。具体的な対象はエンジンごとに確認する。 |
| handle | [OS](/glossary/pc.html#handle)　APIが管理する対象を参照するために渡す値。<br>[ゲーム](/glossary/game.html#generational-handle)　オブジェクトのIDに世代番号を添え、破棄後のID再利用を見分ける方式がある。<br>[DCC](/glossary/graphics.html#handle)　位置や形などを編集するために画面で操作するつまみ。 |
| kernel | [OS](/glossary/pc.html#kernel)　メモリ、スケジューリング、デバイスなどを管理するOSの中核。<br>[GPU計算](/glossary/graphics.html#kernel)　多数のスレッドで実行する処理の単位。 |
| alpha | [描画](/glossary/graphics.html#alpha)　ブレンドなどに使う成分。不透明度やカバレッジとして使うことがある。<br>[リリース](/glossary/game.html#alpha-beta)　開発途中の版を示す呼び名。到達条件はプロジェクトで決める。 |
| patch | [バージョン管理](/glossary/programming.html#patch)　変更箇所を元データへ適用できる形で表した差分。<br>[ゲーム配布](/glossary/game.html#patch)　公開済みのゲームに適用する更新。全ファイルを置き換える方式もある。 |

詳しい記事を表記や別名から探すときは[用語・別名](/terms/)へ。C++や設計の専門語は[C++・設計の用語集](/guide/cpp-glossary.html)にも載っています。
