---
{
  "title": "3DCG・グラフィックスの用語集",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "reference",
    "format": "glossary",
    "domain": "terms",
    "summary": "3DCG・グラフィックスで使う語の定義、用例、関連する解説記事。"
  }
}
---

# 3DCG・グラフィックスの用語集

[用語集の入口・全用語検索](/glossary/)

読み順で 59 項目を掲載しています。

## アルファ {#alpha}

**Alpha / Alpha Channel** ／ 読み あるふぁ

合成時に色の寄与を制御する成分。通常の透明合成では0が透明、1が不透明を表す。

**この分野での意味**　用途によっては画素を覆う割合を表したり、テクスチャのAチャンネルを材質のマスクなど別のデータに使ったりする。

**例**　煙の端でアルファを0に近づける。

**関連**　[出力マージャー](/graphics/pipeline/output-merger.html) · [アルファテスト（アルファクリップ）](/glossary/graphics.html#alpha-test) · [アルファブレンド](/glossary/graphics.html#alpha-blend) · [プリマルチプライドアルファ（乗算済みアルファ）](/glossary/graphics.html#premultiplied-alpha)

**出典**　[W3C Compositing and Blending Level 1 — Simple Alpha Compositing](https://www.w3.org/TR/compositing-1/#simplealphacompositing) · [Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

## アルファテスト（アルファクリップ） {#alpha-test}

**Alpha Test / Alpha Clip / Alpha Cutout** ／ 読み あるふぁてすと / あるふぁくりっぷ

アルファをしきい値などと比較して、そのフラグメントを残すか捨てるか決める処理。

**この分野での意味**　Direct3D 9には固定機能のアルファテストがあった。プログラマブルな描画ではシェーダーの破棄命令などで実装する。

**例**　葉の透明部分をアルファクリップで抜く。

**関連**　[フラグメントシェーダー](/graphics/pipeline/fragment-shader.html) · [アルファ](/glossary/graphics.html#alpha) · [アルファブレンド](/glossary/graphics.html#alpha-blend)

**出典**　[Microsoft Direct3D 9 — Alpha Testing State](https://learn.microsoft.com/en-us/windows/win32/direct3d9/alpha-testing-state) · [W3C WGSL Candidate Recommendation Draft（2026年11月6日）](https://www.w3.org/TR/2026/CRD-WGSL-20261106/) · [Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

## アルファブレンド {#alpha-blend}

**Alpha Blending** ／ 読み あるふぁぶれんど

アルファに応じて手前の色と背景色の寄与を変え、半透明に合成する処理。

**例**　煙を奥から手前の順にアルファブレンドする。

**関連**　[出力マージャー](/graphics/pipeline/output-merger.html) · [アルファテスト（アルファクリップ）](/glossary/graphics.html#alpha-test) · [プリマルチプライドアルファ（乗算済みアルファ）](/glossary/graphics.html#premultiplied-alpha) · [オーバードロー](/glossary/graphics.html#overdraw)

**出典**　[Khronos Vulkan 1.4 — The Framebuffer](https://docs.vulkan.org/spec/latest/chapters/framebuffer.html) · [W3C Compositing and Blending Level 1 — Simple Alpha Compositing](https://www.w3.org/TR/compositing-1/#simplealphacompositing)

## アンビエントオクルージョン（AO） {#ao}

**Ambient Occlusion (AO)** ／ 読み あんびえんとおくるーじょん / えーおー

周囲の形状によって、表面に届く環境光がどの程度遮られるかを近似する。

**この分野での意味**　テクスチャに焼く方式と、画面の情報から描画中に求める方式がある。

**例**　岩のくぼみのAOをテクスチャへ焼く。

**関連**　[SSAOと遮蔽の近似](/graphics/lighting/ssao.html) · [ベイク（焼き込み）](/glossary/graphics.html#bake) · [ライトマップ](/glossary/graphics.html#lightmap)

**出典**　[Blender 5.0 — Render Baking](https://docs.blender.org/manual/en/5.0/render/cycles/baking.html) · [Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

## インスタンシング {#instancing}

**Instancing / GPU Instancing** ／ 読み いんすたんしんぐ

一つの描画命令で同じジオメトリの複数の個体を描く。位置や色などは個体ごとのデータから読み分ける。

**例**　木のメッシュをインスタンシングして、個体ごとに位置と回転を変える。

**関連**　[GPU駆動描画](/graphics/optimization/gpu-driven.html) · [ドローコール](/glossary/graphics.html#draw-call) · [バッチング](/glossary/graphics.html#batching)

**出典**　[Khronos Vulkan 1.4 — Drawing Commands](https://docs.vulkan.org/spec/latest/chapters/drawing.html) · [Unity 6.3 LTS — ドローコールの最適化方式](https://docs.unity3d.com/6000.3/Documentation/Manual/optimizing-draw-calls-choose-method.html)

## ウェイト（重み） {#weight}

**Weight / Skin Weight** ／ 読み うぇいと / おもみ

スキニングで、各ジョイントの変換が頂点の位置などにどの程度効くかを表す係数。

**この分野での意味**　アニメーションの合成では、各姿勢が結果へ寄与する割合もウェイトと呼ぶ。

**例**　肘の頂点に上腕と前腕のウェイトを付ける。

**関連**　[リグ・骨格・スキニング](/graphics/basics/rigs-and-skinning.html) · [スキニング](/glossary/graphics.html#skinning) · [ブレンド](/glossary/graphics.html#blend)

**出典**　[Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) · [Unity Animation Rigging 1.4 — Rigging Workflow](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/RiggingWorkflow.html) · [Unity 6.3 LTS — Animation Blend Trees](https://docs.unity3d.com/6000.3/Documentation/Manual/class-BlendTree.html)

## HDR（ハイダイナミックレンジ） {#hdr}

**High Dynamic Range (HDR)** ／ 読み えいちでぃーあーる / はいだいなみっくれんじ

暗部と明部の広い明るさの範囲を扱う表現。

**この分野での意味**　HDRレンダーターゲットは計算中の広い範囲を保存する。HDR表示は出力の符号化やディスプレイまで含めた別の条件を持つ。

**例**　HDRバッファへ光を蓄積し、画面の明るさ範囲へマッピングする。

**関連**　[色空間とHDR](/graphics/shader/color-space-and-hdr.html) · [レンダーターゲット](/glossary/graphics.html#render-target) · [トーンマッピング](/glossary/graphics.html#tone-mapping)

**出典**　[Microsoft DirectX — Advanced Color](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/high-dynamic-range) · [Unreal Engine 5.8 — Color Grading and the Filmic Tonemapper](https://dev.epicgames.com/documentation/unreal-engine/color-grading-and-the-filmic-tonemapper-in-unreal-engine?application_version=5.8)

## エイリアシング {#aliasing}

**Aliasing** ／ 読み えいりあしんぐ

細かな変化を粗い間隔でサンプリングし、元と異なる模様や動きが見える現象。モアレや輪郭のギザギザとして現れる。

**この分野での意味**　描画では空間・時間のサンプリングの話。プログラミングでは、別の名前や参照が同じ領域を指すことも指す。

**例**　細い格子が遠くでモアレに見える。

**関連**　[アンチエイリアシングとMSAA](/graphics/postprocess/antialiasing.html) · [ジャギー](/glossary/graphics.html#jaggies) · [フリッカー（ちらつき）](/glossary/graphics.html#flicker) · [ミップマップ](/glossary/graphics.html#mipmap)

**出典**　[Khronos OpenGL ES 3.0.6仕様 §3.3 Multisampling](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf) · [Unreal Engine 5.8 — Temporal Super Resolution](https://dev.epicgames.com/documentation/unreal-engine/temporal-super-resolution-in-unreal-engine?application_version=5.8)

## オーバードロー {#overdraw}

**Overdraw** ／ 読み おーばーどろー

同じ画素の位置を複数の図形が覆い、重ねて描画処理すること。半透明の合成では複数の層が最終色に寄与する。

**例**　煙を何枚も重ねると、画面中央のオーバードローが増える。

**関連**　[GPU最適化の基礎](/graphics/optimization/basics.html) · [フィルレート](/glossary/graphics.html#fill-rate) · [アルファブレンド](/glossary/graphics.html#alpha-blend)

**出典**　[NVIDIA GPU Gems 3 — High-Speed, Off-Screen Particles](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles)

## カーネル（GPU計算） {#kernel}

**GPU Kernel / Compute Kernel** ／ 読み かーねる / こんぴゅーとかーねる

GPUで並列実行する処理の入口となる関数。起動時に指定した複数のスレッドなどが、それぞれの入力を処理する。

**この分野での意味**　画像処理で「フィルターカーネル」と言う場合は、近傍の画素を混ぜるための重みの並びを指す。

**例**　各パーティクルの位置を一つのComputeカーネルで更新する。

**関連**　[コンピュートシェーダー](/graphics/compute/compute-shader.html) · [シェーダー](/glossary/graphics.html#shader) · [描画パス（レンダーパス）](/glossary/graphics.html#pass)

**出典**　[NVIDIA CUDA 13.1.1 — CUDA C++のカーネル](https://docs.nvidia.com/cuda/archive/13.1.1/cuda-programming-guide/02-basics/intro-to-cuda-cpp.html) · [W3C WGSL Candidate Recommendation Draft（2026年11月6日）](https://www.w3.org/TR/2026/CRD-WGSL-20261106/) · [NVIDIA GPU Gems — Real-Time Glowと畳み込みカーネル](https://developer.nvidia.com/gpugems/gpugems/part-iv-image-processing/chapter-21-real-time-glow)

## 画素（ピクセル） {#pixel}

**Pixel / Picture Element** ／ 読み がそ / ぴくせる

デジタル画像や描画先を構成する格子の一要素。

**この分野での意味**　同じ画素に複数のフラグメントが重なり得る。マルチサンプリング時には画素の内部に複数のサンプル位置を置く。

**例**　4つのサンプルの値を1画素にまとめる。

**関連**　[アンチエイリアシングとMSAA](/graphics/postprocess/antialiasing.html) · [フラグメント](/glossary/graphics.html#fragment) · [テクセル](/glossary/graphics.html#texel)

**出典**　[Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html) · [Khronos OpenGL ES 3.0.6仕様 §3.3 Multisampling](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf)

## カリング {#culling}

**Culling** ／ 読み かりんぐ

描画に寄与しないと判定した対象を処理から外すこと。視錐台外、遮蔽、裏面など、除外する条件で方式を呼び分ける。

**例**　カメラの視野から完全に外れた敵を視錐台カリングで除く。

**関連**　[レンダリングパイプライン](/graphics/pipeline/overview.html) · [ラスタライズ](/glossary/graphics.html#rasterize) · [詳細度（LOD）](/glossary/graphics.html#lod)

**出典**　[Unreal Engine 5.8 — Visibility and Occlusion Culling](https://dev.epicgames.com/documentation/unreal-engine/visibility-and-occlusion-culling-in-unreal-engine?application_version=5.8) · [Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html)

## ガンマ {#gamma}

**Gamma / Gamma Encoding** ／ 読み がんま

色の明るさを非線形に符号化・変換する関係を指す言い方。狭い意味ではべき乗曲線の指数を指す。

**この分野での意味**　sRGBも慣用的にガンマ符号化と呼ぶ。正確なsRGB曲線は区分的に定義される。

**例**　sRGBの色テクスチャをリニア値へ戻してから照明に使う。

**関連**　[色空間とHDR](/graphics/shader/color-space-and-hdr.html) · [リニア（色）](/glossary/graphics.html#linear) · [HDR（ハイダイナミックレンジ）](/glossary/graphics.html#hdr)

**出典**　[W3C CSS Color Level 4 — 色の変換コード](https://www.w3.org/TR/css-color-4/#color-conversion-code) · [Microsoft DirectX — Advanced Color](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/high-dynamic-range)

## クアッド（四角形） {#quad}

**Quad / Quadrilateral** ／ 読み くあっど / しかくけい

モデリングでは4頂点で囲む面。三角形を使う描画では二つの三角形へ分けられる。

**この分野での意味**　GPUのフラグメント処理では、画面上の2×2の処理単位をクアッドと呼ぶこともある。

**例**　クアッド主体でモデリングし、書き出しで三角形に分ける。

**関連**　[モデルとメッシュ](/graphics/basics/models-and-meshes.html) · [トライアングル（三角形）](/glossary/graphics.html#triangle) · [トポロジー](/glossary/graphics.html#topology) · [フラグメント](/glossary/graphics.html#fragment)

**出典**　[Blender 5.0 — Mesh Primitives](https://docs.blender.org/manual/en/5.0/modeling/meshes/primitives.html) · [Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html)

## ゴースト（残像） {#ghosting}

**Ghosting** ／ 読み ごーすと / ざんぞう

動く物体の後ろなどに、以前の像が重なって残る現象。時間方向の描画処理では、過去の画素をずれた位置で再利用したときなどに起きる。

**この分野での意味**　ディスプレイの応答による残像もゴーストと呼ぶ。描画処理の履歴によるものとは切り分けて調べる。

**例**　武器を振ると跡が残るので、モーションベクトルと履歴の棄却を調べる。

**関連**　[TAAとフレーム履歴](/graphics/postprocess/taa.html) · [フリッカー（ちらつき）](/glossary/graphics.html#flicker) · [フレーム（描画）](/glossary/graphics.html#frame)

**出典**　[Unreal Engine 5.8 — Temporal Super Resolution](https://dev.epicgames.com/documentation/unreal-engine/temporal-super-resolution-in-unreal-engine?application_version=5.8) · [BenQ — LCDディスプレイの応答時間とゴースト](https://esupportdownload.benq.com/esupport/LCD%20Monitor/UserManual/LCD%20Monitor_um_User%20Manual_20070119_171207_fp93GS-en.pdf)

## Gバッファ {#g-buffer}

**Geometry Buffer (G-Buffer)** ／ 読み じーばっふぁ

後のライティング処理で参照するため、画面上の表面の法線や材質情報などを格納するバッファ群。

**例**　Gバッファの粗さを読み、光源の反射を計算する。

**関連**　[Deferred RenderingとGバッファ](/graphics/path/deferred.html) · [レンダーターゲット](/glossary/graphics.html#render-target) · [描画パス（レンダーパス）](/glossary/graphics.html#pass)

**出典**　[Unreal Engine 5.8 — Post Process Materials](https://dev.epicgames.com/documentation/unreal-engine/post-process-materials-in-unreal-engine?application_version=5.8)

## シェーダー {#shader}

**Shader** ／ 読み しぇーだー

頂点や画素の処理、汎用計算など、GPUの処理段階で実行するプログラム。

**この分野での意味**　エンジンの制作会話では、材質の設定やそのシェーダーを組み合わせた見た目全体を指すこともある。Unity 6.3 LTSのマテリアルはシェーダーと設定値を参照する。

**例**　頂点シェーダーで草を揺らし、フラグメントシェーダーで色を計算する。

**関連**　[シェーダー言語の全体像](/graphics/shader/overview.html) · [マテリアル（材質）](/glossary/graphics.html#material) · [描画パイプライン](/glossary/graphics.html#pipeline) · [カーネル（GPU計算）](/glossary/graphics.html#kernel)

**出典**　[W3C WGSL Candidate Recommendation Draft（2026年11月6日）](https://www.w3.org/TR/2026/CRD-WGSL-20261106/) · [Unity 6.3 LTS — マテリアルとシェーダー](https://docs.unity.com/en-us/engine/6000.3/manual/materials-and-shaders/materials)

## ジャギー {#jaggies}

**Jaggies / Jagged Edges** ／ 読み じゃぎー

斜め線や曲線の輪郭が、画素の格子に沿った階段状に見える現象。

**例**　斜めの輪郭のジャギーをMSAA（Multisample Anti-Aliasing）で抑える。

**関連**　[アンチエイリアシングとMSAA](/graphics/postprocess/antialiasing.html) · [エイリアシング](/glossary/graphics.html#aliasing) · [画素（ピクセル）](/glossary/graphics.html#pixel)

**出典**　[Khronos OpenGL ES 3.0.6仕様 §3.3 Multisampling](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf) · [Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html)

## シャドウアクネ {#shadow-acne}

**Shadow Acne** ／ 読み しゃどうあくね

シャドウマップの精度やサンプリングの誤差で、光が当たる面に誤った自己遮蔽が点や縞として現れること。

**例**　斜めの壁にシャドウアクネが出たので、深度バイアスを調整する。

**関連**　[影とシャドウマッピング](/graphics/lighting/shadow.html) · [シャドウマップ](/glossary/graphics.html#shadow-map) · [ピーターパン（ピーターパニング）](/glossary/graphics.html#peter-panning)

**出典**　[Microsoft Direct3D 11 — Common Techniques to Improve Shadow Depth Maps](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps) · [Unity 6.3 LTS — Troubleshooting shadows](https://docs.unity3d.com/6000.3/Documentation/Manual/ShadowPerformance.html)

## シャドウマップ {#shadow-map}

**Shadow Map** ／ 読み しゃどうまっぷ

光源から見て最初に当たる面の深度を記録したテクスチャ。照らされる点の深度と比較し、光が遮られているかを調べる。

**例**　太陽光のシャドウマップを描いてから、カメラ側の描画で比較する。

**関連**　[影とシャドウマッピング](/graphics/lighting/shadow.html) · [シャドウアクネ](/glossary/graphics.html#shadow-acne) · [ピーターパン（ピーターパニング）](/glossary/graphics.html#peter-panning)

**出典**　[Microsoft Direct3D 11 — Common Techniques to Improve Shadow Depth Maps](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps) · [Unity 6.3 LTS — Troubleshooting shadows](https://docs.unity3d.com/6000.3/Documentation/Manual/ShadowPerformance.html)

## 詳細度（LOD） {#lod}

**Level of Detail (LOD)** ／ 読み しょうさいど / えるおーでぃー

画面上の大きさなどに応じて表現の細かさを変える仕組み。遠くの物体を少ない頂点で描くなど、負荷と見た目を調整する。

**この分野での意味**　テクスチャのサンプリングでは、どのミップレベルを使うか決める値もLODと呼ぶ。

**例**　遠景の木を低い詳細度のメッシュへ切り替える。

**関連**　[地形とバーチャルテクスチャ](/graphics/texture/terrain-and-virtual-texturing.html) · [ミップマップ](/glossary/graphics.html#mipmap) · [カリング](/glossary/graphics.html#culling)

**出典**　[Unity 6.3 LTS — Level of Detail](https://docs.unity3d.com/6000.3/Documentation/Manual/LevelOfDetail.html) · [Khronos OpenGL 4.6 Core仕様 §8 Textures](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf)

## スキニング {#skinning}

**Skinning / Skeletal Skinning** ／ 読み すきにんぐ

骨格の姿勢と頂点ごとの重みに従って、メッシュの頂点を変形させる処理。

**この分野での意味**　制作現場では、メッシュを骨格にバインドして重みを調整する作業もスキニングと呼ぶ。

**例**　GPUで腕の頂点をスキニングする。

**関連**　[リグ・骨格・スキニング](/graphics/basics/rigs-and-skinning.html) · [リギング](/glossary/graphics.html#rigging) · [ウェイト（重み）](/glossary/graphics.html#weight)

**出典**　[Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) · [Unity Animation Rigging 1.4 — Rigging Workflow](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/RiggingWorkflow.html)

## 接空間 {#tangent-space}

**Tangent Space** ／ 読み せっくうかん

表面の局所的な接線、従接線、法線を軸にした座標系。接空間法線マップはこの基準で法線の向きを保存する。

**例**　接空間で読んだ法線をTBN（Tangent、Bitangent、Normal）でワールド空間へ変換する。

**関連**　[法線マップと接空間](/graphics/shader/normal-mapping.html) · [法線マップ（ノーマルマップ）](/glossary/graphics.html#normal-map) · [UV座標](/glossary/graphics.html#uv)

**出典**　[Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) · [Morten S. Mikkelsen — MikkTSpace参照実装](https://github.com/mmikk/MikkTSpace/blob/master/mikktspace.h)

## Zファイティング {#z-fighting}

**Z-fighting / Depth Fighting** ／ 読み ぜっとふぁいてぃんぐ

同じか非常に近い深度にある面を深度バッファで安定して区別できず、表示が縞状に混じったりちらついたりする現象。

**例**　床の上に同じ高さの面を置いたらZファイティングが起きた。

**関連**　[ラスタライザーと深度](/graphics/pipeline/rasterization.html) · [フリッカー（ちらつき）](/glossary/graphics.html#flicker) · [ラスタライズ](/glossary/graphics.html#rasterize)

**出典**　[NVIDIA — Visualizing Depth Precision](https://developer.nvidia.com/blog/visualizing-depth-precision/) · [Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html)

## ディザ（ディザリング） {#dither}

**Dither / Dithering** ／ 読み でぃざ / でぃざりんぐ

近い色を細かなパターンやノイズとして分散させ、量子化による目立つ段差を粒状の変化に置き換える手法。

**この分野での意味**　不透明・透明の細かなパターンで、部分的な被覆や段階的な消失を表すこともある。

**例**　8ビットへ変換する前にディザを入れ、空の色の段差を目立ちにくくする。

**関連**　[色空間とHDR](/graphics/shader/color-space-and-hdr.html) · [バンディング（色の段差）](/glossary/graphics.html#banding) · [アルファテスト（アルファクリップ）](/glossary/graphics.html#alpha-test)

**出典**　[Blender 5.0 — Post Processing / Dither](https://docs.blender.org/manual/en/5.0/render/output/properties/post_processing.html) · [Unity 6.3 LTS — URPのLOD Cross Fade Dithering](https://docs.unity.com/ja-jp/engine/6000.3/manual/render-pipelines/universal-render-pipeline/urp-reference/universalrp-asset)

## テクスチャアトラス {#atlas}

**Texture Atlas / Sprite Atlas** ／ 読み てくすちゃあとらす / あとらす

複数の画像を大きなテクスチャの別々の領域へ詰めたもの。各画像はUVなどで自分の領域を指定して使う。

**例**　UIのアイコンを一つのアトラスに詰める。

**関連**　[材質・テクスチャ・シェーダーの基本](/graphics/basics/materials-textures-and-shaders.html) · [UV座標](/glossary/graphics.html#uv) · [バッチング](/glossary/graphics.html#batching)

**出典**　[Unity 6.3 LTS — スプライトアトラス](https://docs.unity.com/ja-jp/engine/6000.3/manual/unity2d/sprite/atlas/atlas-introduction)

## テクセル {#texel}

**Texel / Texture Element** ／ 読み てくせる

テクスチャを構成する一つの要素。色のほか、法線や深度などの値も格納できる。

**この分野での意味**　画面の画素とテクセルは別の格子にある。サンプリングでは一つの画素に複数のテクセルが寄与することがある。

**例**　バイリニアで近傍の4テクセルを混ぜる。

**関連**　[テクスチャのフィルタリングとミップマップ](/graphics/texture/texture-filtering-and-mipmaps.html) · [画素（ピクセル）](/glossary/graphics.html#pixel) · [UV座標](/glossary/graphics.html#uv)

**出典**　[Khronos OpenGL 4.6 Core仕様 §8 Textures](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf) · [Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

## トーンマッピング {#tone-mapping}

**Tone Mapping** ／ 読み とーんまっぴんぐ

描画結果の明るさを、表示先で扱える範囲や意図する見た目に合わせて変換する処理。

**例**　強い発光をトーンマッピングで圧縮し、明部の階調を残す。

**関連**　[色空間とHDR](/graphics/shader/color-space-and-hdr.html) · [HDR（ハイダイナミックレンジ）](/glossary/graphics.html#hdr) · [ポストプロセス](/glossary/graphics.html#post-process)

**出典**　[Unreal Engine 5.8 — Color Grading and the Filmic Tonemapper](https://dev.epicgames.com/documentation/unreal-engine/color-grading-and-the-filmic-tonemapper-in-unreal-engine?application_version=5.8) · [Microsoft DirectX — Advanced Color](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/high-dynamic-range)

## トポロジー {#topology}

**Topology / Mesh Topology / Primitive Topology** ／ 読み とぽろじー

メッシュでは頂点・辺・面がどうつながるかを指す。形状を変形しても、接続が同じならトポロジーは保たれる。

**この分野での意味**　描画APIのプリミティブトポロジーは、頂点列を点、線、三角形リストなどとして解釈する規則。

**例**　関節が曲がりやすいように面のつながりを作り直す。

**関連**　[モデルとメッシュ](/graphics/basics/models-and-meshes.html) · [ポリゴン](/glossary/graphics.html#polygon) · [クアッド（四角形）](/glossary/graphics.html#quad) · [トライアングル（三角形）](/glossary/graphics.html#triangle)

**出典**　[Autodesk Maya 2026 — Polygonal Modeling](https://help.autodesk.com/cloudhelp/2026/ENU/Maya-Modeling/files/GUID-7941F97A-36E8-47FE-95D1-71412A3B3017.htm) · [Khronos Vulkan 1.4 — Drawing Commands](https://docs.vulkan.org/spec/latest/chapters/drawing.html)

## トライアングル（三角形） {#triangle}

**Triangle / Tri** ／ 読み とらいあんぐる / さんかっけい

3頂点で構成する面。ゲーム描画の基本的なプリミティブの一つ。

**例**　四角形を二つのトライアングルに分けて描く。

**関連**　[頂点入力とインデックス描画](/graphics/mesh/vertex-and-index-input.html) · [ポリゴン](/glossary/graphics.html#polygon) · [クアッド（四角形）](/glossary/graphics.html#quad) · [ラスタライズ](/glossary/graphics.html#rasterize)

**出典**　[Khronos Vulkan 1.4 — Drawing Commands](https://docs.vulkan.org/spec/latest/chapters/drawing.html) · [Blender 5.0 — Mesh Primitives](https://docs.blender.org/manual/en/5.0/modeling/meshes/primitives.html)

## ドローコール {#draw-call}

**Draw Call** ／ 読み どろーこーる

頂点やインデックスを指定し、描画を指示するAPI呼び出しや記録済みの描画コマンド。

**例**　同じメッシュ100体をまとめ、1回のインスタンス描画で指示する。

**関連**　[頂点入力とインデックス描画](/graphics/mesh/vertex-and-index-input.html) · [バッチング](/glossary/graphics.html#batching) · [インスタンシング](/glossary/graphics.html#instancing)

**出典**　[Khronos Vulkan 1.4 — Drawing Commands](https://docs.vulkan.org/spec/latest/chapters/drawing.html) · [Unity 6.3 LTS — ドローコールの最適化方式](https://docs.unity3d.com/6000.3/Documentation/Manual/optimizing-draw-calls-choose-method.html)

## ノーマルの反転（法線の反転） {#flip-normal}

**Flip Normals / Reverse Normals** ／ 読み のーまるのはんてん / ほうせんのはんてん

法線ベクトルを逆向きにすること。モデリングツールの面の反転では、面の表裏を入れ替える場合もある。

**この分野での意味**　法線マップで「緑を反転する」は、接空間のY成分だけの符号を変えて規約を合わせる操作。面の表裏判定は通常、描画時の頂点の回り順で決まる。

**例**　消える面の表裏を確認し、法線マップの緑反転とは別に調べる。

**関連**　[法線マップと接空間](/graphics/shader/normal-mapping.html) · [法線マップ（ノーマルマップ）](/glossary/graphics.html#normal-map) · [カリング](/glossary/graphics.html#culling) · [接空間](/glossary/graphics.html#tangent-space)

**出典**　[Blender 5.0 — Editing Normals](https://docs.blender.org/manual/en/5.0/modeling/meshes/editing/mesh/normals.html) · [Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html) · [Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

## バッチング {#batching}

**Batching / Draw Batching** ／ 読み ばっちんぐ

複数の描画対象をまとめ、描画命令の発行や描画状態の切り替えにかかるコストを減らすこと。

**この分野での意味**　Unity 6.3 LTSの静的バッチングはメッシュをまとめる。SRP Batcherは描画状態の準備を効率化する機能で、ドローコール数を減らす仕組みとは役割が異なる。

**例**　材質をそろえてバッチにまとめる。

**関連**　[UnityのレンダラーとSRP](/graphics/engine/unity-renderer.html) · [ドローコール](/glossary/graphics.html#draw-call) · [インスタンシング](/glossary/graphics.html#instancing)

**出典**　[Unity 6.3 LTS — ドローコールの最適化方式](https://docs.unity3d.com/6000.3/Documentation/Manual/optimizing-draw-calls-choose-method.html)

## バンディング（色の段差） {#banding}

**Banding / Color Banding** ／ 読み ばんでぃんぐ / いろのだんさ

滑らかな色の勾配が、量子化などで帯状の段差に見える現象。

**例**　暗い空のグラデーションにバンディングが見える。

**関連**　[色空間とHDR](/graphics/shader/color-space-and-hdr.html) · [ディザ（ディザリング）](/glossary/graphics.html#dither) · [HDR（ハイダイナミックレンジ）](/glossary/graphics.html#hdr)

**出典**　[Blender 5.0 — Post Processing / Dither](https://docs.blender.org/manual/en/5.0/render/output/properties/post_processing.html) · [Microsoft DirectX — Advanced Color](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/high-dynamic-range)

## ハンドル（制作ツール） {#handle}

**Handle / Manipulator Handle** ／ 読み はんどる / そうさはんどる

制作画面でドラッグするなどして、物体の位置・向き・大きさや曲線の形を調整する操作部品。

**例**　X軸のハンドルをドラッグして、モデルを横に動かす。

**関連**　[座標変換とカメラ](/graphics/basics/transforms-and-cameras.html) · [リギング](/glossary/graphics.html#rigging)

**出典**　[Autodesk Maya 2026 — Scale handles](https://help.autodesk.com/cloudhelp/2026/ENU/Maya-Basics/files/GUID-09D0E733-74DF-44E2-937A-C857001E45B2.htm)

## ピーターパン（ピーターパニング） {#peter-panning}

**Peter Panning / Peter-panning** ／ 読み ぴーたーぱん / ぴーたーぱにんぐ

シャドウマップのバイアスなどで影が物体の接地位置から離れ、物体が浮いて見える現象。

**例**　アクネ対策でバイアスを上げすぎてピーターパニングが出た。

**関連**　[影とシャドウマッピング](/graphics/lighting/shadow.html) · [シャドウアクネ](/glossary/graphics.html#shadow-acne) · [シャドウマップ](/glossary/graphics.html#shadow-map)

**出典**　[Microsoft Direct3D 11 — Common Techniques to Improve Shadow Depth Maps](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps) · [Unity 6.3 LTS — Troubleshooting shadows](https://docs.unity3d.com/6000.3/Documentation/Manual/ShadowPerformance.html)

## 描画パイプライン {#pipeline}

**Graphics Pipeline / Rendering Pipeline** ／ 読み びょうがぱいぷらいん / れんだりんぐぱいぷらいん

頂点処理、ラスタライズ、フラグメント処理、出力の合成など、描画を構成する処理段階の連なり。

**この分野での意味**　描画APIでは一つのドローを設定するパイプラインを指す場合がある。エンジンでは影やライティングなど、複数のパスを実行する順序まで含めることがある。

**例**　パイプラインのどの段階で深度テストが行われるかを調べる。

**関連**　[レンダリングパイプライン](/graphics/pipeline/overview.html) · [シェーダー](/glossary/graphics.html#shader) · [描画パス（レンダーパス）](/glossary/graphics.html#pass)

**出典**　[Microsoft Direct3D 11 — Graphics pipeline](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-graphics-pipeline) · [Unreal Engine 5.8 — Post Process Materials](https://dev.epicgames.com/documentation/unreal-engine/post-process-materials-in-unreal-engine?application_version=5.8)

## 描画パス（レンダーパス） {#pass}

**Render Pass / Rendering Pass** ／ 読み びょうがぱす / れんだーぱす

描画や画像処理のひとまとまり。影の深度や最終色など、何を読み、どの描画先へ書くかで区切る。

**この分野での意味**　Vulkan 1.4では、アタッチメントやサブパスを記述するAPI上の構造もレンダーパスと呼ぶ。

**例**　影のパスで書いた深度テクスチャを、照明のパスで読む。

**関連**　[レンダーパスとアタッチメント](/graphics/optimization/render-pass-attachments.html) · [描画パイプライン](/glossary/graphics.html#pipeline) · [レンダーターゲット](/glossary/graphics.html#render-target)

**出典**　[Khronos Vulkan 1.4 — Render Pass](https://docs.vulkan.org/spec/latest/chapters/renderpass.html) · [Unreal Engine 5.8 — Post Process Materials](https://dev.epicgames.com/documentation/unreal-engine/post-process-materials-in-unreal-engine?application_version=5.8)

## フィルレート {#fill-rate}

**Fill Rate / Pixel Fill Rate** ／ 読み ふぃるれーと

GPUが単位時間に処理または出力できる画素やサンプルの量を表す性能指標。測定条件や数え方は資料ごとに確認する。

**例**　解像度を下げると軽くなったので、フィルレートや帯域を調べる。

**関連**　[GPU最適化の基礎](/graphics/optimization/basics.html) · [オーバードロー](/glossary/graphics.html#overdraw) · [画素（ピクセル）](/glossary/graphics.html#pixel)

**出典**　[Arm — Fill rateとオーバードロー](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/of-philosophy-and-when-is-a-pixel-not-a-pixel) · [NVIDIA GPU Gems 3 — High-Speed, Off-Screen Particles](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles)

## フラグメント {#fragment}

**Fragment** ／ 読み ふらぐめんと

プリミティブをラスタライズして得る、画面上の位置・深度・補間された属性を持つ描画候補。

**この分野での意味**　同じ画素に複数のフラグメントが対応し、深度テストなどを経て結果が書き込まれる。通常のマルチサンプリングでは一つのフラグメントが複数のサンプルを覆うこともある。

**例**　奥の面のフラグメントが深度テストで除かれる。

**関連**　[フラグメントシェーダー](/graphics/pipeline/fragment-shader.html) · [画素（ピクセル）](/glossary/graphics.html#pixel) · [ラスタライズ](/glossary/graphics.html#rasterize)

**出典**　[Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html) · [Khronos Vulkan 1.4 — The Framebuffer](https://docs.vulkan.org/spec/latest/chapters/framebuffer.html)

## フリッカー（ちらつき） {#flicker}

**Flicker / Flickering / Shimmering** ／ 読み ふりっかー / ちらつき

連続するフレームで明るさや模様が不安定に変わり、ちらついて見える現象。

**この分野での意味**　細い模様が画素の格子をまたぐときに出るものは、時間方向に現れたエイリアシングの一例。

**例**　カメラを動かすと遠くの金網がちらつく。

**関連**　[TAAとフレーム履歴](/graphics/postprocess/taa.html) · [エイリアシング](/glossary/graphics.html#aliasing) · [ゴースト（残像）](/glossary/graphics.html#ghosting) · [ミップマップ](/glossary/graphics.html#mipmap)

**出典**　[Unreal Engine 5.8 — Temporal Super Resolution](https://dev.epicgames.com/documentation/unreal-engine/temporal-super-resolution-in-unreal-engine?application_version=5.8) · [Khronos OpenGL 4.6 Core仕様 §8 Textures](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf)

## ブリット {#blit}

**Blit / Bit Block Transfer (BitBlt)** ／ 読み ぶりっと

画像の指定領域をまとめて別の画像や描画先へ転送すること。

**この分野での意味**　2Dでは矩形転送を指す。GPUでは拡縮やフィルター付きの転送命令や、テクスチャを読み込んで描画先へ書くパスも指す。

**例**　オフスクリーンで作った画像を表示用のバッファへブリットする。

**関連**　[レンダーターゲットを次のパスで使う](/graphics/postprocess/render-to-texture.html) · [レンダーターゲット](/glossary/graphics.html#render-target) · [描画パス（レンダーパス）](/glossary/graphics.html#pass)

**出典**　[Microsoft Win32 GDI — BitBlt](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-bitblt) · [Khronos Vulkan 1.4 — vkCmdBlitImage](https://docs.vulkan.org/refpages/latest/refpages/source/vkCmdBlitImage.html) · [Unreal Engine 5.8 — Post Process Effects](https://dev.epicgames.com/documentation/unreal-engine/post-process-effects-in-unreal-engine?application_version=5.8)

## プリマルチプライドアルファ（乗算済みアルファ） {#premultiplied-alpha}

**Premultiplied Alpha / Associated Alpha** ／ 読み ぷりまるちぷらいどあるふぁ / じょうざんずみあるふぁ

RGBにアルファをあらかじめ掛けた表現。合成式では、手前の乗算済みRGBに背景側の寄与を加える。

**例**　透明な縁を補間しても余計な色がにじまないよう、乗算済みの色を使う。

**関連**　[出力マージャー](/graphics/pipeline/output-merger.html) · [アルファブレンド](/glossary/graphics.html#alpha-blend) · [リニア（色）](/glossary/graphics.html#linear)

**出典**　[W3C Compositing and Blending Level 1 — Simple Alpha Compositing](https://www.w3.org/TR/compositing-1/#simplealphacompositing) · [Khronos Vulkan 1.4 — The Framebuffer](https://docs.vulkan.org/spec/latest/chapters/framebuffer.html)

## フレーム（描画） {#frame}

**Frame / Rendered Frame** ／ 読み ふれーむ / びょうがふれーむ

連続して描画・表示する画像のうちの1枚、またはその1枚に対応する描画処理の単位。

**この分野での意味**　画面に表示した枚数、アプリが描画した枚数、ゲーム状態を更新したティック数は、別々に数える場合がある。

**例**　前のフレームの色を使ってちらつきを抑える。

**関連**　[フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html) · [描画パス（レンダーパス）](/glossary/graphics.html#pass) · [ゴースト（残像）](/glossary/graphics.html#ghosting)

**出典**　[Microsoft DXGI — IDXGISwapChain::Present](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-idxgiswapchain-present) · [Unreal Engine 5.8 — Temporal Super Resolution](https://dev.epicgames.com/documentation/unreal-engine/temporal-super-resolution-in-unreal-engine?application_version=5.8)

## ブレンド {#blend}

**Blending** ／ 読み ぶれんど

新しい描画結果と、描画先にすでにある値を指定した式で合成する処理。

**この分野での意味**　アニメーションでも、複数の姿勢や動きの結果を混ぜることを指す。

**例**　火花を加算ブレンドで重ねる。

**関連**　[出力マージャー](/graphics/pipeline/output-merger.html) · [アルファブレンド](/glossary/graphics.html#alpha-blend) · [プリマルチプライドアルファ（乗算済みアルファ）](/glossary/graphics.html#premultiplied-alpha)

**出典**　[Khronos Vulkan 1.4 — The Framebuffer](https://docs.vulkan.org/spec/latest/chapters/framebuffer.html) · [Unity 6.3 LTS — Animation Blend Trees](https://docs.unity3d.com/6000.3/Documentation/Manual/class-BlendTree.html)

## ベイク（焼き込み） {#bake}

**Bake / Baking** ／ 読み べいく / やきこみ

照明、材質、変形などの計算結果を事前に求め、再利用できるデータとして保存すること。

**この分野での意味**　ライティングでは結果をライトマップなどへ記録する。DCC（Digital Content Creation、デジタルコンテンツ制作）ではAOや法線をテクスチャに、シミュレーション結果をキャッシュに、動きをキーフレームなどに固定する。

**例**　壁の照明をライトマップにベイクする。布のシミュレーションをベイクして再生する。

**関連**　[グローバルイルミネーション](/graphics/lighting/gi.html) · [ライトマップ](/glossary/graphics.html#lightmap) · [アンビエントオクルージョン（AO）](/glossary/graphics.html#ao) · [法線マップ（ノーマルマップ）](/glossary/graphics.html#normal-map)

**出典**　[Unity 6.3 LTS — ライトマップのベイク](https://docs.unity3d.com/6000.3/Documentation/Manual/Lightmapping.html) · [Blender 5.0 — Render Baking](https://docs.blender.org/manual/en/5.0/render/cycles/baking.html) · [Blender 5.2 LTS — Baking Physics Simulations](https://docs.blender.org/manual/en/5.2/physics/baking.html) · [Autodesk Maya 2023 — HumanIKのベイク](https://help.autodesk.com/cloudhelp/2023/ENU/Maya-CharacterAnimation/files/GUID-1704AD41-8435-4AD4-AF29-43EF13803EAC.htm)

## 法線マップ（ノーマルマップ） {#normal-map}

**Normal Map** ／ 読み ほうせんまっぷ / のーまるまっぷ

照明計算に使う法線の向きを記録するテクスチャ。頂点の位置を保ったまま、表面の細かい起伏の陰影を表せる。

**例**　高ポリゴンの溝を低ポリゴンモデル用の法線マップにベイクする。

**関連**　[法線マップと接空間](/graphics/shader/normal-mapping.html) · [接空間](/glossary/graphics.html#tangent-space) · [ベイク（焼き込み）](/glossary/graphics.html#bake) · [ノーマルの反転（法線の反転）](/glossary/graphics.html#flip-normal)

**出典**　[Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) · [Blender 5.0 — Render Baking](https://docs.blender.org/manual/en/5.0/render/cycles/baking.html)

## ポストプロセス {#post-process}

**Post-processing / Post-process Effect** ／ 読み ぽすとぷろせす

シーンを描いた途中結果や画像に対して行う後処理。色調整、被写界深度、モーションブラーなどがある。

**例**　トーンマッピングをポストプロセスで行う。

**関連**　[ポストプロセスの全体像](/graphics/postprocess/overview.html) · [描画パス（レンダーパス）](/glossary/graphics.html#pass) · [トーンマッピング](/glossary/graphics.html#tone-mapping) · [ブリット](/glossary/graphics.html#blit)

**出典**　[Unreal Engine 5.8 — Post Process Effects](https://dev.epicgames.com/documentation/unreal-engine/post-process-effects-in-unreal-engine?application_version=5.8)

## ポリゴン {#polygon}

**Polygon / Polygon Face** ／ 読み ぽりごん

メッシュを構成する多角形の面。三角形や四角形もポリゴンに含まれる。

**この分野での意味**　ゲームの負荷やモデルの仕様で「ポリゴン数」と言うと、描画用の三角形数を指すことがある。

**例**　制作時の面数と、三角形に分けた後の面数を別々に確認する。

**関連**　[モデルとメッシュ](/graphics/basics/models-and-meshes.html) · [トライアングル（三角形）](/glossary/graphics.html#triangle) · [クアッド（四角形）](/glossary/graphics.html#quad) · [トポロジー](/glossary/graphics.html#topology)

**出典**　[Autodesk Maya 2026 — Polygonal Modeling](https://help.autodesk.com/cloudhelp/2026/ENU/Maya-Modeling/files/GUID-7941F97A-36E8-47FE-95D1-71412A3B3017.htm) · [Khronos Vulkan 1.4 — Drawing Commands](https://docs.vulkan.org/spec/latest/chapters/drawing.html)

## マテリアル（材質） {#material}

**Material** ／ 読み まてりある / ざいしつ

表面の見た目を決めるテクスチャや色、粗さなどの設定。エンジンでは、使用するシェーダーや描画設定と結び付けて扱う。

**例**　同じシェーダーで、粗さだけ異なる二つのマテリアルを作る。

**関連**　[材質・テクスチャ・シェーダーの基本](/graphics/basics/materials-textures-and-shaders.html) · [シェーダー](/glossary/graphics.html#shader) · [ルックデヴ](/glossary/graphics.html#look-dev)

**出典**　[Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) · [Unity 6.3 LTS — マテリアルとシェーダー](https://docs.unity.com/en-us/engine/6000.3/manual/materials-and-shaders/materials)

## ミップマップ {#mipmap}

**Mipmap / MIP Map** ／ 読み みっぷまっぷ

元のテクスチャから小さい画像を段階的に用意したもの。縮小表示で適した段を読むと、細かい模様のちらつきを抑えられる。

**例**　奥の床では粗いミップを読む。

**関連**　[テクスチャのフィルタリングとミップマップ](/graphics/texture/texture-filtering-and-mipmaps.html) · [詳細度（LOD）](/glossary/graphics.html#lod) · [テクセル](/glossary/graphics.html#texel) · [エイリアシング](/glossary/graphics.html#aliasing)

**出典**　[Khronos OpenGL 4.6 Core仕様 §8 Textures](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf)

## UV座標 {#uv}

**UV Coordinates / Texture Coordinates** ／ 読み ゆーぶいざひょう / ゆーぶい

表面のどこにテクスチャを貼るかを表す2次元座標。UとVは画像上の二つの軸を指す。

**例**　UVの継ぎ目で同じ頂点位置に別のテクスチャ座標を割り当てる。

**関連**　[材質・テクスチャ・シェーダーの基本](/graphics/basics/materials-textures-and-shaders.html) · [テクセル](/glossary/graphics.html#texel) · [テクスチャアトラス](/glossary/graphics.html#atlas) · [接空間](/glossary/graphics.html#tangent-space)

**出典**　[Khronos glTF 2.0仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

## ライトマップ {#lightmap}

**Lightmap** ／ 読み らいとまっぷ

表面に当たる光の事前計算結果を、面に対応するテクスチャへ記録したもの。描画時にその値を読み取る。

**例**　建物用のライトマップUVを分ける。

**関連**　[グローバルイルミネーション](/graphics/lighting/gi.html) · [ベイク（焼き込み）](/glossary/graphics.html#bake) · [UV座標](/glossary/graphics.html#uv)

**出典**　[Unity 6.3 LTS — ライトマップのベイク](https://docs.unity3d.com/6000.3/Documentation/Manual/Lightmapping.html)

## ラスタライズ {#rasterize}

**Rasterize / Rasterization** ／ 読み らすたらいず

投影された三角形などが画面上のどのサンプル位置を覆うかを求め、フラグメントを作る処理。

**例**　三角形をラスタライズして、覆ったサンプルの深度を調べる。

**関連**　[ラスタライザー](/graphics/pipeline/rasterization.html) · [フラグメント](/glossary/graphics.html#fragment) · [トライアングル（三角形）](/glossary/graphics.html#triangle)

**出典**　[Khronos Vulkan 1.4 — Rasterization](https://docs.vulkan.org/spec/latest/chapters/primsrast.html)

## リギング {#rigging}

**Rigging** ／ 読み りぎんぐ

モデルを動かすため、骨格、操作用のコントローラー、関節の制約などを組み立てる作業。

**例**　手のコントローラーで腕が追従するようにリギングする。

**関連**　[リグ・骨格・スキニング](/graphics/basics/rigs-and-skinning.html) · [スキニング](/glossary/graphics.html#skinning) · [ウェイト（重み）](/glossary/graphics.html#weight) · [ハンドル（制作ツール）](/glossary/graphics.html#handle)

**出典**　[Unity Animation Rigging 1.4 — Rigging Workflow](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/RiggingWorkflow.html)

## リターゲット {#retarget}

**Retarget / Animation Retargeting** ／ 読み りたーげっと

あるキャラクターの動きを、関節の対応や体格の違いを扱いながら別の骨格へ移すこと。

**例**　収録した走りを、脚の長さが違うキャラクターにリターゲットする。

**関連**　[アニメーションシステム](/graphics/basics/animation-systems.html) · [リギング](/glossary/graphics.html#rigging) · [スキニング](/glossary/graphics.html#skinning)

**出典**　[Unity 6.3 LTS — Humanoidアニメーションのリターゲット](https://docs.unity3d.com/6000.3/Documentation/Manual/Retargeting.html)

## リニア（色） {#linear}

**Linear Light / Linear RGB** ／ 読み りにあ / りにあしょく

数値が光量に比例する表現。同じ色成分を2倍にすると、その成分の光量も2倍になる。

**この分野での意味**　リニアフィルタリングの「リニア」は補間方法を指す。色がリニアかどうかはデータの符号化で決まる。

**例**　色をリニアにしてから二つのライトの寄与を足す。

**関連**　[色空間とHDR](/graphics/shader/color-space-and-hdr.html) · [ガンマ](/glossary/graphics.html#gamma) · [HDR（ハイダイナミックレンジ）](/glossary/graphics.html#hdr)

**出典**　[W3C CSS Color Level 4 — 色の変換コード](https://www.w3.org/TR/css-color-4/#color-conversion-code) · [Microsoft DirectX — Advanced Color](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/high-dynamic-range) · [Khronos OpenGL 4.6 Core仕様 §8 Textures](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf)

## ルックデヴ {#look-dev}

**Look Development / Lookdev** ／ 読み るっくでぶ / るっくでゔ

材質、テクスチャ、照明などを試し、対象をどんな見た目に仕上げるかを詰める作業。

**例**　照明条件を切り替えて、金属の粗さをルックデヴで決める。

**関連**　[PBRと材質のパラメーター](/graphics/lighting/pbr.html) · [マテリアル（材質）](/glossary/graphics.html#material) · [シェーダー](/glossary/graphics.html#shader)

**出典**　[Autodesk Maya 2026 — Hypershadeでのルックデヴ](https://help.autodesk.com/cloudhelp/2026/ENU/Maya-LightingShading/files/GUID-164E40B5-28E5-41AD-B573-AE33004DD6FB.htm)

## レンダーターゲット {#render-target}

**Render Target / Color Attachment** ／ 読み れんだーたーげっと

描画結果を書き込む先の画像。色の出力先を指すことが多く、別のパスからテクスチャとして読む用途にも使える。

**例**　反射用の画像をオフスクリーンのレンダーターゲットに描く。

**関連**　[レンダーターゲットを次のパスで使う](/graphics/postprocess/render-to-texture.html) · [描画パス（レンダーパス）](/glossary/graphics.html#pass) · [ブリット](/glossary/graphics.html#blit) · [Gバッファ](/glossary/graphics.html#g-buffer)

**出典**　[Khronos Vulkan 1.4 — Render Pass](https://docs.vulkan.org/spec/latest/chapters/renderpass.html) · [Khronos Vulkan 1.4 — The Framebuffer](https://docs.vulkan.org/spec/latest/chapters/framebuffer.html)
