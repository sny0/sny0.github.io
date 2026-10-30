import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { sections, formatLabels, statusLabels } from '../docs/.vitepress/content-model.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const docs=path.join(root,'docs')
const catalog=JSON.parse(fs.readFileSync(path.join(docs,'.vitepress/catalog.json'),'utf8'))
const sidebar=JSON.parse(fs.readFileSync(path.join(docs,'.vitepress/sidebar.json'),'utf8'))
const dependencyRequire=createRequire(process.env.STUDY_NODE_MODULES
  ? path.join(process.env.STUDY_NODE_MODULES,'vitepress/package.json')
  : path.join(root,'package.json'))
const YAML=dependencyRequire('yaml')
const errors=[]
const sectionIds=new Set(sections.map(section=>section.id))
const domainIds=new Set([...catalog.domains.map(domain=>domain.id),'guide','terms'])
const collections=new Map(catalog.collections.map(collection=>[collection.id,collection]))
const pages=new Map()
const pagesByUrl=new Map()
function urlFor(relative) {
  return relative==='index.md' ? '/' : relative.endsWith('/index.md')
    ? '/'+relative.slice(0,-8) : '/'+relative.slice(0,-3)+'.html'
}
function validateClassification(meta, label) {
  if(!sectionIds.has(meta.section))errors.push(`${label}: invalid study.section ${meta.section}`)
  if(!Object.hasOwn(formatLabels,meta.format))errors.push(`${label}: invalid study.format ${meta.format}`)
  if(!Object.hasOwn(statusLabels,meta.status))errors.push(`${label}: invalid study.status ${meta.status}`)
  if(!domainIds.has(meta.domain))errors.push(`${label}: invalid study.domain ${meta.domain}`)
  if(meta.format==='path' && meta.section!=='learning')errors.push(`${label}: learning paths belong in learning`)
  if(['tutorial','exercise','sample'].includes(meta.format) && meta.section!=='practice')errors.push(`${label}: practical material belongs in practice`)
  if(meta.collection && collections.get(meta.collection)?.section!==meta.section)errors.push(`${label}: collection is missing or belongs to another section`)
  if(meta.order!==undefined && !Number.isFinite(meta.order))errors.push(`${label}: order must be a finite number`)
}
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
  const relative=path.relative(docs,file).split(path.sep).join('/')
  const frontmatter=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  let meta
  try{meta=frontmatter ? YAML.parse(frontmatter[1])?.study : undefined}
  catch(error){errors.push(`${relative}: invalid frontmatter (${error.message})`)}
  if(!meta || typeof meta!=='object')errors.push(`${relative}: missing study metadata`)
  else {
    if(!meta.generated)validateClassification(meta,relative)
    const page={file:relative,url:urlFor(relative),meta}
    pages.set(relative,page)
    pagesByUrl.set(page.url,page)
  }
  if(text.includes('\uFFFD'))errors.push(`${file}: invalid replacement character`)
  if(/(?:D:[\\/](?:ClaudeCode|IT教本|プログラミング学習)|file:\/\/\/|study-review[\\/]|review_report\.md)/i.test(text))errors.push(`${file}: internal review/source path in public article`)
  if(frontmatter)text=text.slice(frontmatter[0].length)
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
const seenFiles=new Set()
const byUrl=new Map(catalog.entries.map(entry=>[entry.url,entry]))
for(const entry of catalog.entries) {
  if(seen.has(entry.url))errors.push('Duplicate catalog URL: '+entry.url)
  seen.add(entry.url)
  if(seenFiles.has(entry.file))errors.push('Duplicate catalog file: '+entry.file)
  seenFiles.add(entry.file)
  validateClassification(entry,entry.url)
  const page=pages.get(entry.file)
  if(!page)errors.push('Catalog source file is missing: '+entry.file)
  else {
    if(page.url!==entry.url)errors.push(`Catalog URL differs from source path: ${entry.file}`)
    if(page.meta.generated && !page.meta.catalog)errors.push('Navigation-only page appears in catalog: '+entry.url)
    for(const field of ['section','format','status','domain','collection','order']) {
      if(page.meta[field]!==entry[field])errors.push(`Catalog ${field} differs from source: ${entry.file}`)
    }
  }
  if(!resolveLink(entry.url,path.join(docs,'index.md')))errors.push('Missing catalog page: '+entry.url)
  if(!Array.isArray(entry.links))errors.push('Catalog links must be an array: '+entry.url)
  else for(const url of entry.links)if(!byUrl.has(url))errors.push(`${entry.url}: unknown related catalog page ${url}`)
}
for(const page of pages.values()) {
  if((!page.meta.generated || page.meta.catalog) && !seenFiles.has(page.file))errors.push('Source page omitted from catalog: '+page.file)
}
if(new Set(catalog.domains.map(domain=>domain.id)).size!==catalog.domains.length)errors.push('Duplicate domain IDs')
if(collections.size!==catalog.collections.length)errors.push('Duplicate collection IDs')

