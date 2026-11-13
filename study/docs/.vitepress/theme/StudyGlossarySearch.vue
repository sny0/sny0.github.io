<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { categories, normalizeGlossaryQuery, termUrl } from '../glossary/index.mjs'

const query = ref('')
const pageSize = 20
const limit = ref(pageSize)
const input = ref(null)
const total = categories.reduce((sum, category) => sum + category.terms.length, 0)
const entries = categories.flatMap(category => category.terms.map(term => ({
  ...term,
  category: category.title,
  key: category.id + ':' + term.id,
  search: normalizeGlossaryQuery([term.term, term.en, term.reading, ...(term.aliases ?? [])].join(' ')),
})))
const tokens = computed(() => normalizeGlossaryQuery(query.value).split(/\s+/).filter(Boolean))
const results = computed(() => tokens.value.length
  ? entries.filter(entry => tokens.value.every(token => entry.search.includes(token)))
  : [])
const visible = computed(() => results.value.slice(0, limit.value))

function clear() {
  query.value = ''
  limit.value = pageSize
  input.value?.focus()
}
</script>

<template>
  <section class="glossary-search" aria-labelledby="glossary-search-heading">
    <h2 id="glossary-search-heading">全用語から探す</h2>
    <label for="glossary-query">用語・英語表記・読み</label>
    <div class="glossary-search-controls">
      <input id="glossary-query" ref="input" v-model="query" type="search" autocomplete="off"
        placeholder="例 bake、焼き込み、ぶーと" @input="limit = pageSize">
      <button v-if="query" type="button" @click="clear">クリア</button>
    </div>
    <p class="glossary-search-status" role="status">
      <template v-if="!tokens.length">全{{ total }}項目</template>
      <template v-else-if="!results.length">一致する用語がありません。</template>
      <template v-else>{{ results.length }}件のうち{{ visible.length }}件を表示</template>
    </p>
    <ul v-if="visible.length" class="glossary-results">
      <li v-for="entry in visible" :key="entry.key">
        <a :href="withBase(termUrl(entry.key))">{{ entry.term }}</a>
        <span class="glossary-result-label">{{ entry.en }} · {{ entry.category }}</span>
        <p>{{ entry.definition }}</p>
      </li>
    </ul>
    <button v-if="visible.length < results.length" type="button" @click="limit += pageSize">
      さらに表示
    </button>
  </section>
</template>

<style scoped>
.glossary-search-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.glossary-search-controls input {
  flex: 1 1 14rem;
  min-width: 0;
  padding: 0.45rem 0.65rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.glossary-search button {
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.glossary-search :is(input, button):focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.glossary-search-status,
.glossary-result-label {
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
}

.glossary-results {
  padding-left: 0;
  list-style: none;
}

.glossary-results li {
  padding: 0.65rem 0;
  border-top: 1px solid var(--vp-c-divider);
}

.glossary-result-label {
  display: block;
  overflow-wrap: anywhere;
}

.glossary-results p {
  margin: 0.2rem 0 0;
}
</style>
