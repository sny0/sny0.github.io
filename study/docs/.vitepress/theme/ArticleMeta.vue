<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { sections, collections, formatLabels, statusLabels } from '../content-model.mjs'

const { frontmatter } = useData()
const meta = computed(() => frontmatter.value.study)
const section = computed(() => sections.find(section => section.id === meta.value?.section))
const collection = computed(() => collections.find(collection => collection.id === meta.value?.collection))
</script>

<template>
  <aside v-if="meta && section" class="study-article-meta" :class="{ 'is-plan': meta.status === 'outline', 'is-draft': meta.status === 'draft' }" aria-label="ページの役割と状態">
    <div class="study-article-meta-labels"><a :href="withBase(section.url)">{{ section.title }}</a><span v-if="meta.format !== 'index'" class="study-kind">{{ formatLabels[meta.format] }}</span><span v-if="meta.status !== 'published'" class="study-article-status">{{ statusLabels[meta.status] }}</span><a v-if="collection" :href="withBase(collection.start)" class="study-article-source">{{ collection.title }}</a></div>
    <p v-if="meta.status === 'outline'" class="study-article-scope">このページは学ぶ範囲と演習の案内です。詳しい説明を読める本文と、まだ未整備のテーマを分けて示しています。</p>
  </aside>
</template>
