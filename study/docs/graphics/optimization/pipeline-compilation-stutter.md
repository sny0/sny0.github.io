---
title: シェーダーコンパイルのカクつきとパイプラインキャッシュ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 描画時にパイプラインを初めて作ると処理が止まる理由と、事前作成やキャッシュで減らせる作業を調べる。
  aliases: [shader compilation stutter, シェーダーコンパイルスタッター, PSO, Pipeline State Object, パイプラインキャッシュ, PSOキャッシュ, 事前作成, プリウォーム, VkPipelineCache, ID3D12PipelineLibrary]
  verification: Vulkanのパイプライン作成・キャッシュ仕様と、Direct3D 12のPSO・Pipeline Library・PIX Timing Captureの公式資料に照合（2026-11-06）
---

# シェーダーコンパイルのカクつきとパイプラインキャッシュ

初めて炎のエフェクトが出た瞬間だけゲームが止まり、次から滑らかに表示されることがあります。原因候補の一つは、描画に必要なパイプラインをその場で作り、レンダースレッドが作成の完了を待つことです。APIを呼び出してから戻るまでには、GPU向けのコード生成や状態の検証、ドライバ内部の待ちなどが入り得ます。原因を調べるには、まずパイプライン作成が起きた時刻を記録します。[Khronosのパイプライン作成コストの解説](https://docs.vulkan.org/refpages/latest/refpages/source/VK_EXT_pipeline_creation_cache_control.html)

## シェーダーをビルドしたあとに残る処理

ゲームのビルドでシェーダーを [SPIR-VやDXILの中間表現](/graphics/shader/spirv.html) に変換しておけば、シェーダーのソースから中間表現を作る仕事を実行時から外せます。実行先のGPUで描画を行うには、どのシェーダーを組み合わせ、どの形式の画像に、どんな深度・ブレンド設定で書くかをAPIに渡して、パイプラインを作ります。ドライバは、この組み合わせに合わせたGPU向けの処理を、必要に応じて行います。[Vulkanのグラフィックスパイプライン作成](https://docs.vulkan.org/refpages/latest/refpages/source/vkCreateGraphicsPipelines.html) · [Direct3D 12のパイプライン状態](https://learn.microsoft.com/en-us/windows/win32/direct3d12/managing-graphics-pipeline-state-in-direct3d-12)

Direct3D 12でこの組み合わせをまとめたものが **PSO（Pipeline State Object）** です。例えば同じ頂点・ピクセルシェーダーでも、描画先の形式やサンプル数が違えば、別のPSOが必要です。一方、ビューポートのように描画コマンドで指定できる状態は、PSOの作成に必要な状態と分けます。Vulkanでも、パイプライン作成時に固定する状態と、コマンドで指定する動的状態があります。[Direct3D 12のPSOに入る状態と別に設定する状態](https://learn.microsoft.com/en-us/windows/win32/direct3d12/managing-graphics-pipeline-state-in-direct3d-12#graphics-pipeline-states-set-with-pipeline-state-objects) · [Vulkanの動的状態](https://docs.vulkan.org/guide/latest/dynamic_state.html)

## 初めて使うフレームで何を待つか

次の図では、同じ描画に向かうレンダースレッドの時間だけを比べます。どちらもフレーム開始から描画の準備に4 msかかり、作成済みのパイプラインの取得と描画の投入に1 msかかるとします。初回使用時にパイプラインを作ると、その間に24 msのAPI呼び出しが挟まります。

<figure class="study-figure">
  <img src="/images/graphics/pipeline-compilation-stutter.svg" alt="初回使用時に作ると、CPUの描画準備4 ms、パイプライン作成24 ms、取得と投入1 msで29 msかかる。ロード中に作成済みなら、同じフレームでは準備と取得・投入だけの5 msで済む。破線は60 FPSのフレーム間隔約16.67 ms。" width="760" height="325" loading="lazy">
  <figcaption>説明用の時間です。60 FPSの目安と、CPUが描画を投入するまでの時間を比べています。<a href="/study/images/graphics/pipeline-compilation-stutter.svg" target="_blank" rel="noopener noreferrer">初回作成と事前作成の図を拡大</a></figcaption>
</figure>

| 作成のタイミング | フレーム開始から描画を投入するまで | 作成にかかった24 ms |
| --- | ---: | --- |
| 初回の描画時 | 29 ms | 描画を投入する前に待つ |
| ロード中に作成済み | 5 ms | ロード中に支払う |

既にGPUに描画が積まれている場合、作成待ちの間もGPUは仕事を続けられます。描画が間に合わなくなると、GPUのキューが空く区間や表示間隔の長い区間が見えることがあります。前後関係を確認するため、CPU上の作成呼び出し、GPU上の描画、画面の切り替わりをそれぞれ計測します。[PIX Timing CaptureのGPUタイミング](https://learn.microsoft.com/en-us/windows/win32/direct3dtools/pix/articles/timing-captures/pix-timing-captures#gpu-timings) · [フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)

## キャッシュのどの層で再利用するか

| 層 | 保存するもの | 次に使うとき |
| --- | --- | --- |
| アプリ内のオブジェクト表 | 作成済みの `VkPipeline` や `ID3D12PipelineState` | 同じデバイスで、表から取り出して使う |
| 作成時に使うキャッシュ | `VkPipelineCache` にドライバが記録するデータや、`ID3D12PipelineLibrary` に登録したPSO | 同じ構成のパイプラインを作成・取得するときに利用する |
| 永続化したバイト列 | キャッシュやライブラリを保存用に取り出したデータ | 次回起動時に対応するAPIに渡し、作成・取得の処理で使う |

アプリの表のキーには、シェーダーの中身とエントリーポイント、固定する描画状態、出力形式、レイアウトやルートシグネチャなど、作るパイプラインを区別する情報を入れます。Vulkanの特殊化定数を使う場合はその値も含めます。キーの比較には状態の内容を使います。例えば一時メモリ上のシェーダーのポインタを使うと、同じ内容を別の場所に読み込んだときに一致しません。[Vulkanのシェーダーステージと特殊化情報](https://docs.vulkan.org/refpages/latest/refpages/source/VkPipelineShaderStageCreateInfo.html) · [Direct3D 12のPSO記述](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_graphics_pipeline_state_desc)

Vulkanで `vkGetPipelineCacheData` が返すデータは、あとで `vkCreatePipelineCache` に渡せます。ヘッダーにはベンダーID、デバイスID、キャッシュのUUIDなどがあり、互換性がないデータを渡すとキャッシュは空で始まります。Direct3D 12では、対応環境で `ID3D12PipelineLibrary` を使い、`Serialize` したデータを次回の `CreatePipelineLibrary` に渡せます。ドライバやアダプターが合わず拒否された場合に備え、空のキャッシュから作れる経路を残します。保存したバイト列がある場合も、アプリが直接バインドできるオブジェクトを得るには作成・取得の処理が必要です。[Vulkanのキャッシュ初期データ](https://docs.vulkan.org/refpages/latest/refpages/source/VkPipelineCacheCreateInfo.html) · [Vulkanのキャッシュヘッダー](https://docs.vulkan.org/refpages/latest/refpages/source/VkPipelineCacheHeaderVersionOne.html) · [Direct3D 12のライブラリ作成と互換性](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12device1-createpipelinelibrary)

## 初回の停止を見つけ、再計測する

1. **作成した時刻と理由を記録する。** `CreateGraphicsPipelineState` や `vkCreateGraphicsPipelines` の前後にCPUマーカーを付け、経過時間、描画パス、キー、アプリのオブジェクト表で新規作成になったかを残します。Vulkanでパイプライン作成フィードバックを取るなら、有効ビットを確認します。キャッシュヒットのフラグが指すのは、作成APIに渡した `VkPipelineCache` で再利用できた場合です。[PIXのCPUマーカー](https://learn.microsoft.com/en-us/windows/win32/direct3dtools/pix/articles/timing-captures/layouts/pix-timing-captures-timeline-layout#core-lanes) · [Vulkanの作成フィードバックフラグ](https://docs.vulkan.org/refpages/latest/refpages/source/VkPipelineCreationFeedbackFlagBits.html)
2. **同じ場面で比較する。** 保存データを使わずに起動した場合、保存データを読み込んで起動した場合、同じ起動中の2回目を分けます。カクつきと同じ時刻に作成処理や作成を待つ区間があるかを確認し、I/OやGPU上のパスも時系列で比較します。アプリの保存データを外しても、実装が内部で保持するキャッシュが効く場合があります。試験の条件には、どの層のキャッシュを使ったかを記録します。[Vulkanの実装側キャッシュに関する注記](https://docs.vulkan.org/refpages/latest/refpages/source/vkCreateGraphicsPipelines.html) · [GPUタイムスタンプクエリ](/graphics/optimization/gpu-timestamp-queries.html)
3. **使用される組み合わせを先に作る。** 実際に使ったキーの一覧から、場面の開始直後に使うものを優先してロード中やバックグラウンドで作ります。並列ジョブの数を制限し、同じキーを同時に何度も作らず、描画前に完成したオブジェクトを受け取ります。再計測では、初回の停止に加え、ロード時間、作成待ちの回数、作成済みオブジェクトのメモリ使用量も比べます。[Khronosのパイプラインキャッシュ実践例](https://docs.vulkan.org/samples/latest/samples/performance/pipeline_cache/README.html)

Vulkanで `pipelineCreationCacheControl` を有効にしている場合、`VK_PIPELINE_CREATE_FAIL_ON_PIPELINE_COMPILE_REQUIRED_BIT` を指定すると、コンパイルが必要な作成は `VK_PIPELINE_COMPILE_REQUIRED` を返します。このとき有効なパイプラインは得られないため、その描画を後に回すか、互換性のある作成済みの代替を選び、別途作成を予約します。このフラグを使う場合も、作成の呼び出しにかかる時間は計測します。[Vulkanのパイプライン作成フラグ](https://docs.vulkan.org/spec/latest/chapters/pipelines.html#VkPipelineCreateFlagBits)

関連項目は[デバッグ・プロファイリングツール](/graphics/optimization/tools.html)、[アセットロード](/game/asset-loading.html)、[シェーダーバリアントの管理](/graphics/shader/shader-variants.html)です。
