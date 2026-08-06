import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMe } from '../services/spotify.js'
import {
  clearToken,
  exchangeCodeForToken,
  getValidAccessToken,
  redirectToSpotifyAuthorize,
  refreshAccessToken,
} from '../spotifyToken.js'
import { useSpotifyPlayer } from './useSpotifyPlayer.js'

vi.mock('../spotifyToken.js')
vi.mock('../services/spotify.js')

function installFakeSpotifySdk() {
  const instances = []
  class FakePlayer {
    constructor(options) {
      this.options = options
      this.listeners = {}
      this.connect = vi.fn().mockResolvedValue(true)
      this.disconnect = vi.fn()
      this.pause = vi.fn()
      this.togglePlay = vi.fn()
      this.setVolume = vi.fn()
      this.activateElement = vi.fn()
      this.addListener = vi.fn((event, cb) => {
        this.listeners[event] = cb
      })
      this.removeListener = vi.fn()
      instances.push(this)
    }
  }
  window.Spotify = { Player: FakePlayer }
  return instances
}

function setLocationSearch(search) {
  window.history.replaceState({}, '', `/${search}`)
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  setLocationSearch('')
  localStorage.clear()
})

afterEach(() => {
  delete window.Spotify
  delete window.onSpotifyWebPlaybackSDKReady
  vi.clearAllMocks()
})

describe('useSpotifyPlayer', () => {
  it('stays idle when there is no callback in the URL and no stored token', async () => {
    getValidAccessToken.mockResolvedValue(null)

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())

    expect(result.current.status).toBe('idle')
  })

  it('silently reconnects via the SDK when a valid token already exists (page refresh)', async () => {
    getValidAccessToken.mockResolvedValue('token123')
    const instances = installFakeSpotifySdk()

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())

    expect(instances).toHaveLength(1)
    act(() => instances[0].listeners.ready({ device_id: 'device1' }))

    expect(result.current.status).toBe('ready')
    expect(result.current.deviceId).toBe('device1')
  })

  it('handles a successful OAuth callback end to end (exchange -> premium check -> SDK connect)', async () => {
    setLocationSearch('?code=abc123')
    exchangeCodeForToken.mockResolvedValue({ access_token: 'tok' })
    fetchMe.mockResolvedValue({ product: 'premium' })
    const instances = installFakeSpotifySdk()

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())

    expect(exchangeCodeForToken).toHaveBeenCalledWith('abc123')
    // Le code doit être retiré de l'URL une fois consommé, sinon un refresh de page le rejouerait.
    expect(window.location.search).toBe('')
    expect(instances).toHaveLength(1)

    act(() => instances[0].listeners.ready({ device_id: 'deviceX' }))
    expect(result.current.status).toBe('ready')
  })

  it('rejects a non-Premium account after exchanging the code', async () => {
    setLocationSearch('?code=abc123')
    exchangeCodeForToken.mockResolvedValue({ access_token: 'tok' })
    fetchMe.mockResolvedValue({ product: 'free' })

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())

    expect(clearToken).toHaveBeenCalled()
    expect(result.current.status).toBe('error')
    expect(result.current.error.code).toBe('not_premium')
  })

  it('surfaces access_denied when the callback carries an error param', async () => {
    setLocationSearch('?error=access_denied')

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())

    expect(result.current.status).toBe('error')
    expect(result.current.error.code).toBe('access_denied')
  })

  it('reportAuthFailure() sends the animateur back to the auth gate with a clear message', async () => {
    getValidAccessToken.mockResolvedValue(null)

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())

    act(() => result.current.reportAuthFailure())

    expect(result.current.status).toBe('error')
    expect(result.current.error.code).toBe('invalid_token')
  })

  it('connect() triggers the PKCE redirect', async () => {
    getValidAccessToken.mockResolvedValue(null)
    redirectToSpotifyAuthorize.mockResolvedValue(undefined)

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())

    act(() => result.current.connect())

    expect(result.current.status).toBe('connecting')
    expect(redirectToSpotifyAuthorize).toHaveBeenCalledTimes(1)
  })

  it('reconnect() refreshes the token and re-initializes the player without redirecting', async () => {
    getValidAccessToken.mockResolvedValue('token123')
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-token' })
    const instances = installFakeSpotifySdk()

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())
    act(() => instances[0].listeners.ready({ device_id: 'device1' }))
    expect(result.current.status).toBe('ready')

    await act(async () => {
      result.current.reconnect()
      await flushMicrotasks()
    })

    // Un 403 SDK silencieux ne bascule pas toujours 'status' en 'error' : reconnect() doit forcer
    // un nouveau device plutôt que de réutiliser l'ancienne connexion cassée.
    expect(instances[0].disconnect).toHaveBeenCalledTimes(1)
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(redirectToSpotifyAuthorize).not.toHaveBeenCalled()
    expect(instances).toHaveLength(2)

    act(() => instances[1].listeners.ready({ device_id: 'device2' }))
    expect(result.current.status).toBe('ready')
    expect(result.current.deviceId).toBe('device2')
  })

  it('reconnect() falls back to the auth gate when the refresh token was revoked', async () => {
    getValidAccessToken.mockResolvedValue('token123')
    refreshAccessToken.mockRejectedValue(Object.assign(new Error('nope'), { code: 'invalid_token' }))
    const instances = installFakeSpotifySdk()

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())
    act(() => instances[0].listeners.ready({ device_id: 'device1' }))

    await act(async () => {
      result.current.reconnect()
      await flushMicrotasks()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error.code).toBe('invalid_token')
  })

  it('delegates playback controls to the underlying SDK player once ready', async () => {
    getValidAccessToken.mockResolvedValue('token123')
    const instances = installFakeSpotifySdk()

    const { result } = renderHook(() => useSpotifyPlayer())
    await act(async () => flushMicrotasks())
    act(() => instances[0].listeners.ready({ device_id: 'device1' }))

    act(() => result.current.pause())
    act(() => result.current.togglePlay())
    act(() => result.current.setVolume(0.5))
    act(() => result.current.activateElement())

    expect(instances[0].pause).toHaveBeenCalledTimes(1)
    expect(instances[0].togglePlay).toHaveBeenCalledTimes(1)
    expect(instances[0].setVolume).toHaveBeenCalledWith(0.5)
    expect(instances[0].activateElement).toHaveBeenCalledTimes(1)
  })
})
