---
title: 頂点バッファとインデックスバッファから三角形を組み立てる
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: D3D12がインデックスから頂点を選び、ストライドと属性のオフセットで入力を取り出す手順を扱う。glTFの読み取り、描画範囲の検査、バッファの寿命までつなげる。
  aliases: [頂点バッファ, vertex buffer, インデックスバッファ, index buffer, input assembler, input layout, stride, DrawIndexedInstanced, BaseVertexLocation]
  verification: KhronosのglTF 2.0仕様とMicrosoftのD3D12 API資料に照合（2026-11-06）
---

# 頂点バッファとインデックスバッファから三角形を組み立てる

**頂点バッファ**には位置や法線などの属性が並び、**インデックスバッファ**には、それらを参照する頂点番号が並びます。三角形リストでは番号を3個ずつ使うので、`[2, 0, 1]`は頂点2、0、1の順で一つの三角形を作ります。隣り合う三角形が位置・法線・UVなどを共有できる場合は、同じ頂点番号を何度でも使えます。[Khronosのメッシュプリミティブの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes) · [Microsoftのインデックス付き描画](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-drawindexedinstanced)

<figure class="study-figure">
  <img src="/images/graphics/vertex-and-index-input.svg" alt="16ビットのインデックスが2、0、1の順に並ぶ。先頭の値2が選ぶ頂点は、24バイト間隔で並ぶ頂点バッファの48バイト目から始まる。位置は頂点先頭の48バイト目、法線はそこから12バイト後の60バイト目にある。" width="760" height="410" loading="lazy">
  <figcaption>インデックスの読み取り位置と、インデックスの値で選ぶ頂点の位置を区別します。<a href="/study/images/graphics/vertex-and-index-input.svg" target="_blank" rel="noopener noreferrer">頂点入力の図を拡大</a></figcaption>
</figure>

## 頂点番号から属性の位置を求める

例えば、位置と法線をそれぞれ3個の32ビット浮動小数点数で持つ場合、各属性は12バイトです。頂点ごとに位置と法線をまとめて並べると、次の頂点までの間隔である**ストライド**は24バイトになります。属性の**オフセット**は、一つの頂点の先頭から測ります。D3D12では頂点バッファビューが先頭アドレス、バイト数、ストライドを持ち、パイプラインの入力レイアウトが各属性の形式、オフセット、参照する入力スロットを指定します。[Microsoftの頂点バッファビュー](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_vertex_buffer_view) · [Microsoftの入力要素の記述](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_input_element_desc)

| 属性 | 形式 | 頂点内のオフセット | 頂点2を読む場合のバッファ内位置 |
| --- | --- | --- | --- |
| `POSITION` | `DXGI_FORMAT_R32G32B32_FLOAT` | 0バイト | `2 × 24 + 0 = 48`バイト |
| `NORMAL` | `DXGI_FORMAT_R32G32B32_FLOAT` | 12バイト | `2 × 24 + 12 = 60`バイト |

この例では二つの属性を同じ入力スロットに設定し、HLSLの入力ではそれぞれ`float3 position : POSITION`、`float3 normal : NORMAL`として受け取れます。入力レイアウトのセマンティック名と番号を頂点シェーダーの入力に合わせます。頂点シェーダーは取得した位置から、ラスタライザーへ渡す`SV_Position`を計算します。[MicrosoftのHLSLセマンティック](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics) · [頂点シェーダーの役割](/graphics/pipeline/vertex-shader.html)

## インデックス列の開始位置と、頂点番号の加算値

`IASetIndexBuffer`には、インデックスバッファの先頭アドレス、バイト数、形式を持つビューを渡します。D3D12では16ビットの`DXGI_FORMAT_R16_UINT`、または32ビットの`DXGI_FORMAT_R32_UINT`を使います。glTFの`indices`が8ビット符号なし整数の場合は、例えば読み込み時に16ビットへ広げてバッファに詰めます。[Microsoftのインデックスバッファビュー](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_index_buffer_view) · [Microsoftの形式サポート表](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/hardware-support-for-direct3d-12-0-formats) · [Khronosのインデックスの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes)

