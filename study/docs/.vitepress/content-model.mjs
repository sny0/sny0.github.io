export const sections = [
  { id: 'reference', title: '技術辞典', action: '調べる', url: '/', description: '用語、仕組み、内部動作を、分野と名前から調べる。' },
  { id: 'learning', title: '学習ガイド', action: '順番に学ぶ', url: '/learn/', description: '前提知識と読む順番を選び、辞典の解説へ進む。' },
  { id: 'practice', title: '実践・サンプル', action: '作る・試す', url: '/practice/', description: '制作手順、コード例、演習を通して確かめる。' }
]

export const formatLabels = {
  article: '解説', glossary: '用語集', history: '技術史', references: '参考資料',
  index: '目次', path: '学習経路', tutorial: '制作手順', exercise: '演習', sample: 'サンプル'
}

export const statusLabels = { published: '公開中', outline: '学習計画・概要', draft: '草稿', planned: '執筆予定' }

export const collections = [
  { id: 'audio-spatial-observation', section: 'practice', title: 'Web Audioで音の方向と距離を変えて聴く', description: '音源の方向と距離を変え、左右の出力と距離による減衰を図と試聴で比べる。', start: '/practice/browser/audio-spatial-observation.html' },
  { id: 'audio-reverb-observation', section: 'practice', title: 'Web Audioで畳み込みリバーブを聴き比べる', description: 'インパルス応答と残響側のゲインを変え、打音のあとに残る響きを波形と試聴で確かめる。', start: '/practice/browser/audio-reverb-observation.html' },
  { id: 'audio-feedback-observation', section: 'practice', title: 'Web Audioで反響の間隔と減衰を観察する', description: '遅延時間とフィードバックゲインを変え、反響の時刻と振幅をグラフと試聴で確かめる。', start: '/practice/browser/audio-feedback-observation.html' },
  { id: 'audio-comb-observation', section: 'practice', title: 'Web Audioで遅延とコムフィルターを観察する', description: '同じ音の遅延時間とゲインを変え、打ち消される周波数をグラフと試聴で確かめる。', start: '/practice/browser/audio-comb-observation.html' },
  { id: 'audio-crossfade-observation', section: 'practice', title: 'Web Audioで線形と等電力のクロスフェードを比べる', description: '二つの音を入れ替え、フェードの形と音源の組み合わせで途中の実効値がどう変わるかを観察する。', start: '/practice/browser/audio-crossfade-observation.html' },
  { id: 'audio-fade-observation', section: 'practice', title: 'Web Audioで急な消音とフェードを観察する', description: '同じ音を急に消した場合と少しずつ消した場合を比べ、切り替え前後のサンプル値を確かめる。', start: '/practice/browser/audio-fade-observation.html' },
  { id: 'audio-mixing-observation', section: 'practice', title: 'Web Audioでゲインとクリッピングを観察する', description: '二つの波形を足し、クリップ前後のピークと、振幅の基準を超えたフレーム数を比べる。', start: '/practice/browser/audio-mixing-observation.html' },
  { id: 'audio-buffer-observation', section: 'practice', title: 'AudioWorkletで先読みとアンダーランを観察する', description: '同じ音声データを先読みの有無でレンダリングし、不足したフレーム数と波形を比べる。', start: '/practice/browser/audio-buffer-observation.html' },
  { id: 'ring-buffer-observation', section: 'practice', title: 'リングバッファの満杯・折り返し・読み出し順を観察する', description: '4つの枠を使うキューを操作し、読み書き位置と満杯・空の判定、枠の再利用を確かめる。', start: '/practice/browser/ring-buffer-observation.html' },
  { id: 'atomics-observation', section: 'practice', title: 'Workerの競合とAtomicsの待機・通知を観察する', description: '共有カウンターの失われた更新、不可分な加算、準備フラグと通知の順序を比べる。', start: '/practice/browser/atomics-observation.html' },
  { id: 'wasm-abi-observation', section: 'practice', title: 'WebAssemblyへ配列とUTF-8を渡し、メモリ確保を観察する', description: '線形メモリに配列と文字列を置き、ポインタと長さ、アラインメント、アリーナの確保位置を確かめる。', start: '/practice/browser/wasm-abi-observation.html' },
  { id: 'wasm-memory-observation', section: 'practice', title: 'WebAssemblyの読み込みと線形メモリを観察する', description: 'Wasmを読み込み、JavaScriptとWasmで同じバイトを読み、境界チェックとメモリの拡張を試す。', start: '/practice/browser/wasm-memory-observation.html' },
  { id: 'cross-origin-isolation-observation', section: 'practice', title: 'Workerへのコピーと共有メモリをブラウザで観察する', description: 'WindowとWorkerの分離状態、ArrayBufferのコピー、共有メモリ、別オリジン画像の読み込みを比べる。', start: '/practice/browser/cross-origin-isolation-observation.html' },
  { id: 'csrf-observation', section: 'practice', title: 'CSRFでCookie付きの要求が届く条件を観察する', description: '同一サイトの2つのオリジンからフォームを送り、Originとセッショントークンの検査を比べる。', start: '/practice/browser/csrf-observation.html' },
  { id: 'xss-csp-observation', section: 'practice', title: 'textContent・innerHTML・CSPの違いを観察する', description: '同じ文字列から要素が作られるか、イベント属性が実行されるか、CSP違反が通知されるかを比べる。', start: '/practice/browser/xss-csp-observation.html' },
  { id: 'cookie-session-observation', section: 'practice', title: 'ブラウザでCookieの範囲とセッションIDを観察する', description: 'CookieのPathと、HTTPで受け渡すHttpOnlyのID、サーバー側の記録と失効を比べる。', start: '/practice/browser/cookie-session-observation.html' },
  { id: 'cors-observation', section: 'practice', title: 'ブラウザで同一オリジンとCORSの応答を比べる', description: '同じ固定テキストを通常ページとsandboxから取得し、応答の読み取りとpreflightの違いを確かめる。', start: '/practice/browser/cors-observation.html' },
  { id: 'service-worker-observation', section: 'practice', title: 'Service Workerで応答元と登録状態を観察する', description: '専用scopeで登録と制御開始を確認し、固定GETのネットワーク応答・保存済み応答・解除を試す。', start: '/practice/browser/service-worker-observation.html' },
  { id: 'storage-observation', section: 'practice', title: 'ブラウザで保存・再読込・削除を観察する', description: 'localStorage・IndexedDB・Cache APIへ固定データを保存し、読出し、ページ再読込、専用データの削除を確かめる。', start: '/practice/browser/storage-observation.html' },
  { id: 'http-cache-observation', section: 'practice', title: 'C++とC#でHTTPの再検証を観察する', description: 'ローカルサーバーへ条件付きGETを送り、200と304、ETagの弱い比較、保存した本文の再利用を確かめる。', start: '/practice/network/http-cache-observation.html' },
  { id: 'stream-backpressure-observation', section: 'practice', title: 'Streams APIで供給と処理の速度差を観察する', description: '有限のデータを遅い書き込み先へ送り、pull、desiredSize、完了と中断を確かめる。', start: '/practice/browser/stream-backpressure-observation.html' },
  { id: 'worker-pool-observation', section: 'practice', title: 'Worker poolで待機数と取消しを観察する', description: '実行枠2・待機枠4へ7件を依頼し、受付拒否、待機取消し、実行中の結果破棄、停止と再起動を確かめる。', start: '/practice/browser/worker-pool-observation.html' },
  { id: 'worker-message-observation', section: 'practice', title: 'Web Workerでコピー・転送・停止を観察する', description: '同じ16バイトを複製または転送して往復し、バッファの状態、要求ID、停止と再起動、送信時の例外を確かめる。', start: '/practice/browser/worker-message-observation.html' },
  { id: 'event-loop-observation', section: 'practice', title: 'ブラウザでPromiseとawaitの実行順を観察する', description: '同期処理、Promise、有限のマイクロタスク列、timerとrAFのcallbackを記録し、保証される順序と観測した順序を分ける。', start: '/practice/browser/event-loop-observation.html' },
  { id: 'render-observation', section: 'practice', title: 'ブラウザでDOMと描画の変化を観察する', description: '幅・色・移動・透明度とDOMテキストを変更し、寸法APIとrAFで分かる範囲を確かめる。', start: '/practice/browser/render-observation.html' },
  { id: 'https-observation', section: 'practice', title: 'C++とC#でHTTPSの接続情報を観察する', description: '標準の証明書検証を保ったGETで、TLS情報、証明書、HTTP応答を区別して確認する。', start: '/practice/network/https-observation.html' },
  { id: 'name-resolution-observation', section: 'practice', title: 'C++とC#で名前解決の結果を観察する', description: '数値IP、localhost、追加指定した公開名をOSのAPIで調べ、成功・失敗・取消と結果の限界を確かめる。', start: '/practice/network/name-resolution-observation.html' },
  { id: 'http-message-observation', section: 'practice', title: 'C++とC#でHTTPの要求と応答を観察する', description: 'ローカルのGET一回から、ヘッダーと本文、Content-Length、受信の終了を確かめる。', start: '/practice/network/http-message-observation.html' },
  { id: 'tcp-loopback-observation', section: 'practice', title: 'C++とC#でTCPのバイト列と半閉鎖を観察する', description: '同じPC内の接続で、送受信量、長さ付きメッセージ、EOF、アプリ応答を確かめる。', start: '/practice/network/tcp-loopback-observation.html' },
  { id: 'mapped-file-observation', section: 'practice', title: 'C++とC#で読み取り専用のファイルマッピングを観察する', description: '通常のreadと同じバイト列を読み、ファイル位置・ビュー内の位置・整列・寿命を確かめる。', start: '/practice/io/mapped-file-observation.html' },
  { id: 'asset-lifecycle-model', section: 'practice', title: 'C++とC#でアセットの状態と寿命を試す', description: '状態遷移モデルで、利用可能になる時点、古い完了の破棄、キャンセル後の回収を確かめる。', start: '/practice/assets/asset-lifecycle-model.html' },
  { id: 'async-file-read-observation', section: 'practice', title: 'C++とC#で同期・非同期I/Oを比べる', description: '同じファイルを同期・非同期で読み、要求の発行、完了結果、バッファを使える時点を確かめる。', start: '/practice/io/async-file-read-observation.html' },
  { id: 'file-read-observation', section: 'practice', title: 'C++とC#でファイルの読み取りを観察する', description: '要求数・実読取数・位置・EOFを、自己所有の一時ファイルで確かめる。', start: '/practice/io/file-read-observation.html' },
  { id: 'thread-synchronization', section: 'practice', title: 'C++とC#で在庫の同期を確かめる', description: '確認と消費を同じロックで守り、共有状態・スナップショット・終了待ちと寿命を観察する。', start: '/practice/threads/inventory-synchronization.html' },
  { id: 'float-comparison-observation', section: 'practice', title: 'C++とC#でfloatの比較を確かめる', description: '絶対・相対許容差とNaN・Infの扱いを明示し、境界・非推移性・失われた座標差を観察する。', start: '/practice/math/float-comparison-observation.html' },
  { id: 'unicode-observation', section: 'practice', title: 'C++とC#で文字の表現を観察する', description: 'UTF-8のバイト列、UTF-16のコード単位、文字列の長さと不正な入力の扱いを比較する。', start: '/practice/data/unicode-observation.html' },
  { id: 'float-observation', section: 'practice', title: 'C++でfloatの表現と刻み幅を観察する', description: 'binary32のビット表現、nextafterによる隣接値、丸めとepsilonの関係を確かめる。', start: '/practice/data/float-spacing-observation.html' },
  { id: 'integer-observation', section: 'practice', title: 'C++で整数とバイト列を観察する', description: '値・ビット表示・実メモリのバイト列と、明示的なLE/BE形式の違いを確かめる。', start: '/practice/data/integer-byte-observation.html' },
  { id: 'process-observation', section: 'practice', title: 'Windowsでプロセスとスレッドを観察する', description: 'C++でmain前の記録、PID・TID、子プロセスとワーカースレッドを確かめる。', start: '/practice/process/windows-process-observation.html' },
  { id: 'memory-observation', section: 'practice', title: 'Windowsでメモリの状態を観察する', description: 'C++で予約・コミット・初回書込み・解放を分け、仮想メモリとプロセスの指標を確かめる。', start: '/practice/memory/windows-memory-observation.html' },
  { id: 'questions', section: 'learning', title: '疑問から選ぶ読み順', description: 'メモリ確保、実行、描画など、いまの疑問から関連する本文をたどる。', start: '/guide/learning-paths.html' },
  { id: 'cpp-design', section: 'learning', title: 'C++とゲーム設計を学ぶ', description: '設計原則、言語、メモリ、ビルド、エンジンとの対応を目的別に読む。', start: '/guide/cpp-roadmap.html' },
  { id: 'rendering', section: 'learning', title: 'リアルタイム描画を学ぶ', description: 'GPUと数学から、パイプライン、シェーダ、描画APIへ進む。', start: '/guide/rendering/roadmap.html' },
  { id: 'low-level', section: 'learning', title: '低レイヤからゲームの仕組みを学ぶ', description: 'CPU・メモリ・OSからゲームまでの学習計画。詳解が未整備のテーマも明示。', start: '/guide/low-level/', linear: true },
  { id: 'shooter', section: 'practice', title: '小さなシューティングを作る', description: '共通の設計を読み、C++版またはUnityのC#版で実装する。', start: '/game/shooter-design.html' },
  { id: 'renderer-project', section: 'practice', title: '小さなレンダラーを作る', description: '設計、デバイス、リソース、三角形、1フレームの構成を、主要コードの断片とともに追う。', start: '/graphics/capstone/01-design.html', linear: true },
  { id: 'cpp-exercises', section: 'practice', title: 'C++と設計の演習', description: '分野別の問題と総合演習で、判断理由と実装の理解を確かめる。', start: '/guide/exercises/' },
  { id: 'cpp-samples', section: 'practice', title: 'C++のビルドサンプル', description: '翻訳単位やCMakeの小さなコードを手元で動かす。', start: '/tools/build/samples/' },
  { id: 'design-refactoring', section: 'practice', title: '小さなアプリで設計を試す', description: '注文アプリを題材に、依存関係、テスト、リファクタリングを考える。', start: '/design/notebook/practice.html' }
]
