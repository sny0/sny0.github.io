---
title: COFFのシンボルと再配置 — リンカーがcallの距離を埋めるまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: compilers
  summary: Windows x64の.objを読み、シンボル表の未定義参照、再配置レコード、リンク後のcall命令を対応付ける。REL32の変位を実測したバイト列から計算する。
  aliases: [COFF, PE/COFF, relocation, 再配置, REL32, IMAGE_REL_AMD64_REL32, ADDR32NB, DUMPBIN, シンボル表, リンカー]
  verification: Visual Studio 2022のMSVC x64でコンパイル、DUMPBINとMAPでオフセット・変位を確認、実行終了コード0（2026-11-06）
---

# COFFのシンボルと再配置 — リンカーがcallの距離を埋めるまで

`call.cpp`を単独でコンパイルすると、別ファイルで定義した`helper`の呼び出しまで機械語になります。この時点では、二つの関数が最終的な実行ファイルのどこに並ぶかは決まっていません。Windows x64のCOFFオブジェクトは、呼び出し命令の一部と、リンカーがその部分を埋めるための記録を持ちます。[MicrosoftのPE/COFF仕様 — COFF再配置](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#coff-relocations-object-only)

## シンボル表で名前を引き、再配置レコードで書き込み箇所を引く

シンボル表は、関数などの名前と、その名前が定義されているセクションや位置を記録します。別のオブジェクトから供給される名前は未定義シンボルとして載ります。リンカーは入力を集め、参照に対応する定義を探して、出力セクションにコードとデータを配置します。[オブジェクトファイルとライブラリ](/runtime/cpp-internals/object-files-and-libraries.html) · [MicrosoftのPE/COFF仕様 — COFFシンボル表](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#coff-symbol-table)

再配置レコードはセクションごとにあり、書き込み箇所、参照先シンボルの表内インデックス、計算方式を指定します。この例では入力セクションの基準位置が0なので、`VirtualAddress`欄の値が`.text`先頭からのオフセットです。`REL32`では相対変位を、`ADDR32NB`ではイメージベースを含まない32ビットのアドレスを作ります。`REL32`の計算には、元のフィールドに入っている加算値も使います。この例の加算値は0です。[MicrosoftのPE/COFF仕様 — x64の再配置種別](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#x64-processors)

<figure class="study-figure">
  <img src="/images/compilers/coff-relocations.svg" alt="call.objの.text内のオフセット4にE8 00 00 00 00があり、オフセット5のREL32が未定義シンボルhelperを参照する。helper.objの定義をリンクした結果、次の命令0x140001009からhelperの0x140001050までの変位0x47が書かれる。" width="760" height="420" loading="lazy" />
  <figcaption>COFFの再配置は変位を置く4バイトを指します。命令の先頭にある <code>E8</code> はそのままです。<a href="/study/images/compilers/coff-relocations.svg" target="_blank" rel="noopener noreferrer">COFF再配置の図を拡大</a></figcaption>
</figure>

## 2ファイルをコンパイルして観察する

空の作業フォルダーに、次のコードをそれぞれ保存します。`extern "C"`を使うと、今回のx64の出力では関数名を`helper`として追えます。

`call.cpp`

```cpp
extern "C" int helper();

extern "C" __declspec(noinline) int call_helper() {
    return helper() + 1;
}

int main() {
    return call_helper() == 43 ? 0 : 1;
}
```

`helper.cpp`

```cpp
extern "C" int helper() {
    return 42;
}
```

Visual Studioの「x64 Native Tools Command Prompt」で実行します。`/c`でリンク前に止めます。`/GL-`は通常のCOFFオブジェクトを観察できるように、全体プログラム最適化を無効にする指定です。[DUMPBINのRELOCATIONS](https://learn.microsoft.com/en-us/cpp/build/reference/relocations?view=msvc-170) · [DUMPBINのSYMBOLS](https://learn.microsoft.com/en-us/cpp/build/reference/symbols?view=msvc-170)

```bat
cl /nologo /Od /GL- /c call.cpp helper.cpp
dumpbin /relocations /symbols /disasm call.obj
dumpbin /symbols helper.obj
```

MSVC 19.35の出力では、`call.obj`の該当箇所が以下のように並びました。シンボルの表内インデックスや命令位置はツールチェーンやビルド条件により変わります。

| 出力 | 観察した行の要点 |
| --- | --- |
| 逆アセンブル | `.text`の`0x04`に`E8 00 00 00 00` |
| 再配置 | `.text`の`0x05`に`REL32`、シンボルのインデックス`0x9`、対象は`helper` |
| `call.obj`のシンボル表 | `helper`は`UNDEF` |
| `helper.obj`のシンボル表 | `helper`はコードセクションに定義されている |

次にリンクし、MAPファイルで関数の位置を、逆アセンブルで命令のバイト列を確認します。[MicrosoftのMAP出力](https://learn.microsoft.com/en-us/cpp/build/reference/map-generate-mapfile?view=msvc-170)

```bat
link /nologo /incremental:no /map /out:call.exe call.obj helper.obj
dumpbin /disasm call.exe
call.exe
echo %ERRORLEVEL%
```

このビルドでは、リンク時に想定した仮想アドレスは`call_helper`が`0x140001000`、`helper`が`0x140001050`でした。`call`は`0x140001004`にあり、4バイトの変位フィールドを含めて5バイトです。次の命令は`0x140001009`なので、変位は`0x140001050 - 0x140001009 = 0x47`です。変位を符号付き32ビットのリトルエンディアンで格納した結果、命令のバイト列は`E8 47 00 00 00`となりました。変位の符号は、宛先が次の命令の位置より先か手前かで決まります。実行時は`main`が結果を照合し、終了コード`0`を返します。

## ロード時の再配置との関係

この`call`と`helper`を含むイメージ全体が同じ量だけ移動しても、両者の差は`0x47`のままです。いっぽう、データ領域に格納された64ビットの絶対アドレスなど、移動量に応じて更新する箇所は、PEのベース再配置表に記録します。オブジェクトの`REL32`を処理するのはリンカーで、PEのベース再配置を処理するのはローダーです。[PEのマッピング、ベース再配置とIAT](/os/pe-loading-and-imports.html) · [MicrosoftのPE/COFF仕様 — ベース再配置](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#the-reloc-section-image-only)
