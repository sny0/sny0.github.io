---
title: ニューラルレンダリング — フレームを再構成する推論とシェーダー内の推論
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: DLSS の Transformer と、材質・照明を小さなネットワークで評価するニューラルシェーディングを入出力から区別する。
  aliases:
    - Neural Rendering
    - ニューラルシェーディング
    - DLSS 4
    - ニューラル材質
  verification: NVIDIA DLSS 4・4.5、RTX Kit 2026.3、D3D12 Shader Model 6.10 Preview、HLSL Shader Model 6.0（2026-11-13）
---

# ニューラルレンダリング — フレームを再構成する推論とシェーダー内の推論

レンダリングの一部に学習済みモデルを組み込むときは、推論がどこで走り、何を受け取って何を返すかを先に押さえる。DLSS の Super Resolution と材質シェーダー内の小型ネットワークでは、同じ GPU を使っても、入力も評価の単位も異なる。

```mermaid
flowchart LR
    A["ラスタライズ・レイトレース"] --> B["現在の画像・動き・履歴など"]
    B --> C["フレームを再構成するモデル"]
    C --> D["高解像度画像・再構成した照明"]
    E["交差点の位置・UV・方向など"] --> F["シェーダー内で小型モデルを評価"]
    F --> G["材質値・色・放射輝度など"]
    G --> A
```

## DLSS 4 の Transformer

Super Resolution は、低解像度の色と動きなどのエンジンデータを使い、時間方向の情報を利用して高解像度画像を得る。[TAA と時間方向のアップスケーリング](../postprocess/upscaling.md)で見るように、物体が動くと、前のフレームの同じ画素位置は別の点を表しうる。履歴を利用する方式では、エンジンから渡す動きやフレームの切り替わりの扱いが画質に関わる。

NVIDIA は **DLSS 4** で、Super Resolution、Ray Reconstruction、DLAA に Transformer ベースのモデルを導入した。従来の CNN 系から変わった点の一つは、自己注意（self-attention）を使い、空間や時間上の情報の関連性に応じて再構成に使う情報の重みを変えられること。Ray Reconstruction では、レイトレースでサンプルした情報から、従来はデノイザーが担当していた領域を再構成する。**DLSS 4.5** は Super Resolution に第 2 世代 Transformer を導入し、同世代の Ray Reconstruction も 2026 年 8 月に NVIDIA が公開した。

フレーム間の画像を作る機能については [フレーム生成](../postprocess/frame-generation.md)を参照。Super Resolution の設定を変えて比べる場合は、細線、動いている模様、新しく見えた領域を含めて、履歴によるちらつきや残像を観察する。

## シェーダー内のニューラルネットワーク

材質や照明を扱う方式では、UV、視線方向、法線などを入力にし、モデルが返す値をその場所のレンダリングに使う。例えば Vaidyanathan らのニューラルテクスチャ圧縮では、同じ材質の複数テクスチャと mip チェーンをまとめて圧縮し、小型モデルで必要な場所を復号する。テクスチャやその表現を読むための転送量と、復号の演算量を比較する必要がある。再構成した色や法線の誤差は、実際の照明を当てたときにも確認する。

**Cooperative Vectors** が扱うのは、こうしたモデルで使われる行列・ベクトル演算。モデルや学習済みの重みはアプリ側で用意する。Vulkan の `VK_NV_cooperative_vector` では、各呼び出しのベクトル演算を協調実行できる。Direct3D 12 では Shader Model 6.10 Preview の LinAlg のスレッドスコープにこの用途がある。NVIDIA **RTX Kit 2026.3** では、Neural Shading SDK 1.4.0 と Neural Texture Compression SDK 0.10.0 Beta がこの DirectX 12 API に対応した。実行条件の詳細は [最新のシェーダー技術](../shader/modern-shader-technologies.md)を参照。

## コード例 — 小さなモデルを材質に適用する

HLSL Shader Model 6.0 のピクセルシェーダーで、`DXC -T ps_6_0 -E main` を使う。2 入力・3 中間値・1 出力のモデル。重みは値を追うための手設定で、DLSS やニューラルテクスチャ圧縮の実装を使わず、ReLU の前後と出力だけを見られるようにしている。

```hlsl
float EvaluateMaterial(float2 input)
{
    float3 hidden = float3(
        dot(float2(0.6, -0.4), input) + 0.1,
        dot(float2(-0.2, 0.7), input) - 0.1,
        dot(float2(0.3, 0.2), input));
    hidden = max(hidden, 0.0);
    return saturate(dot(hidden, float3(0.5, 0.4, -0.2)) + 0.2);
}

float4 main(float2 uv : TEXCOORD0) : SV_Target0
{
    float value = EvaluateMaterial(uv);
    return float4(lerp(float3(0.05, 0.09, 0.20),
                       float3(0.93, 0.49, 0.16), value), 1.0);
}
```

入力 $(0.25,0.75)$ では中間値が $(-0.05,0.375,0.225)$、ReLU の後が $(0,0.375,0.225)$。混合係数は $0.4\times0.375-0.2\times0.225+0.2=0.305$ になる。学習済みモデルを使う場合も、演算の段数、重みの読み出し、出力の誤差を測る。Cooperative Vectors を使う場合は同じ入出力を持つ通常の演算版と比較できる。

## 理解度チェック

1. Super Resolution とニューラル材質では、推論の入力と出力がどう違うか。
2. ニューラルテクスチャ圧縮で、重みと圧縮データの転送量が減ったとしても何を測るか。
3. Cooperative Vectors の対応デバイスがあれば、材質のネットワークを自動で作れるか。

::: details 解答

1. 前者は画像・動き・履歴などからフレームを再構成する。後者は UV や方向などから材質値などを求める。
2. 復号の演算を含む GPU 時間と、最終的に描画した画像の差を測る。
3. ネットワークと重みは別に必要。Cooperative Vectors が提供するのは、推論などに使う行列・ベクトル演算。

:::

## 関連項目

- [アップスケーリング](../postprocess/upscaling.md)
- [フレーム生成](../postprocess/frame-generation.md)
- [パストレーシング](../lighting/path-tracing.md)
- [最新のシェーダー技術](../shader/modern-shader-technologies.md)

## 参考資料

- NVIDIA, [DLSS 4 — The New Transformer Model](https://www.nvidia.com/en-us/geforce/news/gfecnt/20251/dlss4-multi-frame-generation-ai-innovations/)
- NVIDIA, [DLSS 4.5 Super Resolution](https://developer.nvidia.com/blog/nvidia-dlss-4-5-delivers-super-resolution-upgrades-and-new-dynamic-multi-frame-generation/)・[DLSS 4.5 Ray Reconstruction](https://www.nvidia.com/en-us/geforce/news/gamescom-2026-nvidia-geforce-rtx-dlss-4-5-announcements/)
- Karthik Vaidyanathan et al., [Random-Access Neural Compression of Material Textures](https://research.nvidia.com/publication/2023-08_random-access-neural-compression-material-textures), SIGGRAPH 2023
- NVIDIA, [RTX Kit 2026.3](https://github.com/NVIDIA-RTX/RTX-Kit/releases/tag/2026.3)
- Microsoft, [D3D12 LinAlg Matrix Preview](https://devblogs.microsoft.com/directx/d3d12-linalg-preview/)
- Khronos Group, [VK_NV_cooperative_vector](https://docs.vulkan.org/refpages/latest/refpages/source/VK_NV_cooperative_vector.html)
