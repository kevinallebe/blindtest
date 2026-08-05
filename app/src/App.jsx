import Header from './components/Header.jsx'

function App() {
  return (
    <>
      <Header spotifyConnected={false} buzzerConnected={false} onInvite={() => {}} onSettings={() => {}} />
      <main className="cbt-placeholder">
        <p>Prochaine étape : connexion Spotify (Phase 1)</p>
      </main>
    </>
  )
}

export default App
