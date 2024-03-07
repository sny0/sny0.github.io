---
title: VR学会大会2023に行ってきます
authors: sny0
tags: [VRSJ, OBJFileViewer]
---

9/12～9/14に開催される第２８回日本バーチャルリアリティ学会大会へ行ってきます。

私は、２件の研究発表と１件の技術展示を抱えています。先日プログラムが発表されたので、日時を記します。
- アイトラッキングによるアイボックス追従を備えたマクスウェル視ディスプレイ

    ポスター発表：9/13（水）, 9:10～11:25, HMD・プロジェクタセッション, D会場（※口頭発表は後輩が行いますが、ポスター発表には一緒に参加します）

    技術・芸術展示：9/13（水）, 12:20～14:00, 技術・芸術展示２, 暗室


- 視焦点の移動によるボケの変化勾配の矛盾が融像困難性に与える影響

    ポスター発表：9/14（木）, 9:10～11:25, 視覚セッション, B会場

実は、展示を行うために、装置の改良や調整を研究室に泊まりながら、9/9まで行っていました。本番でしっかり動いてくれることを願っています。

## OBJファイルビュアー進捗
ここ数日、徹夜で開発をし、MTLファイルをパースし、マテリアルを使用しPhongの反射モデルを実装することまで出来ました。しかし、読み込めるファイルは１つであり、１つのマテリアルのみであり、コードでファイルパスを指定しなくてはならなくアプリとしては、まだまだの状態ではあります。

学会が終わり次第、更に開発を勧めます！！！

<iframe width="560" height="315" src="https://www.youtube.com/embed/mjz2uXiGsEg?si=_OTFL-lOWh1fb0nu" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

↓鏡面反射率を上げたversion
<iframe width="560" height="315" src="https://www.youtube.com/embed/Ctz0JRySegQ?si=Z_znhBy7Kz4_D_4I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>