---
title: C++でテクスチャに描き、次のパスで色を変える
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: render-to-texture-observation
  order: 1
  summary: WARPで左が赤、右が緑の中間画像を作り、次のパスでその画像をSRVから読む。赤と青を入れ替え、2枚の全画素を照合する。
  aliases: [render to texture, offscreen rendering, RTV, SRV, WARP, SV_VertexID, SV_Position, Texture2D.Load, ポストプロセス]
  verification: Windows x64のMSVCとWARPで実行し、各画像の全1024画素の一致と、色の入れ替えを外した場合の不一致を確認（2026-11-07）
---

# C++でテクスチャに描き、次のパスで色を変える

二つの描画パスを一つのD3D12コマンドリストに記録します。最初のパスは32×32ピクセルのテクスチャを左半分が赤、右半分が緑になるように描きます。次のパスは同じ画像をシェーダーで読み、赤と青を入れ替えて別のテクスチャに描きます。最後に両方を読み戻して照合します。[オフスクリーン描画の図と解説](/graphics/postprocess/render-to-texture.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/graphics/render-to-texture-observation/render_to_texture.cpp" download>render_to_texture.cpp</a>を空の作業フォルダーに保存します。Windows 10／11でVisual StudioのC++ツールとWindows SDKを使い、**x64 Native Tools Command Prompt**から実行します。WARPというソフトウェアアダプターを使い、画素を確認した結果をコンソールへ出します。[MicrosoftのC++コマンドラインツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170) · [MicrosoftのWARP解説](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/directx-warp)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX render_to_texture.cpp d3d12.lib dxgi.lib d3dcompiler.lib
render_to_texture.exe
```

```text
pass 1: left=(255,0,0,255) right=(0,255,0,255); 1024 pixels match
pass 2: left=(0,0,255,255) right=(0,255,0,255); 1024 pixels match
```

二つの画像はどちらも`DXGI_FORMAT_R8G8B8A8_UNORM`です。表示する色はRGBAの8ビット整数値です。左と右の代表色を出力しつつ、比較そのものは32×32の全画素に対して行います。

## 一枚の画像を、書く側と読む側で指定する

| 段階 | 中間画像 `scene` | 出力画像 `output` |
| --- | --- | --- |
| 1回目の描画 | RTVで選び、`RENDER_TARGET`として書く。 | 2回目の出力先として確保しておく。 |
| 2回目の描画 | `PIXEL_SHADER_RESOURCE`へ遷移し、`t0`のSRVを通して読む。 | RTVで選び、`RENDER_TARGET`として書く。 |
| 読み戻し | `COPY_SOURCE`へ遷移し、読み戻し用のバッファへコピーする。 | `COPY_SOURCE`へ遷移し、別の読み戻し用バッファへコピーする。 |

RTVはCPU側のハンドルで出力先に指定します。SRVはシェーダー可視のヒープに作り、そのGPUハンドルをルートのディスクリプターテーブルへ渡します。中間画像を作るときと読むときで、指定するビューとリソース状態が変わります。[D3D12のディスクリプターヒープ](/graphics/optimization/d3d12-descriptor-heaps.html) · [D3D12のリソースバリア](/graphics/optimization/d3d12-resource-barriers.html)

どちらのパスも、`SV_VertexID`から画面全体を覆う三角形を作ります。後処理のピクセルシェーダーは`SV_Position.xy`から整数のテクセル座標を求め、`Texture2D.Load`でmip 0の値を取得します。`rgba.bgra`が赤と青の入れ替えです。ここを`rgba`に変えて再ビルドすると、2回目の左半分が赤のままになり、512画素だけが照合に通ります。[MicrosoftのHLSL Load仕様](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-load)

CPUはフェンスの到達後、読み戻しバッファの`RowPitch`に従って各行を見ます。もう一つ画像処理を続ける場合は、次に読む画像と書く画像を決め、最後の読み取りまで必要なデータを残します。[テクスチャ転送と読み戻し](/graphics/texture/d3d12-texture-upload.html) · [ピンポンバッファとフレーム履歴](/graphics/postprocess/ping-pong-and-history.html) · [描画パスのアタッチメント](/graphics/optimization/render-pass-attachments.html)

## ソース

<<< @/public/samples/graphics/render-to-texture-observation/render_to_texture.cpp{cpp}
