import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const docs=path.join(root,'docs')
const catalog=JSON.parse(fs.readFileSync(path.join(docs,'.vitepress/catalog.json'),'utf8'))
const errors=[]
function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=> {
    if(['.vitepress','public','node_modules'].includes(item.name))return []
    const full=path.join(dir,item.name)
    return item.isDirectory()?walk(full):full.endsWith('.md')?[full]:[]
  })
}
function resolveLink(url, source) {
  let raw=url.split('#')[0].split('?')[0]
  if(!raw)return true
  try{raw=decodeURIComponent(raw)}catch{return false}
  if(raw.startsWith('/study/'))raw=raw.slice('/study'.length)
  if(raw.startsWith('/')) {
    const relative=raw.slice(1)
    const publicFile=path.join(docs,'public',relative)
    if(fs.existsSync(publicFile)&&fs.statSync(publicFile).isFile())return true
    const file=path.join(docs,relative==='' || relative.endsWith('/')?relative+'index.md':relative.replace(/\.html$/,'.md'))
    return fs.existsSync(file)&&fs.statSync(file).isFile()
  }
  const file=path.resolve(path.dirname(source),raw)
  return [file,file+'.md',path.join(file,'index.md')].some(p=>fs.existsSync(p)&&fs.statSync(p).isFile())
}
let links=0
const files=walk(docs)
for(const file of files) {
  let text=fs.readFileSync(file,'utf8')
  if(text.includes('\uFFFD'))errors.push(`${file}: invalid replacement character`)
  if(/(?:D:[\\/](?:ClaudeCode|IT教本|プログラミング学習)|file:\/\/\/|study-review[\\/]|review_report\.md)/i.test(text))errors.push(`${file}: internal review/source path in public article`)
  text=text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm,'').replace(/`+[^`\n]*`+/g,'')
  const urls=[...text.matchAll(/\[[^\]\n]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)].map(m=>m[1])
  urls.push(...[...text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map(m=>m[1]))
  for(const value of urls) {
    const url=value.replace(/^<|>$/g,'')
    if(/^(?:https?:|mailto:|data:|#|\/\/)/.test(url))continue
    links++
    if(!resolveLink(url,file))errors.push(`${path.relative(docs,file)}: unresolved ${url}`)
  }
}
const seen=new Set()
for(const entry of catalog.entries) {
  if(seen.has(entry.url))errors.push('Duplicate catalog URL: '+entry.url)
  seen.add(entry.url)
  if(!resolveLink(entry.url,path.join(docs,'index.md')))errors.push('Missing catalog page: '+entry.url)
}
if(catalog.domains.length!==15)errors.push('Expected 15 domains')
if(catalog.entries.length<275)errors.push('Imported chapters or supporting indexes are missing')
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Source check passed: ${files.length} Markdown pages, ${catalog.entries.length} index entries, ${links} internal file links`)
