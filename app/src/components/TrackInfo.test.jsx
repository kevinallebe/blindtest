import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TrackInfo from './TrackInfo.jsx'

describe('TrackInfo (masked state, Phase 5)', () => {
  it('never leaks the track title or artist — only the masked placeholder', () => {
    render(<TrackInfo isActive />)
    expect(screen.getByText('Extrait en cours')).toBeInTheDocument()
    expect(screen.getByText('Réponse masquée')).toBeInTheDocument()
  })

  it('only animates the equalizer while active', () => {
    const { container, rerender } = render(<TrackInfo isActive={false} />)
    expect(container.querySelector('.cbt-track-eq')).not.toHaveClass('cbt-track-eq--active')

    rerender(<TrackInfo isActive />)
    expect(container.querySelector('.cbt-track-eq')).toHaveClass('cbt-track-eq--active')
  })
})
