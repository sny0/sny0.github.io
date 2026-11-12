<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { withBase } from 'vitepress'
import roadmap from '../roadmap.mjs'

type RoadmapNode = (typeof roadmap.nodes)[number]
type Track = (typeof roadmap.tracks)[number]

const storageKey = 'sny0-study:roadmap:v1'
const checkKey = (nodeId: string, checkId: string) => nodeId + ':' + checkId
const nodeById = new Map(roadmap.nodes.map(node => [node.id, node]))
const validCheckIds = new Set(roadmap.nodes.flatMap(node => node.checks.map(check => checkKey(node.id, check.id))))
const initialGoal = (track: Track) => track.showAllByDefault ? '' : (track.nodeIds.at(-1) ?? '')
const currentTrack = ref(roadmap.tracks[0])
const goalId = ref(initialGoal(currentTrack.value))
const selectedId = ref(goalId.value || currentTrack.value.nodeIds[0])
const completedChecks = ref(new Set<string>())
const storageAvailable = ref(true)
const detailHeading = ref<HTMLElement>()
const nodeList = ref<HTMLOListElement>()

const trackNodes = computed(() => currentTrack.value.nodeIds.map(id => nodeById.get(id)!))
const selectedNode = computed(() => nodeById.get(selectedId.value)!)
const visibleNodes = computed(() => {
  if (!goalId.value) return trackNodes.value

  const relevantIds = new Set<string>()
  const pendingIds = [goalId.value]
  for (const id of pendingIds) {
    if (relevantIds.has(id)) continue
    relevantIds.add(id)
    pendingIds.push(...nodeById.get(id)!.prerequisites)
  }
  return trackNodes.value.filter(node => relevantIds.has(node.id))
})

const completedCount = (node: RoadmapNode) =>
  node.checks.filter(check => completedChecks.value.has(checkKey(node.id, check.id))).length
const isComplete = (node: RoadmapNode) => completedCount(node) === node.checks.length
const percent = (completed: number, total: number) => total ? Math.round(completed * 100 / total) : 0
const isReady = (node: RoadmapNode) => node.prerequisites.every(id => isComplete(nodeById.get(id)!))
const statusLabels = { todo: '未着手', 'in-progress': '学習中', done: '完了' }
const nodeStatus = (node: RoadmapNode) => isComplete(node) ? 'done' : completedCount(node) ? 'in-progress' : 'todo'
const completedNodeIds = computed(() => new Set(roadmap.nodes.filter(isComplete).map(node => node.id)))
const overallCompleted = computed(() => completedNodeIds.value.size)
const trackCompleted = computed(() => new Map(roadmap.tracks.map(track => [
  track.id, track.nodeIds.filter(id => completedNodeIds.value.has(id)).length,
])))
const routeCompleted = computed(() => visibleNodes.value.filter(node => completedNodeIds.value.has(node.id)).length)

const graph = computed(() => {
  // Place nodes by prerequisite depth. Align a single successor with its parent.
  const layers: RoadmapNode[][] = []
  const depthById = new Map<string, number>()
  function depthOf(node: RoadmapNode): number {
    const cached = depthById.get(node.id)
    if (cached !== undefined) return cached
    const depth = Math.max(0, ...node.prerequisites.map(id => depthOf(nodeById.get(id)!) + 1))
    depthById.set(node.id, depth)
    return depth
  }
  for (const node of visibleNodes.value) {
    const depth = depthOf(node)
    layers[depth] ??= []
    layers[depth].push(node)
  }
  const rowCount = Math.max(1, ...layers.map(layer => layer.length))
  const vertical = layers.length >= 4 || visibleNodes.value.length > 6
  const positions = new Map<string, { column: number; row: number }>()
  for (const [column, layer] of layers.entries()) {
    for (const [index, node] of layer.entries()) {
      const alignedParent = !vertical && layer.length === 1 && node.prerequisites.length === 1
        ? positions.get(node.prerequisites[0])
        : undefined
      positions.set(node.id, { column, row: alignedParent?.row ?? rowCount - layer.length + index * 2 })
    }
  }
  const lanesUsed = { left: 0, right: 0 }
  const edges = visibleNodes.value.flatMap(node => node.prerequisites.map(id => {
    const from = positions.get(id)!
    const to = positions.get(node.id)!
    const depthStep = 1000 / layers.length
    if (!vertical) {
      const startX = (from.column + 0.94) * depthStep
      const endX = (to.column + 0.06) * depthStep
      const startY = (from.row + 1) * 500 / rowCount
      const endY = (to.row + 1) * 500 / rowCount
      const midX = (startX + endX) / 2
      return { from: id, to: node.id, d: `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}` }
    }

    // Reserve 10% on both sides so edges that skip tiers run outside the cards.
    const startX = 100 + (from.row + 1) * 400 / rowCount
    const endX = 100 + (to.row + 1) * 400 / rowCount
    const startY = (from.column + 0.88) * depthStep
    const endY = (to.column + 0.12) * depthStep
    if (to.column === from.column + 1) {
      const midY = (startY + endY) / 2
      return { from: id, to: node.id, d: `M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}` }
    }

    const side = startX + endX < 1000 ? 'left' : 'right'
    const lane = lanesUsed[side]++
    const offset = 28 + (lane % 4) * 20
    const turnX = side === 'left' ? 100 - offset : 900 + offset
    const gap = (0.04 + (lane % 4) * 0.02) * depthStep
    return { from: id, to: node.id, d: `M ${startX} ${startY} V ${startY + gap} H ${turnX} V ${endY - gap} H ${endX} V ${endY}` }
  }))
  return { columns: layers.length, rows: rowCount * 2, positions, edges, vertical }
})

