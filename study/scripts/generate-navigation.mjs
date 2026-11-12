import fs from 'node:fs'
import { sections, formatLabels, statusLabels, collections } from '../docs/.vitepress/content-model.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docs = path.join(root, 'docs')
const dataDir = path.join(docs, '.vitepress')
const dependencyRequire = createRequire(process.env.STUDY_NODE_MODULES
  ? path.join(process.env.STUDY_NODE_MODULES, 'vitepress/package.json')
  : path.join(root, 'package.json'))
const YAML = dependencyRequire('yaml')
function matter(text) {
  const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  return match ? { data:YAML.parse(match[1]) || {}, content:text.slice(match[0].length) } : { data:{}, content:text }
}

const domains = [
  ['data','情報表現とバイナリ','数値・文字・バイト列を、メモリやファイルの表現へつなぐ。','ビットとバイト、整数・浮動小数点、Unicode、エンディアン、ファイル形式、圧縮'],
  ['hardware','ハードウェア','CPU・GPU・メモリ・デバイスの間で、命令とデータがどう動くかを調べる。','論理回路、ISA・レジスタ、命令実行、分岐予測、キャッシュ・TLB、SIMD、PCIe、割り込み・DMA・IOMMU'],
  ['os','OS','プロセス、メモリ、スレッド、入出力の仕組みを調べる。','カーネル、プロセス・スレッド、仮想メモリ、システムコール、ファイル・非同期I/O、IPC、権限'],
  ['compilers','コンパイラとツールチェーン','ソースコードが実行可能になるまでを追う。','字句・構文・型検査、AST・IR・SSA、最適化、コード生成、リンク・再配置、ABI、ローダー、デバッグ情報'],
  ['languages','言語','型、所有、寿命、実行の違いから、各言語の構文を調べる。','アセンブリ、C、C++、C#、Rust、Zig、PowerShell、POSIX sh/Bash、Python、HLSL・GLSL'],
  ['runtime','実行時の仕組み','確保・所有・解放から、GC、非同期、言語境界へつなぐ。','alloc内部、スタック・ヒープ、RAII、仮想メモリ、GC、IL・JIT/AOT、例外、非同期、FFI'],
  ['browser','ブラウザ','URLを開いてから描画されるまでを、通信・実行・表示に分ける。','navigation、DOM・CSS、JavaScript実行、event loop、layout・paint・composite、プロセス隔離、キャッシュ・保存領域'],
  ['network','ネットワーク','通信の層と失敗を、Webとゲームの両方から調べる。','IP・DNS、TCP・UDP・QUIC、TLS・HTTP、socket、メッセージ境界、遅延・再送・流量制御'],
  ['math','数学・数値計算','座標と式を、描画やシミュレーションへ結び付ける。','ベクトル・行列、座標規約、射影、クォータニオン、補間、幾何、数値誤差、確率・統計'],
  ['algorithms','データ構造・アルゴリズム','操作手順、計算量、不変条件から道具を選ぶ。','配列・ハッシュ・ヒープ・木、探索・ソート、BFS・Dijkstra・A*、BVH、空間分割'],
  ['design','設計','責務、依存、パターンと、その使いどころを調べる。','責務・凝集度・結合度、SOLID、GoF、データ指向、API、テスト、アーキテクチャ、命名'],
  ['graphics','3DCGとグラフィックス','制作データからGPUの処理、最終表示までをつなぐ。','メッシュ・UV・材質、リグ・アニメーション、シェーダ、OpenGL・Direct3D・Vulkan、光・色・最適化'],
  ['game','ゲームとエンジン','入力、時間、ECSと各サブシステムの関係を調べる。','入力・ループ、シーン、ECS、物理・衝突、AI、音、UI、アセット、通信、Unity・Unreal'],
  ['history','ビデオゲーム史','作品、ハード、作り方、遊ぶ場所の変化を、技術の変化とあわせて見る。','前史、アーケード・家庭用・PC・携帯、3D、配信、オンライン、文化、保存、年別ソフト・ハード'],
  ['tools','開発ツールと調査機能','どの機能で何を観察し、どう確かめるかを調べる。','IDE、デバッガ、CPU・GPU・メモリ計測、フレーム解析、バイナリ解析、ビルド・依存管理、テスト、Git・CI']
].map(([id,title,description,planned]) => ({ id,title,description,planned }))

const readJSON = (name, fallback) => fs.existsSync(path.join(dataDir,name))
  ? JSON.parse(fs.readFileSync(path.join(dataDir,name),'utf8')) : fallback
