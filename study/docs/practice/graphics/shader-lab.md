---
title: WebGPUでシェーダーの出力を比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: shader-lab
  order: 1
  summary: 法線、GGX、露出、ノイズ、トゥーン、距離関数、水面のパラメーターを動かし、同じ座標で何が変わるかを見る。
  aliases: [WebGPU, WGSL, シェーダー実践, シェーダーのパラメーター]
---

# WebGPUでシェーダーの出力を比べる

7つの題材を切り替え、スライダーを動かしたときに出力のどこが変わるかを観察します。JavaScriptは選択と数値をuniformバッファに書きます。WGSLのフラグメントシェーダーが画素ごとに色を計算し、WebGPUのキャンバスに表示します。WebGPUに対応したブラウザとGPUが必要です。

<a href="/study/samples/graphics/shader-lab/index.html" target="_self">WebGPU実践を開く</a>
·
<a href="/study/samples/graphics/shader-lab/shader.wgsl" download>WGSLソース</a>

## 法線と接空間 {#normals}

<a href="/study/samples/graphics/shader-lab/index.html?mode=normals" target="_self">法線の実践を開く</a>。強さを0にして光の角度を変え、次に強さを上げます。球の外周と、球の内側の明暗を見比べます。接空間の入力は正弦波から生成しています。[法線マップと接空間](/graphics/shader/normal-mapping.html)

## GGXと材質 {#brdf}

<a href="/study/samples/graphics/shader-lab/index.html?mode=brdf" target="_self">GGXの実践を開く</a>。メタリックを0に保ち、粗さを0.2から0.7に上げます。次に粗さを固定し、メタリックを1にします。反射の広がりと、鏡面反射の色を別々に見ます。[BRDFの中身](/graphics/shader/brdf-internals.html)

## 露出とトーンマッピング {#hdr}

<a href="/study/samples/graphics/shader-lab/index.html?mode=hdr" target="_self">露出の実践を開く</a>。左右は同じリニアHDR値を使います。左は1でクリップし、右はチャンネルごとにReinhardの式 x / (1 + x) を適用します。+1 EVで変換前の値が2倍になります。発光の中心と周辺の色の差を比べます。[色空間とHDR](/graphics/shader/color-space-and-hdr.html)

## fBmとドメインワープ {#noise}

<a href="/study/samples/graphics/shader-lab/index.html?mode=noise" target="_self">ノイズの実践を開く</a>。ワープ量を0にして左右が揃うことを確認します。オクターブを増やすと細かい模様が加わります。ワープ量を増やすと、右側でサンプリングする座標が変わります。[ノイズと手続き的テクスチャ](/graphics/shader/procedural-noise.html)

## トゥーンとNPR {#toon}

<a href="/study/samples/graphics/shader-lab/index.html?mode=toon" target="_self">トゥーンの実践を開く</a>。リムを0にし、段数を変えます。次に段数を固定してリムを増やし、光との角度で出る境界と、視線に対して浅い面に出る明るさを見比べます。[トゥーンとNPR](/graphics/shader/toon-and-npr.html)

## SDFとレイマーチング {#sdf}

<a href="/study/samples/graphics/shader-lab/index.html?mode=sdf" target="_self">SDFの実践を開く</a>。合成幅を0から増やすと、2球が交わるところの輪郭が丸くつながります。影の硬さを動かすと、床で影から直射光に移る幅が変わります。影の式は近似です。[SDFとレイマーチング](/graphics/shader/sdf-and-raymarching.html)

## 水面の反射と吸収 {#water}

<a href="/study/samples/graphics/shader-lab/index.html?mode=water" target="_self">水面の実践を開く</a>。波の強さを0にして吸収を動かすと、水が深い右側から海底の模様が薄くなります。次に波を強め、反射の明るい部分と海底の模様が動く方向を見ます。空と海底はシェーダー内で生成しています。[水面の表現](/graphics/shader/water-shading.html)

## 関連項目

- [シェーダーのロードマップ](/learn/roadmap.html#shaders)
- [WGSL](/graphics/shader/wgsl.html)

## 参考資料

- [W3C WebGPU Candidate Recommendation Draft、2026年9月15日](https://www.w3.org/TR/2026/CRD-webgpu-20260915/)
- [W3C WebGPU Shading Language Candidate Recommendation Draft、2026年11月6日](https://www.w3.org/TR/2026/CRD-WGSL-20261106/)
- [Reinhardほか、Photographic Tone Reproduction for Digital Images、SIGGRAPH 2002](https://www-old.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf)
