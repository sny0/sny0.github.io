# Sny0 Study

個人の技術辞典。公開先は **https://sny0.com/study/** です。

C++・設計・描画の既存ノート、低レイヤの学習ガイド、実装例などを、目的別の入口に分けています。

- **技術辞典** `/study/`：15分野の用語・仕組み・判断材料を調べる。
- **学習ガイド** `/study/learn/`：前提知識と読み順を選び、辞典本文へ進む。
- **実践・サンプル** `/study/practice/`：制作手順・コード例・演習で確かめる。

辞典の一覧に学習案内や演習を同列には並べず、関連リンクでつなぎます。既存記事のURLは維持しており、保存先のディレクトリ名だけで所属を判断しません。

## ローカルで確認する

Node.js 20.19以降を使用します。CIではNode.js 22を使用します。

```sh
cd study
npm ci
npm run check
npm run build
npm run preview -- --host 127.0.0.1
```

表示URLは、端末に出るアドレスに `/study/` を付けたものです。編集しながら確認する場合は `npm run dev` を使用します。

`check` は原稿・索引・内部リンクを確認します。`build` は本番用HTMLを生成し、生成後のリンク・アンカー・配置先を検査します。これらは本文内の全サンプルを実行する検査ではありません。

## 原稿を編集・追加する

原稿は `docs/` 配下のMarkdownです。既存ページを直接編集できます。新規ページは本文の役割を決めてから、出典・所属・形式・状態・分野を記録します。

```yaml
---
title: ページのタイトル
study:
  source: 個人ノート
  section: reference
  format: article
  status: draft
  domain: runtime
  summary: このページで調べられること。
  aliases: [別名, 英語表記]
  verification: 未検証
---
```

`section` は `reference`（辞典）、`learning`（学習ガイド）、`practice`（実践）のいずれかです。用語の意味や仕組みを調べる本文、読む順番の案内、手順に沿って作る教材を、原稿の実体に合わせて分けます。タイトルに「ガイド」がある、旧原稿が「本文」だった、といった理由だけで一括分類しません。

`format` は `article`（解説）、`glossary`（用語集）、`history`（技術史）、`references`（参考資料）、`index`（目次）、`path`（学習経路）、`tutorial`（制作手順）、`exercise`（演習）、`sample`（サンプル）です。定義は `docs/.vitepress/content-model.mjs` にあります。

`status` は `published`（公開中）、`outline`（学習計画・概要）、`draft`（草稿）、`planned`（執筆予定）です。公開状態と技術的な検証結果は分け、確認した環境・範囲は任意の `verification` と本文に記録します。`published` は全コードの動作確認や正しさを保証する値ではありません。

分野IDは `data`、`hardware`、`os`、`compilers`、`languages`、`runtime`、`browser`、`network`、`math`、`algorithms`、`design`、`graphics`、`game`、`history`、`tools` です。横断的な案内は `guide`、用語索引は `terms` を使用できます。

連続するコースや教材は、`content-model.mjs` に登録した `collection` と数値の `order` を必要に応じて指定します。前後ナビは `linear: true` のコース内だけに生成され、`order` は重複させません。辞典や分岐する学習経路に、機械的な「次に読むページ」は付けません。

新しく書く辞典本文は、先に調べたい概念・適用条件を説明し、仕組み・使う場面・落とし穴・確認方法へつなぎます。学習案内は目的・前提・読み順を短く示し、存在する辞典本文や実践へリンクします。詳解が未整備ならその範囲を明記し、リンクだけで説明が揃っているように見せません。実践では必要な環境、手順、実行できるコードと省略例の区別、実際に確認した範囲を示します。

内部リンクは `/game/ecs.html`、分野の入口は `/game/` の形式で書きます。Markdownからのリンクに `/study/` を重ねて付ける必要はありません。生HTMLのリンクや独自Vueコンポーネントでは、配置先のbase URLに注意してください。`docs/public/` のファイルは同じ相対配置で公開されます。

`npm run check` / `dev` / `build` の起動時に、各入口・分野ページ・索引・サイドバーを再生成します。`study.generated: true` のページと `.vitepress/catalog.json`、`sidebar.json` は直接編集しません。原稿の分類は各ページのfrontmatter、所属・形式・コースの定義は `docs/.vitepress/content-model.mjs`、生成する案内文や構成は `scripts/generate-navigation.mjs` を変更してください。

年別ソフト・ハードは `docs/.vitepress/annual-data.json` にあります。地域・発売／初公開の扱い・出典を保ち、進行中の年には確認日を明記します。移植用Pythonスクリプトは初回取り込みの補助であり、通常のビルドに元資料やPythonは不要です。再実行すると、そのスクリプトが担当する移植済みページを上書きします。

## 公開する

初版はローカルで検査・ビルドし、通常のGit認証で公開します。リポジトリのルートからではなく、この `study/` ディレクトリで実行します。

```sh
npm ci
npm run check
npm run build
npm run deploy:manual
npm run deploy:manual -- --publish
```

最初の `deploy:manual` は生成物と配置先を検査するdry runです。`--publish` を付けた場合だけ、公開ブランチへ通常のpushを行います。GitHub Pagesのビルドと公開状態はリポジトリのPages画面でも確認してください。

既存サイトの公開設定は `gh-pages` ブランチのルートです。公開スクリプトは、そのブランチの **`study/` だけ** を置き換えます。ルートサイト、CNAME、その他のファイルを保持できたことを検証してからpushします。Pagesの公開元設定や独自ドメインを変更する必要はありません。

### 自動公開を有効にする

ワークフロー案は `deployment/github-actions.yml` にあります。初版を反映したGit認証には `workflow` 権限がなかったため、このファイルはまだGitHub Actionsへ登録していません。

権限のあるGitHub画面またはGit認証で、この内容をリポジトリの `.github/workflows/study.yml` に登録すると、`main` の `study/` またはワークフローの更新時に **Study** が検査・ビルド・公開を実行します。Pull Requestでは検査とビルドだけを実行します。Actions用の公開スクリプトは、Pagesのビルド成功まで確認します。

公開先が変わる場合は、VitePressのbase・sitemapと公開スクリプトの前提を合わせて変更してください。
