<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import catalog from '../catalog.json'
import { formatLabels, statusLabels } from '../content-model.mjs'

const props = withDefaults(defineProps<{ section?: 'reference' | 'learning' | 'practice' }>(), { section: 'reference' })
const query = ref('')
const selectedDomain = ref('')
const selectedFormat = ref('')
const selectedCollection = ref('')
const sectionInfo = computed(() => catalog.sections.find(section => section.id === props.section)!)
const pool = computed(() => catalog.entries.filter(entry => entry.section === props.section))
const groups = computed(() => catalog.collections.filter(collection => collection.section === props.section))
const formats = computed(() => [...new Set(pool.value.map(entry => entry.format))])
const domainName = (id: string) => catalog.domains.find(domain => domain.id === id)?.title || ({ guide: '分野横断', terms: '用語索引' }[id]) || id
const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase('ja').trim()
const hasFilters = computed(() => Boolean(query.value || selectedDomain.value || selectedFormat.value || selectedCollection.value))
const results = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean)
  return pool.value.filter(entry => (
    (!selectedDomain.value || entry.domain === selectedDomain.value) &&
    (!selectedFormat.value || entry.format === selectedFormat.value) &&
    (!selectedCollection.value || entry.collection === selectedCollection.value) &&
    terms.every(term => normalize([entry.title, ...entry.aliases].join(' ')).includes(term))
  )).sort((a, b) => selectedCollection.value ? (a.order ?? 999) - (b.order ?? 999) : a.title.localeCompare(b.title, 'ja'))
})
const otherEntries = computed(() => selectedDomain.value ? catalog.entries.filter(entry => entry.domain === selectedDomain.value && entry.section !== props.section).slice(0, 4) : [])
const countFor = (id: string) => catalog.entries.filter(entry => entry.collection === id).length
const hasNoBody = computed(() => selectedDomain.value && !query.value && !selectedFormat.value && props.section === 'reference' && !catalog.domains.find(domain => domain.id === selectedDomain.value)?.count)
function resetFilters() {
  query.value = ''
  selectedDomain.value = ''
  selectedFormat.value = ''
  selectedCollection.value = ''
}
watch(() => props.section, resetFilters)
</script>

