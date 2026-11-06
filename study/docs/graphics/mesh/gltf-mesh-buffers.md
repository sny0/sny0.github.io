---
title: glTFのバッファから頂点とインデックスを読む
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: GLBのJSONとBINを分け、buffer、bufferView、accessorから頂点属性とインデックスの型、位置、間隔を求める。範囲の検査とsparse accessorの読み方も扱う。
  aliases: [glTF, GLB, bufferView, accessor, byteStride, componentType, POSITION, NORMAL, indices, interleaved, sparse accessor]
  verification: KhronosのglTF 2.0仕様のバイナリ格納、メッシュ、GLB形式と照合
---

# glTFのバッファから頂点とインデックスを読む

ゲームのパックから3Dモデルを取り出したあと、ローダーは「頂点の座標がどこから始まり、何バイトごとに次の頂点があるか」を求めます。glTF 2.0では、JSONがメッシュの構成や値の型を表し、座標やインデックスの実体はバイナリのバッファに置きます。例えば座標と法線が頂点ごとに交互に並んでいても、型と間隔をたどると、それぞれの値を取り出せます。[KhronosのglTF 2.0バイナリ格納仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-data-storage) · [アセットパックの構成](/game/asset-pack-files.html)

## `.gltf`と`.glb`でデータの置き場所が変わる

`.gltf`はJSON文書です。バッファの`uri`から外部の`.bin`などを参照したり、`data:` URIでバイト列を埋め込んだりできます。`.glb`は、同じglTFのJSONを`JSON`チャンクとして格納するバイナリコンテナーです。`BIN`チャンクが入っている場合、そこに格納したバッファは`buffers[0]`に対応し、その項目の`uri`は省略します。GLBから外部のリソースを参照することもできます。[KhronosのGLBに格納するバッファの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-stored-buffer)

GLBの先頭12バイトには、識別子`glTF`、コンテナーのバージョン`2`、ファイル全体の長さが入ります。各チャンクは、データの長さと種類を示す8バイトに続いて、中身が並びます。`JSON`が先頭で、バッファを埋め込む場合は2番目に`BIN`を置きます。コンテナーの版とJSONの`asset.version`は別々に確認します。GLBの整数欄と、glTFで規定した頂点属性やインデックスのバイト列は、下位バイトを先に格納するリトルエンディアンです。[KhronosのGLBレイアウト](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout) · [整数とバイト列](/data/integer-bits-and-bytes.html)

## 位置、範囲、型を順にたどる

| JSONの項目 | 確認すること |
| --- | --- |
| `meshes[].primitives[]` | `attributes.POSITION`や`attributes.NORMAL`は、対応する`accessors`の番号。`indices`もインデックス列を読むための`accessors`の番号。 |
| `accessors[]` | `bufferView`で読み取る範囲を選ぶ。`byteOffset`はその範囲の先頭からのずれ。`componentType`は1成分の型、`type`は1要素の形、`count`は要素数。 |
| `bufferViews[]` | `buffer`で元のバッファを選ぶ。`byteOffset`はバッファ先頭からのずれで、`byteLength`は範囲の長さ。頂点属性用の`byteStride`は要素の先頭から次の先頭までの距離。 |
| `buffers[]` | `byteLength`でバッファの論理長を知り、外部のデータやGLBの`BIN`から実体を得る。 |

頂点の座標`POSITION`は、glTF 2.0の基本仕様では32ビット浮動小数点`5126`を3成分持つ`VEC3`です。要素1個は12バイトで、`count = 3`なら座標が3個あります。`POSITION`に必須の`min`と`max`は各成分の最小値と最大値です。ファイル内で読める範囲は、別にバイトの位置と長さから検査します。法線`NORMAL`も基本仕様では`5126`の`VEC3`です。[Khronosのメッシュ属性とインデックスの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes)

