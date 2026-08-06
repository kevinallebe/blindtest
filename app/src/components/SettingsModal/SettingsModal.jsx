import { useState } from 'react'
import AdminTab from './AdminTab.jsx'
import GameSettingsTab from './GameSettingsTab.jsx'
import './SettingsModal.css'

const TABS = [
  { id: 'game', label: 'Jeu' },
  { id: 'admin', label: 'Admin' },
]

export default function SettingsModal({ onClose, queue, settings }) {
  const [activeTab, setActiveTab] = useState('admin')

  return (
    <div className="cbt-settings-overlay" onClick={onClose}>
      <div className="cbt-settings-card" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="cbt-settings-card__close"
          onClick={onClose}
          aria-label="Fermer les réglages"
        >
          ✕
        </button>

        <aside className="cbt-settings-sidebar">
          <div className="cbt-settings-sidebar__title">Réglages</div>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`cbt-settings-sidebar__nav-item ${
                activeTab === tab.id ? 'cbt-settings-sidebar__nav-item--active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="cbt-settings-content">
          {activeTab === 'admin' ? <AdminTab queue={queue} /> : <GameSettingsTab settings={settings} />}
        </div>
      </div>
    </div>
  )
}
