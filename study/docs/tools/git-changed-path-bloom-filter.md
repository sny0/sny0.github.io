---
title: Gitのchanged-path Bloom filter：あるファイルの履歴を探すとき、なぜ木の比較を省けるのか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: tools
  summary: 第1親と対象パスを比べる前に、変更がないと分かる場合を図で追う。偽陽性、マージ、名前変更の追跡との関係も整理する。
  aliases: [changed-path Bloom filter, changed paths Bloom filter, 変更パスのBloom filter, Gitのパス履歴]
  verification: Git公式資料とソースを参照し、Git for Windows 2.39.2で単一パスの履歴とTrace2の集計を検証（2026-11-21）
---

# Gitのchanged-path Bloom filter：あるファイルの履歴を探すとき、なぜ木の比較を省けるのか

`git log -- player.cpp` で、プレイヤーの処理をいつ変更したかを探します。途中には、音やUIだけを変えたコミットもあります。`player.cpp` がそのコミットで変わったかを調べるには、保存されたファイルの木（tree）を親の木と比べます。Gitの **changed-path Bloom filter**（変更パスのブルームフィルター）は、比較する前に、対象パスが第1親から変わっていないと分かる場合を見つけるための索引です。[Gitのcommit-graphファイル形式](https://git-scm.com/docs/gitformat-commit-graph) · [git commit-graph](https://git-scm.com/docs/git-commit-graph)

## この記事で分かること

`git log -- player.cpp` で木の比較を省ける条件と、実際に木を比べる必要がある条件を区別できます。マージやリネームの追跡では、第1親に対する固定パスの判定から何が分かるかを説明できます。

## コミットごとに、第1親から変わったパスを記録する

commitオブジェクトは、その時点のルートtreeと親のIDを指します。treeにはファイルやディレクトリの名前、モード、参照先が入ります。たとえば親と子で `player.cpp` の項目が同じなら、そのパスに変更はありません。索引を作るとき、Gitは第1親との比較で変わったパスを調べ、その情報をコミットごとのフィルターにまとめます。フィルターはcommit-graphに追加できる補助データで、`git commit-graph write --reachable --changed-paths` で生成できます。[Gitの保存モデル](/tools/git-objects.html) · [Gitのcommit-graphファイル形式](https://git-scm.com/docs/gitformat-commit-graph) · [git commit-graph](https://git-scm.com/docs/git-commit-graph)

固定したパスを検索するとき、使えるフィルターが「第1親から変更なし」と返せば、その比較を省けます。「変わった可能性あり」なら、実際にtreeを比べて確かめます。フィルターがないコミットもtreeを比べます。比較を省ける場合でも、履歴探索は必要な親をたどり続けます。[Git 2.52.0の比較処理](https://github.com/git/git/blob/v2.52.0/revision.c#L727-L821)

## 立っているビットは、どのファイルが立てたかを覚えていない

Bloom filterは、集合に対象があるかをビット列で調べる仕組みです。以下の概念図では、パス名をハッシュで0〜7のうち2つの位置に写します。変更した `weapon.cpp` は位置1と4を、`hud.cpp` は3と6を1にします。Gitが実際に使うハッシュ値やビット数は、この図とは異なります。[Gitのcommit-graphファイル形式](https://git-scm.com/docs/gitformat-commit-graph#_chunk_data)

<figure style="margin: 1rem 0">
  <div role="img" aria-label="8ビットの概念図。位置は0から7。weapon.cpp が1と4、hud.cpp が3と6を立てる。記録は0、1、0、1、1、0、1、0。" style="max-width: 32rem; font-size: .88em; font-variant-numeric: tabular-nums">
    <div style="display: grid; grid-template-columns: 6.5rem repeat(8, minmax(0, 1fr)); gap: .22rem .12rem; align-items: center; text-align: center">
      <span style="text-align: left">位置</span><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
      <div data-bloom-row="weapon" style="display: contents"><strong style="text-align: left">weapon.cpp</strong><span>·</span><span>1</span><span>·</span><span>·</span><span>1</span><span>·</span><span>·</span><span>·</span></div>
      <div data-bloom-row="hud" style="display: contents"><strong style="text-align: left">hud.cpp</strong><span>·</span><span>·</span><span>·</span><span>1</span><span>·</span><span>·</span><span>1</span><span>·</span></div>
      <div data-bloom-row="stored" style="display: contents"><strong style="text-align: left">保存する値</strong><span>0</span><span style="background: var(--vp-c-brand-soft); border-radius: 3px">1</span><span>0</span><span style="background: var(--vp-c-brand-soft); border-radius: 3px">1</span><span style="background: var(--vp-c-brand-soft); border-radius: 3px">1</span><span>0</span><span style="background: var(--vp-c-brand-soft); border-radius: 3px">1</span><span>0</span></div>
    </div>
  </div>
  <figcaption style="font-size: .875rem; margin-top: .55rem">2つのパスが立てたビットを、コミットの1本のビット列にまとめる。「·」の位置はそのパスでは立てない。</figcaption>
</figure>

- `camera.cpp` が位置1と5を参照する場合、5は0です。変更していたなら5も1になるので、このパスは第1親から変わっていないと分かります。
- `player.cpp` が位置1と6を参照する場合、どちらも1です。実際には別々のファイルが立てたビットですが、フィルターだけでは区別できません。変更していないのに候補に残るのが **偽陽性** です。treeを比べて、第1親から変わったかを確かめます。

図の例では、未変更のパスなのに比較が発生することがあります。省ける比較の数は、対象パスが変わる頻度、使えるフィルターの範囲、偽陽性の多さなどで変わります。処理時間には、フィルターの読み取りと照会の費用も含まれます。[Git 2.52.0の比較処理](https://github.com/git/git/blob/v2.52.0/revision.c#L727-L821)

## 世代番号・マージ・リネームと、答えられる問いを分ける

[世代番号](/tools/git-commit-graph.html)を使う祖先判定が省くのは、候補へ到達できない枝をさらにたどる仕事です。変更パスのフィルターが省くのは、あるコミットと第1親の間で、対象パスのtreeを比較する仕事です。両方ともcommit-graphに保存でき、判断する情報は別々です。[Gitのcommit-graph設計文書](https://git-scm.com/docs/commit-graph) · [Gitのcommit-graphファイル形式](https://git-scm.com/docs/gitformat-commit-graph)

**マージの場合**、マージ結果の `player.cpp` が第1親と同じでも、第2親とは違う場合があります。フィルターを参照できるのは第1親との比較です。どの親をたどり、どのコミットを表示するかは、`git log` の履歴を絞る規則やオプションにも従います。[Git 2.52.0の比較処理](https://github.com/git/git/blob/v2.52.0/revision.c#L770-L821) · [git logの履歴の簡略化](https://git-scm.com/docs/git-log#_history_simplification)

**リネームの場合**、`player.cpp` が以前は `hero.cpp` だったとします。固定パスのフィルターに問い合わせても、新旧のパス名の対応までは分かりません。1ファイルを対象にする `git log --follow -- player.cpp` は、名前の変更を検出しながら旧名でも履歴を探します。途中で探すパスが変わるので、固定パスの例をそのまま当てはめることはできません。[git logの `--follow`](https://git-scm.com/docs/git-log#Documentation/git-log.txt---follow) · [Git 2.52.0の履歴探索設定](https://github.com/git/git/blob/v2.52.0/revision.c#L2959-L2982)

## 要点

- 変更パスのBloom filterは、第1親との差を要約する、commit-graphの任意の索引です。
- 参照するビットに0があれば、そのパスの比較を省けます。全部1ならtreeを比べて変更の有無を確かめます。
- 世代番号は祖先へ届く可能性を調べるために使います。マージの第2親以降とリネーム前後の対応には、同じパス判定をそのまま使えません。

## 理解度チェック

::: details `player.cpp` の位置1と6が両方1なら、このコミットで変更したことになる？
両方1でも、別のパスがその位置を立てた可能性があります。第1親とのtree比較で確かめます。
:::

::: details マージの第1親から変更がないと分かったら、第2親との比較結果も分かる？
フィルターが表すのは第1親との差です。第2親の `player.cpp` が同じかは、その親との比較が必要です。
:::

## 検証範囲

2026年11月21日にGit公式資料と実装を確認しました。Git for Windows `2.39.2.windows.1` の独立したSHA-1リポジトリに、`player.cpp` の追加と編集、他のファイルだけを変えるコミットを含む直線の履歴を5件作りました。`git log --format=%s -- player.cpp` は、フィルター生成前と、生成後にこの版の `commitGraph.readChangedPaths` を切り替えた場合のいずれも次の2件でした。

```text
D edit player
B add player
```

`git commit-graph verify` は成功しました。フィルターの読み取りを有効にすると、GitのTrace2診断には `maybe: 2`、`definitely_not: 2`、`false_positive: 0` が記録されました。

次に、`player.cpp` の照会に必要なビットがすべて立つよう意図的に選んだ `side-110.txt` だけを追加し、索引を作り直しました。再検証でも履歴の出力は同じ2件で、Trace2の `maybe` は3、`false_positive` は1になりました。フィルターが候補に残したコミットを、実際のtree比較で除外できた例です。この件数は意図的に作った履歴での観察です。処理時間、通常の履歴における偽陽性の割合、マージや `--follow` でのフィルター利用は測定していません。[Git 2.39.2のTrace2集計](https://github.com/git/git/blob/v2.39.2/revision.c#L726-L781)

## 関連項目

- [Gitのcommit-graph](/tools/git-commit-graph.html) — 世代番号で親をたどる範囲を絞る例を読む。
- [Gitの保存モデル](/tools/git-objects.html) — commit・tree・blobがどこに情報を持つかを確認する。

## 参考資料

- [Git — gitformat-commit-graph](https://git-scm.com/docs/gitformat-commit-graph) — 第1親からの変更パスとビット列の保存形式。
- [Git — git commit-graph](https://git-scm.com/docs/git-commit-graph) — 変更パスのフィルターの生成と読み取り設定。
- [Git — git log](https://git-scm.com/docs/git-log) — パスを指定した履歴、履歴の簡略化、`--follow`。
- [Git 2.52.0 — revision.c](https://github.com/git/git/blob/v2.52.0/revision.c#L727-L821) — 第1親のフィルターを参照し、変更がなければtree比較を省く処理。
