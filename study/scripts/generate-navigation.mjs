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
  ['hardware','ハードウェア','CPU・GPU・キャッシュから、命令とデータが動く仕組みを調べる。','論理回路、ISA・レジスタ、命令実行、分岐予測、キャッシュ・TLB、SIMD、割り込み・DMA'],
  ['os','OS','プロセス、メモリ、スレッド、入出力の仕組みを調べる。','カーネル、プロセス・スレッド、仮想メモリ、システムコール、ファイル・非同期I/O、IPC、権限'],
  ['compilers','コンパイラとツールチェーン','ソースコードが実行可能になるまでを追う。','字句・構文・型検査、AST・IR・SSA、最適化、コード生成、リンク・再配置、ABI、ローダー、デバッグ情報'],
  ['languages','言語','言語の構文を、型・所有・寿命・実行の違いから調べる。','アセンブリ、C、C++、C#、Rust、Zig、PowerShell、POSIX sh/Bash、Python、HLSL・GLSL'],
  ['runtime','実行時の仕組み','確保・所有・解放から、GC、非同期、言語境界へつなぐ。','alloc内部、スタック・ヒープ、RAII、仮想メモリ、GC、IL・JIT/AOT、例外、非同期、FFI'],
  ['browser','ブラウザ','URLを開いてから描画されるまでを、通信・実行・表示に分ける。','navigation、DOM・CSS、JavaScript実行、event loop、layout・paint・composite、プロセス隔離、キャッシュ・保存領域'],
  ['network','ネットワーク','通信の層と失敗を、Webとゲームの両方から調べる。','IP・DNS、TCP・UDP・QUIC、TLS・HTTP、socket、メッセージ境界、遅延・再送・流量制御'],
  ['math','数学・数値計算','座標と式を、描画やシミュレーションへ結び付ける。','ベクトル・行列、座標規約、射影、クォータニオン、補間、幾何、数値誤差、確率・統計'],
  ['algorithms','データ構造・アルゴリズム','操作手順、計算量、不変条件から道具を選ぶ。','配列・ハッシュ・ヒープ・木、探索・ソート、BFS・Dijkstra・A*、BVH、空間分割'],
  ['design','設計','責務、依存、パターンと、その使いどころを調べる。','責務・凝集度・結合度、SOLID、GoF、データ指向、API、テスト、アーキテクチャ、命名'],
  ['graphics','3DCGとグラフィックス','制作データからGPUの処理、最終表示までをつなぐ。','メッシュ・UV・材質、リグ・アニメーション、シェーダ、OpenGL・Direct3D・Vulkan、光・色・最適化'],
  ['game','ゲームとエンジン','入力、時間、ECSと各サブシステムの関係を調べる。','入力・ループ、シーン、ECS、物理・衝突、AI、音、UI、アセット、通信、Unity・Unreal'],
  ['history','ビデオゲーム史','作品・ハード・作り方・遊ぶ場所の変化を技術へつなぐ。','前史、アーケード・家庭用・PC・携帯、3D、配信、オンライン、文化、保存、年別ソフト・ハード'],
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

コンピュータの内部から、言語、開発ツール、3DCG、ゲーム開発までをつなぐ個人の技術ノートです。自分が調べ直すための辞典を、一般公開しています。

## 目的に応じた3つの入口

| 入口 | 調べられること |
| --- | --- |
| [技術辞典](/) | 用語の意味、仕組み、内部動作、比較、注意点。分野と名前から調べます。 |
| [学習ガイド](/learn/) | 前提知識、到達目標、読む順番。詳しい説明は辞典の本文へつなぎます。 |
| [実践・サンプル](/practice/) | 制作手順、コード例、演習。動かしたり考えたりして確かめます。 |

分野は扱うテーマ、入口はページの役割です。同じテーマの学習ガイドと本文があっても、用途を分けて案内します。各本文にある「関連する学習ガイド・実践」から行き来できます。

## 記事の状態と確認範囲

「草稿」は増補・推敲中の解説、「学習計画・概要」は学ぶ範囲と演習の案内です。学習計画があるだけの分野を、辞典本文が整っている分野と同じ扱いにはしていません。各分野の目次で、公開済みの本文と、これから増補する範囲を確認できます。

公開中という状態は、コードの実行や技術内容の全面的な検証を保証しません。対象の言語・規格・エンジン・OSと、実行確認の範囲は個々の本文に従ってください。「モデル検証済み」等の記録は、そのページに書かれた確認範囲に限ります。

標準で保証されること、典型的な実装、実測結果、設計上の助言を区別して読みます。元原稿の出典と検証記録も保っています。

## 探し方

入口ごとの索引は、その入口に属するページのタイトル・別名を絞り込みます。画面上部の全文検索はサイト全体が対象です。[用語・別名](/terms/)からも説明へ進めます。

