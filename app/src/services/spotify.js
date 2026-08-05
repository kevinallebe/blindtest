export async function fetchMe(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error(`spotify_me_failed_${response.status}`)
  }
  return response.json()
}

// Phase 4/5 — GET /playlists/{id}/tracks, PUT /me/player/play, préchargement (US-6.4)
