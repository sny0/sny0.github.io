---
title: MSAAを切り替えて輪郭と床模様を見比べる
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: msaa-observation
  order: 1
  summary: 同じシーンを単一サンプルとMSAAで描き、ポリゴンの斜めの輪郭と、床の模様のちらつきを比べる。
  aliases: [MSAAの実践, WebGL 2, アンチエイリアシング, カバレッジ, リゾルブ]
  verification: KhronosのOpenGL ES 3.0.6・WebGL 2.0仕様に照合（2026-11-13）
---

# MSAAを切り替えて輪郭と床模様を見比べる

単色のポリゴンと、斜めから見た市松模様の床を描きます。MSAAのオン・オフで何が変わるか、輪郭と床の奥を順に観察します。[アンチエイリアシングの記事](/graphics/postprocess/antialiasing.html)で、輪郭と模様が異なる理由を図解しています。

<a href="/study/samples/graphics/msaa-observation/index.html" target="_self">MSAAの比較デモを開く</a>

## ポリゴンの輪郭を見る

1. カメラを止めた状態で、MSAAをオフにします。黄色い三角形の斜めの辺が、画素ごとにどんな階段を作るか見ます。
2. MSAAをオンにして、同じ辺を見ます。ポリゴン色と背景色の間に中間色の画素が加わります。
3. 画面のサンプル数を確認します。オフは1サンプル、オンは環境が確保できたサンプル数を表示します。利用できない場合は理由が表示されます。

描画解像度は両方とも同じです。画素の違いが見えるよう、描いた画像を拡大して表示しています。

## 床模様のちらつきを見る

「カメラを横に動かす」をオンにして、三角形の輪郭から離れた床の奥を見ます。MSAAをオンにしても、床の奥には模様の明滅が残ります。このデモは、床を両方ともポイントサンプリングで描きます。床の内側では同じポリゴンが画素を覆い、模様が変わる原因はテクスチャを読む位置にあります。

床の方を改善する設定は、[斜めの床でフィルタリングを比べる実践](/practice/graphics/texture-filtering-observation.html)で試せます。そこでは床の奥を見たまま、ポイントからトライリニア（ミップマップ）へ切り替えられます。

## WebGL 2で切り替えている処理

| 設定 | シーンの描画先 | 表示までの処理 |
| --- | --- | --- |
| MSAAオフ | 単一サンプルのRGBA8 | 描いた画像を画面に表示する |
| MSAAオン | マルチサンプルのRGBA8レンダーバッファ | 同じ大きさの単一サンプルRGBA8へリゾルブしてから表示する |

オンの経路は `renderbufferStorageMultisample` で描画先を用意し、`blitFramebuffer` でリゾルブします。輪郭の1画素が持っていた複数の色サンプルを、表示用の1色にまとめる段階です。既定の描画バッファには `antialias: false` を指定し、サンプル数の違いはオフスクリーンの描画先で作っています。[WebGL 2.0仕様](https://registry.khronos.org/webgl/specs/latest/2.0/) · [OpenGL ES 3.0.6仕様の §4.3.3](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf)

## 理解度チェック

1. カメラを止めてMSAAを切り替えると、黄色いポリゴンの輪郭の画素はどう変わりますか。

   ::: details 解答
   複数のサンプルで輪郭の内側と外側が拾われ、リゾルブ後はポリゴン色と背景色の中間色になる画素が現れます。
   :::

2. 床の奥の模様を落ち着かせたい場合は、どの設定を調べますか。

   ::: details 解答
   テクスチャの縮小フィルターを調べます。ミップマップを使うと、画素が覆う広い範囲の模様を反映した色を読みやすくなります。
   :::

## 関連項目

- [アンチエイリアシング](/graphics/postprocess/antialiasing.html)で、MSAAと他の方式の違いを整理する。
- [テクスチャのフィルタリングとミップマップ](/graphics/texture/texture-filtering-and-mipmaps.html)で、遠くの床で1画素が覆う範囲を確認する。
- [3DCG・描画ロードマップの「ポストプロセスとAA」](/learn/roadmap.html?node=gfx-postprocess#graphics)

## 参考資料

- [Khronos — WebGL 2.0 Specification](https://registry.khronos.org/webgl/specs/latest/2.0/) · [OpenGL ES 3.0.6 Specification](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf)
