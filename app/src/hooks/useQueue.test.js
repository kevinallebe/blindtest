import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminConfig from '../services/adminConfig.js'
import * as spotify from '../services/spotify.js'
import { getValidAccessToken } from '../spotifyToken.js'
import { useQueue } from './useQueue.js'

vi.mock('../services/adminConfig.js')
vi.mock('../services/spotify.js')
vi.mock('../spotifyToken.js')

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useQueue', () => {
  it('errors when no playlist is configured', async () => {
    adminConfig.getPlaylists.mockReturnValue([])

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toMatch(/Aucune playlist/)
  })

  it('errors when not connected to Spotify', async () => {
    adminConfig.getPlaylists.mockReturnValue([{ id: 'abc', url: 'x', name: null }])
    getValidAccessToken.mockResolvedValue(null)

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toMatch(/Connecte-toi/)
  })

  it('surfaces the underlying error message when the fetch fails', async () => {
    adminConfig.getPlaylists.mockReturnValue([{ id: 'abc', url: 'x', name: null }])
    getValidAccessToken.mockResolvedValue('token123')
    spotify.fetchTracksForPlaylists.mockRejectedValue(new Error('spotify_playlist_tracks_failed_403'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Le chargement des playlists a échoué (spotify_playlist_tracks_failed_403). Réessaie.')
  })

  it('flags authRequired when the session expired instead of blaming a playlist', async () => {
    adminConfig.getPlaylists.mockReturnValue([{ id: 'abc', url: 'x', name: null }])
    getValidAccessToken.mockResolvedValue('token123')
    const err = new Error('reauth')
    err.code = 'reauth_required'
    spotify.fetchTracksForPlaylists.mockRejectedValue(err)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.authRequired).toBe(true)
    expect(result.current.error).toMatch(/reconnecte-toi/)
  })

  it('loads, shuffles and persists the queue on success', async () => {
    adminConfig.getPlaylists.mockReturnValue([{ id: 'abc', url: 'x', name: null }])
    getValidAccessToken.mockResolvedValue('token123')
    spotify.fetchTracksForPlaylists.mockResolvedValue({
      tracks: [{ uri: 'a' }, { uri: 'b' }, { uri: 'c' }],
      totalLoaded: 4,
      duplicatesRemoved: 1,
      failedPlaylistIds: [],
    })

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.warning).toBeNull()
    expect(result.current.queue).toHaveLength(3)
    expect(result.current.stats).toEqual({ playlistCount: 1, tracksLoaded: 3, duplicatesRemoved: 1, failedPlaylistIds: [] })
    expect(result.current.currentIndex).toBe(0)
    expect(spotify.fetchTracksForPlaylists).toHaveBeenCalledWith(['abc'])
    expect(JSON.parse(localStorage.getItem('cbt_played_queue'))).toHaveLength(3)
  })

  it('warns but still loads when some playlists fail (e.g. editorial playlists)', async () => {
    adminConfig.getPlaylists.mockReturnValue([
      { id: 'good', url: 'x', name: null },
      { id: 'editorial', url: 'y', name: null },
    ])
    getValidAccessToken.mockResolvedValue('token123')
    spotify.fetchTracksForPlaylists.mockResolvedValue({
      tracks: [{ uri: 'a' }],
      totalLoaded: 1,
      duplicatesRemoved: 0,
      failedPlaylistIds: ['editorial'],
    })

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.queue).toHaveLength(1)
    expect(result.current.warning).toMatch(/editorial/)
  })

  it('errors when every playlist fails and nothing could be loaded', async () => {
    adminConfig.getPlaylists.mockReturnValue([{ id: 'editorial', url: 'y', name: null }])
    getValidAccessToken.mockResolvedValue('token123')
    spotify.fetchTracksForPlaylists.mockResolvedValue({
      tracks: [],
      totalLoaded: 0,
      duplicatesRemoved: 0,
      failedPlaylistIds: ['editorial'],
    })

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toMatch(/editorial/)
  })

  it('advance() increments currentIndex and marks the queue finished at the end', async () => {
    adminConfig.getPlaylists.mockReturnValue([{ id: 'abc', url: 'x', name: null }])
    getValidAccessToken.mockResolvedValue('token123')
    spotify.fetchTracksForPlaylists.mockResolvedValue({
      tracks: [{ uri: 'a' }, { uri: 'b' }],
      totalLoaded: 2,
      duplicatesRemoved: 0,
      failedPlaylistIds: [],
    })

    const { result } = renderHook(() => useQueue())
    await act(async () => {
      await result.current.loadQueue()
    })
    expect(result.current.isFinished).toBe(false)

    act(() => result.current.advance())
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.isFinished).toBe(false)

    act(() => result.current.advance())
    expect(result.current.currentIndex).toBe(2)
    expect(result.current.isFinished).toBe(true)
    expect(localStorage.getItem('cbt_current_index')).toBe('2')
  })

  it('hydrates the queue from localStorage on mount', () => {
    localStorage.setItem('cbt_played_queue', JSON.stringify([{ uri: 'a' }, { uri: 'b' }]))
    localStorage.setItem('cbt_current_index', '1')

    const { result } = renderHook(() => useQueue())

    expect(result.current.queue).toHaveLength(2)
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.currentTrack).toEqual({ uri: 'b' })
  })
})
