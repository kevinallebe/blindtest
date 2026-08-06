import { extractPlaylistId } from '../utils/spotifyPlaylistParser.js'

const CLIENT_ID_KEY = 'cbt_spotify_client_id'
const PLAYLISTS_KEY = 'cbt_playlists'
const BLINDTEST_NAME_KEY = 'cbt_blindtest_name'
const BLINDTEST_INITIALS_KEY = 'cbt_blindtest_initials'
const DEFAULT_BLINDTEST_NAME = 'Blindtest'
const DEFAULT_BLINDTEST_INITIALS = 'BT'
const MAX_INITIALS_LENGTH = 2

export function getSpotifyClientId() {
  const stored = localStorage.getItem(CLIENT_ID_KEY)?.trim()
  return stored || import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
}

export function setSpotifyClientId(clientId) {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim())
}

// Affichés dans l'en-tête (titre + initiales dans le rond), personnalisables par groupe.
export function getBlindtestName() {
  const stored = localStorage.getItem(BLINDTEST_NAME_KEY)?.trim()
  return stored || DEFAULT_BLINDTEST_NAME
}

export function setBlindtestName(name) {
  localStorage.setItem(BLINDTEST_NAME_KEY, name.trim())
}

export function getBlindtestInitials() {
  const stored = localStorage.getItem(BLINDTEST_INITIALS_KEY)?.trim()
  return stored || DEFAULT_BLINDTEST_INITIALS
}

export function setBlindtestInitials(initials) {
  localStorage.setItem(BLINDTEST_INITIALS_KEY, initials.trim().toUpperCase().slice(0, MAX_INITIALS_LENGTH))
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
