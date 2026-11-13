import { categories, categoryUrl, termUrl, termsById } from '../docs/.vitepress/glossary/index.mjs'
import comparisons from '../docs/.vitepress/glossary/comparisons.mjs'

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hasText = value => typeof value === 'string' && value.trim().length > 0
const escapeText = text => text.replace(/[\\`*_\[\]{}|<>$]/g, character => '\\' + character)
const link = (label, url) => '[' + escapeText(label) + '](' + url.replaceAll('(', '%28').replaceAll(')', '%29') + ')'

export function generateGlossary(writePage, entries) {
  const articleUrls = new Set(entries.filter(entry => entry.status !== 'planned').map(entry => entry.url))
  const expectedCount = categories.reduce((sum, category) => sum + category.terms.length, 0)
  if (termsById.size !== expectedCount || new Set(categories.map(category => category.id)).size !== categories.length) {
    throw new Error('Duplicate glossary category or term ID')
  }

  const relatedLink = key => {
    if (!termsById.has(key)) throw new Error('Unknown glossary term: ' + key)
    return link(termsById.get(key).term, termUrl(key))
  }
  const metadata = { section: 'reference', format: 'glossary', domain: 'terms', catalog: true }
  const browse = categories.map(category =>
    '- ' + link(category.title, categoryUrl(category.id)) + '（' + category.terms.length + '項目）').join('\n')

  for (const category of categories) {
    if (!slug.test(category.id) || category.terms.length < 40) {
      throw new Error('Invalid glossary category or too few terms: ' + category.id)
    }
    for (const [id, source] of Object.entries(category.sources)) {
      if (!hasText(source.label) || !URL.canParse(source.url) || new URL(source.url).protocol !== 'https:') {
        throw new Error('Invalid glossary source: ' + category.id + ':' + id)
      }
    }
    const terms = [...category.terms].sort((a, b) => a.reading.localeCompare(b.reading, 'ja'))
    const body = terms.map(term => {
      if (!slug.test(term.id) || ![term.term, term.en, term.reading, term.definition, term.example].every(hasText)) {
        throw new Error('Missing glossary entry data: ' + category.id + ':' + term.id)
      }
      const articles = (term.articles ?? []).map(({ label, url }) => {
        if (!hasText(label) || !articleUrls.has(url.split(/[?#]/, 1)[0])) throw new Error('Unknown glossary article: ' + url)
        return link(label, url)
      })
      const related = [...articles, ...(term.related ?? []).map(relatedLink)]
      const sources = term.refs.map(key => {
        if (!Object.hasOwn(category.sources, key)) throw new Error('Unknown glossary source: ' + category.id + ':' + key)
        const { label, url } = category.sources[key]
        return link(label, url)
      })
      return [
        '## ' + escapeText(term.term) + ' {#' + term.id + '}',
        '**' + escapeText(term.en) + '** ／ 読み ' + escapeText(term.reading),
        escapeText(term.definition),
        term.context && '**この分野での意味**　' + escapeText(term.context),
        '**例**　' + escapeText(term.example),
        related.length && '**関連**　' + related.join(' · '),
        sources.length && '**出典**　' + sources.join(' · '),
      ].filter(Boolean).join('\n\n')
    }).join('\n\n')
    writePage('glossary/' + category.id + '.md', category.title + 'の用語集', {
      ...metadata, summary: category.title + 'で使う語の定義、用例、関連する解説記事。',
    }, '# ' + category.title + 'の用語集\n\n[用語集の入口・全用語検索](/glossary/)\n\n'
      + '読み順で ' + terms.length + ' 項目を掲載しています。\n\n' + body)
  }

  const rows = comparisons.map(([word, meanings]) => '| ' + escapeText(word) + ' | ' + meanings.map(([area, definition, key]) => {
    if (!termsById.has(key)) throw new Error('Unknown glossary comparison term: ' + key)
    return link(area, termUrl(key)) + '　' + escapeText(definition)
  }).join('<br>') + ' |').join('\n')

  writePage('glossary/index.md', '用語集', {
    ...metadata, summary: 'PC、プログラミング、3DCG、ゲーム制作の用語を短い定義から調べる。',
  }, `<script setup>
import StudyGlossarySearch from '../.vitepress/theme/StudyGlossarySearch.vue'
</script>

# 用語集

ゲーム開発で見かける言葉の意味と使い方を、2026年11月時点の資料をもとにまとめています。

<StudyGlossarySearch />

## 分野別に読む

${browse}

## 分野で意味が変わる語

| 語 | 分野ごとの意味 |
| --- | --- |
${rows}

詳しい記事を表記や別名から探すときは[用語・別名](/terms/)へ。C++や設計の専門語は[C++・設計の用語集](/guide/cpp-glossary.html)にも載っています。`)
}
