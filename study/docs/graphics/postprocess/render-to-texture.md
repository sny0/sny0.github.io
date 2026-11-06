---
title: D3D12でテクスチャに描き、次のパスで読む
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 画面外のテクスチャをRTVで描画先にし、遷移バリアの後にSRVから読む。フルスクリーン三角形とTexture2D.Loadで、描画パス間の色データの受け渡しを追う。
  aliases: [render to texture, offscreen rendering, render target, RTV, SRV, fullscreen triangle, SV_Position, Texture2D.Load, Texture2D.Sample, ポストプロセス]
  verification: MicrosoftのD3D12リソースとHLSLの仕様に照合（2026-11-07）
---

# D3D12でテクスチャに描き、次のパスで読む

ポストプロセスでは、先に描いた色を次のパスの入力にします。例えばシーンの色を画面外のテクスチャAへ描き、別のパスでAを読んで色を変え、出力のテクスチャBへ書きます。この受け渡しがあれば、同じ描画結果から色調補正やブルームなどへ処理をつなげられます。[ポストプロセスパイプライン](/graphics/postprocess/overview.html) · [Microsoftのレンダーターゲットからシェーダー入力への遷移例](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#example-of-split-barriers)

<figure class="study-figure">
  <img src="/images/graphics/render-to-texture.svg" alt="パス1でテクスチャAのRTVへ左が赤、右が緑の画像を描く。AをRENDER_TARGETからPIXEL_SHADER_RESOURCEへ遷移させる。パス2ではAのSRVを読み、赤と青を入れ替えて別のテクスチャBのRTVへ書く。Bは左が青、右が緑になる。" width="760" height="424" loading="lazy">
  <figcaption>一つのDIRECTキューで、Aへの描画を先に記録し、遷移バリアを挟んでAを読みます。パス2の結果はBに残ります。<a href="/study/images/graphics/render-to-texture.svg" target="_blank" rel="noopener noreferrer">パス間の受け渡し図を拡大</a></figcaption>
</figure>

## 一つのテクスチャに二つのビューを作る

この例のAとBは、32 × 32ピクセル、1ミップ、単一サンプルの `DXGI_FORMAT_R8G8B8A8_UNORM` テクスチャです。`D3D12_RESOURCE_FLAG_ALLOW_RENDER_TARGET` を指定して作り、対応する形式でレンダーターゲットビュー（RTV）を作ります。Aにはさらにシェーダーリソースビュー（SRV）を作ります。AのRTVとSRVは同じリソースを指します。画像が二枚に増えるのは、結果を書き出すBを別に作るためです。[Microsoftのリソース作成フラグ](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_resource_flags) · [Microsoftのビューとディスクリプター](https://learn.microsoft.com/en-us/windows/win32/direct3d12/descriptors-overview) · [テクスチャのミップとサブリソース](/graphics/texture/dds-and-subresources.html)

| ビュー | 何を指定するか | D3D12での渡し方 |
| --- | --- | --- |
| AのRTV | パス1の色の書き込み先 | RTVヒープのCPUハンドルを `OMSetRenderTargets` へ渡す |
| AのSRV | パス2がピクセルシェーダーで読む画像 | シェーダー可視の `CBV_SRV_UAV` ヒープに置き、テーブルで `t0` へ対応付ける |
| BのRTV | パス2の色の書き込み先 | BのRTVのCPUハンドルを `OMSetRenderTargets` へ渡す |

パス2のルートシグネチャには、SRVを `t0` へ渡すディスクリプターテーブルを定義します。描画時は `SetDescriptorHeaps` でシェーダー可視ヒープを設定し、`SetGraphicsRootDescriptorTable` にテーブル先頭のGPUハンドルを渡します。ここでは一つのSRVだけを使うので、そのSRVのGPUハンドルがテーブルの先頭です。[MicrosoftのOMSetRenderTargets](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-omsetrendertargets) · [Microsoftのヒープ設定](https://learn.microsoft.com/en-us/windows/win32/direct3d12/setting-descriptor-heaps) · [D3D12のディスクリプターヒープとテーブル](/graphics/optimization/d3d12-descriptor-heaps.html)

## 描画先から読み取り元へ切り替える

パス1はAを `RENDER_TARGET` の状態で描きます。同じDIRECTキューのコマンド列で、その描画の後にAを `PIXEL_SHADER_RESOURCE` へ変える遷移バリアを記録します。パス2ではAをSRVで読み、`RENDER_TARGET` のBへ出力します。ビューの設定とリソース状態の管理はそれぞれ必要です。D3D12の従来の状態指定では、一つのサブリソースに `RENDER_TARGET` の書き込み状態と `PIXEL_SHADER_RESOURCE` の読み取り状態を組み合わせられません。段数を増やす場合は、読み書きの役割を二枚の画像で交互に切り替えられます。[Microsoftのリソース状態とバリア](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12) · [D3D12のリソースバリア](/graphics/optimization/d3d12-resource-barriers.html) · [ピンポンバッファ](/graphics/postprocess/ping-pong-and-history.html)

## フルスクリーン三角形で各ピクセルを処理する

ビューポートとシザーをB全体に合わせ、クリップ空間で表示範囲を覆う大きな三角形を一つ描きます。頂点シェーダーで `SV_VertexID` から3頂点の位置を作れます。ピクセルシェーダー入力の `SV_Position.xy` はレンダーターゲット上の座標で、ビューポートが左上から始まる場合、先頭ピクセルの中心は `(0.5, 0.5)` です。この例ではAとBの大きさが同じなので、整数へ変換した出力座標で対応する入力テクセルを読めます。[MicrosoftのHLSLシステム値](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics) · [Microsoftのピクセル座標](https://learn.microsoft.com/en-us/windows/win32/direct3d10/d3d10-graphics-programming-guide-resources-coordinates) · [DirectX Tool Kitのフルスクリーン三角形のHLSL実装例](https://github.com/microsoft/DirectXTK/blob/main/Src/Shaders/PostProcess.fx)

```hlsl
Texture2D<float4> sourceColor : register(t0);

float4 Process(float4 position : SV_Position) : SV_Target
{
    int2 pixel = int2(position.xy);
    float4 rgba = sourceColor.Load(int3(pixel, 0));
    return rgba.bgra;
}
```

`Load` には整数のテクセル座標とミップ番号を渡します。このコードはミップ0から1テクセルをフィルターなしで読み、赤と青の成分を入れ替えます。解像度を変えて補間しながら読む場合は、例えば `Sample` に正規化したUVと `SamplerState` を渡し、フィルターや画像の端での振る舞いを設定します。AとBで解像度やビューポートが異なるときは、どの出力座標をどの入力座標へ対応させるかを決めます。[MicrosoftのTexture2D.Load](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-load) · [MicrosoftのTexture2D.Sample](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-sample)

## 結果を画面へ出すか、データとして読むか

中間テクスチャAは、次のパスがSRVで読みます。ウィンドウへ表示する場合は、最後にスワップチェーンのバックバッファへ描き、バックバッファを `PRESENT` の状態にして `Present` を呼びます。読み戻しで検証する実践では、AとBを `COPY_SOURCE` へ遷移させ、読み戻しバッファへコピーします。フェンスを待ってから、バッファの行ピッチに従って両方の画像の全ピクセルを照合します。[Microsoftのバックバッファの状態](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#resource-states-for-presenting-back-buffers) · [Microsoftのテクスチャの読み戻し](https://learn.microsoft.com/en-us/windows/win32/direct3d12/upload-and-readback-of-texture-data) · [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html) · [C++で描画結果を次のパスへ渡す](/practice/graphics/render-to-texture-observation.html)
