import './PlayerControls.css'

export default function PlayerControls({ onPlayNext, onTogglePause, onReveal, canPlayNext, roundStage }) {
  const isPaused = roundStage === 'paused'
  const showPauseToggle = roundStage === 'playing' || roundStage === 'paused'
  const canReveal = roundStage === 'playing' || roundStage === 'paused'

  return (
    <div className="cbt-player-actions">
      <button type="button" className="cbt-btn cbt-player-btn--neutral" onClick={onPlayNext} disabled={!canPlayNext}>
        Nouvelle musique
      </button>
      {showPauseToggle && (
        <button type="button" className="cbt-btn cbt-player-btn--primary" onClick={onTogglePause}>
          {isPaused ? 'Continuer' : 'Pause'}
        </button>
      )}
      {canReveal && (
        <button type="button" className="cbt-btn cbt-player-btn--reveal" onClick={onReveal}>
          Révéler la réponse
        </button>
      )}
    </div>
  )
}
