<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import roadmap from '../roadmap.mjs'
import { experiences, purposes, roadmapUrl, trackOverviews } from '../roadmap-start.mjs'
import { nodeById, useRoadmapProgress } from './useRoadmapProgress'

type Experience = 'beginner' | 'engine' | 'code'
const purposeId = ref('')
const experienceId = ref<Experience | ''>('')
const trackById = new Map(roadmap.tracks.map(track => [track.id, track]))
const overview = trackOverviews.map(row => ({ ...row, track: trackById.get(row.id)! }))
const { trackCompleted, storageAvailable } = useRoadmapProgress()

const recommendation = computed(() => {
  const purpose = purposes.find(item => item.id === purposeId.value)
  const experience = experienceId.value
  if (!purpose || !experience) return undefined
  const [trackId, nodeId, explanation] = purpose.starts[experience]
  return {
    track: trackById.get(trackId)!,
    node: nodeById.get(nodeId)!,
    explanation,
    nextTrack: trackId === purpose.track ? undefined : trackById.get(purpose.track),
  }
})
</script>

<template>
  <div class="vp-doc study-start">
    <header>
      <h1>学習を始める</h1>
      <p>作りたいものや知りたいことを選ぶと、学習ロードマップで最初に開く項目が分かります。</p>
    </header>

    <section aria-labelledby="start-question">
      <h2 id="start-question">目的と経験を選ぶ</h2>
      <div class="start-choices">
        <fieldset>
          <legend>何を学びたいですか</legend>
          <label v-for="purpose in purposes" :key="purpose.id">
            <input v-model="purposeId" type="radio" name="study-purpose" :value="purpose.id">
            <span>{{ purpose.label }}</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>どのくらい経験がありますか</legend>
          <label v-for="experience in experiences" :key="experience.id">
            <input v-model="experienceId" type="radio" name="study-experience" :value="experience.id">
            <span>{{ experience.label }}</span>
          </label>
        </fieldset>
      </div>
      <div class="start-result" aria-live="polite" data-study-recommendation>
        <template v-if="recommendation">
          <p class="start-result-title">
            <a :href="withBase(roadmapUrl(recommendation.track.id, recommendation.node.id))">
              {{ recommendation.track.title }}の「{{ recommendation.node.title }}」から始める
            </a>
          </p>
          <p>{{ recommendation.explanation }}</p>
          <p v-if="recommendation.nextTrack">
            基礎を練習したら、<a :href="withBase(roadmapUrl('dev-tools', 'dev-terminal'))">開発の道具</a>でコマンドの使い方を確認し、<a
              :href="withBase(roadmapUrl(recommendation.nextTrack.id))">{{ recommendation.nextTrack.title }}</a>へ進みます。
          </p>
        </template>
        <p v-else>目的と経験を一つずつ選ぶと、ここに最初の節点が表示されます。</p>
      </div>
    </section>

    <section aria-labelledby="start-map">
      <h2 id="start-map">分野をつなぐ学習順</h2>
      <slot />
      <p>すでに書ける人は、各分野の前提と達成条件を確認して途中から合流できます。「ゲーム開発」は、小さなゲームを作った後に設計や実行時の仕組みを深めるルートです。</p>
    </section>

    <section aria-labelledby="start-tracks">
      <h2 id="start-tracks">8つのロードマップ</h2>
      <p>時間は教材を読み、代表的な実践を一度試す目安です。</p>
      <div class="start-table" role="region" aria-label="ロードマップの比較表" tabindex="0">
        <table>
          <thead><tr><th scope="col">分野</th><th scope="col">対象者</th><th scope="col">前提</th><th scope="col">時間の目安</th><th scope="col">終わるとできること</th></tr></thead>
          <tbody>
            <tr v-for="row in overview" :key="row.id">
              <th scope="row"><a :href="withBase(roadmapUrl(row.id))">{{ row.track.title }}</a></th>
              <td>{{ row.audience }}</td><td>{{ row.prerequisite }}</td><td class="start-time">{{ row.time }}</td><td>{{ row.outcome }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p><a :href="withBase('/guide/cpp-roadmap.html')">C++とゲーム設計の学習ロードマップ</a>は、C++の言語機能と設計の記事を組み合わせた読書ガイドです。学習ロードマップの「設計」では、設計に絞った前提と達成条件を確認して進捗を記録できます。</p>
    </section>

    <section aria-labelledby="start-progress">
      <h2 id="start-progress">分野ごとの進捗</h2>
      <p>{{ storageAvailable ? 'このブラウザに保存した達成条件を集計します。節点の達成条件をすべてチェックすると完了です。' : 'このブラウザでは保存済みの進捗を読み込めません。' }}</p>
      <ul class="start-progress-list">
        <li v-for="row in overview" :key="row.id" :data-study-track-progress="row.id">
          <a :href="withBase(roadmapUrl(row.id))">{{ row.track.title }}</a>
          <span>{{ trackCompleted.get(row.id) ?? 0 }}/{{ row.track.nodeIds.length }}節点完了</span>
          <progress :value="trackCompleted.get(row.id) ?? 0" :max="row.track.nodeIds.length" :aria-label="row.track.title + 'の進捗'" />
        </li>
      </ul>
      <p><a :href="withBase('/learn/')">学習ガイド一覧</a></p>
    </section>
  </div>
</template>

<style scoped>
.study-start { max-width: 1120px; margin: 0 auto; padding: 32px 32px 72px; }
.study-start h1 { font-size: clamp(1.9rem, 4vw, 2.45rem); }
.study-start header p { color: var(--vp-c-text-2); }
.study-start :is(a, input, [tabindex]):focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.start-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.start-choices fieldset { min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 8px 12px 12px; }
.start-choices legend { padding: 0 6px; font-weight: 650; }
.start-choices label { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 6px 8px; border-radius: 5px; cursor: pointer; }
.start-choices label:hover, .start-choices label:has(input:checked) { background: var(--vp-c-brand-soft); }
.start-choices input { appearance: auto; width: 1rem; height: 1rem; flex: none; accent-color: var(--vp-c-brand-1); }
.start-result { margin-top: 14px; padding: 10px 16px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); }
.start-result p { margin: 6px 0; }
.start-result-title { font-weight: 700; }
.start-table { overflow-x: auto; }
.start-table table { display: table; width: 100%; min-width: 690px; margin: 0; }
.start-table th, .start-table td { text-align: left; vertical-align: top; }
.start-time, .start-table th:nth-child(4) { white-space: nowrap; }
.start-progress-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 0; list-style: none; }
.start-progress-list li { display: grid; align-content: start; gap: 3px; margin: 0; padding: 10px; border: 1px solid var(--vp-c-divider); border-radius: 8px; }
.start-progress-list li span { color: var(--vp-c-text-2); font-size: .85rem; }
.start-progress-list progress { width: 100%; height: .6rem; accent-color: var(--vp-c-brand-1); }
@media (max-width: 680px) {
  .study-start { padding: 24px 18px 56px; }
  .start-choices { grid-template-columns: minmax(0, 1fr); }
  .start-progress-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