同じ`bufferView`で座標と法線を交互に格納する例では、`byteStride`を24、座標の`accessor.byteOffset`を0、法線の`accessor.byteOffset`を12とします。頂点番号`i`に対応する属性の先頭は`bufferView.byteOffset + accessor.byteOffset + i × stride`です。`byteStride`の指定がなければ、ここで扱うスカラーとベクトルでは要素のサイズずつ進みます。行列を含む読み手は、列ごとの詰め物も仕様に従って扱います。[Khronosのaccessorとデータ整列の仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#data-alignment)

<figure class="study-figure">
  <img src="/images/graphics/gltf-mesh-buffers.svg" alt="GLBのヘッダーとJSONに続くBINに、72バイトの頂点範囲と6バイトのインデックス範囲が入る。頂点の座標はバイト0、24、48から、法線は12、36、60から各12バイト。インデックス2、0、1はバイト72、74、76から各2バイト。バッファの論理長78バイトにゼロ2バイトを足してBINを整列する。" width="760" height="414" loading="lazy">
  <figcaption>座標と法線の1要素は各12バイトです。頂点ごとに両方を並べると、同じ属性の次の要素まで24バイト進みます。位置はバッファ先頭から数えています。<a href="/study/images/graphics/gltf-mesh-buffers.svg" target="_blank" rel="noopener noreferrer">バッファの配置図を拡大</a></figcaption>
</figure>

図のインデックスは`SCALAR`で、1個が16ビットの符号なし整数`5123`です。値の並び`[2, 0, 1]`は、三角形を頂点2、0、1の順で組み立てる指定です。バイト列では`02 00 00 00 01 00`になります。各値は対応する頂点属性の`count`未満である必要があります。`indices`を省略したプリミティブは、頂点を0番から順に使います。[Khronosのメッシュ仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes) · [頂点・インデックスの描画入力](/graphics/mesh/vertex-and-index-input.html)

## 最後の要素まで入るかを確かめる

GLBではヘッダーの全長と実際のファイル長を照合し、各チャンクがファイル内に収まるかを確認します。`BIN`チャンクを4バイト境界にそろえるために足す余白は最大3バイトです。この例では、バッファの`byteLength`が示す論理長78バイトにゼロを2バイト足します。`bufferView`の範囲検査には、余白を足す前の78バイトを使います。[KhronosのGLBのチャンクとバッファの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-stored-buffer)

次に、参照番号が各配列内にあり、`bufferView.byteOffset`と`bufferView.byteLength`で指定した範囲がバッファに収まることを確かめます。通常のスカラーやベクトルのaccessorで最後に使う範囲の終端は、ビューの先頭を基準に`accessor.byteOffset + (count − 1) × stride + 要素サイズ`です。この例の法線なら`12 + (3 − 1) × 24 + 12 = 72`で、頂点のビューにちょうど収まります。[Khronosのaccessor整列と範囲の仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#data-alignment)

実装では型、整列、ストライドの制約を先に確認し、`count`が1以上かを調べます。終端を計算する前に、`accessor.byteOffset`と要素1個分をビューの長さから引けるかを順に確かめます。残りを正のストライドで割り、その商が`count − 1`以上なら、最後の要素まで収まります。加算や乗算の桁あふれを避けたうえで、インデックスの値そのものも検査できます。[バイナリファイルの範囲検査](/data/binary-file-validation.html)

## 数値の変換とsparse accessor

`normalized: true`を使える整数属性では、値を取り出すときに符号なしなら`[0, 1]`、符号付きなら`[-1, 1]`へ変換します。例えば8ビットの符号なし頂点色で`128`は`128 / 255`になります。`NORMAL`が単位長のベクトルを表すことと、整数の符号化に使う`normalized`は別の規則です。[Khronosのnormalizedの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#_accessor_normalized) · [メッシュ属性の仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes)

`sparse`付きのaccessorでは、元の配列の一部を別の値で上書きします。元の`bufferView`を省略した場合は、全要素をゼロで初期化します。`sparse.indices`は置き換える要素番号なので、描画時に頂点を選ぶプリミティブの`indices`とは役割が異なります。読み手は置換用の番号列と値列にも範囲の検査を行い、番号が重複なしの昇順で、いずれも元の要素数未満かを確かめます。[Khronosのsparse accessorの仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#sparse-accessors)

C++実践では、プログラムが生成したGLBのJSONを既知の内容と照合し、その配置に従って`BIN`から座標とインデックスを読みます。D3D12のソフトウェアアダプターWARPで画面外の描画先へ三角形を描き、ピクセルを読み戻して確認します。汎用ローダーでは、JSONから参照先と型をたどり、対応する拡張や各形式の規則に従って描画入力を組み立てます。[GLBから三角形を描くC++実践](/practice/graphics/glb-mesh-observation.html)
