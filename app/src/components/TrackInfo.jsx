import './TrackInfo.css'

export default function TrackInfo({ isActive, revealed, track }) {
  if (revealed && track) {
    return (
      <div className="cbt-track-reveal">
        <div className="cbt-track-cover cbt-track-cover--revealed">
          <div className="cbt-track-cover__ring cbt-track-cover__ring--revealed" />
          <div className="cbt-track-cover__inner cbt-track-cover__inner--revealed">
            {track.coverUrl && (
              <img className="cbt-track-cover__image" src={track.coverUrl} alt={`${track.artists} — ${track.name}`} />
            )}
          </div>
        </div>
        <div className="cbt-track-reveal__title">
          {track.artists} — {track.name}
        </div>
        {track.albumName && <div className="cbt-track-reveal__album">Album : {track.albumName}</div>}
      </div>
    )
  }

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
