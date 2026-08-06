import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PartyScoresTab from './PartyScoresTab.jsx'

function buildScores(overrides = {}) {
  return {
    party: { players: [], teams: [] },
    dissolveTeams: vi.fn(),
    leaveTeam: vi.fn(),
    ...overrides,
  }
}

describe('PartyScoresTab', () => {
  it('shows an empty state with no players', () => {
    render(<PartyScoresTab scores={buildScores()} buzz={{}} />)
    expect(screen.getByText(/Aucun joueur pour l'instant/)).toBeInTheDocument()
  })

  it('renders individual players not in any team, with their points', () => {
    const scores = buildScores({ party: { players: [{ name: 'Léa', points: 0 }], teams: [] } })
    render(<PartyScoresTab scores={scores} buzz={{}} />)

    expect(screen.getByText('Léa')).toBeInTheDocument()
    expect(screen.getByText('0 pt')).toBeInTheDocument()
  })

  it('renders a team card with its auto-generated name, total, and member rows', () => {
    const scores = buildScores({
      party: {
        players: [
          { name: 'Marie', points: 0.5 },
          { name: 'Tom', points: 1 },
        ],
        teams: [{ id: 't1', memberNames: ['Marie', 'Tom'] }],
      },
    })
    render(<PartyScoresTab scores={scores} buzz={{}} />)

    expect(screen.getByText('Marie & Tom')).toBeInTheDocument()
    expect(screen.getByText('1,5 pts')).toBeInTheDocument()
    expect(screen.getByText('0,5 pt')).toBeInTheDocument()
    expect(screen.getByText('1 pt')).toBeInTheDocument()
  })

  it('calls leaveTeam when a member × is clicked', () => {
    const scores = buildScores({
      party: {
        players: [
          { name: 'Marie', points: 0 },
          { name: 'Tom', points: 0 },
        ],
        teams: [{ id: 't1', memberNames: ['Marie', 'Tom'] }],
      },
    })
    render(<PartyScoresTab scores={scores} buzz={{}} />)

    fireEvent.click(screen.getByLabelText("Marie quitte l'équipe"))
    expect(scores.leaveTeam).toHaveBeenCalledWith('Marie')
  })

  it('wires "Dissoudre les équipes" and disables it with no teams', () => {
    const noTeams = buildScores()
    const { rerender } = render(<PartyScoresTab scores={noTeams} buzz={{}} />)
    expect(screen.getByText('Dissoudre les équipes')).toBeDisabled()

    const withTeam = buildScores({ party: { players: [], teams: [{ id: 't1', memberNames: ['Marie', 'Tom'] }] } })
    rerender(<PartyScoresTab scores={withTeam} buzz={{}} />)
    fireEvent.click(screen.getByText('Dissoudre les équipes'))
    expect(withTeam.dissolveTeams).toHaveBeenCalledTimes(1)
  })

  it('calls buzz.startJoin when "Ouvrir les inscriptions" is clicked', () => {
    const startJoin = vi.fn()
    render(<PartyScoresTab scores={buildScores()} buzz={{ startJoin }} />)

    fireEvent.click(screen.getByText('Ouvrir les inscriptions'))
    expect(startJoin).toHaveBeenCalledTimes(1)
  })
})
