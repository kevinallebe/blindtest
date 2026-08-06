// Phase 4 — persistance de la queue/currentIndex (US-5.2).
const QUEUE_KEY = 'cbt_played_queue'
const CURRENT_INDEX_KEY = 'cbt_current_index'
// URIs des morceaux déjà joués cette partie, indépendamment de la queue en cours — survit à un
// "Recharger les playlists" (contrairement à QUEUE_KEY, remplacé à chaque chargement) pour ne
// jamais rejouer un morceau déjà passé et garder la progression de la manche intacte.
const PLAYED_TRACK_URIS_KEY = 'cbt_played_track_uris'
const TIMER_DURATION_KEY = 'cbt_timer_duration'
const VOLUME_KEY = 'cbt_volume'
const REVEAL_MODE_KEY = 'cbt_reveal_mode'
const ANSWER_TIMER_DURATION_KEY = 'cbt_answer_timer_duration'
const DEFAULT_TIMER_DURATION = 20
const DEFAULT_VOLUME = 70
const DEFAULT_REVEAL_MODE = 'manual'
const DEFAULT_ANSWER_TIMER_DURATION = 5

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

export function getStoredPlayedTrackUris() {
  const raw = localStorage.getItem(PLAYED_TRACK_URIS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Retourne la liste à jour (idempotent — un URI déjà présent n'est pas dupliqué).
export function addStoredPlayedTrackUri(uri) {
  const current = getStoredPlayedTrackUris()
  if (current.includes(uri)) return current
  const next = [...current, uri]
  localStorage.setItem(PLAYED_TRACK_URIS_KEY, JSON.stringify(next))
  return next
}

export function clearStoredPlayedTrackUris() {
  localStorage.removeItem(PLAYED_TRACK_URIS_KEY)
}

export function getStoredTimerDuration() {
  const parsed = Number(localStorage.getItem(TIMER_DURATION_KEY))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMER_DURATION
}

export function setStoredTimerDuration(duration) {
  localStorage.setItem(TIMER_DURATION_KEY, String(duration))
}

export function getStoredVolume() {
  const raw = localStorage.getItem(VOLUME_KEY)
  if (raw === null) return DEFAULT_VOLUME
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : DEFAULT_VOLUME
}

export function setStoredVolume(volume) {
  localStorage.setItem(VOLUME_KEY, String(volume))
}

export function getStoredAnswerTimerDuration() {
  const parsed = Number(localStorage.getItem(ANSWER_TIMER_DURATION_KEY))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_ANSWER_TIMER_DURATION
}

export function setStoredAnswerTimerDuration(duration) {
  localStorage.setItem(ANSWER_TIMER_DURATION_KEY, String(duration))
}

export function getStoredRevealMode() {
  const stored = localStorage.getItem(REVEAL_MODE_KEY)
  return stored === 'auto' ? 'auto' : DEFAULT_REVEAL_MODE
}

export function setStoredRevealMode(mode) {
  localStorage.setItem(REVEAL_MODE_KEY, mode === 'auto' ? 'auto' : 'manual')
}
