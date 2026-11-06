---
title: レンダーパスのアタッチメントを読み込み、保持し、引き渡す
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: シーン色、深度、表示用の画像を例に、パスの入口で必要な値と出口で残す値を決める。D3D12のBeginRenderPass、状態遷移、一時リソースの再利用をつなげる。
  aliases: [render pass, アタッチメント, attachment, BeginRenderPass, EndRenderPass, load, store, clear, preserve, discard, resolve, transient resource]
  verification: MicrosoftのD3D12レンダーパス・リソース状態・配置リソースの仕様に照合（2026-11-07）
---

# レンダーパスのアタッチメントを読み込み、保持し、引き渡す

ゲーム画面を作るとき、最初のパスでシーン色と深度を書き、次のパスでシーン色を読んで表示用の画像を作ることがあります。パスが描画先として結び付ける色や深度・ステンシルのビューを、ここでは**アタッチメント**と呼びます。描画先ごとに、パスの入口でどんな内容が必要かと、出口の内容を誰が使うかを決めます。[MicrosoftのD3D12レンダーパス解説](https://learn.microsoft.com/en-us/windows/win32/direct3d12/direct3d-12-render-passes) · [中間画像を次の描画で読む](/graphics/postprocess/render-to-texture.html)

## シーン色と深度の寿命は違う

同じDIRECTキューを使う、MSAAなしの例です。Aはシーンを描き、Bは画面全体に後処理をかけ、Cはスワップチェーンに表示を渡します。この例では後処理に深度を使いません。[ポストプロセスの流れ](/graphics/postprocess/overview.html) · [スワップチェーンとPresent](/graphics/optimization/swap-chain-and-vsync.html)

| 処理 | 入力 | 出力と出口での扱い |
| --- | --- | --- |
| A シーン描画 | 描画するモデルなど | `SceneColor` と深度をクリアして描く。`SceneColor` はBが読むので保持し、深度はここで破棄できる。 |
| B 後処理 | `SceneColor` をSRVで読む | `BackBuffer` をRTVとして使い、全画素を書き換える。書いた画像はCが使うので保持する。 |
| C 表示 | `BackBuffer` の画像 | 表示に渡す。次に同じバッファを使える時点は、スワップチェーンの進行に従う。 |

<figure class="study-figure">
  <img src="/images/graphics/render-pass-attachments.svg" alt="Aでシーン色と深度を書き、Bはシーン色を読んで表示用画像を書き、Cで表示に渡す。深度はAの終了で使い終わり、シーン色はBの最後の読み取りまで、表示用画像はCへの引き渡しまで内容が必要。" width="760" height="425" loading="lazy">
  <figcaption>内容が必要な区間を、描画するパスと、その後に読む処理から決めます。<a href="/study/images/graphics/render-pass-attachments.svg" target="_blank" rel="noopener noreferrer">アタッチメントの寿命図を拡大</a></figcaption>
</figure>

## パスの入口で、前の内容に依存するかを宣言する

D3D12の `BeginRenderPass` ではRTVとDSVを指定し、それぞれの入口と出口で内容をどう扱うかを渡します。DSVは深度とステンシルの指定を分けられます。Aでクリアする深度の値は深度比較に合わせます。例えば手前の値ほど小さい設定なら、奥側の `1.0` で初期化します。[Microsoftのレンダーパス用RTV記述](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_render_pass_render_target_desc) · [DSVの深度・ステンシルの指定](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_render_pass_depth_stencil_desc)

| `BeginningAccess` | 選ぶ条件 |
| --- | --- |
| `CLEAR` | 指定した色や深度から始める。例えばAが背景色で初期化してからモデルを描く。 |
| `PRESERVE` | 以前の値を引き継ぐ。例えば既に描いた画像にUIを重ね、UIに覆われない画素も残す。 |
| `DISCARD` | 以前の値を使わず、必要な範囲を描き直す。例えばBが画面全体へ書き込み、ブレンドで以前の色も読まない場合。 |
| `NO_ACCESS` | パスで読み書きしない面に指定する。例えばDSVのステンシル面を使わない場合。対応する出口も `NO_ACCESS` にする。 |

`DISCARD` を指定した領域の以前の値は未定義です。描画が覆う範囲は、ビューポートやシザー、ピクセルの破棄、深度テストでも変わります。書き込みが届かない場所を後で読むなら、クリア値で初期化するか、必要な以前の内容を保持します。[Microsoftの入口の指定](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_render_pass_beginning_access_type)

## パスの出口で、後続の処理に必要な内容を決める

| `EndingAccess` | 選ぶ条件 |
| --- | --- |
| `PRESERVE` | 後で同じ内容を使う。Aの `SceneColor` をBが読む場合や、Bの出力を表示に渡す場合。 |
| `DISCARD` | このパスが終わると内容への依存がなくなる。例えばAで深度テストにだけ使い、次の使用時にクリアする深度。 |
| `RESOLVE` | 例えばMSAAで各画素に持つ複数サンプルを、別の画像の1画素へまとめる。単一サンプルの結果を後処理に渡せる。 |
| `NO_ACCESS` | 対応する入口と組にして、パス全体で使わない面に指定する。 |

`RESOLVE` では解決先をパス終了時に `RESOLVE_DEST` 状態にしておきます。パス内の解決による暗黙の状態遷移はありません。後処理が読む解決先は、その用途に合う状態へ明示的に切り替えます。解決元を後でも使うなら `PreserveResolveSource` で保持を指定します。[Microsoftの出口の指定](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_render_pass_ending_access_type) · [解決先と保持の指定](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_render_pass_ending_access_resolve_parameters)

## 内容を残す指定と、次のアクセスを可能にするバリア

Aの `SceneColor` を `PRESERVE` で残したうえでAを終え、`RENDER_TARGET` から `PIXEL_SHADER_RESOURCE` に遷移させます。Bの描画前には `BackBuffer` を `PRESENT` から `RENDER_TARGET` にし、Bの後で `PRESENT` に戻します。入口・出口の指定はデータへの依存を表し、遷移バリアは次にどうアクセスするかを表します。[Microsoftのパス内バリアの規則](https://learn.microsoft.com/en-us/windows/win32/direct3d12/direct3d-12-render-passes#render-passes-and-resource-barriers) · [D3D12の状態遷移](/graphics/optimization/d3d12-resource-barriers.html)

パス内で書いたアタッチメントをピクセルシェーダーから読む場合は、書き込み側のパスを終えてから読む側のパスを始めます。パス内のブレンドや深度テストは、仕様が認める暗黙の読み取りです。実践では `OMSetRenderTargets` と `ClearRenderTargetView` で描画先と初期化を設定し、二つの描画の間に明示的なバリアを記録します。二つの画像を用意すると、一方を読みながら別の画像へ結果を書けます。[Microsoftのレンダーパスでのアクセス規則](https://learn.microsoft.com/en-us/windows/win32/direct3d12/direct3d-12-render-passes#render-passes-and-workloads) · [二つの画像を交互に使う](/graphics/postprocess/ping-pong-and-history.html) · [C++で二つの描画をつなぐ](/practice/graphics/render-to-texture-observation.html)

## 最後の使用を境に一時メモリを回す

`SceneColor` の内容が必要なのは、Aが書いてからBが最後に読むまでです。Bは `SceneColor` を読みながら出力にも書くため、出力先を一時画像にする設計でも、この二つの使用区間は重なります。Bの後に初めて使う別の一時画像なら、`SceneColor` の領域を再利用する候補になります。レンダーグラフでは、リソースの読み書き宣言からこうした区間を求めます。[レンダーグラフとメモリエイリアシング](/graphics/optimization/render-graph.html)

D3D12の配置リソースで領域を共用する場合は、先行するGPUアクセスと次のアクセスの依存関係を用意し、パスの外にエイリアシングバリアを記録して使うリソースを切り替えます。次がレンダーターゲットや深度・ステンシルなら、切り替えたあとに必要な初期化も行います。別キューの場合は、フェンスの `Signal` と `Wait` で先のキューの最後の使用に後続をつなぎます。CPUが領域を回収する場合も、GPUが最後に使い終えたことをフェンスで確認します。[Microsoftの配置リソースの再利用](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12device-createplacedresource#simple-model) · [D3D12のキュー間同期](/graphics/optimization/gpu-queue-synchronization.html) · [GPUリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)

## 保持した画素がどれくらいあるかを見積もる

1920×1080の `RGBA8` 画像は、1画素4バイトとして約7.9 MiBです。中間画像全体を一度書き、もう一度読むと、単純な画素データの合計は1フレーム約15.8 MiBになります。実機のメモリ転送量にはキャッシュ、圧縮、タイル処理、サンプル数などが影響します。タイルを使うGPUでは、後で使わない値の保持を省く宣言が外部メモリへの転送を減らせる場合があります。同じ場面でGPUの処理時間を比較し、メモリ帯域は使えるハードウェアカウンターで別に確認します。[Microsoftのタイルメモリとレンダーパス](https://learn.microsoft.com/en-us/windows/win32/direct3d12/direct3d-12-render-passes#scenarios) · [GPUタイムスタンプによる計測](/graphics/optimization/gpu-timestamp-queries.html) · [NVIDIAのGPU Trace計測ガイド](https://developer.nvidia.com/docs/drive/drive-os/7.0.3/public/nsight/nsight-graphics/AdvancedLearning/index.html)
