export default {
  nodes: [
    {
      id: 'game-engine',
      title: 'ゲームエンジンの役割',
      summary: '制作ツール、実行時の機能、ゲームごとに決めるルールの関係を整理します。',
      prerequisites: [],
      checks: [
        { id: 'engine-and-rules', label: 'プレイヤーが壁に当たる例で、接触を調べる機能と、接触したときに何が起きるかを決めるルールを分けて説明できる。' },
        { id: 'editor-and-runtime', label: 'ステージに敵を配置する作業と、プレイ中に敵を動かす処理を、エディターと実行時のどちらで行うか説明できる。' },
        { id: 'assets-and-state', label: '画像ファイル、配置を保存したシーン、プレイ中に減ったHPを、素材・配置データ・実行中の状態に分けられる。' },
      ],
      resources: [
        { label: 'ゲームエンジンの役割', url: '/game/basics/game-engine-basics.html' },
        { label: 'ゲームの動きと構成から読む', url: '/guide/game-development-basics.html' },
        { label: '経路探索とナビメッシュ', url: '/algorithms/pathfinding.html' },
      ],
    },
    {
      id: 'game-loop',
      title: 'ゲームループと時間',
      summary: '入力、状態の更新、描画を分け、フレーム時間と固定tickを使い分けます。',
      prerequisites: [],
      checks: [
        { id: 'read-update-draw', label: '移動キーを押してから画面上の自機が動くまでを、入力の取得、位置の更新、描画に分けて説明できる。' },
        { id: 'speed-and-time', label: '速さが毎秒120の物体について、1/30秒と1/60秒で進む距離をそれぞれ計算できる。' },
        { id: 'frame-and-tick', label: '固定tickが1/60秒のとき、繰り越し時間なしで1/120秒のフレームが2回来ると、各フレームで何回更新されるか説明できる。' },
      ],
      resources: [
        { label: 'ゲームループと時間', url: '/game/basics/game-loop-and-time.html' },
        { label: '固定タイムステップと補間', url: '/game/patterns/game-loop-and-update.html' },
        { label: '実践 固定tickの図と入力処理を読む', url: '/game/shooter-design.html' },
        { label: 'ゲームのネットワーク同期', url: '/game/network-sync.html' },
      ],
    },
    {
      id: 'game-input',
      title: '入力アクションとデバイス',
      summary: 'キーやパッドの操作を、移動や決定などゲームで使う入力へ変換します。',
      prerequisites: ['game-engine'],
      checks: [
        { id: 'input-binding', label: 'キーボードのSpaceとパッドのボタンに射撃を割り当てる例で、デバイス、操作箇所、アクションを指せる。' },
        { id: 'held-and-pressed', label: '移動とリトライのそれぞれに、押されている状態と押し始めのどちらを使うか説明できる。' },
        { id: 'buffer-edge', label: '実践の図かコードで、Rを押したフレームにtickがない場合、次のtickまで再開要求をどこで保持するか指せる。' },
      ],
      resources: [
        { label: '入力の基本', url: '/game/basics/input-actions-and-devices.html' },
        { label: 'USBキーボードの入力とWindowsのRaw Input', url: '/hardware/io/usb-keyboard-raw-input.html' },
        { label: '実践 再開要求を保持する流れ', url: '/game/shooter-design.html' },
        { label: '実践 C++版で入力を読むコード', url: '/game/shooter-cpp.html' },
      ],
    },
    {
      id: 'game-scenes',
      title: 'シーンとコンポーネント',
      summary: '物体をシーンに配置し、表示や判定などの機能を組み合わせます。',
      prerequisites: ['game-engine'],
      checks: [
        { id: 'component-roles', label: 'Unityでキャラクターを配置する例で、Transform、表示するコンポーネント、判定を持つコンポーネントの担当を説明できる。' },
        { id: 'parent-and-child', label: 'キャラクターの子に武器を置く構成で、親だけを移動させると武器のローカル位置とワールド位置がどう変わるか予測できる。' },
        { id: 'prefab-instances', label: '同じプレハブから敵を2体生成する図で、ひな形に持たせる値と、各個体が別々に持つ現在のHPを指せる。' },
      ],
      resources: [
        { label: 'シーン・オブジェクト・コンポーネントの基本', url: '/game/basics/scenes-and-components.html' },
        { label: 'プレハブと生成・破棄の基本', url: '/game/basics/prefabs-and-object-lifetimes.html' },
      ],
    },
    {
      id: 'game-collisions',
      title: '衝突判定と物理',
      summary: '接触を調べる形、物体の動き、接触後のゲームルールを分けて考えます。',
      prerequisites: ['game-loop'],
      checks: [
        { id: 'contact-and-trigger', label: '壁と回復アイテムの例で、接触で動きを止める用途と、重なりを通知するトリガーの用途を分けて説明できる。' },
        { id: 'circle-overlap', label: 'シューティングの当たり判定の図や式を使い、半径3と2の円の中心間距離が4、5、6のときに接触するか判定できる。' },
        { id: 'discrete-step', label: '速い弾が1tickの間に敵を通り抜ける例を描き、更新後の位置だけを調べる判定で見逃す理由を説明できる。' },
      ],
      resources: [
        { label: 'コライダー・Rigidbody・トリガー', url: '/game/basics/collisions-and-physics.html' },
        { label: '物理の時間積分と衝突判定', url: '/math/physics-integration-and-collision.html' },
        { label: '実践 円同士の当たり判定を試す', url: '/game/shooter-design.html' },
      ],
    },
    {
      id: 'game-states',
      title: 'ゲームの状態とポーズ',
      summary: 'タイトル、プレイ中、ポーズ、結果の切り替えと、その間に進める処理を決めます。',
      prerequisites: ['game-loop', 'game-input'],
      checks: [
        { id: 'transitions', label: '開始、ポーズ、再開、HPが0になる操作や出来事について、どの状態からどの状態へ移るか図に描ける。' },
        { id: 'pause-rules', label: 'ポーズ中の敵の更新、移動入力、メニューの決定操作のうち、どれを止め、どれを続けるか決められる。' },
        { id: 'restart-state', label: 'シューティングのGame Over後にRを押したとき、HP、スコア、弾や敵の一覧がどうなるか、設計表かコードで確かめられる。' },
      ],
      resources: [
        { label: 'ゲームの状態とポーズ', url: '/game/basics/game-states-and-pause.html' },
        { label: '有限ステートマシン', url: '/game/patterns/state-machines.html' },
        { label: '実践 Game Overとリトライの処理順', url: '/game/shooter-design.html' },
      ],
    },
    {
      id: 'game-events-ui',
      title: 'ゲーム内イベントとUI',
      summary: 'HPの変化を表示へ渡し、メニューの操作をゲーム側の要求へつなげます。',
      prerequisites: ['game-scenes', 'game-states'],
      checks: [
        { id: 'health-notification', label: 'HPが100から70へ減る例で、状態の変更、通知の発行、HPバーの更新がどの順で起きるか説明できる。' },
        { id: 'subscription-lifetime', label: 'HPバーを開き直す場面で、現在値を表示するタイミングと、同じイベントを重ねて購読しないための解除のタイミングを決められる。' },
        { id: 'menu-navigation', label: '再開・設定・終了の3ボタンについて、マウスで指す操作と、パッドで選択を移して決定する操作をそれぞれ確認できる。' },
      ],
      resources: [
        { label: 'ゲーム内イベントと通知', url: '/game/basics/game-events-and-notifications.html' },
        { label: 'ゲームUIの配置と操作', url: '/game/basics/ui-layout-and-interaction.html' },
      ],
    },
    {
      id: 'game-ecs',
      title: 'ComponentとECS',
      summary: 'オブジェクトに機能を追加する設計と、ID・データ・処理を分けるECSを比較します。',
      prerequisites: ['game-scenes'],
      checks: [
        { id: 'ecs-parts', label: '位置と速度を持つ物体を動かす例で、EntityのID、Componentのデータ、Systemが実行する処理を示せる。' },
        { id: 'query-matches', label: '位置だけの物体と位置・速度の両方がある物体について、位置と速度を要求するQueryでどちらが選ばれるか説明できる。' },
        { id: 'design-fit', label: '少数の物体へ機能を組み合わせる場合と、多数の物体へ同じ処理をまとめて行う場合で、Component方式とECSを選ぶ基準を説明できる。' },
      ],
      resources: [
        { label: 'ComponentパターンとECSの比較', url: '/game/patterns/component-and-ecs.html' },
        { label: 'シーンとコンポーネントの基本', url: '/game/basics/scenes-and-components.html' },
      ],
    },
    {
      id: 'game-assets',
      title: 'アセットの読み込みと寿命',
      summary: 'ロードの要求から利用・解放までを追い、取り消した要求の結果を見分けます。',
      prerequisites: ['game-scenes', 'game-loop'],
      checks: [
        { id: 'import-and-load', label: '画像の取り込み、配布向けの変換、プレイ中のロードが、それぞれいつ行われるか整理できる。' },
        { id: 'ready-stages', label: 'ロードの状態図で、データの読み取りが終わる箇所と、登録が完了してゲームから使える箇所を指せる。' },
        { id: 'stale-generation', label: '実践を実行するか掲載結果を読み、シーン切り替え前の要求が後から完了したとき、世代の照合で結果をどう扱うか説明できる。' },
      ],
      resources: [
        { label: 'アセットロードの状態・世代・所有権', url: '/game/asset-loading.html' },
        { label: '実践 C++とC#でアセットの寿命を検証', url: '/practice/assets/asset-lifecycle-model.html' },
        { label: '実践 ワーカーの結果と世代を照合する', url: '/practice/threads/asset-worker-handoff-observation.html' },
      ],
    },
    {
      id: 'game-save',
      title: 'セーブとシリアライズ',
      summary: '再開に必要な値を選び、保存形式へ変換し、検証してから状態へ戻します。',
      prerequisites: ['game-states'],
      checks: [
        { id: 'persisted-fields', label: '保存例のJSONで、現在のHP、ステージID、所持品IDを指し、素材や実行中のオブジェクトとの関係を説明できる。' },
        { id: 'validate-before-apply', label: '読み込んだHPが最大HPを超えている場合、どの段階で検証し、適用前のゲーム状態をどう扱うか説明できる。' },
        { id: 'migration', label: '旧版のセーブに新項目がない場合、形式の版を見分けて既定値を補い、現在の形式に直す手順を書ける。' },
      ],
      resources: [
        { label: 'セーブとシリアライズの基本', url: '/game/basics/save-data-and-serialization.html' },
        { label: 'セーブデータの互換性を設計する', url: '/design/case-studies/save-data.html' },
      ],
    },
    {
      id: 'game-profiling',
      title: 'デバッグとフレーム時間',
      summary: '処理を止めて状態を調べる方法と、時間を測って引っかかる箇所を探す方法を使い分けます。',
      prerequisites: ['game-loop'],
      checks: [
        { id: 'breakpoint-or-watch', label: '特定の更新関数に入る瞬間と、HPの値が予想外に変わる瞬間を調べるとき、停止させる条件をそれぞれ選べる。' },
        { id: 'frame-interval', label: 'ブラウザ実践の2つの60 FPS表示を比較し、50 ms間隔が現れる箇所をグラフで指せる。' },
        { id: 'inspect-or-time', label: '描画が1回だけ黒くなる箇所を調べる場合と、処理にかかる時間を調べる場合で、フレームキャプチャとプロファイラーの使い方を説明できる。' },
      ],
      resources: [
        { label: 'ブレークポイントとデータブレークポイント', url: '/tools/windows/debugger-breakpoints-and-watchpoints.html' },
        { label: '実践 同じ60 FPSで表示間隔を比べる', url: '/practice/graphics/frame-pacing-observation.html' },
        { label: 'デバッグ・プロファイリングツール', url: '/graphics/optimization/tools.html' },
        { label: 'CPU プロファイリング', url: '/tools/profiling/cpu-profiling.html' },
      ],
    },
    {
      id: 'game-shooter',
      title: '実践 小さなシューティングを作る',
      summary: '入力、固定tick、衝突、ゲームの終了と再開を、小さなゲームの設計と実装でつなげます。',
      prerequisites: ['game-collisions', 'game-states'],
      checks: [
        { id: 'model-and-adapter', label: 'C++版かUnity版のコードで、入力を読む箇所、ルールを進めるModel、状態から描画する箇所を指せる。' },
        { id: 'tick-order', label: '弾と自機が同じ敵に触れたtickで、自機が被弾するかを更新順から予測し、設計と照合できる。' },
        { id: 'verify-game-over', label: '実行するかModelの検査コードを追い、HPが0になって世界の更新が止まった後も、Rで初期状態へ戻ることを確かめられる。' },
      ],
      resources: [
        { label: '実践 小さなシューティングの設計', url: '/game/shooter-design.html' },
        { label: '実装例 C++17とraylib', url: '/game/shooter-cpp.html' },
        { label: '実装例 C#とUnity', url: '/game/shooter-unity.html' },
      ],
    },
  ],
}
