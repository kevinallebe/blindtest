import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PartyScoresTab from './PartyScoresTab.jsx'

function buildScores(overrides = {}) {
  return {
    party: { players: [], teams: [] },
    dissolveTeams: vi.fn(),
    leaveTeam: vi.fn(),
    mergeIntoTeam: vi.fn(),
    ...overrides,
  }
}

// jsdom ne fournit pas DataTransfer — un mock minimal suffit pour simuler le drag & drop natif.
function makeDataTransfer() {
  return { setData: vi.fn(), dropEffect: null, effectAllowed: null }
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
    render(<PartyScoresTab scores={buildScores()} buzz={{ startJoin, mode: 'round' }} />)

    fireEvent.click(screen.getByText('Ouvrir les inscriptions'))
    expect(startJoin).toHaveBeenCalledTimes(1)
  })

  it('reflects whether registration is open via buzz.mode (US-16.1)', () => {
    const { rerender } = render(<PartyScoresTab scores={buildScores()} buzz={{ mode: 'round' }} />)
    const closedButton = screen.getByText('Ouvrir les inscriptions')
    expect(closedButton).toHaveClass('cbt-pill-btn--teal')
    expect(closedButton).not.toHaveClass('cbt-pill-btn--teal-active')

    rerender(<PartyScoresTab scores={buildScores()} buzz={{ mode: 'join' }} />)
    const openButton = screen.getByText('Inscriptions ouvertes')
    expect(openButton).toHaveClass('cbt-pill-btn--teal-active')
    expect(screen.queryByText('Ouvrir les inscriptions')).not.toBeInTheDocument()
  })

  describe('drag & drop team formation (US-15.1, screen 03)', () => {
    it('merges two individuals when one is dropped on the other, with ghost/target styling mid-drag', () => {
      const scores = buildScores({
        party: {
          players: [
            { name: 'Marie', points: 0.5 },
            { name: 'Tom', points: 1 },
          ],
          teams: [],
        },
      })
      render(<PartyScoresTab scores={scores} buzz={{}} />)

      const sourceRow = screen.getByText('Marie').closest('.cbt-party-row')
      const targetRow = screen.getByText('Tom').closest('.cbt-party-row')

      fireEvent.dragStart(sourceRow, { dataTransfer: makeDataTransfer() })
      expect(sourceRow).toHaveClass('cbt-party-row--ghost')

      fireEvent.dragOver(targetRow, { dataTransfer: makeDataTransfer() })
      expect(targetRow).toHaveClass('cbt-party-row--drop-target')
      expect(screen.getByText('Déposer pour fusionner')).toBeInTheDocument()

      fireEvent.drop(targetRow, { dataTransfer: makeDataTransfer() })
      expect(scores.mergeIntoTeam).toHaveBeenCalledWith('Marie', { type: 'player', name: 'Tom' })
    })

    it('adds a dropped individual to an existing team card', () => {
      const scores = buildScores({
        party: {
          players: [
            { name: 'Marie', points: 0.5 },
            { name: 'Tom', points: 1 },
            { name: 'Léa', points: 0 },
          ],
          teams: [{ id: 't1', memberNames: ['Marie', 'Tom'] }],
        },
      })
      render(<PartyScoresTab scores={scores} buzz={{}} />)

      const sourceRow = screen.getByText('Léa').closest('.cbt-party-row')
      const teamCard = screen.getByText('Marie & Tom').closest('.cbt-team-card')

      fireEvent.dragStart(sourceRow, { dataTransfer: makeDataTransfer() })
      fireEvent.dragOver(teamCard, { dataTransfer: makeDataTransfer() })
      expect(teamCard).toHaveClass('cbt-team-card--drop-target')

      fireEvent.drop(teamCard, { dataTransfer: makeDataTransfer() })
      expect(scores.mergeIntoTeam).toHaveBeenCalledWith('Léa', { type: 'team', teamId: 't1' })
    })

    it('does not treat dropping a row onto itself as a merge target', () => {
      const scores = buildScores({ party: { players: [{ name: 'Marie', points: 0 }], teams: [] } })
      render(<PartyScoresTab scores={scores} buzz={{}} />)

      const row = screen.getByText('Marie').closest('.cbt-party-row')
      fireEvent.dragStart(row, { dataTransfer: makeDataTransfer() })
      fireEvent.dragOver(row, { dataTransfer: makeDataTransfer() })

      expect(row).not.toHaveClass('cbt-party-row--drop-target')
    })
  })
})
