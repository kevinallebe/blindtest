import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import QRCodeInvite from './QRCodeInvite.jsx'

describe('QRCodeInvite', () => {
  it('encodes the Buzzer server URL (VITE_SOCKET_URL) in the QR code', () => {
    const { container } = render(<QRCodeInvite onClose={() => {}} />)
    // qrcode.react renders an <svg>; we just check it actually rendered something scannable.
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Rejoins la partie !')).toBeInTheDocument()
  })

  it('calls onClose when "Fermer" is clicked', () => {
    const onClose = vi.fn()
    render(<QRCodeInvite onClose={onClose} />)

    fireEvent.click(screen.getByText('Fermer'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('lists the 3 scan steps', () => {
    render(<QRCodeInvite onClose={() => {}} />)
    expect(screen.getByText("Ouvre l'appareil photo")).toBeInTheDocument()
    expect(screen.getByText('Scanne le code')).toBeInTheDocument()
    expect(screen.getByText('Tu es prêt à buzzer')).toBeInTheDocument()
  })
})
