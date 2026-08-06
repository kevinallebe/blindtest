import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, getValidAccessToken, refreshAccessToken } from '../spotifyToken.js'
import { fetchMe, fetchTracksForPlaylists, mergeAndDedupeTracks, playTrack, SpotifyApiError } from './spotify.js'

vi.mock('../spotifyToken.js')

function track(uri) {
  return { uri, name: uri, artists: 'Artist', albumName: 'Album', coverUrl: null }
}

function spotifyTrackItem(uri) {
  return { track: { uri, name: uri, artists: [{ name: 'Artist' }], album: { name: 'Album', images: [] } } }
}

beforeEach(() => {
  getValidAccessToken.mockResolvedValue('token')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('mergeAndDedupeTracks', () => {
  it('merges tracks from multiple playlists preserving first occurrence order', () => {
    const result = mergeAndDedupeTracks([
      [track('spotify:track:a'), track('spotify:track:b')],
      [track('spotify:track:c')],
    ])
    expect(result.tracks.map((t) => t.uri)).toEqual(['spotify:track:a', 'spotify:track:b', 'spotify:track:c'])
    expect(result.totalLoaded).toBe(3)
    expect(result.duplicatesRemoved).toBe(0)
  })

  it('removes duplicate uris across playlists, keeping the first occurrence', () => {
    const result = mergeAndDedupeTracks([
      [track('spotify:track:a'), track('spotify:track:b')],
      [track('spotify:track:b'), track('spotify:track:c')],
    ])
    expect(result.tracks.map((t) => t.uri)).toEqual(['spotify:track:a', 'spotify:track:b', 'spotify:track:c'])
    expect(result.totalLoaded).toBe(4)
    expect(result.duplicatesRemoved).toBe(1)
  })

  it('removes duplicate uris within the same playlist', () => {
    const result = mergeAndDedupeTracks([[track('spotify:track:a'), track('spotify:track:a')]])
    expect(result.tracks).toHaveLength(1)
    expect(result.duplicatesRemoved).toBe(1)
  })

  it('handles an empty input', () => {
    expect(mergeAndDedupeTracks([])).toEqual({ tracks: [], totalLoaded: 0, duplicatesRemoved: 0 })
  })
})

describe('fetchTracksForPlaylists', () => {
  it('keeps tracks from playlists that succeed and reports the ids of those that fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (url.includes('/playlists/good/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ items: [spotifyTrackItem('spotify:track:a')], next: null }),
          })
        }
        // Playlist éditoriale Spotify (ex: Filtr) : 404 même si publique et accessible dans l'app.
        return Promise.resolve({ ok: false, status: 404 })
      }),
    )

    const result = await fetchTracksForPlaylists(['good', 'editorial-blocked'])

    expect(result.tracks.map((t) => t.uri)).toEqual(['spotify:track:a'])
    expect(result.failedPlaylistIds).toEqual(['editorial-blocked'])
  })

  it('propagates a reauth_required error instead of treating it as a per-playlist failure', async () => {
    refreshAccessToken.mockRejectedValue(new Error('refresh failed'))
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 401 })),
    )

    await expect(fetchTracksForPlaylists(['a', 'b'])).rejects.toMatchObject({ code: 'reauth_required' })
  })
})

describe('playTrack', () => {
  it('resolves when Spotify confirms with 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204, ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(playTrack('device1', 'spotify:track:a')).resolves.toBeUndefined()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.spotify.com/v1/me/player/play?device_id=device1')
    expect(options.method).toBe('PUT')
    expect(options.headers.Authorization).toBe('Bearer token')
    expect(JSON.parse(options.body)).toEqual({ uris: ['spotify:track:a'] })
  })

  it('throws a distinct "no_active_device" error on a 404 (Epic 12)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }))

    await expect(playTrack('device1', 'spotify:track:a')).rejects.toMatchObject({ code: 'no_active_device' })
  })

  it('throws a generic http_error for any other unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500, ok: false }))

    await expect(playTrack('device1', 'spotify:track:a')).rejects.toMatchObject({ code: 'http_error', status: 500 })
  })
})

describe('spotifyFetch (via fetchMe) — Epic 12 error handling', () => {
  it('throws reauth_required without calling fetch when there is no valid token', async () => {
    getValidAccessToken.mockResolvedValue(null)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMe()).rejects.toMatchObject({ code: 'reauth_required' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retries once after a forced refresh on a 401, and succeeds if the retry works', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-token' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true, json: () => Promise.resolve({ product: 'premium' }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMe()).resolves.toEqual({ product: 'premium' })
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clears the token and throws reauth_required if the refresh itself fails', async () => {
    refreshAccessToken.mockRejectedValue(new Error('refresh_token invalid'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false }))

    await expect(fetchMe()).rejects.toMatchObject({ code: 'reauth_required' })
    expect(clearToken).toHaveBeenCalled()
  })

  it('clears the token and throws reauth_required if the retried request also 401s', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'still-bad' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false }))

    await expect(fetchMe()).rejects.toMatchObject({ code: 'reauth_required' })
    expect(clearToken).toHaveBeenCalled()
  })

  it('throws a distinct forbidden error on a 403, falling back to a generic message when the body has no detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 403, ok: false }))

    await expect(fetchMe()).rejects.toMatchObject({
      code: 'forbidden',
      status: 403,
      reason: null,
      message: "Ton compte Spotify n'a pas les autorisations nécessaires pour cette action.",
    })
  })

  it('surfaces the message/reason Spotify sends in a 403 response body, when present', async () => {
    // Cause fréquente pour une app Spotify perso : encore en "Development Mode", avec le compte
    // connecté absent de la liste des utilisateurs autorisés du tableau de bord développeur.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
        json: () =>
          Promise.resolve({ error: { status: 403, message: 'Player command failed: Restricted device', reason: 'PREMIUM_REQUIRED' } }),
      }),
    )

    await expect(fetchMe()).rejects.toMatchObject({
      code: 'forbidden',
      reason: 'PREMIUM_REQUIRED',
      message: "Spotify a refusé l'action (Player command failed: Restricted device — PREMIUM_REQUIRED).",
    })
  })

  it('throws a distinct network_error when fetch itself fails (offline)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Failed to fetch'))),
    )

    await expect(fetchMe()).rejects.toMatchObject({ code: 'network_error' })
  })

  it('SpotifyApiError instances carry a code, an optional status, and an optional reason', () => {
    const err = new SpotifyApiError('http_error', 'boom', 500)
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe('http_error')
    expect(err.status).toBe(500)
    expect(err.message).toBe('boom')
    expect(err.reason).toBeNull()

    const withReason = new SpotifyApiError('forbidden', 'nope', 403, 'PREMIUM_REQUIRED')
    expect(withReason.reason).toBe('PREMIUM_REQUIRED')
  })
})
