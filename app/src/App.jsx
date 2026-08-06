import { useEffect, useState } from 'react'
import BuzzList from './components/BuzzList.jsx'
import Header from './components/Header.jsx'
import PlayerControls from './components/PlayerControls.jsx'
import QRCodeInvite from './components/QRCodeInvite.jsx'
import ScoreBoardModal from './components/ScoreBoard/ScoreBoardModal.jsx'
import SessionStats from './components/SessionStats.jsx'
import SettingsModal from './components/SettingsModal/SettingsModal.jsx'
import Timer from './components/Timer.jsx'
import Toast from './components/Toast.jsx'
import TrackInfo from './components/TrackInfo.jsx'
import { useBrandingSettings } from './hooks/useBrandingSettings.js'
import { useBuzzSocket } from './hooks/useBuzzSocket.js'
import { useGameSettings } from './hooks/useGameSettings.js'
import { useQueue } from './hooks/useQueue.js'
import { useScores } from './hooks/useScores.js'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer.js'
import { useTimer } from './hooks/useTimer.js'
import { useToast } from './hooks/useToast.js'
import { playTrack } from './services/spotify.js'

// Scores no-op par défaut — App.jsx passe toujours le vrai hook ; ce fallback évite à chaque test
// de GameScreen (voir App.test.jsx) de devoir en construire un, comme pour les handlers de BuzzList.
const NOOP_SCORES = {
  roundScores: {},
  toggleArtist: () => {},
  toggleTitle: () => {},
  toggleBoth: () => {},
  resetRoundScores: () => {},
  registerPlayers: () => {},
}

// Ignore les raccourcis clavier quand l'animateur est en train de saisir du texte (ex. un ID de
// playlist dans Réglages > Admin), sans quoi "Entrée"/"R"/"B" interféreraient avec la saisie.
function isTypingTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function App() {
  const spotifyPlayer = useSpotifyPlayer()
  const { status, error, connect } = spotifyPlayer
  const queue = useQueue()
  const buzz = useBuzzSocket()
  const settings = useGameSettings()
  const branding = useBrandingSettings()
  const scores = useScores()
  const toast = useToast()
  const [showInvite, setShowInvite] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showScores, setShowScores] = useState(false)

  return (
    <>
      <Header
        spotifyConnected={status === 'ready'}
        buzzerConnected={buzz.connected}
        onInvite={() => setShowInvite(true)}
        onScores={() => setShowScores(true)}
        onSettings={() => setShowSettings(true)}
        title={branding.name}
        initials={branding.initials}
      />
      <main className="cbt-placeholder">
        <SpotifyAuthGate
          status={status}
          error={error}
          onConnect={connect}
          queue={queue}
          spotifyPlayer={spotifyPlayer}
          buzz={buzz}
          settings={settings}
          scores={scores}
          showToast={toast.showToast}
          overlayOpen={showInvite || showSettings || showScores}
        />
      </main>
      {showInvite && <QRCodeInvite onClose={() => setShowInvite(false)} />}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          queue={queue}
          settings={settings}
          branding={branding}
          spotify={spotifyPlayer}
        />
      )}
      {showScores && <ScoreBoardModal onClose={() => setShowScores(false)} scores={scores} buzz={buzz} />}
      <Toast message={toast.message} onDismiss={toast.dismissToast} />
    </>
  )
}

