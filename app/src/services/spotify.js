import { clearToken, getValidAccessToken, refreshAccessToken } from '../spotifyToken.js'

export class SpotifyApiError extends Error {
  constructor(code, message, status) {
    super(message ?? code)
    this.code = code
    this.status = status
  }
}

// Point d'entrée unique pour tous les appels à l'API Spotify : attache le token, retente une
// fois après un refresh forcé sur 401 (le token peut avoir été révoqué côté Spotify sans qu'on
// le sache), et convertit les échecs en erreurs typées que l'UI peut distinguer (Epic 12).
async function spotifyFetch(url, options = {}, { retryOn401 = true } = {}) {
  const token = await getValidAccessToken()
  if (!token) {
    throw new SpotifyApiError('reauth_required', 'Connecte-toi à Spotify pour continuer.')
  }

  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new SpotifyApiError('network_error', 'Erreur réseau — vérifie ta connexion internet.')
  }

  if (response.status === 401) {
    if (retryOn401) {
      try {
        await refreshAccessToken()
      } catch {
        clearToken()
        throw new SpotifyApiError('reauth_required', 'Ta session Spotify a expiré — reconnecte-toi.')
      }
      return spotifyFetch(url, options, { retryOn401: false })
    }
    clearToken()
    throw new SpotifyApiError('reauth_required', 'Ta session Spotify a expiré — reconnecte-toi.')
  }

  if (response.status === 403) {
    throw new SpotifyApiError(
      'forbidden',
      "Ton compte Spotify n'a pas les autorisations nécessaires pour cette action.",
      403,
    )
  }

  return response
}

export async function fetchMe() {
  const response = await spotifyFetch('https://api.spotify.com/v1/me')
  if (!response.ok) {
    throw new SpotifyApiError('http_error', `spotify_me_failed_${response.status}`, response.status)
  }
  return response.json()
}

const TRACK_FIELDS = 'items(track(uri,name,artists(name),album(name,images))),next'

function toTrack(track) {
  return {
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => artist.name).join(', '),
    albumName: track.album?.name ?? '',
    coverUrl: track.album?.images?.[0]?.url ?? null,
  }
}

export async function fetchPlaylistTracks(playlistId) {
  const tracks = []
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=${encodeURIComponent(TRACK_FIELDS)}&limit=100`

  while (url) {
    const response = await spotifyFetch(url)
    if (!response.ok) {
      throw new SpotifyApiError('http_error', `spotify_playlist_tracks_failed_${response.status}`, response.status)
    }
    const page = await response.json()
    for (const item of page.items) {
      if (item.track?.uri) tracks.push(toTrack(item.track))
    }
    url = page.next
  }

  return tracks
}

// Fusion de plusieurs listes de pistes (une par playlist) + dédoublonnage par URI (US-4.1/US-4.2).
// Pure et testable indépendamment du réseau : fetchTracksForPlaylists ne fait que l'orchestration réseau.
export function mergeAndDedupeTracks(trackLists) {
  const seen = new Set()
  const tracks = []
  let totalLoaded = 0

  for (const list of trackLists) {
    totalLoaded += list.length
    for (const track of list) {
      if (seen.has(track.uri)) continue
      seen.add(track.uri)
      tracks.push(track)
    }
  }

  return { tracks, totalLoaded, duplicatesRemoved: totalLoaded - tracks.length }
}

// Une playlist qui échoue (ex: playlist éditoriale Spotify comme Filtr/Discover Weekly, non
// accessible via l'API pour les apps tierces même publique) ne doit pas faire échouer les autres.
export async function fetchTracksForPlaylists(playlistIds) {
  const results = await Promise.allSettled(playlistIds.map((id) => fetchPlaylistTracks(id)))

  const trackLists = []
  const failedPlaylistIds = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      trackLists.push(result.value)
    } else {
      failedPlaylistIds.push(playlistIds[index])
    }
  })

  return { ...mergeAndDedupeTracks(trackLists), failedPlaylistIds }
}

// Le timer ne doit démarrer que si cet appel réussit (204) — voir US-6.1.
export async function playTrack(deviceId, uri) {
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    },
  )
  if (response.status === 404) {
    throw new SpotifyApiError('no_active_device', 'Aucun appareil Spotify actif — réessaie dans quelques secondes.', 404)
  }
  if (response.status !== 204) {
    throw new SpotifyApiError('http_error', `spotify_play_failed_${response.status}`, response.status)
  }
}
