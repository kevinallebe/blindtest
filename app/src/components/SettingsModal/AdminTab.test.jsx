import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminTab from './AdminTab.jsx'

function buildBranding(overrides = {}) {
  return {
    name: 'Blindtest',
    initials: 'BT',
    setName: vi.fn(),
    setInitials: vi.fn(),
    ...overrides,
  }
}

function buildSpotify(overrides = {}) {
  return {
    status: 'ready',
    error: null,
    reconnect: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('AdminTab — Spotify reconnection (Epic 12)', () => {
  it('does not render the section when no spotify prop is provided', () => {
    render(<AdminTab branding={buildBranding()} />)
    expect(screen.queryByText('Connexion Spotify')).not.toBeInTheDocument()
  })

  it('wires the reconnect button to spotify.reconnect', () => {
    const spotify = buildSpotify()
    render(<AdminTab branding={buildBranding()} spotify={spotify} />)

    fireEvent.click(screen.getByText('Se reconnecter à Spotify'))
    expect(spotify.reconnect).toHaveBeenCalledTimes(1)
  })

  it('disables the button and shows a connecting label while reconnecting', () => {
    render(<AdminTab branding={buildBranding()} spotify={buildSpotify({ status: 'connecting' })} />)

    const button = screen.getByText('Reconnexion…')
    expect(button).toBeDisabled()
  })

  it('surfaces the error message when reconnection fails', () => {
    render(
      <AdminTab
        branding={buildBranding()}
        spotify={buildSpotify({ status: 'error', error: { code: 'invalid_token', message: 'Reconnecte-toi.' } })}
      />,
    )

    expect(screen.getByText('Reconnecte-toi.')).toBeInTheDocument()
  })
})
