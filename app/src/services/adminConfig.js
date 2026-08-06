import { extractPlaylistId } from '../utils/spotifyPlaylistParser.js'

const CLIENT_ID_KEY = 'cbt_spotify_client_id'
const PLAYLISTS_KEY = 'cbt_playlists'

export function getSpotifyClientId() {
  const stored = localStorage.getItem(CLIENT_ID_KEY)?.trim()
  return stored || import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
}

export function setSpotifyClientId(clientId) {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim())
}

export function getPlaylists() {
  const raw = localStorage.getItem(PLAYLISTS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistPlaylists(playlists) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists))
  return playlists
}

export function addPlaylist(url) {
  const id = extractPlaylistId(url)
  const current = getPlaylists()
  if (current.some((playlist) => playlist.id === id)) {
    throw new Error('Cette playlist est déjà dans la liste.')
  }
  return persistPlaylists([...current, { id, url: url.trim(), name: null }])
}

export function removePlaylist(id) {
  return persistPlaylists(getPlaylists().filter((playlist) => playlist.id !== id))
}

export function updatePlaylistName(id, name) {
  return persistPlaylists(
    getPlaylists().map((playlist) => (playlist.id === id ? { ...playlist, name } : playlist)),
  )
}
