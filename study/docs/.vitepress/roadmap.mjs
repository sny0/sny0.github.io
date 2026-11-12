import networkBrowser from './roadmap-network-browser.mjs'
import game from './roadmap-game.mjs'
import memoryOs from './roadmap-memory-os.mjs'
import compilers from './roadmap-compilers.mjs'
import beginners from './roadmap-beginners.mjs'
import design from './roadmap-design.mjs'

const lowLevelBasics = ['bytes', 'c-bytes', 'cpu', 'x64-disassembly']
const compilerIds = compilers.nodes.map(node => node.id)
const memoryOsIds = memoryOs.nodes.map(node => node.id)

export default {
  tracks: [
    {
      id: 'low-level',
      title: '低レイヤ・言語',
      summary: 'CPUとCの基礎から、メモリ、OSの動作、コンパイルと実行までをたどります。',
      showAllByDefault: true,
      guide: { label: '低レイヤからゲームの仕組みを学ぶ', url: '/guide/low-level/' },
      nodeIds: [...lowLevelBasics, ...compilerIds, ...memoryOsIds],
      goalGroups: [
        { label: 'CPU・C・アセンブリ', nodeIds: lowLevelBasics },
        { label: 'メモリ', nodeIds: memoryOsIds.filter(id => id.startsWith('memory-')) },
        { label: 'OS', nodeIds: memoryOsIds.filter(id => id.startsWith('os-')) },
        { label: 'コンパイラ', nodeIds: compilerIds },
      ],
    },
    {
      id: 'network-browser',
      title: 'ネットワーク・ブラウザ',
      summary: 'IP・DNS・HTTPの通信から、ブラウザがページを描くまでをたどります。',
      showAllByDefault: true,
      guide: { label: 'ネットワークの基本から読む', url: '/guide/network-basics.html' },
      nodeIds: networkBrowser.nodes.map(node => node.id),
    },
    {
      id: 'graphics',
      title: '3DCG・描画',
      summary: 'GPUと3D数学を土台に、三角形の描画からレンダラーの設計まで進みます。',
      guide: { label: '描画の学習ロードマップ', url: '/guide/rendering/roadmap.html' },
      nodeIds: [
        'gfx-gpu', 'gfx-math', 'gfx-pipeline', 'gfx-shaders', 'gfx-apis', 'gfx-compute',
        'gfx-rendering-paths', 'gfx-lighting', 'gfx-postprocess', 'gfx-optimization', 'gfx-engine', 'gfx-capstone',
      ],
    },
    {
      id: 'game',
      title: 'ゲーム開発',
      summary: '入力・更新・衝突を組み合わせて小さなゲームを作り、必要に応じて設計や計測へ進みます。',
      showAllByDefault: true,
      guide: { label: 'ゲームの動きと構成から読む', url: '/guide/game-development-basics.html' },
      nodeIds: game.nodes.map(node => node.id),
    },
    ...beginners.tracks,
    {
      id: 'design',
      title: '設計',
      summary: '責務と依存を整理し、原則やパターンを選び、変更しやすい構造を説明します。',
      showAllByDefault: true,
      guide: { label: 'C++とゲーム設計の学習ロードマップ', url: '/guide/cpp-roadmap.html' },
      nodeIds: design.nodes.map(node => node.id),
    },
  ],
  nodes: [
    ...networkBrowser.nodes,
    ...game.nodes,
    ...memoryOs.nodes,
    ...compilers.nodes,
    ...beginners.nodes,
    ...design.nodes,
    {
      id: 'bytes',
      title: '整数とバイト列',
      summary: '整数の値を2進数と16進数で表し、メモリやファイルでのバイト順を読み取ります。',
      prerequisites: [],
      checks: [
        { id: 'binary-to-hex', label: '2進数 00110100 を16進数に変換し、4ビットずつ対応づけられる。' },
        { id: 'byte-order', label: '0x12345678 の4バイトを、リトルエンディアンとビッグエンディアンそれぞれでアドレスの小さい順に並べられる。' },
        { id: 'file-order', label: 'ファイルの整数を読むとき、メモリ上の並びとファイル形式が定めたバイト順のどちらに従うか説明できる。' },
      ],
      resources: [
        { label: '整数をビット列・16進数・バイト列で読む', url: '/data/integer-bits-and-bytes.html' },
        { label: 'C++で整数とバイト順を観察する', url: '/practice/data/integer-byte-observation.html' },
      ],
    },
    {
      id: 'c-bytes',
      title: 'Cでバイト列を読む',
      summary: '配列を渡すときの長さを確かめ、2バイトを合成して値を読み取ります。',
      prerequisites: ['bytes'],
      checks: [
        { id: 'sizeof', label: '配列と、関数の引数になったポインタに対して、sizeof がそれぞれ何のサイズを返すか説明できる。' },
        { id: 'decode', label: '34 12 をリトルエンディアンで読んだ値を、シフトとビットORで求められる。' },
        { id: 'short-input', label: 'サンプルのコードと出力を見て、残り1バイトで出力先が変わらない理由を説明できる。記事の掲載例でも確認できる。' },
      ],
      resources: [
        { label: 'Cでバイト列を読む', url: '/languages/c/reading-byte-arrays.html' },
        { label: 'Cサンプルと実行結果を見る', url: '/practice/compilers/c-byte-decoder-disassembly.html' },
      ],
    },
    {
      id: 'cpu',
      title: 'CPUの命令とレジスタ',
      summary: '命令を順に追って、レジスタとメモリの値がどこで変わるかを見分けます。',
      prerequisites: [],
      checks: [
        { id: 'assembly', label: '機械語とアセンブリ言語の関係を説明できる。' },
        { id: 'load-add-store', label: '5をロードし、3を足してストアする記事の例で、各命令の後のレジスタとメモリの値を追える。' },
        { id: 'program-counter', label: '順番に命令を実行する場合と分岐する場合で、次に実行する命令の位置がどう決まるか説明できる。' },
      ],
      resources: [
        { label: 'CPUの命令実行を読む', url: '/hardware/cpu/instruction-execution.html' },
      ],
    },
    {
      id: 'x64-disassembly',
      title: 'x86-64でCの処理を追う',
      summary: '同じCの関数を逆アセンブルし、長さの検査、出力への書き込み、戻り値を命令列の中で見つけます。',
      prerequisites: ['c-bytes', 'cpu'],
      checks: [
        { id: 'argument-registers', label: 'Windows x64で、入力の先頭、長さ、出力先がそれぞれどのレジスタで渡されるか説明できる。' },
        { id: 'short-input-branch', label: '手元で逆アセンブルした命令列か記事の掲載例で、残り2バイト未満なら読み取らずに戻る経路を指せる。' },
        { id: 'store-and-return', label: '最適化ありとなしの両方の命令列から、16ビット値の書き込みと戻り値を設定する命令を見つけられる。' },
      ],
      resources: [
        { label: 'Cのバイト読み取りを逆アセンブリで追う', url: '/practice/compilers/c-byte-decoder-disassembly.html' },
        { label: '関数呼び出しとレジスタを調べる', url: '/runtime/cpp-internals/function-calls-and-cpu.html' },
      ],
    },
    {
      id: 'gfx-gpu',
      title: 'GPU基礎',
      summary: 'GPUが得意な計算と、描画の仕事をCPUからGPUに渡す流れを説明します。',
      prerequisites: [],
      checks: [
        { id: 'parallel-work', label: '画面の各ピクセルに同じ式を適用する例で、GPUが処理を並列化できる理由を説明できる。' },
        { id: 'submit-work', label: 'CPUがコマンドを記録し、キューに提出してからGPUが実行する流れを図に描ける。' },
        { id: 'memory-hierarchy', label: 'レジスタ、グループ内の共有メモリ、VRAMから、同じグループ内で一時データを共有する領域を選べる。' },
      ],
      resources: [
        { label: 'GPUとは何か', url: '/hardware/gpu/what-is-gpu.html' },
        { label: 'CPUとGPUの役割分担', url: '/hardware/gpu/cpu-vs-gpu.html' },
        { label: 'GPUアーキテクチャ詳解', url: '/hardware/gpu/architecture.html' },
      ],
    },
    {
      id: 'gfx-math',
      title: '3D数学',
      summary: 'ベクトルで向きを比べ、行列でモデルをカメラから見た位置へ変換します。',
      prerequisites: [],
      checks: [
        { id: 'dot-product', label: '(1, 0, 0) と (0, 1, 0) の内積を計算し、二つの向きのなす角を答えられる。' },
        { id: 'coordinate-spaces', label: '頂点をローカル空間からワールド、ビュー、クリップ空間へ移す順番と、各段階で使う行列を示せる。' },
        { id: 'projection', label: '同じ大きさのモデルをカメラから遠ざけたとき、透視投影と正投影で見かけの大きさがどう変わるか予測できる。' },
      ],
      resources: [
        { label: 'ベクトルの内積と向き', url: '/math/rendering/vector.html' },
        { label: 'モデルからカメラまでの座標変換', url: '/math/rendering/transform.html' },
        { label: 'カメラと射影', url: '/math/rendering/camera.html' },
        { label: '補間と曲線', url: '/math/rendering/interpolation-and-curves.html' },
      ],
    },
    {
      id: 'gfx-pipeline',
      title: 'レンダリングパイプライン',
      summary: '頂点の入力から、三角形を組み立て、描画先へ色を書き込むまでをたどります。',
      prerequisites: ['gfx-gpu', 'gfx-math'],
      checks: [
        { id: 'stages', label: '三角形一枚について、頂点処理、プリミティブの組み立て、ラスタライズ、フラグメント処理、出力の順に図を描ける。' },
        { id: 'coverage-interpolation', label: '三角形の内側で使うUVがどの段階で頂点のUVから補間され、どのシェーダーへ渡るか説明できる。' },
        { id: 'depth-and-blend', label: '重なった三角形の例で、深度テストとブレンディングがそれぞれ何を決めるか説明できる。' },
      ],
      resources: [
        { label: 'レンダリングパイプライン全体像', url: '/graphics/pipeline/overview.html' },
        { label: 'ラスタライゼーション', url: '/graphics/pipeline/rasterization.html' },
        { label: 'テクスチャのフィルタリングとミップマップ', url: '/graphics/texture/texture-filtering-and-mipmaps.html' },
        { label: '実践 斜めの床でフィルタリングを比べる', url: '/practice/graphics/texture-filtering-observation.html' },
        { label: '出力結合と深度テスト', url: '/graphics/pipeline/output-merger.html' },
      ],
    },
    {
      id: 'gfx-shaders',
      title: 'シェーダ言語',
      summary: '三角形の位置と色を変え、頂点属性と描画単位で渡す値をコードで見分けます。',
      prerequisites: ['gfx-pipeline'],
      checks: [
        { id: 'position-output', label: 'サンプルの横位置を右へ変えたときの見た目を予測し、頂点シェーダーのどの式が位置を変えるか指せる。' },
        { id: 'uv-color', label: 'UVを表示する設定で「色を掛ける」を赤にしたとき、出力の緑と青がどう変わるか予測し、実行か掲載コードで確認できる。' },
        { id: 'attribute-uniform', label: 'GLSL ESとHLSLの例で、頂点ごとに渡す位置・UVと、描画で共通の横位置・色がそれぞれどこに宣言されているか指せる。' },
      ],
      resources: [
        { label: 'シェーダ言語の比較', url: '/graphics/shader/overview.html' },
        { label: 'シェーダーの第一歩', url: '/graphics/shader/shader-first-steps.html' },
        { label: '実践 シェーダーで三角形の位置と色を変える', url: '/practice/graphics/shader-first-steps.html' },
      ],
    },
    {
      id: 'gfx-apis',
      title: 'グラフィックスAPI',
      summary: '描画コマンド、リソース、パイプライン状態をグラフィックスAPIで指定する仕組みを比べます。',
      prerequisites: ['gfx-pipeline'],
      checks: [
        { id: 'commands', label: 'D3D12とVulkanの三角形の例で、コマンドの記録とキューへの提出をそれぞれどこで行うか指せる。' },
        { id: 'pipeline-state', label: 'OpenGLの状態設定とD3D12のパイプライン状態オブジェクトを比べ、どこでシェーダーと描画状態を指定するか説明できる。' },
        { id: 'resource-and-fence', label: 'D3D12の例で、描画先をシェーダーの入力に切り替えるときのリソースバリアと、CPUがGPUの完了を確かめるフェンスの役割を説明できる。' },
      ],
      resources: [
        { label: 'OpenGL・Vulkan・DirectX 12・WebGPUの比較', url: '/graphics/api/comparison.html' },
        { label: 'DirectX 12のコマンド、バリア、フェンス', url: '/graphics/api/directx12.html' },
        { label: 'Vulkanのコマンドと同期', url: '/graphics/api/vulkan.html' },
      ],
    },
    {
      id: 'gfx-compute',
      title: 'GPUコンピューティング',
      summary: 'Compute Shaderで並列に処理する範囲を決め、グループ内で値を共有する仕組みを学びます。',
      prerequisites: ['gfx-gpu', 'gfx-shaders'],
      checks: [
        { id: 'dispatch-size', label: '1グループが8×8スレッドのとき、2×3グループを起動すると全体の縦横に何スレッド並ぶか計算できる。' },
        { id: 'divergence', label: '同じWarpまたはWaveのスレッドが異なる分岐へ進む例を挙げ、実行効率に影響しうる理由を説明できる。' },
        { id: 'group-sync', label: 'グループ内で各スレッドの書き込みを読み出す例と、複数スレッドで同じカウンターを増やす例で、同期とアトミック操作を使う箇所を分けられる。' },
      ],
      resources: [
        { label: 'Compute Shaderのスレッド階層', url: '/graphics/compute/compute-shader.html' },
        { label: 'GPU並列実行モデル', url: '/graphics/compute/execution-model.html' },
        { label: 'Shared MemoryとAtomic', url: '/graphics/compute/shared-memory.html' },
      ],
    },
    {
      id: 'gfx-rendering-paths',
      title: 'レンダリング方式',
      summary: 'ForwardとDeferredを比べ、ライトの絞り込みが描画パスのどこに入るかを確認します。',
      prerequisites: ['gfx-pipeline'],
      checks: [
        { id: 'light-evaluation', label: 'ForwardとDeferredのそれぞれについて、ジオメトリを描く工程とライトを計算する工程の関係を図に描ける。' },
        { id: 'gbuffer', label: 'DeferredのGバッファに保存する情報を二つ挙げ、ライティングパスでの使い道を説明できる。' },
        { id: 'light-culling', label: '画面上では同じタイルにあり、奥行きが大きく異なる二つの点について、TiledとClusteredがそれぞれどの単位でライト一覧を選ぶか説明できる。' },
      ],
      resources: [
        { label: 'Forward Rendering', url: '/graphics/path/forward.html' },
        { label: 'Deferred RenderingとGバッファ', url: '/graphics/path/deferred.html' },
        { label: 'Forward+、Tiled、Clustered Rendering', url: '/graphics/path/forward-plus.html' },
      ],
    },
    {
      id: 'gfx-lighting',
      title: 'ライティングとGI',
      summary: '材質で光の反射を変え、光源から直接届く光と周囲から間接的に届く光を扱います。',
      prerequisites: ['gfx-math', 'gfx-rendering-paths'],
      checks: [
        { id: 'direct-indirect', label: '白い物体のそばに赤い壁と照明がある場面で、直接光と壁で反射した間接光の経路をそれぞれ描ける。' },
        { id: 'roughness', label: '照明と視点を固定して材質の粗さを上げたとき、鏡面ハイライトの広がりがどう変わるか予測できる。' },
        { id: 'environment-light', label: 'IBLの図で、環境マップから拡散反射用と鏡面反射用にどんなデータを準備するか指せる。' },
      ],
      resources: [
        { label: 'PBRと材質のパラメータ', url: '/graphics/lighting/pbr.html' },
        { label: 'グローバルイルミネーション総論', url: '/graphics/lighting/gi.html' },
        { label: 'IBLと環境マップ', url: '/graphics/lighting/ibl.html' },
      ],
    },
    {
      id: 'gfx-postprocess',
      title: 'ポストプロセスとAA',
      summary: '描画結果を次のパスへ渡し、色の調整や輪郭のちらつきを抑える処理を加えます。',
      prerequisites: ['gfx-lighting'],
      checks: [
        { id: 'tone-map', label: 'HDRの描画結果をSDR画面へ出す流れで、トーンマッピングとsRGBへの変換の役割を説明できる。' },
        { id: 'aa-samples', label: 'MSAAが使う同じフレーム内のサンプルと、TAAが使う過去フレームの情報の違いを説明できる。' },
        { id: 'pass-input-output', label: '赤と青を入れ替える実践で、二つのパスが読み書きする画像を示し、実行か掲載結果で出力色を確かめられる。' },
      ],
      resources: [
        { label: 'ポストプロセスパイプライン', url: '/graphics/postprocess/overview.html' },
        { label: 'アンチエイリアシングとMSAA', url: '/graphics/postprocess/antialiasing.html' },
        { label: '実践 MSAAを切り替えて輪郭と床模様を見比べる', url: '/practice/graphics/msaa-observation.html' },
        { label: 'TAAとフレーム履歴', url: '/graphics/postprocess/taa.html' },
        { label: '実践 TAAで床のちらつきとゴーストを比べる', url: '/practice/graphics/taa-observation.html' },
        { label: 'アップスケーリングとTAAU', url: '/graphics/postprocess/upscaling.html' },
        { label: '実践 ネイティブ描画と2つの拡大方式を比べる', url: '/practice/graphics/taau-observation.html' },
        { label: 'フレーム生成と入力への反応', url: '/graphics/postprocess/frame-generation.html' },
        { label: '実践 フレーム生成のオン・オフを比べる', url: '/practice/graphics/frame-generation-observation.html' },
        { label: '実践 テクスチャに描き、次のパスで色を変える', url: '/practice/graphics/render-to-texture-observation.html' },
      ],
    },
    {
      id: 'gfx-optimization',
      title: 'GPU最適化',
      summary: '計測で重い処理を絞り込み、描画パスの依存関係とリソースの使用箇所を整理します。',
      prerequisites: ['gfx-compute', 'gfx-apis'],
      checks: [
        { id: 'measure-pass', label: '画面が重いときに、CPU側の処理とGPU側の処理を切り分け、GPUのどのパスを測るか計測手順を立てられる。' },
        { id: 'select-tool', label: '一つの描画イベントの出力を調べたい場合と、フレーム内のGPU時間を調べたい場合に、キャプチャとプロファイリングの使い分けを説明できる。' },
        { id: 'resource-graph', label: 'あるパスがテクスチャへ書き込み、次のパスがそれを読む例をRenderGraphとして描き、読み書きの依存関係を示せる。' },
      ],
      resources: [
        { label: 'GPU最適化の基礎', url: '/graphics/optimization/basics.html' },
        { label: 'デバッグ・プロファイリングツール', url: '/graphics/optimization/tools.html' },
        { label: 'RenderGraphとFrameGraph', url: '/graphics/optimization/render-graph.html' },
      ],
    },
    {
      id: 'gfx-engine',
      title: 'エンジンのレンダラー',
      summary: 'UnityとUnreal Engineの例で、描画する対象を選び、パスを組み立ててGPUに渡す流れを読みます。',
      prerequisites: ['gfx-rendering-paths', 'gfx-lighting', 'gfx-optimization'],
      checks: [
        { id: 'unity-srp', label: 'UnityのSRPの図で、カメラごとのカリング、パスの構成、描画コマンドを記録する箇所を指せる。' },
        { id: 'unreal-threads', label: 'Unreal Engineの図で、ゲームスレッドが更新する状態と、描画スレッドが扱うシーンのデータを分けて説明できる。' },
        { id: 'render-passes', label: 'Unreal EngineのDeferredの例で、Gバッファを書き込むパス、ライティング、ポスト処理の順と各パスの入出力を説明できる。' },
      ],
      resources: [
        { label: 'UnityのレンダラーとSRP', url: '/graphics/engine/unity-renderer.html' },
        { label: 'Unreal Engineのレンダラー', url: '/graphics/engine/unreal-renderer.html' },
      ],
    },
    {
      id: 'gfx-capstone',
      title: '実践 レンダラーを作る',
      summary: '小さなレンダラーの設計とコード断片を使って、三角形を描く準備から1フレームの出力までを組み立てます。',
      prerequisites: ['gfx-apis', 'gfx-engine', 'gfx-postprocess'],
      checks: [
        { id: 'renderer-responsibilities', label: 'デバイス初期化、バッファやテクスチャの管理、フレームごとのコマンド記録を、設計図の担当箇所に割り当てられる。' },
        { id: 'triangle', label: 'GLBの三角形サンプルを実行するか掲載結果を読み、インデックスで選ばれる頂点の順番と描画結果の確認方法を説明できる。' },
        { id: 'frame-design', label: '影のパスから最終表示までの構成を描き、シャドウマップとHDR画像をどのパスが書き、どのパスが読むか示せる。' },
      ],
      resources: [
        { label: 'レンダラー実践 1. 全体設計', url: '/graphics/capstone/01-design.html' },
        { label: 'レンダラー実践 4. 最初の三角形からメッシュ描画へ', url: '/graphics/capstone/04-triangle.html' },
        { label: 'レンダラー実践 5. 1フレームの構成', url: '/graphics/capstone/05-frame.html' },
        { label: '実行例 GLBの頂点とインデックスから三角形を描く', url: '/practice/graphics/glb-mesh-observation.html' },
      ],
    },
  ],
}
