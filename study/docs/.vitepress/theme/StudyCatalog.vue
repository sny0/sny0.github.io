<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import catalogData from '../catalog.json'

type Domain = {
  id: string
  title: string
  description: string
  status: string
}

type Entry = {
  title: string
  url: string
  domain: string
  kind: string
  summary: string
  source: string
  status: string
  aliases: string[]
}

const catalog = catalogData as { domains: Domain[]; entries: Entry[] }
const domains = catalog.domains
const entries = catalog.entries
const query = ref('')
const selectedDomain = ref('')
const selectedKind = ref('')

const kindNames: Record<string, string> = {
  article: '本文', chapter: '本文', reference: '参考資料',
  plan: '学習計画', roadmap: '学習計画', draft: '草稿',
  exercise: '演習', history: '歴史', timeline: '年表', guide: 'ガイド'
}

const statusNames: Record<string, string> = {
  published: '公開済み', reviewed: '査読済み', corrected: '修正済み',
  draft: '草稿', planned: '計画', plan: '計画',
  partial: '一部あり', available: '本文あり', unverified: '未検証'
}

const kindName = (kind: string) => kindNames[kind] || kind
const statusName = (status: string) => statusNames[status] || status
const domainName = (id: string) => domains.find(domain => domain.id === id)?.title
  || ({ guide: 'ガイド', terms: '用語索引' } as Record<string, string>)[id] || id
const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase('ja').trim()

const searchableEntries = entries.map(entry => ({
  entry,
  text: normalize([entry.title, ...(entry.aliases || [])].join(' '))
}))

const kindOptions = [...new Set(entries.map(entry => entry.kind).filter(Boolean))]
const domainCounts = new Map(domains.map(domain => [
  domain.id,
  entries.filter(entry => entry.domain === domain.id).length
]))

const filteredEntries = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean)
  return searchableEntries.filter(({ entry, text }) => (
    (!selectedDomain.value || entry.domain === selectedDomain.value) &&
    (!selectedKind.value || entry.kind === selectedKind.value) &&
    terms.every(term => text.includes(term))
  )).map(({ entry }) => entry)
})

const hasFilters = computed(() => Boolean(
  query.value || selectedDomain.value || selectedKind.value
))

function resetFilters() {
  query.value = ''
  selectedDomain.value = ''
  selectedKind.value = ''
}

function toggleDomain(id: string) {
  selectedDomain.value = selectedDomain.value === id ? '' : id
}

function isPlan(entry: Entry) {
  return /plan|roadmap|計画/.test(`${entry.kind} ${entry.status}`)
}

function isDraft(entry: Entry) {
  return /draft|草稿|下書き/.test(`${entry.kind} ${entry.status}`)
}
</script>

<template>
  <div class="study-catalog">
    <header class="study-catalog-heading">
      <p class="study-eyebrow">SNY0 STUDY</p>
      <h1>技術辞典</h1>
      <p class="study-catalog-intro">
        コンピュータの内部、言語、描画、ゲーム開発の知識を、分野と用語から探せます。
      </p>
    </header>

    <section class="study-domain-section" aria-labelledby="study-domains-heading">
      <div class="study-section-heading">
        <h2 id="study-domains-heading">分野から探す</h2>
        <p>{{ domains.length }}分野</p>
      </div>
      <ul class="study-domain-grid">
        <li v-for="domain in domains" :key="domain.id">
          <button
            class="study-domain"
            :class="{ 'is-selected': selectedDomain === domain.id }"
            type="button"
            :aria-pressed="selectedDomain === domain.id"
            aria-controls="study-index-results"
            @click="toggleDomain(domain.id)"
          >
            <span class="study-domain-title">
              {{ domain.title }}
              <span v-if="selectedDomain === domain.id" class="study-domain-selected">選択中</span>
            </span>
            <span class="study-domain-description">{{ domain.description }}</span>
            <span class="study-domain-meta">
              <span>{{ domainCounts.get(domain.id) || 0 }}項目</span>
              <span v-if="domain.status">{{ statusName(domain.status) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section class="study-index-section" aria-labelledby="study-index-heading">
      <div class="study-section-heading">
        <h2 id="study-index-heading">用語・記事の索引</h2>
      </div>
      <p id="study-index-help" class="study-index-help">
        ここではタイトルと別名を絞り込みます。本文の全文検索には、画面上部の「全文検索」を使います。
      </p>
      <form class="study-index-filters" role="search" aria-label="記事索引の絞り込み" @submit.prevent>
        <div class="study-query-control">
          <label for="study-index-query">タイトル・別名</label>
          <input
            id="study-index-query"
            v-model="query"
            type="search"
            placeholder="例：アロケータ、Vulkan、C++"
            autocomplete="off"
            spellcheck="false"
            aria-describedby="study-index-help"
            aria-controls="study-index-results"
          >
        </div>
        <div class="study-select-control">
          <label for="study-index-domain">分野</label>
          <select id="study-index-domain" v-model="selectedDomain" aria-controls="study-index-results">
            <option value="">すべての分野</option>
            <option v-for="domain in domains" :key="domain.id" :value="domain.id">{{ domain.title }}</option>
          </select>
        </div>
        <div class="study-select-control">
          <label for="study-index-kind">種別</label>
          <select id="study-index-kind" v-model="selectedKind" aria-controls="study-index-results">
            <option value="">すべての種別</option>
            <option v-for="kind in kindOptions" :key="kind" :value="kind">{{ kindName(kind) }}</option>
          </select>
        </div>
      </form>

      <div class="study-results-toolbar">
        <p class="study-results-count" role="status" aria-live="polite" aria-atomic="true">
          <strong>{{ filteredEntries.length }}</strong>件<span class="study-count-total"> / 全{{ entries.length }}件</span>
        </p>
        <button v-if="hasFilters" class="study-reset" type="button" @click="resetFilters">絞り込みを解除</button>
      </div>

      <div id="study-index-results">
        <div v-if="filteredEntries.length === 0" class="study-empty">
          <p>一致する項目が見つかりませんでした。</p>
          <p>別の用語で探すか、分野・種別の絞り込みを解除してください。</p>
          <button class="study-empty-reset" type="button" @click="resetFilters">すべての項目に戻す</button>
        </div>
        <ul v-else class="study-entry-list">
          <li v-for="entry in filteredEntries" :key="entry.url" class="study-entry">
            <div class="study-entry-labels">
              <span>{{ domainName(entry.domain) }}</span>
              <span
                v-if="entry.kind"
                class="study-kind"
                :class="{ 'is-plan': isPlan(entry), 'is-draft': isDraft(entry) }"
              >{{ kindName(entry.kind) }}</span>
              <span v-if="entry.status" class="study-entry-status">{{ statusName(entry.status) }}</span>
            </div>
            <a class="study-entry-title" :href="withBase(entry.url)">{{ entry.title }}</a>
            <p v-if="entry.summary" class="study-entry-summary">{{ entry.summary }}</p>
            <p v-if="entry.aliases?.length" class="study-entry-aliases">別名：{{ entry.aliases.join(' · ') }}</p>
            <p v-if="entry.source" class="study-entry-source">出典原稿：{{ entry.source }}</p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
