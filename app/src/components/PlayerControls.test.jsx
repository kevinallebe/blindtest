import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PlayerControls from './PlayerControls.jsx'

describe('PlayerControls', () => {
  it('calls onPlayNext when "Nouvelle musique" is clicked', () => {
    const onPlayNext = vi.fn()
    render(<PlayerControls onPlayNext={onPlayNext} canPlayNext isRoundActive={false} />)

    fireEvent.click(screen.getByText('Nouvelle musique'))
    expect(onPlayNext).toHaveBeenCalledTimes(1)
  })

  it('disables "Nouvelle musique" when canPlayNext is false', () => {
    render(<PlayerControls onPlayNext={() => {}} canPlayNext={false} isRoundActive={false} />)
    expect(screen.getByText('Nouvelle musique')).toBeDisabled()
  })

  it('hides the Pause/Lecture button before any round has started', () => {
    render(<PlayerControls onPlayNext={() => {}} canPlayNext isRoundActive={false} />)
    expect(screen.queryByText('Pause')).not.toBeInTheDocument()
    expect(screen.queryByText('Lecture')).not.toBeInTheDocument()
  })

  it('shows "Pause" while playing and "Lecture" once paused, wiring onTogglePause', () => {
    const onTogglePause = vi.fn()
    const { rerender } = render(
      <PlayerControls onPlayNext={() => {}} onTogglePause={onTogglePause} canPlayNext isRoundActive isPaused={false} />,
    )
    fireEvent.click(screen.getByText('Pause'))
    expect(onTogglePause).toHaveBeenCalledTimes(1)

    rerender(
      <PlayerControls onPlayNext={() => {}} onTogglePause={onTogglePause} canPlayNext isRoundActive isPaused={true} />,
    )
    expect(screen.getByText('Lecture')).toBeInTheDocument()
  })
})
