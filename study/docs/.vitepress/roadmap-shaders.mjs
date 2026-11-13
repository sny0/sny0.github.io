const shader = (label, slug) => ({ label, url: '/graphics/shader/' + slug + '.html' })

export default {
  nodes: [
    {
      id: 'shader-basics',
      title: 'シェーダーの基礎',
      summary: '頂点とピクセルの役割を前提に、法線、反射、色、ノイズの計算を追います。',
      prerequisites: [],
      checks: [
        { id: 'normal-space', label: '法線マップのRGBを接空間の法線に戻し、TBNで照明計算と同じ座標系に移せる。' },
        { id: 'roughness-and-color', label: 'GGXの粗さがハイライトの形を変える理由と、どの段階でsRGBの変換を行うかを説明できる。' },
        { id: 'debug-output', label: 'ノイズや照明の中間値を色で表示し、期待する値から外れた段階を特定できる。' },
      ],
      resources: [
        { label: '前提 3DCG・描画のシェーダー節点', url: '/learn/roadmap.html?node=gfx-shaders#graphics' },
        shader('法線マップと接空間', 'normal-mapping'),
        shader('BRDFの中身', 'brdf-internals'),
        shader('色空間とHDR', 'color-space-and-hdr'),
        shader('ノイズと手続き的テクスチャ', 'procedural-noise'),
        shader('シェーダーのデバッグ', 'shader-debugging'),
        { label: 'WebGPU実践 法線、反射、露出、ノイズを比べる', url: '/practice/graphics/shader-lab.html' },
      ],
    },
    {
      id: 'shader-intermediate',
      title: 'シェーダーの中級',
      summary: 'ピクセルの陰影、頂点の変形、Computeの更新を使い分け、バリアントを管理します。',
      prerequisites: ['shader-basics'],
      checks: [
        { id: 'surface-effects', label: 'トゥーンの階調、視差でずらしたUV、デカールがそれぞれどのデータを変えるか説明できる。' },
        { id: 'vertex-compute', label: '風で変形する頂点と、毎フレーム更新するパーティクルの処理を、入力・出力・次のパスで整理できる。' },
        { id: 'variant-budget', label: '独立したキーワードの組み合わせ数を求め、使わない組み合わせをどこで除外するか決められる。' },
      ],
      resources: [
        shader('トゥーンとNPR', 'toon-and-npr'),
        shader('視差とデカール', 'parallax-and-decals'),
        shader('頂点シェーダーでの表現', 'vertex-effects'),
        shader('GPUパーティクル', 'gpu-particles'),
        shader('シェーダーバリアントの管理', 'shader-variants'),
        { label: 'WebGPU実践 トゥーンの段数とリムライトを比べる', url: '/practice/graphics/shader-lab.html#toon' },
      ],
    },
    {
      id: 'shader-advanced',
      title: 'シェーダーの応用',
      summary: '材質の層、距離関数、媒質、水面を扱い、機能の対応範囲と実測から実装を選びます。',
      prerequisites: ['shader-intermediate'],
      checks: [
        { id: 'surface-or-volume', label: 'クリアコート、水面、霧の例で、表面の反射と光が媒質を通る間の減衰を区別できる。' },
        { id: 'raymarch-limit', label: '距離関数でレイを進める量と、終了距離・ステップ上限が結果にどう影響するか説明できる。' },
        { id: 'profile-hypothesis', label: 'テクスチャ読み取りや演算の仮説を一つ立て、画質とGPU時間を揃えた条件で比較できる。' },
      ],
      resources: [
        shader('材質モデルの拡張', 'extended-material-models'),
        shader('SDFとレイマーチング', 'sdf-and-raymarching'),
        shader('ボリューメトリック', 'volumetrics'),
        shader('水面の表現', 'water-shading'),
        shader('シェーダー最適化の実践', 'shader-optimization'),
        shader('最新のシェーダー技術', 'modern-shader-technologies'),
        { label: 'WebGPU実践 距離関数の合成と水面の反射を比べる', url: '/practice/graphics/shader-lab.html#sdf' },
      ],
    },
  ],
}
