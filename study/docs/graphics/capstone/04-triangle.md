---
title: 4. 最初の三角形からメッシュ描画へ
study:
  source: RenderingWiki
  status: published
  summary: グラフィックスプログラミングの通過儀礼 — 三角形 — を経て、glTFメッシュをカメラ付きで描画するまで。 第2章の数学 と 第3章のパイプライン がコードとして結晶するステップです。
  section: practice
  format: tutorial
  domain: graphics
  collection: renderer-project
  order: 4
---

# 4. 最初の三角形からメッシュ描画へ

## このステップの目標

グラフィックスプログラミングの通過儀礼 — **三角形** — を経て、glTFメッシュをカメラ付きで描画するまで。 [座標変換](/math/rendering/transform.html) と [パイプライン全体像](/graphics/pipeline/overview.html) がコードとして結晶するステップです。

## 4.1 三角形 — 頂点バッファなしの最小構成

まず「パイプラインが動く」ことだけを検証します。頂点データはシェーダ内に埋め込みます ([Vertex Pulling](/graphics/pipeline/vertex-shader.html) の最小例):

```hlsl
// triangle.vert.hlsl — dxc -spirv -T vs_6_0 でコンパイル
static const float2 kPos[3] = { {0.0, 0.5}, {0.5, -0.5}, {-0.5, -0.5} };
static const float3 kCol[3] = { {1,0,0}, {0,1,0}, {0,0,1} };

struct VSOut { float4 pos : SV_Position; float3 color : COLOR0; };

VSOut main(uint vid : SV_VertexID) {
    VSOut o;
    o.pos = float4(kPos[vid], 0.0, 1.0);   // クリップ空間に直接出す
    o.color = kCol[vid];
    return o;
}
```

```hlsl
// triangle.frag.hlsl
float4 main(float4 pos : SV_Position, float3 color : COLOR0) : SV_Target0 {
    return float4(color, 1.0);   // ラスタライザが補間した色 (rasterization章)
}
```

描画コマンドの断片です。第2ステップのtransfer clearを、このcolor attachment描画へ置き換えます。swapchain画像を `COLOR_ATTACHMENT_OPTIMAL` へ遷移し、`renderingInfo` のcolor attachmentに対応view・`loadOp=CLEAR`・`storeOp=STORE`を設定します。trianglePSOのattachment formatも同じswapchain formatにします。acquire semaphoreは `COLOR_ATTACHMENT_OUTPUT` で待ち、最初のbarrierは `COLOR_ATTACHMENT_OUTPUT/NONE → COLOR_ATTACHMENT_OUTPUT/COLOR_ATTACHMENT_WRITE`、最後は同stage/accessから `PRESENT_SRC_KHR` への遷移です:

```cpp
vkCmdBeginRendering(cmd, &renderingInfo);      // Dynamic Rendering
vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, trianglePSO);
vkCmdSetViewport(cmd, 0, 1, &viewport);        // Dynamic Stateにしておくと楽
vkCmdSetScissor(cmd, 0, 1, &scissor);
vkCmdDraw(cmd, 3, 1, 0, 0);                    // 頂点3つ、バッファなし!
vkCmdEndRendering(cmd);
```

**三角形が出たら祝杯を。** ここまでの数百行が、OpenGLの50行 ([比較ページ](/graphics/api/comparison.html)) の裏側でドライバがしていた仕事の全貌です。

### 出ないときのデバッグ手順 ([tools章](/graphics/optimization/tools.html) の実践)

1. 検証レイヤのメッセージを全部読む
2. RenderDocでキャプチャ → Event Browserに `vkCmdDraw` はあるか
3. Pipeline Stateで: ビューポートは正しいか / カリングで消えていないか (`cullMode=NONE` にして切り分け) / RTフォーマットとPSOは一致しているか
4. Mesh ViewerでVS出力座標を確認 — クリップ空間 [-1,1] に収まっているか

## 4.2 深度バッファとReverse-Z

メッシュ描画の前に深度を導入します ([出力結合](/graphics/pipeline/output-merger.html)):

