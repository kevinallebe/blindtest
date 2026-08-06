import { useCallback, useState } from 'react'
import { getPlaylists } from '../services/adminConfig.js'
import { fetchTracksForPlaylists } from '../services/spotify.js'
import {
  addStoredPlayedTrackUri,
  clearStoredPlayedTrackUris,
  getStoredCurrentIndex,
  getStoredPlayedTrackUris,
  getStoredQueue,
  persistQueueState,
} from '../services/storage.js'
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
  const [authRequired, setAuthRequired] = useState(false)
  // Total de morceaux joués cette partie, tous chargements confondus — persiste à travers un
  // "Recharger les playlists" (contrairement à `queue`, entièrement remplacée à chaque chargement).
  const [playedCount, setPlayedCount] = useState(() => getStoredPlayedTrackUris().length)

  const loadQueue = useCallback(async () => {
    setStatus('loading')
    setError(null)
    setWarning(null)
    setAuthRequired(false)

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

      // Ne jamais rejouer un morceau déjà passé cette partie, y compris après un rechargement
      // (playlist modifiée, retry suite à un souci Spotify...).
      const playedUris = new Set(getStoredPlayedTrackUris())
      const unplayedTracks = tracks.filter((track) => !playedUris.has(track.uri))
      const playedExcluded = tracks.length - unplayedTracks.length

      if (unplayedTracks.length === 0) {
        setStatus('error')
        setError(
          'Tous les morceaux des playlists configurées ont déjà été joués pendant cette partie — ajoute de nouvelles playlists, ou réinitialise la partie (Scores > Partie) pour rejouer depuis le début.',
        )
        return
      }

      const shuffled = fisherYatesShuffle(unplayedTracks)
      persistQueueState(shuffled, 0)
      setQueue(shuffled)
      setCurrentIndex(0)
      setStats({
        playlistCount: playlists.length,
        tracksLoaded: unplayedTracks.length,
        duplicatesRemoved,
        failedPlaylistIds,
        playedExcluded,
      })
      setStatus('ready')
      setWarning(failedPlaylistIds.length > 0 ? failedPlaylistsMessage(failedPlaylistIds) : null)
    } catch (err) {
      console.error('[useQueue] loadQueue failed', err)
      setStatus('error')
      if (err.code === 'reauth_required') {
        setAuthRequired(true)
        setError('Ta session Spotify a expiré — reconnecte-toi.')
      } else {
        setError(`Le chargement des playlists a échoué (${err.message}). Réessaie.`)
      }
    }
  }, [])

  const advance = useCallback(() => {
    const playedTrack = queue[currentIndex]
    if (playedTrack?.uri) {
      setPlayedCount(addStoredPlayedTrackUri(playedTrack.uri).length)
    }
    const next = currentIndex + 1
    persistQueueState(queue, next)
    setCurrentIndex(next)
  }, [queue, currentIndex])

  // Action explicite uniquement (voir PartyScoresTab "Réinitialiser la partie") — jamais
  // automatique, pour ne pas perdre l'historique de lecture sur un simple rechargement.
  const clearPlayedTracks = useCallback(() => {
    clearStoredPlayedTrackUris()
    setPlayedCount(0)
  }, [])

  return {
    queue,
    currentIndex,
    currentTrack: queue[currentIndex] ?? null,
    isFinished: queue.length > 0 && currentIndex >= queue.length,
    status,
    error,
    warning,
    stats,
    authRequired,
    playedCount,
    loadQueue,
    advance,
    clearPlayedTracks,
  }
}
