import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

  it('always shows the reset footer note', () => {
    render(<BuzzList buzzes={[]} />)
    expect(screen.getByText('Les buzz se remettent à zéro à chaque nouvelle manche.')).toBeInTheDocument()
  })
})
