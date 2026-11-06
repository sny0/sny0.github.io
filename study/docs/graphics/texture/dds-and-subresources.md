---
title: DDSの中身とテクスチャのサブリソース
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: DDSヘッダーからテクスチャの形式と形を読み、mipと配列スライスごとにデータの位置を求める。BC圧縮のブロック行と読み取り範囲の検査も扱う。
  aliases: [DDS, DDS_HEADER, DDS_HEADER_DXT10, DXGI_FORMAT, mipmap, mip level, subresource, array slice, row pitch, BC7, cubemap]
  verification: MicrosoftのDDS仕様、DXGI形式、Direct3D 12のサブリソース資料と照合
---

# DDSの中身とテクスチャのサブリソース

レベルのパックから一枚のテクスチャを取り出したあと、ローダーは受け取ったバイト列を「幅と高さがいくつで、どの形式のテクスチャか」として解釈します。**DDS（DirectDraw Surface）**は、テクスチャの形式や形を表すヘッダーに、複数の解像度や面のデータを続けて格納できるファイル形式です。DDSのヘッダーから各画像の範囲を求め、その範囲をGPUへの転送に使います。[MicrosoftのDDSプログラミングガイド](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide) · [ゲームのアセットパック](/game/asset-pack-files.html)

## ヘッダーから画像データの開始位置を決める

| ファイル先頭からの位置 | 大きさ | 内容 |
| --- | --- | --- |
| `0` | 4バイト | 識別子 `DDS `。最後の1バイトは空白で、16進の並びは `44 44 53 20`。 |
| `4` | 124バイト | `DDS_HEADER`。幅、高さ、mip数、形式の手掛かりなどを持つ。内側の `DDS_PIXELFORMAT` は32バイト。 |
| `128` | 20バイト | `DDS_HEADER_DXT10`。`DDS_PIXELFORMAT` に `DDPF_FOURCC` フラグが立ち、FourCC が `DX10` のときに続く。 |
| `128` または `148` | 形式と寸法から計算 | 画像データ。DX10拡張の有無で開始位置が変わる。 |

