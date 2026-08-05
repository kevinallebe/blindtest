import { describe, expect, it } from 'vitest'
import { mergeAndDedupeTracks } from './spotify.js'

function track(uri) {
  return { uri, name: uri, artists: 'Artist', albumName: 'Album', coverUrl: null }
}

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
