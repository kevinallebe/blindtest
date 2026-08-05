import './TrackInfo.css'

// L'état révélé (titre, artiste(s), pochette réelle — voir écran 2 du mockup) arrive en Phase 6.
export default function TrackInfo({ isActive }) {
  return (
    <div className="cbt-track-cover">
      <div className="cbt-track-cover__ring" />
      <div className="cbt-track-cover__inner">
        <div className={`cbt-track-eq ${isActive ? 'cbt-track-eq--active' : ''}`}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="cbt-track-cover__title">Extrait en cours</div>
        <div className="cbt-track-cover__subtitle">Réponse masquée</div>
      </div>
    </div>
  )
}
