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

「草稿」は増補・推敲中の解説、「学習計画・概要」は学ぶ範囲と演習の案内です。学習計画があるだけの分野を、辞典本文が整っている分野と同じ扱いにはしていません。ブラウザやネットワークなど、専用の本文がまだない分野も明示します。

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
  summary: 'メモリ確保、実行、入力と描画、Webの流れなど、疑問から関連する本文をたどる。'
}, `# 疑問から選ぶ読み順

辞典を最初から順番に読む必要はありません。いまの疑問に関係する本文から選びます。

## 「確保する」と内部で何が起きるか

1. [記憶域期間・スコープ・寿命](/runtime/memory/storage-duration-and-lifetime.html)を区別する。
2. [アロケータ](/runtime/memory/allocators-and-pools.html)で、小さい領域の再利用とOSへの追加要求を調べる。
3. [OSを学ぶ計画](/guide/low-level/operating-system.html)で、仮想メモリ・ページフォルトとのつながりを整理する。OS専用の辞典本文は未整備です。
4. [メモリバグ](/runtime/memory/memory-bugs.html)と[キャッシュ局所性](/runtime/memory/cache-locality-aos-soa.html)から、正しさと配置を確かめる。

## ソースコードがCPUで動くまで

1. [ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html)でコンパイルとリンクをたどる。
2. [翻訳単位・ヘッダー](/runtime/cpp-internals/translation-units-and-headers.html)、[シンボル・ABI](/runtime/cpp-internals/symbols-and-linkage.html)、[実行ファイル・ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)を調べる。
3. [関数呼び出し・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)へ進む。

## 入力からゲーム画面まで

1. [ゲームループ](/game/patterns/game-loop-and-update.html)で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [座標変換](/math/rendering/transform.html)と[描画パイプライン](/graphics/pipeline/overview.html)から画面へつなぐ。
4. 作って試すなら[シューティングの設計](/game/shooter-design.html)を読み、[C++版](/game/shooter-cpp.html)または[Unity版](/game/shooter-unity.html)へ進む。

## URLを開いてからページが見えるまで

[ネットワーク](/network/)と[ブラウザ](/browser/)の専用本文は準備中です。両ページには扱う範囲を記しています。学習計画と、既に読める詳しい説明を区別して増補します。

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)の作品・ハード・媒体・流通と、[リアルタイム3D技術史](/guide/rendering/timeline.html)の技術の変化から、気になった仕組みへ進みます。`)

const termRows = [
  ['alloc / allocate / malloc / アロック / メモリ確保', '/runtime/memory/allocators-and-pools.html', '確保・初期化・解放、アロケータとOSの関係'],
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
