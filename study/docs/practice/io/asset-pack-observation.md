---
title: C++でアセットパックを作って必要な範囲を読む
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: game
  collection: asset-pack-observation
  order: 1
  summary: 3件の素材をまとめたパックを作り、名前から位置を引いて1件を読む。壊れた索引が範囲検査で拒否されることも試す。
  aliases: [SPAK, アセットパック, TOC, 目次, offset, bounds check]
  verification: Windows x64のMSVCでビルド・実行。正常な読み取り、範囲外・重複・切れた索引の拒否、既存ファイルの上書き防止を確認（2026-11-06）
---

# C++でアセットパックを作って必要な範囲を読む

3件の短い素材を、100バイトの `SPAK` ファイルにまとめます。読み取り側はヘッダーと目次を検査し、指定した名前の位置へ移動して、その素材のバイトだけを読みます。もう一つのファイルには壊れた目次を入れ、データを読みに行く前に拒否するところを確かめます。[パックファイルの構成図](/game/asset-pack-files.html) · [バイナリの範囲検査](/data/binary-file-validation.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/io/asset-pack-observation/asset_pack.cpp" download>asset_pack.cpp</a> を空の作業フォルダーに保存します。WindowsのVisual Studioで **x64 Native Tools Command Prompt** を開き、そのフォルダーで実行します。`make` と `make-bad` はそれぞれ専用の名前でファイルを新規作成します。同名のファイルがあれば作成を中止します。[MicrosoftのC++コマンドラインツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170) · [Microsoftのファイル作成モード](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/fopen-wfopen?view=msvc-170)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX asset_pack.cpp
asset_pack.exe make
asset_pack.exe list study-assets.spack
asset_pack.exe read study-assets.spack player
```

```text
created study-assets.spack
player offset=84 length=4
stage offset=88 length=7
ui offset=95 length=5
player offset=84 length=4
bytes: 73 68 69 70
```

`list` は目次の3件を表示します。`read` は `player` のオフセット84へ移動し、4バイトを読みます。表示した `73 68 69 70` はASCIIで `ship` です。`stage` を指定すると、別のオフセットから `level-1` の7バイトを取得できます。[ファイル位置と読み取ったバイト数](/os/file-read-journey.html)

## ファイル内の位置を計算する

| 位置（先頭からのバイト数） | 大きさ | 内容 |
| --- | --- | --- |
| 0 | 12 | `SPAK`、版 `1`、目次の件数 `3` |
| 12 | 72 | 1件24バイトの目次が3件。名前16バイト、オフセット4バイト、長さ4バイト |
| 84 | 16 | `ship`、`level-1`、`score` の順に並ぶ素材 |

数値は32ビットのリトルエンディアンで書き出します。例えば `player` のオフセット84は16進数で `54` なので、目次では `54 00 00 00` です。読み取り側はバイト列から値を組み立て、C++の構造体は解析後の情報を保持するために使います。[整数とバイト列の読み方](/data/integer-bits-and-bytes.html)

この教材では、ファイルは最大1 MiB、目次は1〜32件、素材の長さは1バイト以上とします。名前は英小文字・数字・`_`・`-` の1〜15文字で、16バイトの欄の残りをゼロにします。目次は素材の開始位置順に並べ、名前の重複や素材範囲の重なりを拒否します。素材の間に余白を置くことはできます。

## 壊れた目次を読むとどうなるか

```bat
asset_pack.exe make-bad
asset_pack.exe read study-assets-bad.spack player
```

```text
created study-assets-bad.spack
error: asset range outside file: player
```

壊れたパックは、最初の素材のオフセットが `0xfffffffe`、長さが `4` です。32ビットの符号なし整数で先に足すと、終端の値は `2` に折り返します。このプログラムは、オフセットがファイル内に収まるかを先に確認し、続けて長さが残りバイト数以下かを調べます。失敗すれば素材の位置への移動やバッファの確保を始める前に終了します。[範囲検査の式と図](/data/binary-file-validation.html)

この形式は、目次から必要な範囲を見つけて検査するためのものです。圧縮された素材や配布版の切り替えを扱う設計は、別の解説で追えます。[パックの配置とチャンク圧縮](/game/asset-pack-files.html) · [ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html)

## ソース

<<< @/public/samples/io/asset-pack-observation/asset_pack.cpp{cpp}
