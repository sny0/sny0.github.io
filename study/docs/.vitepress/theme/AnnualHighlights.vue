<script setup lang="ts">
import { computed, ref } from 'vue'
import annualData from '../annual-data.json'

type SourceRecord = {
  region: string
  release_note: string
  source_url: string
  source_title: string
}
type Game = SourceRecord & { title: string; platform: string; reason: string }
type Hardware = SourceRecord & { name: string; significance: string }
type AnnualYear = { year: number; games: Game[]; hardware: Hardware[] }
type AnnualData = {
  title: string
  first_year: number
  last_year: number
  checked_at: string
  year_basis: string
  selection_policy: string
  hardware_policy: string
  current_year_policy: string
  prehistory: string
  years: AnnualYear[]
  sources: Record<string, string>
  counts: { years: number; games: number; hardware: number; sources: number }
}

const annual = annualData as AnnualData
const query = ref('')
const selectedDecade = ref('')
const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase('ja').trim()
const decades = [...new Set(annual.years.map(row => Math.floor(row.year / 10) * 10))]
const indexedYears = annual.years.map(row => ({
  row,
  games: row.games.map(item => ({ item, text: normalize([row.year, item.title, item.platform, item.region, item.release_note, item.reason, item.source_title].join(' ')) })),
  hardware: row.hardware.map(item => ({ item, text: normalize([row.year, item.name, item.region, item.release_note, item.significance, item.source_title].join(' ')) }))
}))

const visibleYears = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean)
  const matches = (text: string) => terms.every(term => text.includes(term))
  return indexedYears.filter(({ row }) => (
    !selectedDecade.value || Math.floor(row.year / 10) * 10 === Number(selectedDecade.value)
  )).map(({ row, games, hardware }) => ({
    year: row.year,
    games: games.filter(({ text }) => matches(text)).map(({ item }) => item),
    hardware: hardware.filter(({ text }) => matches(text)).map(({ item }) => item),
    originalHardwareCount: row.hardware.length
  })).filter(row => row.games.length || row.hardware.length)
})

const resultCounts = computed(() => ({
  years: visibleYears.value.length,
  games: visibleYears.value.reduce((total, row) => total + row.games.length, 0),
  hardware: visibleYears.value.reduce((total, row) => total + row.hardware.length, 0)
}))
const hasFilters = computed(() => Boolean(query.value || selectedDecade.value))

function reset() {
  query.value = ''
  selectedDecade.value = ''
}
</script>

<template>
  <div class="study-annual">
    <div class="study-annual-policy">
      <p>{{ annual.selection_policy }}</p>
      <p>{{ annual.year_basis }} {{ annual.hardware_policy }}</p>
      <p>{{ annual.prehistory }}</p>
      <p class="study-annual-provisional"><strong>{{ annual.current_year_policy }}</strong></p>
    </div>

    <form class="study-index-filters study-annual-filters" role="search" aria-label="年別ソフト・ハード表の絞り込み" @submit.prevent>
      <div class="study-query-control">
        <label for="study-annual-query">作品・ハード・キーワード</label>
        <input
          id="study-annual-query"
          v-model="query"
          type="search"
          placeholder="例：テトリス、PC、携帯、1996"
          autocomplete="off"
          spellcheck="false"
          aria-controls="study-annual-results"
        >
      </div>
      <div class="study-select-control">
        <label for="study-annual-decade">年代</label>
        <select id="study-annual-decade" v-model="selectedDecade" aria-controls="study-annual-results">
          <option value="">すべての年代</option>
          <option v-for="decade in decades" :key="decade" :value="String(decade)">{{ decade }}年代</option>
        </select>
      </div>
    </form>

    <div class="study-results-toolbar">
      <p class="study-results-count" role="status" aria-live="polite" aria-atomic="true">
        <strong>{{ resultCounts.years }}</strong>年分 · ソフト<strong>{{ resultCounts.games }}</strong>件 · ハード<strong>{{ resultCounts.hardware }}</strong>件
      </p>
      <button v-if="hasFilters" class="study-reset" type="button" @click="reset">絞り込みを解除</button>
    </div>

    <div id="study-annual-results">
      <div v-if="visibleYears.length === 0" class="study-empty">
        <p>一致するソフト・ハードが見つかりませんでした。</p>
        <p>別のキーワードで探すか、年代の絞り込みを解除してください。</p>
        <button class="study-empty-reset" type="button" @click="reset">すべての年に戻す</button>
      </div>
      <section v-for="row in visibleYears" :key="row.year" class="study-annual-year" :aria-labelledby="`annual-year-${row.year}`">
        <h3 :id="`annual-year-${row.year}`">
          {{ row.year }}年
          <span v-if="row.year === annual.last_year" class="study-kind is-plan">暫定選定</span>
        </h3>
        <div class="study-annual-columns">
          <div>
            <h4>代表的ソフト</h4>
            <p v-if="row.games.length === 0" class="study-annual-no-items">この条件に一致するソフトはありません。</p>
            <ul v-else class="study-annual-records">
              <li v-for="game in row.games" :key="`${game.title}-${game.platform}`" class="study-annual-record">
                <h5>{{ game.title }}</h5>
                <dl>
                  <div><dt>対応機種</dt><dd>{{ game.platform }}</dd></div>
                  <div><dt>地域</dt><dd>{{ game.region }}</dd></div>
                </dl>
                <p class="study-annual-release">{{ game.release_note }}</p>
                <p><span class="study-annual-field-label">選定理由</span>{{ game.reason }}</p>
                <p class="study-annual-source"><a :href="game.source_url" target="_blank" rel="noopener noreferrer">{{ game.source_title }} ↗</a></p>
              </li>
            </ul>
          </div>
          <div>
            <h4>主なハード</h4>
            <p v-if="row.hardware.length === 0" class="study-annual-no-items">
              {{ row.originalHardwareCount ? 'この条件に一致するハードはありません。' : '新規ハードの掲載はありません。ソフトの対応機種も参照してください。' }}
            </p>
            <ul v-else class="study-annual-records">
              <li v-for="hardware in row.hardware" :key="hardware.name" class="study-annual-record">
                <h5>{{ hardware.name }}</h5>
                <dl><div><dt>地域</dt><dd>{{ hardware.region }}</dd></div></dl>
                <p class="study-annual-release">{{ hardware.release_note }}</p>
                <p><span class="study-annual-field-label">読み取る観点</span>{{ hardware.significance }}</p>
                <p class="study-annual-source"><a :href="hardware.source_url" target="_blank" rel="noopener noreferrer">{{ hardware.source_title }} ↗</a></p>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <details class="study-annual-sources">
      <summary>年別表の参考資料 {{ annual.counts.sources }}件</summary>
      <ul>
        <li v-for="(title, url) in annual.sources" :key="url"><a :href="url" target="_blank" rel="noopener noreferrer">{{ title }}</a></li>
      </ul>
    </details>
  </div>
</template>
