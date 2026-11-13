---
title: 頂点シェーダーでの表現 — 風・波・VATで形を動かす
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 草の根元を固定して風で曲げ、水面の波から法線を求める。シミュレーション結果をVATで再生するときの頂点番号とフレームも扱う。
  aliases: [頂点変形, vertex deformation, 頂点アニメーション, VAT, Vertex Animation Texture, 草の揺れ, 水面の波]
  verification: Crytekの草木の手続き的アニメーション、GPU Gemsの水面モデル、SideFX Labs VAT 3.0の資料に照合（2026-11-13）
---

# 頂点シェーダーでの表現 — 風・波・VATで形を動かす

頂点シェーダーで位置をずらすと、風に揺れる草や波打つ水面を描けます。草なら根元を固定するための重み、波なら時間と位置によって変わる位相が必要です。シミュレーションで作った複雑な動きは、頂点ごとの変位をテクスチャに記録して再生する方法もあります。頂点から描画までの流れは[頂点シェーダー](/graphics/pipeline/vertex-shader.html)で扱います。

## 草の揺れ — 曲がり方と位相を分ける

草の根元から先端までの重みを $w\in[0,1]$ とし、風向きに沿った変位を $A w^2\sin(\phi)$ とします。$A$ は最大変位、$\phi$ は時刻と位置で変わる位相です。重みに二乗を使うと先端の動きに比べて中間が小さくなります。$A=0.20$ mで $\sin(\phi)=1$ の瞬間、根元は0 m、中間の $w=0.5$ は0.05 m、先端は0.20 m動きます。

草の1本の中では位相を共有し、根元の位置を位相に入れると、同じ場所の草が近い時刻に揺れます。幹全体を曲げる動きと、葉の縁が細かく震える動きは別の重みと周波数で足せます。CrytekのCrysisの事例では、全体を曲げる処理と葉の細部の処理を分けています。

```mermaid
flowchart LR
    A["根元の位置・時間"] --> P["揺れの位相"]
    B["頂点の重み<br/>根元 0・先端 1"] --> M["各頂点の変位"]
    P --> M
    M --> C["描画時の位置"]
    D["事前計算した位置・回転"] --> V["VATから時刻に対応する値を読む"]
    V --> C
```

### 草の長さを保ち、風を位置で変える

横へ平行移動するだけでは、草の根元から先端までが伸びることがあります。草の中心線を、根元で上向き、先端へ向かうにつれて曲がる円弧にすると、中心線の長さを保てます。草の長さを $\ell$、根元からの距離を $s$、先端での曲がり角を $\theta$ とすると、曲がる平面内の横・上の座標は、曲率 $k=\theta/\ell$ を使って $((1-\cos(ks))/k,\ \sin(ks)/k)$。この式を $s$ で微分したベクトルは $(\sin(ks),\cos(ks))$ で長さ 1 なので、弧長は元の $s$ になります。$k=0$ の近くでは $(0,s)$ を使います。例えば長さ 1 m、曲がり角 $\pi/2$ なら先端は横・上ともに $2/\pi\approx0.637$ m。草の板の幅は、中心線からのオフセットも断面と一緒に回すと保ちやすくなります。

風を位置で変えるには、ワールドの XZ 座標で風テクスチャをサンプルし、RG から水平の風向・強さを読みます。一株の頂点が同じ方向に曲がるよう、株の根元で読んだ値を共有し、頂点側では明示したミップをサンプルします。周期が近い株が一斉に動く場合は、株ごとに位相をずらします。Unity 6.3 LTS の Wind Zone は対応する Terrain の木などへ風を与える仕組みです。独自の草の頂点シェーダーでは、風の値をテクスチャや定数へ渡す処理を実装します。

## コード例 — ワールド空間で草を曲げる

HLSL Shader Model 6.0の頂点シェーダーです。`dxc -T vs_6_0 -E WindVS Wind.hlsl` でコンパイルできます。各頂点にオブジェクト空間の根元位置と0〜1の変形重みを渡します。`WindDirectionXZ` は単位ベクトル、`Amplitude` はメートル、`SpatialFrequency` はrad/m、`AngularFrequency` はrad/sです。行列は列ベクトルへ左から掛ける規約で、定数バッファにもこの規約で渡します。

