import { useState } from 'react'
import Header from './components/Header.jsx'
import PlayerControls from './components/PlayerControls.jsx'
import QRCodeInvite from './components/QRCodeInvite.jsx'
import SettingsModal from './components/SettingsModal/SettingsModal.jsx'
import Timer from './components/Timer.jsx'
import TrackInfo from './components/TrackInfo.jsx'
import { useQueue } from './hooks/useQueue.js'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer.js'
import { clampTimerDuration, useTimer } from './hooks/useTimer.js'
import { playTrack } from './services/spotify.js'
import { getStoredTimerDuration, setStoredTimerDuration } from './services/storage.js'
import { getValidAccessToken } from './spotifyToken.js'

function App() {
  const spotifyPlayer = useSpotifyPlayer()
  const { status, error, connect } = spotifyPlayer
  const queue = useQueue()
  const [showInvite, setShowInvite] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <Header
        spotifyConnected={status === 'ready'}
        buzzerConnected={false}
        onInvite={() => setShowInvite(true)}
        onSettings={() => setShowSettings(true)}
      />
      <main className="cbt-placeholder">
        <SpotifyAuthGate status={status} error={error} onConnect={connect} queue={queue} spotifyPlayer={spotifyPlayer} />
      </main>
      {showInvite && <QRCodeInvite onClose={() => setShowInvite(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} queue={queue} />}
    </>
  )
}

function SpotifyAuthGate({ status, error, onConnect, queue, spotifyPlayer }) {
  if (status === 'ready') {
    return <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} />
  }

  if (status === 'connecting') {
    return <p>Connexion à Spotify en cours…</p>
  }

  if (status === 'not_ready') {
    return <p>Le lecteur Spotify est hors ligne. Reconnexion en cours…</p>
  }

  if (status === 'error') {
    return (
      <div className="cbt-auth-gate">
        <p className="cbt-auth-gate__error">{error?.message}</p>
        <button type="button" className="cbt-btn cbt-btn--primary" onClick={onConnect}>
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="cbt-auth-gate">
      <p>Connecte-toi à Spotify Premium pour lancer le blindtest.</p>
      <button type="button" className="cbt-btn cbt-btn--primary" onClick={onConnect}>
        Se connecter à Spotify
      </button>
    </div>
  )
}

// UI transitoire (Phase 5) — le reste de l'écran (Session/Buzz/Révélation) arrive Phases 6-9.
function GameScreen({ queue, spotifyPlayer }) {
  const { queue: tracks, isFinished, status: queueStatus, error: queueError, loadQueue, advance, currentTrack } = queue
  const { deviceId, togglePlay, pause, onPlaybackStateChanged } = spotifyPlayer

  const [duration, setDuration] = useState(() => getStoredTimerDuration())
  const timer = useTimer(duration)
  const [isRoundActive, setIsRoundActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [playbackError, setPlaybackError] = useState(null)

  function changeDuration(delta) {
    setDuration((current) => {
      const next = clampTimerDuration(current + delta)
      setStoredTimerDuration(next)
      return next
    })
  }

  async function handlePlayNext() {
    if (!currentTrack || !deviceId) return
    setPlaybackError(null)
    const trackToPlay = currentTrack

    try {
      const token = await getValidAccessToken()
      await playTrack(token, deviceId, trackToPlay.uri)
      advance()
      setIsRoundActive(true)
      setIsPaused(false)

      const unsubscribe = onPlaybackStateChanged((state) => {
        if (state?.paused === false && state?.track_window?.current_track?.uri === trackToPlay.uri) {
          unsubscribe()
          setTimeout(() => {
            timer.start(() => {
              pause()
              setIsPaused(true)
            })
          }, 1000)
        }
      })
    } catch (err) {
      console.error('[GameScreen] playTrack failed', err)
      setPlaybackError("La lecture a échoué — vérifie qu'un appareil Spotify actif est disponible.")
    }
  }

  function handleTogglePause() {
    togglePlay()
    setIsPaused((wasPaused) => {
      if (wasPaused) {
        timer.resume()
      } else {
        timer.stop()
      }
      return !wasPaused
    })
  }

  if (tracks.length === 0) {
    return (
      <div className="cbt-auth-gate">
        <p>Charge les playlists configurées dans Réglages &gt; Admin pour démarrer la partie.</p>
        <button
          type="button"
          className="cbt-btn cbt-btn--primary"
          onClick={loadQueue}
          disabled={queueStatus === 'loading'}
        >
          {queueStatus === 'loading' ? 'Chargement…' : 'Charger les playlists'}
        </button>
        {queueStatus === 'error' && queueError && <p className="cbt-auth-gate__error">{queueError}</p>}
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="cbt-auth-gate">
        <p>Tous les morceaux ont été joués.</p>
        <button
          type="button"
          className="cbt-btn cbt-btn--primary"
          onClick={loadQueue}
          disabled={queueStatus === 'loading'}
        >
          {queueStatus === 'loading' ? 'Chargement…' : 'Recharger les playlists'}
        </button>
      </div>
    )
  }

  return (
    <div className="cbt-stage">
      <TrackInfo isActive={isRoundActive && !isPaused} />
      <Timer secondsLeft={timer.secondsLeft} duration={timer.duration} />

      <div className="cbt-stage__duration">
        <button type="button" onClick={() => changeDuration(-5)} disabled={timer.isRunning}>
          −
        </button>
        <span>Durée : {duration} s</span>
        <button type="button" onClick={() => changeDuration(5)} disabled={timer.isRunning}>
          +
        </button>
      </div>

      <PlayerControls
        onPlayNext={handlePlayNext}
        onTogglePause={handleTogglePause}
        canPlayNext={!timer.isRunning}
        isRoundActive={isRoundActive}
        isPaused={isPaused}
      />
      {playbackError && <p className="cbt-auth-gate__error">{playbackError}</p>}
    </div>
  )
}

export default App
