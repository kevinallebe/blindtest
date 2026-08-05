import { useCallback, useState } from 'react'
import { getPlaylists } from '../services/adminConfig.js'
import { getStoredCurrentIndex, getStoredQueue, persistQueueState } from '../services/storage.js'
import { fetchTracksForPlaylists } from '../services/spotify.js'
import { getValidAccessToken } from '../spotifyToken.js'
import { fisherYatesShuffle } from '../utils/shuffle.js'

export function useQueue() {
  const [queue, setQueue] = useState(() => getStoredQueue() ?? [])
  const [currentIndex, setCurrentIndex] = useState(() => getStoredCurrentIndex())
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  const loadQueue = useCallback(async () => {
    setStatus('loading')
    setError(null)

    const playlists = getPlaylists()
    if (playlists.length === 0) {
      setStatus('error')
      setError('Aucune playlist configurée — ajoute-en depuis Réglages > Admin.')
      return
    }

    const token = await getValidAccessToken()
    if (!token) {
      setStatus('error')
      setError('Connecte-toi à Spotify avant de charger les playlists.')
      return
    }

    try {
      const { tracks, duplicatesRemoved } = await fetchTracksForPlaylists(
        token,
        playlists.map((playlist) => playlist.id),
      )
      const shuffled = fisherYatesShuffle(tracks)
      persistQueueState(shuffled, 0)
      setQueue(shuffled)
      setCurrentIndex(0)
      setStats({ playlistCount: playlists.length, tracksLoaded: tracks.length, duplicatesRemoved })
      setStatus('ready')
    } catch (err) {
      console.error('[useQueue] loadQueue failed', err)
      setStatus('error')
      setError(`Le chargement des playlists a échoué (${err.message}). Réessaie.`)
    }
  }, [])

  const advance = useCallback(() => {
    setCurrentIndex((index) => {
      const next = index + 1
      persistQueueState(queue, next)
      return next
    })
  }, [queue])

  return {
    queue,
    currentIndex,
    currentTrack: queue[currentIndex] ?? null,
    isFinished: queue.length > 0 && currentIndex >= queue.length,
    status,
    error,
    stats,
    loadQueue,
    advance,
  }
}
