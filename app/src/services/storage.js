// Phase 4 — persistance de la queue/currentIndex (US-5.2).
// Phase 8 unifiera ici le reste du schéma (timerDuration, settings) sous un versionnage commun.
const QUEUE_KEY = 'cbt_played_queue'
const CURRENT_INDEX_KEY = 'cbt_current_index'

export function getStoredQueue() {
  const raw = localStorage.getItem(QUEUE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function getStoredCurrentIndex() {
  const parsed = Number(localStorage.getItem(CURRENT_INDEX_KEY))
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

export function persistQueueState(queue, currentIndex) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  localStorage.setItem(CURRENT_INDEX_KEY, String(currentIndex))
}

export function clearQueueState() {
  localStorage.removeItem(QUEUE_KEY)
  localStorage.removeItem(CURRENT_INDEX_KEY)
}
