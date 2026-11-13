---
title: シェーダーバリアントの管理 — コンパイルの組み合わせを減らす
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 静的な機能の組み合わせが増える理由を数え、UnityのキーワードとUnreal Engineのパーミュテーションをビルド単位で管理する。
  aliases: [シェーダーバリアント, shader variant, シェーダーパーミュテーション, shader permutation, shader_feature, multi_compile, stripping]
  verification: Unity 6.3 LTSのシェーダーキーワードとストリッピング、Unreal Engine 5.8のパーミュテーションAPIとコンパイル資料、MicrosoftのHLSLプリプロセッサーに照合（2026-11-13）
---

# シェーダーバリアントの管理 — コンパイルの組み合わせを減らす

シェーダーの機能をコンパイル時に切り替えると、同じソースから機能の組み合わせごとに異なるプログラムができます。これが**シェーダーバリアント**です。未使用の処理を外せる一方、組み合わせが増えるほどコンパイル、配布データ、読み込みの負荷が増えます。機能ごとに、実行時に切り替える必要があるか、両方の経路を同じプログラムに入れられるかを判断します。

## 組み合わせの数を先に数える

あるパスに品質3種、影のオン・オフ、霧のオン・オフがあると、候補は $3\times2\times2=12$ 種類です。3種の品質のうち最高品質で影が必須なら、「最高品質・影なし」の2種類を除外でき、10種類です。品質を排他的な1組で表すと、「高品質と低品質が同時に有効」のような状態が候補に入らずに済みます。

```mermaid
flowchart LR
    A["品質 3通り・影 2通り・霧 2通り"] --> B["パス内の候補 12通り"]
    B --> C["最高品質で影なしの2通りを除外"]
    C --> D["残る候補 10通り"]
    D --> E["対象API・パスごとのビルド"]
    E --> F["実行時に必要な組み合わせを選択"]
```

候補数はパスやシェーダーステージ、対象のグラフィックスAPI、レンダーパイプラインの設定にも依存します。図の12は1つのパス内で機能だけを数えた値です。実際のビルドでは、候補、除外後、コンパイルや格納の件数をログの集計単位に合わせて区別します。シェーダーが用意されていても、レンダーターゲット形式や深度・ブレンド状態との組み合わせによってはパイプライン作成が別途発生します。[パイプラインのコンパイルによるカクつき](/graphics/optimization/pipeline-compilation-stutter.html)

## Unity 6.3 LTS — キーワードで候補を作る

| 宣言 | 使いどころ |
| --- | --- |
| `shader_feature` | ビルド時に分かるマテリアルの機能。未使用の組み合わせをビルドから除外する仕組みがある |
| `multi_compile` | 実行時にも切り替える組み合わせを候補に入れる。レンダーパイプラインや独自のストリッピングが別に適用され得る |
| `dynamic_branch` | 同一プログラム内で実行時に分岐する。キーワードの各状態について別々のバリアントを作らない |

`shader_feature_local` や `multi_compile_local` の `_local` は、そのキーワードを同名のグローバルキーワードで上書きしない指定です。同じ選択肢を宣言したままスコープだけを変えても、この組が作る候補数は変わりません。例えば `#pragma shader_feature_local _ FOG_ON` は、オフとオンの2通りを候補にします。

コードからキーワードを有効にする、ビルド後にコンテンツを読み込むなど、ビルド時に使い方が分からない機能は、必要な組み合わせを含める仕組みとセットで設計します。Unity 6.3 LTSのStrict Shader Variant Matchingを検証用ビルドで使うと、必要な組み合わせが欠けて別の組み合わせで置き換わるケースを発見できます。

## Unreal Engine 5.8 — パーミュテーションの軸を定義する

Unreal Engineのグローバルシェーダーでは、`TShaderPermutationDomain` で機能の選択肢を軸として組み合わせ、パーミュテーションIDで特定の組み合わせを扱えます。例えば「ソフトシャドウの有無」と「デバッグ表示の有無」を別の軸にすると、両方オフ、片方ずつオン、両方オンの4候補です。対象プラットフォームで成立しない機能や、製品ビルドで不要なデバッグ経路は、コンパイル対象を決めるときに除外します。

