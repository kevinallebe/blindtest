import './PlayerControls.css'

export default function PlayerControls({ onPlayNext, onTogglePause, canPlayNext, isRoundActive, isPaused }) {
  return (
    <div className="cbt-player-actions">
      <button type="button" className="cbt-btn cbt-player-btn--neutral" onClick={onPlayNext} disabled={!canPlayNext}>
        Nouvelle musique
      </button>
      {isRoundActive && (
        <button type="button" className="cbt-btn cbt-player-btn--primary" onClick={onTogglePause}>
          {isPaused ? 'Continuer' : 'Pause'}
        </button>
      )}
    </div>
  )
}
