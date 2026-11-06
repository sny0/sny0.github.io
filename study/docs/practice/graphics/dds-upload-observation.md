---
title: C++でDDSの2つのmipをD3D12へ転送して読み戻す
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: dds-upload-observation
  order: 1
  summary: 4×4と2×2のRGBA8をDDSに保存し、D3D12の転送バッファに行単位で詰め直す。WARPでコピーし、読み戻した全80バイトを照合する。
  aliases: [DDS, mip, D3D12, WARP, RowPitch, GetCopyableFootprints, CopyTextureRegion, readback]
  verification: Windows x64のMSVCでビルドし、D3D12 WARPで2つのmipの全80バイトを照合。サイズ不足と壊れたヘッダーの拒否も確認（2026-11-06）
---

# C++でDDSの2つのmipをD3D12へ転送して読み戻す

4×4と2×2の画像を一つのDDSに保存します。各行をD3D12が指定した位置に並べてテクスチャへコピーし、別のバッファを通してCPUへ読み戻します。ファイルから読んだバイトと読み戻したバイトが全行で一致すれば、mipの位置と行の間隔を正しく扱えています。[DDSとサブリソース](/graphics/texture/dds-and-subresources.html) · [テクスチャ転送の図と解説](/graphics/texture/d3d12-texture-upload.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/graphics/dds-upload-observation/dds_upload.cpp" download>dds_upload.cpp</a>を空の作業フォルダーに保存します。Windows 10／11でVisual StudioのC++ツールとWindows SDKを使います。**x64 Native Tools Command Prompt**でフォルダーを開き、次のコマンドを実行します。WARPはD3D12をCPU上で実行するソフトウェアアダプターです。この実践はウィンドウを作らず、コマンドの結果をコンソールに表示します。[MicrosoftのC++コマンドラインツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170) · [MicrosoftのWARP解説](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/directx-warp)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX dds_upload.cpp d3d12.lib dxgi.lib
dds_upload.exe make
dds_upload.exe verify
```

```text
created study-two-mips.dds (228 bytes)
mip 0: DDS offset=148 row bytes=16; buffer offset=0 RowPitch=256
mip 1: DDS offset=212 row bytes=8; buffer offset=1024 RowPitch=256
mip 0: 64 bytes match after D3D12 readback
mip 1: 16 bytes match after D3D12 readback
```

`make`は作業フォルダーに`study-two-mips.dds`を新規作成します。同名のファイルがあれば作成を中止します。`verify`は読み取り専用で開きます。このプログラムが受け付けるのは、生成例と同じ形のDX10ヘッダー付きRGBA8 DDSです。

## 同じ行の、二つの位置を比べる

| mip | 行数 | 行のデータ | DDS内の先頭 | コピー用バッファ内の先頭 | コピー用バッファの行間隔 |
| --- | --- | --- | --- | --- | --- |
| 0（4×4） | 4 | 16バイト | 148 | 0 | 256バイト |
| 1（2×2） | 2 | 8バイト | 212 | 1024 | 256バイト |

たとえばmip 1の2行目は、DDSの `212 + 8 = 220` から8バイト読みます。転送バッファでの書き込み先は `1024 + 256 = 1280` です。行ごとに移すデータは8バイトで、256バイトは次の行まで進む距離です。コピー用の値は`GetCopyableFootprints`から取得します。[Microsoftのコピー用レイアウトの仕様](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12device-getcopyablefootprints)

## コマンドとフェンスを追う

1. CPUはDDSから各行を取り出し、`UPLOAD`ヒープ上のバッファに配置します。
2. `CopyTextureRegion`をmipごとに記録し、`DEFAULT`ヒープのテクスチャへコピーします。続けてテクスチャを`COPY_SOURCE`へ遷移させ、`READBACK`バッファへコピーし、最後にピクセルシェーダーで読める状態に遷移させます。
3. コマンドを直接キューへ提出し、その後ろにフェンス値`1`の通知を置きます。CPUはフェンスを待ってから読み戻しバッファを開き、2つのmipの行データを元のDDSと照合します。[Microsoftの転送と読み戻しの手順](https://learn.microsoft.com/en-us/windows/win32/direct3d12/upload-and-readback-of-texture-data) · [GPUリソースの寿命とフェンス](/graphics/optimization/gpu-resource-lifetime.html)

この実践で観察するのは、D3D12でコピーしたデータの一致と、各行の配置です。ゲームが描画に使う場合は、この後に用途に合ったビューを作り、必要なmipをシェーダーから参照できるようにします。[テクスチャストリーミングとmip](/graphics/texture/texture-streaming-and-mip-residency.html)

## ソース

<<< @/public/samples/graphics/dds-upload-observation/dds_upload.cpp{cpp}
