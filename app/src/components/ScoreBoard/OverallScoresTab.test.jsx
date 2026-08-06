import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OverallScoresTab from './OverallScoresTab.jsx'

describe('OverallScoresTab', () => {
  it('shows an empty state with nobody scored', () => {
    render(<OverallScoresTab overall={[]} onReset={() => {}} />)
    expect(screen.getByText("Personne n'a encore de points.")).toBeInTheDocument()
    expect(screen.getByText('Réinitialiser le score général')).toBeDisabled()
  })

  it('sorts by points descending and medals only the top 3', () => {
    const overall = [
      { name: 'Léa', points: 2 },
      { name: 'Tom', points: 6 },
      { name: 'Marie', points: 5 },
      { name: 'Kévin', points: 4.5 },
      { name: 'Nico', points: 0.5 },
    ]
    render(<OverallScoresTab overall={overall} onReset={() => {}} />)

    const rows = screen.getAllByText(/^(Tom|Marie|Kévin|Léa|Nico)$/)
    expect(rows.map((row) => row.textContent)).toEqual(['Tom', 'Marie', 'Kévin', 'Léa', 'Nico'])

    expect(screen.getByText('Tom').closest('.cbt-overall-row')).toHaveClass('cbt-overall-row--gold')
    expect(screen.getByText('Marie').closest('.cbt-overall-row')).toHaveClass('cbt-overall-row--silver')
    expect(screen.getByText('Kévin').closest('.cbt-overall-row')).toHaveClass('cbt-overall-row--bronze')
    expect(screen.getByText('Léa').closest('.cbt-overall-row')).not.toHaveClass(
      'cbt-overall-row--gold',
      'cbt-overall-row--silver',
      'cbt-overall-row--bronze',
    )
  })

  describe('reset confirmation', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm')
    })

    afterEach(() => {
      window.confirm.mockRestore()
    })

    it('resets only after confirmation', () => {
      const onReset = vi.fn()
      window.confirm.mockReturnValue(false)
      render(<OverallScoresTab overall={[{ name: 'Marie', points: 1 }]} onReset={onReset} />)

      fireEvent.click(screen.getByText('Réinitialiser le score général'))
      expect(onReset).not.toHaveBeenCalled()

      window.confirm.mockReturnValue(true)
      fireEvent.click(screen.getByText('Réinitialiser le score général'))
      expect(onReset).toHaveBeenCalledTimes(1)
    })
  })
})
