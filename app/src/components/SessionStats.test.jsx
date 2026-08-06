import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SessionStats from './SessionStats.jsx'

function buildSettings(overrides = {}) {
  return { timerDuration: 20, volume: 70, revealMode: 'manual', answerTimerDuration: 5, ...overrides }
}

describe('SessionStats', () => {
  it('shows the playlist/track/duplicate counts from the loaded stats', () => {
    render(
      <SessionStats
        stats={{ playlistCount: 4, tracksLoaded: 182, duplicatesRemoved: 9 }}
        totalTracks={182}
        currentIndex={0}
        settings={buildSettings()}
      />,
    )

    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('182')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('falls back to em dashes and the queue length when no stats were captured this session', () => {
    render(<SessionStats stats={null} totalTracks={12} currentIndex={0} settings={buildSettings()} />)

    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('shows how many already-played tracks were excluded on this load', () => {
    render(
      <SessionStats
        stats={{ playlistCount: 2, tracksLoaded: 15, duplicatesRemoved: 0, playedExcluded: 15 }}
        totalTracks={30}
        currentIndex={15}
        settings={buildSettings()}
      />,
    )

    expect(screen.getByText('Déjà joués (exclus)')).toBeInTheDocument()
    expect(screen.getByText('Manche 16 / 30')).toBeInTheDocument()
  })

  it('shows the current round out of the total, one-indexed', () => {
    render(
      <SessionStats
        stats={{ playlistCount: 4, tracksLoaded: 182, duplicatesRemoved: 9 }}
        totalTracks={182}
        currentIndex={6}
        settings={buildSettings()}
      />,
    )

    expect(screen.getByText('Manche 7 / 182')).toBeInTheDocument()
  })

  it('shows the active game settings', () => {
    render(
      <SessionStats
        stats={{ playlistCount: 4, tracksLoaded: 182, duplicatesRemoved: 9 }}
        totalTracks={182}
        currentIndex={0}
        settings={buildSettings({ timerDuration: 20, volume: 70, revealMode: 'auto', answerTimerDuration: 8 })}
      />,
    )

    expect(screen.getByText('20 s')).toBeInTheDocument()
    expect(screen.getByText('8 s')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('Automatique')).toBeInTheDocument()
  })
})
