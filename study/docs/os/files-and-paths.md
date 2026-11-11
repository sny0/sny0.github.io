---
title: ファイルとパス — 名前からデータを開くまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: ファイルのバイト列、ディレクトリ、絶対パスと相対パスを、ゲームの素材とセーブデータで説明する。拡張子、文字コード、開いて読み書きして閉じる流れにもつなげる。
  aliases: [ファイル, ディレクトリ, フォルダー, パス, 絶対パス, 相対パス, カレントディレクトリ, 拡張子, テキストファイル, バイナリファイル, 文字コード, open, close]
  verification: MicrosoftのWindowsファイル命名・パス形式・ファイル操作・文字エンコードの資料に照合（2026-11-07）
---

# ファイルとパス — 名前からデータを開くまで

ゲーム本体、画像、セーブデータはストレージ上のファイルとして保存できます。アプリから見ると、通常のデータファイルは順に並んだバイト列です。名前や保存場所を管理する仕組みをファイルシステムと呼びます。ファイルをまとめる場所がディレクトリで、画面上ではフォルダーとも呼びます。[Microsoftのファイルとディレクトリ](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) · [ビットとバイト](/data/integer-bits-and-bytes.html)

## 名前と保存場所をつなぐパス

**パス**は、操作するファイルやディレクトリを指定する文字列です。ここではWindowsの説明用の配置を使います。`D:\Game`以下に、ゲーム本体、画像用の`assets`、セーブ用の`saves`がある例です。[MicrosoftのWindowsのパス形式](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)

```text
D:\Game
├─ game.exe
├─ assets
│  └─ player.png
└─ saves
   └─ slot1.json
```

**絶対パス**は、`D:\Game\assets\player.png`のように、ドライブのルートから場所を指定します。**相対パス**は、`assets\player.png`のように、基準となるディレクトリから場所を指定します。一般的なファイルAPIでは、この基準がプロセスの**カレントディレクトリ**です。[Microsoftの絶対パスと相対パス](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats#traditional-dos-paths)

<figure class="study-figure">
  <img src="/images/os/files-and-paths.svg" alt="DドライブのGameフォルダーにはgame.exe、assets内のplayer.png、saves内のslot1.jsonがある。カレントディレクトリがD:\Gameなら、相対パスassets\player.pngは絶対パスD:\Game\assets\player.pngを指す。" width="760" height="450" loading="lazy">
  <figcaption>ファイル名だけでなく、どのディレクトリを基準にするかが場所を決めます。<a href="/study/images/os/files-and-paths.svg" target="_blank" rel="noopener noreferrer">ディレクトリとパスの図を拡大</a></figcaption>
</figure>

| 表記 | この例で示すもの |
| --- | --- |
| `D:\Game\assets\player.png` | ドライブから指定した画像の絶対パス。 |
| `assets\player.png` | カレントが`D:\Game`なら、同じ画像への相対パス。 |
| `.` | カレントディレクトリ。 |
| `..` | 一つ上のディレクトリ。 |

アプリを起動した場所や起動方法で、カレントディレクトリは変わり得ます。EXEが置かれたディレクトリが、常に相対パスの基準になるわけではありません。また、`D:Game`は`D:\Game`と意味が異なり、ドライブを指定した相対パスです。[Microsoftのパス形式とカレントディレクトリ](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats) · [ターミナル・シェル・コマンド](/tools/terminal-shell-and-commands.html)

## 拡張子とファイルの中身

`player.png`の`.png`や`slot1.json`の`.json`のような末尾を**拡張子**と呼びます。形式や開くアプリを選ぶ手がかりになります。ファイル名を`player.txt`へ変えても、中の画像データが文章へ変換されることはありません。読むアプリは、その形式の規則に従って中身を解釈します。[Microsoftのファイル名と拡張子](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#file-and-directory-names) · [バイナリ形式の検証](/data/binary-file-validation.html)

**テキストファイル**は、バイト列を文字コードの規則で文字として読むファイルです。例えばUTF-8は文字をバイト列へ表す方法の一つです。画像などの**バイナリファイル**では、寸法、色、圧縮データなどを、その形式が決めた値として読み取ります。どちらも保存されている内容はバイト列です。[Microsoftの文字エンコード](https://learn.microsoft.com/en-us/dotnet/standard/base-types/character-encoding-introduction) · [Unicodeと文字コード](/data/unicode-and-encoding.html)

## 開く、読み書きする、閉じる

| 操作 | アプリがすること |
| --- | --- |
| **開く** | パスと、読み取り・書き込みなどの利用方法を指定する。成功すると、ハンドルやストリームなど、以後の操作に使うものを得る。 |
| **読む** | 指定した範囲のバイトを、アプリのメモリへ受け取る。 |
| **書く** | アプリが用意したバイトを、ファイルの指定位置へ渡す。 |
| **閉じる** | そのハンドルやストリームの利用を終え、関連する資源を解放する。 |

開くときには、指定したファイルがあるか、操作が許可されているかなどをOSが確認します。書き込みでファイルを新しく作るか、既存の内容を置き換えるかは、APIに渡す指定で変わります。[Microsoftのファイル作成とオープン](https://learn.microsoft.com/en-us/windows/win32/fileio/creating-and-opening-files)

読み取ったバイトは、ゲームが画像やセーブ内容として解釈します。また、閉じる処理と、突然電源が切れても保存内容が残る保証は、別に検討します。読み取りの内部は[ファイルを読むと内部で何が起きるか](/os/file-read-journey.html)、保存の完了は[ファイル書き込みと永続化](/os/file-write-and-durability.html)、ハンドルは[Windowsのハンドル](/os/windows-handles.html)で扱います。
