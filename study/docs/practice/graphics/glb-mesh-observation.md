---
title: C++でGLBの頂点とインデックスを読み、三角形を描く
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: glb-mesh-observation
  order: 1
  summary: 3頂点と16ビットインデックスを含むGLBを作る。バイト列から頂点と法線を読み、D3D12 WARPで描いた画像の2画素を照合する。
  aliases: [glTF, GLB, POSITION, NORMAL, byteStride, vertex buffer, index buffer, DrawIndexedInstanced, WARP]
  verification: Windows x64のMSVCでビルドし、WARPの読み戻しで中央と隅の画素を照合。範囲外インデックスと短いGLBの拒否も確認（2026-11-06）
---

# C++でGLBの頂点とインデックスを読み、三角形を描く

3頂点の位置と法線、三角形のインデックスを一つのGLBにまとめます。C++でバイト列を読み、頂点バッファビューとインデックスバッファビューをD3D12に渡します。描いた先は32×32ピクセルのテクスチャです。CPUへ読み戻して、三角形の内側と背景の色を確認します。[glTFのファイル構造](/graphics/mesh/gltf-mesh-buffers.html) · [頂点入力とインデックス描画](/graphics/mesh/vertex-and-index-input.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/graphics/glb-mesh-observation/glb_mesh.cpp" download>glb_mesh.cpp</a>を空の作業フォルダーに保存します。Windows 10／11でVisual StudioのC++ツールとWindows SDKを使います。**x64 Native Tools Command Prompt**でフォルダーを開き、次を実行します。描画はWARPというソフトウェアアダプター上で動き、結果はコンソールに出ます。[MicrosoftのC++コマンドラインツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170) · [MicrosoftのWARP解説](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/directx-warp)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX glb_mesh.cpp d3d12.lib dxgi.lib d3dcompiler.lib
glb_mesh.exe make
glb_mesh.exe verify
```

```text
created study-triangle.glb (872 bytes)
index 2 -> POSITION=(0.00,0.75,0.50), NORMAL.z=1.00
index 0 -> POSITION=(-0.75,-0.75,0.50), NORMAL.z=1.00
index 1 -> POSITION=(0.75,-0.75,0.50), NORMAL.z=1.00
WARP readback: center=(255,0,0,255), corner=(0,0,255,255)
```

`make`は`study-triangle.glb`を新規作成します。同名のファイルがあれば中止します。`verify`は生成例と同じJSONチャンクを受け付け、その配置に従ってBINチャンクの実データを読み取ります。汎用のglTFローダーを作る場合は、JSONを解析し、ファイルごとに参照先やサイズを決めます。[KhronosのGLB仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification) · [バイナリファイルの範囲検査](/data/binary-file-validation.html)

## BINの位置と、描画側の設定を照合する

| データ | BIN先頭からの位置 | 読み方 |
| --- | --- | --- |
| `POSITION` | 0、24、48 | 頂点ごとに32ビット浮動小数点数3個 |
| `NORMAL` | 12、36、60 | 同じ頂点レコードの後半に32ビット浮動小数点数3個 |
| `indices` | 72、74、76 | 16ビットの符号なし整数 `2, 0, 1` |
| GLBの詰め物 | 78、79 | BINチャンクを4バイトの倍数にするための余白 |

例えば頂点2はレコードの先頭が `2 × 24 = 48` で、法線は `48 + 12 = 60` から読みます。D3D12の頂点バッファビューにも同じストライド24を指定し、入力レイアウトで`POSITION`を0、`NORMAL`を12から取得します。インデックスビューは6バイトを`DXGI_FORMAT_R16_UINT`として扱います。[MicrosoftのD3D12頂点入力](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_input_element_desc) · [Microsoftのインデックスバッファビュー](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_index_buffer_view)

## 頂点入力からピクセルまでを確認する

1. `DrawIndexedInstanced(3, 1, 0, 0, 0)`で、`2 → 0 → 1`の順に頂点を参照し、三角形を一つ描きます。実践では位置をそのままクリップ空間座標に使います。[Microsoftのインデックス描画API](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-drawindexedinstanced)
2. ピクセルシェーダーは法線のZ成分を赤に使います。三角形の内側では赤、先に青で塗った背景では青になります。
3. テクスチャをコピー元へ遷移させ、読み戻しバッファへコピーします。フェンスを待ってから、`RowPitch`を使って中央と隅の画素を読み、RGBAを照合します。[D3D12の転送と読み戻し](/graphics/texture/d3d12-texture-upload.html)

サンプルは小さな頂点・インデックスデータを`UPLOAD`ヒープのバッファから直接参照します。モデルを制作データから取り込み、座標系やマテリアルをそろえてゲーム向けに準備する工程は、別の記事で扱います。[メッシュのインポートとクック](/graphics/mesh/mesh-import-and-cooking.html)

## ソース

<<< @/public/samples/graphics/glb-mesh-observation/glb_mesh.cpp{cpp}
