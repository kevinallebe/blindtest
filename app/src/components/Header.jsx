import './Header.css'

export default function Header({
  spotifyConnected = false,
  buzzerConnected = false,
  onInvite,
  onScores,
  onSettings,
  title = 'Blindtest',
  initials = 'BT',
}) {
  return (
    <header className="cbt-header">
      <div className="cbt-header__brand">
        <div className="cbt-header__logo">
          <span>{initials}</span>
        </div>
        <div>
          <div className="cbt-header__title">{title}</div>
          <div className="cbt-header__subtitle">Soirée blindtest &middot; joué depuis Spotify</div>
        </div>
      </div>

      <div className="cbt-header__actions">
        <StatusPill label="Spotify" connected={spotifyConnected} />
        <StatusPill label="Buzzer" connected={buzzerConnected} />
        <button type="button" className="cbt-header-btn cbt-header-btn--invite" onClick={onInvite}>
          Inviter les joueurs
        </button>
        <button type="button" className="cbt-header-btn cbt-header-btn--scores" onClick={onScores}>
          <i className="bi bi-star-fill" />
          Scores
        </button>
        <button type="button" className="cbt-header-btn cbt-header-btn--settings" onClick={onSettings}>
          Réglages
        </button>
      </div>
    </header>
  )
}

function StatusPill({ label, connected }) {
  return (
    <div className={`cbt-pill ${connected ? 'cbt-pill--online' : 'cbt-pill--offline'}`}>
      <span className="cbt-pill__dot" />
      {label} {connected ? 'connecté' : 'non connecté'}
    </div>
  )
}
