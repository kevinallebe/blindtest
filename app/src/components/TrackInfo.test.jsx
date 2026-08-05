import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TrackInfo from './TrackInfo.jsx'

const track = {
  uri: 'spotify:track:a',
  name: 'Zouk La Sé Sèl Médikaman Nou Ni',
  artists: "Kassav'",
  albumName: 'Vini Pou',
  coverUrl: 'https://i.scdn.co/image/cover.jpg',
}

describe('TrackInfo — masked state (default)', () => {
  it('never leaks the track title or artist — only the masked placeholder', () => {
    render(<TrackInfo isActive />)
    expect(screen.getByText('Extrait en cours')).toBeInTheDocument()
    expect(screen.getByText('Réponse masquée')).toBeInTheDocument()
  })

  it('stays masked even if a track is passed, unless revealed is true', () => {
    render(<TrackInfo isActive track={track} revealed={false} />)
    expect(screen.getByText('Réponse masquée')).toBeInTheDocument()
    expect(screen.queryByText(/Kassav/)).not.toBeInTheDocument()
  })

  it('only animates the equalizer while active', () => {
    const { container, rerender } = render(<TrackInfo isActive={false} />)
    expect(container.querySelector('.cbt-track-eq')).not.toHaveClass('cbt-track-eq--active')

    rerender(<TrackInfo isActive />)
    expect(container.querySelector('.cbt-track-eq')).toHaveClass('cbt-track-eq--active')
  })
})

describe('TrackInfo — revealed state (Phase 6)', () => {
  it('shows the artist(s), title, album and cover once revealed', () => {
    render(<TrackInfo revealed track={track} />)

    expect(screen.getByText("Kassav' — Zouk La Sé Sèl Médikaman Nou Ni")).toBeInTheDocument()
    expect(screen.getByText('Album : Vini Pou')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', track.coverUrl)
    expect(screen.queryByText('Réponse masquée')).not.toBeInTheDocument()
  })
})
