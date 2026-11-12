export default {
  tracks: [
    {
      id: 'programming-intro',
      title: 'プログラミング入門',
      summary: '値の更新と処理の流れを読み、実行結果を確かめながら小さなプログラムを1本書きます。',
      showAllByDefault: true,
      nodeIds: ['intro-setup', 'intro-values', 'intro-flow', 'intro-errors', 'intro-debugger', 'intro-project'],
    },
    {
      id: 'unity-game',
      title: 'Unityでゲームを作る',
      summary: 'C#で処理を書き、Unityのシーンと入力を使って小さなシューティングを作ります。',
      showAllByDefault: true,
      nodeIds: ['unity-csharp', 'unity-scene', 'unity-input', 'unity-collision', 'unity-state', 'unity-shooter'],
    },
    {
      id: 'dev-tools',
      title: '開発の道具',
      summary: 'コマンドで作業し、変更を記録しながら、ビルド・デバッグ・計測に必要な道具を使います。',
      showAllByDefault: true,
      nodeIds: ['dev-terminal', 'dev-git', 'dev-build', 'dev-debugger', 'dev-profiler', 'dev-docs', 'dev-ai'],
    },
  ],
  nodes: [
    {
      id: 'intro-setup',
      title: '開発環境を用意する',
      summary: 'エディターと実行に必要なツールを用意し、最初のプログラムを動かします。',
      prerequisites: [],
      checks: [
        { id: 'verify-sdk', label: 'ターミナルでSDKのバージョンを表示し、使う環境を確認できる。' },
        { id: 'create-project', label: 'コンソールプロジェクトを作り、エディターで開いてソースファイルの場所を指せる。' },
        { id: 'change-output', label: '表示する文字を1か所変えて再実行し、新しい文字が出ることを確認できる。' },
      ],
      resources: [
        { label: '開発環境の用意 — Windowsで最初のC#を動かす', url: '/tools/setup-development-environment.html' },
      ],
    },
    {
      id: 'intro-values',
      title: '値・変数・型・式',
      summary: '値に名前を付け、計算や代入を1行ずつ追います。',
      prerequisites: ['intro-setup'],
      checks: [
        { id: 'declaration', label: 'int hp = 100; で型、変数名、最初の値をそれぞれ指せる。' },
        { id: 'track-values', label: '教材の例で、HPからダメージを引いた後の hp と copy の値をそれぞれ予想できる。' },
        { id: 'assignment-and-equality', label: '教材のコードで、値を変える代入と、同じ値かを調べる比較を見分けられる。' },
      ],
      resources: [
        { label: '変数・型・式', url: '/languages/variables-types-and-expressions.html' },
      ],
    },
    {
      id: 'intro-flow',
      title: '条件分岐・繰り返し・関数',
      summary: '条件で処理を選び、繰り返す処理と関数の入出力を読み取ります。',
      prerequisites: ['intro-values'],
      checks: [
        { id: 'choose-branch', label: '教材の ApplyDamage に現在のHPが30、ダメージが30と渡したとき、通る分岐と戻り値を答えられる。' },
        { id: 'loop-iterations', label: '教材の for が何回動き、各回でHPがいくつになるか、実行前に書き出せる。' },
        { id: 'follow-return-value', label: 'ApplyDamage に値を渡す箇所と、戻り値を hp へ保存する箇所を指せる。' },
      ],
      resources: [
        { label: '条件分岐・繰り返し・関数', url: '/languages/control-flow-and-functions.html' },
      ],
    },
    {
      id: 'intro-errors',
      title: 'エラーメッセージの読み方',
      summary: 'エラーを再現し、メッセージを手掛かりに直す場所を絞ります。',
      prerequisites: ['intro-flow'],
      checks: [
        { id: 'error-location', label: 'エラー出力からファイル名、行番号、エラー番号が示された箇所を指せる。' },
        { id: 'error-stage', label: 'サンプルをビルドまたは実行し、コンパイル時の診断と実行中の例外がどの段階で出たか説明できる。' },
        { id: 'verify-fix', label: '原因と思った箇所を1か所直し、同じ操作を繰り返してエラーの消失と期待した出力を確認できる。' },
      ],
      resources: [
        { label: 'エラーメッセージの読み方 — ビルド時と実行時を見分ける', url: '/tools/reading-error-messages.html' },
      ],
    },
    {
      id: 'intro-debugger',
      title: 'デバッガの基本',
      summary: '動いているプログラムを止め、変数の値と処理の順番を調べます。',
      prerequisites: ['intro-errors'],
      checks: [
        { id: 'stop-at-line', label: 'HPを更新する行にブレークポイントを置き、更新前の値を確認できる。' },
        { id: 'step-into-or-over', label: '関数の中を調べる場合と、呼び出し元の次の行へ進む場合で、ステップインとステップオーバーを使い分けられる。' },
        { id: 'watch-a-variable', label: 'ローカル変数やウォッチでHPの値を見ながら、どの行を実行した後に値が変わるか記録できる。' },
      ],
      resources: [
        { label: '開発ツールの基本', url: '/tools/development-tools-basics.html' },
        { label: 'ブレークポイントの実行例', url: '/tools/windows/debugger-breakpoints-and-watchpoints.html' },
      ],
    },
    {
      id: 'intro-project',
      title: '小さなプログラムを1本書く',
      summary: '例えばHP計算のような短い題材で、入力する値と出力する結果を決めて実装します。',
      prerequisites: ['intro-debugger'],
      checks: [
        { id: 'write-a-rule', label: 'HPとダメージから次のHPを求めるルールを書き、通常時とHPが0になる場合の期待値を決められる。' },
        { id: 'run-program', label: '計算を関数にまとめ、入力の組を2つ以上試し、それぞれの結果を表示するプログラムを実行できる。' },
        { id: 'modify-program', label: 'ダメージ量か処理回数を変え、予想した結果と実際の出力を照合できる。' },
      ],
      resources: [
        { label: '題材 HPを更新する関数と繰り返し', url: '/languages/control-flow-and-functions.html' },
        { label: 'コード例を手元で動かす', url: '/guide/software-development-basics.html#run-code' },
      ],
    },
    {
      id: 'unity-csharp',
      title: 'C#の基本',
      summary: 'C#で変数やメソッドを書き、処理をクラスにまとめます。',
      prerequisites: [],
      status: 'planned',
      plannedMaterials: ['C#入門 — コンソールのMainからUnityスクリプトへ'],
      checks: [
        { id: 'variables-and-control-flow', label: 'C#で int と bool の変数を宣言し、if と for を使って出力を変えられる。' },
        { id: 'method-and-class', label: 'C#のクラスに短いメソッドを書き、引数を渡して戻り値を確認できる。' },
        { id: 'unity-entry-point', label: 'C#のコンソール例の Main と、Unityが呼ぶ MonoBehaviour のメソッドを見分けられる。' },
      ],
      resources: [
        { label: '補助教材 変数・型・式のC#サンプル', url: '/languages/variables-types-and-expressions.html' },
        { label: '補助教材 条件分岐・繰り返し・関数のC#サンプル', url: '/languages/control-flow-and-functions.html' },
      ],
    },
    {
      id: 'unity-scene',
      title: 'シーン・オブジェクト・コンポーネント',
      summary: 'シーンに物体を置き、位置や表示を担当する部品を組み合わせます。',
      prerequisites: ['unity-csharp'],
      checks: [
        { id: 'create-and-inspect', label: 'UnityのシーンにGameObjectを作り、Hierarchyで選び、InspectorでTransformを指せる。' },
        { id: 'separate-roles', label: '同じGameObjectに付いたTransformとRendererについて、位置を変える場合と表示を変える場合にそれぞれどちらを操作するか説明できる。' },
        { id: 'parent-child', label: '親と子のGameObjectを置き、親だけを移動したときに子のローカル位置とワールド位置がどうなるか確認できる。' },
      ],
      resources: [
        { label: 'シーン・オブジェクト・コンポーネントの基本', url: '/game/basics/scenes-and-components.html' },
        { label: 'ゲームエンジンの役割', url: '/game/basics/game-engine-basics.html' },
      ],
    },
    {
      id: 'unity-input',
      title: '入力',
      summary: 'キーやボタンの操作を、移動や決定などゲームで使う入力に結び付けます。',
      prerequisites: ['unity-scene'],
      checks: [
        { id: 'bind-action', label: 'キーボードとゲームパッドの異なるボタンを「決定」に割り当てる例で、機器、操作箇所、アクションを区別できる。' },
        { id: 'hold-or-press', label: '方向キーを押し続ける移動と、ボタンを一度押すリトライで、それぞれどの入力状態を調べるか説明できる。' },
        { id: 'trace-input', label: 'シューティングのUnity例で、キーを読み、その結果をModelへ渡す箇所を指せる。' },
      ],
      resources: [
        { label: '入力の基本', url: '/game/basics/input-actions-and-devices.html' },
        { label: 'Unityのシューティングで入力を読むコード', url: '/game/shooter-unity.html' },
      ],
    },
    {
      id: 'unity-collision',
      title: '衝突と物理',
      summary: '形の接触を調べ、動きの変化とゲームのルールにつなげます。',
      prerequisites: ['unity-input'],
      checks: [
        { id: 'collider-and-rigidbody', label: 'Unityの3D物理で、床と重力で落ちる箱に必要なColliderとRigidbodyの組み合わせを選べる。' },
        { id: 'choose-trigger', label: '物体を止める壁と、通り抜けながら重なりを検知する入口を作るとき、どちらにトリガーを使うか説明できる。' },
        { id: 'contact-rule', label: '弾が敵に触れたときの「重なりを検出する」と「敵のHPを減らす」を、判定とゲームのルールに分けられる。' },
      ],
      resources: [
        { label: '衝突と物理の基本', url: '/game/basics/collisions-and-physics.html' },
      ],
    },
    {
      id: 'unity-state',
      title: 'ゲームの状態とポーズ',
      summary: '状態ごとに更新する処理や受け付ける操作を決めます。',
      prerequisites: ['unity-collision'],
      checks: [
        { id: 'state-diagram', label: 'タイトル、プレイ中、ポーズ、結果の4状態を描き、開始・再開・リトライでどこへ移るか示せる。' },
        { id: 'pause-input', label: 'ポーズ中の敵の更新、移動入力、メニューの再開操作を、止める処理と続ける処理に分けられる。' },
        { id: 'restart-values', label: '結果画面からリトライするとき、HP、スコア、画面上の弾をどう初期化するか説明できる。' },
      ],
      resources: [
        { label: 'ゲームの状態とポーズ', url: '/game/basics/game-states-and-pause.html' },
        { label: 'ゲームループと時間', url: '/game/basics/game-loop-and-time.html' },
      ],
    },
    {
      id: 'unity-shooter',
      title: '小さなシューティング',
      summary: '入力・衝突・終了と再開を組み合わせ、Unityで遊べる形にします。',
      prerequisites: ['unity-state'],
      checks: [
        { id: 'start-demo', label: '実装例をUnityのシーンで動かし、自機の移動と射撃を確認できる。' },
        { id: 'find-responsibilities', label: 'コードで入力を読む箇所、当たり判定やHPを更新する箇所、状態から画面を表示する箇所をそれぞれ指せる。' },
        { id: 'play-and-restart', label: 'HPが0になるまで実行し、Rで再開した後にHPとスコアが初期値へ戻ることを確認できる。' },
      ],
      resources: [
        { label: '小さなシューティングの設計', url: '/game/shooter-design.html' },
        { label: 'シューティング実装例 C#とUnity', url: '/game/shooter-unity.html' },
        { label: '次に読む 設計ロードマップ', url: '/learn/roadmap.html#design' },
      ],
    },
    {
      id: 'dev-terminal',
      title: 'ターミナルとシェル',
      summary: '現在の作業場所を確認し、パスや引数を渡してコマンドを実行します。',
      prerequisites: [],
      checks: [
        { id: 'terminal-and-shell', label: 'Windows TerminalとPowerShellを例に、コマンドを入力する画面と、入力を解釈するプログラムを指せる。' },
        { id: 'find-working-directory', label: 'PowerShellで現在のフォルダーを確認し、親フォルダーへ移って中身を一覧できる。' },
        { id: 'quoted-path', label: '空白を含むフォルダーのパスを引用符で囲み、Set-Location に一つの引数として渡せる。' },
      ],
      resources: [
        { label: 'ターミナル・シェル・コマンドの基本', url: '/tools/terminal-shell-and-commands.html' },
        { label: 'ファイルとパス', url: '/os/files-and-paths.html' },
      ],
    },
    {
      id: 'dev-git',
      title: 'Gitとバージョン管理',
      summary: '変更を確認し、作業の区切りごとに履歴を残します。',
      prerequisites: ['dev-terminal'],
      checks: [
        { id: 'read-status', label: '練習用リポジトリで git status を使い、追加したファイルと変更したファイルがどう表示されるか確認できる。' },
        { id: 'compare-diffs', label: 'git diff と git diff --staged を使い、次のコミットに入る変更を確かめられる。' },
        { id: 'commit-and-log', label: 'ファイルを2回変更して2つのコミットを作り、git log からそれぞれの履歴を確認できる。' },
      ],
      resources: [
        { label: 'Gitの基本 — 差分を見てコミットする', url: '/tools/git-basics.html' },
      ],
    },
    {
      id: 'dev-build',
      title: 'ビルドとビルド構成',
      summary: 'ソースから実行できるファイルを作り、用途に合うビルド設定を選びます。',
      prerequisites: ['dev-git'],
      checks: [
        { id: 'compiler-and-build-system', label: 'C++のソースを実行ファイルにする図で、コンパイラ、リンカー、ビルドシステムが担当する仕事を分けられる。' },
        { id: 'build-and-run', label: '教材の小さなプログラムをビルドし、生成された実行ファイルを探して起動できる。' },
        { id: 'choose-configuration', label: '変数を追って不具合を調べる場合と、配布用の動作を確かめる場合で、DebugとReleaseを使い分ける理由を説明できる。' },
      ],
      resources: [
        { label: 'ビルドとは何か', url: '/tools/build/what-is-build.html' },
        { label: 'ビルド構成とデバッグ情報', url: '/tools/build/build-configurations.html' },
      ],
    },
    {
      id: 'dev-debugger',
      title: 'デバッガ',
      summary: '止める条件を選び、値を書き換えた箇所とそこに至った呼び出しを調べます。',
      prerequisites: ['dev-build'],
      checks: [
        { id: 'choose-stop-kind', label: '決まったソース行で停止したい場合と、g_score に書き込まれた瞬間を調べたい場合で、二種類のブレークポイントを選び分けられる。' },
        { id: 'read-call-stack', label: '教材のサンプルか掲載図で、g_score が60、0へ変わるときの関数をコールスタックから特定できる。' },
        { id: 'conditional-breakpoint', label: '敵の更新関数が何体にも呼ばれる例で、敵IDが42のときだけ止まる条件を書ける。' },
      ],
      resources: [
        { label: 'ブレークポイントとデータブレークポイント', url: '/tools/windows/debugger-breakpoints-and-watchpoints.html' },
        { label: '開発ツールの基本', url: '/tools/development-tools-basics.html' },
      ],
    },
    {
      id: 'dev-profiler',
      title: 'プロファイラ',
      summary: '遅いフレームを選び、実行時間や待ち時間が増えた場所を調べます。',
      prerequisites: ['dev-debugger'],
      checks: [
        { id: 'choose-measurement', label: '頻繁にCPUを使う関数を見つけたい場合と、ロード1回の開始・終了を知りたい場合で、サンプリングと計装を選び分けられる。' },
        { id: 'cpu-time-vs-wait', label: '教材のサンプルで、長くなった区間の時間にスリープが含まれることをコードから説明できる。' },
        { id: 'find-long-frames', label: '20フレームの時間を測るサンプルの出力を使い、平均に加えてp95やフレーム予算の超過回数を見る理由を説明できる。' },
      ],
      resources: [
        { label: 'CPUプロファイリング', url: '/tools/profiling/cpu-profiling.html' },
        { label: 'フレームタイムとフレームペーシング', url: '/graphics/optimization/frame-pacing.html' },
      ],
    },
    {
      id: 'dev-docs',
      title: '公式ドキュメントの読み方',
      summary: '使っているバージョンを確認し、APIの仕様を小さな例と照らし合わせます。',
      prerequisites: ['dev-profiler'],
      checks: [
        { id: 'choose-doc-version', label: '手元のツールやエンジンのバージョンを調べ、それに対応する公式資料を開ける。' },
        { id: 'find-api-contract', label: '対象APIの引数、戻り値、動作条件を公式資料の該当箇所で指せる。' },
        { id: 'verify-doc-example', label: '公式資料から読み取った動作を、短いサンプルの期待値と実行結果で確認できる。' },
      ],
      resources: [
        { label: '公式ドキュメントの読み方 — バージョンとAPIの動作を確かめる', url: '/tools/reading-official-documentation.html' },
      ],
    },
    {
      id: 'dev-ai',
      title: 'AIが書いたコードとの付き合い方',
      summary: '提案された変更を読み、目的を満たすかコードと実行結果から判断します。',
      prerequisites: ['dev-docs'],
      checks: [
        { id: 'explain-diff', label: '提案された差分を読み、どの入力でどんな動作が変わるか説明できる。' },
        { id: 'verify-apis', label: 'コードが呼ぶAPIが、使っているバージョンに存在し、使い方も合っているか公式資料で確認できる。' },
        { id: 'test-before-adoption', label: '通常の入力と境界の入力で期待値を先に書き、実行結果を照合して採用する変更を決められる。' },
      ],
      resources: [
        { label: 'AIが書いたコードとの付き合い方 — 差分と実行結果から採用を決める', url: '/tools/reviewing-ai-generated-code.html' },
      ],
    },
  ],
}
