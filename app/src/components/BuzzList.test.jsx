import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BuzzList from './BuzzList.jsx'

describe('BuzzList', () => {
  it('shows a waiting message when nobody has buzzed yet', () => {
    render(<BuzzList buzzes={[]} />)
    expect(screen.getByText('En attente des buzz…')).toBeInTheDocument()
  })

  it('ranks the top 3 with medals and the rest as "4e"/"5e"', () => {
    const buzzes = [
      { name: 'Marie-Lou', reactionTime: 620 },
      { name: 'Jonas', reactionTime: 910 },
      { name: 'Sarah', reactionTime: 1200 },
      { name: 'Kévin', reactionTime: 1580 },
      { name: 'Anaïs', reactionTime: 2030 },
    ]
    render(<BuzzList buzzes={buzzes} />)

    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText('🥉')).toBeInTheDocument()
    expect(screen.getByText('4e')).toBeInTheDocument()
    expect(screen.getByText('5e')).toBeInTheDocument()

    expect(screen.getByText('Marie-Lou')).toBeInTheDocument()
    expect(screen.getByText('0.62 s')).toBeInTheDocument()
    expect(screen.getByText('2.03 s')).toBeInTheDocument()
  })

  it('always shows the scoring legend footer', () => {
    render(<BuzzList buzzes={[]} />)
    expect(
      screen.getByText('Artiste ou titre = 0,5 pt · les deux = 1 pt · re-cliquer retire le point'),
    ).toBeInTheDocument()
  })

  it('shows the answer timer next to the first buzzer only, in red once elapsed', () => {
    const buzzes = [
      { name: 'Marie-Lou', reactionTime: 620 },
      { name: 'Jonas', reactionTime: 910 },
    ]
    const { rerender } = render(
      <BuzzList buzzes={buzzes} answerTimer={{ secondsLeft: 5, duration: 5, isRunning: true }} />,
    )
    expect(screen.getByText('5s')).toBeInTheDocument()

    rerender(<BuzzList buzzes={buzzes} answerTimer={{ secondsLeft: 0, duration: 5, isRunning: false }} />)
    const badge = screen.getByText('0s')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('cbt-buzz-entry__answer-timer--elapsed')
  })

  it('hides the answer timer once nobody has buzzed or the round is not paused for an answer', () => {
    render(<BuzzList buzzes={[{ name: 'Marie-Lou', reactionTime: 620 }]} answerTimer={null} />)
    expect(screen.queryByText(/^\d+s$/)).not.toBeInTheDocument()
  })

  describe('score toggles (Epic 13)', () => {
    const buzzes = [{ name: 'Marie', reactionTime: 620 }]

    it('wires the 3 toggle buttons to their callbacks', () => {
      const onToggleArtist = vi.fn()
      const onToggleTitle = vi.fn()
      const onToggleBoth = vi.fn()
      render(
        <BuzzList
          buzzes={buzzes}
          onToggleArtist={onToggleArtist}
          onToggleTitle={onToggleTitle}
          onToggleBoth={onToggleBoth}
        />,
      )

      fireEvent.click(screen.getByTitle('Artiste trouvé'))
      fireEvent.click(screen.getByTitle('Titre trouvé'))
      fireEvent.click(screen.getByTitle('Les deux trouvés'))

      expect(onToggleArtist).toHaveBeenCalledWith('Marie')
      expect(onToggleTitle).toHaveBeenCalledWith('Marie')
      expect(onToggleBoth).toHaveBeenCalledWith('Marie')
    })

    it('reflects the active toggle state and shows the matching points suffix', () => {
      const { rerender } = render(<BuzzList buzzes={buzzes} roundScores={{}} />)
      expect(screen.getByTitle('Artiste trouvé')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.queryByText(/pt$/)).not.toBeInTheDocument()

      rerender(<BuzzList buzzes={buzzes} roundScores={{ Marie: { artist: true, title: false } }} />)
      expect(screen.getByTitle('Artiste trouvé')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('· 0,5 pt')).toBeInTheDocument()

      rerender(<BuzzList buzzes={buzzes} roundScores={{ Marie: { artist: true, title: true } }} />)
      expect(screen.getByTitle('Les deux trouvés')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('· 1 pt')).toBeInTheDocument()
    })
  })
})
