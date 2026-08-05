import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PlayerControls from './PlayerControls.jsx'

describe('PlayerControls', () => {
  it('calls onPlayNext when "Nouvelle musique" is clicked', () => {
    const onPlayNext = vi.fn()
    render(<PlayerControls onPlayNext={onPlayNext} canPlayNext roundStage="idle" />)

    fireEvent.click(screen.getByText('Nouvelle musique'))
    expect(onPlayNext).toHaveBeenCalledTimes(1)
  })

  it('disables "Nouvelle musique" when canPlayNext is false', () => {
    render(<PlayerControls onPlayNext={() => {}} canPlayNext={false} roundStage="idle" />)
    expect(screen.getByText('Nouvelle musique')).toBeDisabled()
  })

  it('hides Pause/Continuer/Révéler before any round has started (idle)', () => {
    render(<PlayerControls onPlayNext={() => {}} canPlayNext roundStage="idle" />)
    expect(screen.queryByText('Pause')).not.toBeInTheDocument()
    expect(screen.queryByText('Continuer')).not.toBeInTheDocument()
    expect(screen.queryByText('Révéler la réponse')).not.toBeInTheDocument()
  })

  it('shows "Pause" and "Révéler la réponse" while playing, wiring onTogglePause/onReveal', () => {
    const onTogglePause = vi.fn()
    const onReveal = vi.fn()
    render(
      <PlayerControls
        onPlayNext={() => {}}
        onTogglePause={onTogglePause}
        onReveal={onReveal}
        canPlayNext
        roundStage="playing"
      />,
    )

    fireEvent.click(screen.getByText('Pause'))
    expect(onTogglePause).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Révéler la réponse'))
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('shows "Continuer" and still allows revealing once paused', () => {
    render(<PlayerControls onPlayNext={() => {}} onTogglePause={() => {}} onReveal={() => {}} roundStage="paused" />)
    expect(screen.getByText('Continuer')).toBeInTheDocument()
    expect(screen.getByText('Révéler la réponse')).toBeInTheDocument()
  })

  it('hides Pause/Continuer/Révéler once the answer is revealed', () => {
    render(<PlayerControls onPlayNext={() => {}} canPlayNext roundStage="revealed" />)
    expect(screen.queryByText('Pause')).not.toBeInTheDocument()
    expect(screen.queryByText('Continuer')).not.toBeInTheDocument()
    expect(screen.queryByText('Révéler la réponse')).not.toBeInTheDocument()
  })
})
