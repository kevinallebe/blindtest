import { beforeEach, describe, expect, it } from 'vitest'
import {
  addMissingPlayers,
  bumpPlayerPoints,
  formatTeamName,
  getStoredOverallScores,
  getStoredPartyScores,
  leaveTeam,
  mergeIntoTeam,
  setStoredOverallScores,
  setStoredPartyScores,
} from './scores.js'

beforeEach(() => {
  localStorage.clear()
})

describe('overall scores persistence', () => {
  it('defaults to an empty list', () => {
    expect(getStoredOverallScores()).toEqual([])
  })

  it('round-trips a stored list', () => {
    const list = [{ name: 'Marie', points: 1.5 }]
    setStoredOverallScores(list)
    expect(getStoredOverallScores()).toEqual(list)
  })

  it('ignores corrupted JSON gracefully', () => {
    localStorage.setItem('cbt_scores_overall', '{not json')
    expect(getStoredOverallScores()).toEqual([])
  })
})

describe('party scores persistence', () => {
  it('defaults to empty players/teams', () => {
    expect(getStoredPartyScores()).toEqual({ players: [], teams: [] })
  })

  it('round-trips a stored party', () => {
    const party = { players: [{ name: 'Tom', points: 1 }], teams: [{ id: 't1', memberNames: ['Tom'] }] }
    setStoredPartyScores(party)
    expect(getStoredPartyScores()).toEqual(party)
  })

  it('falls back to empty on malformed shape', () => {
    localStorage.setItem('cbt_scores_party', JSON.stringify({ players: 'nope' }))
    expect(getStoredPartyScores()).toEqual({ players: [], teams: [] })
  })
})

describe('formatTeamName', () => {
  it('joins two names with "&"', () => {
    expect(formatTeamName(['Marie', 'Tom'])).toBe('Marie & Tom')
  })

  it('joins three or more names with commas and a final "&"', () => {
    expect(formatTeamName(['Marie', 'Tom', 'Léa'])).toBe('Marie, Tom & Léa')
  })

  it('returns the single name as-is', () => {
    expect(formatTeamName(['Marie'])).toBe('Marie')
  })
})

describe('addMissingPlayers', () => {
  it('adds new names at 0 pt and leaves existing entries untouched', () => {
    const players = [{ name: 'Kévin', points: 2 }]
    const next = addMissingPlayers(players, ['Kévin', 'Marie'])
    expect(next).toEqual([
      { name: 'Kévin', points: 2 },
      { name: 'Marie', points: 0 },
    ])
  })

  it('returns the same reference when nothing is missing', () => {
    const players = [{ name: 'Kévin', points: 2 }]
    expect(addMissingPlayers(players, ['Kévin'])).toBe(players)
  })
})

describe('bumpPlayerPoints', () => {
  it('increases an existing player points by delta', () => {
    const players = [{ name: 'Marie', points: 0.5 }]
    expect(bumpPlayerPoints(players, 'Marie', 0.5)).toEqual([{ name: 'Marie', points: 1 }])
  })

  it('creates the player if missing', () => {
    expect(bumpPlayerPoints([], 'Marie', 0.5)).toEqual([{ name: 'Marie', points: 0.5 }])
  })

  it('is a no-op for a zero delta', () => {
    const players = [{ name: 'Marie', points: 0.5 }]
    expect(bumpPlayerPoints(players, 'Marie', 0)).toBe(players)
  })
})

describe('mergeIntoTeam', () => {
  it('creates a new team when merging two individuals', () => {
    const teams = mergeIntoTeam([], 'Marie', { type: 'player', name: 'Tom' })
    expect(teams).toEqual([{ id: expect.any(String), memberNames: ['Tom', 'Marie'] }])
  })

  it('adds to an existing team when the target already belongs to one', () => {
    const teams = [{ id: 't1', memberNames: ['Tom'] }]
    const next = mergeIntoTeam(teams, 'Marie', { type: 'player', name: 'Tom' })
    expect(next).toEqual([{ id: 't1', memberNames: ['Tom', 'Marie'] }])
  })

  it('adds directly to a team dropped on by id', () => {
    const teams = [{ id: 't1', memberNames: ['Tom'] }]
    const next = mergeIntoTeam(teams, 'Marie', { type: 'team', teamId: 't1' })
    expect(next).toEqual([{ id: 't1', memberNames: ['Tom', 'Marie'] }])
  })

  it('removes the source from any prior team before re-merging', () => {
    const teams = [
      { id: 't1', memberNames: ['Marie', 'Léa'] },
      { id: 't2', memberNames: ['Tom'] },
    ]
    const next = mergeIntoTeam(teams, 'Marie', { type: 'team', teamId: 't2' })
    expect(next).toEqual([
      { id: 't1', memberNames: ['Léa'] },
      { id: 't2', memberNames: ['Tom', 'Marie'] },
    ])
  })
})

describe('leaveTeam', () => {
  it('removes the member and dissolves a team left with a single member', () => {
    const teams = [{ id: 't1', memberNames: ['Marie', 'Tom'] }]
    expect(leaveTeam(teams, 'Marie')).toEqual([])
  })

  it('keeps the team intact when it still has 2+ members after leaving', () => {
    const teams = [{ id: 't1', memberNames: ['Marie', 'Tom', 'Léa'] }]
    expect(leaveTeam(teams, 'Marie')).toEqual([{ id: 't1', memberNames: ['Tom', 'Léa'] }])
  })
})
