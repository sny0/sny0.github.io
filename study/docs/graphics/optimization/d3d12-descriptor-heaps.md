---
title: D3D12のディスクリプタヒープとテーブルを使う
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: リソースをビューとして参照し、ディスクリプタテーブルをシェーダへ渡す。CPUとGPUのハンドル、スロットの再利用、Root Signature 1.1の更新条件を扱う。
  aliases: [D3D12, descriptor heap, descriptor table, CPU descriptor handle, GPU descriptor handle, SetDescriptorHeaps, Root Signature 1.1]
  verification: MicrosoftのD3D12 APIリファレンスとルートシグネチャの仕様に照合
---

# D3D12のディスクリプタヒープとテーブルを使う

例えば、ミップマップ付きのテクスチャをシェーダから読むとします。テクスチャの**リソース**が画像データを保持し、**ビュー**が読み取るミップ範囲や形式を決めます。ビューの設定を書き込んだ**ディスクリプタ**は、**ヒープ**のスロットに並びます。一つのテクスチャに全ミップを読むSRVと、特定のミップだけを読むSRVを作れば、画像データを共有しながら用途に応じて参照範囲を変えられます。[Microsoftのディスクリプタの概要](https://learn.microsoft.com/en-us/windows/win32/direct3d12/descriptors-overview) · [テクスチャのmipとサブリソース](/graphics/texture/dds-and-subresources.html)

## ヒープの種類で、渡す相手が決まる

| ヒープの種類 | 格納するもの | コマンドでの使い方 |
| --- | --- | --- |
| `CBV_SRV_UAV` | 定数バッファ、読み取り用リソース、読み書き用リソースのビュー | シェーダ可視にして、ディスクリプタテーブルから参照する |
| `SAMPLER` | フィルタやアドレスモードなど、サンプリングの設定 | シェーダ可視にして、サンプラ用テーブルから参照する |
| `RTV` | 描画先のビュー | `OMSetRenderTargets` などへCPUハンドルを渡す |
| `DSV` | 深度・ステンシルのビュー | `OMSetRenderTargets` などへCPUハンドルを渡す |

`D3D12_DESCRIPTOR_HEAP_FLAG_SHADER_VISIBLE` を付けられるのは `CBV_SRV_UAV` と `SAMPLER` です。`SetDescriptorHeaps` で同時にセットできるのは各種類一つ、合計二つまでです。シェーダ可視の `SAMPLER` ヒープは最大2,048スロットです。`CBV_SRV_UAV` ヒープの容量やシェーダステージごとの参照数は、デバイスの `ResourceBindingTier` に応じて確認します。例えばTier 1ではヒープ全体に100万個を置けても、一つのシェーダステージで全テーブルを合わせて使えるSRVは128個までです。[MicrosoftのSetDescriptorHeaps](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-setdescriptorheaps) · [リソースバインディングの上限](https://learn.microsoft.com/en-us/windows/win32/direct3d12/hardware-support) · [デバイスの対応状況を調べる構造体](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_feature_data_d3d12_options)

## 同じスロットをCPUとGPUのハンドルで指す

**CPUハンドル**は `CreateShaderResourceView` などでスロットへ書き込むときに使います。**GPUハンドル**は、シェーダ可視ヒープの中でテーブルが始まるスロットを指定するときに使います。どちらも、ヒープ先頭のハンドルに `スロット番号 × GetDescriptorHandleIncrementSize(ヒープの種類)` を加えて求められます。この増分はデバイスに問い合わせ、ハンドルはAPIに渡して使います。アプリがハンドルの参照先を直接読み書きすることはできません。[Microsoftのハンドルの仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d12/creating-descriptor-heaps#descriptor-handles) · [ハンドルの増分を取得するAPI](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12device-getdescriptorhandleincrementsize)

ビューはシェーダ可視ヒープに直接作成できます。CPU側でビューをまとめて管理する構成では、シェーダ非可視の保管用ヒープに作り、描画に使うものを `CopyDescriptorsSimple` などでシェーダ可視ヒープへ移します。コピーするのはビューの情報です。ビューが参照するリソースのデータは、リソース転送用のコマンドで扱います。[Microsoftのディスクリプタの初期化](https://learn.microsoft.com/en-us/windows/win32/direct3d12/setting-descriptor-heaps#populating-descriptor-heaps) · [CopyDescriptorsSimpleのコピー元とコピー先](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12device-copydescriptorssimple) · [D3D12のテクスチャ転送](/graphics/texture/d3d12-texture-upload.html)

## テーブルの配置を決め、先頭をコマンドに渡す

**ディスクリプタテーブル**は、ヒープの一部を参照する仕組みです。ルートシグネチャで、テーブルを置くルートパラメータ番号と、テーブル内の種類・シェーダレジスタ・個数・オフセットを指定します。例えばルートパラメータ0に、テーブル内の位置0を `b0` のCBV、位置1と2を `t0` と `t1` のSRVに対応させます。同じレイアウトを使うフレームごとに、テーブルの先頭を変えられます。[Microsoftのディスクリプタテーブル](https://learn.microsoft.com/en-us/windows/win32/direct3d12/descriptor-tables)

記録時にルートシグネチャと `SetDescriptorHeaps` で使用するヒープをセットします。続いて `SetGraphicsRootDescriptorTable(0, baseGpuHandle)` で、ルートパラメータ0にテーブルのGPUハンドルを渡します。コンピュート用には `SetComputeRootDescriptorTable` を使います。別のヒープへ切り替えるとテーブル設定が無効になるため、使うテーブルを設定し直します。[Microsoftのヒープ設定](https://learn.microsoft.com/en-us/windows/win32/direct3d12/setting-descriptor-heaps#setting-descriptor-heaps) · [SetGraphicsRootDescriptorTableの引数](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-setgraphicsrootdescriptortable)

<figure class="study-figure">
  <img src="/images/graphics/d3d12-descriptor-heaps.svg" alt="一つのシェーダ可視ヒープを二つのフレーム範囲に分ける。どちらも先頭からCBV b0、SRV t0、SRV t1の順に置く。フレームBではスロット3のGPUハンドルをテーブル先頭として渡す。フレームAは対応するフェンス値に達した後にスロット0から2を再利用する。" width="760" height="430" loading="lazy">
  <figcaption>テーブルの配置をそろえ、フレームごとにヒープ内の別の範囲を指す。<a href="/study/images/graphics/d3d12-descriptor-heaps.svg" target="_blank" rel="noopener noreferrer">ディスクリプタの図を拡大</a></figcaption>
</figure>

## フレームごとにスロットを確保して再利用する

描画ごとに参照先を変える場合は、書き換え可能な範囲をフレームごとに分けます。図ではフレームAにスロット0〜2、Bに3〜5を割り当てています。CPUはAを参照する描画を提出した後も、Bの範囲に次のビューを用意できます。Aの範囲へ戻るときは、Aを最後に参照する処理の後でキューが通知したフェンス値を確認します。複数のキューから参照される場合は、それぞれの最後の参照を追います。複数のワーカーがディスクリプタを用意する場合も、各ワーカーが書き込む範囲を先に分けておけます。[Microsoftのテーブル更新の規則](https://learn.microsoft.com/en-us/windows/win32/direct3d12/advanced-use-of-descriptor-tables#changing-descriptor-table-entries-between-rendering-calls) · [GPUリソースと一時領域の寿命](/graphics/optimization/gpu-resource-lifetime.html) · [D3D12の並列コマンド記録](/graphics/optimization/parallel-command-recording.html)

RTVとDSVの内容は、`OMSetRenderTargets` などを呼んだときにコマンドリストへ記録されます。この呼び出しが使ったCPU側のスロットは、呼び出しから戻れば再利用できます。ビューが参照した描画先のリソース自体は、GPUが使い終えるまで保持します。[Microsoftの非シェーダ可視ヒープの仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d12/non-shader-visible-descriptor-heaps#non-visible-views)

## Root Signature 1.1では二つの更新条件を指定する

Root Signature 1.1では、**スロットに入れたディスクリプタ**と、**ディスクリプタが参照するデータ**について、いつ変更できるかを別々に指定します。[MicrosoftのRoot Signature 1.1仕様](https://learn.microsoft.com/en-us/windows/win32/direct3d12/root-signature-version-1-1#static-and-volatile-flags)

| 変更の対象 | 指定 | 守る期間 |
| --- | --- | --- |
| ディスクリプタ | 静的（`DESCRIPTORS_VOLATILE` なし。1.1の既定） | 記録時にテーブルをセットするまでに用意し、そのリストの最後の実行が完了するまで保つ |
| ディスクリプタ | `DESCRIPTORS_VOLATILE` | 記録後から提出前の差し替えも可能。提出から実行完了までは保つ |
| 参照先のデータ | `DATA_STATIC` | 記録時にバインドするまでに初期化し、最後の実行が完了するまで保つ |
| 参照先のデータ | `DATA_STATIC_WHILE_SET_AT_EXECUTE` | GPUがそのバインドを実行した時点から、それを使う描画・ディスパッチが終わるまで保つ。更新後の参照には再バインドする |
| 参照先のデータ | `DATA_VOLATILE` | CPUからの変更は提出前か実行完了後に行う。GPUの読み書きはバリアなどで同期する |

データのフラグを省略した場合、CBV・SRVは `DATA_STATIC_WHILE_SET_AT_EXECUTE`、UAVは `DATA_VOLATILE` として扱われます。サンプラ範囲にはデータ用フラグを付けられず、`DESCRIPTORS_VOLATILE` と `DATA_STATIC` は併用できません。例えばフレームごとの定数バッファでは、テーブルのスロットと定数を書いた領域をそれぞれ確保し、記録前に準備して、最後のGPU参照後に両方を再利用する設計にできます。[Microsoftの既定値とフラグの組み合わせ](https://learn.microsoft.com/en-us/windows/win32/direct3d12/root-signature-version-1-1#combining-flags) · [Microsoftのフェンスによる領域管理](https://learn.microsoft.com/en-us/windows/win32/direct3d12/fence-based-resource-management)
