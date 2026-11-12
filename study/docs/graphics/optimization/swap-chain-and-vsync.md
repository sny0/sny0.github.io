---
title: スワップチェーンとVSync — 描画した絵が画面に出るまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: ティアリングが起きる走査と、VSyncオフ・オン・VRRの更新タイミングを図と実践で比べる。FIFO・MAILBOX・IMMEDIATEで画像を選ぶ規則も扱う。
  aliases: [スワップチェーン, スワップチェイン, swap chain, swapchain, VSync, 垂直同期, ティアリング, scanout, FIFO, MAILBOX, IMMEDIATE, VRR, 可変リフレッシュレート, LFC]
  verification: Vulkanの提示仕様、DXGIのPresentとVRR、Linux DRM/KMSのVRR、AMDのLFC資料に照合（2026-11-13）
---

# スワップチェーンとVSync — 描画した絵が画面に出るまで

GPUが次の絵を描いている間にも、画面は前の絵を読み出しています。**スワップチェーン**は、アプリが描いた絵を表示側に渡し、使用が終わった画像を次の描画に使い回す仕組みです。**VSync（垂直同期）**を使うと、表示する画像の切り替えを画面の更新境界に合わせられます。切り替えを待つ間に複数の絵が届いたとき、古い絵から順に出すか、最新の候補を出すかで、画面に現れる絵が変わります。[KhronosのVulkan表示モード仕様](https://docs.vulkan.org/refpages/latest/refpages/source/VkPresentModeKHR.html)

## 1枚の画像を取得してから、また使えるまで

ゲームが描く画像と、表示側が使う画像を切り替える流れをVulkanで追います。ここでの「画像」は使い回す描画先です。毎フレーム新しい画像を確保する代わりに、アプリは使える画像の番号を取得します。[Vulkanの画像取得API](https://docs.vulkan.org/refpages/latest/refpages/source/vkAcquireNextImageKHR.html)

<figure class="study-figure">
  <img src="/images/graphics/swap-chain-image-lifecycle.svg" alt="1枚の画像は取得、描画、Presentの待ち、表示候補、表示側が使用、再取得可能の順に進む。表示候補が差し替えられた場合は、表示を経ずに再利用へ進む。" width="760" height="365" loading="lazy">
  <figcaption>描画の完了、表示側への引き渡し、次に使える時点を分けて追います。<a href="/study/images/graphics/swap-chain-image-lifecycle.svg" target="_blank" rel="noopener noreferrer">画像の流れを拡大</a></figcaption>
</figure>

1. **取得する。** `vkAcquireNextImageKHR` がスワップチェーン画像の番号を返します。取得に対応するセマフォやフェンスで利用できる時点を確認し、最初の画像アクセスを順序付けます。
2. **描いて表示を依頼する。** GPUの描画コマンドは画像に書き込み、表示に必要なレイアウトへ遷移させます。`vkQueuePresentKHR` に、描画と遷移が済むまで待つセマフォを指定します。APIが戻った時点と、表示エンジンが画像を使う時点は別です。
3. **表示側が使い終えた画像を再取得する。** 表示方式によっては、候補だった画像がより新しい画像に差し替えられ、画面に出ずに再利用できる場合もあります。どちらの場合も、アプリは次の取得とその同期を経てから同じ画像に書き込みます。[VulkanのPresent API](https://docs.vulkan.org/refpages/latest/refpages/source/vkQueuePresentKHR.html) · [KhronosのPresent待ちセマフォ再利用ガイド](https://docs.vulkan.org/guide/latest/swapchain_semaphore_reuse.html)

「バッファを3枚にする」のような設定を読むときは、次の三つを分けます。

| 数えるもの | 何を表すか |
| --- | --- |
| スワップチェーンの画像数 | 描画先として使い回す画像の枚数。描画中、表示待ち、表示側で使用中などの画像を含む |
| フレームスロット数 | コマンドバッファやフレームごとの定数領域などを使い回す枠の数。通常はその枠のGPU処理の完了を確認してから再利用する |
| 表示待ちの件数 | 表示側へ渡した候補のうち、まだ選ばれていない件数。候補を積むか差し替えるかで変わる |

ダブルバッファリングやトリプルバッファリングという名前を見たら、画像の枚数と表示モードをそれぞれ確認します。画像が足りないときは取得に待ちが生じ得ます。画像を増やすと描画を進められる場合がありますが、順番待ちの候補まで増えると、入力を反映した絵が遅れて画面に出ることがあります。[Khronosのスワップチェーン画像数の解説](https://docs.vulkan.org/samples/latest/samples/performance/swapchain_images/README.html) · [Vulkanで画像とフレームスロットを分ける実装例](/graphics/capstone/02-device.html)

## 画面を上から下へ読み出す途中で切り替わると

上から下へ順に画像を読み出す画面を考えます。この読み出しを**スキャンアウト**と呼びます。固定60 Hzでは1回の更新が約16.67 msごとに始まります。読み出しの途中で参照する画像を切り替えると、上の行は古い絵、下の行は新しい絵になります。動く物の位置が境目でずれて見える現象が**ティアリング**です。VSyncは、次の読み出しまでの垂直ブランクに切り替えを合わせて、1回の走査で同じ絵を使う方法です。[Vulkanの表示モードと垂直ブランク](https://docs.vulkan.org/refpages/latest/refpages/source/VkPresentModeKHR.html)

## VSyncオフ・オン・VRRで走査の始まりを比べる

同じ場面を描き、絵Aは0 ms、絵Bは20 ms、絵Cは40 ms、絵Dは58 msで完成したとします。固定60 Hzの次の走査は約16.67 msで始まるため、絵Bはその開始に間に合いません。ここからの表示は、走査の開始と、走査中に画像を替えるかどうかで変わります。

| 方式 | いつ切り替わるか | この例での絵B |
| --- | --- | --- |
| VSyncオフ（即時切り替えのモデル） | 固定周期で走査し、描画が終わると参照画像を替える | 20 msの時点で走査中。上約20%にA、下約80%にBが出る |
| VSyncオン（固定60 Hz） | 固定周期の走査の境界で参照画像を替える | 約16.67 msでAを再表示し、約33.33 msからBを走査する |
| VRR（仮想40〜60 Hz） | 対応範囲内で次の走査の開始を動かし、走査する1枚を選ぶ | 20 msからBを走査し、次の画像まで走査と走査の間で待つ |

<figure class="study-figure">
  <img src="/images/graphics/vsync-vrr-timing.svg" alt="絵Bが20 msで完成する例。VSyncオフでは16.67 msに始まった走査の途中でAからBへ切り替わる。オンでは16.67 msにAを再表示し、33.33 msにBを開始。VRRでは20 msにBの走査を始め、各走査の間に待ちが入る。" width="760" height="400" loading="lazy">
  <figcaption>上段の破線は走査中の切り替えです。下段の空白は次の走査までの待ちです。<a href="/study/images/graphics/vsync-vrr-timing.svg" target="_blank" rel="noopener noreferrer">VSyncとVRRの図を拡大</a></figcaption>
</figure>

**VRR（可変リフレッシュレート）**は、対応範囲内で走査の開始間隔を変える仕組みです。例えばLinux DRM/KMSは、次の画像が届くか時間切れになるまで、垂直ブランクの一部を伸ばす仕組みを説明しています。このモデルのVRRは40〜60 Hzなので、更新の間隔に約16.67〜25 msを使えます。今回の画像は18〜22 ms間隔で届くので、描画完了に合わせて次の1枚を走査できます。固定周期に合わせるための追加の待ちは減りますが、描画自体が遅れれば、新しい絵が届く間隔も伸びます。[Linux DRM/KMSのVRR仕様](https://docs.kernel.org/6.14/gpu/drm-kms.html#variable-refresh-properties) · [VESAのAdaptive-Sync解説](https://www.vesa.org/wp-content/uploads/2014/07/VESA-Adaptive-Sync-Whitepaper-140620.pdf)

最低リフレッシュレートより遅い場合、**LFC（Low Framerate Compensation）**に対応する環境では、同じ画像を複数回更新して対応範囲に収めることがあります。例えば60〜144 Hz対応で描画が40 FPSなら、同じ画像を2回ずつ更新して80 Hzにできます。上限より速く絵が届く場合の待ちや置き換え、ティアリングの扱いは、機器や表示方式、同期の設定によって変わります。[AMDのFreeSyncとLFCの解説](https://www.amd.com/en/products/graphics/technologies/freesync.html) · [Khronosの提示モード仕様](https://docs.vulkan.org/refpages/latest/refpages/source/VkPresentModeKHR.html)

[VSyncオフ・オン・VRRを比べる実践](/practice/graphics/vsync-vrr-observation.html)では、同じ描画完了時刻を使って、動く物体の境目や、新しい位置が表示される時刻を見比べられます。ブラウザー内に仮想の走査結果を描くモデルです。

<a href="/study/samples/graphics/vsync-vrr-observation/index.html" target="_self">3方式の比較デモを開く</a>

## 同じ絵が届いても、表示モードで選ばれる絵が変わる

Vulkanでは、使える表示モードを出力先のサーフェスごとに問い合わせます。下の三つのうち、対応が必須なのは `VK_PRESENT_MODE_FIFO_KHR` です。[KhronosのVkPresentModeKHR仕様](https://docs.vulkan.org/refpages/latest/refpages/source/VkPresentModeKHR.html)

| 表示モード | 切り替える時点と選び方 | 観察できる違い |
| --- | --- | --- |
| `FIFO` | 更新境界で待ち行列の先頭を一つ選ぶ | 届いた順で表示する。候補がたまると新しい絵ほど待つ |
| `MAILBOX` | 更新境界で1枠の最新候補を選ぶ。新着が待ち候補を差し替える | 直近の入力を反映した絵を選びやすい。差し替えられた絵は表示されない |
| `IMMEDIATE` | 垂直ブランクを待たず、使える絵に切り替える | 1回の走査に複数の絵が混ざり、ティアリングが起こり得る |

固定60 Hzの例で、最初は絵Aが表示され、次の絵BからGが順に4、11、23、30、39、47 msで表示可能になります。16.67 msの境界でFIFOは先に届いたBを選び、Cを待ち行列に残します。MAILBOXはBをCに差し替えているので、Cを選びます。IMMEDIATEではこの走査がCで始まり、23 msにD、30 msにEへ切り替わります。

<figure class="study-figure">
  <img src="/images/graphics/swap-chain-presentation-modes.svg" alt="仮想60 Hzの約16.67から33.33ミリ秒の走査。FIFOは全面がB、MAILBOXは全面がC。IMMEDIATEは上38パーセントがC、次がD、80パーセントから下がEで、縦棒の位置が二つの境界でずれている。" width="760" height="350" loading="lazy">
  <figcaption>約16.67〜33.33 msの1回の走査を比較。IMMEDIATEの境目は、その走査中に別の絵が表示可能になった時点です。<a href="/study/images/graphics/swap-chain-presentation-modes.svg" target="_blank" rel="noopener noreferrer">3つの表示モードの図を拡大</a></figcaption>
</figure>

最後のGは43 msの入力を反映し、47 msに表示可能になります。FIFOでは先行する候補の順番を待つので、最初の行に現れるのは100 ms（入力から57 ms）です。MAILBOXではGが待ち候補を差し替え、50 msの境界で現れます（7 ms）。IMMEDIATEでは47 msに走査中の行から切り替わります（4 ms）。

この例は、十分な数の画像があり、OSの画面合成を挟まず、1更新の全区間を使って上から下へ一定の速さで走査するモデルです。遅延として数えるのは、入力のサンプリングからその絵が最初に使われた行までです。実機のパネル応答や入力機器の遅延はこの計算の範囲外です。更新ごとの候補と走査結果を実験で追えます。[表示モードを比べる実践](/practice/graphics/swap-chain-observation.html)

## WindowsのPresentと可変リフレッシュレート

DXGIのフリップモデルで `Present(1, 0)` を使うと、提示を垂直ブランクに同期します。`Present(0, ...)` のフリップキューでは、後の提示によって待ち候補が省略される場合があります。ウィンドウやボーダーレスでティアリングを許可する場合は、対応を照会し、作成時の `DXGI_SWAP_CHAIN_FLAG_ALLOW_TEARING` と、`SyncInterval = 0` での `DXGI_PRESENT_ALLOW_TEARING` を組み合わせます。DXGIのフラグとVulkanの表示モードは、それぞれのAPIの規則で読みます。[DXGIのPresentとフリップキュー](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-idxgiswapchain-present) · [DXGI_PRESENTのフラグ](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/dxgi-present)

DXGIのウィンドウやボーダーレスでは、VRR対応経路を使うためにティアリングを許可する設定が必要です。これは提示の制約を緩めるフラグです。実際に途中で絵が切り替わるかは、VRRの動作範囲、画面モード、合成の経路などに依存します。[DXGIのVRR対応手順](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/variable-refresh-rate-displays)

描画は速いのに操作が遅れて見えるときは、入力を読んだ時刻、GPUで描き終えた時刻、画面に出始める時刻を分けて測ります。表示待ちが増えているなら、DXGIの待機可能なスワップチェーンを使い、次のフレームを受け付けられる通知を待ってから入力を読み、描画を始める方法があります。安定性も確認するには、表示間隔の長い箇所と合わせて見ます。[MicrosoftのDXGIでの遅延低減](https://learn.microsoft.com/en-us/windows/uwp/gaming/reduce-latency-with-dxgi-1-3-swap-chains) · [フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)

## 理解度チェック

1. 上から下へ走査する途中でAからBへ切り替えると、動く縦棒はどう見えますか。

   ::: details 解答
   上の行にはAでの位置、下の行にはBでの位置が描かれます。縦棒は切り替わった行で横にずれて見えます。
   :::

2. Bが20 msに完成する例で、固定60 HzのVSyncオンとVRRでは、Bをいつ使い始めますか。

   ::: details 解答
   固定60 HzのVSyncオンでは約16.67 msの走査に間に合わず、約33.33 msからBを使います。仮想40〜60 HzのVRRでは、前の走査開始から20 msが対応範囲内なので、20 msからBを走査します。
   :::

## 関連項目

- [VSyncオフ・オン・VRRを比べる](/practice/graphics/vsync-vrr-observation.html)で、絵の完成から走査開始までを同じ場面で確認する。
- [3DCG・描画ロードマップの「GPU最適化」](/learn/roadmap.html?node=gfx-optimization#graphics)
