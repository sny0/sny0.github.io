import { computed, onMounted, onUnmounted, ref } from 'vue'
import roadmap from '../roadmap.mjs'

type RoadmapNode = (typeof roadmap.nodes)[number]

const storageKey = 'sny0-study:roadmap:v1'
export const checkKey = (nodeId: string, checkId: string) => nodeId + ':' + checkId
export const nodeById = new Map(roadmap.nodes.map(node => [node.id, node]))
const validCheckIds = new Set(roadmap.nodes.flatMap(node => node.checks.map(check => checkKey(node.id, check.id))))

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

export function useRoadmapProgress() {
  const completedChecks = ref(new Set<string>())
  const storageAvailable = ref(true)
  const completedCount = (node: RoadmapNode) =>
    node.checks.filter(check => completedChecks.value.has(checkKey(node.id, check.id))).length
  const isComplete = (node: RoadmapNode) => completedCount(node) === node.checks.length
  const completedNodeIds = computed(() => new Set(roadmap.nodes.filter(isComplete).map(node => node.id)))
  const trackCompleted = computed(() => new Map(roadmap.tracks.map(track => [
    track.id, track.nodeIds.filter(id => completedNodeIds.value.has(id)).length,
  ])))

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

  function setCheck(id: string, checked: boolean) {
    if (storageAvailable.value) loadProgress()
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
    loadProgress()
    window.addEventListener('storage', syncProgress)
  })
  onUnmounted(() => window.removeEventListener('storage', syncProgress))

  return { completedChecks, storageAvailable, completedCount, isComplete, completedNodeIds, trackCompleted, setCheck }
}
