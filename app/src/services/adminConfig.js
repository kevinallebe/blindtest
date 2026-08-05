const CLIENT_ID_KEY = 'cbt_spotify_client_id'

export function getSpotifyClientId() {
  const stored = localStorage.getItem(CLIENT_ID_KEY)?.trim()
  return stored || import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
}

export function setSpotifyClientId(clientId) {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim())
}

// Phase 3 — get/set liste des playlists ({ id, url, name }[])
