import { formatPoints } from '../../utils/points.js'
import './OverallScoresTab.css'

const MEDAL = { 1: 'gold', 2: 'silver', 3: 'bronze' }

// Epic 14 — classement individuel qui persiste toute la soirée (screen 04). Pas de notion
// d'équipe ici (règle §7) ; seul le bouton dédié le remet à zéro.
export default function OverallScoresTab({ overall, onReset }) {
  const ranked = [...overall].sort((a, b) => b.points - a.points)

  function handleReset() {
    if (window.confirm('Réinitialiser le classement général ? Cette action est irréversible.')) {
      onReset()
    }
  }

  return (
    <div className="cbt-overall-tab">
      <div className="cbt-overall-tab__header">
        <div className="cbt-overall-tab__eyebrow">Classement général · soirée</div>
        <button
          type="button"
          className="cbt-pill-btn cbt-pill-btn--orange"
          onClick={handleReset}
          disabled={ranked.length === 0}
        >
          Réinitialiser le score général
        </button>
      </div>

      <div className="cbt-overall-tab__list">
        {ranked.length === 0 && <p className="cbt-overall-tab__empty">Personne n'a encore de points.</p>}
        {ranked.map((player, index) => {
          const rank = index + 1
          const medal = MEDAL[rank]
          return (
            <div key={player.name} className={`cbt-overall-row ${medal ? `cbt-overall-row--${medal}` : ''}`}>
              <div className={`cbt-overall-row__rank ${medal ? `cbt-overall-row__rank--${medal}` : ''}`}>{rank}</div>
              <div className="cbt-overall-row__name">{player.name}</div>
              <div className="cbt-overall-row__points">{formatPoints(player.points) ?? '0 pt'}</div>
            </div>
          )
        })}
      </div>

      <div className="cbt-overall-tab__footer">Ne se réinitialise jamais automatiquement — persiste sur toute la soirée.</div>
    </div>
  )
}
