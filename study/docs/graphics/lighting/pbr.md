---
title: PBR (物理ベースレンダリング)
study:
  source: RenderingWiki
  status: published
  summary: PBR (Physically Based Rendering) は、光と物質の相互作用を物理法則に基づいてモデル化するシェーディングの枠組みです。エネルギー保存・フレネル反射・マイクロファセット理論を柱とし、「アルベド・メタリック・ラフネス」という直感的なパラメータで、あらゆる照明環境で破綻しない
  section: reference
  format: article
  domain: graphics
---

# PBR (物理ベースレンダリング)

## 概要

PBR (Physically Based Rendering) は、**光と物質の相互作用を物理法則に基づいてモデル化する**シェーディングの枠組みです。エネルギー保存・フレネル反射・マイクロファセット理論を柱とし、「アルベド・メタリック・ラフネス」という直感的なパラメータで、あらゆる照明環境で破綻しないマテリアルを実現します。2013年頃に業界標準化され、現代の全エンジンの土台です。

## なぜ必要なのか

- 旧来のPhong系は照明環境ごとにパラメータの手調整が必要で、「あるシーンで綺麗なマテリアルが別のシーンで破綻」していた
- 物理に基づけば**どんな照明でも一貫した見た目**になり、アセット制作が環境から独立する (これが制作パイプライン上の最大の価値)
- IBL・GI・レイトレーシングはすべて「正しいBRDF」を前提に構築される — PBRは現代レンダリングの共通言語

## 歴史・誕生した背景

- 1967: Torrance-Sparrow のマイクロファセット反射モデル (物理学の論文)
- 1975: Phongモデル / 1977: Blinn がマイクロファセットをCGへ導入
- 1981: **Cook-Torrance** モデル — CGにおける物理ベーススペキュラの原型
- 1986: Kajiya のレンダリング方程式 → [パストレーシング](/graphics/lighting/path-tracing.html)
- 2007: Walter らの **GGX** (Trowbridge-Reitz再発見) — 現在の標準NDF
- **2012: Burley (Disney) の "Physically-Based Shading at Disney"** — アーティスト向けに整理された「原則的BRDF」。metallic/roughnessパラメータ体系の確立
- **2013: Karis (Epic) の "Real Shading in Unreal Engine 4"** — Disney原則をリアルタイム向けに軽量化。**この2本が業界標準化の決定打**
- 2014-15: Unity 5 / UE4 / Frostbite (Lagarde & de Rousiers の詳細資料) が一斉にPBR化

## それ以前の技術

Phong / Blinn-Phong + アドホックな「スペキュラマップ」。エネルギー保存がなく (ハイライトを強くすると総エネルギーが増える)、フレネルも近似すらないことが多く、金属と非金属の区別も曖昧でした。

## 解決した課題

1. **エネルギー保存**: 反射光 ≤ 入射光を保証 — ラフネスを上げるとハイライトが「広く弱く」なる正しい挙動
2. **フレネル**: 斜めから見ると全ての物質は鏡になる — 物質の見た目の本質的要素
3. **金属/非金属の物理的区別**: metallicワークフロー
4. アセットの照明非依存性・スキャン値 (実測アルベド) の利用

## 現在の位置づけ

標準です。Unity (Lit)、UE (Default Lit)、glTF 2.0のマテリアル仕様まで、metallic/roughnessモデルが共通語。研究の最前線は多重散乱補正、異方性・布・肌・虹彩などの特殊BRDF、そしてニューラルマテリアルへ進んでいます。

## 内部動作

### 反射率方程式

1点のシェーディングは、半球上の入射光の積分です:

$$L_o(\mathbf{v}) = \int_{\Omega} f_r(\mathbf{l}, \mathbf{v}) \, L_i(\mathbf{l}) \, (\mathbf{n} \cdot \mathbf{l}) \, d\mathbf{l}$$

リアルタイムでは、この積分を「解析ライト (太陽・ポイントライト) の和」+「環境光 (IBL)」に分解します。

### BRDF: Diffuse + Specular

$$f_r = k_d \frac{albedo}{\pi} + \frac{D(h) \, F(v,h) \, G(l,v)}{4 (\mathbf{n} \cdot \mathbf{l})(\mathbf{n} \cdot \mathbf{v})}$$

**マイクロファセット理論**: 表面は微細な鏡の集合で、ラフネスはその向きのばらつき。

| 項 | 意味 | 標準の選択 |
|---|---|---|
| $D$ (法線分布) | ハーフベクトル方向を向く微細面の割合 | **GGX**: $D = \frac{\alpha^2}{\pi((\mathbf{n}\cdot\mathbf{h})^2(\alpha^2-1)+1)^2}$ |
| $F$ (フレネル) | 視射角による反射率上昇 | **Schlick近似**: $F = F_0 + (1-F_0)(1-\mathbf{v}\cdot\mathbf{h})^5$ |
| $G$ (幾何減衰) | 微細面同士の遮蔽 | Smith GGX (Height-correlated) |

GGXが勝った理由は**裾の長さ**: 実測データのハイライトは中心が鋭く裾が長く、Beckmannより GGX の分布形状が一致しました。

### Metallic ワークフロー

| | 非金属 (dielectric) | 金属 (conductor) |
|---|---|---|
| $F_0$ (垂直反射率) | ~0.04 (4%) 固定 | albedo色そのもの (金=黄色い反射) |
| 拡散反射 | albedo | **なし** (自由電子が吸収) |