const graphEdges = computed(() => graph.value.edges.map(edge => ({
  ...edge, active: edge.from === selectedId.value || edge.to === selectedId.value,
})).sort((a, b) => Number(a.active) - Number(b.active)))

function nodePlacement(id: string) {
  const { column, row } = graph.value.positions.get(id)!
  if (graph.value.vertical) return { gridColumn: `${row + 2} / span 2`, gridRow: column + 1 }
  return { gridColumn: column + 1, gridRow: `${row + 1} / span 2` }
}

function changeTrack(track: Track) {
  if (track.id === currentTrack.value.id) return
  currentTrack.value = track
  goalId.value = initialGoal(track)
  changeGoal()
}

function selectTrack(track: Track) {
  changeTrack(track)
  if (window.location.hash !== '#' + track.id) {
    window.history.replaceState(window.history.state, '', '#' + track.id)
  }
}

function syncTrackFromHash() {
  const hash = window.location.hash.slice(1)
  const track = roadmap.tracks.find(track => track.id === hash && track.nodeIds.length)
  changeTrack(track ?? roadmap.tracks[0])
}

function changeGoal() {
  selectedId.value = goalId.value || trackNodes.value[0].id
}

async function openNode(id: string) {
  selectedId.value = id
  await nextTick()
  detailHeading.value?.focus()
}

function focusSelectedNode() {
  nodeList.value?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus()
}

function decodeChecks(value: string | null): Set<string> {
  if (!value) return new Set()
  try {
    const saved: unknown = JSON.parse(value)
    return new Set(Array.isArray(saved)
      ? saved.filter((id): id is string => typeof id === 'string' && validCheckIds.has(id))
      : [])
  } catch {
    return new Set()
  }
}

function loadProgress() {
  try {
    completedChecks.value = decodeChecks(localStorage.getItem(storageKey))
  } catch {
    storageAvailable.value = false
  }
}

function syncProgress(event: StorageEvent) {
  if (!storageAvailable.value || (event.key !== storageKey && event.key !== null)) return
  try {
    if (event.storageArea === localStorage) loadProgress()
  } catch {
    storageAvailable.value = false
  }
}

function toggleCheck(id: string, event: Event) {
  if (storageAvailable.value) loadProgress()
  const checked = (event.target as HTMLInputElement).checked
  const next = new Set(completedChecks.value)
  if (checked) next.add(id)
  else next.delete(id)
  completedChecks.value = next

  if (!storageAvailable.value) return
  try {
    localStorage.setItem(storageKey, JSON.stringify([...next]))
  } catch {
    storageAvailable.value = false
  }
}

onMounted(() => {
  syncTrackFromHash()
  loadProgress()
  window.addEventListener('storage', syncProgress)
  window.addEventListener('hashchange', syncTrackFromHash)
})

onUnmounted(() => {
  window.removeEventListener('storage', syncProgress)
  window.removeEventListener('hashchange', syncTrackFromHash)
})
</script>