```cpp
// D32_SFLOAT の深度イメージを作成し、Dynamic Renderingに接続
VkRenderingAttachmentInfo depthAtt{VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO};
depthAtt.imageView = depthView;
depthAtt.imageLayout = VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL;
depthAtt.loadOp  = VK_ATTACHMENT_LOAD_OP_CLEAR;
depthAtt.storeOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;  // フレーム外で使わない
depthAtt.clearValue.depthStencil = {0.0f, 0};         // Reverse-Z: クリアは0!
```

- PSOは `GREATER` 比較 ([3. リソース](/graphics/capstone/03-resources.html) で設定済み)
- 射影行列はReverse-Z無限遠版 ([カメラと射影](/math/rendering/camera.html) のコードをそのまま使用)

## 4.3 カメラとMVP — 数学の結線

```cpp
struct CameraUBO {
    glm::mat4 view;
    glm::mat4 proj;         // Reverse-Z + Vulkan Y反転込み
    glm::vec4 cameraPosWS;
};

void UpdateCamera(uint32_t frameSlot) {
    CameraUBO ubo;
    ubo.view = glm::lookAt(camPos, camPos + camForward, {0,1,0});
    ubo.proj = PerspectiveReverseZInfinite(glm::radians(60.f), aspect, 0.1f);
    ubo.proj[1][1] *= -1.0f;              // Vulkan: NDCのY反転 (transform章)
    ubo.cameraPosWS = glm::vec4(camPos, 1);
    memcpy(cameraUBO[frameSlot].mapped, &ubo, sizeof(ubo));  // 多重化スロットへ
}
```

マウスでヨー/ピッチ、WASDで移動のFPSカメラを [クォータニオン](/math/rendering/quaternion.html) または球面座標で実装します。

## 4.4 メッシュ描画

```hlsl
// mesh.vert.hlsl — 座標変換の実践 (transform章の変数命名規約)
struct Camera { float4x4 view; float4x4 proj; float4 cameraPosWS; };
[[vk::binding(0, 0)]] ConstantBuffer<Camera> gCamera;

struct Push { float4x4 world; };
[[vk::push_constant]] Push gPush;

struct VSIn {
    float3 positionOS : POSITION;
    float3 normalOS   : NORMAL;
    float4 tangentOS  : TANGENT;
    float2 uv         : TEXCOORD0;
};
struct VSOut {
    float4 positionCS : SV_Position;
    float3 positionWS : TEXCOORD1;
    float3 normalWS   : NORMAL;
    float4 tangentWS  : TANGENT;
    float2 uv         : TEXCOORD0;
};

VSOut main(VSIn i) {
    VSOut o;
    float3 posWS = mul(gPush.world, float4(i.positionOS, 1)).xyz;
    o.positionWS = posWS;
    o.positionCS = mul(gCamera.proj, mul(gCamera.view, float4(posWS, 1)));
    o.normalWS   = normalize(mul((float3x3)gPush.world, i.normalOS));
    o.tangentWS  = float4(normalize(mul((float3x3)gPush.world, i.tangentOS.xyz)),
                          i.tangentOS.w);
    o.uv = i.uv;
    return o;
}
```

描画ループの断片 (マテリアル別にセットを差し替え)。第3ステップのpbrPSOはFP16のHDR画像向けなので、完成構成ではその画像へ描き、第5ステップの最終FSでsRGB swapchainへ出力します。確認用にswapchainへ直接描くなら、同じattachment formatのdebug用PSOを別に作り、FP16用pbrPSOをそのままbindしないでください:

```cpp
vkCmdBindDescriptorSets(cmd, GRAPHICS, layout, 0, 1, &frameSet[slot], 0, nullptr);
for (auto& obj : scene.objects) {
    vkCmdPushConstants(cmd, layout, VK_SHADER_STAGE_VERTEX_BIT,
                       0, sizeof(glm::mat4), &obj.world);
    VkDeviceSize ofs = 0;
    vkCmdBindVertexBuffers(cmd, 0, 1, &obj.mesh->vb.buffer, &ofs);
    vkCmdBindIndexBuffer(cmd, obj.mesh->ib.buffer, 0, VK_INDEX_TYPE_UINT32);
    for (auto& prim : obj.mesh->primitives) {
        vkCmdBindDescriptorSets(cmd, GRAPHICS, layout, 1, 1,
                                &materials[prim.materialIndex].set, 0, nullptr);
        vkCmdDrawIndexed(cmd, prim.indexCount, 1, prim.firstIndex, 0, 0);
    }
}
```

まずFragment Shaderで `return float4(normalWS * 0.5 + 0.5, 1)` と**法線を色で出す**のが定石 — 変換の正しさが一目で分かります ([printfデバッグの色版](/graphics/optimization/tools.html))。

## 4.5 ここまでの確認ポイント

- [ ] メッシュが正しい向き・比率で表示される (歪む→行列の転置/積順序を疑う → [行列](/math/rendering/matrix.html))
- [ ] カメラを回してもライティング前の法線色が安定している
- [ ] 手前の物が奥の物を隠す (深度が効いている)
- [ ] 裏面カリングが正しい (メッシュに穴→ワインディングとカルモードの不整合 → [ラスタライゼーション](/graphics/pipeline/rasterization.html))
- [ ] RenderDocのMesh ViewerでVS入出力が期待通り

## 前提知識

- [2. デバイス初期化](/graphics/capstone/02-device.html), [3. リソース](/graphics/capstone/03-resources.html)
- [座標変換](/math/rendering/transform.html), [カメラと射影](/math/rendering/camera.html)

## 次に読むべきページ

- [5. 1フレーム完全実装 — 影・ライト・ポスト](/graphics/capstone/05-frame.html)

## 理解度チェック

1. **三角形を頂点バッファなしで描けるのはなぜか。この仕組みの実用的な用途を2つ挙げよ。**
   ::: details 解答
   VSはSV_VertexIDを受け取って「何らかの方法で」クリップ空間座標を返せばよく、頂点データの出所は問わない(配列リテラル、バッファ、計算生成のいずれでも)。用途: (1)フルスクリーン三角形(ポストプロセスで頂点バッファ不要の定石)、(2)GPU Drivenレンダリングでの Vertex Pulling(StructuredBufferから自由なフォーマットでフェッチ)。
   :::

2. **`proj[1][1] *= -1` が必要な理由と、これを行わない別解を述べよ。**
   ::: details 解答
   VulkanのNDCはYが下向きで、GL/DX慣習の射影行列をそのまま使うと画面が上下反転する。行列のY行を反転して吸収するのが一つの解。別解はネガティブビューポート(heightに負値を渡しyを下端に設定、VK_KHR_maintenance1)でビューポート変換段階で反転する方法。どちらの場合もワインディング順序(カリング)への影響を整合させる必要がある。
   :::

3. **「まず法線を色で出す」デバッグがなぜ有効か。**
   ::: details 解答
   ライティングのバグは「行列・空間の誤り」「法線データの誤り」「BRDF計算の誤り」が複合して見分けにくい。法線の色出しはライティング以前の変換系だけを分離検証でき、期待される色(上向き面=緑っぽい等)が直感で分かる。カメラを回して色が変わらないことでワールド空間変換の正しさも確認できる。問題を層に分けて切り分ける基本手法。
   :::

## 参考資料

- vkguide.dev chapter 3 (メッシュ描画) — 同構成の英語版
- RenderDoc *Mesh Viewer* ドキュメント
- glTF Sample Models (Khronos) — テスト用アセット集
- [Khronos Vulkan Guide: Swapchain Semaphore Reuse](https://docs.vulkan.org/guide/latest/swapchain_semaphore_reuse.html)
- [Khronos Vulkan Guide: Synchronization Examples](https://docs.vulkan.org/guide/latest/synchronization_examples.html)
- [Microsoft: Converting data for the color space](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/converting-data-color-space)