件数を減らすときは、対象の品質、レンダーパス、プラットフォームで成立する組み合わせを先に列挙します。少ない演算を切り替えるだけの機能は、実行時分岐にした場合のGPU時間も測ります。同じ描画の全ピクセルで同じ値を使う分岐と、ピクセルごとに条件が異なる分岐では、GPU上の実行のされ方が異なります。

## コード例 — フォグを2つのバリアントにする

HLSL Shader Model 6.0のピクセルシェーダーです。`Material.hlsl` を `dxc -T ps_6_0 -E MaterialPS -D USE_FOG=0 -Fo off.dxil Material.hlsl` と `dxc -T ps_6_0 -E MaterialPS -D USE_FOG=1 -Fo on.dxil Material.hlsl` で別々にコンパイルします。色は線形RGB、`viewDistance` は0以上の距離です。`FogDensity` の単位は距離の逆数です。

```hlsl
#ifndef USE_FOG
#define USE_FOG 0
#endif

cbuffer Material : register(b0)
{
    float3 BaseColor;
    float FogDensity;
    float3 FogColor;
};

struct PixelInput
{
    float viewDistance : TEXCOORD0;
};

float4 MaterialPS(PixelInput input) : SV_Target
{
    float3 color = BaseColor;
#if USE_FOG
    const float transmittance = exp(-FogDensity * input.viewDistance);
    color = lerp(FogColor, color, transmittance);
#endif
    return float4(color, 1.0);
}
```

密度が $0.1\,\mathrm{m}^{-1}$、距離が10 mなら、オンのときの透過率は $e^{-1}\simeq0.368$ です。オフではフォグの計算が前処理で外れ、元の色を返します。実行時分岐に切り替えるとプログラムを1本にできるため、残る計算量とバリアント数の両方を比較します。

## 理解度チェック

1. パス内に色の方式4種類と独立したオン・オフが3個ある。候補はいくつ？
2. 実行時に初めて有効にする機能がエディターでは見えるが、ビルドで表示されない。何を確認する？
3. シェーダーバリアントを事前に用意すれば、初めて表示したときの停止は必ず消える？

::: details 解答
1. $4\times2^3=32$ 種類です。色の方式を排他的な1組として数え、3つのオン・オフはそれぞれ掛け合わせます。
2. 対象パスとAPIで、そのキーワードの組み合わせが残っているか確認します。ビルド時のマテリアル利用状況やストリッピングの規則で外れた可能性があります。
3. パイプラインを初めて作る負荷が残る場合があります。シェーダーのコンパイル、データの読み込み、パイプラインの作成を分けて測ります。
:::

## 関連項目

- [HLSL](/graphics/shader/hlsl.html)
- [パイプラインのコンパイルによるカクつき](/graphics/optimization/pipeline-compilation-stutter.html)
- [CPUプロファイリング](/tools/profiling/cpu-profiling.html)

## 参考資料

- [Unity、Declare shader keywords（Unity 6.3 LTS）](https://docs.unity3d.com/6000.3/Documentation/Manual/SL-MultipleProgramVariants-declare.html)
- [Unity、Reduce shader variants（Unity 6.3 LTS）](https://docs.unity3d.com/6000.3/Documentation/Manual/shader-variant-stripping.html)
- [Epic Games、TShaderPermutationDomain（Unreal Engine 5.8）](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/RenderCore/TShaderPermutationDomain?lang=en-US)
- [Epic Games、Debugging the Shader Compile Process（Unreal Engine 5.8）](https://dev.epicgames.com/documentation/unreal-engine/debugging-the-shader-compile-process-in-unreal-engine?application_version=5.8)
- [Microsoft、HLSLのプリプロセッサー](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-appendix-preprocessor)
