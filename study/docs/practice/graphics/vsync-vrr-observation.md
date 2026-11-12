---
title: 同じシーンでVSyncオフ・オン・VRRを比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: vsync-vrr-observation
  order: 1
  summary: 同じ描画完了時刻から、走査中のティアリング、固定周期での再表示、VRRで次の走査を始める時刻を見比べる。
  aliases: [VSync, VRR, 可変リフレッシュレート, ティアリング, スキャンアウト, 垂直ブランク]
  verification: Vulkanの提示仕様、Linux DRM/KMSのVRR、DXGIの公式資料に照合（2026-11-13）
---

# 同じシーンでVSyncオフ・オン・VRRを比べる

横に動く物体を、3方式で同じ位置、同じ描画完了時刻から表示します。タイムラインで新しい絵を使う時刻を、仮想画面で上と下がどの画像に対応するかを見ます。[スワップチェーンとVSyncの記事](/graphics/optimization/swap-chain-and-vsync.html)で、それぞれの更新方法を図解しています。

<a href="/study/samples/graphics/vsync-vrr-observation/index.html" target="_self">3方式の比較デモを開く</a>

## 20 msで画面を止めて比べる

**20 msの例を見る**を押して、次の順に切り替えます。描画フレームAは0 ms、Bは20 msに完成します。

1. **VSyncオフ**では、固定60 Hzの走査が約16.67 msにAから始まります。Bが20 msに完成し、走査の途中で絵が替わります。仮想画面では上約20%がA、下約80%がBです。動く物体の境目が横にずれます。
2. **VSyncオン**では、約16.67 msにAをもう一度走査します。Bの走査は次の境界の約33.33 msからです。全行が同じ絵になり、物体はAの位置に長く残ります。
3. **VRR**では、Bが完成した20 msに新しい走査が始まります。Bの走査は全行にBを使います。次の絵Cが40 msに完成するまで、Bの走査終了から次の走査までに待ちが入ります。

## 再生して、止まる箇所を比べる

**スロー再生**で、物体が動く間隔を見ます。VSyncオフでは、走査中に絵が切り替わる箇所で物体の輪郭がずれます。固定VSyncオンでは、描画完了が固定周期の境界をまたぐと同じ絵を再表示します。このとき画面に残る長さが変わり、動きが一瞬止まったように見えます。VRRでは、今回の範囲内の描画完了を次の走査の開始に使います。

**仮想の時刻**を **38 ms** 付近にすると、VRRではBの走査が終わり、Cの完成を待っています。**次の描画完了へ**を押すと、Cが完成して走査を始める **40 ms** に進みます。前の絵を残して待つ時間と、その絵を上から下へ読む時間をタイムラインで分けて見ます。

## この実践の条件

- 固定方式は60 Hzで、モデルの1回の走査は約16.67 msです。
- VRRは仮想40〜60 Hzです。サンプルの描画完了の間隔は18〜22 msで、その範囲内にそろえています。
- ブラウザーは、仮想画面の1回分の走査結果とタイムラインを描きます。実際の画面の更新設定はOSやドライバーから変更します。物理ディスプレイでの見え方や可変範囲は機器によって異なります。

更新方式をそろえて表示間隔だけを変える比較は、[フレームペーシングの実践](/practice/graphics/frame-pacing-observation.html)で試せます。

## 理解度チェック

1. 20 msのVSyncオフで、絵Bが画面の上側に出ないのはなぜですか。

   ::: details 解答
   20 msまでに上側の行はAから読み出されています。その時点から下の行をBで読むので、境目にずれが見えます。
   :::

2. 38 msのVRRで、Cの走査を始めるのを何が止めていますか。

   ::: details 解答
   Cは40 msで完成します。38 msではBの走査を終え、前の絵を残した状態でCの完成を待っています。
   :::

## 関連項目

- [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)
- [FIFO・MAILBOX・IMMEDIATEの実践](/practice/graphics/swap-chain-observation.html)で、画像を待ち行列に入れたり置き換えたりする違いを確認する。
- [3DCG・描画ロードマップの「GPU最適化」](/learn/roadmap.html?node=gfx-optimization#graphics)

## 参考資料

- [Khronos — VkPresentModeKHR](https://docs.vulkan.org/refpages/latest/refpages/source/VkPresentModeKHR.html)
- [Linux DRM/KMS — Variable refresh properties](https://docs.kernel.org/6.14/gpu/drm-kms.html#variable-refresh-properties)
- [Microsoft — Variable refresh rate displays](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/variable-refresh-rate-displays)
