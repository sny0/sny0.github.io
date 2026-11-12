export default {
  tracks: [
    {
      id: 'low-level',
      title: '低レイヤ・言語',
      summary: 'バイト列を読むCの処理を、CPUの命令まで追います。',
      nodeIds: ['bytes', 'c-bytes', 'cpu', 'x64-disassembly'],
    },
    {
      id: 'network-browser',
      title: 'ネットワーク・ブラウザ',
      summary: '名前解決とHTTPから、ブラウザがページを描くまでを学ぶ分野です。',
      nodeIds: [],
    },
    {
      id: 'graphics',
      title: '3DCG・描画',
      summary: 'モデル、カメラ、シェーダから、画面に絵を出すまでを学ぶ分野です。',
      nodeIds: [],
    },
    {
      id: 'game',
      title: 'ゲーム開発',
      summary: '入力、ゲームループ、アセットの読み込みなどを学ぶ分野です。',
      nodeIds: [],
    },
  ],
  nodes: [
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
  ],
}
