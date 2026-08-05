import { useRef, useState } from 'react'
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

// UI transitoire (Phases 5-6) — le reste de l'écran (Session/Buzz) arrive Phases 7-9.
// Exporté (nommé) pour être testable isolément de useQueue/useSpotifyPlayer.
export function GameScreen({ queue, spotifyPlayer }) {
  const { queue: tracks, isFinished, status: queueStatus, error: queueError, loadQueue, advance, currentTrack } = queue
  const {
    deviceId,
    togglePlay,
    pause,
    resume,
    getVolume,
    setVolume,
    activateElement,
    onPlaybackStateChanged,
  } = spotifyPlayer

  const [duration, setDuration] = useState(() => getStoredTimerDuration())
  const timer = useTimer(duration)
  // idle -> playing -> paused (manuel ou fin de timer) -> revealed -> (Nouvelle musique) -> playing...
  const [roundStage, setRoundStage] = useState('idle')
  const [activeTrack, setActiveTrack] = useState(null)
  const [preloadedTrack, setPreloadedTrack] = useState(null)
  const [playbackError, setPlaybackError] = useState(null)
  // Suivi du préchargement en cours (hors état React, pour être lu de façon synchrone/fiable :
  // preloadedTrack via une closure figée ne reflèterait pas encore le résultat pendant l'attente).
  const inFlightPreloadRef = useRef({ uri: null, promise: null })

  function changeDuration(delta) {
    setDuration((current) => {
      const next = clampTimerDuration(current + delta)
      setStoredTimerDuration(next)
      return next
    })
  }

  async function handlePlayNext() {
    if (!currentTrack || !deviceId) return
    // Doit rester synchrone, avant tout `await`, pour compter comme le geste utilisateur qui
    // débloque l'audio du SDK (voir le commentaire sur activateElement dans useSpotifyPlayer.js).
    activateElement()
    setPlaybackError(null)
    const trackToPlay = currentTrack
    let usePreloaded = preloadedTrack?.uri === trackToPlay.uri

    // Un préchargement pour CE morceau est peut-être encore en train de se terminer (mise en
    // pause + restauration du volume) : on attend son issue réelle avant d'agir, plutôt que de
    // risquer une course où les deux séquences se marchent dessus (son coupé après coup, timer
    // démarré sans lecture réelle...).
    if (inFlightPreloadRef.current.uri === trackToPlay.uri && inFlightPreloadRef.current.promise) {
      const resolvedUri = await inFlightPreloadRef.current.promise
      usePreloaded = resolvedUri === trackToPlay.uri
    }
    inFlightPreloadRef.current = { uri: null, promise: null }

    try {
      if (usePreloaded) {
        await resume()
      } else {
        const token = await getValidAccessToken()
        await playTrack(token, deviceId, trackToPlay.uri)
      }
      setPreloadedTrack(null)
      setActiveTrack(trackToPlay)
      advance()
      setRoundStage('playing')

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

  async function handleReveal() {
    timer.stop()
    const wasPlaying = roundStage === 'playing'
    setRoundStage('revealed')
    pause()

    if (wasPlaying) {
      // On coupe un morceau qui jouait encore activement : ça déclenche un vrai changement
      // d'état côté SDK. On attend sa confirmation avant de démarrer le préchargement du
      // suivant, sinon les deux confirmations de pause (celle-ci et celle du préchargement)
      // peuvent se chevaucher et se faire confondre.
      try {
        await waitForPlaybackState(
          (state) => state?.paused === true && state?.track_window?.current_track?.uri === activeTrack?.uri,
          { timeoutMs: 4000 },
        )
      } catch {
        // Tant pis, on tente quand même le préchargement plutôt que de bloquer l'animateur.
      }
    }

    // currentTrack a déjà avancé au clic précédent sur "Nouvelle musique" : c'est bien le
    // prochain morceau à jouer qu'on précharge pendant que l'animateur commente la réponse.
    if (currentTrack) {
      inFlightPreloadRef.current = { uri: currentTrack.uri, promise: preloadNext(currentTrack) }
    }
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

  async function preloadNext(nextTrack) {
    if (!deviceId) return null
    let previousVolume = null
    let mustResumeMute = false
    try {
      previousVolume = await getVolume()
      await setVolume(0)
      mustResumeMute = true

      const token = await getValidAccessToken()
      await playTrack(token, deviceId, nextTrack.uri)
      // Certaines versions du SDK réappliquent le volume "device" au démarrage d'une nouvelle
      // lecture : on réaffirme le silence juste après le PUT /play, sans attendre la confirmation,
      // pour réduire au maximum la fenêtre où le son pourrait fuiter.
      await setVolume(0)

      await waitForPlaybackState(
        (state) => state?.paused === false && state?.track_window?.current_track?.uri === nextTrack.uri,
      )

      await pause()
      // N'attend PAS juste la résolution de la promesse pause() (une commande Connect peut être
      // acquittée avant d'être réellement appliquée) : on attend la confirmation réelle de l'état
      // "en pause" avant de remonter le volume, sinon le morceau suivant peut se remettre à jouer
      // à plein volume si la pause n'a en fait pas encore pris effet. On vérifie aussi l'URI pour
      // ne pas se faire piéger par une confirmation de pause tardive d'un tout autre morceau.
      await waitForPlaybackState(
        (state) => state?.paused === true && state?.track_window?.current_track?.uri === nextTrack.uri,
        { timeoutMs: 4000 },
      )

      setPreloadedTrack({ uri: nextTrack.uri })
      return nextTrack.uri
    } catch (err) {
      // Dégradation gracieuse : pas grave, "Nouvelle musique" retentera un PUT /play classique.
      console.error('[GameScreen] preloadNextTrack failed', err)
      setPreloadedTrack(null)
      if (mustResumeMute) {
        // Par sécurité, on force une pause avant de remonter le volume plus bas, même si l'étape
        // qui a échoué n'est pas celle qu'on attendait.
        try {
          await pause()
        } catch {
          // best-effort
        }
      }
      return null
    } finally {
      if (previousVolume !== null) {
        await setVolume(previousVolume)
      }
    }
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
          onTogglePause={handleTogglePause}
          onReveal={handleReveal}
          canPlayNext={!timer.isRunning && !isFinished}
          roundStage={roundStage}
        />
      )}
      {playbackError && <p className="cbt-auth-gate__error">{playbackError}</p>}
    </div>
  )
}

export default App