```hlsl
cbuffer Wind : register(b0)
{
    column_major float4x4 ObjectToWorld;
    column_major float4x4 ViewProjection;
    float2 WindDirectionXZ;
    float Amplitude;
    float SpatialFrequency;
    float AngularFrequency;
    float TimeSeconds;
};

struct VertexInput
{
    float3 positionOS : POSITION;
    float3 rootOS : TEXCOORD0;
    float bendWeight : TEXCOORD1;
    float2 uv : TEXCOORD2;
};

struct VertexOutput
{
    float4 positionCS : SV_Position;
    float2 uv : TEXCOORD0;
};

VertexOutput WindVS(VertexInput input)
{
    float3 position = mul(ObjectToWorld, float4(input.positionOS, 1.0)).xyz;
    const float3 root = mul(ObjectToWorld, float4(input.rootOS, 1.0)).xyz;
    const float phase = SpatialFrequency * dot(root.xz, WindDirectionXZ)
                      - AngularFrequency * TimeSeconds;
    const float weight = saturate(input.bendWeight);
    position.xz += WindDirectionXZ * (Amplitude * weight * weight * sin(phase));

    VertexOutput output;
    output.positionCS = mul(ViewProjection, float4(position, 1.0));
    output.uv = input.uv;
    return output;
}
```

深度、影、カラーのパスで位置を変えるなら、同じ変形を適用します。カリング用の境界には最大変位を含めます。[TAA](/graphics/postprocess/taa.html)などが読む動きベクトルには、現在と前フレームそれぞれの時刻で変形した位置が要ります。この例は位置だけを出力します。法線を使う材質では、変形後の向きも用意します。

## 水面 — 波の傾きから法線を作る

平面の高さを $h(x,z,t)=A\sin(k_xx+k_zz-\omega t)$ とすると、同じ位相の点は時間とともに $(k_x,k_z)$ の向きに進みます。複数の波を足すときは、それぞれの高さを足し、傾きも軸ごとに足します。$y$ が上向きの座標系で、波の面の法線は次のベクトルを正規化したものです。

$$
N=\operatorname{normalize}\left(-\frac{\partial h}{\partial x},1,-\frac{\partial h}{\partial z}\right)
$$

例えば $A=0.10$ m、$k_x=2$ rad/m、$k_z=0$ で位相が0なら、$x$ 方向の傾きは $0.10\cdot2\cdot\cos(0)=0.20$、$z$ 方向は0です。法線は $(-0.20,1,0)$ を正規化し、約 $(-0.196,0.981,0)$ になります。頂点の間隔より細かな波は形として表現しづらいので、頂点には大きな波を使い、細かい波は法線の表現に回せます。

### Gerstner 波で頂点を横にも動かす

Gerstner 波では高さだけでなく、水平方向の位置も動かして波の頂へ頂点を寄せます。基準の水平位置を $p=(x,z)$、波の方向を単位ベクトル $D$、振幅を $A$、波数を $k$、急峻さの係数を $Q$ とし、位相を $\phi=kD\cdot p-\omega t$ とします。水平位置は $p'=p+QA D\cos\phi$、高さは $A\sin\phi$。高さだけの法線式をそのまま使うと横の変位が抜けるため、変形した 3D 位置を $x,z$ で微分し、上向きになる順序で外積を取ります。波が一つなら、進行方向に対する水平変位の微分は $1-QAk\sin\phi$。$QAk<1$ にすると折り返しを防げます。複数波では $\sum_i Q_iA_ik_i<1$ を余裕のある目安にできます。 [Mark Finch — GPU Gems, §1.2.3](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)

## VAT — 事前計算した動きを読む

VAT（頂点アニメーションテクスチャ）では、シミュレーション結果をテクスチャへ書き出します。例えば固定トポロジーの単純な配置では、テクスチャの列を頂点の番号、行をフレームに対応させ、変位や回転を読みます。フレーム10.25を再生するなら、10と11の位置を0.25で線形補間できます。頂点の列は整数で指定し、隣の頂点のデータをフィルタで混ぜないようにします。

| 表現 | 実行時の負荷と調整 |
| --- | --- |
| 手続き的な変形 | 少数のパラメーターを渡して、頂点ごとに位置や法線を計算する。風向きや周期をその場で変えられる |
| VAT | 事前に求めた位置や回転を読む。データ量は頂点数・フレーム数・格納形式などで変わり、再生できる動きは書き出したデータに依存する |

SideFX Labs VAT 3.0では、固定トポロジーの変形、剛体、トポロジーが変わる流体などで書き出しモードが分かれます。3.0のRotation Textureは法線と接線の向きを記述します。エクスポーターが使う頂点識別子、データの配置、座標系に合わせて読み出します。インポート時に頂点が分割や並べ替えされるパイプラインでは、素材に保存した参照用の値が引き続き一致するか確認します。

