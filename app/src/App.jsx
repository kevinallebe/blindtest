import { useEffect, useState } from 'react'
import BuzzList from './components/BuzzList.jsx'
import Header from './components/Header.jsx'
import PlayerControls from './components/PlayerControls.jsx'
import QRCodeInvite from './components/QRCodeInvite.jsx'
import SettingsModal from './components/SettingsModal/SettingsModal.jsx'
import Timer from './components/Timer.jsx'
import TrackInfo from './components/TrackInfo.jsx'
import { useBuzzSocket } from './hooks/useBuzzSocket.js'
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
  const buzz = useBuzzSocket()
  const [showInvite, setShowInvite] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <Header
        spotifyConnected={status === 'ready'}
        buzzerConnected={buzz.connected}
        onInvite={() => setShowInvite(true)}
        onSettings={() => setShowSettings(true)}
      />
      <main className="cbt-placeholder">
        <SpotifyAuthGate status={status} error={error} onConnect={connect} queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} />
      </main>
      {showInvite && <QRCodeInvite onClose={() => setShowInvite(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} queue={queue} />}
    </>
  )
}

function SpotifyAuthGate({ status, error, onConnect, queue, spotifyPlayer, buzz }) {
  if (status === 'ready') {
    return <GameScreen queue={queue} spotifyPlayer={spotifyPlayer} buzz={buzz} />
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

// UI transitoire (Phases 5-6) — le reste de l'écran (Session/Buzz) arrive Phases 7-9.
// Exporté (nommé) pour être testable isolément de useQueue/useSpotifyPlayer.
export function GameScreen({ queue, spotifyPlayer, buzz }) {
  const { queue: tracks, isFinished, status: queueStatus, error: queueError, loadQueue, advance, currentTrack } = queue
  const { deviceId, togglePlay, pause, activateElement, onPlaybackStateChanged } = spotifyPlayer

  const [duration, setDuration] = useState(() => getStoredTimerDuration())
  const timer = useTimer(duration)
  // idle -> playing -> paused (manuel ou fin de timer) -> revealed -> (Nouvelle musique) -> playing...
  const [roundStage, setRoundStage] = useState('idle')
  const [activeTrack, setActiveTrack] = useState(null)
  const [playbackError, setPlaybackError] = useState(null)
  // Après une révélation, la lecture est en pause par défaut mais reste contrôlable : certains
  // groupes veulent continuer à écouter le morceau une fois la réponse annoncée.
  const [isRevealedPlaying, setIsRevealedPlaying] = useState(false)

  // Dès qu'un joueur buzze pendant une manche en cours, on coupe le son pour que tout le monde
  // entende la réponse annoncée — ne se déclenche qu'une fois par manche (roundStage quitte
  // 'playing' au premier buzz, donc les buzz suivants du même classement ne re-déclenchent rien).
  useEffect(() => {
    if (buzz.buzzes.length === 0 || roundStage !== 'playing') return
    pause()
    timer.stop()
    setRoundStage('paused')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buzz.buzzes])

  function changeDuration(delta) {
    setDuration((current) => {
      const next = clampTimerDuration(current + delta)
      setStoredTimerDuration(next)
      return next
    })
  }

  function waitForPlaybackState(predicate, { timeoutMs = 8000 } = {}) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('playback_state_timeout')), timeoutMs)
      const unsubscribe = onPlaybackStateChanged((state) => {
        if (predicate(state)) {
          clearTimeout(timeoutId)
          unsubscribe()
          resolve(state)
        }
      })
    })
  }

  async function handlePlayNext() {
    if (!currentTrack || !deviceId) return
    // Doit rester synchrone, avant tout `await`, pour compter comme le geste utilisateur qui
    // débloque l'audio du SDK (voir le commentaire sur activateElement dans useSpotifyPlayer.js).
    activateElement()
    setPlaybackError(null)
    const trackToPlay = currentTrack

    try {
      const token = await getValidAccessToken()
      await playTrack(token, deviceId, trackToPlay.uri)
      setActiveTrack(trackToPlay)
      advance()
      setRoundStage('playing')
      // US-9.4 — remet les buzz à zéro côté serveur pour tous les joueurs au lancement de la manche.
      buzz.startRound()

      await waitForPlaybackState(
        (state) => state?.paused === false && state?.track_window?.current_track?.uri === trackToPlay.uri,
      )
      setTimeout(() => {
        timer.start(() => {
          pause()
          setRoundStage('paused')
        })
      }, 1000)
    } catch (err) {
      console.error('[GameScreen] playTrack failed', err)
      setPlaybackError("La lecture a échoué — vérifie qu'un appareil Spotify actif est disponible.")
    }
  }

  function handleTogglePause() {
    togglePlay()
    setRoundStage((current) => {
      if (current === 'paused') {
        // Le timer est peut-être déjà arrivé à 0 (fin naturelle) : dans ce cas on ne fait que
        // reprendre la lecture, sans relancer un compte à rebours déjà terminé (sinon onComplete
        // se redéclenche immédiatement au tick suivant).
        if (timer.secondsLeft > 0) timer.resume()
        return 'playing'
      }
      if (current === 'playing') {
        timer.stop()
        return 'paused'
      }
      return current
    })
  }

  function handleReveal() {
    timer.stop()
    pause()
    setIsRevealedPlaying(false)
    setRoundStage('revealed')
  }

  function handleToggleRevealedPlayback() {
    togglePlay()
    setIsRevealedPlaying((wasPlaying) => !wasPlaying)
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

  // La queue est épuisée dès le lancement du tout dernier morceau (currentIndex avance à ce
  // moment-là, pas à la fin de la manche) : si on est encore en train de le jouer/réviser, on
  // continue d'afficher la scène normale plutôt que d'écraser le timer/la révélation en cours.
  if (isFinished && roundStage === 'idle') {
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

  const isRevealed = roundStage === 'revealed'

  return (
    <div className="cbt-game-layout">
      <div className="cbt-stage">
        <TrackInfo isActive={roundStage === 'playing'} revealed={isRevealed} track={isRevealed ? activeTrack : null} />

        {!isRevealed && (
          <>
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
          </>
        )}

        {isFinished && isRevealed ? (
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
        ) : (
          <PlayerControls
            onPlayNext={handlePlayNext}
            onTogglePause={isRevealed ? handleToggleRevealedPlayback : handleTogglePause}
            onReveal={handleReveal}
            canPlayNext={!timer.isRunning && !isFinished}
            roundStage={roundStage}
            isPaused={isRevealed ? !isRevealedPlaying : roundStage === 'paused'}
          />
        )}
        {playbackError && <p className="cbt-auth-gate__error">{playbackError}</p>}
      </div>

      <BuzzList buzzes={buzz.buzzes} />
    </div>
  )
}

export default App
