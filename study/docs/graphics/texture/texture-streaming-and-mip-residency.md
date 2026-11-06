---
title: テクスチャストリーミングとmipの常駐
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 画面上の見え方に応じて粗いmipから読み、GPUコピーが終わった範囲を描画に公開する。ファイル読み取り量、描画に公開する範囲、GPUメモリの常駐を区別する。
  aliases: [texture streaming, テクスチャストリーミング, mip streaming, mip residency, テクスチャ常駐, streaming pool, tiled resources, packed mips, virtual texturing]
  verification: MicrosoftのDirect3D 12仕様とEpic Gamesのテクスチャストリーミング資料に照合
---

# テクスチャストリーミングとmipの常駐

遠くに見える建物なら粗いテクスチャでも描けます。カメラが近づいて画面の広い範囲を覆うと、細部を表示するために高解像度のデータが必要になります。**テクスチャストリーミング**は、こうした見え方の変化に応じて、必要な解像度のデータを実行中に読み込み、描画へ渡す仕組みです。[Unreal Engineのテクスチャストリーミング概要](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-streaming-overview-for-unreal-engine)

## 粗いmipで描き始め、必要な細部を足す

mip 0は元の解像度で、番号が大きいほど粗くなります。1024 × 1024のテクスチャなら、mip 1は512 × 512、mip 2は256 × 256です。ストリーマーは、たとえば画面に投影した物体の大きさ、表面のUV密度、可視性から目標を決めます。目標のmipまで揃う前は、使える粗いmipで描画を続けます。描画時のシェーダーは、公開されている範囲の中からサンプリングに使うmipを選べます。[Unreal Engineの目標解像度と予算](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-streaming-overview-for-unreal-engine) · [ラスタライズとmip選択](/graphics/pipeline/rasterization.html)

<figure class="study-figure">
  <img src="/images/graphics/texture-streaming-and-mip-residency.svg" alt="遠い物体はmip 2から10を描画に使う。接近するとmip 1を転送するが、その間はmip 2から10で描き続ける。コピーと描画の同期が取れた時点で、新しいビューがmip 1から10を公開する。" width="760" height="426" loading="lazy">
  <figcaption>粗いmipで表示を続けながら、準備できたmipを次の描画へ渡す例です。<a href="/study/images/graphics/texture-streaming-and-mip-residency.svg" target="_blank" rel="noopener noreferrer">mipの切り替え図を拡大</a></figcaption>
</figure>

1024 × 1024から1 × 1までの2Dテクスチャを、BC7で格納する例です。BC7では4 × 4テクセルのブロックが16バイトなので、2 × 2や1 × 1のmipにも各16バイトが必要です。下表はブロックの合計で、ファイルヘッダー、追加圧縮、転送用の行パディング、GPU割り当ての整列は含めていません。[MicrosoftのBC7仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d11/bc7-format) · [DDSのmip配置](/graphics/texture/dds-and-subresources.html)

| 用意するmip | 最も細かいサイズ | BC7のデータ量 |
| --- | --- | --- |
| 2〜10 | 256 × 256 | 約85.36 KiB |
| 1〜10 | 512 × 512 | 約341.36 KiB |
| 0〜10 | 1024 × 1024 | 約1.33 MiB |

粗い範囲にmip 1を加えると256 KiB、さらにmip 0を加えると1 MiB増えます。全アセットを一律に最高解像度まで読む代わりに、画面に占める面積や見え方の改善が大きいものから、空き予算に合わせて細部を追加できます。[Unreal Engineのロード優先順位](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-streaming-overview-for-unreal-engine)

## コピーが済んだ範囲を描画へ渡す

