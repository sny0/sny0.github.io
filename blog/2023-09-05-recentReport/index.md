---
title: OBJファイルのパーサーを制作しています
authors: sny0
tags: [DX12]
---

ゲームエンジンのようなマシンに近い部分を勉強したいと考え、８月はDirectXとHLSLの勉強をしていました。

使用した書籍は、
- [HLSL シェーダーの魔導書 シェーディングの基礎からレイトレーシングまで](https://www.shoeisha.co.jp/book/detail/9784798164281)
- [DirectX 12の魔導書 3Dレンダリングの基礎からMMDモデルを踊らせるまで](https://www.shoeisha.co.jp/book/detail/9784798161938)

です。

私は、光学を扱う研究をしているためCGのレンダリングの仕組みは勉強していて大変面白いと思いました。


２週間ほど前から、アプリケーションを作り始めました。私はゲームエンジン的なものが作りたいと考え、OBJファイルのビュアーを制作しています。
現在は、OBJファイルから頂点情報をパースし、ポリゴンを描画してテクスチャを張り付けるところまでできています。

DirectXとOBJファイルのuv座標のv軸の方向が逆であることを知らず、デバッグに大変苦労しました...

<iframe width="560" height="315" src="https://www.youtube.com/embed/TUSzngICLHE?si=4CEpNZ-zAuZurPwU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

動画のモデルは、[ここのWebサイト](https://open3dmodel.com/ja/3d-models/3d-model-low-poly-horse_43095.html)から入手したフリーのものを使用しています。

これからは、Phongの反射モデルの実装やmtlファイルのパースしマテリアルの適応を行う予定です。