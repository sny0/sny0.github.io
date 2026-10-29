# Sny0 Study

個人の技術辞典。公開先は **https://sny0.com/study/** です。

C++・設計・描画の既存ノート、低レイヤの学習ガイド、ECS・ビデオゲーム史の草稿をまとめています。15分野の索引には、公開済み本文と今後の執筆項目を区別して表示します。

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

原稿は `docs/` 配下のMarkdownです。既存ページを直接編集できます。新規ページには、次のように出典・種類・状態・分野を記録します。

```yaml
---
title: ページのタイトル
study:
  source: 個人ノート
  kind: 本文
  status: 草稿
  domain: runtime
  summary: このページで調べられること。
  aliases: [別名, 英語表記]
---
```

分野IDは `data`、`hardware`、`os`、`compilers`、`languages`、`runtime`、`browser`、`network`、`math`、`algorithms`、`design`、`graphics`、`game`、`history`、`tools` です。横断的な案内は `guide`、用語索引は `terms` を使用できます。

内部リンクは `/game/ecs.html`、分野の入口は `/game/` の形式で書きます。Markdownからのリンクに `/study/` を重ねて付ける必要はありません。生HTMLのリンクや独自Vueコンポーネントでは、配置先のbase URLに注意してください。`docs/public/` のファイルは同じ相対配置で公開されます。

`npm run check` / `dev` / `build` の起動時に、索引・サイドバー・分野ページを再生成します。`study.generated: true` のページと `.vitepress/catalog.json`、`sidebar.json` は直接編集せず、`scripts/generate-navigation.mjs` を変更してください。

年別ソフト・ハードは `docs/.vitepress/annual-data.json` にあります。地域・発売／初公開の扱い・出典を保ち、進行中の年には確認日を明記します。移植用Pythonスクリプトは初回取り込みの補助であり、通常のビルドに元資料やPythonは不要です。再実行すると、そのスクリプトが担当する移植済みページを上書きします。

## 公開する

`main` の `study/` または公開ワークフローを更新すると、GitHub Actionsの **Study** が検査・ビルド・公開を実行します。Pull Requestでは検査とビルドだけを実行します。

既存サイトの公開設定は `gh-pages` ブランチのルートです。公開スクリプトは、そのブランチの **`study/` だけ** を置き換えます。ルートサイト、CNAME、その他のファイルを保持できたことを検証してからpushし、GitHub Pagesのビルド成功も確認します。Pagesの公開元設定や独自ドメインを変更する必要はありません。

GitHub Actionsの再実行は、対象コミットの **Study** ワークフローから行えます。公開先が変わる場合は、VitePressのbase・sitemapと公開スクリプトの前提を合わせて変更してください。
