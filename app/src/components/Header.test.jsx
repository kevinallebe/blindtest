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

  it('wires the Inviter/Réglages buttons to their callbacks', () => {
    const onInvite = vi.fn()
    const onSettings = vi.fn()
    render(<Header onInvite={onInvite} onSettings={onSettings} />)

    fireEvent.click(screen.getByText('Inviter les joueurs'))
    fireEvent.click(screen.getByText('Réglages'))

    expect(onInvite).toHaveBeenCalledTimes(1)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })
})