// Sidebar links are navigation peers. Cross-section recommendations belong in the article.
function sidebarLinks(nodes,label) {
  if(!Array.isArray(nodes)){errors.push('Missing sidebar: '+label);return []}
  return nodes.flatMap(node=>[
    ...(typeof node.link==='string' ? [node.link] : []),
    ...(node.items ? sidebarLinks(node.items,label) : [])
  ])
}
function checkSidebar(nodes,section,label) {
  const urls=sidebarLinks(nodes,label)
  for(const url of urls) {
    if(/^(?:https?:|\/\/)/.test(url))continue
    const page=pagesByUrl.get(url.split('#')[0].split('?')[0])
    if(!page)errors.push(`${label}: sidebar page is missing ${url}`)
    else if(page.meta.section!==section)errors.push(`${label}: ${url} belongs to ${page.meta.section}, not ${section}`)
  }
  return urls
}
checkSidebar(sidebar['/'],'reference','default reference sidebar')
for(const section of sections.filter(section=>section.id!=='reference'))checkSidebar(sidebar[section.url],section.id,section.url)
for(const entry of catalog.entries.filter(entry=>entry.section!=='reference')) {
  // VitePress matches sidebar keys against source relativePath, including index.md.
  const key='/'+entry.file
  const urls=checkSidebar(sidebar[key],entry.section,key)
  if(!urls.includes(entry.url))errors.push(`${key}: current page is absent from its sidebar`)
}

for(const collection of collections.values()) {
  const start=byUrl.get(collection.start)
  if(!start || start.collection!==collection.id || start.section!==collection.section)errors.push('Invalid collection starting page: '+collection.id)
  const members=catalog.entries.filter(entry=>entry.collection===collection.id)
  if(!members.length)errors.push('Empty collection: '+collection.id)
  if(!collection.linear)continue
  if(members.some(entry=>!Number.isFinite(entry.order)))errors.push('Linear collection requires an order on every page: '+collection.id)
  if(new Set(members.map(entry=>entry.order)).size!==members.length)errors.push('Duplicate linear collection order: '+collection.id)
  const ordered=members.toSorted((a,b)=>a.order-b.order)
  if(ordered[0]?.url!==collection.start)errors.push('Linear collection must start at its first page: '+collection.id)
  ordered.forEach((entry,index)=>{
    if(entry.previous!==ordered[index-1]?.url || entry.next!==ordered[index+1]?.url)errors.push('Incorrect course neighbors: '+entry.url)
  })
}
for(const entry of catalog.entries)for(const direction of ['previous','next']) {
  if(!entry[direction])continue
  const neighbor=byUrl.get(entry[direction])
  const reverse=direction==='previous' ? 'next' : 'previous'
  if(!collections.get(entry.collection)?.linear || !neighbor || neighbor.collection!==entry.collection || neighbor.section!==entry.section || neighbor[reverse]!==entry.url)errors.push(`Invalid ${direction} course link: ${entry.url}`)
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Source check passed: ${files.length} Markdown pages, ${catalog.entries.length} classified entries, ${links} internal file links; section sidebars and course order verified`)
