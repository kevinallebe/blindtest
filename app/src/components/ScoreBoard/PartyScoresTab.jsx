import { formatTeamName } from '../../services/scores.js'
import { formatPoints } from '../../utils/points.js'
import './PartyScoresTab.css'

// Epic 14/15/16 — vue individuelle + équipes de la partie en cours (screen 02). Le drag & drop de
// formation d'équipe (US-15.1) arrive dans un commit séparé, par-dessus cette structure statique.
export default function PartyScoresTab({ scores, buzz }) {
  const { party } = scores
  const teamedNames = new Set(party.teams.flatMap((team) => team.memberNames))
  const individuals = party.players.filter((player) => !teamedNames.has(player.name))

  return (
    <div className="cbt-party-tab">
      <div className="cbt-party-tab__header">
        <div className="cbt-party-tab__eyebrow">Partie en cours</div>
        <div className="cbt-party-tab__actions">
          <button type="button" className="cbt-pill-btn cbt-pill-btn--teal" onClick={() => buzz?.startJoin?.()}>
            Ouvrir les inscriptions
          </button>
          <button
            type="button"
            className="cbt-pill-btn cbt-pill-btn--neutral"
            onClick={scores.dissolveTeams}
            disabled={party.teams.length === 0}
          >
            <i className="bi bi-signpost-split" />
            Dissoudre les équipes
          </button>
        </div>
      </div>

      <div className="cbt-party-tab__list">
        {party.teams.map((team) => (
          <TeamCard key={team.id} team={team} players={party.players} onLeave={scores.leaveTeam} />
        ))}
        {individuals.map((player) => (
          <div key={player.name} className="cbt-party-row">
            <i className="bi bi-grip-vertical cbt-party-row__grip" />
            <div className="cbt-party-row__name">{player.name}</div>
            <div className="cbt-party-row__points">{formatPoints(player.points) ?? '0 pt'}</div>
          </div>
        ))}
        {party.players.length === 0 && (
          <p className="cbt-party-tab__empty">
            Aucun joueur pour l'instant — ouvre les inscriptions ou attends le premier buzz.
          </p>
        )}
      </div>

      <div className="cbt-party-tab__footer">Remis à zéro automatiquement au rechargement des playlists.</div>
    </div>
  )
}

function TeamCard({ team, players, onLeave }) {
  const members = team.memberNames.map((name) => players.find((player) => player.name === name)).filter(Boolean)
  const total = members.reduce((sum, member) => sum + member.points, 0)

  return (
    <div className="cbt-team-card">
      <div className="cbt-team-card__header">
        <i className="bi bi-grip-vertical" />
        <div className="cbt-team-card__name">{formatTeamName(team.memberNames)}</div>
        <div className="cbt-team-card__total">{formatPoints(total) ?? '0 pt'}</div>
      </div>
      <div className="cbt-team-card__members">
        {members.map((member) => (
          <div key={member.name} className="cbt-team-card__member">
            <div className="cbt-team-card__member-name">{member.name}</div>
            <div className="cbt-team-card__member-points">{formatPoints(member.points) ?? '0 pt'}</div>
            <button
              type="button"
              className="cbt-team-card__leave"
              onClick={() => onLeave(member.name)}
              aria-label={`${member.name} quitte l'équipe`}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
