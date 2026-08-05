import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchTracksForPlaylists, mergeAndDedupeTracks, playTrack } from './spotify.js'

function track(uri) {
  return { uri, name: uri, artists: 'Artist', albumName: 'Album', coverUrl: null }
}

function spotifyTrackItem(uri) {
  return { track: { uri, name: uri, artists: [{ name: 'Artist' }], album: { name: 'Album', images: [] } } }
}

afterEach(() => {
  vi.unstubAllGlobals()
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
            json: () => Promise.resolve({ items: [spotifyTrackItem('spotify:track:a')], next: null }),
          })
        }
        // Playlist éditoriale Spotify (ex: Filtr) : 404 même si publique et accessible dans l'app.
        return Promise.resolve({ ok: false, status: 404 })
      }),
    )

    const result = await fetchTracksForPlaylists('token', ['good', 'editorial-blocked'])

    expect(result.tracks.map((t) => t.uri)).toEqual(['spotify:track:a'])
    expect(result.failedPlaylistIds).toEqual(['editorial-blocked'])
  })
})

describe('playTrack', () => {
  it('resolves when Spotify confirms with 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(playTrack('token', 'device1', 'spotify:track:a')).resolves.toBeUndefined()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.spotify.com/v1/me/player/play?device_id=device1')
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ uris: ['spotify:track:a'] })
  })

  it('throws when Spotify does not return 204 (e.g. no active device)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404 }))

    await expect(playTrack('token', 'device1', 'spotify:track:a')).rejects.toThrow('spotify_play_failed_404')
  })
})
