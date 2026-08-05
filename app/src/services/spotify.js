export async function fetchMe(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error(`spotify_me_failed_${response.status}`)
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

export async function fetchPlaylistTracks(accessToken, playlistId) {
  const tracks = []
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=${encodeURIComponent(TRACK_FIELDS)}&limit=100`

  while (url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) {
      throw new Error(`spotify_playlist_tracks_failed_${response.status}`)
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
export async function fetchTracksForPlaylists(accessToken, playlistIds) {
  const results = await Promise.allSettled(playlistIds.map((id) => fetchPlaylistTracks(accessToken, id)))

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

// Phase 5 — PUT /me/player/play, préchargement (US-6.4)
