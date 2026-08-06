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
    setVolume: vi.fn(),
    activateElement: vi.fn(),
    reportAuthFailure: vi.fn(),
    onPlaybackStateChanged: (callback) => {
      onStateChangeHolder.current = callback
      return vi.fn()
    },
  }
}

function buildBuzz(overrides = {}) {
  return {
    connected: true,
    buzzes: [],
    joinedList: [],
    mode: 'round',
    startRound: vi.fn(),
    startJoin: vi.fn(),
    ...overrides,
  }
}

// Durée courte par défaut pour ne pas avoir à avancer les timers trop longtemps dans les tests.
function buildSettings(overrides = {}) {
  return {
    timerDuration: 3,
    setTimerDuration: vi.fn(),
    volume: 70,
    setVolume: vi.fn(),
    revealMode: 'manual',
    setRevealMode: vi.fn(),
    answerTimerDuration: 3,
    setAnswerTimerDuration: vi.fn(),
    ...overrides,
  }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('GameScreen — playback/timer orchestration', () => {
  let showToast

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    showToast = vi.fn()
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
    const buzz = buildBuzz()

    render(
      <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    expect(queue.advance).toHaveBeenCalledTimes(1)
    expect(spotifyPlayer.activateElement).toHaveBeenCalledTimes(1)
    // US-9.4 — chaque lancement de manche remet les buzz à zéro pour tous les joueurs
    expect(buzz.startRound).toHaveBeenCalledTimes(1)
    // Plus de token manuel : playTrack ne prend que (deviceId, uri) — voir services/spotify.js
    expect(spotifyService.playTrack).toHaveBeenCalledWith('device1', trackA.uri)

    // Confirme la lecture réelle (player_state_changed) -> déclenche le délai 1s puis le timer
    await act(async () => {
      onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
      await flushMicrotasks()
    })
    act(() => vi.advanceTimersByTime(1000))

    // Laisse le timer de 3s se terminer naturellement
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

  it('pauses the music automatically as soon as someone buzzes', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue()
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)

    const { rerender } = render(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buildBuzz()}
        settings={buildSettings()}
        showToast={showToast}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    await act(async () => {
      onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
      await flushMicrotasks()
    })
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('Pause')).toBeInTheDocument()

    // Un joueur buzze : le classement passe de vide à non-vide
    rerender(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buildBuzz({ buzzes: [{ name: 'Marie-Lou', reactionTime: 620 }] })}
        settings={buildSettings()}
        showToast={showToast}
      />,
    )

    expect(spotifyPlayer.pause).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Continuer')).toBeInTheDocument()

    // Un 2e buzz sur la même manche ne doit pas re-déclencher pause() une seconde fois
    rerender(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buildBuzz({
          buzzes: [
            { name: 'Marie-Lou', reactionTime: 620 },
            { name: 'Jonas', reactionTime: 910 },
          ],
        })}
        settings={buildSettings()}
        showToast={showToast}
      />,
    )
    expect(spotifyPlayer.pause).toHaveBeenCalledTimes(1)
  })

  it('starts an answer timer next to the first buzzer, turns red at zero, and clears it on reveal', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue()
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
    const buzz = buildBuzz()

    const { rerender } = render(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buzz}
        settings={buildSettings({ answerTimerDuration: 3 })}
        showToast={showToast}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    await act(async () => {
      onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
      await flushMicrotasks()
    })
    act(() => vi.advanceTimersByTime(1000))

    // Un joueur buzze : le timer de réponse démarre à côté de son nom
    rerender(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buildBuzz({ buzzes: [{ name: 'Marie-Lou', reactionTime: 620 }] })}
        settings={buildSettings({ answerTimerDuration: 3 })}
        showToast={showToast}
      />,
    )
    expect(screen.getByText('3s')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(3000))
    const badge = screen.getByText('0s')
    expect(badge.className).toContain('cbt-buzz-entry__answer-timer--elapsed')

    // Révéler la réponse efface le timer de réponse
    fireEvent.click(screen.getByText('Révéler la réponse'))
    expect(screen.queryByText('0s')).not.toBeInTheDocument()
  })

  it('keeps showing the stage while still playing/revealing the last track (isFinished fires early)', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue()
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
    const buzz = buildBuzz()

    const { rerender } = render(
      <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
    )

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
        buzz={buzz}
        settings={buildSettings()}
        showToast={showToast}
      />,
    )

    expect(screen.queryByText('Tous les morceaux ont été joués.')).not.toBeInTheDocument()
    expect(screen.getByText(/Temps restant/)).toBeInTheDocument()
  })

  it('reveals the answer: stops the timer, pauses playback, and shows the track info', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue({ queue: [trackA, trackB], currentTrack: trackA })
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
    const buzz = buildBuzz()

    const { rerender } = render(
      <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
    )

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
        buzz={buzz}
        settings={buildSettings()}
        showToast={showToast}
      />,
    )

    // Révèle la réponse de trackA, encore en train de jouer (pas de pause manuelle avant)
    fireEvent.click(screen.getByText('Révéler la réponse'))

    expect(spotifyPlayer.pause).toHaveBeenCalled()
    expect(screen.getByText('X — A')).toBeInTheDocument()
    expect(screen.getByText('Album : Alb A')).toBeInTheDocument()
    expect(screen.queryByText(/Temps restant/)).not.toBeInTheDocument()
    expect(screen.queryByText('Révéler la réponse')).not.toBeInTheDocument()

    // Le bouton Continuer reste disponible après la révélation, au cas où les participants
    // veulent continuer à écouter le morceau.
    expect(screen.getByText('Continuer')).toBeInTheDocument()
    const pauseCallsBeforeToggle = spotifyPlayer.togglePlay.mock.calls.length
    fireEvent.click(screen.getByText('Continuer'))
    expect(spotifyPlayer.togglePlay.mock.calls.length).toBe(pauseCallsBeforeToggle + 1)
    expect(screen.getByText('Pause')).toBeInTheDocument()

    // "Nouvelle musique" relance un PUT /play classique pour trackB, sans mécanisme de préchargement
    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    expect(spotifyService.playTrack).toHaveBeenNthCalledWith(2, 'device1', trackB.uri)
  })

  it('reveals automatically at the end of the timer when revealMode is "auto"', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue()
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
    const buzz = buildBuzz()

    render(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buzz}
        settings={buildSettings({ revealMode: 'auto' })}
        showToast={showToast}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Nouvelle musique'))
      await flushMicrotasks()
    })
    await act(async () => {
      onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
      await flushMicrotasks()
    })
    act(() => vi.advanceTimersByTime(1000))

    // Le timer de 3s se termine tout seul : la réponse doit s'afficher sans clic sur "Révéler"
    act(() => vi.advanceTimersByTime(3000))

    expect(screen.getByText('X — A')).toBeInTheDocument()
    expect(screen.queryByText('Révéler la réponse')).not.toBeInTheDocument()
  })

  it('applies the configured volume to the player and keeps it in sync live', async () => {
    const onStateChangeHolder = { current: null }
    const queue = buildQueue()
    const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
    const buzz = buildBuzz()

    const { rerender } = render(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buzz}
        settings={buildSettings({ volume: 70 })}
        showToast={showToast}
      />,
    )
    expect(spotifyPlayer.setVolume).toHaveBeenLastCalledWith(0.7)

    rerender(
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buzz}
        settings={buildSettings({ volume: 30 })}
        showToast={showToast}
      />,
    )
    expect(spotifyPlayer.setVolume).toHaveBeenLastCalledWith(0.3)
  })

  describe('error handling (Epic 12)', () => {
    it('sends the animateur back to the Spotify auth gate on a persistent 401 (reauth_required)', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      spotifyService.playTrack.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'reauth_required' }))

      render(
        <GameScreen
          queue={queue}
          spotifyPlayer={spotifyPlayer}
          buzz={buildBuzz()}
          settings={buildSettings()}
          showToast={showToast}
        />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })

      expect(spotifyPlayer.reportAuthFailure).toHaveBeenCalledTimes(1)
      expect(queue.advance).not.toHaveBeenCalled()
    })

    it('shows a toast for a generic network error instead of the inline error slot', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      spotifyService.playTrack.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'network_error' }))

      render(
        <GameScreen
          queue={queue}
          spotifyPlayer={spotifyPlayer}
          buzz={buildBuzz()}
          settings={buildSettings()}
          showToast={showToast}
        />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })

      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/réseau/i))
      expect(spotifyPlayer.reportAuthFailure).not.toHaveBeenCalled()
    })

    it('shows a specific message when no Spotify device is active', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      spotifyService.playTrack.mockRejectedValueOnce(Object.assign(new Error('404'), { code: 'no_active_device' }))

      render(
        <GameScreen
          queue={queue}
          spotifyPlayer={spotifyPlayer}
          buzz={buildBuzz()}
          settings={buildSettings()}
          showToast={showToast}
        />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })

      expect(screen.getByText(/Aucun appareil Spotify actif/)).toBeInTheDocument()
    })

    it('shows a specific message for a 403 (missing permissions)', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      spotifyService.playTrack.mockRejectedValueOnce(Object.assign(new Error('403'), { code: 'forbidden' }))

      render(
        <GameScreen
          queue={queue}
          spotifyPlayer={spotifyPlayer}
          buzz={buildBuzz()}
          settings={buildSettings()}
          showToast={showToast}
        />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })

      expect(screen.getByText(/autorisations nécessaires/)).toBeInTheDocument()
    })
  })

  describe('keyboard shortcuts (mode animateur)', () => {
    it('Space toggles play/pause during a round, same as clicking the button', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      const buzz = buildBuzz()

      render(
        <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })
      await act(async () => {
        onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
        await flushMicrotasks()
      })
      act(() => vi.advanceTimersByTime(1000))
      expect(screen.getByText('Pause')).toBeInTheDocument()

      fireEvent.keyDown(window, { key: ' ' })
      expect(spotifyPlayer.togglePlay).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Continuer')).toBeInTheDocument()
    })

    it('Enter launches a new track, same as clicking "Nouvelle musique"', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      const buzz = buildBuzz()

      render(
        <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
      )

      await act(async () => {
        fireEvent.keyDown(window, { key: 'Enter' })
        await flushMicrotasks()
      })

      expect(spotifyService.playTrack).toHaveBeenCalledWith('device1', trackA.uri)
      expect(buzz.startRound).toHaveBeenCalledTimes(1)
    })

    it('Enter does nothing while a round is still in progress (timer running)', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      const buzz = buildBuzz()

      render(
        <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })
      await act(async () => {
        onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
        await flushMicrotasks()
      })
      act(() => vi.advanceTimersByTime(1000))
      expect(spotifyService.playTrack).toHaveBeenCalledTimes(1)

      fireEvent.keyDown(window, { key: 'Enter' })
      expect(spotifyService.playTrack).toHaveBeenCalledTimes(1)
    })

    it('R reveals the answer, same as clicking "Révéler la réponse"', async () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      const buzz = buildBuzz()

      render(
        <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })
      await act(async () => {
        onStateChangeHolder.current({ paused: false, track_window: { current_track: { uri: trackA.uri } } })
        await flushMicrotasks()
      })
      act(() => vi.advanceTimersByTime(1000))

      fireEvent.keyDown(window, { key: 'r' })

      expect(spotifyPlayer.pause).toHaveBeenCalled()
      expect(screen.getByText('X — A')).toBeInTheDocument()
    })

    it('B resets the buzz list at any time, even before the first round starts', () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      const buzz = buildBuzz()

      render(
        <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} settings={buildSettings()} showToast={showToast} />,
      )

      fireEvent.keyDown(window, { key: 'b' })
      expect(buzz.startRound).toHaveBeenCalledTimes(1)
    })

    it('ignores shortcuts while the animateur is typing in a text field', () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      const buzz = buildBuzz()

      render(
        <>
          <input aria-label="Champ de saisie factice" />
          <GameScreen
            queue={queue}
            spotifyPlayer={spotifyPlayer}
            buzz={buzz}
            settings={buildSettings()}
            showToast={showToast}
          />
        </>,
      )

      fireEvent.keyDown(screen.getByLabelText('Champ de saisie factice'), { key: 'b' })

      expect(buzz.startRound).not.toHaveBeenCalled()
    })

    it('disables every shortcut while a modal is open (overlayOpen)', () => {
      const onStateChangeHolder = { current: null }
      const queue = buildQueue()
      const spotifyPlayer = buildSpotifyPlayer(onStateChangeHolder)
      const buzz = buildBuzz()

      render(
        <GameScreen
          queue={queue}
          spotifyPlayer={spotifyPlayer}
          buzz={buzz}
          settings={buildSettings()}
          showToast={showToast}
          overlayOpen
        />,
      )

      fireEvent.keyDown(window, { key: 'b' })
      fireEvent.keyDown(window, { key: 'Enter' })

      expect(buzz.startRound).not.toHaveBeenCalled()
      expect(spotifyService.playTrack).not.toHaveBeenCalled()
    })
  })

  describe('scores wiring (Epic 13/16)', () => {
    function buildScores(overrides = {}) {
      return {
        roundScores: {},
        toggleArtist: vi.fn(),
        toggleTitle: vi.fn(),
        toggleBoth: vi.fn(),
        resetRoundScores: vi.fn(),
        registerPlayers: vi.fn(),
        ...overrides,
      }
    }

    it('registers newly buzzed players on both scoreboards (US-16.4 safety net)', () => {
      const onStateChangeHolder = { current: null }
      const scores = buildScores()

      render(
        <GameScreen
          queue={buildQueue()}
          spotifyPlayer={buildSpotifyPlayer(onStateChangeHolder)}
          buzz={buildBuzz({ buzzes: [{ name: 'Marie-Lou', reactionTime: 620 }] })}
          settings={buildSettings()}
          scores={scores}
          showToast={showToast}
        />,
      )

      expect(scores.registerPlayers).toHaveBeenCalledWith(['Marie-Lou'])
    })

    it('registers players who joined via the Buzzer registration mode (US-16.2)', () => {
      const onStateChangeHolder = { current: null }
      const scores = buildScores()

      render(
        <GameScreen
          queue={buildQueue()}
          spotifyPlayer={buildSpotifyPlayer(onStateChangeHolder)}
          buzz={buildBuzz({ joinedList: [{ name: 'Nico' }] })}
          settings={buildSettings()}
          scores={scores}
          showToast={showToast}
        />,
      )

      expect(scores.registerPlayers).toHaveBeenCalledWith(['Nico'])
    })

    it('resets the round toggles whenever a new round starts (US-13.2)', async () => {
      const onStateChangeHolder = { current: null }
      const scores = buildScores()
      const buzz = buildBuzz()

      render(
        <GameScreen
          queue={buildQueue()}
          spotifyPlayer={buildSpotifyPlayer(onStateChangeHolder)}
          buzz={buzz}
          settings={buildSettings()}
          scores={scores}
          showToast={showToast}
        />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Nouvelle musique'))
        await flushMicrotasks()
      })
      expect(scores.resetRoundScores).toHaveBeenCalledTimes(1)

      fireEvent.keyDown(window, { key: 'b' })
      expect(buzz.startRound).toHaveBeenCalledTimes(2)
      expect(scores.resetRoundScores).toHaveBeenCalledTimes(2)
    })
  })
})
