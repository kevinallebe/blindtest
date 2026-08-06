import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Header from './Header.jsx'

describe('Header', () => {
  it('shows both statuses as disconnected by default', () => {
    render(<Header />)
    expect(screen.getByText('Spotify non connecté')).toBeInTheDocument()
    expect(screen.getByText('Buzzer non connecté')).toBeInTheDocument()
  })

  it('reflects connected statuses', () => {
    render(<Header spotifyConnected buzzerConnected />)
    expect(screen.getByText('Spotify connecté')).toBeInTheDocument()
    expect(screen.getByText('Buzzer connecté')).toBeInTheDocument()
  })

  it('shows "Blindtest"/"BT" by default and a custom title/initials when provided', () => {
    const { rerender } = render(<Header />)
    expect(screen.getByText('Blindtest')).toBeInTheDocument()
    expect(screen.getByText('BT')).toBeInTheDocument()

    rerender(<Header title="Soirée Kev & Oli" initials="KO" />)
    expect(screen.getByText('Soirée Kev & Oli')).toBeInTheDocument()
    expect(screen.getByText('KO')).toBeInTheDocument()
  })

  it('wires the Inviter/Scores/Réglages buttons to their callbacks', () => {
    const onInvite = vi.fn()
    const onScores = vi.fn()
    const onSettings = vi.fn()
    render(<Header onInvite={onInvite} onScores={onScores} onSettings={onSettings} />)

    fireEvent.click(screen.getByText('Inviter les joueurs'))
    fireEvent.click(screen.getByText('Scores'))
    fireEvent.click(screen.getByText('Réglages'))

    expect(onInvite).toHaveBeenCalledTimes(1)
    expect(onScores).toHaveBeenCalledTimes(1)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })
})
