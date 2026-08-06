import './GameSettingsTab.css'

export default function GameSettingsTab({ settings }) {
  const {
    timerDuration,
    setTimerDuration,
    volume,
    setVolume,
    revealMode,
    setRevealMode,
    answerTimerDuration,
    setAnswerTimerDuration,
  } = settings

  return (
    <div className="cbt-game-settings">
      <section>
        <h3 className="cbt-game-settings__label">Durée du timer</h3>
        <div className="cbt-game-settings__row">
          <input
            type="range"
            min={3}
            max={60}
            value={timerDuration}
            onChange={(event) => setTimerDuration(Number(event.target.value))}
          />
          <span className="cbt-game-settings__value">{timerDuration} s</span>
        </div>
      </section>

      <section>
        <h3 className="cbt-game-settings__label">Durée du timer de réponse</h3>
        <div className="cbt-game-settings__row">
          <input
            type="range"
            min={3}
            max={30}
            value={answerTimerDuration}
            onChange={(event) => setAnswerTimerDuration(Number(event.target.value))}
          />
          <span className="cbt-game-settings__value">{answerTimerDuration} s</span>
        </div>
        <p className="cbt-game-settings__hint">
          Démarre dès qu'un joueur buzze, pour le limiter dans le temps de réponse.
        </p>
      </section>

      <section>
        <h3 className="cbt-game-settings__label">Volume</h3>
        <div className="cbt-game-settings__row">
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
          <span className="cbt-game-settings__value">{volume}%</span>
        </div>
      </section>

      <section>
        <h3 className="cbt-game-settings__label">Mode de révélation</h3>
        <div className="cbt-game-settings__toggle">
          <button
            type="button"
            className={`cbt-game-settings__toggle-btn ${revealMode === 'manual' ? 'cbt-game-settings__toggle-btn--active' : ''}`}
            onClick={() => setRevealMode('manual')}
          >
            Manuelle
          </button>
          <button
            type="button"
            className={`cbt-game-settings__toggle-btn ${revealMode === 'auto' ? 'cbt-game-settings__toggle-btn--active' : ''}`}
            onClick={() => setRevealMode('auto')}
          >
            Automatique
          </button>
        </div>
        <p className="cbt-game-settings__hint">
          {revealMode === 'auto'
            ? "La réponse s'affiche automatiquement à la fin du timer."
            : 'Tu cliques sur "Révéler la réponse" quand tu veux.'}
        </p>
      </section>
    </div>
  )
}