function SpotifyAuthGate({ status, error, onConnect, queue, spotifyPlayer, buzz, settings, scores, showToast, overlayOpen }) {
  if (status === 'ready') {
    return (
      <GameScreen
        queue={queue}
        spotifyPlayer={spotifyPlayer}
        buzz={buzz}
        settings={settings}
        scores={scores}
        showToast={showToast}
        overlayOpen={overlayOpen}
      />
    )
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
export function GameScreen({ queue, spotifyPlayer, buzz, settings, scores = NOOP_SCORES, showToast, overlayOpen = false }) {
  const {
    queue: tracks,
    currentIndex = 0,
    stats: queueStats = null,
    isFinished,
    status: queueStatus,
    error: queueError,
    authRequired: queueAuthRequired,
    loadQueue,
    advance,
    currentTrack,
  } = queue
  const { deviceId, togglePlay, pause, setVolume, activateElement, onPlaybackStateChanged, reportAuthFailure } =
    spotifyPlayer

  const timer = useTimer(settings.timerDuration)
  // Timer de réponse : démarre dès qu'un joueur buzze, pour le limiter dans le temps de réponse
  // (distinct du timer de manche `timer`, qui s'arrête au premier buzz).
  const answerTimer = useTimer(settings.answerTimerDuration)
  const [isAnswerTimerActive, setIsAnswerTimerActive] = useState(false)
  // idle -> playing -> paused (manuel ou fin de timer) -> revealed -> (Nouvelle musique) -> playing...
  const [roundStage, setRoundStage] = useState('idle')
  const [activeTrack, setActiveTrack] = useState(null)
  const [playbackError, setPlaybackError] = useState(null)
  // Après une révélation, la lecture est en pause par défaut mais reste contrôlable : certains
  // groupes veulent continuer à écouter le morceau une fois la réponse annoncée.
  const [isRevealedPlaying, setIsRevealedPlaying] = useState(false)

  const isRevealed = roundStage === 'revealed'
  const canPlayNext = !timer.isRunning && !isFinished
  const showPauseToggle = roundStage === 'playing' || roundStage === 'paused' || roundStage === 'revealed'
  const canReveal = roundStage === 'playing' || roundStage === 'paused'

  // Dès qu'un joueur buzze pendant une manche en cours, on coupe le son pour que tout le monde
  // entende la réponse annoncée — ne se déclenche qu'une fois par manche (roundStage quitte
  // 'playing' au premier buzz, donc les buzz suivants du même classement ne re-déclenchent rien).
  useEffect(() => {
    if (buzz.buzzes.length === 0 || roundStage !== 'playing') return
    pause()
    timer.stop()
    answerTimer.start()
    setIsAnswerTimerActive(true)
    setRoundStage('paused')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buzz.buzzes])

  // Filet de sécurité US-16.4 — un joueur qui buzze réellement sans être passé par
  // l'inscription apparaît quand même sur les deux scoreboards, à ce moment-là.
  useEffect(() => {
    if (buzz.buzzes.length === 0) return
    scores.registerPlayers(buzz.buzzes.map((buzzEntry) => buzzEntry.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buzz.buzzes])

  // US-16.2 — un joueur qui rejoint via le bouton "REJOINDRE" du Buzzer (mode inscription)
  // apparaît sur les deux scoreboards à 0 pt, sans attendre un vrai buzz.
  useEffect(() => {
    if (buzz.joinedList.length === 0) return
    scores.registerPlayers(buzz.joinedList.map((joined) => joined.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buzz.joinedList])

  // Réglages > Jeu peut changer le volume pendant une manche : on le répercute immédiatement sur
  // le lecteur, sans attendre le prochain morceau.
  useEffect(() => {
    setVolume(settings.volume / 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.volume])

  // Un chargement de playlists qui échoue à cause d'une session Spotify expirée (401 -> refresh
  // échoué) doit ramener l'animateur à l'écran de reconnexion, pas rester sur un message de queue.
  useEffect(() => {
    if (queueAuthRequired) reportAuthFailure()
  }, [queueAuthRequired, reportAuthFailure])

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
      await playTrack(deviceId, trackToPlay.uri)
      setActiveTrack(trackToPlay)
      advance()
      setRoundStage('playing')
      // US-9.4 — remet les buzz à zéro côté serveur pour tous les joueurs au lancement de la manche.
      buzz.startRound()
      // US-13.2 — les toggles de score de la manche précédente ne sont plus corrigeables une fois
      // une nouvelle musique lancée.
      scores.resetRoundScores()
      answerTimer.stop()
      setIsAnswerTimerActive(false)

      await waitForPlaybackState(
        (state) => state?.paused === false && state?.track_window?.current_track?.uri === trackToPlay.uri,
      )
      setTimeout(() => {
        timer.start(() => {
          // Mode automatique (Réglages > Jeu) : la réponse s'affiche directement à la fin du
          // timer, sans attendre un clic sur "Révéler la réponse".
          if (settings.revealMode === 'auto') {
            handleReveal()
          } else {
            pause()
            setRoundStage('paused')
          }
        })
      }, 1000)
    } catch (err) {
      console.error('[GameScreen] playTrack failed', err)
      // Epic 12 — distingue les cas plutôt qu'un message générique unique.
      if (err.code === 'reauth_required') {
        reportAuthFailure()
      } else if (err.code === 'network_error') {
        showToast('Erreur réseau — vérifie ta connexion internet et réessaie.')
      } else if (err.code === 'no_active_device') {
        setPlaybackError('Aucun appareil Spotify actif — réessaie dans quelques secondes.')
      } else if (err.code === 'forbidden') {
        // err.message porte la raison précise renvoyée par Spotify quand disponible (voir
        // SpotifyApiError) — bien plus utile pour diagnostiquer qu'un message générique fixe.
        setPlaybackError(err.message || "Ton compte Spotify n'a pas les autorisations nécessaires pour lancer la lecture.")
      } else {
        setPlaybackError("La lecture a échoué — vérifie qu'un appareil Spotify actif est disponible.")
      }
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
    answerTimer.stop()
    setIsAnswerTimerActive(false)
    pause()
    setIsRevealedPlaying(false)
    setRoundStage('revealed')
  }

  function handleToggleRevealedPlayback() {
    togglePlay()
    setIsRevealedPlaying((wasPlaying) => !wasPlaying)
  }

  // Mode animateur : raccourcis clavier pour ne pas devoir viser les boutons à la souris pendant
  // une soirée. Pas de tableau de dépendances : les gestionnaires ci-dessus sont redéfinis à
  // chaque rendu et doivent toujours capturer le roundStage/isRevealed le plus récent.
  useEffect(() => {
    function handleKeyDown(event) {
      if (overlayOpen || isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === ' ' || event.code === 'Space') {
        if (!showPauseToggle) return
        event.preventDefault()
        if (isRevealed) handleToggleRevealedPlayback()
        else handleTogglePause()
      } else if (event.key === 'Enter') {
        if (!canPlayNext) return
        event.preventDefault()
        handlePlayNext()
      } else if (event.key === 'r' || event.key === 'R') {
        if (!canReveal) return
        event.preventDefault()
        handleReveal()
      } else if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        buzz.startRound()
        scores.resetRoundScores()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

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

  return (
    <div className="cbt-game-layout">
      <SessionStats stats={queueStats} totalTracks={tracks.length} currentIndex={currentIndex} settings={settings} />

      <div className="cbt-stage">
        <TrackInfo isActive={roundStage === 'playing'} revealed={isRevealed} track={isRevealed ? activeTrack : null} />

        {!isRevealed && <Timer secondsLeft={timer.secondsLeft} duration={timer.duration} />}

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
            canPlayNext={canPlayNext}
            roundStage={roundStage}
            isPaused={isRevealed ? !isRevealedPlaying : roundStage === 'paused'}
          />
        )}
        {playbackError && <p className="cbt-auth-gate__error">{playbackError}</p>}
      </div>

      <BuzzList
        buzzes={buzz.buzzes}
        answerTimer={isAnswerTimerActive ? answerTimer : null}
        roundScores={scores.roundScores}
        onToggleArtist={scores.toggleArtist}
        onToggleTitle={scores.toggleTitle}
        onToggleBoth={scores.toggleBoth}
      />
    </div>
  )
}

export default App
