import { useState } from 'react'
import Header from './components/Header.jsx'
import QRCodeInvite from './components/QRCodeInvite.jsx'
import SettingsModal from './components/SettingsModal/SettingsModal.jsx'
import { useQueue } from './hooks/useQueue.js'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer.js'

function App() {
  const { status, error, connect } = useSpotifyPlayer()
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
        <SpotifyAuthGate status={status} error={error} onConnect={connect} queue={queue} />
      </main>
      {showInvite && <QRCodeInvite onClose={() => setShowInvite(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} queue={queue} />}
    </>
  )
}

function SpotifyAuthGate({ status, error, onConnect, queue }) {
  if (status === 'ready') {
    return <QueuePanel queue={queue} />
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

// UI transitoire (Phase 4) — sera remplacée par l'écran principal (Session/Stage/Buzz)
// au fil des Phases 5-9 (PlayerControls, Timer, TrackInfo, BuzzList).
function QueuePanel({ queue }) {
  const { queue: tracks, currentIndex, currentTrack, isFinished, status: queueStatus, error: queueError, loadQueue, advance } = queue

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
    <div className="cbt-auth-gate">
      <p>
        Manche {currentIndex + 1} / {tracks.length} — {currentTrack.name} — {currentTrack.artists}
      </p>
      <button type="button" className="cbt-btn cbt-btn--primary" onClick={advance}>
        Nouvelle musique
      </button>
    </div>
  )
}

export default App
