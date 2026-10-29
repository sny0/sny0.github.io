import fs from 'node:fs'
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
function writePage(relative, title, domain, body, kind='統合ガイド', include=true) {
  const file=path.join(docs,relative)
  fs.mkdirSync(path.dirname(file),{recursive:true})
  const meta={title,study:{source:'統合ガイド',kind,status:'初版',domain,generated:true,catalog:include,
    summary:body.replace(/[#*\[\]`]/g,'').split('\n').find(line=>line.trim())?.slice(0,150) || title}}
  // JSON is a YAML subset; frontmatter remains editable without a custom syntax.
  fs.writeFileSync(file,'---\n'+JSON.stringify(meta,null,2)+'\n---\n\n# '+title+'\n\n'+body+'\n','utf8')
}

const findUrl = (needle, fallback) => imported.find(e=>(e.title+' '+e.url).toLowerCase().includes(needle.toLowerCase()))?.url || fallback
const allocator = findUrl('allocators','/runtime/')
const memory = findUrl('storage-duration','/runtime/')
const compiler = findUrl('build-pipeline-journey','/compilers/')
const loop = findUrl('game-loop-and-update','/game/')
const conventions = findUrl('coordinate','/math/')
const profiling = findUrl('profil','/tools/')

writePage('guide/about.md','この技術辞典について','guide',`コンピュータの内部から、言語、開発ツール、3DCG、ゲーム開発までをつなぐ個人の技術ノートです。用語の意味、仕組み、使う場面、落とし穴、手元で確かめる方法を整理しています。

## 本文・学習ガイド・草稿

初版では、C++・設計・描画の既存原稿を中心にまとめています。IT教本に由来する項目は、主に学習計画・概要・演習のガイドです。歴史とECSには本文草稿を追加しました。[小さなシューティングの設計例](/game/shooter-design.html)では、同じルールのC++版とUnityのC#版を読めます。各ページ上部の表示で、原稿の種類と状態を確認できます。

ブラウザ、ネットワーク、Rust、Zig、一般C#の基礎、3DCG制作・アニメーションなどは順次充実させる分野です。分野索引の執筆予定と、既に読める本文を分けています。

## 検証の読み方

標準で保証されること、典型的な実装、実測結果、設計上の助言を区別して読みます。コードの対象言語・規格・エンジン・OSの前提は、個々の本文に従ってください。一般.NETの例とUnityの例にも対応環境の差があります。

初版の公開準備では文書のビルドとリンクを確認し、見つかった誤記を修正しました。本文内の過去の検証記録は元原稿時点のものです。全コードを、全環境で実行確認したという意味ではありません。疑似コード・省略したコードは完成実装と分けます。

## 調べ方

ナビの「全文検索」は本文を含めて検索します。トップの絞り込みはタイトル・別名と分野・種類を対象にします。何から調べるか迷ったら[読み進め方](/guide/learning-paths.html)、表記が分からなければ[用語・別名](/terms/)を使えます。

誤りや改善点は、[このサイトのソース](https://github.com/sny0/sny0.github.io/tree/main/study)から確認できます。`, '案内')

writePage('guide/learning-paths.md','読み進め方','guide',`辞典を最初から順番に読む必要はありません。いま持っている疑問を、関係する項目へつなげる読み順です。

## 「確保する」と内部で何が起きるか

1. [所有・記憶域・寿命](${memory})を区別する。
2. [アロケータ](${allocator})で、小さい領域の再利用とOSへの追加要求を調べる。
3. [OS](/os/)の仮想メモリ、ページフォルト、物理ページとの関係へ進む。
4. [調査ツール](/tools/)で、確保量・常駐量・解放と再利用を観察する。

## ソースコードがCPUで動くまで

1. [ビルドの旅](${compiler})から、コンパイルとリンクをたどる。
2. [コンパイラ](/compilers/)と[言語](/languages/)から、型・ABI・実行方式を調べる。
3. [ハードウェア](/hardware/)の命令、レジスタ、キャッシュへつなぐ。

## 入力からゲーム画面まで

1. [ゲームループ](${loop})で入力・更新・描画の時間を分ける。
2. [ECS](/game/ecs.html)でID、データ配置、Query、構成変更を調べる。
3. [数学](${conventions})と[グラフィックス](/graphics/)から座標・GPU・表示へ進む。
4. [計測](${profiling})で、CPU・GPU・待機・確保のどこが重いか確かめる。

まとまった実装を追うなら、[小さなシューティングの設計](/game/shooter-design.html)から[C++版](/game/shooter-cpp.html)と[Unity版](/game/shooter-unity.html)へ進めます。仕様・データ・更新順を対応させて読みます。

## URLを開いてからページが見えるまで

[ネットワーク](/network/)のDNS・接続・HTTPから、[ブラウザ](/browser/)の解析・実行・描画へ進む系列です。この系列は現在、基礎本文を充実させる段階で、分野索引に項目を整理しています。

## 作り方の変化を歴史から見る

[ビデオゲーム史](/history/video-games.html)で作品・ハード・媒体・流通を並べ、気になった時代からメモリ、描画、入力、通信の各論へ進めます。年別の表は地域・初公開・発売を区別して読みます。`)

writePage('guide/index.md','ガイドと読み進め方','guide',`調べる順番と、元の教本の学習経路を集めています。

- [疑問から選ぶ読み進め方](/guide/learning-paths.html)
- [C++ Wikiの入口](${findUrl('cpp-index','/languages/')})
- [低レイヤの学習ガイド](/guide/low-level/)
- [この辞典の範囲と検証の読み方](/guide/about.html)`)

const terms=[
  ['alloc / allocate / malloc / アロック / メモリ確保',allocator,'要求・確保・初期化・解放を分け、アロケータとOSへつなぐ'],
  ['ECS / Entity Component System','/game/ecs.html','Entity、Component、System、Query、格納方式'],
  ['RAII / 寿命 / 所有',memory,'似た言葉の役割と、後片付けを担うオブジェクト'],
  ['HLSL',findUrl('/shader/hlsl','/graphics/'),'Direct3Dやエンジンで使うシェーダ言語'],
  ['GLSL',findUrl('/shader/glsl','/graphics/'),'OpenGL系のシェーダ言語と、コンパイル経路'],
  ['OpenGL / GL',findUrl('/api/opengl','/graphics/'),'状態、リソース、パイプライン、同期'],
  ['DirectX / Direct3D / D3D / DX',findUrl('/api/comparison','/graphics/'),'DirectX全体と、描画API・DXGIを区別する'],
  ['Vulkan / VK',findUrl('/api/vulkan','/graphics/'),'明示的な資源管理、コマンド、同期、表示'],
  ['DIP / DI',findUrl('/solid/dip','/design/'),'依存性逆転の原則と、依存性注入の手段'],
  ['命名辞典 / Factory / Service / Repository','/design/naming.html','名前と責務、具体例と注意点'],
]
writePage('terms/index.md','用語・別名から調べる','terms',`表記の違いから、主な説明へ進む索引です。詳しい用語集・命名辞典も併用できます。

| 用語・別名 | 説明への入口 |
| --- | --- |
${terms.map(([name,url,description])=>`| [${name}](${url}) | ${description} |`).join('\n')}

- [C++・設計の用語集](${findUrl('cpp-glossary','/design/')})
- [クラス名辞典](/design/naming.html)
- [問題から選ぶパターン索引](/design/pattern-index.html)
- [辞典全体のタイトル・別名索引](/)`,'用語索引')

let entries=[]
for(const file of walk(docs)) {
  const parsed=matter(fs.readFileSync(file,'utf8'))
  const meta=parsed.data.study
  if(!meta || meta.generated) continue
  const url=urlFor(file)
  const base=importedByUrl.get(url) || {}
  const domain=meta.domain || base.domain || path.relative(docs,file).split(path.sep)[0]
  const title=parsed.data.title || base.title || parsed.content.match(/^# (.+)$/m)?.[1] || path.basename(file,'.md')
  const aliases=[...(base.aliases || []),...(meta.aliases || []),...(parsed.data.aliases || [])]
  for(const [pattern,values] of extraAliases) if(pattern.test(title+' '+url)) aliases.push(...values)
  entries.push({title,url,domain,kind:meta.kind || base.kind || '本文', summary:meta.summary || base.summary || '',
    source:meta.source || base.source || '技術ノート',status:meta.status || base.status || '草稿',aliases:[...new Set(aliases)]})
}

const pageLink = entry => `- [${entry.title.replace(/\[/g,'［').replace(/\]/g,'］')}](${entry.url}) — ${entry.kind}`
for(const domain of domains) {
  const existing=entries.filter(entry=>entry.domain===domain.id)
  const body=`${domain.description}\n\n## いま読める項目\n\n${existing.length ? existing.map(pageLink).join('\n') : 'この分野の基礎本文は執筆予定です。下の項目から、扱う範囲を確認できます。'}\n\n## これから充実させる項目\n\n${domain.planned.split('、').map(text=>'- '+text).join('\n')}\n\n本文・概要・学習計画を区別しながら増補します。[疑問から選ぶ読み進め方](/guide/learning-paths.html)にも、この分野とのつながりをまとめています。`
  writePage(domain.id+'/index.md',domain.title,domain.id,body,'分野索引')
  domain.status=existing.some(e=>['本文','本文草稿','草稿','参考資料'].includes(e.kind)) ? '本文・ガイドあり' : existing.length ? '概要・学習ガイドから' : '本文を執筆予定'
}

for(const file of walk(docs)) {
  const parsed=matter(fs.readFileSync(file,'utf8'))
  const meta=parsed.data.study
  if(!meta?.generated || meta.catalog===false)continue
  entries.push({title:parsed.data.title,url:urlFor(file),domain:meta.domain,kind:meta.kind,summary:meta.summary,
    source:meta.source,status:meta.status,aliases:[]})
}
entries.sort((a,b)=>a.title.localeCompare(b.title,'ja'))
const seen=new Set()
for(const entry of entries) {
  if(seen.has(entry.url)) throw new Error('Duplicate catalog URL: '+entry.url)
  seen.add(entry.url)
}
const catalog={domains:domains.map(({planned,...data})=>data),entries}
const sidebar=[{text:'ガイド',collapsed:true,items:[{text:'読み進め方',link:'/guide/learning-paths.html'},{text:'用語・別名',link:'/terms/'},{text:'この辞典',link:'/guide/about.html'}]},
  ...domains.map(domain=>({text:domain.title,collapsed:true,items:[{text:'分野の入口',link:'/'+domain.id+'/'},
    ...entries.filter(e=>e.domain===domain.id && e.kind!=='分野索引').map(e=>({text:e.title,link:e.url}))]}))]
fs.writeFileSync(path.join(dataDir,'catalog.json'),JSON.stringify(catalog,null,2)+'\n')
fs.writeFileSync(path.join(dataDir,'sidebar.json'),JSON.stringify(sidebar,null,2)+'\n')
console.log(`Navigation: ${domains.length} domains, ${entries.length} catalog entries`)