1. ファイル内で必要なmipの範囲を読み、サイズと結果を検証します。追加圧縮があれば展開し、コピーに使う一時領域へ行を並べます。[アセットパックの目次](/game/asset-pack-files.html) · [DirectStorageによる読み取りと展開](/game/directstorage.html)
2. GPUのコピーを発行し、描画キューがコピー後のリソース状態で参照する順序を作ります。別キューの場合は、たとえばコピー側がフェンスを通知し、描画キューがその値を待ちます。一時領域はコピー完了を確認してから再利用します。[D3D12のキュー間同期](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization) · [テクスチャの転送手順](/graphics/texture/d3d12-texture-upload.html)
3. 新しい描画に渡すシェーダーリソースビュー（SRV）を切り替えます。たとえば `MostDetailedMip = 2` と `MipLevels = 9` のビューはmip 2〜10を公開します。mip 1を使える順序が整ったら `MostDetailedMip = 1` と `MipLevels = 10` に広げます。処理中のフレームが参照し得るディスクリプターは維持し、新しいビューは別の領域へ書きます。[D3D12_TEX2D_SRV](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_tex2d_srv) · [D3D12のディスクリプター更新規則](https://learn.microsoft.com/en-us/windows/win32/direct3d12/advanced-use-of-descriptor-tables)

ロードに失敗した場合や、移動で優先度が下がった場合は、すでに利用可能な粗いmipを使い続けられます。結果を採用しない場合も、発行済みのI/Oやコピーが参照するメモリは、各処理の完了を確認してから再利用します。[実行時のアセットロードと世代管理](/game/asset-loading.html)

## 読み込み量、ビュー、GPUメモリは別々に見る

全mipを含む通常のテクスチャを作った場合、最初に粗いmipだけを読み込むとI/Oを減らせます。そのリソースのビューを粗い範囲に絞っても、割り当ては全mip分です。メモリも減らす方式には、粗い範囲だけを持つ小さなテクスチャを用意し、必要な解像度に応じて作り直す方法があります。切り替え中は旧・新両方のメモリが必要になり、旧リソースはそれを使う描画が完了してから解放します。[D3D12のリソースとヒープ](https://learn.microsoft.com/en-us/windows/win32/direct3d12/residency) · [Unreal Engineの一時プール](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-streaming-metrics-in-unreal-engine)

D3D12で**常駐**とは、GPUが対象のメモリにアクセスできる状態です。`MakeResident`と`Evict`は物理メモリを持つ割り当てを扱います。テクスチャの場合、対象はコミット済みリソースや、配置リソースが使うヒープです。`Evict`でmip 0だけを指定して割り当てを縮めることはできません。常駐を解除する前には、その割り当てを参照するGPU処理の終了を確認します。[D3D12の常駐管理](https://learn.microsoft.com/en-us/windows/win32/direct3d12/residency) · [MakeResidentとEvictの同期条件](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12device-makeresident)

対応するデバイスでは、**予約リソース**の仮想範囲に、物理メモリをタイル単位で対応づけられます。必要なmipやテクスチャ内の一部分だけにタイルを割り当て、マップの解除で空いたタイルを再利用できます。OSのメモリ予算への影響は、タイルの格納先ヒープの確保と常駐も含めて調べます。細かいタイルで領域を入れ替える方式では、タイルごとの読み取り、フィルタリングに必要な周囲、準備中の範囲を粗いmipで代用する方法も設計します。粗い末尾のmipがまとめられている場合は、`GetResourceTiling`の結果に従ってその集合をマップします。[Microsoftの予約リソースのサンプル](https://learn.microsoft.com/en-us/samples/microsoft/directx-graphics-samples/d3d12-reserved-resources-sample-win32/) · [D3D12のpacked mip情報](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_packed_mip_info)

## 予算と画質の振れを管理する

GPU側ではテクスチャ用の枠と、レンダーターゲットなどの他の使用量を見ます。Windowsでは `QueryVideoMemoryInfo` で現在の使用量と予算を確認できます。CPU側では読み込み中のデータや展開バッファ、コピーに使う一時領域に上限を設けます。各フレームで発行する要求数や転送量も制限し、見えている対象やすぐに必要な対象を先に処理します。[DXGIのビデオメモリ予算](https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_4/nf-dxgi1_4-idxgiadapter3-queryvideomemoryinfo) · [Unreal Engineのストリーミング指標](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-streaming-metrics-in-unreal-engine)

境界でカメラが前後するたびに同じmipを読み直さないよう、細かくする条件と粗く戻す条件を離します。たとえば同じ面が384ピクセル以上を占めたらmip 1を要求し、256ピクセル以下の状態が1秒続いたら手放す候補にします。このように切り替え条件に幅を持たせる考え方が**ヒステリシス**です。画面に残る粗さとロードの往復を評価するときは、目標mip、描画が使えるmip、保留中のI/Oと転送量、GPUメモリの使用量を一緒に記録します。[Unreal Engineの可視性とメモリ変動の指標](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-streaming-metrics-in-unreal-engine)
