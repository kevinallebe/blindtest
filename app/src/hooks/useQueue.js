import { useCallback, useState } from 'react'
import { getPlaylists } from '../services/adminConfig.js'
import { getStoredCurrentIndex, getStoredQueue, persistQueueState } from '../services/storage.js'
import { fetchTracksForPlaylists } from '../services/spotify.js'
import { getValidAccessToken } from '../spotifyToken.js'
import { fisherYatesShuffle } from '../utils/shuffle.js'

function failedPlaylistsMessage(failedPlaylistIds) {
  return `${failedPlaylistIds.length} playlist(s) n'ont pas pu être chargées — souvent des playlists éditoriales Spotify (Filtr, Discover Weekly, RapCaviar...) qui restent inaccessibles via l'API même publiques. Utilise des playlists que tu as créées ou suivies toi-même. IDs concernés : ${failedPlaylistIds.join(', ')}`
}

export function useQueue() {
  const [queue, setQueue] = useState(() => getStoredQueue() ?? [])
  const [currentIndex, setCurrentIndex] = useState(() => getStoredCurrentIndex())
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [stats, setStats] = useState(null)

  const loadQueue = useCallback(async () => {
    setStatus('loading')
    setError(null)
    setWarning(null)

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
      const { tracks, duplicatesRemoved, failedPlaylistIds } = await fetchTracksForPlaylists(
        playlists.map((playlist) => playlist.id),
      )

      if (tracks.length === 0) {
        setStatus('error')
        setError(
          failedPlaylistIds.length > 0
            ? `Aucune playlist n'a pu être chargée. ${failedPlaylistsMessage(failedPlaylistIds)}`
            : 'Les playlists configurées ne contiennent aucun morceau.',
        )
        return
      }

      const shuffled = fisherYatesShuffle(tracks)
      persistQueueState(shuffled, 0)
      setQueue(shuffled)
      setCurrentIndex(0)
      setStats({ playlistCount: playlists.length, tracksLoaded: tracks.length, duplicatesRemoved, failedPlaylistIds })
      setStatus('ready')
      setWarning(failedPlaylistIds.length > 0 ? failedPlaylistsMessage(failedPlaylistIds) : null)
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
    warning,
    stats,
    loadQueue,
    advance,
  }
}
