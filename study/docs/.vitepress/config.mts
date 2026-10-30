import { pathToFileURL } from 'node:url'
import path from 'node:path'
import sidebar from './sidebar.json'
import catalog from './catalog.json'

const sectionMatch = (section: string) => {
  const paths = [catalog.sections.find(item => item.id === section)!.url,
    ...catalog.entries.filter(item => item.section === section).map(item => item.url),
    ...(section === 'reference' ? ['/guide/about.html', ...catalog.domains.map(item => `/${item.id}/`)] : []),
    ...(section === 'learning' ? ['/guide/'] : [])]
  return '^(?:' + paths.map(url => url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\.html$/, '(?:\\.html)?').replace(/\/$/, '/(?:index(?:\\.html)?)?')).join('|') + ')$'
}

// Optional local dependency reuse. Normal installs and CI use npm's packages.
const sharedModules = process.env.STUDY_NODE_MODULES
const vitepressEntry = sharedModules ? pathToFileURL(path.join(sharedModules, 'vitepress/dist/node/index.js')).href : 'vitepress'
const mermaidEntry = sharedModules ? pathToFileURL(path.join(sharedModules, 'vitepress-plugin-mermaid/dist/vitepress-plugin-mermaid.es.mjs')).href : 'vitepress-plugin-mermaid'
const { defineConfig } = await import(vitepressEntry)
const { withMermaid } = await import(mermaidEntry)

export default withMermaid(defineConfig({
  lang: 'ja-JP',
  title: 'Sny0 Study',
  description: 'コンピュータの内部から、言語、開発ツール、3DCG、ゲーム開発までをつなぐ技術辞典。',
  base: '/study/',
  cleanUrls: false,
  srcExclude: ['public/**'],
  lastUpdated: false,
  sitemap: {
    hostname: 'https://sny0.com',
    transformItems: items => items.map(item => ({
      ...item, url: '/study/' + item.url.replace(/^\/+/, '')
    }))
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/study/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#173d32' }]
  ],
  markdown: { math: true },
  mermaid: { securityLevel: 'strict' },
  themeConfig: {
    siteTitle: 'Sny0 Study',
    logo: '/favicon.svg',
    nav: [
      { text: '技術辞典', link: '/', activeMatch: sectionMatch('reference') },
      { text: '学習ガイド', link: '/learn/', activeMatch: sectionMatch('learning') },
      { text: '実践・サンプル', link: '/practice/', activeMatch: sectionMatch('practice') },
      { text: '用語・別名', link: '/terms/' },
      { text: 'この辞典', link: '/guide/about.html' },
      { text: 'sny0.com', link: 'https://sny0.com/' }
    ],
    sidebar,
    outline: { level: [2, 3], label: 'このページ' },
    docFooter: { prev: false, next: false },
    darkModeSwitchLabel: 'ダークモード',
    sidebarMenuLabel: 'この入口の目次',
    returnToTopLabel: 'ページ上部へ',
    editLink: { pattern: 'https://github.com/sny0/sny0.github.io/edit/main/study/docs/:path', text: 'GitHubでこのページを編集' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/sny0/sny0.github.io/tree/main/study' }],
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '全文検索', buttonAriaLabel: 'サイト全体を全文検索' },
          modal: {
            noResultsText: '一致する項目がありません',
            resetButtonTitle: '検索語を消す',
            displayDetails: '本文の一致箇所を表示',
            footer: { selectText: '開く', navigateText: '移動', closeText: '閉じる' }
          }
        },
        miniSearch: {
          options: {
            tokenize(text) {
              const normalized = text.normalize('NFKC').toLowerCase()
              const words = typeof Intl.Segmenter === 'function'
                ? Array.from(new Intl.Segmenter('ja', { granularity: 'word' }).segment(normalized))
                    .filter(part => part.isWordLike).map(part => part.segment)
                : normalized.split(/[^\p{L}\p{N}_]+/u)
              const identifiers = normalized.match(/[a-z0-9][a-z0-9_+#.-]*/g) || []
              return [...new Set([...words, ...identifiers].filter(Boolean))]
            }
          },
          searchOptions: { prefix: true, fuzzy: 0.15, combineWith: 'AND' }
        }
      }
    },
    footer: { message: '個人の技術ノートを、調べ直せる辞典へ。', copyright: '© sny0' }
  }
}))
