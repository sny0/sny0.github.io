---
title: 同じシーンでネイティブ描画・バイリニア・時間方向の拡大を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: taau-observation
  order: 1
  summary: 384×216の同じ画面で、ネイティブ描画と192×108からの拡大を比べ、4フレームのサンプルで高解像度の画素を埋める。
  aliases: [TAAUの実践, WebGL 2, アップスケーリング, バイリニア拡大, ジッタ, 内部解像度, 出力解像度]
  verification: Yangらの論文とEpicのTAAU資料に照合（2026-11-13）
---

# 同じシーンでネイティブ描画・バイリニア・時間方向の拡大を比べる

シーンを固定し、表示用の画像を384×216にそろえます。細い線や斜めの境界に注目すると、元の画素数と、履歴で得られたサンプルの違いを見比べられます。[アップスケーリングの記事](/graphics/postprocess/upscaling.html)で、TAAからTAAUにつながる流れとDLSS・FSRの違いを図解しています。

<a href="/study/samples/graphics/taau-observation/index.html" target="_self">3方式の比較デモを開く</a>

## 3方式を切り替える

| モード | 1フレームで描く解像度 | 384×216の出力に使う色 |
| --- | --- | --- |
| ネイティブ描画 | 384×216 | 出力格子で直接描いた色 |
| バイリニア拡大 | 192×108 | 同じフレームの周囲の色を補間した結果 |
| 時間方向のアップスケーリング | 192×108 | フレームごとにずらして取得した色と、未取得の場所の補間色 |

1. **ネイティブ描画**で、標識や手すりの細い線の見え方を覚えます。
2. **バイリニア拡大**に切り替えます。細い線の境目や、色が混ざって見える場所を探します。
3. **時間方向のアップスケーリング**を選び、**自動で進める**をオフにしてから、**履歴をリセット**します。**1フレーム進める**を押すたびに、2×2の取得済み位置が一つ増えます。4フレーム分がそろった後、ネイティブ描画へ戻って見比べます。

## 4フレームで何がそろうか

192×108は縦横それぞれ384×216の半分です。低解像度で1回描くと、出力の2×2画素の範囲から1か所をサンプルします。次のフレームではサンプル位置をずらします。取得した色を出力格子の位置ごとに保存して、あとから描いた色で別の位置のサンプルを埋めていきます。

この実践は、静止したシーンと出力画素にぴったり合う4つの位置を使います。そのため4回の描画で、ネイティブと同じ場所の色がそろいます。履歴が有効な条件を固定した教材用の実装です。動くシーンでの再投影や履歴検証は、[TAAの実践](/practice/graphics/taa-observation.html)で観察できます。DLSSやFSRの再構成は、製品と世代ごとのアルゴリズムで行います。

## 理解度チェック

1. 時間方向のモードで、履歴をリセットしてすぐはなぜバイリニアに近く見えますか。

   ::: details 解答
   出力の細かい位置のサンプルがまだそろっていないためです。実践では未取得の位置を一時的にバイリニア補間で埋め、サンプルを取れた位置から置き換えます。
   :::

2. 1回目と同じ位置を繰り返し描くと、4フレーム後に出力の2×2画素はそろいますか。

   ::: details 解答
   同じ点の色を取り続けるため、他の3点の色は取得できません。フレームごとに位置をずらすことで、出力の異なる画素を埋められます。
   :::

## 関連項目

- [アップスケーリング](/graphics/postprocess/upscaling.html)で、TAAUと製品ごとの再構成方法を整理する。
- [TAA](/graphics/postprocess/taa.html)で、ジッタ、再投影、履歴検証の役割を確認する。
- [3DCG・描画ロードマップの「ポストプロセスとAA」](/learn/roadmap.html?node=gfx-postprocess#graphics)

## 参考資料

- [Lei Yang, Shiqiu Liu, Marco Salvi — A Survey of Temporal Antialiasing Techniques](https://diglib.eg.org/items/cfa6a05c-53b3-4ee1-979d-48abc6225f6b)
- [Epic — Screen Percentage with Temporal Upscale（Unreal Engine 5.8）](https://dev.epicgames.com/documentation/en-us/unreal-engine/screen-percentage-with-temporal-upscale-in-unreal-engine?application_version=5.8)
