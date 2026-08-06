import { useState } from 'react'
import OverallScoresTab from './OverallScoresTab.jsx'
import PartyScoresTab from './PartyScoresTab.jsx'
import './ScoreBoardModal.css'

const TABS = [
  { id: 'party', label: 'Partie' },
  { id: 'overall', label: 'Général' },
]

// Epic 14 — même patron que SettingsModal.jsx (sidebar à onglets + carte de contenu, overlay
// cliquable pour fermer), réutilisé tel quel pour rester dans la même famille visuelle.
export default function ScoreBoardModal({ onClose, scores, buzz }) {
  const [activeTab, setActiveTab] = useState('party')

  return (
    <div className="cbt-scores-overlay" onClick={onClose}>
      <div className="cbt-scores-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="cbt-scores-card__close" onClick={onClose} aria-label="Fermer les scores">
          ✕
        </button>

        <aside className="cbt-scores-sidebar">
          <div className="cbt-scores-sidebar__title">Scores</div>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`cbt-scores-sidebar__nav-item ${
                activeTab === tab.id ? 'cbt-scores-sidebar__nav-item--active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="cbt-scores-content">
          {activeTab === 'party' ? (
            <PartyScoresTab scores={scores} buzz={buzz} />
          ) : (
            <OverallScoresTab overall={scores.overall} onReset={scores.resetOverall} />
          )}
        </div>
      </div>
    </div>
  )
}
