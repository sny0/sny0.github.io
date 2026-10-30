<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import catalog from '../catalog.json'

const { page, frontmatter } = useData()
const current = computed(() => catalog.entries.find(entry => entry.file === page.value.relativePath))
const collection = computed(() => catalog.collections.find(item => item.id === current.value?.collection))
const previous = computed(() => catalog.entries.find(entry => entry.url === current.value?.previous))
const next = computed(() => catalog.entries.find(entry => entry.url === current.value?.next))
const references = computed(() => current.value?.section !== 'reference' ? catalog.entries.filter(entry => entry.section === 'reference' && current.value?.links.includes(entry.url)).slice(0, 6) : [])
const learning = computed(() => current.value?.section === 'reference' ? catalog.entries.filter(entry => entry.section === 'learning' && entry.format !== 'index' && entry.links.includes(current.value!.url)).sort((a, b) => (a.links.length - b.links.length)).slice(0, 3) : [])
const practice = computed(() => current.value?.section === 'reference' ? catalog.entries.filter(entry => entry.section === 'practice' && entry.links.includes(current.value!.url)).slice(0, 3) : [])
const groups = computed(() => [
  { title: '関連する辞典本文', entries: references.value },
  { title: '関連する学習ガイド', entries: learning.value },
  { title: '関連する実践・サンプル', entries: practice.value }
].filter(group => group.entries.length))
</script>

<template>
  <footer v-if="current" class="study-connections">
    <nav v-if="previous || next" class="study-sequence" aria-label="コースの順序">
      <a v-if="previous" :href="withBase(previous.url)"><span>← 前のページ</span><strong>{{ previous.title }}</strong></a>
      <a v-if="next" :href="withBase(next.url)"><span>次のページ →</span><strong>{{ next.title }}</strong></a>
    </nav>
    <p v-if="collection" class="study-collection-return"><a :href="withBase(collection.start)">{{ collection.title }}の入口へ</a></p>
    <section v-for="group in groups" :key="group.title" class="study-connection-group" :aria-label="group.title">
      <h2>{{ group.title }}</h2><ul><li v-for="entry in group.entries" :key="entry.url"><a :href="withBase(entry.url)">{{ entry.title }}</a></li></ul>
    </section>
    <details v-if="frontmatter.study?.source" class="study-source-details"><summary>出典原稿・確認記録</summary><p>出典原稿：{{ frontmatter.study.source }}</p><p v-if="frontmatter.study.verification">{{ frontmatter.study.verification }}。対象環境と確認範囲は本文の記録を参照してください。</p></details>
  </footer>
</template>
