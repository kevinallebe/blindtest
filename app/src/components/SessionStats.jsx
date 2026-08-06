import './SessionStats.css'

const REVEAL_MODE_LABELS = { auto: 'Automatique', manual: 'Manuelle' }

export default function SessionStats({ stats, totalTracks, currentIndex, settings }) {
  const roundNumber = totalTracks > 0 ? Math.min(currentIndex + 1, totalTracks) : 0
  const progressPercent = totalTracks > 0 ? Math.round((roundNumber / totalTracks) * 100) : 0

  return (
    <div className="cbt-session-stats">
      <div>
        <div className="cbt-session-stats__title">Session</div>
        <div className="cbt-session-stats__rows">
          <StatRow label="Playlists chargées" value={stats?.playlistCount ?? '—'} />
          <StatRow label="Morceaux chargés" value={stats?.tracksLoaded ?? totalTracks} />
          <StatRow label="Doublons retirés" value={stats?.duplicatesRemoved ?? '—'} />
          <StatRow label="Déjà joués (exclus)" value={stats?.playedExcluded ?? '—'} />
        </div>
      </div>

      <div>
        <div className="cbt-session-stats__progress-header">
          <span>Progression de la manche</span>
          <span className="cbt-session-stats__progress-value">
            Manche {roundNumber} / {totalTracks}
          </span>
        </div>
        <div className="cbt-session-stats__progress-track">
          <div className="cbt-session-stats__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="cbt-session-stats__settings">
        <div className="cbt-session-stats__title">Réglages actifs</div>
        <div className="cbt-session-stats__rows">
          <StatRow label="Durée du timer" value={`${settings.timerDuration} s`} />
          <StatRow label="Timer de réponse" value={`${settings.answerTimerDuration} s`} />
          <StatRow label="Volume" value={`${settings.volume}%`} />
          <StatRow label="Révélation" value={REVEAL_MODE_LABELS[settings.revealMode] ?? 'Manuelle'} />
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="cbt-session-stats__row">
      <span>{label}</span>
      <span className="cbt-session-stats__value">{value}</span>
    </div>
  )
}
