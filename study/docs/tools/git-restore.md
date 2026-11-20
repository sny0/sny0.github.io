---
title: Git restoreの仕組み — 履歴を動かさず、復元元と復元先を選ぶ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: tools
  summary: git restoreの復元元と復元先の既定値を読み、HEADやブランチを動かさずに指定パスのindex・作業ツリーを更新する仕組みを確認する。
  aliases: [Git restore, 復元元, 復元先, git restore --staged, ステージ解除]
  verification: Git公式資料と照合し、Windowsの独立リポジトリで既定値と指定元の組み合わせを確認（2026-11-17）
---

# Git restoreの仕組み — 履歴を動かさず、復元元と復元先を選ぶ

敵のHPが、最後のコミットでは20、ステージ済みの版では30、編集中のファイルでは40だとします。`git restore` でそのファイルを指定するだけなら、編集中のHPは30になります。ステージ済みの版を復元元にするためです。[Git公式のrestoreマニュアル](https://git-scm.com/docs/git-restore#_description)

## パス・復元元・復元先を決める

`git restore` は、指定したパスを、復元元の内容に合わせて復元先で更新します。復元先にできるのは、次のコミットの内容を用意するindexと、いま編集している作業ツリーです。`HEAD` は復元元になり得ます。操作したリポジトリのブランチの先端と、`HEAD` が指すコミットはrestoreの前後で同じです。[Gitのステージング](/tools/git-staging-index.html) · [Git公式のreset・restore・revertの比較](https://git-scm.com/docs/git#_reset_restore_and_revert)

図は `--source` を省略したときの流れです。復元先としてindexを指定する `--staged` には、既定の復元元を `HEAD` に変える働きもあります。

```mermaid
---
config:
  flowchart:
    nodeSpacing: 16
    rankSpacing: 42
    padding: 8
---
flowchart TD
    accTitle: git restoreで復元元を省略した場合のデータの流れ
    accDescr: 復元先を指定しない場合かworktreeだけを指定した場合、indexから作業ツリーへ。stagedだけならHEADからindexへ。両方ならHEADからindexと作業ツリーの両方へ。
    idx["復元元 index"] -->|省略か worktree| wt["作業ツリー"]
    head["復元元 HEAD"] -->|staged| stage["index"]
    head -->|両方を指定| both["index と作業ツリー"]
```

- 復元先を省略するか `--worktree` だけを指定すると、既定の復元元は **index** です。
- `--staged` だけを指定すると、既定では **HEADからindex** へ写します。作業ファイルには手を加えません。
- `--staged --worktree` を指定すると、既定では **HEADから両方** に写します。
- `--source` では、コミットやタグなどが指すツリーを復元元に指定できます。復元先は引き続き `--staged` と `--worktree` で決まります。[Git公式のrestoreオプション](https://git-scm.com/docs/git-restore#_options)

## 同じファイルを、どの版からどこへ戻すか

`enemy.txt` が `hp=10` のコミットAの次に、`hp=20` のコミットBを作り、`main` の先端をBにしました。同じファイルを `hp=30` にしてステージしてから、作業ツリーだけ `hp=40` に編集しました。次の表は、この初期状態を用意した別々の使い捨てリポジトリで、各オプションを実行したあとのHPです。対象は `enemy.txt` で、すべての行で `HEAD` はHP20のBを指します。Aを復元元にする例では `--source=a57b882` を使いました。

| やりたいことと指定 | index | 作業ツリー |
| --- | --- | --- |
| 未ステージの編集を戻す<br>オプション省略、または `--worktree` | 30 | 30 |
| 編集を残してステージを外す<br>`--staged` | 20 | 40 |
| 両方を最後のコミットに揃える<br>`--staged --worktree` | 20 | 20 |
| 作業ファイルだけAの版にする<br>Aを `--source` に指定し、`--worktree` | 30 | 10 |
| 両方をAの版にする<br>Aを `--source` に指定し、`--staged --worktree` | 10 | 10 |

作業ツリーへ復元する行では、未ステージのHP40が上書きされます。残したい編集がある場合は、作業ツリーとindexの差分を確認してから復元先を選びます。[Git公式のrestoreマニュアル](https://git-scm.com/docs/git-restore#_options)

オプションなしで `git restore -- enemy.txt` を実行した直後の出力です。`70e721f` が元の先端Bです。`git show ':enemy.txt'` はindexから読み、PowerShellの `Get-Content` は作業ファイルを読みます。[Git公式のリビジョン指定](https://git-scm.com/docs/gitrevisions)

```text
PS> git rev-parse --short HEAD
70e721f
PS> git show ':enemy.txt'
hp=30
PS> Get-Content -LiteralPath enemy.txt
hp=30
```

この例では、先端BのHP20に対して、indexにはHP30の変更が残っています。作業ツリーとindexはともにHP30なので、未ステージのHP40はなくなりました。`--staged` だけを使った例では、HP40が作業ファイルに残り、HEADのHP20がindexに入りました。[Git公式のrestoreマニュアル](https://git-scm.com/docs/git-restore#_description)

## 上書きした変更をどこまで探せるか

復元先に変更があれば、その内容は復元元の内容で上書きされます。追跡対象のパスが復元元に存在しない場合は、既定ではそのパスを復元先から取り除いて元に合わせます。たとえば新しいファイルをステージしたあと、そのパスのindexを `HEAD` から復元すると、`HEAD` にそのパスがなければindexから外れます。作業ファイルは残り、未追跡になります。この削除条件は公式資料で確認しました。[Git公式のrestoreマニュアル](https://git-scm.com/docs/git-restore#_description)

この検証でHP40は作業ツリーにしかなく、対応するblobはGitのオブジェクトデータベースにありませんでした。作業ツリーをHP30に上書きしたあと、以前のHP40をreflogから取り出すことはできません。別の `--staged` の例では、HP30がindexから外れたあとも、`git add` で作られたblobが残りました。ステージした版を後から探し出せるかは、オブジェクトが残っているかどうかなどに依存します。reflogが記録するのは参照の移動です。[Gitのreflog](/tools/git-reflog.html) · [Git User Manualのdangling objects](https://git-scm.com/docs/user-manual#dangling-objects)

## reset・revertとの関係

コミットを指定する `reset` は、ブランチの先端を指定のコミットへ動かし、モードによってindexや作業ツリーも更新します。パスを指定する `reset` は、`restore --staged` と同じく、指定パスのindexを更新する使い方があります。`revert` は変更を打ち消す新しいコミットを作ります。`restore` で作業ファイルやindexを更新した結果を履歴に残すときは、その結果を別にコミットします。[Git公式のreset・restore・revertの比較](https://git-scm.com/docs/git#_reset_restore_and_revert) · [Gitのreset](/tools/git-reset.html) · [Gitのrevert](/tools/git-revert.html)

## 理解度チェック

::: details HP20をコミットしたあと、HP30をステージし、HP40に再編集した。オプションを省いたrestoreで作業ファイルはどの値になる？
HP30です。既定ではindexから作業ツリーへ写します。
:::

::: details `--staged --worktree` を指定し、`--source` を省略した。indexと作業ファイルはどこから戻る？
両方ともHEADから復元されます。この例ではHP20です。
:::

::: details `--source` に古いコミットを指定したら、ブランチの先端も古いコミットへ移る？
ブランチの先端はそのままです。古いコミットのツリーは復元元として読まれます。
:::

## 検証範囲

2026年11月17日に、WindowsのGit 2.39.2.windows.1と独立したSHA-1リポジトリ6つを使いました。`main` 上の追跡テキスト1ファイルで、表の組み合わせを実行しました。各実行前後で、`main` と `HEAD` の参照先、コミット履歴、indexと作業ファイルの内容を比較しました。復元元にパスがない場合は公式資料に基づく説明です。競合中のindex、`--patch`、サブモジュール、スパースチェックアウトは実行していません。

## 関連項目

- [Gitのステージング](/tools/git-staging-index.html) — HEAD・index・作業ツリーの内容を比べる。
- 編集途中の内容を保存し、後から作業ツリーやindexに再適用する仕組みを読む。[Git stashの内部構造 — 作業ツリーとindexの退避・再適用を追う](/tools/git-stash.html)
- [Gitのreset](/tools/git-reset.html) — コミットを指定した形式とパスを指定した形式を比べる。
- [Gitのrevert](/tools/git-revert.html) — 履歴に変更を打ち消した記録を残す仕組みを読む。
- [Gitのreflog](/tools/git-reflog.html) — 参照の移動の記録で探せる範囲を確認する。

## 参考資料

- [Git公式 — git-restore](https://git-scm.com/docs/git-restore)
- [Git公式 — Reset, restore and revert](https://git-scm.com/docs/git#_reset_restore_and_revert)
- [Git公式 — gitrevisions](https://git-scm.com/docs/gitrevisions)
- [Git User Manual — Dangling objects](https://git-scm.com/docs/user-manual#dangling-objects)
