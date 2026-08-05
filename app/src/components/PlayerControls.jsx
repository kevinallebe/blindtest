import './PlayerControls.css'

export default function PlayerControls({ onPlayNext, onTogglePause, onReveal, canPlayNext, roundStage, isPaused }) {
  // Le bouton Pause/Continuer reste disponible après la révélation : les participants ont parfois
  // envie de continuer à écouter le morceau une fois la réponse annoncée.
  const showPauseToggle = roundStage === 'playing' || roundStage === 'paused' || roundStage === 'revealed'
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