`DrawIndexedInstanced(3, 1, 0, 0, 0)`では、1インスタンスを描き、ビューの先頭から3個のインデックスを読みます。複数のメッシュを一つのバッファにまとめる場合は、`StartIndexLocation`と`BaseVertexLocation`を使い分けます。[Microsoftの`DrawIndexedInstanced`](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-drawindexedinstanced)

| 引数 | 何をずらすか | 例 |
| --- | --- | --- |
| `StartIndexLocation` | インデックスビュー内で、読み始める要素番号 | `6`なら7個目から読む。16ビット形式ならビュー先頭から12バイト目。 |
| `BaseVertexLocation` | 読み取った各インデックスに足す符号付きの値 | `100`なら`[2, 0, 1]`を`[102, 100, 101]`として頂点を読む。 |

ローダーでは、開始位置と個数がインデックスビューに収まることを先に確かめます。次に、読み取った値に`BaseVertexLocation`を加えた結果が各頂点ストリームの範囲に収まるかを、符号と桁あふれに気をつけて確認します。glTFファイルの読み込み時にも、そのプリミティブの全属性で要素数が一致し、各インデックスが要素数より小さいことを確かめます。[Khronosのメッシュプリミティブの制約](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes) · [glTFのバッファとアクセサー](/graphics/mesh/gltf-mesh-buffers.html) · [バイナリの範囲検査](/data/binary-file-validation.html)

## 同じ位置でも頂点が分かれる場合

一つのインデックスは、その頂点の位置、法線、UVなどを一緒に選びます。例えば立方体の角を二つの面が共有していても、面ごとに異なる法線を持つ場合は、位置が同じで法線が違う頂点を用意します。UVの継ぎ目も、同じ位置に異なるUVを持たせるために頂点を分ける例です。頂点をまとめる処理では、描画に使う属性の組み合わせを見て判断します。[BlenderのglTF書き出し仕様](https://docs.blender.org/manual/en/5.3/addons/scene_gltf2.html#meshes) · [Khronosの頂点属性の仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes)

## glTFのバイト列を描画に渡す

1. `bufferView`とアクセサーから属性の配置を求めます。位置と法線が24バイト間隔で交互に入っていれば、先頭とストライドをビューに、属性ごとの形式とオフセットを入力レイアウトに指定できます。入力形式が描画側の配置と異なる場合は、要素を変換して詰め直します。[glTFのバッファとアクセサー](/graphics/mesh/gltf-mesh-buffers.html)
2. 頂点とインデックスのデータをGPUが読めるバッファに置きます。例えば`UPLOAD`ヒープから`DEFAULT`ヒープへコピーする場合は、コピー後に頂点バッファを`VERTEX_AND_CONSTANT_BUFFER`、インデックスバッファを`INDEX_BUFFER`の用途で読めるようにします。[Microsoftのリソース転送](https://learn.microsoft.com/en-us/windows/win32/direct3d12/uploading-resources) · [Microsoftのリソース状態](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_resource_states)
3. ビューを`IASetVertexBuffers`と`IASetIndexBuffer`で設定し、三角形リストを選びます。コピー元の領域を再利用できるのはコピーが完了した後です。描画が参照する頂点・インデックスの領域は、描画の完了まで保持します。それぞれのキューでフェンスを使って完了を追います。[Microsoftのフェンスによるメモリ再利用](https://learn.microsoft.com/en-us/windows/win32/direct3d12/fence-based-resource-management) · [GPUリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)

実践では、小さなGLBから頂点とインデックスを取得し、D3D12のWARPで三角形を描画します。描画先を読み戻して、インデックス付き描画の結果を確かめられます。[C++でGLBから三角形を描く](/practice/graphics/glb-mesh-observation.html)
