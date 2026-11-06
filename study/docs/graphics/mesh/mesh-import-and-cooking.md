---
title: メッシュをインポートして描画用データに変える
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: glTFのprimitiveから描画に使う頂点・インデックス・マテリアル・境界を作る。座標変換、表裏、属性の継ぎ目、頂点の配置を扱う。
  aliases: [mesh import, mesh cooking, メッシュインポート, 頂点の重複除去, primitive, winding, UV seam, 逆転置行列, AABB, vertex layout]
  verification: KhronosのglTF 2.0仕様とMicrosoftのDirect3D資料に照合（2026-11-06）
---

# メッシュをインポートして描画用データに変える

glTFのメッシュには、形を作る頂点属性と、頂点をどう組み合わせるかを表すインデックスが入ります。一つのメッシュに複数の**primitive**があれば、それぞれがトポロジーとマテリアルを持てます。エンジンのクックでは、参照先を検査して属性を読み、エンジンが使う座標や頂点の配置に揃え、描画範囲とマテリアルの対応を書き出せます。ここでは、スキンやモーフを使わない静的な三角形メッシュを例にします。[Khronosのメッシュ仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes) · [アセットビルドと差分配信](/game/asset-build-and-patches.html)

<figure class="study-figure">
  <img src="/images/graphics/mesh-import-and-cooking.svg" alt="glTFのprimitiveから頂点属性、インデックス、マテリアルを読み、座標と表裏を揃え、属性を組み立て、頂点バッファ・インデックスバッファ・描画範囲を書き出す。UVの継ぎ目では同じ位置Pでも、Uが1の頂点AとUが0の頂点Bを分ける。" width="760" height="440" loading="lazy">
  <figcaption>描画に必要な情報を組み立てる流れです。UVの継ぎ目では、位置を共有する三角形が別の頂点番号を使います。<a href="/study/images/graphics/mesh-import-and-cooking.svg" target="_blank" rel="noopener noreferrer">メッシュのクック工程の図を拡大</a></figcaption>
</figure>

## primitiveの属性と描画範囲を読む

`POSITION`、`NORMAL`、`TEXCOORD_0`などの属性はaccessorを介して読みます。インデックス付きのprimitiveでは、一つのインデックスが、各属性の同じ番号の要素を指します。インポーターは使う属性の要素数、インデックスの範囲、トポロジーを検査します。三角形リストでは3個のインデックスが1面です。たとえば三角形ストリップをリストに変換する場合は、ストリップで交互になる頂点順を考慮して表の向きを保ちます。[Khronosのprimitiveとトポロジーの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-overview) · [glTFのバッファから属性を読む](/graphics/mesh/gltf-mesh-buffers.html)

同じメッシュの中でも、塗装した金属とガラスでは描画時に設定するマテリアルが異なります。頂点やインデックスの実体を一つのバッファにまとめる場合も、primitiveごとにインデックスの開始位置と個数、頂点の基準位置、マテリアルIDを記録しておけば、必要な範囲を描けます。描画側でどの属性を読むかも、マテリアルやシェーダーと揃えます。[Khronosのprimitiveのマテリアル指定](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-overview) · [頂点とインデックスを描画に渡す](/graphics/mesh/vertex-and-index-input.html)

## 座標変換で位置、法線、表裏を揃える