const core = readJSON('catalog-core.json', [])
const added = readJSON('catalog-new.json', [])
const imported = [...core, ...(Array.isArray(added) ? added : added.entries || [])]
const importedByUrl = new Map(imported.map(entry => [entry.url, entry]))
const extraAliases = [
  [/allocator|アロケータ/i, ['alloc','allocate','malloc','アロック','メモリ確保']],
  [/component-and-ecs|^ECS|Entity Component System/i, ['ECS','Entity Component System','エンティティ・コンポーネント・システム']],
  [/hlsl/i, ['HLSL','シェーダ言語']], [/glsl/i, ['GLSL','シェーダ言語']],
  [/directx12|DirectX 12|Direct3D 12/i, ['DX12','D3D12','Direct3D 12']],
  [/directx11|DirectX 11|Direct3D 11/i, ['DX11','D3D11','Direct3D 11']],
  [/opengl/i, ['OpenGL','GL']], [/vulkan/i, ['Vulkan','VK']],
  [/raii/i, ['RAII','リソースの寿命管理']], [/dependency-inversion|依存性逆転/i, ['DIP','依存性逆転']],
  [/video-games/i, ['ゲーム史','ビデオゲーム史','ゲームの歴史','名作','ゲーム機']]
]

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(item => {
    if (['.vitepress','public','node_modules'].includes(item.name)) return []
    const full=path.join(dir,item.name)
    return item.isDirectory() ? walk(full) : full.endsWith('.md') ? [full] : []
  })
}
function urlFor(file) {
  const relative=path.relative(docs,file).split(path.sep).join('/')
  return relative==='index.md' ? '/' : relative.endsWith('/index.md')
    ? '/'+relative.slice(0,-8) : '/'+relative.slice(0,-3)+'.html'
}
const generatedLegacyAnchors = {"guide/index.md": "ガイドと読み進め方", "guide/learning-paths.md": "読み進め方"}
function writePage(relative, title, study, body, layout) {
  const oldAnchor = generatedLegacyAnchors[relative]
  if (oldAnchor) body = `<div id="${oldAnchor}" class="study-legacy-anchor" aria-hidden="true"></div>\n\n` + body
  const file = path.join(docs, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const data = {
    title, ...(layout ? { layout } : {}),
    study: { source: '統合ガイド', status: 'published', generated: true, catalog: false, ...study }
  }
  fs.writeFileSync(file, '---\n' + JSON.stringify(data, null, 2) + '\n---\n\n' + body + '\n', 'utf8')
}

function linkedUrls(content, file) {
  const clean = content.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
  const matches = [...clean.matchAll(/\[[^\]\n]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)].map(match => match[1])
  matches.push(...[...clean.matchAll(/\bhref=["']([^"']+)["']/g)].map(match => match[1]))
  return [...new Set(matches.filter(value => !/^(?:https?:|mailto:|data:|#|\/\/)/.test(value)).map(value => {
    const url = new URL(value, 'https://study.invalid' + urlFor(file))
    return decodeURIComponent(url.pathname).replace(/^\/study\//, '/').replace(/\.md$/, '.html').replace(/\/index\.html$/, '/')
  }))]
}

let entries = []
for (const file of walk(docs)) {
  const parsed = matter(fs.readFileSync(file, 'utf8'))
  const meta = parsed.data.study
  if (!meta || meta.generated) continue
  const url = urlFor(file)
  const base = importedByUrl.get(url) || {}
  const title = parsed.data.title || parsed.content.match(/^# (.+)$/m)?.[1] || path.basename(file, '.md')
  const domain = meta.domain || base.domain
  if (!sections.some(section => section.id === meta.section) || !formatLabels[meta.format] || !statusLabels[meta.status]) {
    throw new Error(`Set study.section, study.format and study.status explicitly: ${path.relative(docs, file)}`)
  }
  if (![...domains.map(item => item.id), 'guide', 'terms'].includes(domain)) throw new Error('Unknown domain: ' + url)
  if (meta.collection && !collections.some(item => item.id === meta.collection && item.section === meta.section)) {
    throw new Error('Unknown or mismatched collection: ' + url)
  }
  const aliases = [...(base.aliases || []), ...(meta.aliases || []), ...(parsed.data.aliases || [])]
  for (const [pattern, values] of extraAliases) if (pattern.test(title + ' ' + url)) aliases.push(...values)
  entries.push({
    title, url, file: path.relative(docs, file).split(path.sep).join('/'), domain,
    section: meta.section, format: meta.format, status: meta.status,
    summary: meta.summary || base.summary || '', source: meta.source || base.source || '個人ノート',
    aliases: [...new Set(aliases)], ...(meta.collection ? { collection: meta.collection } : {}),
    ...(Number.isFinite(meta.order) ? { order: meta.order } : {}),
    ...(meta.verification ? { verification: meta.verification } : {}), links: linkedUrls(parsed.content, file)
  })
}

const byTitle = (a, b) => a.title.localeCompare(b.title, 'ja')
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999) || byTitle(a, b)
const pageLink = entry => `- [${entry.title.replace(/\[/g, '［').replace(/\]/g, '］')}](${entry.url})${entry.status === 'published' ? '' : ' — ' + statusLabels[entry.status]}`
const list = selected => selected.map(pageLink).join('\n')
const at = url => entries.find(entry => entry.url === url)

writePage('index.md', '技術辞典', { section: 'reference', format: 'index', domain: 'guide' }, '<StudyCatalog section="reference" />', 'page')
writePage('learn/index.md', '学習ガイド', { section: 'learning', format: 'index', domain: 'guide' }, '<StudyCatalog section="learning" />', 'page')
writePage('practice/index.md', '実践・サンプル', { section: 'practice', format: 'index', domain: 'guide' }, '<StudyCatalog section="practice" />', 'page')

writePage('guide/about.md', 'この技術辞典について', { section: 'reference', format: 'index', domain: 'guide' }, `# この技術辞典について

コンピュータの内部、言語、開発ツール、3DCG、ゲーム開発を扱う個人の技術ノートです。自分で調べ直せるようにまとめた辞典を一般公開しています。

## 目的に応じた3つの入口

| 入口 | 調べられること |
| --- | --- |
| [技術辞典](/) | 用語の意味、仕組み、内部動作、比較、注意点。分野と名前から調べます。 |
| [学習ガイド](/learn/) | 前提知識、到達目標、読む順番。詳しい説明は辞典の本文へつなぎます。 |
| [実践・サンプル](/practice/) | 制作手順、コード例、演習。動かしたり考えたりして確かめます。 |

「分野」は扱うテーマを示し、「入口」はページの用途を示します。同じテーマの学習ガイドと本文は、それぞれの入口から探せます。各本文の「関連する学習ガイド・実践」からも行き来できます。

## 記事の状態と確認範囲

「草稿」は増補・推敲中の解説、「学習計画・概要」は学ぶ範囲と演習の案内です。学習計画があるだけの分野を、辞典本文が整っている分野と同じ扱いにはしていません。各分野の目次で、公開済みの本文と、これから増補する範囲を確認できます。

公開中という状態は、コードの実行や技術内容の全面的な検証を保証しません。対象の言語・規格・エンジン・OSと、実行確認の範囲は個々の本文に従ってください。「モデル検証済み」等の記録は、そのページに書かれた確認範囲に限ります。

標準で保証されること、典型的な実装、実測結果、設計上の助言を区別して読みます。元原稿の出典と検証記録も保っています。

## 探し方

各入口の索引では、その入口に属するページをタイトル・別名で絞り込めます。画面上部の全文検索はサイト全体が対象です。[用語・別名](/terms/)からも説明へ進めます。

元の教本の章順は学習ガイドに残し、辞典では主題の名前を使います。再編前のURLからも、同じページを開けます。

誤りや改善点は、[このサイトのソース](https://github.com/sny0/sny0.github.io/tree/main/study)から確認できます。`)

writePage('guide/index.md', '学習ガイドの入口', { section: 'learning', format: 'index', domain: 'guide' }, `# 学習ガイドの入口

読む順番と前提知識は[学習ガイド一覧](/learn/)にまとめています。用語や仕組みを調べるときは[技術辞典](/)、手を動かす題材は[実践・サンプル](/practice/)へ進んでください。

${collections.filter(item => item.section === 'learning').map(item => `- [${item.title}](${item.start}) — ${item.description}`).join('\n')}`)

writePage('guide/learning-paths.md', '疑問から選ぶ読み順', {
  section: 'learning', format: 'path', domain: 'guide', catalog: true, collection: 'questions', order: 0,
  summary: 'コンピュータの部品と通信の基礎から、整数・文字コード、メモリ確保、起動、同期、ファイルI/O、アセットロード、DNS・TCP・HTTP・TLS、入力と描画、Webの疑問から本文をたどる。'
}, `# 疑問から選ぶ読み順

辞典を最初から順番に読む必要はありません。いまの疑問に関係する本文から選びます。

## 部品や通信の名前から確認したい

- [コンピュータの部品から読む](/guide/hardware-basics.html)で、CPU・RAM・SSDの役割から、命令の実行とメモリの使い分けへ進む。
- [ネットワークの基本から読む](/guide/network-basics.html)で、パケットとプロトコル、IPとポート、家庭内の機器を調べる。
- [プログラムを書く・動かす基礎](/guide/software-development-basics.html)で、OSとファイル、変数と関数、コンパイルと開発ツールの関係を追う。
- [3DCGの形と見た目から読む](/guide/graphics-basics.html)で、メッシュ、座標、材質、光から画像が作られる流れを調べる。
- [ゲームの動きと構成から読む](/guide/game-development-basics.html)で、エンジン、時間、シーン、衝突判定をつなげる。

## 整数はメモリにどう並ぶか

1. [整数をビット列・16進数・バイト列で読む](/data/integer-bits-and-bytes.html)で、値、表記、符号の解釈、バイト順を分ける。
2. [C++の整数・バイト列観察サンプル](/practice/data/integer-byte-observation.html)で、型の幅と実メモリ、明示的なLE/BE形式を比較する。
3. [メモリレイアウトとアラインメント](/runtime/cpp-internals/memory-layout.html)で、オブジェクトを置く場所やパディングとの違いを調べる。

## Cでバイト列を読み、機械語を追う

1. [Cでバイト列を読む](/languages/c/reading-byte-arrays.html)で、配列を関数へ渡すときの型と長さ、構造体の配置、バイト列から値を作る手順を確認する。
2. [x86-64の逆アセンブリでCの処理を追う](/practice/compilers/c-byte-decoder-disassembly.html)で、同じCコードをビルドし、引数、バイトの読み取り、戻り値を調べる。
3. レジスタの割り当てを詳しく調べるときは[関数呼び出し・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)へ進む。

## floatで小さな差が消えるのはなぜか

1. [floatが表せる値と丸め](/data/floating-point-spacing.html)で、binary32の有効精度、表現できる値の間隔、丸めを調べる。
2. [C++のfloat観察サンプル](/practice/data/float-spacing-observation.html)で、ビット表現、隣接値、2の冪の境界、epsilonの意味を確かめる。
3. [座標変換](/math/rendering/transform.html)と[カメラ・深度](/math/rendering/camera.html)で、描画で数値の尺度を扱う場面へつなぐ。

## floatを等しいと判定するには

1. [浮動小数点の比較と許容差](/math/floating-point-comparison.html)で、厳密な等値と近似一致、単位を持つ絶対許容差と無次元の相対許容差を分ける。
2. [C++・C#の比較サンプル](/practice/math/float-comparison-observation.html)で、境界・NaN・Inf・非推移性・保存時に失われた座標差を確かめる。
3. 表現できる値の間隔から調べたい場合は[floatの刻み幅](/data/floating-point-spacing.html)へ戻る。

## 文字はどのようにバイト列になるか

1. [Unicodeと文字コード](/data/unicode-and-encoding.html)で、コードポイント、UTF-8／UTF-16のコード単位、バイト列を分ける。
2. [C++・C#の文字列観察サンプル](/practice/data/unicode-observation.html)で、日本語・絵文字・結合文字の表現と、長さの数え方を比べる。
3. [整数とバイト列](/data/integer-bits-and-bytes.html)のエンディアンと結び付け、ファイルやAPIの文字コードを確認する。

## 「確保する」と内部で何が起きるか

1. [記憶域期間・スコープ・寿命](/runtime/memory/storage-duration-and-lifetime.html)を区別する。
2. [malloc/newの内部](/runtime/memory/allocation-journey.html)で、空き領域の再利用、必要時のOS要求、構築・破棄を追う。
3. [仮想メモリ](/os/virtual-memory.html)で、アドレス空間、ページ、予約・コミット・常駐、ページフォルトを区別する。
4. [Windows/C++の観察サンプル](/practice/memory/windows-memory-observation.html)で、予約・コミット・初回書込み・解放を実際に分けて確かめる。
5. [用途別アロケータ](/runtime/memory/allocators-and-pools.html)、[メモリバグ](/runtime/memory/memory-bugs.html)、[キャッシュ局所性](/runtime/memory/cache-locality-aos-soa.html)へ進む。

## ソースコードがCPUで動くまで

1. [ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html)でコンパイルとリンクをたどる。
2. [翻訳単位・ヘッダー](/runtime/cpp-internals/translation-units-and-headers.html)、[シンボル・ABI](/runtime/cpp-internals/symbols-and-linkage.html)、[実行ファイル・ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)を調べる。
3. [実行ファイルを起動してmainへ到達するまで](/os/process-startup.html)で、プロセス・スレッド、ローダー、CRTの役割を分ける。
4. [Windows/C++のプロセス観察](/practice/process/windows-process-observation.html)で、main前の記録、親子プロセス、ワーカースレッドのPID・TIDを確かめる。
5. [関数呼び出し・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)へ進む。

## スレッド間でデータを安全に共有するには

1. [スレッドと同期](/runtime/thread-synchronization.html)で、共有状態と不変条件、同じロックで守る範囲、データを受け渡す順序を調べる。
2. [C++・C#の在庫消費サンプル](/practice/threads/inventory-synchronization.html)で、確認と消費、Snapshot、終了待ちと寿命を確かめる。
3. [並行処理のバグ](/runtime/memory/concurrency-bugs.html)で、データ競合・競合状態・false sharingの違いを調べる。

## ワーカーで準備したアセットを描画側へ渡すには

1. [容量を決めたワーカーキュー](/runtime/bounded-worker-queues.html)で、満杯や空で待つ条件、受付の終了と回収の順番を調べる。
2. [アセットをワーカーから描画側へ渡す設計](/game/asset-worker-handoff.html)で、世代の確認、登録する側の責任、CPUとGPUそれぞれの完了を追う。
3. [C++のワーカー受け渡し実践](/practice/threads/asset-worker-handoff-observation.html)で、結果キューを回収し、古い世代を捨てて終了する。
4. [D3D12の並列コマンド記録](/graphics/optimization/parallel-command-recording.html)で、描画コマンド自体を複数スレッドで記録するときの提出順と寿命を調べる。

## D3D12でコマンドを記録し、依存する処理を実行するには

1. [D3D12のリソースバリア](/graphics/optimization/d3d12-resource-barriers.html)で、コピーから読み取りへの遷移やUAV・エイリアシングの依存関係を調べる。
2. [C++の並列コマンド記録実践](/practice/graphics/parallel-command-recording-observation.html)で、CPUがリストを閉じた順番と、一つのキューへの提出順を変えて確かめる。
3. [D3D12のキュー間同期](/graphics/optimization/gpu-queue-synchronization.html)で、コピーと描画を別のキューに分けるときのフェンスと状態を追う。
4. [D3D12のディスクリプターヒープ](/graphics/optimization/d3d12-descriptor-heaps.html)で、シェーダーへ渡す参照と、その参照を再利用する条件を調べる。

## 描いた画像を次のパスで使うには

1. [テクスチャに描き、次のパスで読む](/graphics/postprocess/render-to-texture.html)で、中間画像をRTVとして書き、SRVとして読む流れを追う。
2. [C++の2パス描画実践](/practice/graphics/render-to-texture-observation.html)で、色を入れ替える前後の全画素を読み戻す。
3. [ピンポンバッファとフレーム履歴](/graphics/postprocess/ping-pong-and-history.html)で、後処理をつなぐときと前フレームの結果を残すときの違いを調べる。
4. [描画パスのアタッチメント](/graphics/optimization/render-pass-attachments.html)で、どの画像を残すか、いつ破棄や再利用ができるかを追う。

## ファイルを読むと内部で何が起きるか

1. [ファイルを読む仕組み](/os/file-read-journey.html)で、アプリのバッファ、OSのファイルキャッシュ、ストレージへの要求を分ける。
2. [C++・C#の読み取り観察](/practice/io/file-read-observation.html)で、要求数と実読取数、ファイル位置、EOF、seek、失敗を確かめる。
3. テキストとして解釈するときは[Unicodeと文字コード](/data/unicode-and-encoding.html)へ進む。

## ファイルを読む処理と、ディスクへの要求を計測で分けるには

1. [Windowsのファイルキャッシュと先読み](/os/windows-file-cache.html)で、同じ範囲の再読み取りと先読みでI/Oの量が変わる理由を調べる。
2. [ProcmonとWPRでファイルI/Oを追う](/tools/windows/file-io-tracing.html)で、ファイル操作とディスク要求をどのツールで見るか決める。
3. [ファイル読み取りをトレースするC++実践](/practice/io/file-io-trace-observation.html)で、同じファイルを2回読み、バイト数と記録を照合する。

## I/Oの完了を待ちながら、別の処理を進めるには

1. [非同期I/O](/os/asynchronous-file-io.html)で、要求の発行と完了、即時完了、待機と継続、バッファの寿命を分ける。
2. [C++・C#の同期・非同期比較](/practice/io/async-file-read-observation.html)で、同じファイルを読み、完了結果と内容の一致を確かめる。
3. 複数の処理から状態を共有するときは[スレッドと同期](/runtime/thread-synchronization.html)も確認する。

## WindowsでI/Oの完了をまとめて受け取り、安全に終了するには

1. [I/O完了ポート](/os/io-completion-ports.html)で、完了キーと要求ポインター、発行時の失敗と完了時の失敗を分ける。
2. [C++のIOCP観察例](/practice/io/iocp-observation.html)で、一つのファイルに出した2件の要求をポートから受け取る。
3. [非同期I/Oのキャンセル](/os/cancelling-overlapped-io.html)で、停止を要求してから完了を回収し、バッファを解放する順序を確認する。

## ゲームのセーブデータをファイルに保存するには

1. [ファイルの書き込みと永続化](/os/file-write-and-durability.html)で、書き込み成功、読み手への公開、停電後の復旧を別々に考える。
2. 読み戻し側は[ファイルを読む仕組み](/os/file-read-journey.html)で、短い読み取りやEOFと、ファイルの形式の検査を区別する。

## ファイルをメモリへのアクセスとして読むには

1. [メモリマップドファイル](/os/memory-mapped-files.html)で、ファイル内位置と仮想アドレス、ページフォルト、ビューの寿命を分ける。
2. [C++・C#の読み取り専用マッピング](/practice/io/mapped-file-observation.html)で、通常のreadと内容を照合し、整列した位置と使いたい範囲の対応を確かめる。
3. アドレス変換の基礎は[仮想メモリ](/os/virtual-memory.html)、実行時の組立ては[アセットロード設計](/game/asset-loading.html)へ進む。

## アセットが読み終わってから、ゲームで使えるまで

1. [アセットロード設計](/game/asset-loading.html)で、読み取り、展開・検証、登録、利用可能化、解放を分ける。
2. [C++・C#の状態と寿命のモデル](/practice/assets/asset-lifecycle-model.html)で、古い要求の完了、キャンセル、失敗を含む所有権の移動を確かめる。
3. 実I/Oの完了待ちは[非同期I/O](/os/asynchronous-file-io.html)、共有するキューや状態の保護は[スレッドと同期](/runtime/thread-synchronization.html)も確認する。
4. Windows PCの[DirectStorage](/game/directstorage.html)で、読み取りの一括発行、展開、GPUが結果を使えるまでの条件を確認する。

## ゲームの素材をまとめて配布し、必要な範囲だけ読むには

1. [アセットパック](/game/asset-pack-files.html)で、名前、目次、格納位置、圧縮の単位を分ける。
2. [バイナリファイルの範囲検査](/data/binary-file-validation.html)で、件数や長さを読み取り・確保に使う前の検査を確かめる。
3. [C++でアセットパックを作る実践](/practice/io/asset-pack-observation.html)で、1件の素材を取り出し、壊れた索引が拒否されるところを試す。
4. [アセットビルドと差分配信](/game/asset-build-and-patches.html)で、読み込みやすい配置と更新で再利用できる配信単位を考える。

## テクスチャのファイルを読み、GPUで使えるようにするには

1. [DDSとサブリソース](/graphics/texture/dds-and-subresources.html)で、テクスチャの形式、mip、配列スライスからファイル内の位置を求める。
2. [D3D12でテクスチャを転送する流れ](/graphics/texture/d3d12-texture-upload.html)で、行の再配置、コピー、リソースの状態とフェンスを追う。
3. [C++のDDS転送実践](/practice/graphics/dds-upload-observation.html)で、2つのmipをD3D12へコピーし、読み戻したバイトを照合する。
4. [テクスチャストリーミング](/graphics/texture/texture-streaming-and-mip-residency.html)で、先に使える解像度とメモリに置く範囲を決める。

## 3Dモデルのファイルから三角形を描くには

1. [glTFのメッシュデータ](/graphics/mesh/gltf-mesh-buffers.html)で、buffer、bufferView、accessorをたどって頂点とインデックスの位置を求める。
2. [頂点入力とインデックス描画](/graphics/mesh/vertex-and-index-input.html)で、バッファの配置と頂点シェーダーの入力をつなぐ。
3. [GLBから三角形を描くC++実践](/practice/graphics/glb-mesh-observation.html)で、ファイルを作り、WARPで描いた色を読み戻す。
4. [メッシュのインポートとクック](/graphics/mesh/mesh-import-and-cooking.html)で、座標系、マテリアル、描画範囲、実行時のバッファ配置を決める。

## 入力からゲーム画面まで

1. [ゲームループ](/game/patterns/game-loop-and-update.html)で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [座標変換](/math/rendering/transform.html)と[描画パイプライン](/graphics/pipeline/overview.html)から画面へつなぐ。
4. 作って試すなら[シューティングの設計](/game/shooter-design.html)を読み、[C++版](/game/shooter-cpp.html)または[Unity版](/game/shooter-unity.html)へ進む。

## sendしたデータが、相手のアプリへ届くまで

1. [ソケットとTCP通信](/network/tcp-sockets.html)で、IP・ポート、送受信バッファ、バイト列とメッセージ、半閉鎖を分ける。
2. [C++・C#のローカル通信](/practice/network/tcp-loopback-observation.html)で、長さ付きメッセージを復元し、送信停止後の応答と受信EOFを確かめる。
3. 待機と非同期処理の基本は[非同期I/O](/os/asynchronous-file-io.html)で学ぶ。この通信例では非ブロッキング操作とreadiness待ちを使う。

## UDPでメッセージを送り、通信の遅れを調べるには

1. [IPの経路選択とEthernet](/network/ip-routing-and-ethernet.html)で、送信先IPから次の経由先を選び、同じリンク上でフレームを届ける流れを追う。
2. [UDPとデータグラム](/network/udp-datagrams.html)で、送受信の区切り、順序や再送、パケットの大きさを調べる。
3. [C++のUDPループバック実践](/practice/network/udp-loopback-observation.html)で、受信バッファが足りない場合と空データグラムの戻り値を確かめる。
4. [NATとポート変換](/network/nat-and-port-mapping.html)で、ルーターの変換表、UDPの応答、外部からの接続を追う。
5. [通信の遅延と帯域](/network/latency-throughput-and-queues.html)で、RTT、転送量、混雑時のキューを分けて観測する。

## SSDやNICがメモリとデータをやり取りするには

1. [PCIeのリンク](/hardware/io/pcie-links.html)で、CPU側とデバイスをつなぐ経路、レーン数、リンク速度を調べる。
2. [DMAとIOMMU](/hardware/io/dma-and-iommu.html)で、デバイスから見たアドレス、読み書き、完了通知を追う。
3. [NICの受信キューとRSS](/hardware/io/nic-receive-queues.html)で、NICがフレームを書き込んだ後、ドライバーが結果を回収してソケットへ渡すまでを追う。
4. [DRAMのチャネルと帯域](/hardware/memory/dram-channels-and-bandwidth.html)で、メモリ側の転送速度、バンクと行、アクセスの待ち時間を調べる。
5. アプリが見る操作とOSのディスク要求の違いは[WindowsのファイルI/O計測](/tools/windows/file-io-tracing.html)で確かめる。

## TCPのバイト列が、Webの要求と応答になるまで

1. [HTTP通信](/network/http-messages.html)で、要求行、状態コード、ヘッダー、本文の形式と長さを分ける。
2. [C++・C#のHTTP観察](/practice/network/http-message-observation.html)で、ローカルのGETと応答を照合し、本文のバイト数と文字数、メッセージ完成とEOFを確かめる。
3. 下の層から調べる場合は[TCPとソケット](/network/tcp-sockets.html)、文字の表現は[Unicodeと文字コード](/data/unicode-and-encoding.html)へ戻る。

## パケットが欠けたとき、どのHTTP応答が待つか

1. [QUICとHTTP/3](/network/quic-and-http3.html)で、QUICのパケット番号とストリームのオフセット、HTTP/2とHTTP/3の違いを調べる。
2. [TCPとQUICの配送の比較](/practice/network/stream-loss-observation.html)で、欠けるパケットを切り替え、届いていても待つデータと先に使えるデータを確かめる。

## 保存したHTTP応答を、いつ再利用できるか

1. [HTTPキャッシュ](/network/http-caching.html)で、保存、freshness、再検証、Cache-Control、ETagと304の役割を調べる。
2. [C++・C#のHTTP再検証](/practice/network/http-cache-observation.html)で、ローカルサーバーへ条件付きGETを送り、304に本文がないことと、保存した本文を使う流れを確かめる。
3. メッセージの構造は[HTTP通信](/network/http-messages.html)、本文を段階的に扱う仕組みは[Streams API](/browser/streams-backpressure.html)へつなげる。

## 名前から、接続先のIP候補が決まるまで

1. [DNSと名前解決](/network/dns-resolution.html)で、OSの名前解決、再帰リゾルバー、権威DNS、レコードとキャッシュを分ける。
2. [C++・C#の名前解決観察](/practice/network/name-resolution-observation.html)で、数値IP・localhost・追加指定する公開名を調べ、APIの結果から分かる範囲を確かめる。
3. IPを得た後の接続は[TCPとソケット](/network/tcp-sockets.html)、要求と応答は[HTTP通信](/network/http-messages.html)へ進む。

## HTTPSで暗号化し、接続相手を確かめるには

1. [TLS・証明書・HTTPS](/network/tls-https.html)で、鍵共有、証明書、相手名の検証、暗号化したHTTPの関係を調べる。
2. [C++・C#のHTTPS観察](/practice/network/https-observation.html)で、標準の証明書検証を保ち、APIが返す接続情報とHTTP応答を確かめる。
3. 接続先の候補は[DNSと名前解決](/network/dns-resolution.html)、要求の意味は[HTTP通信](/network/http-messages.html)で確認する。

<div id="browser-navigation-path" class="study-legacy-anchor" aria-hidden="true"></div>

## URLを開いてからページが見えるまで

1. 通信は[DNSと名前解決](/network/dns-resolution.html)、[TCPとソケット](/network/tcp-sockets.html)、[HTTPの要求と応答](/network/http-messages.html)、[TLS・証明書・HTTPS](/network/tls-https.html)で調べる。
2. [ブラウザの描画](/browser/rendering-journey.html)で、受信したHTMLからDOM、スタイル、レイアウト、描画、合成までをつなぐ。
3. [DOMと描画の変化を観察する](/practice/browser/render-observation.html)で、幅・色・移動・透明度を変え、寸法APIとrAFで確認できる範囲を試す。

## Promiseやawaitの続きは、いつ動くのか

1. [イベントループ・Promise・async/await](/browser/event-loop-promises.html)で、同期処理、タスク、マイクロタスク、描画機会を区別する。
2. [Promiseとawaitの実行順を観察する](/practice/browser/event-loop-observation.html)で、有限のコードから実行順を記録する。timerとrAFの相対順は固定しない。
3. 画面の更新は[ブラウザの描画](/browser/rendering-journey.html)、要求の発行と完了は[非同期I/O](/os/asynchronous-file-io.html)へつなげる。

## メイン側とは別の実行主体へ、仕事とデータを渡すには

1. [Web Workerとメッセージ通信](/browser/web-workers-messages.html)で、実行の分担、メッセージの受信、コピーと転送、寿命を区別する。
2. [Workerのコピー・転送・停止を観察する](/practice/browser/worker-message-observation.html)で、16バイトの往復、バッファの切り離し、要求ID、停止と再起動を試す。
3. 同じ実行先の続きを扱う[イベントループ・Promise・async/await](/browser/event-loop-promises.html)と、共有状態を守る[スレッド同期](/runtime/thread-synchronization.html)へつなげる。

## 依頼が増えたとき、Workerと待ち行列をどう管理するか

1. [Worker poolと待ち行列の制御](/browser/worker-pool-backpressure.html)で、受付数・実行数・待機数、上流への抑制、取消しと終了を区別する。
2. [Worker poolの待機数と取消しを観察する](/practice/browser/worker-pool-observation.html)で、2実行・4待機・1拒否、待機の取消しと結果破棄による違いを確かめる。
3. [Web Workerの通信](/browser/web-workers-messages.html)でデータの受け渡しを確認し、[アセットロード](/game/asset-loading.html)の段階と利用可能になる条件へつなぐ。

## 読み込みより処理が遅いとき、供給をどう抑えるか

1. [Streams APIとストリーミング処理](/browser/streams-backpressure.html)で、chunk、queue、pull、バックプレッシャー、終了の伝播を区別する。
2. [Streams APIで供給と処理の速度差を観察する](/practice/browser/stream-backpressure-observation.html)で、有限のデータを遅いsinkへ送り、先読みと中断を確かめる。
3. 仕事の受付数は[Worker pool](/browser/worker-pool-backpressure.html)、文字の境界は[Unicodeとエンコーディング](/data/unicode-and-encoding.html)、利用可能になる条件は[アセットロード](/game/asset-loading.html)へつなげる。

## ブラウザのどこへ保存し、いつまで残るのか

1. [ブラウザの保存領域とデータの寿命](/browser/storage-lifetime.html)で、localStorage・IndexedDB・Cache API、保存区画、transaction、容量と保持方針を区別する。
2. [保存・再読込・削除の観察](/practice/browser/storage-observation.html)で、3方式へ固定データを保存し、ページ再読込後の読出しと専用データの削除を試す。
3. 応答の自動的な再利用は[HTTPキャッシュ](/network/http-caching.html)、Request／Responseの本文を扱う流れは[Streams API](/browser/streams-backpressure.html)へつなげる。

## 通信できないとき、保存した応答をどう返すか

1. [Service Workerとオフライン動作](/browser/service-worker-offline.html)で、登録・有効化・ページの制御、fetchへの介入と応答の選択を調べる。
2. [Service Workerで応答元と登録状態を観察する](/practice/browser/service-worker-observation.html)で、専用scopeの登録、固定GETの代替応答、解除と後片付けを試す。
3. 応答の明示的な保存は[ブラウザの保存領域](/browser/storage-lifetime.html)、HTTPの再利用と再検証は[HTTPキャッシュ](/network/http-caching.html)で確認する。

## 別オリジンへの通信で、応答を読めるかは何で決まるか

1. [同一オリジンポリシーとCORS](/browser/same-origin-cors.html)で、文書間の境界、応答の公開、preflightによる事前確認を区別する。
2. [ブラウザでCORSの応答を比べる](/practice/browser/cors-observation.html)で、通常ページとsandboxから同じデータをGETし、公開版とローカル配信で結果を比べる。
3. [HTTPメッセージ](/network/http-messages.html)で要求・応答を確認し、[HTTPキャッシュ](/network/http-caching.html)で応答を再利用する条件へつなげる。

## ページをまたいで、サーバーが同じセッションをどう見つけるか

1. [Cookieとセッション](/browser/cookies-and-sessions.html)で、Cookieを送る条件、サーバーによるIDの照合、ログアウト時の失効を区別する。
2. [Cookieの範囲とセッションIDを観察する](/practice/browser/cookie-session-observation.html)で、Pathによる見え方と、HttpOnlyのIDが次の要求に付くところを確かめる。
3. 別オリジンでの応答の読み取りは[CORS](/browser/same-origin-cors.html)、ブラウザ内でのデータ保持は[ブラウザの保存領域](/browser/storage-lifetime.html)へつなげる。

## 表示する文字列がHTMLやコードに変わるのはどこか

1. [XSSとCSP](/browser/xss-and-csp.html)で、入力元、HTMLとして解釈する箇所、スクリプトの実行条件を区別する。
2. [textContent・innerHTML・CSPの観察](/practice/browser/xss-csp-observation.html)で、同じ入力が文字・要素・イベント処理になる違いを確かめる。
3. DOMができる段階は[ブラウザの描画](/browser/rendering-journey.html)、スクリプトからCookieを読める条件は[Cookieとセッション](/browser/cookies-and-sessions.html)へつなげる。

## Cookie付きの要求をどの条件で受理するか

1. [CSRFとリクエスト検証](/browser/csrf-and-request-validation.html)で、Cookieが届く条件、送信元の照合、セッションとトークンの照合を区別する。
2. [CSRFでCookie付きの要求が届く条件を観察する](/practice/browser/csrf-observation.html)で、同一サイトの別オリジンからフォームを送り、受理と拒否を比べる。
3. Cookieの送信条件は[Cookieとセッション](/browser/cookies-and-sessions.html)、別オリジンの応答公開は[CORS](/browser/same-origin-cors.html)で確認する。

## ブラウザのWorkerと、同じメモリを共有するには

1. [クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)で、COOP・COEP・CORPと、分離状態が成立する条件を整理する。
2. [Workerへのコピーと共有メモリを観察する](/practice/browser/cross-origin-isolation-observation.html)で、4種類のヘッダー設定と、コピー・共有の結果を比べる。
3. データの転送は[Web Workerとメッセージ通信](/browser/web-workers-messages.html)、並行処理の同期は[スレッドと同期](/runtime/thread-synchronization.html)へつなげる。

## WebAssemblyから整数を読み書きするには

1. [WebAssemblyと線形メモリ](/browser/webassembly-linear-memory.html)で、モジュールのバイナリ、インスタンス、バイト位置と境界チェックを区別する。
2. [WebAssemblyの読み込みと線形メモリを観察する](/practice/browser/wasm-memory-observation.html)で、JavaScriptとWasmから同じバイト列を読み、拡張前後のビューを比べる。
3. バイト列での整数の表現は[整数とビット・バイト](/data/integer-bits-and-bytes.html)、Workerをまたぐ共有は[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)で確認する。

## 配列や文字列をWasmへ渡すとき、どこに何を置くか

1. [WebAssemblyのデータ受け渡しとメモリ確保](/browser/wasm-data-and-allocation.html)で、ポインタと長さの単位、配置、確保位置とメモリの容量を整理する。
2. [Wasmへ配列とUTF-8を渡す実験](/practice/browser/wasm-abi-observation.html)で、実際のバイト列、アラインメントによる空き、確保失敗と拡張を観察する。
3. 文字列のバイト表現は[Unicodeとエンコーディング](/data/unicode-and-encoding.html)、メモリ確保を実行環境の内側から見る場合は[メモリ確保の内部](/runtime/memory/allocation-journey.html)へつなげる。

## 2つのWorkerが同じ値を更新すると何が起きるか

1. [Web Workerと共有メモリの同期](/browser/shared-memory-atomics.html)で、失われた更新、不可分な加算、待機と通知を区別する。
2. [Workerの競合とAtomicsの待機・通知を観察する](/practice/browser/atomics-observation.html)で、読み取りと書き込みの順序をたどる。実際のWorkerで確認する場合はローカル配信を使う。
3. 共有できる条件は[クロスオリジン分離と共有メモリ](/browser/cross-origin-isolation.html)、複数の値を一緒に守る設計は[スレッドと同期](/runtime/thread-synchronization.html)で調べる。

## 固定サイズのメモリで値を順番に渡すには

1. [リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)で、読み書き位置が末尾から先頭に戻る仕組みと、空・満杯の判定を整理する。
2. [リングバッファの満杯・折り返し・読み出し順を観察する](/practice/browser/ring-buffer-observation.html)で、満杯で拒否された値を空きができてから入れ直し、読み出し順を比べる。
3. 異なるWorkerへの公開順序は[Web Workerと共有メモリの同期](/browser/shared-memory-atomics.html)、受付を制御する方針は[Worker poolとバックプレッシャー](/browser/worker-pool-backpressure.html)へつなげる。

## 音声データが出力に間に合わないと何が起きるか

1. [AudioWorkletと音声バッファ](/browser/audio-worklet-buffering.html)で、サンプルフレーム、レンダリングの処理単位、データの供給不足を区別する。
2. [AudioWorkletで先読みとアンダーランを観察する](/practice/browser/audio-buffer-observation.html)で、同じ到着の遅れを与え、先読みの有無で波形と不足したフレーム数を比べる。
3. 待ち行列で枠を使い回す仕組みは[リングバッファとSPSCキュー](/browser/spsc-ring-buffer.html)で確認する。

## 複数の音を重ねると波形はどう変わるか

1. [Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)で、音源ごとのゲイン、加算、出力までの振幅の余裕を確認する。
2. [Web Audioでゲインとクリッピングを観察する](/practice/browser/audio-mixing-observation.html)で、マスターゲインを変えてクリップ前後の波形とピークを比べる。
3. 音声フレームの供給と出力の関係は[AudioWorkletと音声バッファ](/browser/audio-worklet-buffering.html)で確認する。

## 再生中の音を急に消すと何が起きるか

1. [Web Audioのゲインオートメーション](/browser/audio-gain-automation.html)で、音声の時刻に沿ってゲインが変わる仕組みと、急な消音で生じる波形の段差を確認する。
2. [Web Audioで急な消音とフェードを観察する](/practice/browser/audio-fade-observation.html)で、フェードの長さを変え、切り替え前後のサンプル値と波形を比べる。
3. 複数の音を足し合わせる場合のゲインは[Web Audioのミキシング](/browser/audio-mixing-and-headroom.html)で確認する。

## 二つの音を入れ替える途中で音量はどう変わるか

1. [Web Audioのクロスフェード](/browser/audio-crossfade.html)で、二つのゲインの形と、音源の相関が加算結果にどう関わるかを確認する。
2. [Web Audioで線形と等電力のクロスフェードを比べる](/practice/browser/audio-crossfade-observation.html)で、音源の組み合わせを変え、切り替え前と中点付近の実効値を比べる。
3. ゲインを音声の時刻で変える仕組みは[Web Audioのゲインオートメーション](/browser/audio-gain-automation.html)で確認する。

## 同じ音を少し遅らせて重ねると何が起きるか

1. [Web Audioのコムフィルター](/browser/audio-comb-filter.html)で、遅延した音を足すと周波数によって強め合ったり弱め合ったりする理由を確認する。
2. [Web Audioで遅延とコムフィルターを観察する](/practice/browser/audio-comb-observation.html)で、遅延時間とゲインを変え、最初にへこむ周波数を比べる。
3. 二つの音を切り替える途中の実効値は[Web Audioのクロスフェード](/browser/audio-crossfade.html)で確認する。

## 一つの音から反響を繰り返すには

1. [Web Audioのフィードバックディレイ](/browser/audio-feedback-delay.html)で、出力を遅延経路に戻す接続と、繰り返すたびに振幅が小さくなる仕組みを確認する。
2. [Web Audioで反響の間隔と減衰を観察する](/practice/browser/audio-feedback-observation.html)で、遅延時間と戻すゲインを変え、反響の時刻と振幅を比べる。
3. 遅延した入力を一度だけ重ねたときの周波数応答は[Web Audioのコムフィルター](/browser/audio-comb-filter.html)で確認する。

## インパルス応答から部屋の響きを加えるには

1. [Web Audioの畳み込みリバーブ](/browser/audio-convolution-reverb.html)で、インパルス応答をずらして重ねる計算と、直接音と残響を合流させる経路を確認する。
2. [Web Audioで畳み込みリバーブを聴き比べる](/practice/browser/audio-reverb-observation.html)で、小部屋とホールを模した応答を切り替え、打音のあとに残る響きを比べる。
3. 出力を遅延経路に戻して反響を作る方法は[Web Audioのフィードバックディレイ](/browser/audio-feedback-delay.html)で確認する。

## 音源が動くと左右の出力はどう変わるか

1. [Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)で、聞き手から見た方向と距離が、左右の出力にどう反映されるかを確認する。
2. [Web Audioで音の方向と距離を変えて聴く](/practice/browser/audio-spatial-observation.html)で、角度と距離を別々に変え、左右のゲインと聞こえ方を比べる。
3. 部屋から返ってくる音を別の経路で加える仕組みは[Web Audioの畳み込みリバーブ](/browser/audio-convolution-reverb.html)で確認する。

## 壁越しに聞こえる音は何が変わるか

1. [Web Audioの音の遮蔽](/browser/audio-occlusion.html)で、聞き手と音源の間を判定し、ゲインとローパスで壁越しの音を表す仕組みを確認する。
2. [Web Audioで壁越しの音量と音色を比べる](/practice/browser/audio-occlusion-observation.html)で、距離をそろえた二つの位置を切り替え、音量だけを下げたときと高音も弱めたときを比べる。
3. 聞き手から見た方向と距離による処理は[Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)で確認する。

## 扉が開いたときの音をなめらかに戻すには

1. [Web Audioで遮蔽をなめらかに切り替える](/browser/audio-occlusion-transition.html)で、ゲインとカットオフを同じ時刻から徐々に変える仕組みを確認する。
2. [Web Audioで扉が開くときの音の切り替えを比べる](/practice/browser/audio-occlusion-transition-observation.html)で、時定数を変え、出力波形とゲインの実測値を比べる。
3. 遮蔽時にゲインとローパスが音へ与える影響は[Web Audioの音の遮蔽](/browser/audio-occlusion.html)で確認する。

## 近づく音源と遠ざかる音源で高さが変わるのはなぜか

1. [Web Audioでドップラー効果を再現する](/browser/audio-doppler.html)で、音源が動くと波の山が届く間隔が変わる仕組みを確認する。
2. [Web Audioでドップラー効果を聴き比べる](/practice/browser/audio-doppler-observation.html)で、速さと進行方向を変えて、基準の440 Hzと変化後の波形を比べる。
3. 音源の位置を左右の配分と音量に反映する方法は[Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)で確認する。

## 目の前を通過する音を作るには

1. [Web Audioで音源の通過音を作る](/browser/audio-flyby.html)で、一つの軌道から高さ、左右の配分、距離減衰を求める。
2. [Web Audioで音源が通過する前後の音を比べる](/practice/browser/audio-flyby-observation.html)で、通過の前後をたどりながら、音源の位置と試聴音を比べる。
3. 音源がまっすぐ近づく場合の周波数は[ドップラー効果](/browser/audio-doppler.html)、左右の配分と距離によるゲインは[音の定位と距離減衰](/browser/audio-spatial-panning.html)で確認する。

## 平均60 FPSなのにカクつくとき

1. [フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)で、CPU・GPUの処理時間と画面の表示間隔を区別する。
2. [同じ60 FPSで表示間隔を比べる](/practice/graphics/frame-pacing-observation.html)で、平均が同じ二つの動きと、時間ごとの長い表示間隔を比べる。
3. [デバッグ・プロファイリングツール](/graphics/optimization/tools.html)で、処理が長引いた箇所を調べるための道具を確認する。

## GPUが描き終えた絵はいつ画面に出るか

1. [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html)で、描画用の画像を受け取ってから表示側が使い終えるまでを追う。
2. [FIFO・MAILBOX・IMMEDIATEで画面の切り替わりを比べる](/practice/graphics/swap-chain-observation.html)で、表示待ち、表示されずに置き換わる絵、ティアリングを観察する。
3. [デバイス初期化と画面クリア](/graphics/capstone/02-device.html)で、Vulkanで画像を取得し、描画の完了に合わせてPresentするコードを読む。

## 入力への反応が遅いときに、どこで待ったかを調べる

1. [入力から画面に出るまでの遅延](/graphics/optimization/input-to-display-latency.html)で、入力の取得から走査までを追い、[入力遅延の実験](/practice/graphics/input-latency-observation.html)で一つ前の走査に間に合う条件を試す。
2. [GPU時間をタイムスタンプで測る](/graphics/optimization/gpu-timestamp-queries.html)で、GPUキューのどの区間を測っているかを確かめる。
3. [GPUリソースの寿命とフェンス](/graphics/optimization/gpu-resource-lifetime.html)で、GPUが使用中の領域をCPU側で再利用できる時点を調べる。
4. [シェーダーコンパイルのカクつきとパイプラインキャッシュ](/graphics/optimization/pipeline-compilation-stutter.html)で、初回だけ起きる処理を記録し、先に準備する仕組みを読む。

## ゲームのデータをどの構造に入れるか

1. [配列と動的配列](/algorithms/arrays-and-dynamic-arrays.html)と[連結リスト](/algorithms/linked-lists.html)で、並び方、挿入・削除、再確保が参照に及ぼす影響を比べる。
2. [スタック・キュー・デック](/algorithms/queues-and-deques.html)と[二分ヒープ](/algorithms/binary-heaps.html)で、追加した順や優先度から次に処理するデータを選ぶ。
3. [ハッシュ表](/algorithms/hash-tables.html)と[探索木](/algorithms/search-trees.html)で、キーの一致を調べたいときと、キーの順序や範囲が必要なときの違いを確認する。
4. [スパースセット](/algorithms/sparse-sets.html)と[IDを出し入れする実験](/practice/algorithms/sparse-set-observation.html)で、IDからの直接参照と、コンポーネントを詰めた走査を両立する仕組みを試す。
5. [世代付きハンドル](/algorithms/generational-handles.html)と[スロット再利用の実験](/practice/algorithms/generational-handle-observation.html)で、同じIDを再利用したときに古い参照を識別する条件を確かめる。

## 近くの物体だけを調べるには

1. [均等グリッドと空間ハッシュ](/algorithms/uniform-grid-and-spatial-hash.html)で、座標からセルを引き、複数セルに登録された物体を一度だけ検査する仕組みを読む。
2. [四分木と八分木](/algorithms/quadtrees-and-octrees.html)と[BVHとAABB](/algorithms/bounding-volume-hierarchies.html)で、場所を分ける方法と、物体をグループに分けて箱で包む方法を比べる。
3. [範囲検索の実験](/practice/algorithms/spatial-query-observation.html)で、物体の配置や検索範囲を動かし、命中と詳細判定の件数を確かめる。

## ソースコードの呼び出しを、実行時のアドレスまで追う

1. [トークン・AST・型検査](/compilers/tokens-ast-and-type-checking.html)と[LLVM IRとSSA](/compilers/llvm-ir-and-ssa.html)で、ソースを解釈して中間表現にするまでを追う。
2. [COFFの再配置](/compilers/coff-relocations.html)と[WindowsのPEローダー](/os/pe-loading-and-imports.html)で、リンクで埋める参照と、ロード時に決まるアドレスを調べる。
3. [OBJ・EXE・PDBを作って読む実践](/practice/compilers/build-artifact-observation.html)で、同じ関数呼び出しをOBJとEXEから確認する。

## ゲームが止まった箇所や値を書き換えた箇所を探す

1. [ブレークポイントとデータブレークポイント](/tools/windows/debugger-breakpoints-and-watchpoints.html)で、指定した命令や、特定アドレスへの書き込みで止める。
2. [クラッシュダンプとシンボル](/tools/windows/crash-dumps-and-symbols.html)で、停止時の例外、スレッド、モジュールを確認し、対応するPDBから関数や行を調べる。

## 起動したプロセスはOSとどうやり取りするか

1. [システムコールとCPUの権限](/os/system-calls-and-privilege.html)で、同じスレッドがカーネルの処理へ入る流れを追う。
2. [Windowsのスレッドスケジューリング](/os/thread-scheduling.html)で、実行中・実行可能・待機中の違いと、CPU時間を割り当てる条件を調べる。
3. [Windowsのハンドルとカーネルオブジェクト](/os/windows-handles.html)で、操作できる対象と、別プロセスにハンドルを渡す方法を読む。
4. [パイプと子プロセスの標準入出力](/os/pipes-and-process-io.html)と[パイプの終端を調べる実践](/practice/process/windows-pipe-observation.html)で、出力と終端を確認する。

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)の作品・ハード・媒体・流通と、[リアルタイム3D技術史](/guide/rendering/timeline.html)の技術の変化から、気になった仕組みへ進みます。`)

const termRows = [
  ['システムコール / syscall / ユーザーモード / カーネルモード / 特権 / NTSTATUS', '/os/system-calls-and-privilege.html', 'OSに処理を要求してCPUの権限が切り替わる過程を追う'],
  ['スケジューラ / スレッドスケジューリング / context switch / プリエンプション / Ready / 待機', '/os/thread-scheduling.html', 'スレッドの状態とCPU時間・実行可能になってからの待ちを分けて調べる'],
  ['Windowsハンドル / HANDLE / オブジェクトマネージャー / DuplicateHandle / CloseHandle / ハンドル継承', '/os/windows-handles.html', 'プロセスが対象を操作する権利と、ハンドルを渡す・閉じる条件を調べる'],
  ['パイプ / IPC / 標準入出力 / CreatePipe / PeekNamedPipe / ERROR_BROKEN_PIPE', '/os/pipes-and-process-io.html', '子の出力が親に届く経路と、最後の書き込み端を閉じた後の終端を追う'],
  ['世代付きハンドル / generational handle / slot map / 世代番号 / entity aliasing', '/algorithms/generational-handles.html', 'スロット再利用と世代の周回で、古い参照がいつ一致するか調べる'],
  ['字句解析 / token / 構文解析 / AST / 型検査 / semantic analysis', '/compilers/tokens-ast-and-type-checking.html', 'ソースをトークンから構文木へ変え、型と名前を解決する'],
  ['LLVM IR / 中間表現 / SSA / φ / phi / 基本ブロック / CFG', '/compilers/llvm-ir-and-ssa.html', '分岐の経路と、合流点で使われる値を追う'],
  ['COFF / OBJ / 再配置 / relocation / REL32 / 未定義シンボル', '/compilers/coff-relocations.html', '別のOBJを参照する命令をリンク時にどう埋めるか調べる'],
  ['PE / ローダー / RVA / VA / ASLR / ベース再配置 / DLLインポート / IAT', '/os/pe-loading-and-imports.html', 'EXEやDLLを仮想メモリに置き、外部関数への参照を解決する'],
  ['ブレークポイント / データブレークポイント / watchpoint / 条件付きブレークポイント', '/tools/windows/debugger-breakpoints-and-watchpoints.html', '実行や書き込みを観察するためにプログラムを止める'],
  ['クラッシュダンプ / minidump / PDB / WinDbg / シンボル / スタック', '/tools/windows/crash-dumps-and-symbols.html', '停止時の記録を開き、ビルドに対応するシンボルで停止位置を調べる'],
  ['均等グリッド / uniform grid / 空間ハッシュ / spatial hash / セル / 候補の重複', '/algorithms/uniform-grid-and-spatial-hash.html', '座標をセルに割り当て、検索範囲に近い物体を集める'],
  ['四分木 / クアッドツリー / quadtree / 八分木 / オクツリー / octree / loose tree', '/algorithms/quadtrees-and-octrees.html', '空間の分割を深くする条件と、境界をまたぐ物体の置き場所を調べる'],
  ['BVH / bounding volume hierarchy / AABB / ブロードフェーズ / リフィット / refit', '/algorithms/bounding-volume-hierarchies.html', '箱で物体をまとめ、検索範囲と重ならない枝を省く'],
  ['配列 / 動的配列 / vector / List / size / capacity / 償却計算量', '/algorithms/arrays-and-dynamic-arrays.html', '添字とメモリ配置、容量の拡張、位置や参照が変わる条件を調べる'],
  ['連結リスト / linked list / 単方向リスト / 双方向リスト / intrusive list', '/algorithms/linked-lists.html', 'ノード間のリンクと、位置を探す費用・つなぎ直す費用を分ける'],
  ['スタック / キュー / デック / LIFO / FIFO / deque / リングバッファ', '/algorithms/queues-and-deques.html', 'データを追加・取り出す端と、読み書き位置が折り返す仕組みを調べる'],
  ['ハッシュ表 / hash table / Dictionary / 衝突 / 負荷率 / rehash / tombstone', '/algorithms/hash-tables.html', '同じ位置に来たキーを区別し、探索を続ける条件や拡張の影響を調べる'],
  ['二分ヒープ / binary heap / 優先度付きキュー / priority_queue / PriorityQueue', '/algorithms/binary-heaps.html', '配列で親子を表し、次に処理する要素を優先度で選ぶ'],
  ['探索木 / binary search tree / 平衡木 / 順序付きマップ / lower_bound / B木', '/algorithms/search-trees.html', 'キーの大小関係で枝を選び、キー範囲の要素を列挙する'],
  ['スパースセット / sparse set / dense / sparse / swap-and-pop / 世代付きID', '/algorithms/sparse-sets.html', 'IDからの所属判定と、要素を詰めた配列の列挙を両立する'],
  ['入力遅延 / input latency / input-to-photon / ポーリング / 入力マーカー', '/graphics/optimization/input-to-display-latency.html', '入力から対象の行が更新されるまでの処理と待ちを分ける'],
  ['GPUタイムスタンプ / timestamp query / ResolveQueryData / timestampPeriod / timestampValidBits', '/graphics/optimization/gpu-timestamp-queries.html', 'GPUコマンドの時刻を読み戻して区間の時間を測る'],
  ['GPUフェンス / リソースの寿命 / upload heap / ステージング / descriptor', '/graphics/optimization/gpu-resource-lifetime.html', 'GPUが使う領域やコマンド格納場所を再利用できる条件を調べる'],
  ['並列コマンド記録 / D3D12 / command allocator / command list / フレームスロット', '/graphics/optimization/parallel-command-recording.html', 'CPUで記録を分担し、GPUへの提出順と記録用メモリの再利用を管理する'],
  ['D3D12 / リソースバリア / transition barrier / UAV barrier / aliasing barrier / COMMON', '/graphics/optimization/d3d12-resource-barriers.html', 'リソースへのアクセスやメモリの使い回しに必要なバリアを調べる'],
  ['D3D12 / キュー間同期 / Signal / Wait / COPY queue / async compute', '/graphics/optimization/gpu-queue-synchronization.html', '別キューへ結果を渡す順序と、CPUがフェンスを待つ場合の違いを調べる'],
  ['D3D12 / ディスクリプターヒープ / descriptor heap / CBV / SRV / UAV / RTV / DSV', '/graphics/optimization/d3d12-descriptor-heaps.html', 'リソースへの参照を格納・設定し、GPUの使用が終わるまで保持する'],
  ['オフスクリーン描画 / render to texture / フルスクリーントライアングル / Texture2D.Load', '/graphics/postprocess/render-to-texture.html', '中間画像への描画と、その画像を読む後処理をつなぐ'],
  ['ピンポンバッファ / ping-pong / フレーム履歴 / history texture / TAA', '/graphics/postprocess/ping-pong-and-history.html', '複数の後処理で画像を交互に使い、前フレームの結果を管理する'],
  ['アタッチメント / render pass / clear / preserve / discard / resolve / transient', '/graphics/optimization/render-pass-attachments.html', '描画先の内容を残す範囲と、パスをまたぐ依存関係を調べる'],
  ['DDS / DDS_HEADER / DXGI_FORMAT / mip / subresource / BC7 / cubemap', '/graphics/texture/dds-and-subresources.html', 'ファイルのヘッダー、テクスチャの形、mipや圧縮ブロックの位置を調べる'],
  ['テクスチャ転送 / RowPitch / GetCopyableFootprints / CopyTextureRegion / readback', '/graphics/texture/d3d12-texture-upload.html', 'CPU側の行をバッファに並べ、コピー、状態遷移、完了の順序を調べる'],
  ['テクスチャストリーミング / mip residency / SRV / reserved resource / タイル', '/graphics/texture/texture-streaming-and-mip-residency.html', '先に使うmip、シェーダーに公開する範囲、GPUメモリの予算を調べる'],
  ['glTF / GLB / bufferView / accessor / byteStride / POSITION / NORMAL', '/graphics/mesh/gltf-mesh-buffers.html', 'メッシュの参照をたどり、頂点とインデックスの範囲や型を調べる'],
  ['頂点入力 / インデックスバッファ / Input Assembler / DrawIndexedInstanced / BaseVertexLocation', '/graphics/mesh/vertex-and-index-input.html', 'インデックスを頂点へ対応付け、属性を頂点シェーダーへ渡す'],
  ['メッシュインポート / クック / 座標系 / winding / UVシーム / AABB', '/graphics/mesh/mesh-import-and-cooking.html', '制作した形状を実行時のバッファと描画単位へ変換する'],
  ['PSO / パイプラインキャッシュ / シェーダーコンパイル / pipeline cache / warm-up', '/graphics/optimization/pipeline-compilation-stutter.html', '初回使用までに必要なパイプライン作成とキャッシュの役割を調べる'],
  ['スワップチェーン / swapchain / VSync / 垂直同期 / Present / scanout / 走査 / ティアリング / FIFO / MAILBOX / IMMEDIATE', '/graphics/optimization/swap-chain-and-vsync.html', '描画済みの絵が画面へ出る順序と時刻、次の描画に画像を使い回せる条件を調べる'],
  ['フレームタイム / frame time / フレームペーシング / frame pacing / フレーム予算 / p99 / スタッター', '/graphics/optimization/frame-pacing.html', 'CPU・GPUの処理時間と表示間隔を分け、カクつきが起きた時刻を調べる'],
  ['通過音 / フライバイ / flyby / 最接近 / 視線方向の速度 / PannerNode / playbackRate', '/browser/audio-flyby.html', '横切る音源の軌道から、時間ごとの高さ、左右の配分、距離減衰を求める'],
  ['ドップラー効果 / Doppler effect / ドップラーシフト / 視線方向の速度 / 音速 / playbackRate', '/browser/audio-doppler.html', '音源が近づくと音が高く、遠ざかると低く聞こえる関係を再生速度に反映する'],
  ['遮蔽の切り替え / setTargetAtTime / 時定数 / time constant / パラメータの平滑化', '/browser/audio-occlusion-transition.html', '遮蔽が変わる時刻にゲインとカットオフを予約し、徐々に次の値へ近づける'],
  ['音の遮蔽 / occlusion / 遮蔽判定 / レイキャスト / ローパス / lowpass / カットオフ周波数 / BiquadFilterNode / 周波数応答', '/browser/audio-occlusion.html', '直接経路を壁が遮るかを調べ、音量と高音の減衰を別々に設定する'],
  ['音の定位 / パンニング / spatial audio / 距離減衰 / PannerNode / AudioListener / StereoPannerNode / 等電力 / HRTF / 方位角', '/browser/audio-spatial-panning.html', '音源と聞き手の位置から左右への配分と距離によるゲインを求める'],
  ['畳み込みリバーブ / convolution reverb / ConvolverNode / インパルス応答 / IR / 初期反射 / 残響 / dry / wet', '/browser/audio-convolution-reverb.html', 'インパルス応答から音の響きを作り、直接音と残響を別の経路で調整する'],
  ['フィードバックディレイ / feedback delay / フィードバックゲイン / 反響 / エコー / 減衰 / IIR / DelayNode', '/browser/audio-feedback-delay.html', '出力を遅延経路に戻し、反響の間隔と一周ごとの振幅の変化を調べる'],
  ['コムフィルター / comb filter / DelayNode / 遅延 / 位相差 / 干渉 / 周波数応答 / インパルス応答 / ノッチ', '/browser/audio-comb-filter.html', '同じ音を少し遅らせて足し、強め合う周波数と打ち消される周波数を調べる'],
  ['クロスフェード / crossfade / 等電力 / equal power / 線形フェード / RMS / 相関 / setValueCurveAtTime', '/browser/audio-crossfade.html', '二つの音源を重ねて入れ替え、ゲインの形と相関による実効値の変化を調べる'],
  ['ゲインオートメーション / AudioParam / setValueAtTime / linearRampToValueAtTime / フェード / クリックノイズ / a-rate', '/browser/audio-gain-automation.html', '音声の時刻でゲインを予約し、急な消音とフェードで波形が変わる様子を調べる'],
  ['音声ミキシング / audio mixing / GainNode / gain / ヘッドルーム / headroom / dBFS / クリッピング / WaveShaperNode', '/browser/audio-mixing-and-headroom.html', '音声を加算したときのピークと振幅の余裕、クリップ前にゲインを調整する効果を調べる'],
  ['AudioWorklet / AudioWorkletProcessor / Web Audio API / PCM / サンプルフレーム / レンダークォンタム / 先読み / アンダーラン / underrun', '/browser/audio-worklet-buffering.html', 'ブラウザの音声処理単位、出力に対する供給不足、先読み用バッファを調べる'],
  ['リングバッファ / ring buffer / circular buffer / SPSC / FIFO / read index / write index / wrap-around', '/browser/spsc-ring-buffer.html', '固定容量の読み書き位置、折り返し、満杯と空、書き手と読み手の間で枠を受け渡す順序を調べる'],
  ['Atomics / アトミック操作 / lost update / 失われた更新 / read-modify-write / Atomics.add / Atomics.wait / Atomics.notify / 準備フラグ', '/browser/shared-memory-atomics.html', '共有値の更新が失われる順序、不可分な加算、フラグと通知を使うデータの受け渡しを調べる'],
  ['Wasm ABI / ポインタと長さ / pointer / byte length / TextEncoder / アラインメント / アリーナ / bump allocator / alloc / cursor', '/browser/wasm-data-and-allocation.html', '配列・文字列を渡す配置と長さの単位、領域の確保・拡張・寿命を調べる'],
  ['WebAssembly / Wasm / WAT / WebAssembly.Module / WebAssembly.Instance / import / export / instantiateStreaming / 線形メモリ / linear memory / Memory.grow / trap', '/browser/webassembly-linear-memory.html', 'バイナリの読み込みと実体化、JavaScriptとの境界、バイト列の読み書きと拡張を調べる'],
  ['クロスオリジン分離 / cross-origin isolation / crossOriginIsolated / COOP / COEP / CORP / require-corp / credentialless / SharedArrayBuffer / Atomics', '/browser/cross-origin-isolation.html', 'ウィンドウ間の境界、別オリジン資源の読み込み、Worker間で同じメモリを使う条件を調べる'],
  ['CSRF / Cross-Site Request Forgery / リクエスト偽造 / Origin / Referer / SameSite / CSRFトークン / synchronizer token', '/browser/csrf-and-request-validation.html', 'Cookieが付く条件と、送信元・トークンを検査して状態変更を受理する条件を調べる'],
  ['XSS / Cross-Site Scripting / DOM XSS / source / sink / textContent / innerHTML / CSP / Content Security Policy / script-src / script-src-attr / nonce / hash / SecurityPolicyViolationEvent', '/browser/xss-and-csp.html', '入力を解釈する箇所、HTMLの生成とコードの実行、CSPによる実行制限を調べる'],
  ['Cookie / Set-Cookie / document.cookie / Domain / Path / Max-Age / Secure / HttpOnly / SameSite / セッションID / セッション固定化 / ログアウト', '/browser/cookies-and-sessions.html', '要求にCookieを付ける条件、サーバー側の照合、IDの更新と失効を調べる'],
  ['同一オリジンポリシー / Same-Origin Policy / SOP / origin / opaque origin / CORS / preflight / OPTIONS / Access-Control-Allow-Origin / no-cors / opaque response', '/browser/same-origin-cors.html', '文書間の境界、別オリジンへの要求、JavaScriptへの応答公開、事前確認を調べる'],
  ['Service Worker / service worker scope / install / waiting / activate / controller / ready / fetch event / respondWith / waitUntil / unregister / オフライン', '/browser/service-worker-offline.html', '登録、ページの制御、要求の介入、保存済み応答の利用、更新と解除を調べる'],
  ['ブラウザ保存領域 / Web Storage / localStorage / sessionStorage / IndexedDB / object store / IDBTransaction / Cache API / CacheStorage / quota / eviction / persist / storage partition', '/browser/storage-lifetime.html', '保存対象、同期・非同期処理、transactionの完了、データの保持と削除を調べる'],
  ['HTTPキャッシュ / HTTP cache / Cache-Control / ETag / If-None-Match / 304 / freshness / max-age / no-cache / no-store / Vary / 再検証', '/network/http-caching.html', '保存した応答の再利用、鮮度、条件付きGET、本文とメタデータの更新を調べる'],
  ['Streams API / ストリーミング / ReadableStream / WritableStream / TransformStream / chunk / pull / desiredSize / highWaterMark / pipeTo / writer.ready / cancel / abort', '/browser/streams-backpressure.html', 'データの供給と消費、キューの閾値、バックプレッシャー、正常終了と中断を調べる'],
  ['Worker pool / ワーカープール / 待ち行列 / bounded queue / admission control / backpressure / バックプレッシャー / drain / shutdown', '/browser/worker-pool-backpressure.html', '実行数と待機数の上限、受付拒否、取消し、結果破棄、停止を調べる'],
  ['Web Worker / Dedicated Worker / postMessage / structured clone / 構造化クローン / transfer list / transferable / detach / terminate / messageerror', '/browser/web-workers-messages.html', '実行の分担、メッセージによるデータのコピーと転送、応答と終了の扱いを調べる'],
  ['イベントループ / event loop / task / microtask / マイクロタスク / Promise / async / await / queueMicrotask / setTimeout', '/browser/event-loop-promises.html', '同期処理と非同期の続き、Promiseの状態、実行順と描画機会の関係を調べる'],
  ['DOM / CSSOM / スタイル計算 / layout / paint / raster / composite / rAF / requestAnimationFrame', '/browser/rendering-journey.html', 'HTMLからピクセルまでの段階と、変更後の更新、寸法取得、描画前のcallbackを調べる'],
  ['TLS / HTTPS / 証明書 / SAN / CA / 信頼アンカー / SNI / ALPN / 鍵共有 / CertificateVerify / AEAD', '/network/tls-https.html', '暗号化と相手の検証、鍵共有、証明書の信頼、TLSとHTTPの境界を調べる'],
  ['DNS / 名前解決 / リゾルバー / 権威DNS / A / AAAA / CNAME / TTL / NXDOMAIN / NODATA', '/network/dns-resolution.html', '名前解決API、委任をたどる問い合わせ、レコードとキャッシュ、失敗の違いを調べる'],
  ['OS / オペレーティングシステム / カーネル / アプリ / 資源管理', '/os/operating-system-basics.html', '複数のアプリがCPU・メモリ・機器を使うときのOSの仕事を調べる'],
  ['ファイル / ディレクトリ / パス / 拡張子 / 絶対パス / 相対パス / テキストファイル', '/os/files-and-paths.html', '保存したバイト列と、その場所を指定する方法を調べる'],
  ['変数 / 型 / 初期化 / 代入 / 式 / 文 / スコープ', '/languages/variables-types-and-expressions.html', '値を保存して計算し、変数を更新する流れを追う'],
  ['条件分岐 / if / else / 繰り返し / for / while / 関数 / 引数 / 戻り値', '/languages/control-flow-and-functions.html', '処理の進む道と、関数へ渡す値・返る値を調べる'],
  ['ソースコード / コンパイル / リンク / 実行 / ランタイム / IL / JIT / AOT', '/compilers/source-code-and-execution.html', 'コードを変換してプログラムを動かすまでの段階をつかむ'],
  ['ライブラリ / API / SDK / ヘッダー / パッケージ / 依存関係', '/compilers/libraries-apis-and-sdks.html', '自分のコードから既存の機能を使うときの部品と約束を調べる'],
  ['IDE / エディター / デバッガ / プロファイラー / 補完 / ステップ実行 / ウォッチ / コールスタック', '/tools/development-tools-basics.html', '書く・作る・動きを追う・測るための機能を比べる'],
  ['ターミナル / シェル / CLI / コマンド / PowerShell / Bash / カレントディレクトリ / PATH / パイプ', '/tools/terminal-shell-and-commands.html', '文字の入力がコマンドになり、処理の出力が渡されるまでを調べる'],
  ['ネットワーク / プロトコル / パケット / クライアント / サーバー', '/network/network-basics.html', 'コンピュータ同士がデータを送る約束と、Webページが届く流れをつかむ'],
  ['IPアドレス / IPv4 / IPv6 / ポート番号 / ホスト名 / URL / ループバック', '/network/ip-addresses-and-ports.html', '通信の行き先を表す値と、名前やURLとの関係を調べる'],
  ['LAN / WAN / スイッチ / ルーター / アクセスポイント / Wi-Fi / ONU / モデム', '/network/home-network-devices.html', '家庭内でデータが通る機器と、その役割の違いを調べる'],
  ['CPU / RAM / SSD / ストレージ / 入出力 / ハードウェア', '/hardware/computer-components.html', 'ゲームを起動する場面からコンピュータの部品の担当をつかむ'],
  ['命令 / ISA / レジスタ / プログラムカウンター / クロック / コア / SMT', '/hardware/cpu/instruction-execution.html', '命令を取り出して計算し、結果を保存する流れを追う'],
  ['メインメモリ / キャッシュ / メモリ階層 / RAMとストレージ / 揮発性', '/hardware/memory/ram-cache-and-storage.html', '実行中に使うデータと保存するデータ、容量と待ち時間を調べる'],
  ['HTTP / HTTP/1.1 / GET / Host / 状態コード / ヘッダー / Content-Length / Content-Type / CRLF', '/network/http-messages.html', '要求と応答の形式、本文のバイト数、メッセージの完成と接続終了を調べる'],
  ['ソケット / socket / TCP / IPアドレス / ポート / send / recv / フレーミング / 半閉鎖 / loopback', '/network/tcp-sockets.html', '送受信バッファ、バイト列の境界、EOFとエラー、接続の終了を調べる'],
  ['UDP / データグラム / sendto / recvfrom / WSAEMSGSIZE / MTU', '/network/udp-datagrams.html', 'メッセージの区切りと受信失敗、送信サイズや期限を調べる'],
  ['QUIC / HTTP/3 / HTTP/2 / 0-RTT / 接続ID / HOLブロッキング / QUIC DATAGRAM', '/network/quic-and-http3.html', 'UDP上で接続を保ち、欠けたデータをストリームごとに組み立てる仕組みを調べる'],
  ['NAT / NAPT / ポート転送 / CGNAT / STUN / ICE / TURN', '/network/nat-and-port-mapping.html', '内外のIPとポートの対応、外部からの到達性、P2Pの接続手段を調べる'],
  ['IPルーティング / デフォルトゲートウェイ / Ethernet / MACアドレス / ARP / Neighbor Discovery / TTL', '/network/ip-routing-and-ethernet.html', 'IPの行き先から次の経由先を選び、各リンクでフレームを渡す'],
  ['通信遅延 / RTT / 帯域 / goodput / ジッター / 輻輳 / BDP / バッファブロート', '/network/latency-throughput-and-queues.html', '回線の転送量と、混雑による待ち時間を分ける'],
  ['PCI Express / PCIe / root complex / レーン / リンク速度 / GT/s', '/hardware/io/pcie-links.html', 'デバイスまでの経路とリンクの転送上限を調べる'],
  ['DMA / IOMMU / DMAアドレス / バスマスター / MSI-X / 割り込み', '/hardware/io/dma-and-iommu.html', 'デバイスが使うメモリ範囲、転送の向き、完了通知を調べる'],
  ['NIC / RXリング / 受信記述子 / RSS / NAPI / 割り込み集約', '/hardware/io/nic-receive-queues.html', 'フレームのDMA、CPUへの処理の分配、ドロップ箇所の違いを調べる'],
  ['DRAM / DDR / メモリチャネル / ランク / バンク / 行バッファ / MT/s', '/hardware/memory/dram-channels-and-bandwidth.html', 'メモリ側の並行性、帯域の計算、アクセス時の待ち時間を調べる'],
  ['メモリマップドファイル / file mapping / mmap / MapViewOfFile / MemoryMappedFile / ビュー', '/os/memory-mapped-files.html', 'ファイルの範囲と仮想アドレスを対応付け、ページとビューの寿命を調べる'],
  ['アセットロード / asset loading / リソース管理 / cook / 読み込み完了 / 利用可能 / 世代トークン', '/game/asset-loading.html', 'byte取得から登録・利用可能化・解放までの状態と所有権を整理する'],
  ['DirectStorage / GDeflate / GPU展開 / GPU decompression / DSTORAGE_REQUEST', '/game/directstorage.html', 'Windows PCで読み取りと展開をまとめて要求し、結果をGPUで使うまでの条件を調べる'],
  ['アセットパック / パックファイル / TOC / 目次 / asset ID / offset / payload / チャンク圧縮', '/game/asset-pack-files.html', '素材の名前からファイル内の範囲を引き、格納順や読み取り単位を決める'],
  ['アセットビルド / cook / 差分配信 / パッチ / content hash / manifest / チャンク', '/game/asset-build-and-patches.html', '配布用データを組み立て、変更された単位を取得し、検証した版に切り替える'],
  ['I/O完了ポート / IOCP / CreateIoCompletionPort / GetQueuedCompletionStatus / completion key', '/os/io-completion-ports.html', '同じポートに集まる完了を、ハンドルと要求ごとに見分ける'],
  ['I/Oキャンセル / CancelIoEx / CancelIo / ERROR_NOT_FOUND / ERROR_OPERATION_ABORTED', '/os/cancelling-overlapped-io.html', 'キャンセル要求と完了を区別して、バッファを解放できる時点を調べる'],
  ['書き込み / 永続化 / durability / WriteFile / FlushFileBuffers / FILE_FLAG_WRITE_THROUGH / ReplaceFile', '/os/file-write-and-durability.html', '書き込み結果、名前の切り替え、障害後にデータが残る条件を調べる'],
  ['非同期I/O / asynchronous I/O / Overlapped I/O / ERROR_IO_PENDING / ReadAsync / await', '/os/asynchronous-file-io.html', '要求の発行、完了結果、待機と継続、バッファを再利用できる時点を調べる'],
  ['ファイルI/O / read / FileStream / ReadFile / EOF / seek', '/os/file-read-journey.html', '読み取り要求と実読取数、ファイル位置、OSキャッシュと保存装置の違いを調べる'],
  ['ファイルキャッシュ / ページキャッシュ / Cache Manager / read-ahead / 先読み / FILE_FLAG_NO_BUFFERING', '/os/windows-file-cache.html', 'ファイルデータの再利用、アクセスのヒント、キャッシュを迂回する際の条件を調べる'],
  ['Procmon / Process Monitor / WPR / WPA / ETW / File I/O / Disk Usage', '/tools/windows/file-io-tracing.html', 'ファイル操作とストレージ側の要求を、時刻、パス、プロセスから調べる'],
  ['スレッド同期 / mutex / lock / lock_guard / 排他制御 / critical section / happens-before / join', '/runtime/thread-synchronization.html', '共有する状態、ロックの排他と同期、終了待ちとオブジェクトの寿命を結び付ける'],
  ['ワーカーキュー / bounded queue / condition_variable / producer / consumer / backpressure / drain', '/runtime/bounded-worker-queues.html', '容量と待機条件を決め、受付終了後に残っている仕事を回収する'],
  ['アセットワーカー / 描画スレッド / 完了キュー / 世代トークン / handoff', '/game/asset-worker-handoff.html', '別スレッドで準備した結果の所有権を移し、描画に登録できる結果を選ぶ'],
  ['近似一致 / 絶対許容差 / 相対許容差 / 浮動小数点の比較 / NaN / Inf', '/math/floating-point-comparison.html', '厳密な等値、用途に応じた近似判定、特殊値と非推移性を区別する'],
  ['Unicode / 文字コード / UTF-8 / UTF-16 / コードポイント / サロゲートペア / BOM / 文字化け', '/data/unicode-and-encoding.html', '文字の番号、コード単位、バイト列と、長さの数え方を区別する'],
  ['float / binary32 / 浮動小数点 / 丸め / 刻み幅 / epsilon / nextafter', '/data/floating-point-spacing.html', 'ビット表現と有効精度、隣接値、最近接・偶数丸めを区別する'],
  ['bit / byte / 2進数 / 16進数 / 整数表現 / 2の補数 / エンディアン', '/data/integer-bits-and-bytes.html', '値と表記、符号の解釈、アドレス順のバイト列を区別する'],
  ['Cの配列 / sizeof / パディング / バイト列', '/languages/c/reading-byte-arrays.html', '配列の長さ、関数へ渡るポインタ、メモリと保存形式での配置の違いを調べる'],
  ['バイナリファイル / 範囲検査 / バイナリパーサー / magic number / bounds check / 整数オーバーフロー', '/data/binary-file-validation.html', '件数・オフセット・長さを確かめ、読み取りや確保に使える範囲を決める'],
  ['プロセス / スレッド / PID / TID / ローダー / エントリポイント / CRT', '/os/process-startup.html', '実行環境と実行単位、EXEの開始点からmainまでの違い'],
  ['alloc / allocate / malloc / アロック / メモリ確保', '/runtime/memory/allocation-journey.html', '確保・初期化・解放、再利用とOSへの要求の関係'],
  ['仮想メモリ / reserve / commit / resident / ページフォルト / ページフォールト', '/os/virtual-memory.html', 'アドレス変換と、予約・コミット・常駐の違い'],
  ['モデル / メッシュ / 頂点 / 辺 / 面 / ポリゴン / 三角形 / 法線', '/graphics/basics/models-and-meshes.html', '形をデータで表し、頂点から面を組み立てる基本を調べる'],
  ['ローカル座標 / ワールド座標 / ビュー座標 / 座標変換 / カメラ / 透視投影 / 正投影', '/graphics/basics/transforms-and-cameras.html', '形の位置を決め、カメラからの見え方へ変換する流れを追う'],
  ['マテリアル / 材質 / テクスチャ / UV / シェーダー / サンプラー', '/graphics/basics/materials-textures-and-shaders.html', '表面の見た目を決めるデータ、値、計算の役割を調べる'],
  ['レンダリング / 光源 / ライティング / 深度 / リアルタイム描画 / オフライン描画', '/graphics/basics/light-and-rendered-images.html', 'シーンとカメラ、光から画像を作る流れをつかむ'],
  ['ゲームエンジン / Unity / Unreal Engine / エディター / アセット / ゲームロジック', '/game/basics/game-engine-basics.html', '素材とルールをエンジンの機能で動かす構成を調べる'],
  ['ゲームループ / フレーム / FPS / デルタタイム / dt / Update / FixedUpdate', '/game/basics/game-loop-and-time.html', '入力、状態の更新、描画と時間の関係を調べる'],
  ['シーン / ゲームオブジェクト / コンポーネント / Transform / 親子関係', '/game/basics/scenes-and-components.html', '配置した物体と、その機能や座標のつながりを調べる'],
  ['衝突判定 / コライダー / Rigidbody / 剛体 / トリガー / CCD / レイキャスト', '/game/basics/collisions-and-physics.html', '判定の形、接触、物理で動かす処理の違いを調べる'],
  ['キーフレーム / アニメーション / トラック / 補間 / カーブ / クリップ', '/graphics/basics/keyframes-and-animation.html', '時刻ごとの値から、間の動きやループを作る仕組みを調べる'],
  ['リグ / ボーン / ジョイント / スキニング / ウェイト / FK / IK', '/graphics/basics/rigs-and-skinning.html', '骨の親子関係と、メッシュが変形する対応を調べる'],
  ['UI / HUD / メニュー / Canvas / アンカー / ピボット / フォーカス', '/game/basics/ui-layout-and-interaction.html', '画面に情報を配置し、ポインターやキーで操作する基本を調べる'],
  ['入力アクション / デバイス / バインディング / デッドゾーン / リマップ', '/game/basics/input-actions-and-devices.html', '機器の入力を、移動や決定などのゲームの操作へ対応させる'],
  ['プレハブ / prefab / インスタンス / Instantiate / Destroy / 有効化 / オブジェクトの寿命', '/game/basics/prefabs-and-object-lifetimes.html', 'テンプレートから物体を作り、状態を持ち、利用を終える流れを調べる'],
  ['セーブ / シリアライズ / デシリアライズ / JSON / 保存形式 / バージョン', '/game/basics/save-data-and-serialization.html', '実行中のデータから保存する情報を選び、検証して復元する流れを調べる'],
  ['ゲーム状態 / ポーズ / タイトル / 結果画面 / timeScale / 状態遷移', '/game/basics/game-states-and-pause.html', '今の状態に応じて入力と更新を切り替える'],
  ['ゲームイベント / イベント通知 / 発行 / 購読 / ハンドラー / 購読解除', '/game/basics/game-events-and-notifications.html', 'HPの変化などをUIへ伝え、利用期間に合わせて通知を受ける'],
  ['シェーダー / 頂点シェーダー / フラグメントシェーダー / ピクセルシェーダー / mix / lerp', '/graphics/shader/shader-first-steps.html', '頂点から三角形の色を作る処理を、GLSLとHLSLの短いコードで追う'],
  ['頂点属性 / attribute / varying / uniform / 定数バッファ / cbuffer / binding', '/graphics/shader/shader-inputs-and-uniforms.html', '描画に使うデータを、シェーダーのどの入力へ渡すかを調べる'],
  ['sRGB / HDR10 / トーンマップ', '/graphics/postprocess/overview.html', '色の表現と、描画結果を画面へ出すまでの変換を調べる'],
  ['フレームデバッガ / Frame Debugger / RenderDoc / Unreal Insights', '/graphics/optimization/tools.html', '描画の状態や処理時間を調べるツールを選ぶ'],
  ['ECS / Entity Component System', '/game/ecs.html', 'ID、Component、System、Query、格納方式'],
  ['RAII / 所有 / 寿命', '/runtime/memory/storage-duration-and-lifetime.html', '記憶域、寿命、後片付けの区別'],
  ['HLSL', '/graphics/shader/hlsl.html', 'Direct3Dやエンジンで使うシェーダ言語'],
  ['GLSL', '/graphics/shader/glsl.html', 'OpenGL系のシェーダ言語とコンパイル経路'],
  ['OpenGL / GL', '/graphics/api/opengl.html', '状態、リソース、パイプライン、同期'],
  ['DirectX / Direct3D / D3D / DX', '/graphics/api/comparison.html', 'DirectX全体、描画API、DXGIの区別'],
  ['Vulkan / VK', '/graphics/api/vulkan.html', '明示的な資源管理、コマンド、同期、表示'],
  ['DIP / DI', '/design/solid/dip.html', '依存性逆転と依存性注入'],
  ['命名辞典 / Factory / Service / Repository', '/design/naming.html', '名前と責務、具体例と注意点']
]
writePage('terms/index.md', '用語・別名から調べる', {
  section: 'reference', format: 'glossary', domain: 'terms', catalog: true,
  summary: '表記の違いから、用語や仕組みの主な説明へ進む。'
}, `# 用語・別名から調べる

| 用語・別名 | 説明への入口 |
| --- | --- |
${termRows.map(([name, url, description]) => `| [${name}](${url}) | ${description} |`).join('\n')}

- [C++・設計の用語集](/guide/cpp-glossary.html)
- [クラス名辞典](/design/naming.html)
- [問題から選ぶパターン索引](/design/pattern-index.html)
- [技術辞典のタイトル・別名索引](/)`)

for (const domain of domains) {
  const reference = entries.filter(entry => entry.domain === domain.id && entry.section === 'reference').sort(byTitle)
  const learning = entries.filter(entry => entry.domain === domain.id && entry.section === 'learning').sort(byOrder)
  const practice = entries.filter(entry => entry.domain === domain.id && entry.section === 'practice').sort(byOrder)
  const isBrowser = domain.id === 'browser'
  const guideLinks = isBrowser
    ? '- [URLを開いてからページが見えるまで](/guide/learning-paths.html#browser-navigation-path) — DNSやHTTPから、DOMと描画の観察までを順にたどる。'
    : learning.length ? list(learning) : 'この分野専用の学習経路は準備中です。[学習ガイド一覧](/learn/)から、公開中のコースを選べます。'
  const guideSection = `## この分野の学習ガイド

${guideLinks}`
  const referenceSection = `## 辞典の本文

${reference.length ? list(reference) : 'この分野の専用の辞典本文は準備中です。学習計画や分野の目次を、詳しい解説本文として数えてはいません。'}`
  const domainSections = isBrowser ? [guideSection, referenceSection] : [referenceSection, guideSection]
  domain.count = reference.length
  domain.status = reference.length ? '辞典本文あり' : '辞典本文を準備中'
  writePage(domain.id + '/index.md', domain.title, { section: 'reference', format: 'index', domain: domain.id }, `# ${domain.title}

${domain.description}

${domainSections.join('\n\n')}

## 作って試す

${practice.length ? list(practice) : 'この分野専用の実践教材は準備中です。[実践・サンプル一覧](/practice/)に公開中の題材をまとめています。'}

## 扱う範囲・増補する項目

${domain.planned.split('、').map(text => '- ' + text).join('\n')}`)
}

for (const file of walk(docs)) {
  const parsed = matter(fs.readFileSync(file, 'utf8'))
  const meta = parsed.data.study
  if (!meta?.generated || !meta.catalog) continue
  entries.push({ title: parsed.data.title, url: urlFor(file), file: path.relative(docs, file).split(path.sep).join('/'),
    domain: meta.domain, section: meta.section, format: meta.format, status: meta.status,
    summary: meta.summary, source: meta.source, aliases: [], ...(meta.collection ? { collection: meta.collection } : {}),
    ...(Number.isFinite(meta.order) ? { order: meta.order } : {}), links: linkedUrls(parsed.content, file) })
}
entries.sort(byTitle)
const seen = new Set()
for (const entry of entries) {
  if (seen.has(entry.url)) throw new Error('Duplicate catalog URL: ' + entry.url)
  seen.add(entry.url)
  entry.links = entry.links.filter(url => entries.some(item => item.url === url))
}
for (const collection of collections) {
  if (!at(collection.start)) throw new Error('Missing collection entry: ' + collection.id)
  const pages = entries.filter(entry => entry.collection === collection.id).sort(byOrder)
  if (!pages.length) throw new Error('Empty collection: ' + collection.id)
  if (collection.linear) {
    if (new Set(pages.map(entry => entry.order)).size !== pages.length) throw new Error('Duplicate course order: ' + collection.id)
    pages.forEach((entry, index) => {
      if (index > 0) entry.previous = pages[index - 1].url
      if (index < pages.length - 1) entry.next = pages[index + 1].url
    })
  }
}

const item = entry => ({ text: entry.title, link: entry.url })
const referenceSidebar = [
  { text: '技術辞典', link: '/' }, { text: '用語・別名', link: '/terms/' },
  ...domains.map(domain => ({ text: domain.title, collapsed: true, items: [
    { text: domain.count ? '分野の目次' : '本文を準備中', link: '/' + domain.id + '/' },
    ...entries.filter(entry => entry.section === 'reference' && entry.domain === domain.id).map(item)
  ] }))
]
function sectionSidebar(section, collectionId) {
  const sectionInfo = sections.find(item => item.id === section)
  const collection = collections.find(item => item.id === collectionId)
  const current = collection ? [{ text: collection.title, items: entries.filter(entry => entry.collection === collection.id).sort(byOrder).map(item) }] : []
  const roadmap = section === 'learning' ? [item(at('/learn/roadmap.html'))] : []
  return [{ text: sectionInfo.title + '一覧', link: sectionInfo.url }, ...roadmap, ...current,
    { text: collection ? 'ほかの' + sectionInfo.title : sectionInfo.title, collapsed: Boolean(collection),
      items: collections.filter(item => item.section === section && item.id !== collectionId).map(item => ({ text: item.title, link: item.start })) }]
}
const sidebar = { '/': referenceSidebar, '/learn/': sectionSidebar('learning'), '/practice/': sectionSidebar('practice') }
for (const entry of entries) {
  if (entry.section !== 'reference') sidebar['/' + entry.file] = sectionSidebar(entry.section, entry.collection)
}
sidebar['/guide/index.md'] = sectionSidebar('learning')
const catalog = { sections, domains: domains.map(({ planned, ...data }) => data), collections, entries }
fs.writeFileSync(path.join(dataDir, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
fs.writeFileSync(path.join(dataDir, 'sidebar.json'), JSON.stringify(sidebar, null, 2) + '\n')
console.log(`Navigation: ${domains.length} domains; ${sections.map(section => section.title + ' ' + entries.filter(entry => entry.section === section.id).length).join(', ')}`)