元の教本の章順は学習ガイドに残し、辞典では主題の名前を使います。再編前のURLからも、同じページを開けます。

誤りや改善点は、[このサイトのソース](https://github.com/sny0/sny0.github.io/tree/main/study)から確認できます。`)

writePage('guide/index.md', '学習ガイドの入口', { section: 'learning', format: 'index', domain: 'guide' }, `# 学習ガイドの入口

読む順番と前提知識は[学習ガイド一覧](/learn/)にまとめています。用語や仕組みを調べるときは[技術辞典](/)、手を動かす題材は[実践・サンプル](/practice/)へ進んでください。

${collections.filter(item => item.section === 'learning').map(item => `- [${item.title}](${item.start}) — ${item.description}`).join('\n')}`)

writePage('guide/learning-paths.md', '疑問から選ぶ読み順', {
  section: 'learning', format: 'path', domain: 'guide', catalog: true, collection: 'questions', order: 0,
  summary: '整数・浮動小数点、文字コード、メモリ確保、起動、同期、ファイルI/Oとマッピング、アセットロード、DNS・TCP・HTTP・TLS通信、入力と描画、Webの疑問から本文をたどる。'
}, `# 疑問から選ぶ読み順

辞典を最初から順番に読む必要はありません。いまの疑問に関係する本文から選びます。

## 整数はメモリにどう並ぶか

1. [整数をビット列・16進数・バイト列で読む](/data/integer-bits-and-bytes.html)で、値、表記、符号の解釈、バイト順を分ける。
2. [C++の整数・バイト列観察サンプル](/practice/data/integer-byte-observation.html)で、型の幅と実メモリ、明示的なLE/BE形式を比較する。
3. [メモリレイアウトとアラインメント](/runtime/cpp-internals/memory-layout.html)で、オブジェクトを置く場所やパディングとの違いを調べる。

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

## ファイルを読むと内部で何が起きるか

1. [ファイルを読む仕組み](/os/file-read-journey.html)で、アプリのバッファ、OSのファイルキャッシュ、ストレージへの要求を分ける。
2. [C++・C#の読み取り観察](/practice/io/file-read-observation.html)で、要求数と実読取数、ファイル位置、EOF、seek、失敗を確かめる。
3. テキストとして解釈するときは[Unicodeと文字コード](/data/unicode-and-encoding.html)へ進む。

## I/Oの完了を待ちながら、別の処理を進めるには

1. [非同期I/O](/os/asynchronous-file-io.html)で、要求の発行と完了、即時完了、待機と継続、バッファの寿命を分ける。
2. [C++・C#の同期・非同期比較](/practice/io/async-file-read-observation.html)で、同じファイルを読み、完了結果と内容の一致を確かめる。
3. 複数の処理から状態を共有するときは[スレッドと同期](/runtime/thread-synchronization.html)も確認する。

## ファイルをメモリへのアクセスとして読むには

1. [メモリマップドファイル](/os/memory-mapped-files.html)で、ファイル内位置と仮想アドレス、ページフォルト、ビューの寿命を分ける。
2. [C++・C#の読み取り専用マッピング](/practice/io/mapped-file-observation.html)で、通常のreadと内容を照合し、整列した位置と使いたい範囲の対応を確かめる。
3. アドレス変換の基礎は[仮想メモリ](/os/virtual-memory.html)、実行時の組立ては[アセットロード設計](/game/asset-loading.html)へ進む。

## アセットが読み終わってから、ゲームで使えるまで

1. [アセットロード設計](/game/asset-loading.html)で、読み取り、展開・検証、登録、利用可能化、解放を分ける。
2. [C++・C#の状態と寿命のモデル](/practice/assets/asset-lifecycle-model.html)で、古い要求の完了、キャンセル、失敗を含む所有権の移動を確かめる。
3. 実I/Oの完了待ちは[非同期I/O](/os/asynchronous-file-io.html)、共有するキューや状態の保護は[スレッドと同期](/runtime/thread-synchronization.html)も確認する。

## 入力からゲーム画面まで

1. [ゲームループ](/game/patterns/game-loop-and-update.html)で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [座標変換](/math/rendering/transform.html)と[描画パイプライン](/graphics/pipeline/overview.html)から画面へつなぐ。
4. 作って試すなら[シューティングの設計](/game/shooter-design.html)を読み、[C++版](/game/shooter-cpp.html)または[Unity版](/game/shooter-unity.html)へ進む。

## sendしたデータが、相手のアプリへ届くまで

1. [ソケットとTCP通信](/network/tcp-sockets.html)で、IP・ポート、送受信バッファ、バイト列とメッセージ、半閉鎖を分ける。
2. [C++・C#のローカル通信](/practice/network/tcp-loopback-observation.html)で、長さ付きメッセージを復元し、送信停止後の応答と受信EOFを確かめる。
3. 待機と非同期処理の基本は[非同期I/O](/os/asynchronous-file-io.html)へ進む。今回の通信例は、非ブロッキング操作とreadiness待ちを使う。

## TCPのバイト列が、Webの要求と応答になるまで

1. [HTTP通信](/network/http-messages.html)で、要求行、状態コード、ヘッダー、本文の形式と長さを分ける。
2. [C++・C#のHTTP観察](/practice/network/http-message-observation.html)で、ローカルのGETと応答を照合し、本文のバイト数と文字数、メッセージ完成とEOFを確かめる。
3. 下の層から調べる場合は[TCPとソケット](/network/tcp-sockets.html)、文字の表現は[Unicodeと文字コード](/data/unicode-and-encoding.html)へ戻る。

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

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)の作品・ハード・媒体・流通と、[リアルタイム3D技術史](/guide/rendering/timeline.html)の技術の変化から、気になった仕組みへ進みます。`)

const termRows = [
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
  ['HTTP / HTTP/1.1 / GET / Host / 状態コード / ヘッダー / Content-Length / Content-Type / CRLF', '/network/http-messages.html', '要求と応答の形式、本文のバイト数、メッセージの完成と接続終了を調べる'],
  ['ソケット / socket / TCP / IPアドレス / ポート / send / recv / フレーミング / 半閉鎖 / loopback', '/network/tcp-sockets.html', '送受信バッファ、バイト列の境界、EOFとエラー、接続の終了を調べる'],
  ['メモリマップドファイル / file mapping / mmap / MapViewOfFile / MemoryMappedFile / ビュー', '/os/memory-mapped-files.html', 'ファイルの範囲と仮想アドレスを対応付け、ページとビューの寿命を調べる'],
  ['アセットロード / asset loading / リソース管理 / cook / 読み込み完了 / 利用可能 / 世代トークン', '/game/asset-loading.html', 'byte取得から登録・利用可能化・解放までの状態と所有権を整理する'],
  ['非同期I/O / asynchronous I/O / Overlapped I/O / ERROR_IO_PENDING / ReadAsync / await / IOCP', '/os/asynchronous-file-io.html', '要求の発行、完了結果、待機と継続、バッファを再利用できる時点を調べる'],
  ['ファイルI/O / read / FileStream / ReadFile / EOF / seek / ファイルキャッシュ / ページキャッシュ', '/os/file-read-journey.html', '読み取り要求と実読取数、ファイル位置、OSキャッシュと保存装置の違いを調べる'],
  ['スレッド同期 / mutex / lock / lock_guard / 排他制御 / critical section / happens-before / join', '/runtime/thread-synchronization.html', '共有する状態、ロックの排他と同期、終了待ちとオブジェクトの寿命を結び付ける'],
  ['近似一致 / 絶対許容差 / 相対許容差 / 浮動小数点の比較 / NaN / Inf', '/math/floating-point-comparison.html', '厳密な等値、用途に応じた近似判定、特殊値と非推移性を区別する'],
  ['Unicode / 文字コード / UTF-8 / UTF-16 / コードポイント / サロゲートペア / BOM / 文字化け', '/data/unicode-and-encoding.html', '文字の番号、コード単位、バイト列と、長さの数え方を区別する'],
  ['float / binary32 / 浮動小数点 / 丸め / 刻み幅 / epsilon / nextafter', '/data/floating-point-spacing.html', 'ビット表現と有効精度、隣接値、最近接・偶数丸めを区別する'],
  ['bit / byte / 2進数 / 16進数 / 整数表現 / 2の補数 / エンディアン', '/data/integer-bits-and-bytes.html', '値と表記、符号の解釈、アドレス順のバイト列を区別する'],
  ['プロセス / スレッド / PID / TID / ローダー / エントリポイント / CRT', '/os/process-startup.html', '実行環境と実行単位、EXEの開始点からmainまでの違い'],
  ['alloc / allocate / malloc / アロック / メモリ確保', '/runtime/memory/allocation-journey.html', '確保・初期化・解放、再利用とOSへの要求の関係'],
  ['仮想メモリ / reserve / commit / resident / ページフォルト', '/os/virtual-memory.html', 'アドレス変換と、予約・コミット・常駐の違い'],
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
  domain.count = reference.length
  domain.status = reference.length ? '辞典本文あり' : '辞典本文を準備中'
  writePage(domain.id + '/index.md', domain.title, { section: 'reference', format: 'index', domain: domain.id }, `# ${domain.title}

${domain.description}

## 辞典の本文

${reference.length ? list(reference) : 'この分野の専用の辞典本文は準備中です。学習計画や分野の目次を、詳しい解説本文として数えてはいません。'}

## この分野の学習ガイド

${learning.length ? list(learning) : 'この分野専用の学習経路は準備中です。[学習ガイド一覧](/learn/)から、公開中のコースを選べます。'}

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
  return [{ text: sectionInfo.title + '一覧', link: sectionInfo.url }, ...current,
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