<template>
  <div class="study-roadmap" data-study-roadmap>
    <a class="roadmap-link back-link" :href="withBase('/learn/')">← 学習ガイド</a>
    <header class="roadmap-header">
      <div>
        <h1>学習ロードマップ</h1>
        <p>目標を選び、前提となる知識と次に進める項目をたどります。</p>
      </div>
      <div class="roadmap-total">
        <p>ロードマップ全体の進捗</p>
        <p class="roadmap-total-count" role="status" data-roadmap-progress>
          完了 {{ overallCompleted }}/{{ roadmap.nodes.length }}ノード（{{ percent(overallCompleted, roadmap.nodes.length) }}%）
        </p>
        <progress :value="overallCompleted" :max="roadmap.nodes.length" aria-label="登録済みノードの完了数" />
      </div>
    </header>

    <section aria-labelledby="study-roadmap-tracks">
      <h2 id="study-roadmap-tracks">分野を選ぶ</h2>
      <ul class="track-list">
        <li v-for="track in roadmap.tracks" :key="track.id">
          <button v-if="track.nodeIds.length" :id="track.id" type="button" class="track" :data-roadmap-track="track.id"
            :aria-pressed="track.id === currentTrack.id" aria-controls="study-roadmap-route"
            @click="selectTrack(track)">
            <strong>{{ track.title }}</strong>
            <span>{{ track.summary }}</span>
            <span class="track-status" data-roadmap-track-progress>{{ trackCompleted.get(track.id) }}/{{ track.nodeIds.length }}ノード完了</span>
          </button>
          <div v-else class="track track-pending" :data-roadmap-track="track.id">
            <strong>{{ track.title }}</strong>
            <span>{{ track.summary }}</span>
            <span class="track-status">準備中</span>
          </div>
        </li>
      </ul>
    </section>

    <section id="study-roadmap-route" class="roadmap-route" aria-labelledby="study-roadmap-route-title">
      <div class="route-heading">
        <h2 id="study-roadmap-route-title">{{ currentTrack.title }}</h2>
        <p>表示中のルート <strong>{{ routeCompleted }}/{{ visibleNodes.length }}ノード完了（{{ percent(routeCompleted, visibleNodes.length) }}%）</strong></p>
      </div>
      <p v-if="currentTrack.guide" class="route-guide"><a class="roadmap-link" :href="withBase(currentTrack.guide.url)">{{ currentTrack.guide.label }}</a>で読み順と教材を確認できます。</p>
      <div class="route-controls">
        <label for="study-roadmap-goal">学習目標</label>
        <select id="study-roadmap-goal" v-model="goalId" @change="changeGoal">
          <option value="">この分野のすべてのノード</option>
          <option v-for="node in trackNodes" :key="node.id" :value="node.id">{{ node.title }}</option>
        </select>
      </div>
      <div class="roadmap-board" :class="{
        'roadmap-board--wide-map': trackNodes.length > 4,
        'roadmap-board--vertical': graph.vertical,
        'roadmap-board--dense': graph.vertical && graph.rows > 6,
      }">
        <div class="roadmap-map">
          <p class="graph-help">矢印の元が前提です。ノードを選ぶと教材と達成条件を確認できます。</p>
          <p class="list-help">前提と進捗を確認し、ノードを選んで教材と達成条件を開けます。</p>
          <div class="study-roadmap-graph" :data-roadmap-layout="graph.vertical ? 'vertical' : 'horizontal'"
            :style="{ '--roadmap-columns': graph.columns, '--roadmap-rows': graph.rows }">
            <svg v-if="graph.edges.length" class="roadmap-edges" aria-hidden="true" focusable="false"
              viewBox="0 0 1000 1000" preserveAspectRatio="none" data-roadmap-edge>
              <defs>
                <marker id="study-roadmap-arrow" markerUnits="userSpaceOnUse" viewBox="0 0 12 12"
                  preserveAspectRatio="none" :markerWidth="graph.vertical ? 9 : 13"
                  :markerHeight="graph.vertical ? 18 : 32" refX="12" refY="6" orient="auto">
                  <path class="roadmap-arrow" d="M 0 0 L 12 6 L 0 12 Z" fill="currentColor" />
                </marker>
              </defs>
              <path v-for="edge in graphEdges" :key="edge.from + ':' + edge.to" :d="edge.d" fill="none" stroke="currentColor"
                :class="{ 'roadmap-edge-active': graph.vertical && edge.active }" stroke-linejoin="round"
                stroke-width="1.5" vector-effect="non-scaling-stroke" marker-end="url(#study-roadmap-arrow)" />
            </svg>
            <ol ref="nodeList" class="roadmap-node-list" aria-label="学習ノード">
              <li v-for="node in visibleNodes" :key="node.id" :style="nodePlacement(node.id)">
                <button type="button" class="roadmap-node" :data-roadmap-node="node.id"
                  :data-state="nodeStatus(node)" :data-ready="isReady(node)"
                  :aria-pressed="selectedId === node.id" aria-controls="study-roadmap-detail"
                  @click="openNode(node.id)">
                  <strong>{{ node.title }}</strong>
                  <span class="node-progress">{{ statusLabels[nodeStatus(node)] }} · {{ completedCount(node) }}/{{ node.checks.length }}（{{ percent(completedCount(node), node.checks.length) }}%）</span>
                  <span class="node-meter" aria-hidden="true">
                    <span :style="{ width: percent(completedCount(node), node.checks.length) + '%' }" />
                  </span>
                  <span v-if="!isComplete(node)" class="node-readiness">
                    {{ isReady(node) ? '次に学べる' : '先に確認する項目あり' }}
                  </span>
                  <span v-if="node.prerequisites.length" class="node-prerequisite-hint">
                    前提 {{ node.prerequisites.map(id => nodeById.get(id)!.title).join('、') }}
                  </span>
                </button>
              </li>
            </ol>
          </div>
        </div>

        <section id="study-roadmap-detail" class="roadmap-detail" aria-labelledby="study-roadmap-detail-title">
          <h3 id="study-roadmap-detail-title" ref="detailHeading" tabindex="-1">{{ selectedNode.title }}</h3>
          <p>{{ selectedNode.summary }}</p>
          <h4>前提</h4>
          <ul v-if="selectedNode.prerequisites.length" class="detail-list" data-roadmap-prerequisites>
            <li v-for="id in selectedNode.prerequisites" :key="id">
              <button class="roadmap-link" type="button" :data-roadmap-prerequisite="id" @click="openNode(id)">
                {{ nodeById.get(id)!.title }}
              </button>
              <span class="prerequisite-status">{{ statusLabels[nodeStatus(nodeById.get(id)!)] }}</span>
            </li>
          </ul>
          <p v-else>前提なし</p>
          <h4>教材</h4>
          <ul class="detail-list">
            <li v-for="resource in selectedNode.resources" :key="resource.url">
              <a class="roadmap-link" :href="withBase(resource.url)">{{ resource.label }}</a>
            </li>
          </ul>
          <fieldset class="roadmap-checklist">
            <legend>達成条件 <span>{{ completedCount(selectedNode) }}/{{ selectedNode.checks.length }}</span></legend>
            <label v-for="check in selectedNode.checks" :key="checkKey(selectedId, check.id)">
              <input type="checkbox" :data-roadmap-check="checkKey(selectedId, check.id)"
                :checked="completedChecks.has(checkKey(selectedId, check.id))"
                @change="toggleCheck(checkKey(selectedId, check.id), $event)">
              <span>{{ check.label }}</span>
            </label>
          </fieldset>
          <button v-if="graph.vertical" class="roadmap-link detail-back" type="button" @click="focusSelectedNode">選んだノードに戻る</button>
        </section>
      </div>
      <p class="storage-note" role="status">
        {{ storageAvailable ? '進捗はこのブラウザに保存します。' : '進捗を保存できません。ページを開いている間はチェックを続けられます。' }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.study-roadmap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 32px 72px;
  color: var(--vp-c-text-1);
  line-height: 1.75;
}
.roadmap-link { color: var(--vp-c-brand-1); text-align: left; text-decoration: underline; text-underline-offset: .2em; }
.back-link { display: inline-block; margin-bottom: 14px; font-size: .88rem; }
.study-roadmap :is(a, button, select, input, h3):focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
.roadmap-header, .route-heading, .route-controls { display: flex; align-items: center; gap: 12px 20px; }
.roadmap-header { justify-content: space-between; margin-bottom: 32px; }
h1 { font-size: clamp(1.9rem, 4vw, 2.45rem); font-weight: 700; line-height: 1.4; }
h2 { margin-bottom: 10px; font-size: 1.2rem; font-weight: 700; }
.roadmap-header h1 + p { margin-top: 8px; color: var(--vp-c-text-2); }
.roadmap-total {
  flex: 0 0 auto;
  min-width: 14rem;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: .8rem;
}
.roadmap-total-count { margin: 2px 0 7px; color: var(--vp-c-text-1); font-size: 1rem; font-weight: 700; }
.roadmap-total progress {
  display: block;
  width: 100%;
  height: 8px;
  appearance: none;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  background: var(--vp-c-divider);
}
.roadmap-total progress::-webkit-progress-bar { background: var(--vp-c-divider); }
.roadmap-total progress::-webkit-progress-value { background: var(--vp-c-brand-1); }
.roadmap-total progress::-moz-progress-bar { background: var(--vp-c-brand-1); }
.track-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.track {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  height: 100%;
  scroll-margin-top: calc(var(--vp-nav-height) + 24px);
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-align: left;
  overflow-wrap: anywhere;
}
.track span { color: var(--vp-c-text-2); font-size: .82rem; }
.track .track-status { margin-top: auto; font-weight: 600; }
.track[aria-pressed="true"] { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.track-pending { background: var(--vp-c-bg-soft); }
.roadmap-route { margin-top: 32px; }
.route-heading { justify-content: space-between; flex-wrap: wrap; gap: 0 12px; }
.route-heading p { color: var(--vp-c-text-2); font-size: .85rem; }
.route-heading h2 { margin: 0; }
.route-guide { margin-top: 6px; color: var(--vp-c-text-2); font-size: .86rem; }
.route-controls { flex-wrap: wrap; margin: 12px 0 16px; }
.route-controls label { font-weight: 600; }
.route-controls select {
  appearance: auto;
  max-width: 100%;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: inherit;
}
.roadmap-board { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 340px); align-items: start; gap: 16px; }
.roadmap-board--wide-map { grid-template-columns: minmax(0, 1fr) minmax(0, 300px); }
.roadmap-map, .roadmap-detail { padding: 16px; border: 1px solid var(--vp-c-divider); border-radius: 10px; }
.roadmap-map { container-type: inline-size; background: var(--vp-c-bg-soft); }
.graph-help, .list-help, .storage-note { color: var(--vp-c-text-2); font-size: .83rem; }
.list-help { display: none; }
.study-roadmap-graph { position: relative; margin-top: 8px; }
.roadmap-edges { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--vp-c-text-3); pointer-events: none; }
.roadmap-arrow { fill: currentColor; fill: context-stroke; }
.roadmap-edge-active { color: var(--vp-c-brand-1); stroke-width: 2.5; }
.roadmap-node-list {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--roadmap-columns), minmax(0, 1fr));
  grid-template-rows: repeat(var(--roadmap-rows), minmax(0, 1fr));
  min-height: calc(var(--roadmap-rows) * 4.6rem);
}
.roadmap-node-list li { display: flex; padding-block: 7px; }
[data-roadmap-layout="vertical"] .roadmap-node-list {
  grid-template-columns: 10% repeat(var(--roadmap-rows), minmax(0, 1fr)) 10%;
  grid-template-rows: repeat(var(--roadmap-columns), minmax(0, 1fr));
  min-height: calc(var(--roadmap-columns) * var(--roadmap-tier-height, 11rem));
}
.roadmap-board--dense { --roadmap-tier-height: 13rem; }
[data-roadmap-layout="vertical"] .roadmap-node-list li { padding: 0; }
[data-roadmap-layout="vertical"] .roadmap-node { height: 76%; margin-block: auto; padding: 8px; gap: 4px; line-height: 1.45; }
.roadmap-node {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  width: 88%;
  min-width: 0;
  margin-inline: auto;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  scroll-margin-top: calc(var(--vp-nav-height) + 44px);
  background: var(--vp-c-bg);
  text-align: left;
  overflow-wrap: anywhere;
  line-height: 1.55;
}
.roadmap-node strong { font-size: .93rem; }
.roadmap-node:hover, .roadmap-node[aria-pressed="true"] { border-color: var(--vp-c-brand-1); }
.roadmap-node[aria-pressed="true"] { box-shadow: inset 0 0 0 1px var(--vp-c-brand-1); }
.roadmap-node[data-state="done"] { background: linear-gradient(var(--vp-c-brand-soft), var(--vp-c-brand-soft)), var(--vp-c-bg); }
.node-progress { font-size: .8rem; font-weight: 600; }
.node-readiness { color: var(--vp-c-text-2); font-size: .75rem; }
.roadmap-node[data-ready="true"] .node-readiness { color: var(--vp-c-brand-1); }
.node-meter { height: 5px; border-radius: 10px; background: var(--vp-c-divider); overflow: hidden; }
.node-meter span { display: block; height: 100%; background: var(--vp-c-brand-1); }
.node-prerequisite-hint { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.roadmap-detail { background: var(--vp-c-bg); overflow-wrap: anywhere; }
.detail-back { display: none; margin-top: 12px; font-size: .86rem; }
.roadmap-detail h3 { scroll-margin-top: 90px; font-size: 1.04rem; font-weight: 700; }
.roadmap-detail h3 + p { margin-top: 6px; }
.roadmap-detail p, .detail-list { color: var(--vp-c-text-2); font-size: .86rem; }
.roadmap-detail h4 { margin-top: 14px; font-size: .9rem; font-weight: 700; }
.detail-list { padding-left: 1.1em; list-style: disc; }
.detail-list li { margin: 3px 0; }
.prerequisite-status { display: inline-block; margin-left: 6px; font-size: .76rem; }
.roadmap-checklist {
  min-width: 0;
  margin-top: 14px;
  padding: 4px 10px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}
.roadmap-checklist legend { padding-inline: 4px; font-size: .9rem; font-weight: 700; }
.roadmap-checklist legend span { margin-left: 5px; color: var(--vp-c-text-2); font-size: .82rem; }
.roadmap-checklist label { display: flex; gap: 8px; align-items: flex-start; padding: 7px 0; cursor: pointer; font-size: .86rem; }
.roadmap-checklist input { flex: none; width: 17px; height: 17px; margin-top: 4px; accent-color: var(--vp-c-brand-1); }
.storage-note { margin-top: 12px; }

@media (min-width: 1240px) {
  .roadmap-board--vertical .roadmap-detail { position: sticky; top: calc(var(--vp-nav-height) + 16px); }
}
@media (max-width: 1239px) {
  .roadmap-board--wide-map { grid-template-columns: minmax(0, 1fr); }
  .roadmap-board--wide-map .detail-back { display: inline-block; }
}
@media (max-width: 1439px) {
  .roadmap-board--dense { grid-template-columns: minmax(0, 1fr); }
  .roadmap-board--dense .roadmap-detail { position: static; }
  .roadmap-board--dense .detail-back { display: inline-block; }
}
@media (max-width: 1050px) {
  .roadmap-board { grid-template-columns: minmax(0, 1fr); }
  .detail-back { display: inline-block; }
}
@media (max-width: 680px) {
  .study-roadmap { padding: 24px 16px 48px; }
  .roadmap-header { flex-direction: column; align-items: stretch; }
  .track-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .track { padding: 10px; }
  .graph-help, .roadmap-edges { display: none; }
  .list-help { display: block; }
  .roadmap-node-list { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
  .roadmap-node-list li { padding: 0; }
  .roadmap-node { width: 100%; }
  [data-roadmap-layout="vertical"] .roadmap-node-list { min-height: 0; }
  [data-roadmap-layout="vertical"] .roadmap-node { height: auto; margin-block: 0; }
  .node-prerequisite-hint { position: static; width: auto; height: auto; clip-path: none; color: var(--vp-c-text-2); font-size: .77rem; }
}
@container (max-width: 640px) {
  .roadmap-board--dense :is(.graph-help, .roadmap-edges) { display: none; }
  .roadmap-board--dense .list-help { display: block; }
  .roadmap-board--dense .roadmap-node-list { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
  .roadmap-board--dense .roadmap-node-list li { padding: 0; }
  .roadmap-board--dense .roadmap-node { width: 100%; height: auto; margin-block: 0; }
  .roadmap-board--dense .node-prerequisite-hint { position: static; width: auto; height: auto; clip-path: none; color: var(--vp-c-text-2); font-size: .77rem; }
}
</style>
