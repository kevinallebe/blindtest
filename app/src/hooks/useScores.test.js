import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useScores } from './useScores.js'

beforeEach(() => {
  localStorage.clear()
})

describe('useScores', () => {
  it('registers new players at 0 pt on both boards, without duplicating existing ones', () => {
    const { result } = renderHook(() => useScores())

    act(() => result.current.registerPlayers(['Kévin', 'Marie']))
    expect(result.current.party.players).toEqual([
      { name: 'Kévin', points: 0 },
      { name: 'Marie', points: 0 },
    ])
    expect(result.current.overall).toEqual([
      { name: 'Kévin', points: 0 },
      { name: 'Marie', points: 0 },
    ])

    act(() => result.current.registerPlayers(['Kévin']))
    expect(result.current.party.players).toHaveLength(2)
  })

  it('toggling artist then title converges to the same state as toggling "les deux" directly', () => {
    const { result: separate } = renderHook(() => useScores())
    act(() => separate.current.registerPlayers(['Marie']))
    act(() => separate.current.toggleArtist('Marie'))
    act(() => separate.current.toggleTitle('Marie'))

    const { result: shortcut } = renderHook(() => useScores())
    act(() => shortcut.current.registerPlayers(['Tom']))
    act(() => shortcut.current.toggleBoth('Tom'))

    expect(separate.current.roundScores['Marie']).toEqual({ artist: true, title: true })
    expect(shortcut.current.roundScores['Tom']).toEqual({ artist: true, title: true })
    expect(separate.current.party.players.find((p) => p.name === 'Marie').points).toBe(1)
    expect(shortcut.current.party.players.find((p) => p.name === 'Tom').points).toBe(1)
  })

  it('is fully reversible — re-clicking a toggle removes the point again', () => {
    const { result } = renderHook(() => useScores())
    act(() => result.current.registerPlayers(['Marie']))

    act(() => result.current.toggleArtist('Marie'))
    expect(result.current.overall.find((p) => p.name === 'Marie').points).toBe(0.5)

    act(() => result.current.toggleArtist('Marie'))
    expect(result.current.overall.find((p) => p.name === 'Marie').points).toBe(0)
  })

  it('"les deux" toggled off removes both points at once', () => {
    const { result } = renderHook(() => useScores())
    act(() => result.current.registerPlayers(['Tom']))
    act(() => result.current.toggleBoth('Tom'))
    expect(result.current.party.players.find((p) => p.name === 'Tom').points).toBe(1)

    act(() => result.current.toggleBoth('Tom'))
    expect(result.current.party.players.find((p) => p.name === 'Tom').points).toBe(0)
    expect(result.current.roundScores['Tom']).toEqual({ artist: false, title: false })
  })

  it('resetRoundScores clears the ephemeral round toggle map without touching totals', () => {
    const { result } = renderHook(() => useScores())
    act(() => result.current.registerPlayers(['Marie']))
    act(() => result.current.toggleArtist('Marie'))

    act(() => result.current.resetRoundScores())
    expect(result.current.roundScores).toEqual({})
    expect(result.current.party.players.find((p) => p.name === 'Marie').points).toBe(0.5)
  })

  it('forms, extends and dissolves teams', () => {
    const { result } = renderHook(() => useScores())
    act(() => result.current.registerPlayers(['Marie', 'Tom', 'Léa']))

    act(() => result.current.mergeIntoTeam('Marie', { type: 'player', name: 'Tom' }))
    expect(result.current.party.teams).toEqual([{ id: expect.any(String), memberNames: ['Tom', 'Marie'] }])

    const teamId = result.current.party.teams[0].id
    act(() => result.current.mergeIntoTeam('Léa', { type: 'team', teamId }))
    expect(result.current.party.teams[0].memberNames).toEqual(['Tom', 'Marie', 'Léa'])

    act(() => result.current.leaveTeam('Léa'))
    expect(result.current.party.teams[0].memberNames).toEqual(['Tom', 'Marie'])

    act(() => result.current.dissolveTeams())
    expect(result.current.party.teams).toEqual([])
  })

  it('resetParty empties players and teams but leaves overall untouched', () => {
    const { result } = renderHook(() => useScores())
    act(() => result.current.registerPlayers(['Marie']))
    act(() => result.current.toggleArtist('Marie'))

    act(() => result.current.resetParty())
    expect(result.current.party).toEqual({ players: [], teams: [] })
    expect(result.current.overall.find((p) => p.name === 'Marie').points).toBe(0.5)
  })

  it('resetOverall empties the overall board only', () => {
    const { result } = renderHook(() => useScores())
    act(() => result.current.registerPlayers(['Marie']))
    act(() => result.current.toggleArtist('Marie'))

    act(() => result.current.resetOverall())
    expect(result.current.overall).toEqual([])
    expect(result.current.party.players.find((p) => p.name === 'Marie').points).toBe(0.5)
  })
})