FourCCは4文字で形式を表す値です。従来のヘッダーは `DXT1` などのFourCCや、各色成分のビットマスクで画素の並びを指定します。DX10拡張では `DXGI_FORMAT` の番号、リソースの次元、配列数などを指定します。例えば `DXGI_FORMAT_R8G8B8A8_UNORM` の番号 `28` は、各成分が8ビットのRGBAを表します。`R8G8B8A8_UNORM_SRGB` ではRGBをsRGBとして解釈し、アルファを0〜1に正規化した値として扱います。[MicrosoftのDDS_HEADER](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-header) · [DDS_PIXELFORMAT](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-pixelformat) · [DDS_HEADER_DXT10](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-header-dxt10) · [DXGI_FORMAT一覧](https://learn.microsoft.com/en-us/windows/win32/api/dxgiformat/ne-dxgiformat-dxgi_format)

32ビットの整数欄は、下位バイトが先のリトルエンディアンで読みます。例えば `1C 00 00 00` は `28` です。ファイルのバイト列から明示的に整数を組み立てると、コンパイラが決める構造体の配置やホストのバイト順に左右されません。[整数とバイト列](/data/integer-bits-and-bytes.html)

## mipと配列スライスから画像を選ぶ

**mip（ミップ）**は同じテクスチャの解像度を変えた画像です。例えば幅8、高さ4なら、全段を持つ場合は `8×4`、`4×2`、`2×1`、`1×1` になります。片方の辺が1になったあとは、もう片方だけ小さくなります。DDSでは指定した段数の画像を格納します。**配列スライス**は、同じ形式・寸法を持つテクスチャ配列の一要素です。各配列要素について、最も大きいmipから順に画像データが並びます。[MicrosoftのDDS配列レイアウト](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide#using-texture-arrays-in-direct3d-1011) · [レンダラー実践のテクスチャとミップマップ](/graphics/capstone/03-resources.html)

<figure class="study-figure">
  <img src="/images/graphics/dds-and-subresources.svg" alt="DX10拡張付きDDSの例。先頭から識別子4バイト、基本ヘッダー124バイト、拡張ヘッダー20バイトが続く。データ開始位置148から、配列要素0のmip 0・1・2、続いて配列要素1のmip 0・1・2が順に並ぶ。単一プレーンのDirect3D 12では、これらのサブリソース番号は0から5となる。" width="760" height="416" loading="lazy">
  <figcaption>DX10拡張があり、配列要素が2つ、mipが3段ある例です。帯の幅は読みやすさに合わせて調整しています。<a href="/study/images/graphics/dds-and-subresources.svg" target="_blank" rel="noopener noreferrer">DDSの配置図を拡大</a></figcaption>
</figure>

**キューブマップ**では、立方体の `+X`、`−X`、`+Y`、`−Y`、`+Z`、`−Z` の各面が2D画像に対応します。DX10拡張でキューブのフラグが立つ場合、ファイルの `arraySize` はキューブの個数で、2D画像の配列要素数はその6倍です。各面にはその面のmip列が続きます。[MicrosoftのDDSキューブマップの例](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-file-layout-for-cubic-environment-maps) · [DDS_HEADER_DXT10のarraySize](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-header-dxt10)

**サブリソース**はDirect3D 12がテクスチャの一部分を指定するための単位です。RGBA8のようにプレーンが一つの2Dテクスチャ配列なら、番号は `mip + arraySlice × mipCount` です。図では配列要素1のmip 1が番号4になります。深度とステンシルを別に扱う形式など、複数プレーンがある場合の式には `planeSlice × mipCount × arraySize` も加わります。ここでの `arraySize` はDirect3D 12上の配列要素数です。3Dテクスチャでは、同じmipの奥行き方向のスライスをまとめて一つのサブリソースとして扱います。[Microsoftのサブリソースの説明](https://learn.microsoft.com/en-us/windows/win32/direct3d12/subresources)

## 1行のバイト数とmipの大きさを計算する

**行ピッチ（row pitch）**は、ある行の先頭から次の行の先頭までのバイト数です。行間の詰め物がないRGBA8では1画素4バイトなので、`幅 × 4` が行ピッチです。**ブロック圧縮**形式では4×4画素を一つのブロックにまとめ、例えばBC1は8バイト、BC7は16バイトで表します。行ピッチを求めるときは、画像の幅を4で割って切り上げたブロック数に1ブロックのバイト数を掛けます。高さも4で割って切り上げると、画素の行数からブロックの行数に変わります。1×1まで縮めたmipにも、格納時は1ブロック分のバイト数が必要です。[MicrosoftのDDSピッチ計算](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide#dds-file-layout) · [MicrosoftのBC7形式](https://learn.microsoft.com/en-us/windows/win32/direct3d11/bc7-format)

| DX10拡張付きの8×8 BC7の例 | ブロック列×行 | 行ピッチ | 画像の大きさ | ファイル内の開始位置 |
| --- | --- | --- | --- | --- |
| mip 0（8×8） | 2×2 | 32バイト | 64バイト | 148 |
| mip 1（4×4） | 1×1 | 16バイト | 16バイト | 212 |
| mip 2（2×2） | 1×1 | 16バイト | 16バイト | 228 |
| mip 3（1×1） | 1×1 | 16バイト | 16バイト | 244 |

表は詰め物を入れない場合の計算例です。各mipのバイト数を順に足すと、このファイルは260バイトになります。`dwPitchOrLinearSize` の記録には書き出しツール間で差があるため、Microsoftのガイドは対応する形式のピッチを計算する方法を示しています。ローダーでは扱うファイルの配置規則を決め、その規則でファイル内の行を取り出します。D3D12の転送用バッファには別の行ピッチや配置があるので、転送側では `GetCopyableFootprints` が返す値を使って行ごとに並べます。[MicrosoftのDDSピッチ計算](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide#dds-file-layout) · [D3D12のテクスチャ転送](/graphics/texture/d3d12-texture-upload.html)

## 読み取れる範囲と対応する形式を検査する

まずファイル長を確かめ、識別子と2つの構造体サイズを照合します。DX10拡張の合図があれば追加の20バイトが収まることも検査します。続いて、使うローダーが対応する形式・次元・フラグか、幅や高さが正で上限以内か、mip数がその寸法から作れる範囲かを確認します。幅やmip数が大きい場合に備え、ブロック数・行ピッチ・画像の大きさの計算には桁あふれの検査を入れます。[MicrosoftのDDSファイル検証](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide#dds-variants) · [バイナリファイルの範囲検査](/data/binary-file-validation.html)

画像ごとに `offset <= fileSize` を確認し、そのあとで `imageBytes <= fileSize - offset` を確認します。両方を通った画像だけ、次のオフセットを `offset + imageBytes` で求められます。先頭の画像が読めても、後ろのmipや面が途中で切れていることがあるため、使う範囲を一つずつ確かめます。[短い読み取りとEOF](/os/file-read-journey.html) · [バイナリの範囲検査](/data/binary-file-validation.html)

PNGは圧縮した画像を交換・保存する形式として使われます。ゲームでPNGを使う場合は、画像をデコードし、必要ならmipを作るなどして転送用のデータを用意します。DDSでは、事前に生成したmipやGPUが対応するBC形式のブロックを保存できるため、対応するリソースへその形式のまま転送できます。ゲームのパックは、DDSも含めた複数の素材を名前やIDで探せるようまとめる入れ物です。[W3CのPNG仕様](https://www.w3.org/TR/png-3/) · [MicrosoftのDDSプログラミングガイド](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide) · [アセットパックの構成](/game/asset-pack-files.html)

実践では、小さなRGBA8のDDSを生成して読み、ファイル内の行をD3D12の転送用バッファに並べます。テクスチャにコピーした結果を読み戻し、元のデータと一致することを確かめます。[DDSをD3D12へ転送するC++実践](/practice/graphics/dds-upload-observation.html)