```hlsl
float3 F0 = lerp(0.04, baseColor, metallic);
float3 diffuseColor = baseColor * (1.0 - metallic);
```

### 実装上の重要事項

- **すべてリニア色空間で計算** し、最後にトーンマップ+ガンマ → [ポストプロセス](/graphics/postprocess/overview.html)
- roughnessは知覚的に $\alpha = roughness^2$ とリマップ (Disney)
- NdotL, NdotV は `saturate` し、0除算をepsilonで保護

## 各環境での扱い

### Unity
URP/HDRPの `Lit` シェーダ。実装は `Lighting.hlsl` / `BSDF.hlsl` (`DirectBRDFSpecular` 等)。Smoothness = 1 - roughness という逆向きパラメータに注意。HDRPはさらに多層マテリアル (Stacked Lit)、布・肌・虹彩の専用モデルを持ちます。

### Unreal Engine
Default LitがまさにKaris 2013の実装 (`BRDF.ush` の `D_GGX`, `Vis_SmithJointApprox`, `F_Schlick`)。Shading Model (Cloth/Hair/Skin/ClearCoat...) の切替でG-Buffer解釈とBRDFが変わります。

### DirectX 12 / Vulkan
BRDFはシェーダコードそのものなのでAPI非依存。glTF 2.0のmetallic-roughnessテクスチャ (G=roughness, B=metallic) を読み込む構成が事実上の標準です。

## コード例

Cook-Torrance GGX の完全実装 (HLSL):

```hlsl
static const float PI = 3.14159265359;

float D_GGX(float NdotH, float a) {          // a = roughness^2
    float a2 = a * a;
    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    return a2 / (PI * d * d);
}
float V_SmithGGXCorrelated(float NdotV, float NdotL, float a) {
    float a2 = a * a;
    float gv = NdotL * sqrt(NdotV * NdotV * (1.0 - a2) + a2);
    float gl = NdotV * sqrt(NdotL * NdotL * (1.0 - a2) + a2);
    return 0.5 / max(gv + gl, 1e-5);          // (G / (4 NdotL NdotV) を内包)
}
float3 F_Schlick(float VdotH, float3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
}

float3 ShadePBR(float3 N, float3 V, float3 L, float3 lightColor,
                float3 baseColor, float metallic, float roughness)
{
    float3 H = normalize(L + V);
    float NdotL = saturate(dot(N, L));
    float NdotV = abs(dot(N, V)) + 1e-5;
    float NdotH = saturate(dot(N, H));
    float VdotH = saturate(dot(V, H));

    float  a  = roughness * roughness;        // 知覚リマップ
    float3 F0 = lerp(0.04, baseColor, metallic);

    float  D = D_GGX(NdotH, a);
    float  Vis = V_SmithGGXCorrelated(NdotV, NdotL, a);
    float3 F = F_Schlick(VdotH, F0);

    float3 specular = D * Vis * F;
    float3 kd = (1.0 - F) * (1.0 - metallic);  // エネルギー保存
    float3 diffuse = kd * baseColor / PI;

    return (diffuse + specular) * lightColor * NdotL;
}
```

## 前提知識

- [ベクトル](/math/rendering/vector.html), [Fragment Shader](/graphics/pipeline/fragment-shader.html)

## 次に読むべきページ

- [IBL](/graphics/lighting/ibl.html) — 環境光項の実装 (PBRの片割れ)
- [シャドウ](/graphics/lighting/shadow.html)
- [GI総論](/graphics/lighting/gi.html)

## 理解度チェック

1. **「エネルギー保存」がPhongモデルに欠けていたことによる実害と、PBRでの解決を説明せよ。**
   ::: details 解答
   Phongではスペキュラ強度と広さ(shininess)が独立パラメータで、鋭く強いハイライトを作ると反射エネルギーが入射を超え、照明を変えると露骨に破綻した。アーティストは環境ごとに再調整を強いられた。PBRではNDFの正規化により「ラフネスを下げると鋭く明るく、上げると広く暗く」が自動で成立し、総エネルギーが常に保存されるため、どの照明でも一貫する。
   :::

2. **金属のアルベド(拡散色)が黒である物理的理由は。**
   ::: details 解答
   拡散反射は光が表面下に侵入し散乱して再放出される現象だが、金属では自由電子が侵入光のエネルギーを即座に吸収・再放射(=鏡面反射)するため、表面下散乱がほぼ起きない。よって金属の見た目はF0(色付きの鏡面反射)のみで構成され、拡散項は0になる。
   :::

3. **F0=0.04 という値の意味と、それがフレネル項でどう使われるかを述べよ。**
   ::: details 解答
   一般的な非金属(IOR≈1.5)の垂直入射時の反射率が約4%であることに由来する。Schlick近似では視線とハーフベクトルの角度が浅くなるにつれF0から1.0(全反射)へ5乗カーブで補間され、「正面はわずかに、斜めからは強く反射する」という全物質共通の挙動を作る。
   :::

## 参考資料

- Brent Burley, *"Physically-Based Shading at Disney"* (SIGGRAPH 2012)
- Brian Karis, *"Real Shading in Unreal Engine 4"* (SIGGRAPH 2013)
- Lagarde & de Rousiers, *"Moving Frostbite to PBR"* (SIGGRAPH 2014) — 実装詳細の決定版
- Naty Hoffman, *"Physics and Math of Shading"* (SIGGRAPH PBS course, 各年)
- Google Filament ドキュメント — 実装と理論の橋渡しとして最良
