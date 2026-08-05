import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameScreen } from './App.jsx'
import * as spotifyService from './services/spotify.js'
import { getValidAccessToken } from './spotifyToken.js'

vi.mock('./services/spotify.js')
vi.mock('./spotifyToken.js')

const trackA = { uri: 'spotify:track:a', name: 'A', artists: 'X', albumName: 'Alb A', coverUrl: 'https://img/a.jpg' }
const trackB = { uri: 'spotify:track:b', name: 'B', artists: 'Y', albumName: 'Alb B', coverUrl: 'https://img/b.jpg' }

function buildQueue(overrides = {}) {
  return {
    queue: [trackA],
    currentTrack: trackA,
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
    await act(async () => {
      onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
      await flushMicrotasks()
    })
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

  it('keeps showing the stage while still playing/revealing the last track (isFinished fires early)', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue()
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)

    const { rerender } = render(<GameScreen queue={queue} spotifyPlayer={spotifyPlayer} />)

    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })

    // Simule le re-render déclenché par useQueue une fois advance() appelé : comme c'était le
    // dernier morceau, isFinished passe à true et currentTrack devient null, alors que la manche
    // qu'on vient de lancer est toujours en cours.
    rerender(
      <GameScreen
        queue={buildQueue({ currentTrack: null, isFinished: true, advance: queue.advance, loadQueue: queue.loadQueue })}
        spotifyPlayer={spotifyPlayer}
      />,
    )

    expect(screen.queryByText('Tous les morceaux ont été joués.')).not.toBeInTheDocument()
    expect(screen.getByText(/Temps restant/)).toBeInTheDocument()
  })

  it('reveals the answer: stops the timer, pauses playback, and shows the track info', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue({ queue: [trackA, trackB], currentTrack: trackA })
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)

    const { rerender } = render(<GameScreen queue={queue} spotifyPlayer={spotifyPlayer} />)

    // Lance trackA
    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    await act(async () => {
      onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
      await flushMicrotasks()
    })
    act(() => vi.advanceTimersByTime(1000))

    // useQueue a avancé : currentTrack pointe maintenant vers trackB
    rerender(
      <GameScreen
        queue={buildQueue({ queue: [trackA, trackB], currentTrack: trackB, advance: queue.advance, loadQueue: queue.loadQueue })}
        spotifyPlayer={spotifyPlayer}
      />,
    )

    // Révèle la réponse de trackA, encore en train de jouer (pas de pause manuelle avant)
    fireEvent.click(screen.getByText('Révéler la réponse'))

    expect(spotifyPlayer.pause).toHaveBeenCalled()
    expect(screen.getByText('X — A')).toBeInTheDocument()
    expect(screen.getByText('Album : Alb A')).toBeInTheDocument()
    expect(screen.queryByText(/Temps restant/)).not.toBeInTheDocument()
    expect(screen.queryByText('Pause')).not.toBeInTheDocument()
    expect(screen.queryByText('Continuer')).not.toBeInTheDocument()

    // "Nouvelle musique" relance un PUT /play classique pour trackB, sans mécanisme de préchargement
    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    expect(spotifyService.playTrack).toHaveBeenNthCalledWith(2, 'token', 'device1', trackB.uri)
  })
})
