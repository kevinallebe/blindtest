import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameScreen } from './App.jsx'
import * as spotifyService from './services/spotify.js'
import { getValidAccessToken } from './spotifyToken.js'

vi.mock('./services/spotify.js')
vi.mock('./spotifyToken.js')

function buildQueue(overrides = {}) {
  const track = { uri: 'spotify:track:a', name: 'A', artists: 'X' }
  return {
    queue: [track],
    currentTrack: track,
    isFinished: false,
    status: 'idle',
    error: null,
    loadQueue: vi.fn(),
    advance: vi.fn(),
    ...overrides,
  }
}

function buildSpotifyPlayer(onStateChangeHolder) {
  return {
    deviceId: 'device1',
    togglePlay: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    activateElement: vi.fn(),
    onPlaybackStateChanged: (callback) => {
      onStateChangeHolder.current = callback
      return vi.fn()
    },
  }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('GameScreen — playback/timer orchestration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    localStorage.setItem('cbt_timer_duration', '3')
    getValidAccessToken.mockResolvedValue('token')
    spotifyService.playTrack.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('resumes playback after the timer completes naturally, without re-triggering the auto-pause', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue()
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)

    render(<GameScreen queue={queue} spotifyPlayer={spotifyPlayer} />)

    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    expect(queue.advance).toHaveBeenCalledTimes(1)
    expect(spotifyPlayer.activateElement).toHaveBeenCalledTimes(1)

    // Confirme la lecture réelle (player_state_changed) -> déclenche le délai 1s puis le timer
    act(() => onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: 'spotify:track:a' } } }))
    act(() => vi.advanceTimersByTime(1000))

    // Laisse le timer de 3s (voir cbt_timer_duration ci-dessus) se terminer naturellement
    act(() => vi.advanceTimersByTime(3000))

    expect(spotifyPlayer.pause).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Continuer')).toBeInTheDocument()

    // Bug rapporté : cliquer "Continuer" après une fin de timer naturelle ne relançait pas la
    // lecture (le timer déjà à 0 se re-déclenchait immédiatement et re-coupait le son).
    fireEvent.click(screen.getByText('Continuer'))
    expect(spotifyPlayer.togglePlay).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(5000))
    expect(spotifyPlayer.pause).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Pause')).toBeInTheDocument()
  })
})
