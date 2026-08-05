import { useState } from 'react'
import Header from './components/Header.jsx'
import QRCodeInvite from './components/QRCodeInvite.jsx'
import SettingsModal from './components/SettingsModal/SettingsModal.jsx'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer.js'

function App() {
  const { status, error, connect } = useSpotifyPlayer()
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
        <SpotifyAuthGate status={status} error={error} onConnect={connect} />
      </main>
      {showInvite && <QRCodeInvite onClose={() => setShowInvite(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

function SpotifyAuthGate({ status, error, onConnect }) {
  if (status === 'ready') {
    return <p>Connecté à Spotify ✅ — prochaine étape : playlists (Phase 3/4)</p>
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

export default App
