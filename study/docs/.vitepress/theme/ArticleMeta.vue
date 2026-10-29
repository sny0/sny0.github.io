<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()

const labelNames: Record<string, string> = {
  article: '本文', chapter: '本文', reference: '参考資料',
  plan: '学習計画', roadmap: '学習計画', draft: '草稿',
  exercise: '演習', history: '歴史', timeline: '年表', guide: 'ガイド',
  published: '公開済み', reviewed: '査読済み', corrected: '修正済み',
  planned: '計画', partial: '一部あり', available: '本文あり', unverified: '未検証'
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const meta = computed(() => {
  const study = frontmatter.value.study
  if (!study || typeof study !== 'object' || frontmatter.value.layout === 'home') return null
  const source = text(study.source)
  const kind = text(study.kind)
  const status = text(study.status)
  return source || kind || status ? { source, kind, status } : null
})

const label = (value: string) => labelNames[value] || value
const isPlan = computed(() => /plan|roadmap|計画/.test(`${meta.value?.kind} ${meta.value?.status}`))
const isDraft = computed(() => /draft|草稿|下書き/.test(`${meta.value?.kind} ${meta.value?.status}`))
</script>

<template>
  <aside
    v-if="meta"
    class="study-article-meta"
    :class="{ 'is-plan': isPlan, 'is-draft': isDraft }"
    aria-label="記事の情報"
  >
    <div class="study-article-meta-labels">
      <span v-if="meta.kind" class="study-kind" :class="{ 'is-plan': isPlan, 'is-draft': isDraft }">{{ label(meta.kind) }}</span>
      <span v-if="meta.status && label(meta.status) !== label(meta.kind)" class="study-article-status">{{ label(meta.status) }}</span>
      <span v-if="meta.source" class="study-article-source">出典原稿：{{ meta.source }}</span>
    </div>
  </aside>
</template>