glTFは右手系で、上が`+Y`、アセットの前が`+Z`です。ノードのグローバル変換を適用した頂点位置はメートル単位です。取り込み先が1単位を1センチメートルとするなら、対応する位置や移動量を100倍にします。座標の向きも変えるときは、頂点だけを別の基準で扱うとノードの回転や移動との整合が崩れるため、同じ基底変換をノードの階層にも反映します。列ベクトルで座標を `p′ = C p` と変換する場合、同じ空間変換を表すノードの行列は `M′ = C M C⁻¹` です。メッシュを複数のノードで共有する場合は、メッシュの局所データと各ノードの変換を分けて持てます。[Khronosの座標系と単位](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units) · [glTFのメッシュのインスタンス化](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#instantiation) · [モデルから画面までの座標変換](/math/rendering/transform.html)

位置を列ベクトルとして `p′ = A p + t` で変換するとします。`A`は回転、拡大縮小、反転などをまとめた3×3行列、`t`は移動です。法線は `normalize((A⁻¹)ᵀ n)` で変換します。たとえばX方向だけ2倍にすると、接線方向のX成分は2倍になりますが、法線の変換ではX成分を半分にします。変換後も法線と面内の方向が直交します。軸を0倍にするなどで `A` が特異になれば逆行列を作れないため、この静的クックでは入力エラーとして扱う設計ができます。[Microsoftの法線変換の式](https://learn.microsoft.com/en-us/windows/win32/direct3d9/camera-space-transformations)

行列式が負の変換はメッシュの向きを反転させます。たとえば、静的な頂点に `z′ = −z` を焼き込んで元の面の表裏を保つなら、三角形リストの各面を `[i0, i1, i2]` から `[i0, i2, i1]` に変えます。反転をノードの変換として残す場合は、同じインデックスバッファを使いながら、反転したインスタンスに合う表面判定で描けます。D3D12の `FrontCounterClockwise` が判定するのは描画先での頂点順です。投影や画面への変換を含む通常の描画を基準にして、反転インスタンスで表裏が入れ替わる場合に設定を切り替えます。法線マップを使う場合は、接線と接線系の向きを表す `TANGENT.w` も変換に合わせます。[Khronosの負のスケールと頂点順](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#instantiation) · [Khronosの接線系の規則](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-overview) · [Microsoftの表面判定の仕様](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_rasterizer_desc)

## 同じ位置でも属性が異なれば頂点を分ける

円筒のテクスチャを一周させると、継ぎ目の同じ位置に `u = 1` と `u = 0` が必要になることがあります。両側の三角形を同じ頂点番号にすると、どちらか一方のUVしか参照できず、その面のUV補間が変わります。角をくっきり見せたい面でも、同じ位置に別の法線が必要です。頂点の重複を取り除くときは、位置、法線、UV、接線など、出力で保持する属性の組が等しい頂点をまとめます。頂点番号を振り直したら、対応するインデックスも更新します。[Khronosの頂点属性とインデックスの対応](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-overview) · [頂点シェーダーの入力](/graphics/pipeline/vertex-shader.html)

## 対象のGPUに合わせて格納方法を決める

| 設計の選択 | 判断する点 |
| --- | --- |
| 16ビットか32ビットか | 16ビットではインデックス列が半分のバイト数になります。最終的な描画範囲のローカル番号が収まるか、予約値があるかを確認します。分割で16ビットに収める場合は、境界で増える頂点や描画回数も比べます。 |
| 頂点ごとにまとめるか、属性ごとに分けるか | 位置・法線・UVを毎回読むパスには、同じ頂点の属性を並べるとバッファをまとめられます。位置だけを使う深度パスなどが多ければ、位置を独立したバッファにすると、そのパスが必要とするデータを絞れます。 |

たとえば三角形3万面なら、9万個のインデックスが必要です。頂点番号が収まれば、16ビットでは18万バイト、32ビットでは36万バイトです。インデックスの**個数**と、各インデックスが表す**頂点番号**は別の値です。glTFではインデックス型の最大値が予約されており、16ビットなら `65535` をインデックスにできません。D3D12に渡すときは実際の格納幅と `DXGI_FORMAT_R16_UINT` または `DXGI_FORMAT_R32_UINT` を揃えます。[Khronosのインデックス範囲](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-overview) · [Microsoftのインデックスバッファービュー](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_index_buffer_view) · [Microsoft DirectXMeshの格納形式の例](https://github.com/microsoft/DirectXMesh/wiki/Meshconvert)

頂点バッファを書き出すときは、各属性の型、先頭からの位置、次の頂点までの間隔を一緒に定義します。どの配置が速いかは描画パスやGPUによって変わります。同じモデルを同じ条件で描き、バッファのバイト数、描画回数、GPUの処理時間を比べると、ファイルが小さくなった効果と描画時の効果をそれぞれ判断できます。[Microsoftの入力要素の記述](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_input_element_desc) · [Microsoftの頂点バッファービュー](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_vertex_buffer_view)

## 描画に必要なメタデータと境界も保存する

バッファとともに、プリミティブごとの描画範囲、マテリアルID、メッシュを囲む境界を保存します。座標軸に沿う境界箱（AABB）なら、描画する位置のX・Y・Zそれぞれの最小値と最大値から作れます。glTFの `POSITION` accessorにも `min` と `max` があります。座標を焼き込んだり、位置の精度を落として格納したりした場合は、実際に描画側が読む座標を囲むように境界を求めます。境界は視錐台の外にある物体の描画を省く判断に使えます。[Khronosのaccessorの境界](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#accessors-bounds) · [Microsoftの境界箱の作成](https://learn.microsoft.com/en-us/windows/win32/api/directxcollision/ns-directxcollision-boundingbox)

実行時は、書き出した範囲を読み、頂点とインデックスをGPUへ転送します。各バッファの準備が完了し、マテリアルの参照先が揃うと、その描画範囲を使えます。取り込みの確認には、非一様スケールした物体、片軸を反転した物体、UVの継ぎ目を持つ物体を使うと、法線、表裏、頂点の分離を個別に見られます。[実行時のアセットロード](/game/asset-loading.html) · [頂点とインデックスを描画に渡す](/graphics/mesh/vertex-and-index-input.html)
