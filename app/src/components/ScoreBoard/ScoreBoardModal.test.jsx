import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ScoreBoardModal from './ScoreBoardModal.jsx'

function buildScores(overrides = {}) {
  return {
    overall: [],
    party: { players: [], teams: [] },
    dissolveTeams: vi.fn(),
    leaveTeam: vi.fn(),
    resetOverall: vi.fn(),
    ...overrides,
  }
}

describe('ScoreBoardModal', () => {
  it('shows the Partie tab by default and switches to Général on click', () => {
    render(<ScoreBoardModal onClose={() => {}} scores={buildScores()} buzz={{}} />)

    expect(screen.getByText('Partie en cours')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Général'))
    expect(screen.getByText('Classement général · soirée')).toBeInTheDocument()
  })

  it('calls onClose from the close button and the overlay, but not from inside the card', () => {
    const onClose = vi.fn()
    render(<ScoreBoardModal onClose={onClose} scores={buildScores()} buzz={{}} />)

    fireEvent.click(screen.getByText('Partie en cours'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('Fermer les scores'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
