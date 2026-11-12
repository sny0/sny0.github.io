<script setup lang="ts">
import { difficultyLabels, importanceLabels } from '../content-model.mjs'

defineProps<{
  difficulty?: keyof typeof difficultyLabels
  importance?: keyof typeof importanceLabels
}>()
</script>

<template>
  <span v-if="difficulty" class="study-rating" :data-difficulty="difficulty">
    難易度 <strong>{{ difficultyLabels[difficulty] }}</strong>
  </span>
  <span v-if="importance" class="study-rating" :data-importance="importance">
    重要度 <strong>{{ importanceLabels[importance] }}</strong>
  </span>
</template>
