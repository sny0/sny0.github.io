const shader = (label, slug) => ({ label, url: '/graphics/shader/' + slug + '.html' })

const practice = (label, anchor) => ({ label, url: '/practice/graphics/shader-lab.html#' + anchor })

const milestones = [
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
]

const groups = [
  {
    label: '座標・反射・色',
    nodes: [
      {
        id: 'shader-normal-space',
        title: '法線と接空間',
        summary: 'メッシュとテクスチャが共有する座標系を読み、法線の向きを検証します。',
        prerequisites: [],
        checks: [
          { id: 'decode', label: '法線マップの値を復号し、TBNでワールド空間へ変換できる。' },
          { id: 'convention', label: '緑チャンネルの向きとUVの鏡映を切り分け、インポート設定を確認できる。' },
        ],
        resources: [
          { label: '前提 3DCG・描画のシェーダー節点', url: '/learn/roadmap.html?node=gfx-shaders#graphics' },
          shader('法線マップと接空間', 'normal-mapping'),
          practice('WebGPU実践 接空間の法線を確認する', 'normals'),
        ],
      },
      {
        id: 'shader-reflection',
        title: '反射モデル',
        summary: 'BRDFの項を一つずつ追い、粗さや視線を変えたときの見え方を予想します。',
        prerequisites: ['shader-normal-space'],
        checks: [
          { id: 'terms', label: 'GGXの分布・フレネル・幾何項がそれぞれ何を表すか説明できる。' },
          { id: 'roughness', label: '拡散と鏡面の配分を保ち、粗さを変えたときのハイライトを比較できる。' },
        ],
        resources: [shader('BRDFの中身', 'brdf-internals'), practice('WebGPU実践 GGXの粗さを変える', 'brdf')],
      },
      {
        id: 'shader-color-exposure',
        title: '色と露出',
        summary: 'リニアの照明計算から露出、トーンマッピング、表示信号までをたどります。',
        prerequisites: [],
        checks: [
          { id: 'transfer', label: 'sRGBの復号を適用するテクスチャと、法線や粗さなどのデータを区別できる。' },
          { id: 'display', label: '輝度ヒストグラムからの露出と、トーンマッピング、PQの信号変換の役割を説明できる。' },
        ],
        resources: [shader('色空間とHDR', 'color-space-and-hdr'), practice('WebGPU実践 露出とトーンマッピングを比べる', 'hdr')],
      },
      {
        id: 'shader-noise',
        title: 'ノイズ',
        summary: '格子から連続した値を作り、周波数と振幅を変えて模様を設計します。',
        prerequisites: [],
        checks: [
          { id: 'gradient', label: '整数ハッシュで格子点の勾配を選び、セル境界で値がつながる理由を説明できる。' },
          { id: 'octaves', label: 'fBmのオクターブ・ラクナリティ・ゲインを別々に変え、模様とちらつきへの影響を確認できる。' },
        ],
        resources: [shader('ノイズと手続き的テクスチャ', 'procedural-noise'), practice('WebGPU実践 fBmとドメインワープ', 'noise')],
      },
      {
        id: 'shader-debug',
        title: 'デバッグ',
        summary: 'キャプチャーで入力を確認し、中間値を色にして異常が生じた段階を探します。',
        prerequisites: ['shader-normal-space', 'shader-color-exposure'],
        checks: [
          { id: 'inspect', label: 'ピクセルの入力、テクスチャ、中間値のうち、最初に期待から外れた値を特定できる。' },
          { id: 'nan', label: 'NaNや無限大を検出する表示を用意し、演算の入力へ原因をたどれる。' },
        ],
        resources: [shader('シェーダーのデバッグ', 'shader-debugging')],
      },
    ],
  },
  {
    label: '表現・実装',
    nodes: [
      {
        id: 'shader-npr',
        title: 'NPR・視差・デカール',
        summary: 'ライティング、参照UV、材質への投影を使い分けて、表面の見え方を作ります。',
        prerequisites: ['shader-reflection'],
        checks: [
          { id: 'bands', label: 'トゥーンの階調とアウトラインで、変更する入力とパスを説明できる。' },
          { id: 'projection', label: '視差によるUVの変更とデカールによる材質の変更を切り分けられる。' },
        ],
        resources: [
          shader('トゥーンとNPR', 'toon-and-npr'),
          shader('視差とデカール', 'parallax-and-decals'),
          practice('WebGPU実践 トゥーンの階調を変える', 'toon'),
        ],
      },
      {
        id: 'shader-vertex-particles',
        title: '頂点とパーティクル',
        summary: '頂点の変形と、フレームをまたいで更新する粒子の状態を扱います。',
        prerequisites: ['shader-noise', 'shader-debug'],
        checks: [
          { id: 'deform', label: '風やVATによる変形の入力と、頂点位置・法線の出力を整理できる。' },
          { id: 'dispatch', label: '粒子を生成・更新・描画するバッファーと、パス間の同期を図にできる。' },
        ],
        resources: [shader('頂点シェーダーでの表現', 'vertex-effects'), shader('GPUパーティクル', 'gpu-particles')],
      },
      {
        id: 'shader-variant-management',
        title: 'バリアント',
        summary: '静的に分ける機能の組み合わせを数え、ビルドと初回描画の負荷を管理します。',
        prerequisites: ['shader-debug'],
        checks: [
          { id: 'combinations', label: 'キーワードの組み合わせから候補数を求め、実際に使う組だけを残す条件を書ける。' },
          { id: 'pso', label: 'バリアント削減とPSOの事前準備を区別し、それぞれで確認する結果を挙げられる。' },
        ],
        resources: [shader('シェーダーバリアントの管理', 'shader-variants')],
      },
      {
        id: 'shader-material-extension',
        title: '材質の拡張',
        summary: '上層を通る光や、面の内部で広がる光を計算に加えます。',
        prerequisites: ['shader-reflection'],
        checks: [
          { id: 'coat', label: 'クリアコートが下層へ届く光と視点へ戻る光をどう減らすか説明できる。' },
          { id: 'scattering', label: '布のシーン、皮膚の拡散、髪の反射に必要な入力を比較できる。' },
        ],
        resources: [shader('材質モデルの拡張', 'extended-material-models')],
      },
      {
        id: 'shader-volume-water',
        title: 'ボリュームと水',
        summary: '表面と媒質を分けて、光の透過率、散乱、反射・屈折を扱います。',
        prerequisites: ['shader-material-extension', 'shader-color-exposure'],
        checks: [
          { id: 'fog', label: '霧の密度と距離から透過率を求め、位相関数の向きを図で説明できる。' },
          { id: 'water', label: '水面のフレネルと、水中を通る距離による吸収を分けて調整できる。' },
        ],
        resources: [
          shader('ボリューメトリック', 'volumetrics'),
          shader('水面の表現', 'water-shading'),
          practice('WebGPU実践 水面の反射と吸収', 'water'),
        ],
      },
      {
        id: 'shader-sdf',
        title: 'SDFとレイマーチング',
        summary: '距離の下界を使ってレイを進め、形状の合成と終了条件を検証します。',
        prerequisites: ['shader-noise'],
        checks: [
          { id: 'combine', label: '距離関数を組み合わせて和・積・差の形状を作れる。' },
          { id: 'stop', label: 'ステップ数、終了距離、交差のしきい値を変えて、欠けや計算量を比較できる。' },
        ],
        resources: [shader('SDFとレイマーチング', 'sdf-and-raymarching'), practice('WebGPU実践 SDFの形状を合成する', 'sdf')],
      },
    ],
  },
  {
    label: '計測と対応条件',
    nodes: [
      {
        id: 'shader-measurement',
        title: '最適化',
        summary: 'GPUキャプチャーで時間とカウンターを読み、仮説を一つずつ検証します。',
        prerequisites: ['shader-vertex-particles'],
        checks: [
          { id: 'bottleneck', label: '命令・帯域・依存待ちの候補から、次の比較実験で確かめる律速を選べる。' },
          { id: 'wave', label: '精度やwave内集約を変えた例で、GPU時間と出力の誤差を比較できる。' },
        ],
        resources: [shader('シェーダー最適化の実践', 'shader-optimization')],
      },
      {
        id: 'shader-current-technologies',
        title: '最新技術',
        summary: '言語、記述子、仕事の投入、シェーディング率、線形代数を別々に評価します。',
        prerequisites: ['shader-measurement', 'shader-variant-management'],
        checks: [
          { id: 'feature', label: 'bindless、Work Graphs、VRS、行列演算の中から、変えたい処理に合う機能を選べる。' },
          { id: 'fallback', label: '言語・SDK・ドライバーの対応を調べ、対応しないデバイスで使う経路を説明できる。' },
        ],
        resources: [shader('最新のシェーダー技術', 'modern-shader-technologies')],
      },
    ],
  },
  { label: '基礎・中級・応用のまとめ', nodes: milestones },
]

export default {
  nodes: groups.flatMap(group => group.nodes),
  goalGroups: groups.map(group => ({ label: group.label, nodeIds: group.nodes.map(node => node.id) })),
}
