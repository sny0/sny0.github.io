<script setup lang="ts">
import { withBase } from 'vitepress'

defineProps<{
  title: string
  headingLevel: 'h2' | 'h3'
  linkLabel: string
  collections: { id: string; title: string; description: string; start: string; pageCount: number }[]
}>()
</script>

<template>
  <section class="study-collection-section" aria-labelledby="study-collections-heading">
    <div class="study-section-heading">
      <component :is="headingLevel" id="study-collections-heading">{{ title }}</component>
    </div>
    <ul class="study-collection-grid">
      <li v-for="collection in collections" :key="collection.id">
        <a :href="withBase(collection.start)" class="study-collection-card">
          <span class="study-collection-count">{{ collection.pageCount }}ページ</span>
          <strong>{{ collection.title }}</strong>
          <span>{{ collection.description }}</span>
          <span class="study-collection-open">{{ linkLabel }} →</span>
        </a>
      </li>
    </ul>
  </section>
</template>