### コード例 — 頂点番号とフレームで VAT を読む

HLSL Shader Model 6.0 の `vs_6_0`、エントリーは `VatVS`。この例は独自の固定トポロジー形式で、SideFX の出力形式とは別です。描画の `SV_VertexID` とテクスチャの列を一致させ、位置テクスチャと回転テクスチャは共に幅が頂点数、高さが `FrameCount`（1 以上）です。位置は AABB で正規化した RGB、回転は UNORM の XYZW に $[-1,1]$ を写したクォータニオンです。二つのフレームの回転を同じ半球にそろえてから nlerp し、頂点の元の法線へ適用します。位置を各頂点に直接保存するので、位置に回転は重ねません。`Frame` は非負の有限値で、ループするクリップを扱います。

```hlsl
Texture2D<float4> PositionVat : register(t0);
Texture2D<float4> RotationVat : register(t1);

cbuffer VatSettings : register(b0)
{
    float4x4 ClipFromObject;
    float3 PositionMin;
    float Frame;
    float3 PositionExtent;
    uint FrameCount;
};

struct VertexOutput
{
    float4 position : SV_Position;
    float3 normalOS : TEXCOORD0;
};

VertexOutput VatVS(float3 bindNormal : NORMAL, uint vertex : SV_VertexID)
{
    float wrapped = fmod(Frame, float(FrameCount));
    uint a = uint(floor(wrapped));
    uint b = (a + 1u) % FrameCount;
    float blend = frac(wrapped);
    float3 p0 = PositionVat.Load(int3(vertex, a, 0)).rgb;
    float3 p1 = PositionVat.Load(int3(vertex, b, 0)).rgb;
    float4 q0 = normalize(2.0 * RotationVat.Load(int3(vertex, a, 0)) - 1.0);
    float4 q1 = normalize(2.0 * RotationVat.Load(int3(vertex, b, 0)) - 1.0);
    if (dot(q0, q1) < 0.0)
        q1 = -q1;
    float4 q = normalize(lerp(q0, q1, blend));

    float3 p = PositionMin + PositionExtent * lerp(p0, p1, blend);
    VertexOutput output;
    output.position = mul(ClipFromObject, float4(p, 1.0));
    output.normalOS = bindNormal + 2.0 * cross(q.xyz, cross(q.xyz, bindNormal) + q.w * bindNormal);
    return output;
}
```

例えば位置の X が $[-2,2]$ m の範囲で、二つのフレームに $0.25,0.75$ を格納し、補間が 0.25 なら、復元した X は $-2+4(0.25+0.25(0.75-0.25))=-0.5$ m。フレーム末尾から先頭を補間するので、ループをつなげた素材を使います。頂点の並べ替えがあるインポートでは、バッファ番号から推測せず VAT 用の ID を明示的な頂点属性にできます。

## 理解度チェック

1. 風で草の根元まで滑っている。どの入力を確認する？
2. 水面の高さを変えたあとに平面の法線を使い続けるとどうなる？
3. 画面の端で、揺れている草が急に消える。どこを確認する？

::: details 解答
1. 根元頂点の変形重みが0になっているか確認します。先端から根元まで同じ重みを渡すと、位相を共有する頂点がまとめて移動します。
2. 照明や反射の計算は平らな面の向きを使うため、波の傾きが見た目に反映されません。
3. カリングが参照する境界を確認します。静止時の形だけを囲む境界では、変形後の位置が画面内にあっても、描画前の判定で落ちる場合があります。
:::

## 関連項目

- [頂点シェーダー](/graphics/pipeline/vertex-shader.html)
- [リグとスキニング](/graphics/basics/rigs-and-skinning.html)
- [トゥーンとNPR](/graphics/shader/toon-and-npr.html)

## 参考資料

- [Tiago Sousa、Vegetation Procedural Animation and Shading in Crysis（GPU Gems 3）](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis)
- [Mark Finch、Effective Water Simulation from Physical Models（GPU Gems）](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)
- [SideFX、Labs Vertex Animation Textures 3.0](https://www.sidefx.com/docs/houdini/nodes/out/labs--vertex_animation_textures-3.0.html)

- [Unity 6.3 LTS — Add wind zones to trees](https://docs.unity3d.com/6000.3/Documentation/Manual/class-WindZone.html)
- [Microsoft — HLSL のシステム値セマンティクス](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics)・[Texture2D.Load](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-load)
