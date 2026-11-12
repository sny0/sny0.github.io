export const purposes = [
  { id: 'game', label: 'ゲームを作りたい', track: 'unity-game', starts: {
    beginner: ['programming-intro', 'intro-setup', 'まず短いプログラムを動かし、変数や条件分岐を使えるようになると、Unityのスクリプトを読み進めやすくなります。'],
    engine: ['unity-game', 'unity-scene', '触ったことのあるシーンから始め、オブジェクトとコンポーネントを組み合わせて入力へ進みます。'],
    code: ['unity-game', 'unity-scene', '言語の基礎を使い、シーンの配置とスクリプトがつながるところから始めます。'],
  } },
  { id: 'systems', label: 'コンピュータの仕組みを知りたい', track: 'low-level', starts: {
    beginner: ['low-level', 'bytes', '数をビットやバイトで表すところから読めます。コードを動かす段階でプログラミング入門を参照できます。'],
    engine: ['low-level', 'bytes', 'セーブファイルやテクスチャの内部を読む土台として、値とバイトの並びを確認します。'],
    code: ['low-level', 'bytes', '型のサイズやエンディアンを確認してから、Cでバイト列を読む実践へ進みます。'],
  } },
  { id: 'graphics', label: '描画を学びたい', track: 'graphics', starts: {
    beginner: ['graphics', 'gfx-gpu', 'まずCPUとGPUが何を分担するかを図でつかみます。'],
    engine: ['graphics', 'gfx-math', 'エディターで触る座標やカメラを、ベクトルと座標変換に結び付けます。'],
    code: ['graphics', 'gfx-gpu', 'GPUがどう仕事を進めるかを確認し、3D数学と描画パイプラインへ進みます。'],
  } },
  { id: 'web', label: 'Webを学びたい', track: 'network-browser', starts: {
    beginner: ['network-browser', 'net-ip', 'ブラウザでURLを開くとき、通信の相手をどう指定するかから始めます。'],
    engine: ['network-browser', 'net-ip', 'ゲームでも使うIPアドレスやポートを確認し、DNSとHTTPへ進みます。'],
    code: ['network-browser', 'net-ip', 'クライアントとサーバーの接続先を確かめ、通信の実践へ進みます。'],
  } },
]

export const experiences = [
  { id: 'beginner', label: 'プログラミングは初めて' },
  { id: 'engine', label: 'Unityなどを触ったことがある' },
  { id: 'code', label: 'C++やC#が書ける' },
]

export const trackOverviews = [
  { id: 'programming-intro', audience: 'プログラミングが初めての人', prerequisite: 'なし', time: '4〜8時間', outcome: '短いプログラムを書き、変数の値や実行の流れを確かめる。' },
  { id: 'dev-tools', audience: '開発の道具を一通り使いたい人', prerequisite: '小さなプログラムを書ける', time: '5〜10時間', outcome: '端末から実行し、ビルド・デバッグ・計測で問題を調べる。' },
  { id: 'unity-game', audience: 'Unityで最初のゲームを作りたい人', prerequisite: '変数・条件分岐・関数の基礎', time: '8〜16時間', outcome: '入力・衝突・状態をつないだ小さなシューティングを作る。' },
  { id: 'design', audience: '小さなプログラムの変更が難しくなってきた人', prerequisite: 'クラスと関数の基本、小さな実装経験', time: '8〜16時間', outcome: '変更に合わせて責務と依存を分け、設計判断を説明する。' },
  { id: 'low-level', audience: '実行ファイルやOSの内側を知りたい人', prerequisite: 'バイト列から開始可。実践はCやC++の基礎', time: '16〜30時間', outcome: 'バイト表現、メモリ、OS、コンパイラを通してプログラムの実行を説明する。' },
  { id: 'graphics', audience: '3Dの形が画面に出る仕組みを知りたい人', prerequisite: 'GPUと3D数学から開始可。実践はプログラミングの基礎', time: '14〜28時間', outcome: '三角形の描画からシェーダーとレンダリングパスまでをたどる。' },
  { id: 'network-browser', audience: 'Webの通信やブラウザの内側を知りたい人', prerequisite: 'IPから開始可。実践はコマンドやコードの基礎', time: '12〜24時間', outcome: 'URLを開いてから、通信を経てページを描画するまでを説明する。' },
  { id: 'game', audience: '小さなゲームを作ったことがある人', prerequisite: '入力・更新・描画の基礎。目的に応じて設計・描画・低レイヤの知識', time: '10〜20時間', outcome: 'ゲームの機能を設計し、固定tick、アセットの寿命、フレーム時間を調べる。' },
]

export function roadmapUrl(trackId, nodeId) {
  return '/learn/roadmap.html' + (nodeId ? '?node=' + encodeURIComponent(nodeId) : '') + '#' + trackId
}
