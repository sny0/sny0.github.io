export default {
  nodes: [
    {
      id: 'compile-translation-units',
      title: '前処理と翻訳単位',
      summary: 'ヘッダーとマクロを処理したソースから、翻訳単位ごとのオブジェクトを作る流れをたどります。',
      prerequisites: ['c-bytes'],
      checks: [
        { id: 'preprocessed-output', label: '教材の main.cpp を前処理した出力で、取り込んだ宣言と、MAX_HP が 100 に展開された箇所を指せる。' },
        { id: 'declaration-and-definition', label: 'caller.cpp と target.cpp の例で、呼び出し側のコンパイルに必要な宣言と、リンクで参照を解決する定義を見分けられる。' },
        { id: 'build-stages', label: '前処理後のソース、OBJ、EXEを作る工程を順に並べ、実践で /c を使ったときにどこまで進むか説明できる。' },
      ],
      resources: [
        { label: 'main.cppからCPU命令までの旅', url: '/runtime/cpp-internals/build-pipeline-journey.html' },
        { label: '翻訳単位とヘッダー', url: '/runtime/cpp-internals/translation-units-and-headers.html' },
        { label: '実践 2つのC++ファイルからOBJを作る', url: '/practice/compilers/build-artifact-observation.html' },
      ],
    },
    {
      id: 'compile-frontend',
      title: 'トークン・AST・型検査',
      summary: 'ソースの文字列からトークンを取り出し、式の構造と演算に使う型を調べます。',
      prerequisites: ['compile-translation-units'],
      checks: [
        { id: 'token-boundaries', label: 'return value + step * 2u; をトークンに分け、2u を一つの数値リテラルとして指せる。' },
        { id: 'ast-and-conversion', label: 'ClangのASTダンプか掲載例で、加算の右側に乗算があり、乗算結果が unsigned int から double へ変換される箇所を指せる。' },
        { id: 'diagnostic-stage', label: '教材のセミコロンを除いた例と、文字列に整数を掛けた例について、どちらが文法の問題でどちらが型の問題か説明できる。' },
      ],
      resources: [
        { label: 'トークン・AST・型検査とClangでの観察', url: '/compilers/tokens-ast-and-type-checking.html' },
        { label: 'ソースコードから実行までの全体像', url: '/compilers/source-code-and-execution.html' },
      ],
    },
    {
      id: 'compile-ir',
      title: 'LLVM IRとSSA',
      summary: '基本ブロックを結び、分岐が合流する地点でどの値を使うか読み取ります。',
      prerequisites: ['compile-frontend'],
      checks: [
        { id: 'control-flow', label: 'choose_offset のIRで br と ret を探し、入口から二つの分岐が合流して戻るまでを矢印で描ける。' },
        { id: 'phi-inputs', label: 'base が10のとき、phi が真の経路と偽の経路で選ぶ値を挙げ、二つの戻り値を計算できる。' },
        { id: 'invalid-phi', label: '教材のIRから phi の入力を片方だけ取り除いたとき、どの経路の値が欠けるか説明できる。LLVMが使える場合は検証ツールの診断も確認する。' },
      ],
      resources: [
        { label: 'LLVM IRとSSAの図、掲載コード、検証手順', url: '/compilers/llvm-ir-and-ssa.html' },
      ],
    },
    {
      id: 'compile-link',
      title: 'OBJ・EXEとリンク',
      summary: '別々に作ったOBJの参照と定義を結び、リンク後の命令と実行ファイルを調べます。',
      prerequisites: ['compile-translation-units', 'cpu'],
      checks: [
        { id: 'match-symbols', label: '実践の caller.obj の再配置一覧と target.obj のシンボル表で、adjust を参照する箇所と定義を指せる。掲載例でも確認できる。' },
        { id: 'relative-call', label: 'COFFの掲載例で、次の命令のアドレスと呼び出し先のアドレスから、call の相対変位を計算できる。' },
        { id: 'exe-imports', label: 'リンク後のEXEで adjust を呼べることを実行結果から確かめ、EXEのDLLインポート一覧に adjust が現れない理由を説明できる。' },
      ],
      resources: [
        { label: '実践 OBJ・EXE・PDBを作って読む', url: '/practice/compilers/build-artifact-observation.html' },
        { label: 'COFFのシンボルと再配置', url: '/compilers/coff-relocations.html' },
        { label: 'オブジェクトファイル・ライブラリ・DLL', url: '/runtime/cpp-internals/object-files-and-libraries.html' },
      ],
    },
    {
      id: 'compile-abi',
      title: 'ABIと呼出規約',
      summary: 'コンパイル済みのコードをつなぐときに、シンボル名、引数、データの配置をどうそろえるかを調べます。',
      prerequisites: ['compile-link', 'x64-disassembly'],
      checks: [
        { id: 'mixed-arguments', label: 'Mix(int, double, int) の三つの引数を、Windows x64の既定規約とSystem V AMD64でそれぞれどのレジスタに置くか表にできる。' },
        { id: 'decorated-symbols', label: '掲載例で Add(int, int) と Add(float, float) のシンボルを区別し、実践の adjust で extern "C" を使った理由を説明できる。' },
        { id: 'binary-contract', label: '構造体をDLL境界で渡す例で、フィールドの型幅、位置、アラインメントを呼び出しの両側でどう照合するか説明できる。' },
      ],
      resources: [
        { label: '関数呼び出しとWindows・System Vの比較', url: '/runtime/cpp-internals/function-calls-and-cpu.html' },
        { label: 'シンボル・名前修飾・ABI', url: '/runtime/cpp-internals/symbols-and-linkage.html' },
        { label: '実践 別ファイルの関数をシンボル表で追う', url: '/practice/compilers/build-artifact-observation.html' },
      ],
    },
    {
      id: 'compile-opt-debug',
      title: '最適化とデバッグ',
      summary: '同じ関数の最適化設定を変えて命令列を比較し、実行中の位置を調べる方法を選びます。',
      prerequisites: ['x64-disassembly', 'compile-translation-units'],
      checks: [
        { id: 'compare-codegen', label: 'Cのデコーダーの /Od と /O2 の逆アセンブリを見比べ、この例で引数をスタックに保存する箇所と、レジスタのまま使う箇所をそれぞれ指せる。' },
        { id: 'optimization-and-symbols', label: '実践のビルド指定から最適化とデバッグ情報を制御するオプションを指し、調べるEXEに対応するPDBを選べる。' },
        { id: 'instruction-breakpoint', label: 'ソース行と命令の対応が分かりにくいとき、逆アセンブリで長さを比較する命令を探し、命令単位で停止位置を指定できる。' },
      ],
      resources: [
        { label: '実践 Cのデコーダーを最適化あり・なしで比較する', url: '/practice/compilers/c-byte-decoder-disassembly.html' },
        { label: 'ビルド構成とデバッグ情報', url: '/tools/build/build-configurations.html' },
        { label: 'ソース行と命令のブレークポイント', url: '/tools/windows/debugger-breakpoints-and-watchpoints.html' },
      ],
    },
  ],
}
