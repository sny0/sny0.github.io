---
title: 斜めの床でテクスチャのフィルタリングを比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: texture-filtering-observation
  order: 1
  summary: WebGL 2で同じ床を描き、ポイント、バイリニア、トライリニア、異方性を切り替えて遠くの模様を観察する。
  aliases: [テクスチャの実践, WebGL 2, ポイント, バイリニア, トライリニア, ミップマップ, 異方性, ちらつき]
  verification: KhronosのWebGL 2.0と異方性フィルタリング拡張仕様に照合（2026-11-13）
---

# 斜めの床でテクスチャのフィルタリングを比べる

[テクスチャのフィルタリングとミップマップ](/graphics/texture/texture-filtering-and-mipmaps.html)で説明した4種類の方法を、同じ床で比べます。手前の模様、奥の模様、カメラを動かしたときの変化を順に見ます。

<a href="/study/samples/graphics/texture-filtering-observation/index.html" target="_self">床のフィルタリング比較を開く</a>

## 同じ位置で見比べる

1. 初期状態の**ポイント**で、手前の模様の境目と、遠くに見える模様を覚えておきます。
2. カメラを停止したまま**バイリニア**に切り替えます。手前で境目がどう変わり、奥にどんな模様が残るかを見ます。
3. **トライリニア（ミップマップ）**に切り替え、床の奥で細かい模様がならされる様子を確認します。
4. **異方性**を選べる場合は、床の奥へ伸びる細い縞に注目します。横に並んだ縞をどこまで見分けられるか、トライリニアと比べます。

## カメラを動かして、ちらつきを見る

**カメラを横に動かす**をオンにして、遠くの同じ範囲に目を向けます。ポイントとバイリニアでは、静止時に見えていた模様が動いたり、明滅したりする場合があります。トライリニアに切り替えると、模様の細かい変化がどの程度減るか比べられます。

カメラを再び停止すると初期位置に戻るので、同じ位置から比較できます。床の形、UV、テクスチャは共通です。表示の違いは画面の解像度やGPU・ブラウザーの実装にもよるので、奥の模様が変化する場所を目印にします。

## WebGLで変えている設定

縮小時の設定を変えるのは `TEXTURE_MIN_FILTER` です。`generateMipmap` で用意した縮小画像は、トライリニアと異方性で使います。異方性モードではトライリニアの設定を使い、`TEXTURE_MAX_ANISOTROPY_EXT` に実装の上限と8の小さい方を設定します。拡張が使えないか上限が1以下の場合、画面に理由が表示され、残り3種類を試せます。WebGL 2を使えない場合も、起動時に状態を表示します。

| 観察 | 対応する設定 |
| --- | --- |
| 元画像から1テクセルを選ぶ | `NEAREST` |
| 元画像の周囲を混ぜる | `LINEAR` |
| 複数の解像度を使って混ぜる | `LINEAR_MIPMAP_LINEAR` |
| 細長い範囲に合わせる | `EXT_texture_filter_anisotropic` |

## 理解度チェック

1. カメラを止めて見比べると、何をそろえた状態でフィルターを比べられますか。

   ::: details 解答
   床の形、テクスチャ、カメラの位置がそろいます。同じ画面上の位置で、設定を変えたときの見え方を比較できます。
   :::

2. 奥の床で、ポイントよりトライリニアの方が安定して見えました。何が変わりましたか。

   ::: details 解答
   トライリニアは縮小した画像を使い、1画素が覆う広い範囲の色を反映します。元画像の一点を選んだときに生じる急な色の切り替わりが抑えられます。
   :::

## 関連項目

- [テクスチャのフィルタリングとミップマップ](/graphics/texture/texture-filtering-and-mipmaps.html)で、1画素が覆う範囲とLODを確認する。
- [3DCG・描画ロードマップの「レンダリングパイプライン」](/learn/roadmap.html?node=gfx-pipeline#graphics)

## 参考資料

- [Khronos — WebGL 2.0 Specification](https://registry.khronos.org/webgl/specs/latest/2.0/) · [OpenGL ES 3.0.6 Specification](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf) · [WebGL EXT_texture_filter_anisotropic](https://registry.khronos.org/webgl/extensions/EXT_texture_filter_anisotropic/)
