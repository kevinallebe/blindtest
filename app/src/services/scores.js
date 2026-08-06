// Epic 13-16 — persistance des scoreboards Partie (reset au rechargement des playlists) et
// Général (persiste toute la soirée, reset manuel uniquement). Voir SPEC_SCORES.md §9.
const OVERALL_KEY = 'cbt_scores_overall'
const PARTY_KEY = 'cbt_scores_party'

const EMPTY_PARTY = { players: [], teams: [] }

export function getStoredOverallScores() {
  const raw = localStorage.getItem(OVERALL_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setStoredOverallScores(list) {
  localStorage.setItem(OVERALL_KEY, JSON.stringify(list))
}

export function getStoredPartyScores() {
  const raw = localStorage.getItem(PARTY_KEY)
  if (!raw) return EMPTY_PARTY
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.players) || !Array.isArray(parsed.teams)) return EMPTY_PARTY
    return parsed
  } catch {
    return EMPTY_PARTY
  }
}

export function setStoredPartyScores(party) {
  localStorage.setItem(PARTY_KEY, JSON.stringify(party))
}

// "Marie" / "Marie & Tom" / "Marie, Tom & Léa" — nom d'équipe auto-généré à partir des membres,
// pas de champ éditable dans le spec (US-15.1).
export function formatTeamName(memberNames) {
  if (memberNames.length <= 1) return memberNames[0] ?? ''
  if (memberNames.length === 2) return memberNames.join(' & ')
  return `${memberNames.slice(0, -1).join(', ')} & ${memberNames[memberNames.length - 1]}`
}

// Ajoute les noms pas encore présents, à 0 pt — filet de sécurité US-16.4 (buzz) et US-16.2
// (inscription) : pas de normalisation/dédoublonnage au-delà de l'égalité stricte (règle §7).
export function addMissingPlayers(players, names) {
  const existing = new Set(players.map((player) => player.name))
  const additions = names.filter((name) => !existing.has(name)).map((name) => ({ name, points: 0 }))
  return additions.length === 0 ? players : [...players, ...additions]
}

export function bumpPlayerPoints(players, name, delta) {
  if (delta === 0) return players
  const found = players.some((player) => player.name === name)
  if (!found) return [...players, { name, points: delta }]
  return players.map((player) => (player.name === name ? { ...player, points: player.points + delta } : player))
}

// Retire un joueur de toute équipe où il figurerait déjà, avant une nouvelle fusion (US-15.1) —
// une personne ne peut être que dans une seule équipe à la fois.
function withoutMember(teams, memberName) {
  return teams
    .map((team) => ({ ...team, memberNames: team.memberNames.filter((name) => name !== memberName) }))
    .filter((team) => team.memberNames.length > 0)
}

export function mergeIntoTeam(teams, sourceName, target) {
  const cleaned = withoutMember(teams, sourceName)

  if (target.type === 'team') {
    return cleaned.map((team) =>
      team.id === target.teamId ? { ...team, memberNames: [...team.memberNames, sourceName] } : team,
    )
  }

  const existingTeam = cleaned.find((team) => team.memberNames.includes(target.name))
  if (existingTeam) {
    return cleaned.map((team) =>
      team.id === existingTeam.id ? { ...team, memberNames: [...team.memberNames, sourceName] } : team,
    )
  }

  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `team-${Date.now()}`
  return [...cleaned, { id, memberNames: [target.name, sourceName] }]
}

// Une "équipe" d'1 seul membre restant n'a plus de sens — elle redevient un joueur individuel
// (US-15.2).
export function leaveTeam(teams, memberName) {
  return teams
    .map((team) =>
      team.memberNames.includes(memberName)
        ? { ...team, memberNames: team.memberNames.filter((name) => name !== memberName) }
        : team,
    )
    .filter((team) => team.memberNames.length >= 2)
}
