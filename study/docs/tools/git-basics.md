---
title: Gitの基本 — 差分を見てコミットする
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: tools
  summary: 練習用リポジトリでテキストファイルを変更し、git statusと二種類のdiffを読んでからコミットを作る。
  aliases: [Git, バージョン管理, リポジトリ, 作業ツリー, ステージング, インデックス, コミット, git status, git diff, git add, git commit, git log]
  verification: Git公式マニュアルに照合し、WindowsのPowerShell 7.6とGit for Windows 2.39.2で2つのコミットと差分を実行確認（2026-11-12）
---

# Gitの基本 — 差分を見てコミットする

スコアを記したファイルを変更するとき、「前の値」「いま編集した値」「次の履歴に残す値」が違うことがあります。Gitを使うと、それぞれを見比べてから、選んだ内容を**コミット**として記録できます。このページでは、練習用のフォルダーにリポジトリを作り、スコアを0から10に変更した履歴を残します。[Git公式書籍の基本操作](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)

## ファイルを編集してから履歴に残すまで

| 場所 | 入っている内容 |
| --- | --- |
| 作業ツリー | エディターやコマンドでいま編集しているファイル。 |
| ステージング領域（インデックス） | 次のコミットを作るときに使う内容。`git add` を実行した時点のファイル内容で更新する。 |
| コミット | 履歴に記録された時点の内容。今回の例の `HEAD` は、いま作業しているブランチの最新のコミットを指す。 |

```mermaid
flowchart LR
    W["作業ツリー<br/>編集中のファイル"]
    I["ステージング領域<br/>次に記録する内容"]
    C["コミット<br/>履歴に残る内容"]
    W -->|"git add"| I
    I -->|"git commit"| C
```

`git add` の後に同じファイルを編集すると、ステージング領域には `git add` した時点の内容が残ります。新しい編集もコミットに含めるには、もう一度 `git add` を実行します。[git add](https://git-scm.com/docs/git-add) · [git commit](https://git-scm.com/docs/git-commit)

## 練習用のリポジトリを作る

Gitを入れたWindowsでPowerShellを開き、次を実行します。一時フォルダーに毎回新しい名前の練習用フォルダーを作り、そこで作業します。`--local` で設定する名前とメールアドレスは、このリポジトリのコミット用の例です。[Gitの入手先](https://git-scm.com/downloads/win) · [git init](https://git-scm.com/docs/git-init) · [git config](https://git-scm.com/docs/git-config)

```powershell
git --version
$gitPractice = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ('study-git-' + [guid]::NewGuid().ToString('N')))
Set-Location -LiteralPath $gitPractice.FullName
git init -b main
git config --local user.name 'Study Learner'
git config --local user.email 'study@example.invalid'
git config --local core.autocrlf false
```

`git init` は、履歴や設定を保持する `.git` ディレクトリを作ります。最後の設定は、練習用ファイルを追加するときにGitの自動改行変換を使わない指定です。

## 初めてのコミットを作る

```powershell
Set-Content -LiteralPath score.txt -Value 'score=0' -Encoding ascii
git status --short
git add -- score.txt
git status --short
git commit --no-gpg-sign -m 'Start score at zero'
```

最初の `status` は `?? score.txt` を表示します。まだGitで追跡していないファイルです。`git add` 後は `A  score.txt` となり、新規ファイルがステージに入ったことを示します。`git commit` で、その内容を一つ目の履歴に記録します。ここでは `--no-gpg-sign` を指定して練習用のコミットを署名なしで作ります。[git statusの短い表示](https://git-scm.com/docs/git-status#_short_format) · [git commit](https://git-scm.com/docs/git-commit)

## ステージの前後で差分を読む

まず値を10に変えます。`git diff -- score.txt` は、ステージング領域にある `score=0` と作業ツリーにある `score=10` を比較します。差分の `-` は比較元の行、`+` は比較先の行です。[git diff](https://git-scm.com/docs/git-diff)

```powershell
Set-Content -LiteralPath score.txt -Value 'score=10' -Encoding ascii
git status --short
git --no-pager diff -- score.txt
```

次は変更行だけを抜き出した例です。実際の出力にある `diff --git`、`index`、`---`・`+++`、`@@` の見出し行は省いています。[Gitのパッチ形式](https://git-scm.com/docs/diff-format)

```diff
-score=0
+score=10
```

次に10をステージへ入れ、作業中の値だけを20へ変えます。

```powershell
git add -- score.txt
Set-Content -LiteralPath score.txt -Value 'score=20' -Encoding ascii
git status --short
git --no-pager diff --staged -- score.txt
git --no-pager diff -- score.txt
```

短いステータスは `MM score.txt` になります。左の `M` は前回のコミットからステージまでの変更、右の `M` はステージから作業ツリーまでの変更です。[git statusの短い表示](https://git-scm.com/docs/git-status#_short_format)

| コマンド | 比較する内容 | この時点の差分 |
| --- | --- | --- |
| `git diff --staged -- score.txt` | 最新のコミットとステージング領域。 | 0 → 10 |
| `git diff -- score.txt` | ステージング領域と作業ツリー。 | 10 → 20 |

この状態でコミットすると、10が履歴に入り、20は編集中の値として残ります。`git log --oneline` で二つのコミットを確認し、`git show HEAD:score.txt` で最新コミット内のファイルを表示します。[git log](https://git-scm.com/docs/git-log) · [コミットとパスの指定](https://git-scm.com/docs/gitrevisions)

```powershell
git commit --no-gpg-sign -m 'Record score of ten'
git --no-pager log --oneline
git --no-pager show HEAD:score.txt
Get-Content -LiteralPath score.txt
git status --short
```

```text
<コミットID> Record score of ten
<コミットID> Start score at zero
score=10
score=20
 M score.txt
```

`git status --short` の行頭には空白が一つあります。変更が作業ツリーにだけ残っている印です。コミットIDは作成時刻などによって変わります。

## 理解度チェック

1. `?? score.txt` と表示されました。このファイルを最初のコミットへ入れるには、コミットの前に何をしますか。
2. ファイルを10にして `git add` した後、作業ツリーだけを20にしました。`git diff` と `git diff --staged` にはそれぞれ何が表示されますか。
3. 20も別のコミットにしたいとき、次のコミット前にどの二つの操作で記録する内容を用意し、確認しますか。

::: details 解答
1. `git add -- score.txt` でファイルの内容をステージへ入れます。
2. `git diff` は10から20への変更、`git diff --staged` は0から10への変更を表示します。どちらも二つ目のコミットの前の状態です。
3. `git add -- score.txt` で20をステージへ入れ、`git diff --staged -- score.txt` で10から20への変更を確認します。
:::

## 関連項目

- [ターミナル・シェル・コマンドの基本](/tools/terminal-shell-and-commands.html)
- [ファイルとパス](/os/files-and-paths.html)
- [公式ドキュメントの読み方](/tools/reading-official-documentation.html)
- [ロードマップのGitとバージョン管理](/learn/roadmap.html?node=dev-git#dev-tools)

## 参考資料

- [Git公式書籍の基本操作](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [git status](https://git-scm.com/docs/git-status) · [git diff](https://git-scm.com/docs/git-diff) · [git add](https://git-scm.com/docs/git-add) · [git commit](https://git-scm.com/docs/git-commit)
