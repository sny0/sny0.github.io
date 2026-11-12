import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dist=path.join(root,'docs/.vitepress/dist')
const errors=[]
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
  const full=path.join(dir,item.name);return item.isDirectory()?walk(full):[full]
})}
const files=walk(dist)
const filePaths=new Set(files)
const htmlFiles=files.filter(file=>file.endsWith('.html'))
const documents=new Map(htmlFiles.map(file=>[file,fs.readFileSync(file,'utf8')]))
const ids=new Map([...documents].map(([file,text])=>[file,new Set([...text.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]))]))
const catalog=JSON.parse(fs.readFileSync(path.join(root,'docs/.vitepress/catalog.json'),'utf8'))
const ratedArticles=catalog.entries.filter(entry=>entry.difficulty && entry.importance)
for(const {url,difficulty,importance} of ratedArticles) {
  const relative=url.slice(1)+(url.endsWith('/')?'index.html':'')
  const meta=documents.get(path.join(dist,relative))?.match(/<aside class="study-article-meta[^"]*"[^>]*>([\s\S]*?)<\/aside>/)?.[1]
  if(!meta?.includes(`data-difficulty="${difficulty}"`) || !meta.includes(`data-importance="${importance}"`)) {
    errors.push(`${relative}: article ratings missing from page metadata`)
  }
}
let checked=0
for(const [file,text] of documents) {
  if(/(?:D:[\\/](?:ClaudeCode|IT教本|プログラミング学習)|file:\/\/\/|study-review[\\/]|review_report\.md)/i.test(text))errors.push(`${path.relative(dist,file)}: internal source/review path`)
  for(const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const raw=match[1].replaceAll('&amp;','&')
    if(/^(?:https?:|mailto:|data:|javascript:|\/\/)/.test(raw))continue
    const url=new URL(raw,'https://sny0.com/study/'+path.relative(dist,file).split(path.sep).join('/'))
    if(!url.pathname.startsWith('/study/')){errors.push(`${path.relative(dist,file)}: outside /study/ ${raw}`);continue}
    let relative
    try{relative=decodeURIComponent(url.pathname.slice('/study/'.length))}catch{errors.push('Invalid URL: '+raw);continue}
    let target=path.join(dist,relative)
    if(url.pathname.endsWith('/'))target=path.join(target,'index.html')
    checked++
    if(!filePaths.has(target)){errors.push(`${path.relative(dist,file)}: missing ${raw}`);continue}
    if(url.hash && ids.has(target)) {
      let fragment
      try{fragment=decodeURIComponent(url.hash.slice(1))}catch{fragment=url.hash.slice(1)}
      if(!ids.get(target).has(fragment))errors.push(`${path.relative(dist,file)}: missing anchor ${raw}`)
    }
  }
}
const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8')
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1])
const indexableHtml=[...documents].filter(([file,text])=>file!==path.join(dist,'404.html')
  && !/<meta\s+name=["']robots["']\s+content=["']noindex["']\s*\/?>/i.test(text))
const sitemapPages=new Set(sitemapUrls.map(url=>url.endsWith('/') ? url+'index.html' : url))
if(sitemapUrls.length!==indexableHtml.length || indexableHtml.some(([file])=>{
  const relative=path.relative(dist,file).split(path.sep).join('/')
  return !sitemapPages.has(new URL(relative,'https://sny0.com/study/').href)
}))errors.push('Sitemap must cover the indexable pages under sny0.com/study/')
if(!documents.get(path.join(dist,'game/ecs.html'))?.includes('Sparse Set'))errors.push('ECS chapter missing')
if(!documents.get(path.join(dist,'history/video-games.html'))?.includes('2026'))errors.push('History annual content missing')
if(errors.length){console.error([...new Set(errors)].join('\n'));process.exit(1)}
console.log(`Build check passed: ${htmlFiles.length} HTML pages, ${checked} local references and anchors, ${ratedArticles.length} article ratings`)