<template>
  <div class="study-catalog">
    <header class="study-catalog-heading">
      <p class="study-eyebrow">SNY0 STUDY / {{ sectionInfo.action }}</p>
      <h1>{{ sectionInfo.title }}</h1>
      <p class="study-catalog-intro">{{ sectionInfo.description }}</p>
      <nav class="study-section-switch" aria-label="目的から選ぶ">
        <a v-for="section in catalog.sections" :key="section.id" :href="withBase(section.url)" :aria-current="section.id === props.section ? 'page' : undefined"><strong>{{ section.title }}</strong><span>{{ section.action }}</span></a>
      </nav>
    </header>

    <section v-if="props.section === 'reference'" aria-labelledby="study-domains-heading" class="study-domain-section">
      <div class="study-section-heading"><h2 id="study-domains-heading">分野から調べる</h2><p>{{ catalog.domains.length }}分野</p></div>
      <ul class="study-domain-grid">
        <li v-for="domain in catalog.domains" :key="domain.id">
          <button class="study-domain" :class="{ 'is-selected': selectedDomain === domain.id }" type="button" :aria-pressed="selectedDomain === domain.id" aria-controls="study-index-results" @click="selectedDomain = selectedDomain === domain.id ? '' : domain.id">
            <span class="study-domain-title">{{ domain.title }}<span v-if="selectedDomain === domain.id" class="study-domain-selected">選択中</span></span>
            <span class="study-domain-description">{{ domain.description }}</span>
            <span class="study-domain-meta"><span>{{ domain.count ? `辞典 ${domain.count}項目` : '辞典本文を準備中' }}</span></span>
          </button>
        </li>
      </ul>
      <p class="study-index-help">ここに数えるのは辞典の本文です。読む順番は「学習ガイド」、制作手順や演習は「実践・サンプル」にあります。</p>
    </section>

    <section v-else class="study-collection-section" aria-labelledby="study-collections-heading">
      <div class="study-section-heading"><h2 id="study-collections-heading">{{ props.section === 'learning' ? '学習コースを選ぶ' : '作る・試す題材を選ぶ' }}</h2></div>
      <ul class="study-collection-grid">
        <li v-for="collection in groups" :key="collection.id">
          <a :href="withBase(collection.start)" class="study-collection-card"><span class="study-collection-count">{{ countFor(collection.id) }}ページ</span><strong>{{ collection.title }}</strong><span>{{ collection.description }}</span><span class="study-collection-open">{{ props.section === 'learning' ? '学習ガイドを開く' : '題材を開く' }} →</span></a>
        </li>
      </ul>
    </section>

    <section class="study-index-section" aria-labelledby="study-index-heading">
      <div class="study-section-heading"><h2 id="study-index-heading">{{ props.section === 'reference' ? '用語・記事の索引' : props.section === 'learning' ? 'ガイド内のページを探す' : '実践・演習の索引' }}</h2></div>
      <p id="study-index-help" class="study-index-help">この入口のタイトル・別名を絞り込みます。画面上部の全文検索はサイト全体が対象です。</p>
      <form class="study-index-filters" role="search" :aria-label="sectionInfo.title + 'の絞り込み'" @submit.prevent>
        <div class="study-query-control"><label for="study-index-query">タイトル・別名</label><input id="study-index-query" v-model="query" type="search" :placeholder="props.section === 'reference' ? '例：アロケータ、Vulkan、C++' : '例：GPU、シューティング、演習'" autocomplete="off" spellcheck="false" aria-describedby="study-index-help" aria-controls="study-index-results"></div>
        <div class="study-select-control"><label for="study-index-domain">分野</label><select id="study-index-domain" v-model="selectedDomain" aria-controls="study-index-results"><option value="">すべての分野</option><option v-for="domain in catalog.domains" :key="domain.id" :value="domain.id">{{ domain.title }}</option></select></div>
        <div v-if="props.section === 'reference'" class="study-select-control"><label for="study-index-format">形式</label><select id="study-index-format" v-model="selectedFormat" aria-controls="study-index-results"><option value="">すべての形式</option><option v-for="format in formats" :key="format" :value="format">{{ formatLabels[format] }}</option></select></div>
        <div v-else class="study-select-control"><label for="study-index-collection">{{ props.section === 'learning' ? 'コース' : '題材' }}</label><select id="study-index-collection" v-model="selectedCollection" aria-controls="study-index-results"><option value="">すべて</option><option v-for="collection in groups" :key="collection.id" :value="collection.id">{{ collection.title }}</option></select></div>
      </form>
      <div class="study-results-toolbar"><p class="study-results-count" role="status" aria-live="polite" aria-atomic="true"><strong>{{ results.length }}</strong>件<span class="study-count-total"> / {{ sectionInfo.title }} 全{{ pool.length }}件</span></p><button v-if="hasFilters" class="study-reset" type="button" @click="resetFilters">絞り込みを解除</button></div>
      <p v-if="selectedDomain && props.section === 'reference'" class="study-index-help"><a :href="withBase('/' + selectedDomain + '/')">{{ domainName(selectedDomain) }}の目次を開く →</a></p>
      <div id="study-index-results">
        <p v-if="props.section === 'learning' && !hasFilters" class="study-index-help">上のコースから読み始められます。特定の章を探すときは、タイトル・分野・コースで絞り込んでください。</p>
        <div v-else-if="results.length === 0" class="study-empty"><p>{{ hasNoBody ? 'この分野の辞典本文は準備中です。' : '一致するページが見つかりませんでした。' }}</p><p>別の表記や絞り込み条件でも探せます。</p><button class="study-empty-reset" type="button" @click="resetFilters">絞り込みを解除</button></div>
        <ul v-else class="study-entry-list">
          <li v-for="entry in results" :key="entry.url" class="study-entry"><div class="study-entry-labels"><span>{{ domainName(entry.domain) }}</span><span class="study-kind">{{ formatLabels[entry.format] }}</span><span v-if="entry.status !== 'published'" class="study-entry-status" :class="{ 'is-plan': entry.status === 'outline', 'is-draft': entry.status === 'draft' }">{{ statusLabels[entry.status] }}</span></div><a class="study-entry-title" :href="withBase(entry.url)">{{ entry.title }}</a><p v-if="entry.summary" class="study-entry-summary">{{ entry.summary }}</p><p v-if="entry.aliases.length" class="study-entry-aliases">別名：{{ entry.aliases.join(' · ') }}</p></li>
        </ul>
      </div>
      <aside v-if="otherEntries.length" class="study-other-section" aria-label="別の入口にある関連ページ"><h3>同じ分野の{{ props.section === 'reference' ? '学習ガイド・実践' : 'ほかの入口' }}</h3><ul><li v-for="entry in otherEntries" :key="entry.url"><span>{{ catalog.sections.find(section => section.id === entry.section)?.title }}</span><a :href="withBase(entry.url)">{{ entry.title }}</a></li></ul></aside>
    </section>
  </div>
</template>
