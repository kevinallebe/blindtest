import { useState } from 'react'
import { formatTeamName } from '../../services/scores.js'
import { formatPoints } from '../../utils/points.js'
import './PartyScoresTab.css'

// Epic 14/15/16 — vue individuelle + équipes de la partie en cours (screens 02/03). US-15.1 :
// glisser un joueur individuel sur un autre joueur (ou une équipe existante) fusionne les deux.
export default function PartyScoresTab({ scores, buzz }) {
  const { party } = scores
  const teamedNames = new Set(party.teams.flatMap((team) => team.memberNames))
  const individuals = party.players.filter((player) => !teamedNames.has(player.name))

  const [draggingName, setDraggingName] = useState(null)
  const [dropTargetKey, setDropTargetKey] = useState(null)

  function handleDragStart(name) {
    return (event) => {
      setDraggingName(name)
      event.dataTransfer?.setData('text/plain', name)
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    }
  }

  function handleDragEnd() {
    setDraggingName(null)
    setDropTargetKey(null)
  }

  function handleDragOver(key) {
    return (event) => {
      if (!draggingName || key === draggingName) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      setDropTargetKey(key)
    }
  }

  function handleDragLeave(key) {
    return () => setDropTargetKey((current) => (current === key ? null : current))
  }

  function handleDropOnPlayer(targetName) {
    return (event) => {
      event.preventDefault()
      if (draggingName && draggingName !== targetName) {
        scores.mergeIntoTeam(draggingName, { type: 'player', name: targetName })
      }
      handleDragEnd()
    }
  }

  function handleDropOnTeam(teamId) {
    return (event) => {
      event.preventDefault()
      if (draggingName) scores.mergeIntoTeam(draggingName, { type: 'team', teamId })
      handleDragEnd()
    }
  }

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
          <TeamCard
            key={team.id}
            team={team}
            players={party.players}
            onLeave={scores.leaveTeam}
            isDropTarget={dropTargetKey === team.id}
            onDragOver={handleDragOver(team.id)}
            onDragLeave={handleDragLeave(team.id)}
            onDrop={handleDropOnTeam(team.id)}
          />
        ))}
        {individuals.map((player) => (
          <div
            key={player.name}
            draggable
            onDragStart={handleDragStart(player.name)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver(player.name)}
            onDragLeave={handleDragLeave(player.name)}
            onDrop={handleDropOnPlayer(player.name)}
            className={`cbt-party-row ${draggingName === player.name ? 'cbt-party-row--ghost' : ''} ${
              dropTargetKey === player.name ? 'cbt-party-row--drop-target' : ''
            }`}
          >
            <i className="bi bi-grip-vertical cbt-party-row__grip" />
            <div className="cbt-party-row__name">{player.name}</div>
            {dropTargetKey === player.name ? (
              <div className="cbt-party-row__drop-label">Déposer pour fusionner</div>
            ) : (
              <div className="cbt-party-row__points">{formatPoints(player.points) ?? '0 pt'}</div>
            )}
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

function TeamCard({ team, players, onLeave, isDropTarget, onDragOver, onDragLeave, onDrop }) {
  const members = team.memberNames.map((name) => players.find((player) => player.name === name)).filter(Boolean)
  const total = members.reduce((sum, member) => sum + member.points, 0)

  return (
    <div
      className={`cbt-team-card ${isDropTarget ? 'cbt-team-card--drop-target' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="cbt-team-card__header">
        <i className="bi bi-grip-vertical" />
        <div className="cbt-team-card__name">{formatTeamName(team.memberNames)}</div>
        {isDropTarget ? (
          <div className="cbt-team-card__drop-label">Déposer pour fusionner</div>
        ) : (
          <div className="cbt-team-card__total">{formatPoints(total) ?? '0 pt'}</div>
        )}
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
