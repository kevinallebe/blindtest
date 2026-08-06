import { getSpotifyClientId } from './services/adminConfig.js'

const CODE_VERIFIER_KEY = 'cbt_spotify_code_verifier'
const TOKEN_KEY = 'cbt_spotify_token'

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

export class SpotifyAuthError extends Error {
  constructor(code, message) {
    super(message ?? code)
    this.code = code
  }
}

function base64UrlEncode(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateCodeVerifier() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(64)))
}

export async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

export async function redirectToSpotifyAuthorize() {
  const clientId = getSpotifyClientId()
  if (!clientId) {
    throw new SpotifyAuthError('missing_client_id')
  }

  const verifier = generateCodeVerifier()
  sessionStorage.setItem(CODE_VERIFIER_KEY, verifier)
  const challenge = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem(CODE_VERIFIER_KEY)
  sessionStorage.removeItem(CODE_VERIFIER_KEY)

  const body = new URLSearchParams({
    client_id: getSpotifyClientId(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
    code_verifier: verifier ?? '',
  })

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    throw new SpotifyAuthError('invalid_token', `Échange du code échoué (${response.status})`)
  }

  const data = await response.json()
  storeToken(data)
  return getStoredToken()
}

// Forcé (indépendant de expires_at) — utilisé quand une requête renvoie 401 malgré un token
// qu'on pensait valide (révoqué côté Spotify, horloge décalée...).
export async function refreshAccessToken() {
  const current = getStoredToken()
  if (!current?.refresh_token) {
    throw new SpotifyAuthError('invalid_token', 'Aucun refresh token disponible')
  }

  const body = new URLSearchParams({
    client_id: getSpotifyClientId(),
    grant_type: 'refresh_token',
    refresh_token: current.refresh_token,
  })

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    clearToken()
    throw new SpotifyAuthError('invalid_token', `Refresh du token échoué (${response.status})`)
  }

  const data = await response.json()
  storeToken({ ...current, ...data })
  return getStoredToken()
}

function storeToken(data) {
  const previous = getStoredToken()
  const toStore = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? previous?.refresh_token ?? null,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(toStore))
}

export function getStoredToken() {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Marge de sécurité avant l'expiration réelle, pour ne jamais partir avec un token sur le point d'expirer
const EXPIRY_SAFETY_MARGIN_MS = 60_000

export async function getValidAccessToken() {
  const token = getStoredToken()
  if (!token) return null
  if (Date.now() < token.expires_at - EXPIRY_SAFETY_MARGIN_MS) {
    return token.access_token
  }
  const refreshed = await refreshAccessToken()
  return refreshed.access_token
}
